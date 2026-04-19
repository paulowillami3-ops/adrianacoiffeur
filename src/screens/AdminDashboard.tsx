import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfToday, parseISO, startOfWeek, addDays, isSameDay, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { Appointment, Service, Professional, BlockedSlot, AppView } from '../../types';
import { formatDateToBRL } from '../utils/helpers';
import AdminCalendarView from '../components/AdminCalendarView';
import AdminWeeklyCalendarView from '../components/AdminWeeklyCalendarView';

interface AdminDashboardProps {
  ownerId: string;
  appointments: Appointment[];
  services: Service[];
  professionals: Professional[];
  blockedSlots: BlockedSlot[];
  onNavigate: (view: AppView) => void;
  onRefresh: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

const getNextDays = (count: number) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr: format(d, 'yyyy-MM-dd'),
      dayNum: d.getDate(),
      label: format(d, 'EEE', { locale: ptBR }).replace('.', ''),
      isToday: i === 0,
    });
  }
  return days;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  ownerId, 
  appointments,
  services, 
  professionals,
  blockedSlots,
  onNavigate, 
  onRefresh, 
  onLogout,
  unreadCount 
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'AGENDA'>('OVERVIEW');
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK'>('DAY');
  const [selectedDateStr, setSelectedDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [birthdayClients, setBirthdayClients] = useState<any[]>([]);
  const [adminName, setAdminName] = useState<string>('');
  const [now, setNow] = useState(new Date());

  // Price Definition State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const nextDays = useMemo(() => getNextDays(14), []);

  // Greeting helpers
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCount = useMemo(
    () => appointments.filter(a => a.date === todayStr && a.status !== 'CANCELLED').length,
    [appointments, todayStr]
  );

  useEffect(() => {
    loadBirthdayClients();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || '';
      const namePart = email.split('@')[0];
      const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      setAdminName(capitalized);
    });
    // Live clock — tick every second
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Auto-complete logic: check every minute
  useEffect(() => {
    const checkAutoComplete = async () => {
      const now = new Date();
      const appointmentsToComplete = appointments.filter(app => {
        if (app.status !== 'PENDING' && app.status !== 'CONFIRMED') return false;
        
        // Calculate start time
        const [hours, minutes] = app.time.split(':').map(Number);
        const startTime = parseISO(app.date);
        startTime.setHours(hours, minutes, 0, 0);
        
        // Calculate end time
        const totalDuration = app.services.reduce((total, s) => total + (s.duration || 30), 0);
        const endTime = addMinutes(startTime, totalDuration);
        
        return now > endTime;
      });

      if (appointmentsToComplete.length > 0) {
        console.log(`Auto-concluindo ${appointmentsToComplete.length} agendamentos...`);
        for (const app of appointmentsToComplete) {
          await supabase.from('appointments').update({ status: 'COMPLETED' }).eq('id', app.id);
        }
        onRefresh();
      }
    };

    const interval = setInterval(checkAutoComplete, 60000);
    // Also run on mount to catch past appointments
    const timeout = setTimeout(checkAutoComplete, 2000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [appointments, onRefresh]);



  const loadBirthdayClients = async () => {
    const today = new Date();
    const mmdd = format(today, 'MM-dd');
    
    // Using a more focused query to avoid loading too much data
    const { data } = await supabase
      .from('clients')
      .select('name, phone, birth_date')
      .not('birth_date', 'is', 'null');
      
    if (data) {
      const luckyOnes = data.filter((c: any) => c.birth_date && c.birth_date.includes(mmdd));
      setBirthdayClients(luckyOnes);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefresh(), loadBirthdayClients()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (!error) {
      onRefresh();
      setSelectedApp(null);
      setConfirmCancelId(null);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      onRefresh();
      setConfirmCancelId(null);
    }
  };

  const hasEvaluationService = (services: Service[]) => {
    return services.some(s => (s.min_price !== null && s.min_price !== undefined) || (s.max_price !== null && s.max_price !== undefined));
  };

  const handleUpdatePrice = async (id: string) => {
    if (!tempPrice || isNaN(Number(tempPrice))) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    setIsSavingPrice(true);
    const { error } = await supabase
      .from('appointments')
      .update({ total_price: Number(tempPrice), final_price_set: true })
      .eq('id', id);

    setIsSavingPrice(false);
    if (!error) {
      setEditingPriceId(null);
      setTempPrice('');
      onRefresh();
    } else {
      alert('Erro ao atualizar preço: ' + error.message);
    }
  };

  // Stats calculate
  const stats = useMemo(() => {
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    const todayApps = appointments.filter(a => a.date === todayStr);
    const completedToday = todayApps.filter(a => a.status === 'COMPLETED');
    const revenueToday = completedToday.reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekApps = appointments.filter(a => {
        try {
            if (!a.date) return false;
            return parseISO(a.date) >= weekAgo;
        } catch { return false; }
    });
    const weekRevenue = weekApps.filter(a => a.status === 'COMPLETED').reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);

    return {
      todayCount: todayApps.length,
      todayRevenue: revenueToday,
      weekRevenue,
      pendingCount: todayApps.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length
    };
  }, [appointments]);

  const selectedDayApps = useMemo(() => {
    return appointments.filter(a => a.date === selectedDateStr).sort((a,b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDateStr]);

  const [showCompleted, setShowCompleted] = useState(false);

  const pendingApps = useMemo(() => {
    return selectedDayApps.filter(a => {
      if (showCompleted) return true;
      return a.status !== 'COMPLETED' && a.status !== 'CANCELLED';
    });
  }, [selectedDayApps, showCompleted]);

  const menuItems = [
    { title: 'Clientes', icon: 'groups', onClick: () => onNavigate('ADMIN_CLIENTS'), color: 'bg-blue-500' },
    { title: 'Serviços', icon: 'content_cut', onClick: () => onNavigate('ADMIN_SERVICES'), color: 'bg-purple-500' },
    { title: 'Financeiro', icon: 'payments', onClick: () => onNavigate('ADMIN_FINANCE'), color: 'bg-emerald-500' },
    { title: 'Equipe', icon: 'badge', onClick: () => onNavigate('ADMIN_PROFESSIONALS'), color: 'bg-orange-500' },
    { title: 'Clube', icon: 'card_membership', onClick: () => onNavigate('ADMIN_CLUB'), color: 'bg-primary', badge: unreadCount },
    { title: 'Produtos', icon: 'inventory_2', onClick: () => onNavigate('ADMIN_PRODUCTS'), color: 'bg-pink-500' },
    { title: 'Configurações', icon: 'settings', onClick: () => onNavigate('ADMIN_SETTINGS'), color: 'bg-slate-500' },
    { title: 'Modo TV', icon: 'tv', onClick: () => onNavigate('ADMIN_TV'), color: 'bg-slate-800' },
  ];

  return (
    <div className="bg-slate-50 dark:bg-background-dark min-h-screen pb-12 transition-colors">
      {/* Header */}
      <header className="p-4 md:p-6 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-white/5 sticky top-0 z-40 transition-colors">
        <div className="flex flex-wrap items-center justify-between max-w-7xl mx-auto gap-4">
          {/* Left: Greeting */}
          <div className="min-w-0 flex-[1_1_100%] md:flex-[1_1_auto] order-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {greeting}, <span className="text-primary">{adminName}!</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Você tem <span className="font-black text-slate-600 dark:text-slate-200">{todayCount}</span> agendamento{todayCount !== 1 ? 's' : ''} hoje.
            </p>
          </div>

          {/* Center: Live Clock */}
          <div className="flex flex-col items-start md:items-center select-none order-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">
              {format(now, 'HH:mm')}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-0.5 capitalize">
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 order-3">
            <button
              onClick={onLogout}
              className="size-12 md:size-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
              title="Sair do Painel"
            >
              <span className="material-symbols-outlined text-[24px] md:text-[28px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Dash Tabs */}
        <div className="flex bg-white dark:bg-surface-dark p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'OVERVIEW' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
          >
            CENTRAL DE COMANDO
          </button>
          <button 
            onClick={() => setActiveTab('AGENDA')}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'AGENDA' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
          >
            AGENDA OPERACIONAL
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' ? (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Fat. Hoje', value: `R$ ${stats.todayRevenue.toFixed(2)}`, icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Semana', value: `R$ ${stats.weekRevenue.toFixed(2)}`, icon: 'show_chart', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Atendimentos', value: stats.todayCount, icon: 'event_available', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Pendente', value: stats.pendingCount, icon: 'pending_actions', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-surface-dark p-3 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex flex-col items-start gap-1">
                      <div className={`size-7 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-base">{stat.icon}</span>
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide leading-tight truncate w-full">{stat.label}</p>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">{stat.value}</h4>
                    </div>
                  ))}
                </div>

                {/* Main Menu Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Ações Rápidas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {menuItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={item.onClick}
                      className="group relative bg-white dark:bg-surface-dark p-4 rounded-[28px] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col items-center text-center overflow-hidden"
                    >
                      <div className={`size-16 ${item.color} rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg group-hover:scale-110 transition-transform`}>
                        <span className="material-symbols-outlined text-4xl">{item.icon}</span>
                      </div>
                      <h3 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest leading-tight">{item.title}</h3>
                      
                      {item.badge ? (
                        <div className="absolute top-3 right-3 size-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse shadow-lg shadow-red-500/40 border-2 border-white dark:border-surface-dark">
                          {item.badge}
                        </div>
                      ) : null}
                    </button>
                  ))}
                  </div>
                </div>

                {/* CRONOGRAMA DE HOJE (The Missing Cards) */}
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between px-1 gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto gap-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">Cronograma do Dia</h3>
                      <button 
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`text-[8px] sm:text-[9px] font-black uppercase px-2 sm:px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                          showCompleted 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-white dark:bg-surface-dark text-slate-400 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {showCompleted ? 'Ocultar Concluídos' : 'Mostrar Concluídos'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
                      {nextDays.slice(0, 7).map((day, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedDateStr(day.dateStr)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all border ${
                            selectedDateStr === day.dateStr 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
                              : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/5 text-slate-400'
                          }`}
                        >
                          {day.label} {day.dayNum}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {pendingApps.length === 0 ? (
                      <div className="text-center py-12 bg-white/50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-white/10 transition-colors">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_busy</span>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest italic">Nenhum compromisso pendente para este dia.</p>
                      </div>
                    ) : (
                          pendingApps.map((app) => (
                            <div key={app.id} className="bg-white dark:bg-surface-dark p-4 md:p-6 rounded-[28px] md:rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-4 gap-2">
                                <div className="flex gap-3 md:gap-4 min-w-0 flex-1">
                                  <div className="flex flex-col items-center justify-center size-12 md:size-14 shrink-0 bg-slate-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                                    <span className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-none">{app.time}</span>
                                    <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">
                                      {app.services.reduce((total, s) => total + (s.duration || 30), 0)} min
                                    </span>
                                  </div>
                                  <div className="min-w-0 pr-1">
                                    <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest mb-0.5 block truncate">
                                      {app.services.map(s => s.name).join(' + ') || 'Serviço não especificado'}
                                    </span>
                                    <h4 className="font-black text-base md:text-lg text-slate-800 dark:text-white leading-tight mb-1 truncate">{app.customerName}</h4>
                                    
                                    <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                                      {(() => {
                                        const pro = professionals.find(p => p.id === app.professionalId);
                                        if (!pro) return null;
                                        return (
                                          <span className="text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full border uppercase tracking-tighter shrink-0" style={{ backgroundColor: `${pro.color}15`, color: pro.color, borderColor: `${pro.color}30` }}>
                                            {pro.name}
                                          </span>
                                        );
                                      })()}
                                      <span className={`text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-tighter border shrink-0 ${
                                        app.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-500 border-blue-200' : 'bg-orange-50 text-orange-500 border-orange-200'
                                      }`}>
                                        {app.status === 'PENDING' ? 'Pendente' : 'Confirmado'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-1">
                                  <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase mb-0.5 whitespace-nowrap">Valor</p>
                                  {editingPriceId === app.id ? (
                                    <input
                                      type="number"
                                      value={tempPrice}
                                      autoFocus
                                      onChange={(e) => setTempPrice(e.target.value)}
                                      className="w-20 md:w-24 text-right bg-slate-50 dark:bg-white/5 border border-primary/30 rounded-lg px-2 py-1 text-xs md:text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                      placeholder="0,00"
                                    />
                                  ) : (
                                    <p className="text-base md:text-xl font-black text-slate-900 dark:text-white whitespace-nowrap">R$ {(Number(app.totalPrice) || 0).toFixed(2).replace('.',',')}</p>
                                  )}
                                  {hasEvaluationService(app.services) && !editingPriceId && (
                                    app.finalPriceSet ? (
                                      <span className="text-[9px] font-black text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 rounded-full uppercase block tracking-tight border border-green-200 dark:border-green-500/20">
                                        ✓ Preço Definido
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase block tracking-tight animate-pulse border border-amber-200 dark:border-amber-500/20">
                                        ⏳ Aguardando Avaliação
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                          {editingPriceId === app.id ? (
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                              <button
                                onClick={() => handleUpdatePrice(app.id)}
                                disabled={isSavingPrice}
                                className="flex-1 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 transition-all hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-sm">check</span> Salvar Preço
                              </button>
                              <button
                                onClick={() => setEditingPriceId(null)}
                                className="px-4 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:bg-slate-200 font-black text-[10px] uppercase"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                              <a
                                href={`https://wa.me/55${app.customerPhone.replace(/\D/g,'')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 h-12 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center gap-2 transition-all hover:bg-[#25D366]/20 font-black text-[10px] uppercase tracking-widest border border-[#25D366]/20"
                              >
                                <span className="material-symbols-outlined text-base">chat</span> WhatsApp
                              </a>
                              
                              {hasEvaluationService(app.services) && (
                                <button
                                  onClick={() => {
                                    setEditingPriceId(app.id);
                                    setTempPrice((app.totalPrice || 0).toString());
                                  }}
                                  className={`flex-2 h-12 px-5 rounded-2xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] transform active:scale-[0.98] font-black text-[10px] uppercase tracking-widest shadow-lg border-2 ${
                                    app.finalPriceSet
                                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20 border-white/10'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 border-white/10'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-base">payments</span>
                                  {app.finalPriceSet ? 'Redefinir' : 'Definir Preço'}
                                </button>
                              )}

                              <button
                                onClick={() => handleStatusChange(app.id, 'COMPLETED')}
                                className="flex-1 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center gap-2 transition-all hover:bg-primary/20 font-black text-[10px] uppercase tracking-widest border border-primary/20"
                              >
                                <span className="material-symbols-outlined text-base">task_alt</span> Concluir
                              </button>

                              <button
                                onClick={() => {
                                  if (confirmCancelId === app.id) handleDeleteAppointment(app.id);
                                  else setConfirmCancelId(app.id);
                                }}
                                className={`size-12 rounded-2xl flex items-center justify-center transition-all border ${
                                  confirmCancelId === app.id 
                                    ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                                    : 'bg-red-50 text-red-500 border-red-500/20 hover:bg-red-100'
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg">{confirmCancelId === app.id ? 'warning' : 'close'}</span>
                              </button>
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </div>

                {/* Concluídos Hoje */}
                <div className="space-y-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <span className="material-symbols-outlined text-base text-green-500">check_circle</span>
                     Concluídos Hoje ({selectedDayApps.filter(a => a.status === 'COMPLETED').length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedDayApps.filter(a => a.status === 'COMPLETED').map(app => (
                      <div key={app.id} className="bg-white/40 dark:bg-surface-dark p-4 rounded-[24px] border border-gray-100 dark:border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="size-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-black">{(app.customerName || '?').charAt(0)}</div>
                            <div>
                               <p className="text-xs font-black text-slate-800 dark:text-white strike-through">{app.customerName}</p>
                               <p className="text-[9px] font-bold text-slate-400">{app.time}</p>
                            </div>
                         </div>
                         <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">OK</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar - Aniversariantes & Recent Activity */}
              <div className="space-y-6">
                {birthdayClients.length > 0 && (
                  <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-[32px] text-white shadow-xl shadow-pink-500/20 animate-enter">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <span className="material-symbols-outlined filled">cake</span>
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-widest">Aniversariantes!</h3>
                    </div>
                    <div className="space-y-3">
                      {birthdayClients.map((c, idx) => (
                        <div key={idx} className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm flex items-center justify-between">
                          <div>
                            <p className="font-black text-xs">{c.name}</p>
                            <p className="text-[9px] opacity-70">{c.phone}</p>
                          </div>
                          <a 
                            href={`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns ${c.name}! 🥳 Desejamos um dia maravilhoso! Que tal vir comemorar no Adriana Coiffeur com um presente especial?`)}`}
                            target="_blank"
                            className="bg-white text-pink-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase hover:scale-105 transition-transform"
                          >Parabenizar</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Atividade Recente</h3>
                    <div className="size-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">history</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-white/5 rounded-2xl font-medium italic">Monitorando atividades em tempo real...</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                    <span className="material-symbols-outlined text-8xl text-white">auto_awesome</span>
                  </div>
                  <h3 className="text-white font-black text-xl mb-2 relative z-10">Dica do Léo</h3>
                  <p className="text-white/60 text-sm italic relative z-10">"O atendimento é o coração do seu negócio. Surpreenda seus clientes com pequenos mimos!"</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="agenda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Agenda Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 bg-white dark:bg-surface-dark p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 w-full md:w-auto">
                   <button 
                    onClick={() => setViewMode('DAY')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${viewMode === 'DAY' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-400'}`}
                   >DIA</button>
                   <button 
                    onClick={() => setViewMode('WEEK')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${viewMode === 'WEEK' ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-400'}`}
                   >SEMANA</button>
                </div>

                {viewMode === 'DAY' && (
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
                    {nextDays.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`flex flex-col items-center justify-center min-w-[60px] h-[72px] rounded-2xl transition-all border ${
                          selectedDateStr === day.dateStr 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
                            : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/5 text-slate-400 hover:border-primary/30'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase mb-1">{day.label}</span>
                        <span className="text-lg font-black">{day.dayNum}</span>
                        {day.isToday && <div className={`size-1 rounded-full mt-1 ${selectedDateStr === day.dateStr ? 'bg-white' : 'bg-primary'}`}></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {viewMode === 'DAY' ? (
                <AdminCalendarView 
                  appointments={appointments}
                  selectedDateStr={selectedDateStr}
                  onDateChange={setSelectedDateStr}
                  onAppointmentClick={setSelectedApp}
                  workHours={[]}
                  professionals={professionals}
                  blockedSlots={blockedSlots}
                />
              ) : (
                <AdminWeeklyCalendarView 
                  appointments={appointments}
                  blockedSlots={blockedSlots}
                  professionals={professionals}
                  selectedDateStr={selectedDateStr}
                  onDateChange={setSelectedDateStr}
                  onAppointmentClick={setSelectedApp}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status update logic handle by the card directly or the existing sheet */}
      </main>

       {/* Appointment Action Sheet (Still available for more detailed summary if needed) */}
       <AnimatePresence>
        {selectedApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-surface-dark w-full max-w-xl rounded-t-[40px] p-8 pb-12 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Detalhamento</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedApp.customerName}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase">{selectedApp.time}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      selectedApp.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>{selectedApp.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valor Total</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">R$ {(Number(selectedApp.totalPrice) || 0).toFixed(2).replace('.', ',')}</p>
                  {hasEvaluationService(selectedApp.services) && (
                    <span className="text-[10px] font-black text-primary uppercase block mt-1 tracking-widest animate-pulse">Sob Avaliação</span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Serviços Contratados</p>
                   {selectedApp.services.map((s, idx) => (
                     <div key={idx} className="flex justify-between items-center py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                       <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{s.name}</span>
                       <span className="text-xs font-black text-slate-900 dark:text-white">
                        {s.min_price !== undefined ? `Méd. R$ ${s.min_price}` : `R$ ${(Number(s.price) || 0).toFixed(2)}`}
                       </span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                 {hasEvaluationService(selectedApp.services) && (
                   <button
                     onClick={() => {
                       setEditingPriceId(selectedApp.id);
                       setTempPrice(selectedApp.totalPrice.toString());
                       setSelectedApp(null); // Close modal to show inline edit in list
                     }}
                     className="bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                   >
                     <span className="material-symbols-outlined">payments</span>
                     <span className="text-[10px]">DEFINIR PREÇO FINAL</span>
                   </button>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleStatusChange(selectedApp.id, 'COMPLETED')}
                  className="bg-green-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="text-[10px]">CONCLUIR</span>
                </button>
                <button 
                  onClick={() => {
                    if (confirmCancelId === selectedApp.id) handleDeleteAppointment(selectedApp.id);
                    else setConfirmCancelId(selectedApp.id);
                  }}
                  className={`font-black py-4 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                    confirmCancelId === selectedApp.id ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 dark:bg-red-900/10 text-red-600'
                  }`}
                >
                  <span className="material-symbols-outlined">{confirmCancelId === selectedApp.id ? 'warning' : 'cancel'}</span>
                  <span className="text-[10px]">{confirmCancelId === selectedApp.id ? 'CONFIRMAR?' : 'CANCELAR'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
