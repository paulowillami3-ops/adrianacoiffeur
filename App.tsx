import ReloadPrompt from './src/ReloadPrompt';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AppView, Service, BookingState, Appointment, ChatMessage, SubscriptionPlan, UserSubscription, Professional, Category, Product } from './types';
import { SERVICES } from './constants';
import { supabase } from './src/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format, addDays, startOfDay, addMinutes, differenceInMinutes, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateToBRL } from './src/utils';



const CustomerLoginScreen: React.FC<{ onLogin: (phone: string) => void; onBack: () => void }> = ({ onLogin, onBack }) => {
  const [phone, setPhone] = useState('');

  const formatPhone = (v: string) => {
    const numbers = v.replace(/\D/g, '').slice(0, 11);

    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative p-6 max-w-md mx-auto w-full justify-center">
        <button onClick={onBack} className="absolute top-6 left-6 size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"><span className="material-symbols-outlined">arrow_back</span></button>
        <div className="text-center mb-8">
          <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-4xl">smartphone</span></div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Identifique-se</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Informe seu celular para ver seus agendamentos.</p>
        </div>
        <div className="space-y-4">
          <input
            value={phone}
            onChange={handlePhoneChange}
            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400 text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="(00) 0 0000-0000"
            type="tel"
          />
          <button
            onClick={() => {
              const raw = phone.replace(/\D/g, '');
              if (raw.length > 8) onLogin(raw);
              else alert('Telefone inválido');
            }}
            className="w-full bg-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 text-white active:scale-[0.98] transition-all"
          >
            Ver Agendamentos
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminClientsScreen: React.FC<{ onBack: () => void; onChat: (id: string, name: string) => void }> = ({ onBack, onChat }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [modalTab, setModalTab] = useState<'PERFIL' | 'HISTORICO'>('PERFIL');
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (editingClient && modalTab === 'HISTORICO') {
      setIsLoadingHistory(true);
      supabase
        .from('appointments')
        .select(`*, appointment_services(services(name))`)
        .eq('client_id', editingClient.id)
        .order('appointment_date', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setClientHistory(data);
          setIsLoadingHistory(false);
        });
    }
  }, [editingClient, modalTab]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, subscriptions:user_subscriptions(plan:subscription_plans(name), status)')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching clients:', error);
    else if (data) {
      // Filter for approved subscriptions
      const processed = data.map(c => ({
        ...c,
        active_plan: (c.subscriptions as any[])?.find(s => s.status === 'APPROVED')?.plan?.name
      }));
      setClients(processed);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${name}? Isso apagará também o histórico de agendamentos e conversas.`)) {
      // Delete interactions first to avoid FK constraints
      await supabase.from('chat_messages').delete().eq('client_id', id);
      await supabase.from('appointments').delete().eq('client_id', id);

      // Now delete client
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchClients();
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;
    const normalizedPhone = editingClient.phone.replace(/\D/g, '');

    // Check for duplicate phone
    const { data: duplicateClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', normalizedPhone)
      .neq('id', editingClient.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for duplicate client:', checkError);
    }

    if (duplicateClient) {
      alert('Este telefone já está cadastrado para outro cliente.');
      return;
    }

    const { error } = await supabase.from('clients').update({
      name: editingClient.name,
      phone: normalizedPhone,
      birth_date: editingClient.birth_date || null,
      notes: editingClient.notes || null,
      instagram: editingClient.instagram || null
    })
      .eq('id', editingClient.id);

    if (error) alert('Erro ao atualizar: ' + error.message);
    else {
      setEditingClient(null);
      fetchClients();
    }
  };

  const currentMonth = new Date().getMonth() + 1;

  const filtered = clients.filter(c => {
    const searchLower = search.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(searchLower);
    const searchDigits = search.replace(/\D/g, '');
    const phoneMatch = searchDigits ? c.phone.includes(searchDigits) : false;
    
    let birthdayMatch = true;
    if (showBirthdaysOnly) {
      if (!c.birth_date) return false;
      // Usar parseISO para garantir mês correto sem deslocamento
      const bMonth = parseISO(c.birth_date).getMonth() + 1;
      birthdayMatch = (bMonth === currentMonth);
    }
    
    return (nameMatch || phoneMatch) && birthdayMatch;
  });

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors relative">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Clientes Cadastrados</h2>
          <div className="bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
            {clients.length}
          </div>
        </div>
      </header>
      <div className="p-4 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-white/5 sticky top-[73px] z-40 flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-gray-100 dark:bg-surface-dark pl-9 pr-3 py-3 rounded-lg border-transparent text-sm text-slate-900 dark:text-white"
          />
        </div>
        <button 
          onClick={() => setShowBirthdaysOnly(!showBirthdaysOnly)}
          className={`px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border ${showBirthdaysOnly ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-white/5 text-gray-500'}`}
        >
          <span className="material-symbols-outlined text-sm">{showBirthdaysOnly ? 'cake' : 'event'}</span>
          {showBirthdaysOnly ? 'Aniversariantes' : 'Todos'}
        </button>
      </div>
      <main className="p-4 space-y-2 flex-1 pb-24">
        {filtered.map(c => (
          <div key={c.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col gap-4 transition-colors">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 font-bold uppercase relative">
                {c.name.charAt(0)}
                {c.active_plan && (
                  <div className="absolute -top-1 -right-1 size-5 bg-primary-dark rounded-full flex items-center justify-center text-white border-2 border-white dark:border-surface-dark shadow-sm">
                    <span className="material-symbols-outlined text-[10px] font-black">workspace_premium</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</p>
                  {c.active_plan && (
                    <span className="text-[9px] font-black bg-primary/10 text-primary-dark px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                      {c.active_plan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.birth_date && (
                     <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold flex items-center gap-1">
                       <span className="material-symbols-outlined text-[12px]">cake</span>
                       {format(parseISO(c.birth_date), 'dd/MM/yyyy')}
                     </p>
                  )}
                  {c.instagram && (
                     <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold flex items-center gap-1 truncate max-w-[100px]">
                       <span className="material-symbols-outlined text-[12px]">alternate_email</span>
                       {c.instagram.replace('@', '')}
                     </p>
                  )}
                </div>
                {c.notes && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-1 border-l-2 border-gray-200 dark:border-white/10 pl-1.5 italic">
                    {c.notes}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400">
                #{c.id}
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
              <button onClick={() => onChat(String(c.id), c.name)} className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-500/20">
                <span className="material-symbols-outlined text-sm">chat</span> Chat
              </button>
              <button onClick={() => { setEditingClient(c); setModalTab('PERFIL'); }} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-sm">edit</span> Editar
              </button>
              <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-500/20">
                <span className="material-symbols-outlined text-sm">delete</span> Excluir
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-2xl p-6 shadow-xl flex flex-col max-h-[90vh] animate-enter">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Detalhes do Cliente</h3>
              <button onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-background-dark rounded-xl shrink-0">
              <button 
                onClick={() => setModalTab('PERFIL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${modalTab === 'PERFIL' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                Perfil
              </button>
              <button 
                onClick={() => setModalTab('HISTORICO')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${modalTab === 'HISTORICO' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                Histórico
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar flex-1 -mx-2 px-2">
              {modalTab === 'PERFIL' ? (
                <div className="space-y-4 pb-2">
                  <input
                    value={editingClient.name}
                    onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-background-dark p-3 rounded-lg text-slate-900 dark:text-white"
                    placeholder="Nome"
                  />
                  <input
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-background-dark p-3 rounded-lg text-slate-900 dark:text-white"
                    placeholder="Telefone"
                  />
                  <input
                    value={editingClient.instagram || ''}
                    onChange={e => setEditingClient({ ...editingClient, instagram: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-background-dark p-3 rounded-lg text-slate-900 dark:text-white"
                    placeholder="Instagram (@usuario)"
                  />
                  <div className="space-y-1 px-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
                    <input
                      type="date"
                      value={editingClient.birth_date || ''}
                      onChange={e => setEditingClient({ ...editingClient, birth_date: e.target.value })}
                      className="w-full bg-gray-100 dark:bg-background-dark p-3 rounded-lg text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <textarea
                    value={editingClient.notes || ''}
                    onChange={e => setEditingClient({ ...editingClient, notes: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-background-dark p-3 rounded-lg text-slate-900 dark:text-white h-24 resize-none"
                    placeholder="Anotações gerais, preferências de serviços, coloração, alergias..."
                  />
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleUpdate} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Salvar Perfil</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {isLoadingHistory ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Carregando histórico...</div>
                  ) : clientHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhum agendamento encontrado.</div>
                  ) : (
                    clientHistory.map(app => (
                      <div key={app.id} className="bg-gray-50 dark:bg-background-dark p-3 rounded-xl border border-gray-200 dark:border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {format(parseISO(app.appointment_date), 'dd/MM/yyyy')} às {app.appointment_time.slice(0,5)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${app.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {app.appointment_services?.map((as:any) => as.services?.name).join(', ')}
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-2 text-right">
                          {app.total_price ? `R$ ${app.total_price.toFixed(2)}` : '--'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Utilities ---

const getNextDays = (count: number) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dayNum: d.getDate(),
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      isToday: i === 0,
      isDisabled: d.getDay() === 0, // Disable Sundays
      monthName: d.toLocaleDateString('pt-BR', { month: 'long' }),
      year: d.getFullYear()
    });
  }
  return days;
};



const SuccessOverlay: React.FC = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/90 backdrop-blur-md animate-fade-in px-6">
    <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-scale-up border border-gray-100 dark:border-white/10 max-w-sm w-full">
      <div className="size-24 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-6 animate-bounce-custom">
        <span className="material-symbols-outlined text-6xl text-green-600 dark:text-green-400">check_circle</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">Agendamento feito com sucesso!</h2>
      <p className="text-gray-500 dark:text-gray-400 font-medium">Seu horário está reservado.</p>
    </div>
  </div>
);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const IOSNotification: React.FC<{ message: string; visible: boolean; onClose: () => void }> = ({ message, visible, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for fade out
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, onClose]);

  if (!visible && !show) return null;

  return (
    <div className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-500 ease-out transform ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-white/10 p-4 flex items-center gap-4 max-w-sm mx-auto">
        <div className="size-10 rounded-xl bg-green-500 flex items-center justify-center text-white shrink-0">
          <span className="material-symbols-outlined">chat</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Nova Mensagem</h4>
          <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{message}</p>
        </div>
        <button onClick={() => setShow(false)} className="size-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
};

// --- Screens Components ---

const LandingScreen: React.FC<{ onStart: () => void; onAdmin: () => void }> = ({ onStart, onAdmin }) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f7f4ec] text-slate-800 transition-colors scroll-smooth">
      {/* Navigation */}
      <nav className="w-full flex justify-center pt-6 md:pt-10 px-3 md:px-8">
        <div className="max-w-5xl w-full flex flex-row items-end gap-2 sm:gap-4 md:gap-6 relative">
          
          {/* Logo block: Adjusted height and alignment to perfectly center with 2-row buttons */}
          <div className="flex-shrink-0 h-[38px] sm:h-[46px] md:h-20 flex items-center justify-center pb-1 md:pb-0 -translate-y-[1px]">
            <img 
              src="/logo-icon.webp" 
              alt="Logo Adriana" 
              width="80"
              height="80"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              className="h-full w-auto object-contain" 
              onError={e => (e.currentTarget.src = '/logo-icon.png')} 
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-end w-full h-auto md:h-20 relative px-0 md:px-4">
            
            {/* Desktop Navigation (Inline) */}
            <div className="hidden md:flex items-center justify-between gap-3 lg:gap-5 text-[#a38779] font-sans font-bold text-sm lg:text-base tracking-wide pb-3 w-full whitespace-nowrap">
              <a href="#quem-sou-eu" className="hover:opacity-70 transition-opacity">quem sou eu</a>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <a href="#clube" className="hover:opacity-70 transition-opacity">clube do cabelo perfeito</a>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <button onClick={onStart} className="hover:opacity-70 transition-opacity border-none bg-transparent m-0 p-0 font-bold">agendamento</button>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <a href="#contato" className="hover:opacity-70 transition-opacity">contatos</a>
            </div>

            {/* Mobile Navigation (2x2 Grid) */}
            <div className="grid md:hidden grid-cols-[1fr_auto_1.2fr] gap-y-2 pb-2 text-[#a38779] font-sans font-bold text-[11px] sm:text-[13px] tracking-tight w-full items-center text-center mt-2">
               <a href="#quem-sou-eu" className="hover:opacity-70 px-1 leading-tight w-full text-center">quem sou eu</a>
               <span className="text-[#a38779]/30 font-light translate-y-[1px]">|</span>
               <a href="#clube" className="hover:opacity-70 px-1 leading-tight w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">clube do cabelo perfeito</a>
               
               <button onClick={onStart} className="hover:opacity-70 font-bold px-1 leading-tight w-full text-center">agendamento</button>
               <span className="text-[#a38779]/30 font-light translate-y-[1px]">|</span>
               <a href="#contato" className="hover:opacity-70 px-1 leading-tight w-full text-center">contatos</a>
            </div>

            {/* Horizontal underline spanning exactly under the text block */}
            <div className="w-full h-[1.5px] bg-[#a38779]/30 absolute bottom-0 left-0"></div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-start pt-4 pb-20 px-4 overflow-hidden">
        {/* Background Watermark */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: "-50%" }}
          animate={{ opacity: 0.1, scale: 1, x: "-50%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-20 left-1/2 w-[90%] md:w-[60%] max-w-[600px] pointer-events-none z-0"
        >
          <img 
            src="/logo-icon.webp" 
            alt="" 
            width="600"
            height="600"
            loading="lazy"
            decoding="async"
            className="w-full h-auto object-contain" 
            onError={e => (e.currentTarget.src = '/logo-icon.png')} 
          />
        </motion.div>
        
        {/* Adriana Cutout */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="relative z-10 w-full max-w-[450px] mx-auto"
        >
          <div className="w-full flex justify-center relative min-h-[300px]">
             <img 
               src="/adriana-photo.webp" 
               alt="Adriana" 
               width="450"
               height="580"
               fetchpriority="high"
               loading="eager"
               decoding="sync"
               className="w-full h-auto drop-shadow-2xl relative z-10" 
               onError={e => {
                  e.currentTarget.src = '/adriana-photo.png';
               }} 
             />
          </div>
        </motion.div>

        {/* Text Logo */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
          className="relative z-20 w-full max-w-[380px] mx-auto -mt-24 md:-mt-32 mb-12 flex flex-col items-center"
        >
          <img 
            src="/logo-text.webp" 
            alt="Adriana Coiffeur" 
            width="380"
            height="120"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            className="w-full h-auto drop-shadow-lg" 
            onError={e => {
                e.currentTarget.src = '/logo-text.png';
            }} 
          />
          <p className="font-sans font-light tracking-[0.1em] text-[#a38779]/80 text-[10px] md:text-[11px] uppercase mt-2 md:mt-4 whitespace-nowrap">
            Há 20 anos realçando belezas únicas!
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart} 
          className="relative z-20 px-10 py-3 border border-[#a38779] text-[#a38779] text-lg tracking-[0.2em] uppercase bg-transparent hover:bg-[#a38779]/5 transition-all shadow-sm"
        >
          agende aqui
        </motion.button>
      </section>

      {/* About & Gallery (Clean Luxury Editorial Grid - 1080px baseline with precise 103px gaps) */}
      <section id="quem-sou-eu" className="w-full bg-[#f7f4ec] py-[80px] px-0 overflow-hidden">
        <div className="w-full flex flex-col gap-[30px] md:gap-[60px]">
          
          {/* FIRST ROW: 231 side (21.4%) | 103 gap (9.6%) | 409 center (37.9%) | 103 gap | 231 side */}
          <div className="grid grid-cols-[minmax(0,21.43%)_minmax(0,37.94%)_minmax(0,21.43%)] gap-[9.58%] w-full items-center text-center px-0">
            
            {/* Col 1: B&W Tools (231.53 x 432.91) */}
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img 
                src="/tesouraepente.webp" 
                alt="Tools" 
                width="231"
                height="433"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover grayscale" 
                onError={e => {
                  e.currentTarget.src = '/tesouraepente.png';
                  e.currentTarget.classList.add('grayscale');
                }} 
              />
            </div>

            {/* Col 2: Main Text (Protected) */}
            <div className="w-full flex items-center justify-center overflow-hidden h-full">
              <div className="flex flex-col items-center justify-center gap-1 md:gap-3 w-full bg-[#f7f4ec]">
                <p className="text-[#a38779] font-sans text-[10px] sm:text-[12px] md:text-[15px] leading-snug md:leading-[1.4] tracking-normal md:tracking-wide m-[0_auto] max-w-full">
                  <span className="font-bold">Adriana Coiffeur</span> é hair stylist,<br />
                  visagista, mentora e consultora<br />
                  de cor, com mais de 20 anos de<br />
                  experiência no cuidado e<br />
                  transformação de cabelos,<br />
                  realçando belezas únicas.
                </p>
                <div className="h-2" />
                <p className="text-[#a38779] font-sans text-[10px] sm:text-[12px] md:text-[15px] leading-snug md:leading-[1.4] tracking-normal md:tracking-wide m-[0_auto] max-w-full">
                  Sua atuação é baseada em<br />
                  técnica, planejamento e<br />
                  acompanhamento contínuo,<br />
                  respeitando a identidade, o<br />
                  cabelo, a personalidade, o<br />
                  estilo de vida e a rotina<br />
                  de cada cliente.
                </p>
              </div>
            </div>

            {/* Col 3: Adriana Assinando (231.53 x 432.91) */}
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img 
                src="/adrianaassinando.webp" 
                alt="Adriana Assinando" 
                width="231"
                height="433"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
                onError={e => {
                  e.currentTarget.src = '/adrianaassinando.png';
                }} 
              />
            </div>
          </div>

          {/* SECOND ROW: grid alinhado com o topo - central photo larger */}
          <div className="grid grid-cols-[21.43%_37.94%_21.43%] gap-[9.58%] md:gap-[9.58%] items-stretch">
            
            {/* Col 1: gallery-1.png (231.53 x 432.91) */}
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img 
                src="/gallery-1.webp" 
                alt="Produtos capilares" 
                width="231"
                height="433"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
                onError={e => {
                  e.currentTarget.src = '/gallery-1.png';
                }} 
              />
            </div>

            {/* Col 2: gallery-2.png (FOCO - 409.84 x 644.85) */}
            <div className="aspect-[409.84/644.85] w-full overflow-hidden">
              <img 
                src="/gallery-2.webp" 
                alt="Mulher segurando produtos" 
                width="410"
                height="645"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
                onError={e => {
                  e.currentTarget.src = '/gallery-2.png';
                }} 
              />
            </div>

            {/* Col 3: gallery-3.png (231.53 x 432.91) */}
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img 
                src="/gallery-3.webp" 
                alt="Palestras e eventos" 
                width="231"
                height="433"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover" 
                onError={e => {
                  e.currentTarget.src = '/gallery-3.png';
                }} 
              />
            </div>
          </div>
        </div>
      </section>


      {/* Club Section (Luxury Dark) */}
      <section id="clube" className="w-full bg-[#040404] text-[#f7f4ec] py-[80px] px-6 md:px-12 relative z-10 overflow-hidden text-center">
        
        {/* The Transition Overlay - Shortened transition keeping top start as per 1737 (~400px) */}
        <div className="absolute inset-x-0 top-0 h-[250px] md:h-[400px] bg-gradient-to-b from-[#f7f4ec] to-[#040404] -z-10" />

        <div className="w-full flex flex-col items-center">
          
          {/* CLUB FOCAL IMAGE with Logo Layered ON TOP (Further down at chest/lower level) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="w-full max-w-[500px] md:max-w-[700px] mx-auto overflow-visible relative z-20 mb-12 md:mb-20"
          >
            {/* Logo Layer: Re-lowered to the bottom chest/waist level (approx 82% height) */}
            <div className="absolute inset-x-0 top-[78%] md:top-[82%] flex justify-center z-30 h-28 md:h-40 px-4 drop-shadow-2xl">
              <img src="/clube-logo.png" alt="Logo Clube" className="h-full w-auto object-contain" onError={e => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerHTML = '<div class="text-[#a38779] text-center drop-shadow-lg scale-110 md:scale-125"><span class="material-symbols-outlined text-4xl">diamond</span><h2 class="font-serif tracking-widest text-2xl uppercase">Clube</h2><h2 class="font-sans tracking-[0.2em] text-lg font-light">PERFEITO</h2></div>';
              }} />
            </div>

            <img 
              src="/club-photo.webp" 
              alt="Clube do Cabelo Perfeito" 
              width="700"
              height="800"
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover relative z-0" 
              onError={e => {
                e.currentTarget.src = '/club-photo.png';
              }} 
            />

          </motion.div>
        </div>
        

          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-[14px] md:text-[16px] leading-[1.6] mb-8 font-light max-w-[440px] text-[#a38779] font-sans tracking-wide mx-auto text-center px-4"
          >
            <span className="font-bold">O Clube do Cabelo Perfeito</span> existe para<br />
            facilitar a sua rotina de cuidados, desenvolvido<br />
            para quem deseja manter o cabelo saudável,<br />
            alinhado e bonito durante todo o ano.
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[14px] md:text-[16px] leading-[1.6] mb-8 md:mb-12 font-light max-w-[440px] text-[#a38779] font-sans tracking-wide mx-auto text-center px-4"
          >
            O cabelo perfeito se encaixa na sua rotina!<br />
            Com planejamento, previsibilidade e<br />
            <span className="font-bold">acompanhamento profissional.</span>
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full h-24 md:h-32 mb-8 md:mb-12 overflow-hidden"
          >
            <img 
               src="/ao entrar no clube.webp" 
               alt="Ao Entrar no Clube" 
               width="320"
               height="120"
               loading="lazy"
               decoding="async"
               className="h-full w-auto mx-auto object-contain" 
               onError={e => {
                  e.currentTarget.src = '/ao entrar no clube.png';
               }} 
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="border border-[#a38779]/40 px-8 py-2 md:py-3 mb-8 md:mb-12 inline-block"
          >
            <span className="text-[#a38779] tracking-[0.2em] text-[11px] md:text-xs">você tem <strong className="font-bold text-[#a38779] tracking-[0.2em]">acesso a:</strong></span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="border border-[#a38779]/30 p-8 md:p-12 w-full max-w-lg text-left bg-[#040404]/50 backdrop-blur-sm mx-auto"
          >
            <ul className="space-y-4 text-[#a38779]/90 font-light text-[13px] md:text-[15px] tracking-wide">
              {[
                "Planejamento de cuidados;",
                "Procedimentos organizados ao longo do ano;",
                "Acompanhamento técnico contínuo;",
                "Prioridade no agendamento;",
                "Análise técnica do fio;",
                "Planejamento de cortes, hidratações e escovas;",
                "Frequência adequada para cada tipo de cabelo;",
                "Manutenção estratégica ao longo do ano;"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-[#a38779] text-lg shrink-0 mt-0.5">diamond</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>


      </section>

      {/* Admin Quick Access Footer */}
      <div id="contato" className="w-full bg-[#040404] border-t border-[#a38779]/10 pt-16 pb-8 px-4 flex flex-col items-center">
         <div className="text-center mb-12">
            <h4 className="text-[#a38779] tracking-widest uppercase text-sm mb-4">Contato</h4>
            <div className="flex flex-col gap-2 text-[#f7f4ec]/70 font-light text-sm">
               <p>(82) 99312-5883</p>
               <p>@adrianacoiffeur</p>
               <p>Shopping da Vila, Centro - Delmiro Gouveia - AL</p>
            </div>
         </div>
        <button onClick={onAdmin} className="text-[#a38779]/30 hover:text-[#a38779] text-[10px] tracking-widest uppercase flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
          Acesso Administrativo
        </button>
      </div>
    </div>
  );
};

const HomeScreen: React.FC<{
  onAgendar: () => void;
  onChat: () => void;
  onMais: () => void;
  onAssinatura: () => void;
  onProducts: () => void;
}> = ({ onAgendar, onChat, onPerfil, onMais, onAssinatura, onProducts }) => (
  <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark transition-colors">
    <header className="sticky top-0 z-50 flex items-center justify-center bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 dark:border-white/5 gap-2 transition-colors">
      <img 
        src="/logo.webp" 
        alt="Logo" 
        width="32"
        height="32"
        loading="eager"
        decoding="async"
        className="h-8 w-auto" 
        onError={e => (e.currentTarget.src = '/logo.png')} 
      />
      <h2 className="text-lg font-bold leading-tight tracking-tight text-center text-slate-900 dark:text-white">Adriana Coiffeur</h2>
    </header>
    <main className="flex-1 flex flex-col px-4 pt-4 max-w-md mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vamos agendar o seu<br />corte?</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={onAgendar} className="relative group flex flex-col items-start justify-end p-4 h-40 w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Agendamento" 
              src="/agendamento.webp" 
              width="200"
              height="160"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover" 
              onError={e => (e.currentTarget.src = '/agendamento.png')} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 flex flex-col items-start gap-1">
            <div className="mb-1 rounded-full bg-primary p-2 text-white">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </div>
            <span className="text-left text-sm font-bold leading-tight text-white">Fazer o meu agendamento</span>
          </div>
        </button>
        <button onClick={onChat} className="relative group flex flex-col items-start justify-end p-4 h-40 w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5 active:scale-[0.98] transition-all">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Adriana" 
              src="/adriana.webp" 
              width="200"
              height="160"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover" 
              onError={e => (e.currentTarget.src = '/adriana.png')} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 flex flex-col items-start gap-1">
            <div className="mb-1 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </div>
            <span className="text-left text-sm font-bold leading-tight text-white">Falar com Adriana</span>
          </div>
        </button>
        <button onClick={onAssinatura} className="relative group flex flex-col items-start justify-end h-32 w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5 active:scale-[0.98] transition-all col-span-2">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Clube do Cabelo Perfeito" 
              src="/clube.webp" 
              width="400"
              height="128"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover" 
              onError={e => (e.currentTarget.src = '/clube.png')} 
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
          </div>
        </button>
        <button onClick={onProducts} className="relative group flex flex-col items-start justify-end p-4 h-32 w-full rounded-[2rem] overflow-hidden shadow-lg bg-gradient-to-br from-pink-500 to-rose-600 active:scale-[0.98] transition-all col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-20">
             <span className="material-symbols-outlined text-6xl text-white">shopping_basket</span>
          </div>
          <div className="relative z-10 flex flex-col items-start gap-1">
            <div className="mb-1 rounded-full bg-white/20 p-2 text-white backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </div>
            <span className="text-left text-sm font-bold leading-tight text-white uppercase tracking-wider">Conheça nossa Vitrine</span>
          </div>
        </button>
      </div>
      <div className="flex flex-col flex-1 items-start gap-4 text-slate-800 dark:text-white px-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Horários de Funcionamento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Seg - Sáb: 10:00 - 20:00</p>
          </div>
        </div>
        <div className="flex items-start gap-3 mt-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-outlined">location_on</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Endereço</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shopping da Vila, Centro, Delmiro Gouveia - AL</p>
          </div>
        </div>
      </div>
    </main>
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg pt-2 transition-colors">
      <div className="flex items-center justify-around px-2 pb-6">
        <button onClick={onAgendar} className="flex flex-1 flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-[24px] filled">calendar_month</span>
          <span className="text-[10px] font-medium uppercase">Agendar</span>
        </button>
        <button onClick={onPerfil} className="flex flex-1 flex-col items-center gap-1 text-gray-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">calendar_month</span>
          <span className="text-[10px] font-medium uppercase">Meus Agendamentos</span>
        </button>
        <button onClick={onMais} className="flex flex-1 flex-col items-center gap-1 text-gray-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[24px]">logout</span>
          <span className="text-[10px] font-medium uppercase">Sair</span>
        </button>
      </div>
    </nav>
  </div>
);

const SelectCategoryScreen: React.FC<{
  categories: Category[];
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ categories, booking, setBooking, onNext, onBack }) => {
  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors">
              <span className="material-symbols-outlined font-bold">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Categorias</h2>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">O que faremos hoje?</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Selecione uma categoria para ver os serviços disponíveis.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setBooking({ ...booking, selectedCategory: cat });
                  onNext();
                }}
                className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm hover:border-primary/40 hover:scale-[1.02] transition-all flex flex-col items-center gap-3 text-center group"
              >
                <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl">{cat.icon || 'category'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900 dark:text-white leading-tight">{cat.name}</span>
                  {cat.description && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 max-w-[120px] leading-tight font-medium">{cat.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

const SelectServicesScreen: React.FC<{
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
  services: Service[];
}> = ({ booking, setBooking, onNext, onBack, services }) => {
  const toggleService = (service: Service) => {
    setBooking(prev => {
      const exists = prev.selectedServices.find(s => s.id === service.id);
      if (exists) {
        return { ...prev, selectedServices: prev.selectedServices.filter(s => s.id !== service.id) };
      }
      return { ...prev, selectedServices: [...prev.selectedServices, service] };
    });
  };

  const formatPhoneBr = (v: string) => {
    const numbers = v.replace(/\D/g, '').slice(0, 11);
    if (!numbers) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    // (XX) 9 XXXX-XXXX
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const totalPrice = booking.selectedServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5 flex items-center p-4 transition-colors">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Serviços</h2>
        </header>
        <main className="flex-1 p-4 pb-32 max-w-md mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">Escolha o Serviço</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Selecione um ou mais serviços para o seu agendamento.</p>
          </div>
          <div className="mb-8 space-y-4">
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={booking.customerPhone}
              onChange={async (e) => {
                const raw = e.target.value;
                const formatted = formatPhoneBr(raw);
                const digits = formatted.replace(/\D/g, '');

                setBooking(prev => ({ ...prev, customerPhone: formatted }));

                if (digits.length >= 10) {
                  // Now that DB is clean, simple eq('phone', digits) is enough
                  const { data: client } = await supabase.from('clients')
                    .select('*')
                    .eq('phone', digits)
                    .single();

                  if (client) {
                    // Fetch subscriptions separately to avoid 406 errors with nested joins
                    const { data: subs } = await supabase.from('user_subscriptions')
                      .select('*, subscription_plans(*)')
                      .eq('client_id', client.id);

                    const activeSub = subs?.find((s: any) => s.status === 'APPROVED');
                    let subData;
                    if (activeSub) {
                      const plan = activeSub.subscription_plans;

                      // 1. Fetch Plan services with individual limits
                      const { data: ps } = await supabase.from('plan_services').select('service_id, monthly_limit').eq('plan_id', plan.id);
                      const serviceLimits: Record<string, number> = {};
                      ps?.forEach(s => { serviceLimits[String(s.service_id)] = s.monthly_limit; });
                      const allowedIds = ps?.map(s => String(s.service_id)) || [];

                      // 2. Fetch all appointments this month to calculate usage
                      const startOfMonth = format(new Date(), 'yyyy-MM-01');
                      const { data: monthApps } = await supabase
                        .from('appointments')
                        .select('id, services:appointment_services(service_id)')
                        .eq('client_id', client.id)
                        .gte('appointment_date', startOfMonth)
                        .in('status', ['COMPLETED', 'PENDING']);

                      // 3. Fetch Service Component mapping to "unpack" combos
                      const { data: sc } = await supabase.from('service_components').select('*');
                      const componentsMap: Record<string, string[]> = {};
                      sc?.forEach(item => {
                        if (!componentsMap[String(item.parent_service_id)]) componentsMap[String(item.parent_service_id)] = [];
                        componentsMap[String(item.parent_service_id)].push(String(item.component_service_id));
                      });

                      // 4. Calculate real usage per service ID
                      const usage: Record<string, number> = {};
                      monthApps?.forEach(app => {
                        const appServices = app.services || [];
                        appServices.forEach((s: any) => {
                          const sId = String(s.service_id);
                          // Increment specific service usage
                          usage[sId] = (usage[sId] || 0) + 1;

                          if (componentsMap[sId]) {
                            // It is a combo, increment components too
                            componentsMap[sId].forEach(compId => {
                              usage[compId] = (usage[compId] || 0) + 1;
                            });
                          }
                        });
                      });

                      subData = {
                        planName: plan?.name || 'Assinatura',
                        cutsUsed: monthApps?.length || 0, // Keep for legacy if needed
                        cutsLimit: plan?.monthly_limit || 0, // Keep for legacy
                        serviceLimits,
                        serviceUsage: usage,
                        allowedServices: allowedIds,
                        isActive: true
                      };
                    }
                    setBooking(prev => ({
                      ...prev,
                      customerName: client.name,
                      birthDate: client.birth_date,
                      clientSubscription: subData
                    }));
                  } else {
                    setBooking(prev => ({ ...prev, clientSubscription: undefined }));
                  }
                } else {
                  setBooking(prev => ({ ...prev, clientSubscription: undefined }));
                }
              }}
              className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary placeholder:text-gray-400"
            />
            {booking.clientSubscription?.isActive && (
              <div className="bg-primary-dark/10 border border-primary-dark/20 p-3 rounded-xl flex items-center justify-between animate-fade-in transition-colors">
                <div className="flex items-center gap-2 text-primary-dark dark:text-primary-dark/80">
                  <span className="material-symbols-outlined filled">crown</span>
                  <span className="text-sm font-bold">{booking.clientSubscription.planName}</span>
                </div>
                <span className="text-xs font-bold text-primary-dark dark:text-primary-dark/70 uppercase tracking-wider">
                  Plano Ativo
                </span>
              </div>
            )}
            <input
              type="text"
              placeholder="Seu nome completo"
              value={booking.customerName}
              onChange={(e) => setBooking({ ...booking, customerName: e.target.value })}
              className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary placeholder:text-gray-400"
            />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data de Nascimento (Opcional)</label>
              <input
                type="date"
                value={booking.birthDate || ''}
                onChange={(e) => setBooking({ ...booking, birthDate: e.target.value })}
                className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
              />
              <p className="text-[9px] text-gray-400 px-1 italic">Cadastre para ganhar mimos no seu aniversário!</p>
            </div>
          </div>
          <div className="space-y-4">
            {(() => {
              const filtered = services.filter(s => String(s.category_id) === String(booking.selectedCategory?.id));
              const prioritized = [...filtered].sort((a, b) => {
                const aAllowed = booking.clientSubscription?.isActive && booking.clientSubscription.allowedServices?.includes(a.id);
                const bAllowed = booking.clientSubscription?.isActive && booking.clientSubscription.allowedServices?.includes(b.id);
                if (aAllowed && !bAllowed) return -1;
                if (!aAllowed && bAllowed) return 1;
                return 0;
              });
              return prioritized.map(service => (
                <label key={service.id} className={`relative flex gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border transition-all cursor-pointer ${booking.selectedServices.some(s => s.id === service.id) ? 'border-primary' : 'border-gray-200 dark:border-transparent'} shadow-sm hover:shadow-md`}>
                  <div className="size-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
                    <img
                      src={service.imageUrl}
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center'); e.currentTarget.parentElement!.innerHTML = '<span class="material-symbols-outlined text-gray-400">image_not_supported</span>'; }}
                      className="w-full h-full object-cover"
                      alt={service.name}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{service.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mt-1">{service.description}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-primary font-bold text-sm">
                        {(() => {
                          const isSub = booking.clientSubscription?.isActive;
                          const isAllowed = booking.clientSubscription?.allowedServices?.includes(service.id);

                          if (isSub && isAllowed) {
                            return (
                              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm filled">check_circle</span>
                                {(() => {
                                  const isSelected = booking.selectedServices.some(s => s.id === service.id);

                                  // Check if it's a combo or individual
                                  // For simplicity in the UI counter, we show the status of the service itself IF it has a direct limit
                                  // OR if it's a combo, we could show something more complex, but let's stick to the "basic" service limit for now.
                                  const limit = booking.clientSubscription!.serviceLimits[service.id] || 0;
                                  const currentUsed = booking.clientSubscription!.serviceUsage[service.id] || 0;

                                  if (limit > 0) {
                                    let available = limit - currentUsed;
                                    if (isSelected) {
                                      const selectedCountBefore = booking.selectedServices
                                        .slice(0, booking.selectedServices.findIndex(s => s.id === service.id))
                                        .filter(s => s.id === service.id).length;
                                      available = Math.max(0, available - (selectedCountBefore + 1));
                                    }
                                    return `${available}/${limit}`;
                                  }
                                  return "Incluso";
                                })()}
                              </span>
                            );
                          }
                          return `R$ ${service.price.toFixed(2)}`;
                        })()}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {service.duration} min</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={booking.selectedServices.some(s => s.id === service.id)}
                    onChange={() => toggleService(service)}
                    className="hidden"
                  />
                </label>
              ));
            })()}
          </div>
        </main>
        <footer className="fixed bottom-0 w-full bg-white/95 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-gray-100 dark:border-white/5 p-5 pb-8 transition-colors">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-tighter">
                Total estimado
              </span>
              <span className="text-2xl font-bold text-primary">
                {(() => {
                  const sub = booking.clientSubscription;
                  if (!sub?.isActive) return `R$ ${totalPrice.toFixed(2)}`;
                  // Calculate real cost: free for plan services within limit, price for others
                  const limits = sub.serviceLimits || {};
                  const usage = { ...(sub.serviceUsage || {}) };
                  const price = booking.selectedServices.reduce((sum, s) => {
                    const limit = limits[s.id];
                    if (limit !== undefined && limit > 0) {
                      const used = usage[s.id] || 0;
                      if (used < limit) { usage[s.id] = used + 1; return sum; }
                    }
                    return sum + s.price;
                  }, 0);
                  return `R$ ${price.toFixed(2)}`;
                })()}
              </span>
            </div>
            <button
              disabled={booking.selectedServices.length === 0 || !booking.customerName}
              onClick={onNext}
              className="flex-1 bg-primary text-white font-bold py-3.5 px-6 rounded-lg shadow-lg disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const SelectDateTimeScreen: React.FC<{
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ booking, setBooking, onNext, onBack }) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const nextDays = useMemo(() => getNextDays(14), []);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [workHours, setWorkHours] = useState<any[]>([]);
  const [minAdvance, setMinAdvance] = useState(0);

  useEffect(() => {
    const initData = async () => {
      // Fetch Work Hours for the professional
      let whQuery = supabase.from('work_hours').select('*');
      if (booking.selectedProfessional) {
        whQuery = whQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: wh } = await whQuery;
      if (wh) setWorkHours(wh);

      // Fetch Blocks for the professional
      let blocksQuery = supabase.from('blocked_slots').select('*');
      if (booking.selectedProfessional) {
        blocksQuery = blocksQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: blocks } = await blocksQuery;
      if (blocks) {
        setBlockedSlots(blocks.map((b: any) => ({
          ...b,
          time: b.time?.slice(0, 5) || b.time
        })));
      }

      // Fetch Appointments for the professional
      let appsQuery = supabase.from('appointments').select('*, services:appointment_services(service:services(duration))').neq('status', 'CANCELLED');
      if (booking.selectedProfessional) {
        appsQuery = appsQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: apps } = await appsQuery;

      if (apps) {
        setExistingAppointments(apps.map((a: any) => {
          const totalDuration = a.services?.reduce((sum: number, item: any) => sum + (item.service?.duration || 30), 0) || 30;
          return {
            ...a,
            date: a.appointment_date,
            time: a.appointment_time?.slice(0, 5) || a.appointment_time,
            duration: totalDuration
          };
        }));
      }

      // Fetch Settings: min_advance_minutes
      const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'min_advance_minutes').single();
      if (settingsData) {
        setMinAdvance(parseInt(settingsData.value) || 0); // Default 0
      }
    };
    initData();
  }, []);

  useEffect(() => {
    const selectedDateStr = nextDays[selectedDateIndex].dateStr;
    const dateObj = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const dayConfig = workHours.find(w => w.day_of_week === dayOfWeek);

    if (!dayConfig || !dayConfig.is_open) {
      setAvailableTimes([]);
      return;
    }

    const times: string[] = [];
    const step = 15;
    const myDuration = booking.selectedServices.reduce((sum, s) => sum + s.duration, 0) || 30;

    const generateSlots = (start: string, end: string) => {
      if (!start || !end) return;
      let [h, m] = start.slice(0, 5).split(':').map(Number);
      const [endH, endM] = end.slice(0, 5).split(':').map(Number);

      const shiftStartMins = h * 60 + m; // Start of the shift
      const shiftEndMins = endH * 60 + endM; // End of the shift

      const toMins = (t: string) => {
        const [hh, mm] = t.split(':').map(Number);
        return hh * 60 + mm;
      };

      while (true) {
        const currentSlotStart = h * 60 + m;
        const currentSlotEnd = currentSlotStart + myDuration;

        if (currentSlotEnd > shiftEndMins) break;

        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        const now = new Date();
        const isToday = selectedDateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        let isPast = false;

        if (isToday) {
          const nowMins = now.getHours() * 60 + now.getMinutes();
          // Enforce Minimum Advance Time
          if (currentSlotStart <= (nowMins + minAdvance)) isPast = true;
        }

        let isBlocked = false;
        if (!isPast) {
          for (const bloc of blockedSlots) {
            if (bloc.date === selectedDateStr) {
              const blockStart = toMins(bloc.time);
              if (blockStart >= currentSlotStart && blockStart < currentSlotEnd) {
                isBlocked = true;
                break;
              }
            }
          }

          if (!isBlocked) {
            for (const app of existingAppointments) {
              if (app.date === selectedDateStr && app.status !== 'CANCELLED') {
                const appStart = toMins(app.time);
                const appEnd = appStart + app.duration;
                if (currentSlotStart < appEnd && currentSlotEnd > appStart) {
                  isBlocked = true;
                  break;
                }
              }
            }
          }
        }

        if (!isPast && !isBlocked) {
          times.push(timeStr);
        }

        m += step;
        if (m >= 60) {
          h += Math.floor(m / 60);
          m = m % 60;
        }
      }
    };

    if (dayConfig.is_morning_open !== false) {
      generateSlots(dayConfig.start_time_1, dayConfig.end_time_1);
    }
    if (dayConfig.start_time_2 && dayConfig.end_time_2 && dayConfig.is_afternoon_open !== false) {
      generateSlots(dayConfig.start_time_2, dayConfig.end_time_2);
    }

    setAvailableTimes(times);

  }, [selectedDateIndex, blockedSlots, workHours, existingAppointments, booking.selectedServices, minAdvance]);

  const handleTimeSelect = (time: string) => {
    setBooking({ ...booking, selectedDate: nextDays[selectedDateIndex].dateStr, selectedTime: time });
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5 flex items-center p-4 transition-colors">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Horário</h2>
        </header>

        <main className="flex-1 p-6 max-w-md mx-auto w-full">
          <h3 className="text-slate-900 dark:text-white font-bold mb-4">Dias Disponíveis</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-6">
            {nextDays.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDateIndex(i)}
                className={`min-w-[70px] p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${selectedDateIndex === i
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-white/5 text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
              >
                <span className="text-[10px] font-bold uppercase">{d.weekDay}</span>
                <span className="text-xl font-bold">{d.dayNum}</span>
              </button>
            ))}
          </div>

          <h3 className="text-slate-900 dark:text-white font-bold mb-4">Horários Livres</h3>
          <div className="grid grid-cols-4 gap-3">
            {availableTimes.map((t) => (
              <button
                key={t}
                onClick={() => handleTimeSelect(t)}
                className={`p-3 rounded-xl border font-bold text-sm transition-all ${booking.selectedTime === t && booking.selectedDate === nextDays[selectedDateIndex].dateStr
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white'
                  : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-white/5 text-slate-900 dark:text-white hover:border-gray-300 dark:hover:border-white/20'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </main>

        <footer className="sticky bottom-0 w-full bg-white/95 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-gray-100 dark:border-white/5 p-5 pb-8 transition-colors mt-auto">
          <div className="max-w-md mx-auto">
            <button
              onClick={onNext}
              disabled={!booking.selectedTime}
              className="w-full bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20"
            >
              Continuar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const AdminFinanceScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-01'),
    end: format(startOfDay(new Date()), 'yyyy-MM-dd')
  });

  // No local 'stats' state. We use derived state (useMemo) for instant updates.

  const [expenses, setExpenses] = useState<any[]>([]);
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [rawSubscriptions, setRawSubscriptions] = useState<any[]>([]);

  // Expenses Inputs
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Produto');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');

  const loadData = async () => {
    // 1. Fetch Expenses
    const { data: expData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (expData) setExpenses(expData);

    // 2. Fetch Appointments
    const { data: appData } = await supabase
      .from('appointments')
      .select('*, services:appointment_services(service:services(name)), clients(name)')
      .eq('status', 'COMPLETED');

    if (appData) {
      const mappedApps = appData.map((a: any) => ({
        ...a,
        date: a.appointment_date,
        services: a.services.map((s: any) => ({ name: s.service.name })),
        clientName: a.clients?.name || 'Cliente'
      }));
      setRawAppointments(mappedApps);
    }

    // 3. Fetch Approved Subscriptions
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(price)')
      .eq('status', 'APPROVED');

    if (subData) {
      const mappedSubs = subData.map((s: any) => ({
        ...s,
        date: s.approved_at ? s.approved_at.split('T')[0] : s.created_at.split(' ')[0],
        price: Number(s.plan?.price || 0)
      }));
      setRawSubscriptions(mappedSubs);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- DERIVED STATE (STATS) ---
  const stats = useMemo(() => {
    // Filter by Date Range
    const filteredApps = rawAppointments.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
    const filteredExps = expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
    const filteredSubs = rawSubscriptions.filter(s => s.date >= dateRange.start && s.date <= dateRange.end);

    // 1. Revenue & Expenses
    const appointmentRevenue = filteredApps.reduce((sum, a) => sum + Number(a.total_price), 0);
    const subscriptionRevenue = filteredSubs.reduce((sum, s) => sum + s.price, 0);
    const revenue = appointmentRevenue + subscriptionRevenue;
    const totalExpenses = filteredExps.reduce((sum, e) => sum + Number(e.amount), 0);
    const profit = revenue - totalExpenses;

    // 2. Ticket Average
    const count = filteredApps.length;
    const ticketAverage = count > 0 ? revenue / count : 0;

    // 3. Projection (Current Month)
    const today = new Date();
    const isCurrentMonth = dateRange.start.substring(0, 7) === today.toISOString().substring(0, 7);
    let projection = 0;
    if (isCurrentMonth) {
      const daysPassed = today.getDate();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      if (daysPassed > 0) {
        projection = (revenue / daysPassed) * daysInMonth;
      }
    }

    // 4. Comparison (Previous Month)
    const prevStart = format(addDays(parseISO(dateRange.start), -30), 'yyyy-MM-dd');
    const prevEnd = format(addDays(parseISO(dateRange.end), -30), 'yyyy-MM-dd');
    const prevRevenue = rawAppointments
      .filter(a => a.date >= prevStart && a.date <= prevEnd)
      .reduce((sum, a) => sum + a.total_price, 0);

    // 5. Trend Chart (Daily)
    const dailyMap: any = {};
    filteredApps.forEach(a => {
      dailyMap[a.date] = (dailyMap[a.date] || 0) + a.total_price;
    });
    const revenueHistory = Object.entries(dailyMap)
      .map(([date, total]) => ({ date: format(parseISO(date), 'dd/MM'), total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Service Ranking
    const serviceMap: any = {};
    filteredApps.forEach(a => {
      a.services.forEach((s: any) => {
        serviceMap[s.name] = (serviceMap[s.name] || 0) + 1;
      });
    });
    const serviceRanking = Object.entries(serviceMap)
      .map(([name, count]) => ({ name, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 7. Top Clients
    const clientMap: any = {};
    filteredApps.forEach(a => {
      clientMap[a.clientName] = (clientMap[a.clientName] || 0) + a.total_price;
    });
    const topClients = Object.entries(clientMap)
      .map(([name, total]) => ({ name, total: Number(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 8. LTV (Lifetime Value) - Based on ALL data
    const allUniqueClients = new Set(rawAppointments.map(a => a.client_id)).size;
    const allTimeRevenue = rawAppointments.reduce((sum, a) => sum + a.total_price, 0);
    const ltv = allUniqueClients > 0 ? allTimeRevenue / allUniqueClients : 0;

    // 9. Seasonal Data (Traffic by Day of Week)
    const weekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredApps.forEach(a => {
      const day = parseISO(a.date).getDay();
      weekCounts[day as keyof typeof weekCounts] += 1;
    });
    const daysLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const seasonalData = Object.entries(weekCounts).map(([day, count]) => ({
      day: daysLabel[Number(day)],
      count: count
    }));

    return {
      revenue,
      expenses: totalExpenses,
      profit,
      ticketAverage,
      projection,
      prevMonthRevenue: prevRevenue,
      revenueHistory,
      serviceRanking,
      topClients,
      ltv,
      seasonalData
    };
  }, [rawAppointments, expenses, dateRange]);

  const handleMonthFilter = (monthOffset: number) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), monthOffset, 1);
    const start = format(startOfDay(targetDate), 'yyyy-MM-01');
    const end = format(addDays(new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0), 0), 'yyyy-MM-dd');
    setDateRange({ start, end });
  }

  const handleAddExpense = async () => {
    if (!desc || !amount) return alert('Preencha descrição e valor');
    const { error } = await supabase.from('expenses').insert({
      description: desc,
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) alert('Erro ao adicionar: ' + error.message);
    else {
      setDesc(''); setAmount('');
      loadData();
      alert('Despesa adicionada!');
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm('Deletar despesa?')) return;
    supabase.from('expenses').delete().eq('id', id)
      .then(() => loadData());
  };

  const handlePrint = () => {
    window.print();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors print:bg-white print:p-0">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors print:hidden">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Financeiro Avançado</h2>
          <button onClick={handlePrint} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">print</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto w-full pb-24 print:max-w-none print:pb-0">

        {/* Date Filter & Quick Filters */}
        <div className="space-y-3 print:hidden">
          <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full bg-gray-50 dark:bg-white/5 rounded-lg p-2 text-slate-900 dark:text-white border border-gray-200 dark:border-white/10" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full bg-gray-50 dark:bg-white/5 rounded-lg p-2 text-slate-900 dark:text-white border border-gray-200 dark:border-white/10" />
            </div>
          </div>

          {/* Quick Month Selectors */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => {
              // Fix: Parse manually to avoid Timezone issues with new Date("YYYY-MM-DD")
              const [y, M] = dateRange.start.split('-').map(Number);
              const currentYear = new Date().getFullYear();
              const isActive = (M - 1) === idx && y === currentYear;

              return (
                <button
                  key={m}
                  onClick={() => handleMonthFilter(idx)}
                  className={`px-4 py-2 border rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-slate-900 dark:text-white'
                    }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

        </div>


        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl print:hidden">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-surface-dark shadow text-slate-900 dark:text-white' : 'text-gray-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-surface-dark shadow text-slate-900 dark:text-white' : 'text-gray-500'}`}>Despesas</button>
        </div>

        {
          activeTab === 'dashboard' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase font-bold">Faturamento</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">R$ {stats.revenue.toFixed(2)}</h3>
                  {stats.prevMonthRevenue > 0 && (
                    <p className={`text-xs font-bold mt-1 ${stats.revenue >= stats.prevMonthRevenue ? 'text-green-500' : 'text-red-500'}`}>
                      {stats.revenue >= stats.prevMonthRevenue ? '▲' : '▼'} vs mês anterior
                    </p>
                  )}
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase font-bold">Lucro Líquido</p>
                  <h3 className={`text-2xl font-black ${stats.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {stats.profit.toFixed(2)}</h3>
                  <p className="text-xs text-gray-400 mt-1">Margem: {stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(0) : 0}%</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase font-bold">Ticket Médio</p>
                  <h3 className="text-2xl font-black text-blue-500">R$ {stats.ticketAverage.toFixed(2)}</h3>
                  <p className="text-xs text-gray-400 mt-1">por atendimento</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <p className="text-xs text-gray-500 uppercase font-bold">LTV (Lifetime Value)</p>
                  <h3 className="text-2xl font-black text-purple-500">R$ {stats.ltv.toFixed(2)}</h3>
                  <p className="text-xs text-gray-400 mt-1">Média por cliente</p>
                </div>
              </div>

              {/* Main Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm min-h-[300px]">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Tendência de Receita</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.revenueHistory}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#222', borderRadius: '8px', border: 'none', color: '#fff' }}
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                        />
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Seasonality Chart */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm min-h-[300px]">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">📊 Fluxo de Agendamentos (Filtro Atual)</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.seasonalData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#222', borderRadius: '8px', border: 'none', color: '#fff' }}
                          formatter={(value: number) => [`${value}`, 'Agendamentos']}
                        />
                        <Bar dataKey="count" fill="#FF8042" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tables Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Services */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top Serviços</h3>
                  <div className="space-y-3">
                    {stats.serviceRanking.map((s: any, idx: number) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-500">{s.count} agend.</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Clients */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top 5 Clientes</h3>
                  <div className="space-y-3">
                    {stats.topClients.map((c: any, idx: number) => (
                      <div key={c.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary`}>
                            {c.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{c.name}</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">R$ {c.total.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm print:hidden">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Adicionar Despesa</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (ex: Energia)" className="col-span-2 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)" className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
                  <select value={category} onChange={e => setCategory(e.target.value)} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <option>Produto</option>
                    <option>Infraestrutura</option>
                    <option>Marketing</option>
                    <option>Pessoal</option>
                    <option>Outros</option>
                  </select>
                </div>
                <button onClick={handleAddExpense} className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20">Adicionar Despesa</button>
              </div>

              <div className="space-y-3">
                {expenses.map(e => (
                  <div key={e.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{e.description}</p>
                      <p className="text-xs text-gray-500">{e.category} • {formatDateToBRL(e.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-500">- R$ {e.amount.toFixed(2)}</span>
                      <button onClick={() => handleDeleteExpense(e.id)} className="size-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center justify-center print:hidden"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

      </main >
    </div >
  );
};

const AdminBlockScheduleScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  const fetchBlocks = async () => {
    const { data } = await supabase.from('blocked_slots').select('*');
    if (data) setBlockedSlots(data);
  };

  useEffect(() => { fetchBlocks(); }, []);

  const handleBlock = async () => {
    if (!date || !time) return alert('Selecione data e hora');
    const { error } = await supabase.from('blocked_slots').insert({
      date,
      time,
      reason: reason || 'Bloqueado pelo Admin'
    });

    if (error) {
      alert('Erro ao bloquear: ' + error.message);
    } else {
      setDate(''); setTime(''); setReason('');
      fetchBlocks();
      alert('Horário bloqueado!');
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Liberar este horário?')) return;
    supabase.from('blocked_slots').delete().eq('id', id)
      .then(() => fetchBlocks());
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Bloquear Agenda</h2>
          <div className="size-10"></div>
        </div>
      </header>
      <main className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl space-y-3 border border-gray-200 dark:border-white/10 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white">Novo Bloqueio</h3>
          <input type="date" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" value={date} onChange={e => setDate(e.target.value)} />
          <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" value={time} onChange={e => setTime(e.target.value)} />
          <input type="text" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
          <button onClick={handleBlock} className="w-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-lg font-bold border border-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors">Bloquear Horário</button>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">Bloqueios Ativos</h3>
          {blockedSlots.map(b => (
            <div key={b.id} className="bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/5 flex justify-between items-center transition-colors">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {b.time}</p>
                <p className="text-xs text-gray-500">{b.reason}</p>
              </div>
              <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-white transition-colors"><span className="material-symbols-outlined">delete</span></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const ReviewScreen: React.FC<{
  booking: BookingState;
  onConfirm: () => void;
  onBack: () => void;
}> = ({ booking, onConfirm, onBack }) => {
  const isSubscriber = booking.clientSubscription?.isActive;
  const serviceLimits = booking.clientSubscription?.serviceLimits || {};
  const serviceUsage = booking.clientSubscription?.serviceUsage || {};

  // Helper: is a service covered by the plan within limits?
  // For combos, check if ALL component services are within limits.
  // We track running usage to handle multiple selections in same booking.
  const runningUsage = { ...serviceUsage };
  const serviceIsFree: Record<string, boolean> = {};
  if (isSubscriber) {
    booking.selectedServices.forEach(s => {
      const limit = serviceLimits[s.id];
      if (limit !== undefined && limit > 0) {
        const used = runningUsage[s.id] || 0;
        if (used < limit) {
          serviceIsFree[s.id] = true;
          runningUsage[s.id] = used + 1;
        } else {
          serviceIsFree[s.id] = false;
        }
      } else {
        serviceIsFree[s.id] = false;
      }
    });
  }

  const totalPrice = booking.selectedServices.reduce((sum, s) => {
    return serviceIsFree[s.id] ? sum : sum + s.price;
  }, 0);

  const hasFreeServices = Object.values(serviceIsFree).some(v => v);
  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative pb-24">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-white">arrow_back_ios_new</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Revisar Agendamento</h2>
          </div>
        </header>
        <main className="p-4 space-y-6 max-w-md mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Confira os detalhes</h1>
            <p className="text-sm text-gray-500 mt-1">Verifique as informações antes de confirmar.</p>
          </div>
          <section className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-4 flex gap-4 items-center">
              <div className="size-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">person</span></div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Cliente</span>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{booking.customerName} • {booking.customerPhone}</p>
                {booking.clientSubscription?.isActive && (
                  <div className="flex items-center gap-1 text-primary-dark font-bold text-[10px] mt-0.5">
                    <span className="material-symbols-outlined text-[12px] filled">crown</span>
                    {booking.clientSubscription.planName}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 flex gap-4 items-center border-t border-gray-100 dark:border-white/5 transition-colors">
              <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">calendar_month</span></div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Data e Hora</span>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{formatDateToBRL(booking.selectedDate)} • {booking.selectedTime}</p>
              </div>
            </div>
            <div className="p-4 flex gap-4 items-center border-t border-gray-100 dark:border-white/5 transition-colors">
              <div className="size-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">content_cut</span></div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Profissional</span>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{booking.selectedProfessional?.name || 'Tanto faz (Qualquer um)'}</p>
              </div>
            </div>
          </section>
          <section className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-white/5 p-5 shadow-sm transition-colors">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-900 dark:text-white"><span className="material-symbols-outlined text-primary text-xl">receipt_long</span> Resumo</h3>
            <div className="space-y-4">
              {booking.selectedServices.map((s, idx) => (
                <div key={s.id} className="flex justify-between text-sm text-slate-900 dark:text-white">
                  <div>
                    <p className="font-bold">{s.name}</p>
                    <span className="text-xs text-gray-500">{s.duration} min</span>
                  </div>
                  {serviceIsFree[s.id] ? (
                    <p className="font-bold text-primary-dark">
                      {(() => {
                        const limit = serviceLimits[s.id] || 0;
                        const idxInSelection = booking.selectedServices.slice(0, idx).filter(sv => sv.id === s.id).length;
                        const used = serviceUsage[s.id] || 0;
                        return limit > 0 ? `${used + idxInSelection + 1}/${limit}` : 'Incluso';
                      })()}
                    </p>
                  ) : (
                    <p className="font-bold">R$ {s.price.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center transition-colors">
              <span className="font-bold text-slate-900 dark:text-white">Total</span>
              <div className="text-right">
                {isSubscriber && hasFreeServices ? (
                  <>
                    <p className="text-[10px] text-primary-dark font-bold uppercase tracking-widest mb-1">Assinatura Ativa</p>
                    <span className="text-xl font-black text-primary-dark">
                      {totalPrice === 0 ? 'Incluso na Assinatura' : `R$ ${totalPrice.toFixed(2)} (parcial)`}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-primary">R$ {totalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>
          </section>
        </main>
        <footer className="fixed bottom-0 w-full p-4 bg-white/95 dark:bg-background-dark border-t border-gray-200 dark:border-white/5 z-40 transition-colors">
          <div className="max-w-md mx-auto">
            <button onClick={onConfirm} className="w-full bg-primary h-14 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 group shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
              <span>Confirmar Agendamento</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const MyAppointmentsScreen: React.FC<{
  appointments: Appointment[];
  showPastHistory: boolean;
  setShowPastHistory: (show: boolean) => void;
  onBack: () => void;
  onNew: () => void;
  onRefresh: () => void;
}> = ({ appointments, showPastHistory, setShowPastHistory, onBack, onNew, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return appointments.filter(app => {
      // Date comparison
      if (app.date > currentDate) return activeTab === 'upcoming';
      if (app.date < currentDate) return activeTab === 'past';

      // If date is today, check time
      const [h, m] = app.time.split(':').map(Number);
      const appTime = h * 60 + m;

      if (activeTab === 'upcoming') {
        return appTime > currentTime;
      } else {
        return appTime <= currentTime;
      }
    }).sort((a, b) => { // Sort
      if (activeTab === 'upcoming') {
        // Ascending for upcoming
        return (a.date + a.time).localeCompare(b.date + b.time);
      } else {
        // Descending for past
        return (b.date + b.time).localeCompare(a.date + a.time);
      }
    });
  }, [appointments, activeTab]);

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/5 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-white">arrow_back_ios_new</span>
            </button>
            <h1 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Meus Agendamentos</h1>
          </div>
        </header>

        <main className="p-4 space-y-6 max-w-md mx-auto w-full flex-1">
          <div className="flex bg-gray-100 dark:bg-surface-dark p-1 rounded-xl transition-colors">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-primary text-white shadow-sm' : 'text-gray-500'}`}
            >
              Próximos
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'past' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              Anteriores
            </button>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              {activeTab === 'upcoming' ? 'Agendamentos Futuros' : 'Histórico'}
            </h2>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-dark/30 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed transition-colors">
                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-700 mb-2">event_busy</span>
                <p className="text-gray-500 text-sm mb-4">Nenhum agendamento {activeTab === 'upcoming' ? 'marcado' : 'encontrado'}.</p>
                {activeTab === 'past' && !showPastHistory && (
                  <button
                    onClick={() => setShowPastHistory(true)}
                    className="px-6 py-2 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all flex items-center gap-2 mx-auto"
                  >
                    <span className="material-symbols-outlined text-base">history</span>
                    Carregar Todo o Histórico
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredAppointments.map(app => (
                  <div key={app.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-white/5 mb-4 overflow-hidden shadow-sm relative hover:border-primary/20 dark:hover:border-white/10 transition-all">
                    <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl tracking-wider uppercase ${app.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}>{app.status === 'PENDING' ? 'Pendente' : app.status === 'CONFIRMED' ? 'Confirmado' : app.status === 'COMPLETED' ? 'Concluído' : app.status === 'CANCELLED' ? 'Cancelado' : app.status}</div>
                    <div className="p-4 flex gap-4">
                      <div className={`size-16 rounded-xl flex flex-col items-center justify-center border transition-colors ${activeTab === 'past' ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'
                        }`}>
                        <span className="text-[10px] font-bold uppercase text-gray-500">Dia</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{app.date.split('-')[2]}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{app.services?.[0]?.name || 'Serviço não especificado'} {app.services?.length > 1 ? `+ ${app.services.length - 1} serviço` : ''}</h3>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_month</span> {formatDateToBRL(app.date)}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {app.time}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] transition-colors">
                      <span className="font-bold text-slate-900 dark:text-white">R$ {app.totalPrice.toFixed(2)}</span>
                      {activeTab === 'upcoming' && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Deseja realmente cancelar este agendamento?')) {
                              const { error } = await supabase.from('appointments').delete().eq('id', app.id);
                              if (error) {
                                console.error('Erro ao cancelar:', error);
                                alert('Não foi possível cancelar o agendamento.');
                              } else {
                                onRefresh();
                              }
                            }
                          }}
                          className="text-primary text-xs font-bold uppercase flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {activeTab === 'past' && !showPastHistory && (
                  <button
                    onClick={() => setShowPastHistory(true)}
                    className="w-full py-4 text-primary text-xs font-bold uppercase hover:bg-primary/5 rounded-xl transition-all"
                  >
                    Ver agendamentos mais antigos
                  </button>
                )}
              </>
            )}
          </section>

          <div className="mt-8 p-6 rounded-3xl bg-primary/5 border border-primary/20 text-center shadow-sm">
            <div className="p-4 bg-primary/10 rounded-2xl inline-flex text-primary mb-4 shadow-inner"><span className="material-symbols-outlined text-[32px]">add_circle</span></div>
            <h3 className="font-bold text-lg mb-1 text-slate-900 dark:text-white">Novo Agendamento</h3>
            <p className="text-sm text-gray-500 mb-6 px-4">Precisa de um trato no visual? Escolha um novo serviço e horário.</p>
            <button onClick={onNew} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Agendar Horário</button>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Chat Screens ---

const AdminChatListScreen: React.FC<{ onBack: () => void; onSelectChat: (clientId: string, clientName: string) => void }> = ({ onBack, onSelectChat }) => {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const fetchConvos = async () => {
      // Fetch all messages and group by client on frontend mostly for simplicity (or use a view in Supabase in real app)
      // We'll fetch all unique clients from messages

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, clients!chat_messages_client_id_fkey(name, phone)')
        .order('sent_at', { ascending: false });

      if (data) {
        const convos: any[] = [];
        const clientIds = new Set();

        data.forEach((msg: any) => {
          if (msg.client_id && !clientIds.has(msg.client_id)) {
            clientIds.add(msg.client_id);
            convos.push({
              id: String(msg.client_id),
              name: msg.clients?.name || 'Unknown',
              phone: msg.clients?.phone || '',
              last_message: msg.sent_at,
              // msg_count: ... 
            });
          }
        });
        setConversations(convos);
      }
    };

    fetchConvos();
    const interval = setInterval(fetchConvos, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors text-slate-900 dark:text-white">
          <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-bold">Conversas</h2>
            <div className="size-10"></div>
          </div>
        </header>
        <main className="max-w-md mx-auto w-full p-4 space-y-2 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhuma conversa iniciada.</div>
        ) : (conversations.map(c => (
          <button key={c.id} onClick={() => onSelectChat(c.id, c.name)} className="w-full bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex gap-4 items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm">
            <div className="size-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold border border-primary/20">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{c.name}</h3>
                <span className="text-[10px] text-gray-400">{new Date(c.last_message).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</p>
            </div>
          </button>
        )))}
      </main>
    </div>
  </div>
);
};

const ChatScreen: React.FC<{
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRegister: (identity: { name: string, phone: string }) => void;
  onBack: () => void;
  currentUserRole: 'CUSTOMER' | 'BARBER';
  customerIdentity?: { name: string; phone: string };
  chatClientId?: string; // For Admin
}> = ({ messages, onSendMessage, onRegister, onBack, currentUserRole, customerIdentity, chatClientId }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Local state for identifying customer if not provided
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  // Determine if we need identity. 
  // If Customer role and no identity provided via props, show form.
  const needsIdentity = currentUserRole === 'CUSTOMER' && !customerIdentity?.phone;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, needsIdentity]);

  const handleStartChat = () => {
    if (!tempName || !tempPhone) {
      alert("Por favor, informe seu nome e telefone para iniciar o chat.");
      return;
    }
    onRegister({ name: tempName, phone: tempPhone });
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const otherPersonName = currentUserRole === 'CUSTOMER' ? 'Adriana Henrique' : (customerIdentity?.name || 'Cliente');
  const otherPersonRole = currentUserRole === 'CUSTOMER' ? 'Atendimento' : 'Cliente';

  if (needsIdentity) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
        <div className="flex flex-col p-6 max-w-md mx-auto w-full justify-center min-h-screen relative">
        <button onClick={onBack} className="absolute top-6 left-6 size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined">arrow_back</span></button>
        <div className="text-center mb-8">
          <div className="size-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20"><span className="material-symbols-outlined text-4xl filled">chat</span></div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quase lá!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Para falar com a Adriana, precisamos saber quem é você.</p>
        </div>
        <div className="space-y-4">
          <input value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Seu Nome" />
          <input value={tempPhone} onChange={e => setTempPhone(e.target.value)} className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Seu Telefone (WhatsApp)" />
          <button onClick={handleStartChat} className="w-full bg-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 text-white">Iniciar Chat</button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col h-screen relative">
        <header className="p-4 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 flex items-center gap-3 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center gap-3">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="size-10 rounded-full bg-gray-200 dark:bg-surface-dark border border-gray-200 dark:border-white/5 flex items-center justify-center overflow-hidden">
              <img src={currentUserRole === 'CUSTOMER' ? "/adriana.png" : "/logo.png"} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">{otherPersonName}</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500"></span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{otherPersonRole} Online</span>
              </div>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-transparent transition-colors">
          <div className="max-w-md mx-auto w-full space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === currentUserRole ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === currentUserRole
                  ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10'
                  : 'bg-white dark:bg-surface-dark text-slate-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-white/5 shadow-sm'
                  }`}>
                  {msg.text}
                  <div className={`text-[10px] mt-1 opacity-50 ${msg.sender === currentUserRole ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="p-4 bg-white/95 dark:bg-surface-dark/50 border-t border-gray-200 dark:border-white/5 pb-8 transition-colors">
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-gray-100 dark:bg-surface-dark border-transparent dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary text-slate-900 dark:text-white placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              className="size-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined filled">send</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};



const AdminWeeklyScheduleScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [interval, setInterval] = useState('15');
  const [minAdvance, setMinAdvance] = useState('0');

  const fetchSchedule = async () => {
    // Fetch Work Hours
    const { data: wh } = await supabase
      .from('work_hours')
      .select('*')
      .order('day_of_week');

    if (wh) setSchedule(wh);

    // Fetch Interval
    const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'interval_minutes').single();
    if (settingsData) setInterval(settingsData.value);

    // Fetch Min Advance
    const { data: advData } = await supabase.from('settings').select('*').eq('key', 'min_advance_minutes').single();
    if (advData) setMinAdvance(advData.value);

    setLoading(false);
  };

  useEffect(() => { fetchSchedule(); }, []);

  const handleToggleDay = async (day: any) => {
    const newVal = !day.is_open;
    // Optimistic
    setSchedule(prev => prev.map(d => d.id === day.id ? { ...d, is_open: newVal } : d));

    await supabase.from('work_hours').update({ is_open: newVal }).eq('id', day.id);
  };

  const handleSaveDay = async () => {
    if (!editingDay) return;
    const { error } = await supabase.from('work_hours').update({
      start_time_1: editingDay.start_time_1,
      end_time_1: editingDay.end_time_1,
      start_time_2: editingDay.start_time_2,
      end_time_2: editingDay.end_time_2,
      is_morning_open: editingDay.is_morning_open,
      is_afternoon_open: editingDay.is_afternoon_open
    }).eq('id', editingDay.id);

    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      setEditingDay(null);
      fetchSchedule();
    }
  };

  const handleSaveInterval = async (newInterval: string) => {
    setInterval(newInterval);
    await supabase.from('settings').upsert({ key: 'interval_minutes', value: newInterval });
  };

  const handleSaveMinAdvance = async (newVal: string) => {
    setMinAdvance(newVal);
    await supabase.from('settings').upsert({ key: 'min_advance_minutes', value: newVal });
  };

  const dayNames = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Horários de Atendimento</h2>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto w-full pb-24">
        {/* Interval Setting */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
            <label className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Intervalo</label>
            <select
              value={interval}
              onChange={e => handleSaveInterval(e.target.value)}
              className="w-full bg-gray-50 dark:bg-background-dark p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-primary/50 transition-colors"
            >
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hora</option>
            </select>
          </div>
          <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
            <label className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Antecedência</label>
            <select
              value={minAdvance}
              onChange={e => handleSaveMinAdvance(e.target.value)}
              className="w-full bg-gray-50 dark:bg-background-dark p-2 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-primary/50 transition-colors"
            >
              <option value="0">Nenhuma</option>
              <option value="30">30 min</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
              <option value="240">4 horas</option>
            </select>
          </div>
        </div>

        <h3 className="text-[11px] text-gray-500 font-bold uppercase pt-2 px-1">Semana</h3>

        {loading ? <div className="text-center p-10">Carregando...</div> : schedule.map(day => (
          <div key={day.id} className={`bg-gray-100 dark:bg-surface-dark rounded-3xl p-5 border ${day.is_open ? 'border-transparent' : 'border-gray-300 opacity-75'} transition-all`}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-800 dark:text-white capitalize">{dayNames[day.day_of_week]}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-gray-400">{day.is_open ? '' : 'Não Atendendo'}</span>
                <button
                  onClick={() => handleToggleDay(day)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors ${day.is_open ? 'bg-green-500' : 'bg-gray-400'}`}
                >
                  <div className={`h-5 w-5 bg-white rounded-full shadow-sm transition-transform ${day.is_open ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-black/20 p-4 rounded-2xl">
              {day.is_open ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm font-bold text-slate-700 dark:text-gray-300">
                  <span>{day.start_time_1?.slice(0, 5)}</span>
                  <span>{day.end_time_1?.slice(0, 5)}</span>
                  {day.start_time_2 && day.end_time_2 && (
                    <>
                      <span>{day.start_time_2?.slice(0, 5)}</span>
                      <span>{day.end_time_2?.slice(0, 5)}</span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-gray-400">Fechado</span>
              )}

              <button onClick={() => setEditingDay(day)} className="size-8 flex items-center justify-center text-gray-400 hover:text-primary">
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Edit Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-6">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
            <h3 className="font-bold text-xl mb-6 text-slate-900 dark:text-white text-center">Editar {dayNames[editingDay.day_of_week]}</h3>

            <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              {/* Morning Shift */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">wb_sunny</span>
                    Manhã
                  </label>
                  <button
                    onClick={() => setEditingDay({ ...editingDay, is_morning_open: !editingDay.is_morning_open })}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${editingDay.is_morning_open ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`h-4 w-4 bg-white rounded-full shadow-sm transition-transform ${editingDay.is_morning_open ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                <div className={`grid grid-cols-2 gap-2 text-center transition-all duration-300 ${!editingDay.is_morning_open && 'opacity-40 grayscale pointer-events-none'}`}>
                  <input type="time" className="bg-white dark:bg-background-dark p-3 rounded-xl font-bold text-center border border-gray-200 dark:border-white/10" value={editingDay.start_time_1} onChange={e => setEditingDay({ ...editingDay, start_time_1: e.target.value })} />
                  <input type="time" className="bg-white dark:bg-background-dark p-3 rounded-xl font-bold text-center border border-gray-200 dark:border-white/10" value={editingDay.end_time_1} onChange={e => setEditingDay({ ...editingDay, end_time_1: e.target.value })} />
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/10"></div>

              {/* Afternoon Shift */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">wb_twilight</span>
                    Tarde
                  </label>
                  <button
                    onClick={() => setEditingDay({ ...editingDay, is_afternoon_open: !editingDay.is_afternoon_open })}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${editingDay.is_afternoon_open ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`h-4 w-4 bg-white rounded-full shadow-sm transition-transform ${editingDay.is_afternoon_open ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                <div className={`grid grid-cols-2 gap-2 text-center transition-all duration-300 ${!editingDay.is_afternoon_open && 'opacity-40 grayscale pointer-events-none'}`}>
                  <input type="time" className="bg-white dark:bg-background-dark p-3 rounded-xl font-bold text-center border border-gray-200 dark:border-white/10" value={editingDay.start_time_2 || ''} onChange={e => setEditingDay({ ...editingDay, start_time_2: e.target.value })} />
                  <input type="time" className="bg-white dark:bg-background-dark p-3 rounded-xl font-bold text-center border border-gray-200 dark:border-white/10" value={editingDay.end_time_2 || ''} onChange={e => setEditingDay({ ...editingDay, end_time_2: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button onClick={() => setEditingDay(null)} className="flex-1 py-3.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSaveDay} className="flex-1 py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSettingsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [interval, setInterval] = useState('30');
  const [lunchStart, setLunchStart] = useState('');
  const [lunchEnd, setLunchEnd] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const s: any = {};
        data.forEach((r: any) => s[r.key] = r.value);
        setStartTime(s.start_time || '09:00');
        setEndTime(s.end_time || '19:00');
        setInterval(s.interval_minutes || '30');
        setLunchStart(s.lunch_start || '');
        setLunchEnd(s.lunch_end || '');
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    const updates = [
      { key: 'start_time', value: startTime },
      { key: 'end_time', value: endTime },
      { key: 'interval_minutes', value: interval },
      { key: 'lunch_start', value: lunchStart },
      { key: 'lunch_end', value: lunchEnd }
    ];

    // Upsert all
    const { error } = await supabase.from('settings').upsert(updates);

    if (error) alert('Erro ao salvar: ' + error.message);
    else alert('Configurações salvas!');
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark flex items-center justify-between backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Configuração da Agenda</h2>
          <div className="size-10"></div>
        </div>
      </header>
      <main className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-white/10 space-y-4 transition-colors">
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Horário de Abertura</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Horário de Fechamento</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Intervalo entre Cortes (min)</label>
            <select value={interval} onChange={e => setInterval(e.target.value)} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white">
              <option value="15">15 minutos</option>
              <option value="20">20 minutos</option>
              <option value="30">30 minutos</option>
              <option value="40">40 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
            </select>
          </div>
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Início do Almoço (Opcional)</label>
            <input type="time" value={lunchStart} onChange={e => setLunchStart(e.target.value)} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Fim do Almoço (Opcional)</label>
            <input type="time" value={lunchEnd} onChange={e => setLunchEnd(e.target.value)} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white" />
          </div>
          <button onClick={handleSave} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 mt-4">Salvar Configurações</button>
        </div>
      </main>
    </div>
  );
};



const LoginScreen: React.FC<{ onLogin: () => void; onBack: () => void }> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [remember, setRemember] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Preencha todos os campos'); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error('Login error:', error.message);
      setError(error.message === 'Invalid login credentials' ? 'Email ou senha inválidos' : 'Erro ao fazer login');
    } else if (data.user) {
      if (remember) {
        localStorage.setItem('admin_auth', 'true');
      }
      onLogin();
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col p-6 max-w-md mx-auto w-full min-h-screen relative">
        <div className="flex items-center mb-8">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-white transition-colors"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Login</h2>
        </div>
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Painel Administrativo</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seu salão com facilidade e profissionalismo.</p>
        </div>
        <div className="flex flex-col items-center mb-10">
          <div className="size-24 rounded-full bg-white dark:bg-surface-dark border-4 border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden relative group shadow-lg transition-colors">
            <img src="/adriana.png" className="h-full w-full object-cover" />
            <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-white dark:border-background-dark shadow-md"><span className="material-symbols-outlined text-xs text-white">photo_camera</span></div>
          </div>
          <span className="text-primary text-sm font-bold mt-3">Adriana Henrique</span>
        </div>
        <div className="space-y-4 mb-10">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">alternate_email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-surface-dark border-transparent h-14 pl-12 pr-4 focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 dark:text-white placeholder:text-gray-400 shadow-sm"
              placeholder="E-mail profissional"
              type="email"
            />
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-surface-dark border-transparent h-14 pl-12 pr-4 focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 dark:text-white placeholder:text-gray-400 shadow-sm"
              placeholder="Senha"
              type="password"
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="remember" className="text-sm text-gray-500 dark:text-gray-400">Manter conectado</label>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center mb-4">{error}</p>}
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary h-14 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Entrando...' : 'Acessar Painel'}</span> <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

const AdminCalendarView: React.FC<{
  appointments: Appointment[];
  selectedDateStr: string;
  onDateChange: (dateStr: string) => void;
  onAppointmentClick: (app: Appointment) => void;
  workHours: any[];
  professionals: Professional[];
}> = ({ appointments, selectedDateStr, onDateChange, onAppointmentClick, workHours, professionals }) => {
  const [selectedProId, setSelectedProId] = useState<string | 'ALL'>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const START_HOUR = 8;
  const END_HOUR = 20;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
  const PIXELS_PER_MINUTE = 2; // Increased for better visibility (120px per hour)

  // Filter apps for selected date and professional
  const dayApps = appointments.filter(a => 
    a.date === selectedDateStr && 
    a.status !== 'CANCELLED' &&
    (selectedProId === 'ALL' || a.professionalId === selectedProId)
  );

  // Helper to calculate position
  const getPosition = (timeStr: string, duration: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startMinutes = (h * 60 + m) - (START_HOUR * 60);
    return {
      top: startMinutes * PIXELS_PER_MINUTE,
      height: duration * PIXELS_PER_MINUTE
    };
  };

  const timeSlots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    timeSlots.push(h);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-background-dark">
        <button onClick={() => {
          const current = parseISO(selectedDateStr);
          onDateChange(format(addDays(current, -1), 'yyyy-MM-dd'));
        }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-900 dark:text-white">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
            {format(parseISO(selectedDateStr), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <button onClick={() => {
          const current = parseISO(selectedDateStr);
          onDateChange(format(addDays(current, 1), 'yyyy-MM-dd'));
        }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-900 dark:text-white">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto relative no-scrollbar" style={{ height: '600px' }} ref={containerRef}>
        <div className="flex w-full relative min-h-full">
          {/* Time Sidebar */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-background-dark/50 z-10 sticky left-0">
            {timeSlots.map(h => (
              <div key={h} className="h-[120px] text-xs font-medium text-gray-500 text-right pr-2 pt-2 border-b border-gray-100 dark:border-white/5 relative">
                <span className="-top-3 relative">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Events Area */}
          <div className="flex-1 relative bg-white dark:bg-surface-dark bg-[linear-gradient(to_bottom,transparent_119px,rgba(0,0,0,0.05)_120px)] dark:bg-[linear-gradient(to_bottom,transparent_119px,rgba(255,255,255,0.05)_120px)] bg-[size:100%_120px]">
            {dayApps.map(app => {
              const totalDuration = app.services.reduce((sum, s) => sum + s.duration, 0) || 30;
              const pos = getPosition(app.time, totalDuration);
              const pro = professionals.find(p => p.id === app.professionalId);

              return (
                <div
                  key={app.id}
                  onClick={() => onAppointmentClick(app)}
                  className={`absolute left-2 right-2 rounded-lg p-2 border-l-4 shadow-sm cursor-pointer hover:brightness-95 transition-all
                      ${app.status === 'COMPLETED' ? 'bg-green-100 border-green-500 text-green-900' :
                      app.status === 'CONFIRMED' ? 'bg-blue-100 border-blue-500 text-blue-900' :
                        'bg-yellow-100 border-yellow-500 text-yellow-900'}
                    `}
                  style={{ 
                    top: `${pos.top}px`, 
                    height: `${pos.height}px`,
                    borderColor: pro?.color || undefined
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs truncate">{app.customerName}</span>
                      {pro && <span className="text-[8px] uppercase font-bold brightness-75" style={{ color: pro.color }}>{pro.name}</span>}
                    </div>
                    <span className="text-[10px] font-mono opacity-80">{app.time}</span>
                  </div>
                  <div className="text-[10px] opacity-90 truncate mt-0.5">
                    {app.services.map(s => s.name).join(', ')}
                  </div>
                </div>
              );
            })}

            {/* Current Time Line */}
            {selectedDateStr === format(new Date(), 'yyyy-MM-dd') && (() => {
              const now = new Date();
              const minutes = (now.getHours() * 60 + now.getMinutes()) - (START_HOUR * 60);
              if (minutes > 0 && minutes < TOTAL_MINUTES) {
                return (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                    style={{ top: `${minutes * PIXELS_PER_MINUTE}px` }}
                  >
                    <div className="size-2 bg-red-500 rounded-full -ml-1"></div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminTVScreen: React.FC<{ appointments: Appointment[]; onBack: () => void; onRefresh: () => void }> = ({ appointments, onBack, onRefresh }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workHours, setWorkHours] = useState<any[]>([]);
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.from('work_hours').select('*').then(({ data }) => { if (data) setWorkHours(data); });

    // Clock tick
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const refreshTimer = setInterval(() => onRefresh(), 10000);
    return () => { clearInterval(timer); clearInterval(refreshTimer); };
  }, [onRefresh]);

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  const nowTimeStr = format(currentTime, 'HH:mm');

  // Filter Active Apps
  const activeApps = appointments
    .filter(a => a.date === todayStr && (a.status === 'CONFIRMED' || a.status === 'PENDING'))
    .sort((a, b) => a.time.localeCompare(b.time));

  // --- TTS Logic ---
  useEffect(() => {
    // Check if any app is starting NOW (within this minute)
    const appStartingNow = activeApps.find(a => a.time.startsWith(nowTimeStr));

    if (appStartingNow && lastAnnouncedRef.current !== appStartingNow.id) {
      const text = `Cliente ${appStartingNow.customerName}, seu horário das ${appStartingNow.time.slice(0, 5)} chegou.`;
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'pt-BR';
      window.speechSynthesis.speak(speech);
      lastAnnouncedRef.current = String(appStartingNow.id);
    }
  }, [nowTimeStr, activeApps]);

  // --- Next Slots Logic ---
  // --- Next Slots Logic ---
  const nextSlots = useMemo(() => {
    if (!workHours.length) return [];

    const dow = currentTime.getDay(); // 0=Sun
    // Database uses 0-6 integers for day_of_week
    const todayConfig = workHours.find(w => w.day_of_week === dow);

    if (!todayConfig || !todayConfig.is_open) return [];

    const slots: string[] = [];
    const addSlots = (start: string, end: string) => {
      if (!start || !end) return;

      const toMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      let currMins = toMins(start.slice(0, 5));
      const endMins = toMins(end.slice(0, 5));

      // Prevent infinite loop: Max 24 hours of slots
      let safetyCounter = 0;
      while (currMins < endMins && safetyCounter < 50) {
        const h = Math.floor(currMins / 60);
        const m = currMins % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(timeStr);
        currMins += 30; // 30 min interval
        safetyCounter++;
      }
    };

    if (todayConfig.is_morning_open) addSlots(todayConfig.start_time_1, todayConfig.end_time_1);
    if (todayConfig.is_afternoon_open) addSlots(todayConfig.start_time_2, todayConfig.end_time_2);

    return slots.filter(slot => {
      if (slot <= nowTimeStr) return false;
      const isTaken = activeApps.some(a => a.time.startsWith(slot));
      return !isTaken;
    }).slice(0, 4);
  }, [workHours, nowTimeStr, activeApps, currentTime]);



  return (
    <div className="bg-slate-900 h-screen w-screen flex flex-col p-6 text-white overflow-hidden relative">
      <header className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0 h-[100px]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-white rounded-full p-2 flex items-center justify-center">
            <img src="/logo.png" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white shadow-black drop-shadow-lg leading-none">Agendamentos</h1>
            <p className="text-lg text-gray-400 uppercase tracking-widest font-bold">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-6xl font-black font-mono tracking-widest text-primary drop-shadow-[0_0_15px_rgba(212,17,50,0.5)] leading-none">
            {nowTimeStr}
          </div>
          <button onClick={onBack} className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-all">
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[1fr_260px] gap-6">
        {/* Appointments Grid */}
        <div className="overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
            {activeApps.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-10 opacity-30 mt-10">
                <span className="material-symbols-outlined text-[80px] mb-4">event_busy</span>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-center">Nenhum agendamento<br />ativo no momento</h2>
              </div>
            ) : (
              activeApps.map(app => {
                const appTimeParts = app.time.split(':');
                const start = new Date(currentTime);
                start.setHours(parseInt(appTimeParts[0]), parseInt(appTimeParts[1]), 0, 0);
                const duration = app.services.reduce((acc, s) => acc + s.duration, 0);
                const end = addMinutes(start, duration);
                const isNow = currentTime >= start && currentTime < end;

                return (
                  <div key={app.id} className={`${isNow ? 'bg-yellow-950/40 border-yellow-500 ring-2 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'bg-slate-800 border-primary'} rounded-2xl p-4 border-l-[8px] shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all duration-500`}>
                    <div className="absolute top-0 right-0 bg-white/5 px-4 py-2 rounded-bl-2xl">
                      <span className={`font-mono font-black text-2xl tracking-tighter ${isNow ? 'text-yellow-400' : 'text-white'}`}>{app.time.slice(0, 5)}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className={`size-14 rounded-xl bg-gradient-to-br ${isNow ? 'from-yellow-600 to-yellow-800 text-white shadow-yellow-900/50' : 'from-slate-700 to-slate-800 shadow-inner'} border border-white/5 flex items-center justify-center text-xl font-black shadow-lg shrink-0`}>
                        {app.customerName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-xl font-bold truncate leading-tight ${isNow ? 'text-yellow-100' : 'text-white'}`}>{app.customerName}</h3>
                        <p className={`truncate font-mono text-xs opacity-60 ${isNow ? 'text-yellow-200' : 'text-gray-400'}`}>{app.customerPhone}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-auto">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {app.services.slice(0, 2).map(s => (
                          <span key={s.id} className={`${isNow ? 'bg-yellow-600 text-white shadow-yellow-600/40' : 'bg-primary text-white shadow-primary/20'} px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm`}>
                            {s.name}
                          </span>
                        ))}
                        {app.services.length > 2 && <span className="text-[10px] opacity-70">+{app.services.length - 2}</span>}
                      </div>
                      <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isNow ? 'text-yellow-200' : 'text-gray-400'}`}>
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {duration} min
                        </span>
                        <span className="text-lg font-black text-green-400">R$ {app.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar / Widgets */}
        <div className="flex flex-col gap-4 h-full">
          {/* Quick Schedule QR */}
          <div className="bg-white p-4 rounded-2xl flex flex-col items-center text-center shadow-xl border-4 border-primary/20 shrink-0">
            <h3 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">Agende Agora</h3>
            <div className="bg-white p-1 rounded-lg mb-2 w-32 h-32">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(import.meta.env.VITE_SITE_URL || window.location.origin)}`} alt="QR Code" className="w-full h-full rounded" />
            </div>
            <p className="text-slate-500 font-bold text-[10px]">Aponte a câmera</p>
          </div>

          {/* Free Slots */}
          {nextSlots.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/10 flex-1 flex flex-col min-h-0">
              <h3 className="text-white/70 font-bold uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2 shrink-0">
                <span className="material-symbols-outlined text-sm">event_available</span>
                Horários Disponíveis
              </h3>
              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {nextSlots.map(slot => (
                  <div key={slot} className="bg-slate-700/50 p-2 rounded-lg flex justify-between items-center border border-white/5">
                    <span className="font-mono font-bold text-lg text-green-400">{slot}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Livre</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const AdminDashboard: React.FC<{
  appointments: Appointment[];
  showPastHistory: boolean;
  setShowPastHistory: (show: boolean) => void;
  onLogout: () => void;
  onOpenChat: () => void;
  onManageServices: () => void;
  onBlockSchedule: () => void;
  onSettings: () => void;
  onWeeklySchedule: () => void;
  onFinance: () => void;
  onTV: () => void;
  onSubscriptions: () => void;
  onRefresh: () => void;
  onClients: () => void;
  onProfessionals: () => void;
  onManageProducts: () => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  unreadCount: number;
  professionals: Professional[];
}> = ({ appointments, showPastHistory, setShowPastHistory, onLogout, onOpenChat, onManageServices, onBlockSchedule, onSettings, onWeeklySchedule, onFinance, onTV, onSubscriptions, onManagePlans, onRefresh, onClients, onProfessionals, onManageProducts, setAppointments, unreadCount, professionals }) => {
  const availableDays = useMemo(() => getNextDays(7), []);
  const [selectedDateStr, setSelectedDateStr] = useState(availableDays[0].dateStr); // Default to local today string
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [workHours, setWorkHours] = useState<any[]>([]);
  const [birthdayClients, setBirthdayClients] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('work_hours').select('*').then(({ data }) => { if (data) setWorkHours(data) });

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    supabase.from('clients')
      .select('name, phone, birth_date')
      .not('birth_date', 'is', null)
      .then(({ data }) => {
        if (data) {
          const matched = data.filter((c: any) => {
            const bDate = parseISO(c.birth_date);
            return (bDate.getMonth() + 1) === month && bDate.getDate() === day;
          });
          setBirthdayClients(matched);
        }
      });
  }, []);

  console.log('AdminDashboard Render:', {
    totalAppointments: appointments.length,
    selectedDateStr,
    appsForDay: appointments.filter(a => a.date === selectedDateStr).length
  });

  const selectedDayApps = appointments.filter(a => a.date === selectedDateStr);

  // Separate Pending (Normal) from Completed
  const pendingApps = selectedDayApps.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');

  const totalRevenue = appointments.reduce((sum, app) => sum + app.totalPrice, 0);

  const stats = useMemo(() => {
    const count = pendingApps.length;
    const revenue = selectedDayApps
      .filter(app => app.status !== 'CANCELLED')
      .reduce((sum, app) => sum + app.totalPrice, 0);
    return { count, revenue };
  }, [selectedDayApps, pendingApps]);

  const handleUpdateStatus = (id: string, status: string) => {
    // Optimistic Update
    setAppointments(prev => prev.map(app =>
      app.id === id ? { ...app, status } : app
    ));
    setActiveMenuId(null);

    supabase.from('appointments').update({ status }).eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          onRefresh(); // Revert if error (simple way)
        }
      });
  };

  const handleDeleteAppointment = (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja cancelar o agendamento de ${name}? O horário ficará disponível novamente.`)) return;

    supabase.from('appointments').delete().eq('id', id)
      .then(({ error }) => {
        if (error) alert('Erro ao cancelar');
        else onRefresh();
      });
  };

  const subscribeUser = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) { alert('VAPID Key missing'); return; }

        const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Send subscription to server (Supabase)
        // Check duplication (naive) or just insert
        await supabase.from('push_subscriptions').insert({ subscription });
        alert('Notificações em segundo plano ativadas!');
      } catch (err) {
        console.error('Subscription failed', err);
        alert('Erro ao ativar notificações. Verifique se o navegador tem permissão.');
      }
    } else {
      alert('Navegador não suportado.');
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm flex items-center justify-center p-1">
              <img src="/adriana.png" alt="Admin" className="h-full w-full object-cover rounded-full" />
            </div>
            <div>
              <h2 className="font-bold leading-none text-slate-900 dark:text-white text-sm">Agenda</h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Adriana Henrique</span>
            </div>
          </div>
          <button onClick={onLogout} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>
      <main className="p-4 pb-24 max-w-md mx-auto w-full">
        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onClients}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <span className="material-symbols-outlined filled">group</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Clientes</h3>
              <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">Gerenciar</p>
            </div>
          </button>

          <button
            onClick={onManageServices}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <span className="material-symbols-outlined filled">content_cut</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Serviços</h3>
              <p className="text-gray-500 dark:text-white/70 text-[10px] font-bold uppercase tracking-widest">Editar/Add</p>
            </div>
          </button>

          <button
            onClick={onOpenChat}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            {unreadCount > 0 && (
              <div className="absolute top-3 right-3 size-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm animate-bounce-custom">
                {unreadCount}
              </div>
            )}
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined filled">chat</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Chat</h3>
              <p className="text-gray-500 dark:text-white/70 text-[10px] font-bold uppercase tracking-widest">Conversas</p>
            </div>
          </button>

          <button
            onClick={onFinance}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <span className="material-symbols-outlined filled">payments</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Financeiro</h3>
              <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Relatórios</p>
            </div>
          </button>

          <button
            onClick={onBlockSchedule}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <span className="material-symbols-outlined filled">event_busy</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Bloquear</h3>
              <p className="text-gray-500 dark:text-white/70 text-[10px] font-bold uppercase tracking-widest">Fechar Horários</p>
            </div>
          </button>

          <button
            onClick={onWeeklySchedule}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <span className="material-symbols-outlined filled">calendar_clock</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Horários</h3>
              <p className="text-gray-500 dark:text-white/70 text-[10px] font-bold uppercase tracking-widest">Configurar Semana</p>
            </div>
          </button>

          <button
            onClick={subscribeUser}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <span className="material-symbols-outlined filled">notifications_active</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Alertas</h3>
              <p className="text-cyan-500 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-widest">Ativar Push</p>
            </div>
          </button>

          <button
            onClick={onProfessionals}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <span className="material-symbols-outlined filled">badge</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Equipe</h3>
              <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">Profissionais</p>
            </div>
          </button>

          <button
            onClick={onSubscriptions}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <span className="material-symbols-outlined filled">card_membership</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Assinaturas</h3>
              <p className="text-amber-600 dark:text-amber-500 text-[10px] font-bold uppercase tracking-widest">Aprovar/Ver</p>
            </div>
          </button>

          <button
            onClick={onManagePlans}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-gray-600 flex items-center justify-center text-white shadow-lg shadow-gray-600/20">
              <span className="material-symbols-outlined filled">settings_applications</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Planos</h3>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">Preços/QR</p>
            </div>
          </button>

          <button
            onClick={onManageProducts}
            className="relative group flex flex-col p-4 rounded-3xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <span className="material-symbols-outlined filled">shopping_basket</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Vitrine</h3>
              <p className="text-pink-500 text-[10px] font-bold uppercase tracking-widest">Produtos</p>
            </div>
          </button>

          <button
            onClick={onTV}
            className="relative group flex flex-col p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-primary/50 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white shadow-lg backdrop-blur-sm">
              <span className="material-symbols-outlined filled">desktop_windows</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Modo TV</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Painel</p>
            </div>
          </button>

          <button
            onClick={() => {
               if (window.confirm('Isso irá deslogar você, limpar todo o cache e recarregar o app. Útil para resolver erros de carregamento. Continuar?')) {
                  localStorage.clear();
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      for(let registration of registrations) registration.unregister();
                    });
                  }
                  window.location.reload();
               }
            }}
            className="relative group flex flex-col p-4 rounded-3xl bg-red-950 border border-red-900/30 hover:border-red-500 active:scale-[0.98] transition-all overflow-hidden shadow-lg h-32 justify-between"
          >
            <div className="size-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <span className="material-symbols-outlined filled">cleaning_services</span>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white">Limpar Tudo</h3>
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Resolver Erros</p>
            </div>
          </button>
        </div>

        {/* View Toggle & Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const current = parseISO(selectedDateStr);
                  setSelectedDateStr(format(addDays(current, -1), 'yyyy-MM-dd'));
                }}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              <div className="relative group">
                <div
                  className="flex flex-col items-center cursor-pointer select-none"
                  onClick={() => dateInputRef.current?.showPicker()}
                >
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    Visão Geral
                    <span className="material-symbols-outlined text-gray-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">edit_calendar</span>
                  </h3>
                  <p className="text-gray-500 text-xs">{selectedDateStr === new Date().toISOString().split('T')[0] ? 'Hoje' : formatDateToBRL(selectedDateStr)}</p>
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDateStr(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  style={{ visibility: 'hidden', position: 'absolute', bottom: 0, left: '50%' }}
                />
              </div>

              <button
                onClick={() => {
                  const current = parseISO(selectedDateStr);
                  setSelectedDateStr(format(addDays(current, 1), 'yyyy-MM-dd'));
                }}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-full">
              <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-surface-dark shadow text-slate-900 dark:text-white' : 'text-gray-400'}`}>
                <span className="material-symbols-outlined text-base">list</span>
              </button>
              <button onClick={() => setViewMode('CALENDAR')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-surface-dark shadow text-slate-900 dark:text-white' : 'text-gray-400'}`}>
                <span className="material-symbols-outlined text-base">calendar_view_day</span>
              </button>
            </div>
          </div>
        </div>

        {
          viewMode === 'CALENDAR' ? (
            <div className="animate-fade-in relative z-0">
              <AdminCalendarView
                appointments={appointments}
                selectedDateStr={selectedDateStr}
                onDateChange={setSelectedDateStr}
                workHours={workHours}
                professionals={professionals}
                onAppointmentClick={(app) => setActiveMenuId(app.id)}
              />
              {activeMenuId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setActiveMenuId(null)}>
                  <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-up border border-white/10" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Ações do Agendamento</h3>
                    <div className="space-y-3">
                      <button onClick={() => handleUpdateStatus(activeMenuId, 'CONFIRMED')} className="w-full p-4 bg-blue-500/10 text-blue-600 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-500/20"><span className="material-symbols-outlined">check</span> Confirmar</button>
                      <button onClick={() => handleUpdateStatus(activeMenuId, 'COMPLETED')} className="w-full p-4 bg-green-500/10 text-green-600 rounded-xl font-bold flex items-center gap-3 hover:bg-green-500/20"><span className="material-symbols-outlined">done_all</span> Concluir</button>
                      <button onClick={() => {
                        const app = appointments.find(a => a.id === activeMenuId);
                        if (app) handleDeleteAppointment(app.id, app.customerName);
                        setActiveMenuId(null);
                      }} className="w-full p-4 bg-red-500/10 text-red-600 rounded-xl font-bold flex items-center gap-3 hover:bg-red-500/20"><span className="material-symbols-outlined">delete</span> Cancelar</button>
                    </div>
                    <button onClick={() => setActiveMenuId(null)} className="w-full py-4 mt-2 text-gray-500 font-bold">Fechar</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>

              {/* Date Selector */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-1">
                {availableDays.map(d => (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDateStr(d.dateStr)}
                    className={`p-3 rounded-xl min-w-[70px] text-center flex flex-col transition-all border ${selectedDateStr === d.dateStr
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'bg-white dark:bg-surface-dark text-gray-500 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                  >
                    <span className={`text-[10px] uppercase font-bold mb-1 ${selectedDateStr === d.dateStr ? 'opacity-90' : 'opacity-60'}`}>
                      {d.isToday ? 'Hoje' : d.label}
                    </span>
                    <span className={`text-xl font-bold ${selectedDateStr === d.dateStr ? 'text-white' : 'text-slate-900 dark:text-gray-300'}`}>{d.dayNum}</span>
                  </button>
                ))}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-gray-200 dark:border-white/5 text-center shadow-sm transition-colors">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.count}</span>
                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-2 tracking-widest">Agendados</p>
                </div>
                <div className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-gray-200 dark:border-white/5 text-center shadow-sm transition-colors">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">R$ {stats.revenue.toFixed(0)}</span>
                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-2 tracking-widest">Previsão de Faturamento do dia</p>
                </div>
              </div>

              {birthdayClients.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-pink-500 to-rose-500 p-4 rounded-3xl text-white shadow-xl shadow-pink-500/20 animate-enter">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined filled">cake</span>
                    <h3 className="font-bold">Aniversariantes de Hoje!</h3>
                  </div>
                  <div className="space-y-2">
                    {birthdayClients.map(c => (
                      <div key={c.phone} className="flex items-center justify-between bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm leading-tight">{c.name}</span>
                          <span className="text-[10px] opacity-80">{c.phone}</span>
                        </div>
                        <button 
                          onClick={() => {
                              const text = `Parabéns ${c.name}! 🎉 Desejo um dia maravilhoso! Que tal vir comemorar no Adriana Coiffeur com um mimo especial?`;
                              window.open(`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="bg-white text-pink-500 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm hover:scale-105 transition-transform"
                        >
                          Parabenizar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-[11px] text-gray-500 font-bold uppercase mb-5 tracking-widest px-1 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Cronograma</span>
                  {!showPastHistory ? (
                    <button
                      onClick={() => setShowPastHistory(true)}
                      className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[10px]">history</span>
                      Ver Histórico
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPastHistory(false)}
                      className="text-[9px] bg-gray-100 dark:bg-white/5 text-gray-500 px-2 py-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[10px]">today</span>
                      Ocultar Histórico
                    </button>
                  )}
                </div>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full normal-case text-[10px]">{pendingApps.length} agendamentos</span>
              </h3>

              {/* Appointment List */}
              <div className="space-y-4">
                {pendingApps.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-surface-dark/40 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed transition-colors">
                    <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-700 mb-2">event_busy</span>
                    <p className="text-gray-500 text-sm">Sem compromissos pendentes.</p>
                  </div>
                ) : (
                  pendingApps.map((app) => (
                    <div key={app.id} className="group relative bg-white dark:bg-surface-dark p-5 rounded-3xl border-l-4 border-primary border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight">
                            {app.time}
                          </span>
                          <span className="text-gray-500 text-[10px] font-bold uppercase mt-0.5">
                            {app.services.reduce((total, s) => total + s.duration, 0)} min de duração
                          </span>
                        </div>
                        <span className="bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">
                          {app.status === 'PENDING' ? 'Pendente' : app.status === 'CONFIRMED' ? 'Confirmado' : app.status === 'COMPLETED' ? 'Concluído' : app.status === 'CANCELLED' ? 'Cancelado' : app.status}
                        </span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="size-12 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/5 flex items-center justify-center overflow-hidden shadow-inner transition-colors">
                          <span className="material-symbols-outlined text-gray-600 text-2xl">person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">{app.customerName}</h4>
                            {(() => {
                              const pro = professionals.find(p => p.id === app.professionalId);
                              if (!pro) return null;
                              return (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${pro.color}15`, color: pro.color, borderColor: `${pro.color}30` }}>
                                  {pro.name}
                                </span>
                              );
                            })()}
                            {app.clientSubscription?.isActive && (
                              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <span className="material-symbols-outlined text-xs filled">crown</span>
                                <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">{app.clientSubscription.planName}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 font-medium truncate opacity-80">
                              {app.services.map(s => s.name).join(' + ')}
                            </p>
                            {app.clientSubscription?.isActive && (() => {
                              const limits = app.clientSubscription.serviceLimits || {};
                              const usage = app.clientSubscription.serviceUsage || {};
                              // Find remaining for the booked services
                              const remainingList = app.services
                                .map(s => {
                                  const limit = limits[s.id];
                                  if (limit === undefined || limit === 0) return null;
                                  return Math.max(0, limit - (usage[s.id] || 0));
                                })
                                .filter(v => v !== null) as number[];
                              if (remainingList.length === 0) return null;
                              const minRemaining = Math.min(...remainingList);
                              return (
                                <span className="text-[10px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 font-bold">
                                  {minRemaining} {minRemaining === 1 ? 'disponível' : 'disponíveis'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === app.id ? null : app.id)}
                      className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {activeMenuId === app.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-100 dark:border-white/5 z-10 overflow-hidden animate-fade-in">
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-green-600"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span> Concluir
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-red-500"
                        >
                          <span className="material-symbols-outlined text-lg">cancel</span> Cancelar
                        </button>
                      </div>
                    )}
                  </div> */}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <a
                          href={`https://wa.me/55${app.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`*Essa mensagem é pra lembrar do seu agendamento!*

*Data:* ${app.date.split('-').reverse().join('/')}
*Horário:* ${app.time}
*Serviço:* ${app.services.map(s => s.name).join(', ')}
*Valor:* R$ ${app.totalPrice.toFixed(2).replace('.', ',')}
*Cliente:* ${app.customerName}

Dúvidas, responder a essa mensagem!`)}`}
                          target="_blank"
                          className="flex-1 h-10 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-500 flex items-center justify-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide border border-green-500/20"
                        >
                          <span className="material-symbols-outlined text-lg">chat</span>
                          WhatsApp
                        </a>
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'COMPLETED')}
                          className="flex-1 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center gap-1.5 transition-colors text-xs font-bold uppercase tracking-wide border border-primary/20"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Concluir
                        </button>
                        <button
                          onClick={() => {
                            if (confirmCancelId === app.id) {
                              // Second click: actually delete
                              supabase.from('appointments').delete().eq('id', app.id)
                                .then(({ error }) => {
                                  if (error) alert('Erro ao cancelar');
                                  else onRefresh();
                                });
                              setAppointments(prev => prev.filter(a => a.id !== app.id));
                              setConfirmCancelId(null);
                            } else {
                              setConfirmCancelId(app.id);
                            }
                          }}
                          className={`size-10 rounded-xl flex items-center justify-center transition-colors border ${confirmCancelId === app.id
                            ? 'bg-red-500 border-red-500 text-white animate-pulse'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                            }`}
                          title={confirmCancelId === app.id ? 'Confirmar cancelamento' : 'Cancelar Agendamento'}
                        >
                          <span className="material-symbols-outlined text-lg">{confirmCancelId === app.id ? 'warning' : 'close'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Completed Section */}
              <div className="mt-8 space-y-4 opacity-70">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">task_alt</span>
                  Concluídos Hoje ({selectedDayApps.filter(a => a.status === 'COMPLETED').length})
                </h3>
                <div className="space-y-3">
                  {selectedDayApps.filter(a => a.status === 'COMPLETED').map(app => (
                    <div key={app.id} className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-transparent flex justify-between items-center group grayscale hover:grayscale-0 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
                          {app.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white strike-through decoration-slate-900/30">{app.customerName}</p>
                          <p className="text-xs text-gray-500">{app.services.map(s => s.name).join(', ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{app.time}</p>
                        <p className="text-xs text-green-500 font-bold">Concluído</p>
                      </div>
                    </div>
                  ))}
                  {selectedDayApps.filter(a => a.status === 'COMPLETED').length === 0 && (
                    <p className="text-sm text-gray-400 italic">Nenhum atendimento concluído hoje.</p>
                  )}
                </div>
              </div>
            </>
          )
        }
      </main >
    </div >
  );
};

// --- Admin Services Screen ---
const CATEGORY_ICONS = [
  'content_cut', 'face', 'brush', 'spa', 'self_care', 'palette', 
  'auto_fix_high', 'face_retouching_natural', 'hand_gesture', 
  'health_and_beauty', 'flare', 'diamond', 'water_drop', 'chair',
  'person', 'girl', 'boy', 'magic_button'
];

const AdminServicesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({});
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    const { data: sData } = await supabase.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true });
    const { data: cData } = await supabase.from('service_categories').select('*').order('display_order', { ascending: true });
    
    if (sData) {
      setServices(sData.map((s: any) => ({
        ...s,
        imageUrl: s.image_url
      })));
    }
    if (cData) setCats(cData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Standard Supabase Bucket named 'services'
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('services')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found')) {
          alert('Erro: O "bucket" de armazenamento "services" não foi encontrado no Supabase. Por favor, crie-o no painel do Supabase com acesso público.');
        } else {
          throw error;
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('services')
        .getPublicUrl(filePath);

      setEditingService({ ...editingService, imageUrl: publicUrl });
    } catch (err: any) {
      console.error('Error uploading:', err);
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingService.name || !editingService.price) return;
    setLoading(true);

    const payload = {
      name: editingService.name,
      description: editingService.description,
      price: editingService.price,
      duration: editingService.duration,
      image_url: editingService.imageUrl,
      category_id: editingService.category_id,
      is_active: true
    };

    let error;
    if (editingService.id) {
      const { error: err } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('services')
        .insert(payload);
      error = err;
    }

    setLoading(false);
    if (error) {
      console.error(error);
      alert('Erro ao salvar serviço');
    } else {
      setIsEditing(false);
      setEditingService({});
      fetchData();
    }
  };

  const handleSaveCat = async () => {
    if (!editingCat?.name) return;
    setLoading(true);
    const payload = { 
      name: editingCat.name, 
      icon: editingCat.icon, 
      description: editingCat.description,
      display_order: editingCat.display_order || 0 
    };
    
    let error;
    if (editingCat.id) error = (await supabase.from('service_categories').update(payload).eq('id', editingCat.id)).error;
    else error = (await supabase.from('service_categories').insert(payload)).error;
    
    setLoading(false);
    if (!error) { setEditingCat(null); fetchData(); }
  };

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm('Excluir categoria? Serviços vinculados ficarão sem categoria.')) return;
    await supabase.from('service_categories').delete().eq('id', id);
    fetchData();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este serviço?')) return;
    supabase.from('services').update({ is_active: false }).eq('id', id)
      .then(() => fetchData());
  };

  if (isEditing) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
        <div className="flex flex-col p-6 max-w-md mx-auto w-full">
        <div className="flex items-center mb-8">
          <button onClick={() => setIsEditing(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome do Serviço</label>
            <input className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Ex: Corte de Cabelo" value={editingService.name || ''} onChange={e => setEditingService({ ...editingService, name: e.target.value })} />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 px-1">Descrição</label>
            <textarea className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 h-24 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Descreva os detalhes do serviço..." value={editingService.description || ''} onChange={e => setEditingService({ ...editingService, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Preço (R$)</label>
              <input type="number" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="0.00" value={editingService.price || ''} onChange={e => setEditingService({ ...editingService, price: parseFloat(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Duração (min)</label>
              <input type="number" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="30" value={editingService.duration || ''} onChange={e => setEditingService({ ...editingService, duration: parseInt(e.target.value) })} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 px-1">Foto do Serviço</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 truncate pr-10" 
                  placeholder="URL ou carregue um arquivo" 
                  value={editingService.imageUrl || ''} 
                  onChange={e => setEditingService({ ...editingService, imageUrl: e.target.value })} 
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <span className="material-symbols-outlined text-sm">{editingService.imageUrl ? 'link' : 'image'}</span>
                </div>
              </div>
              <label className="shrink-0 size-12 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-all overflow-hidden relative">
                {uploading ? (
                  <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add_a_photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </>
                )}
              </label>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 px-1">Categoria</label>
            <select 
              value={editingService.category_id || ''} 
              onChange={e => setEditingService({ ...editingService, category_id: e.target.value })}
              className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <option value="">Sem Categoria</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <button onClick={handleSave} disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20">
            {loading ? 'Salvando...' : 'Salvar Serviço'}
          </button>
        </div>
        </div>
      </div>
    );
  }


  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const catId = result.source.droppableId;
    if (catId !== result.destination.droppableId) return; // Only allow reordering within same category

    const catServices = services.filter(s => String(s.category_id) === catId);
    const otherServices = services.filter(s => String(s.category_id) !== catId);
    
    const items = Array.from(catServices).sort((a: Service, b: Service) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newServices = [...otherServices, ...items];
    setServices(newServices);

    // Update display_order for items in this category
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as Service;
      await supabase.from('services').update({ display_order: i }).eq('id', item.id);
    }
  };

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-bold text-slate-900 dark:text-white">Gerenciar Serviços</h2>
            <div className="size-10"></div>
          </div>
        </header>
      <main className="p-4 space-y-4 max-w-md mx-auto w-full pb-24">
        <DragDropContext onDragEnd={onDragEnd}>
          {cats.map(cat => {
            const catServices = services
              .filter(s => String(s.category_id) === String(cat.id))
              .sort((a: Service, b: Service) => (a.display_order ?? 0) - (b.display_order ?? 0));
            const isExpanded = expandedCats.has(cat.id);

            return (
              <div key={cat.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm transition-all mb-4">
                <div 
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1" onClick={() => toggleCat(cat.id)}>
                    <span className="material-symbols-outlined text-primary">{cat.icon || 'category'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-gray-500 font-bold">{catServices.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); }} className="size-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleCat(cat.id); }} className="size-8 rounded-lg flex items-center justify-center text-gray-400">
                      <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <Droppable droppableId={String(cat.id)}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="p-2 space-y-2 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
                        {catServices.length === 0 && (
                          <p className="text-center py-6 text-xs text-gray-400 italic">Nenhum serviço nesta categoria</p>
                        )}
                        {catServices.map((s, index) => (
                          // @ts-expect-error Link for known react-beautiful-dnd types issue with React 18
                          <Draggable key={s.id} draggableId={String(s.id)} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-200 dark:border-white/5 flex gap-3 items-center shadow-sm"
                              >
                                <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                                  <span className="material-symbols-outlined text-lg">drag_indicator</span>
                                </div>
                                <img src={s.imageUrl} className="size-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">{s.name}</h3>
                                  <p className="text-[10px] text-gray-500 font-medium">R$ {s.price.toFixed(2)} • {s.duration} min</p>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingService(s); setIsEditing(true); }} className="size-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                                  <button onClick={() => handleDelete(s.id)} className="size-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
          
          {services.filter(s => !s.category_id).length > 0 && (
            <div className="pt-6 mt-6 border-t-2 border-dashed border-gray-200 dark:border-white/5">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-3 px-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span> Sem Categoria
              </h4>
              <div className="space-y-2">
                {services.filter(s => !s.category_id).map(s => (
                  <div key={s.id} className="bg-white/50 dark:bg-surface-dark/50 p-3 rounded-xl border border-gray-100 dark:border-white/5 flex gap-3 items-center opacity-80">
                     <img src={s.imageUrl} className="size-10 rounded-lg object-cover grayscale opacity-50 shrink-0" />
                     <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-gray-500 truncate">{s.name}</h3>
                     </div>
                     <button onClick={() => { setEditingService(s); setIsEditing(true); }} className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg hover:bg-primary hover:text-white transition-all">Vincular</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DragDropContext>

        <button onClick={() => setEditingCat({ name: '', icon: 'category', display_order: cats.length })} className="w-full py-6 mt-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 font-bold hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 bg-white/30 dark:bg-white/5 group">
          <div className="size-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
          </div>
          Nova Categoria
        </button>

        {editingCat && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-scale-in">
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingCat.id ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <p className="text-sm text-gray-500 mt-1">Personalize como seus clientes verão seus serviços.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-2">Nome</label>
                  <input placeholder="Ex: Cortes Modernos" value={editingCat.name || ''} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-4 rounded-2xl border border-gray-200 dark:bg-background-dark dark:border-white/10 dark:text-white transition-all focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-2">Descrição</label>
                  <textarea placeholder="Ex: Cortes modernos e clássicos para todos os estilos" value={editingCat.description || ''} onChange={e => setEditingCat({...editingCat, description: e.target.value})} className="w-full p-4 rounded-2xl border border-gray-200 dark:bg-background-dark dark:border-white/10 dark:text-white h-24 transition-all focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-2 block">Escolha um Ícone</label>
                  <div className="grid grid-cols-5 gap-2 p-2 bg-gray-50 dark:bg-background-dark rounded-2xl border border-gray-100 dark:border-white/5">
                    {CATEGORY_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditingCat({...editingCat, icon})}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${editingCat.icon === icon ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-gray-200 dark:hover:bg-white/5 text-gray-500'}`}
                      >
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingCat(null)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
                <button onClick={handleSaveCat} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs tracking-widest uppercase">Salvar</button>
              </div>
              {editingCat.id && (
                <button onClick={() => { if(editingCat.id) handleDeleteCat(editingCat.id); }} className="w-full text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline pt-2">Excluir Categoria</button>
              )}
            </div>
          </div>
        )}
      </main>
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => { setEditingService({}); setIsEditing(true); }} className="size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-transform active:scale-95">
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      </div>
    </div>
  </div>
);
};


// --- Subscription Screens ---

const SelectPlanScreen: React.FC<{
  onSelect: (plan: SubscriptionPlan) => void;
  onBack: () => void;
}> = ({ onSelect, onBack }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscription status lookup
  const [phone, setPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<{
    planName: string;
    serviceLimits: Record<string, number>;
    serviceUsage: Record<string, number>;
    serviceNames: Record<string, string>;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const formatPhone = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 2) return `(${n}`;
    if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2, 3)} ${n.slice(3)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 3)} ${n.slice(3, 7)}-${n.slice(7)}`;
  };

  const handleLookup = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return;
    setLookupLoading(true);
    setSubStatus(null);
    setNotFound(false);

    const { data: client } = await supabase.from('clients').select('id').eq('phone', digits).single();
    if (!client) { setNotFound(true); setLookupLoading(false); return; }

    const { data: subs } = await supabase.from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('client_id', client.id);

    const activeSub = subs?.find((s: any) => s.status === 'APPROVED');
    if (!activeSub) { setNotFound(true); setLookupLoading(false); return; }

    const plan = activeSub.subscription_plans;
    const { data: ps } = await supabase.from('plan_services').select('service_id, monthly_limit').eq('plan_id', plan.id);
    const { data: svcs } = await supabase.from('services').select('id, name');
    const serviceNames: Record<string, string> = {};
    svcs?.forEach((s: any) => { serviceNames[String(s.id)] = s.name; });

    const limits: Record<string, number> = {};
    ps?.forEach((p: any) => { limits[String(p.service_id)] = p.monthly_limit; });

    // Compute usage from completed appointments this month
    const startOfMonth = format(new Date(), 'yyyy-MM-01');
    const { data: monthApps } = await supabase.from('appointments')
      .select('services:appointment_services(service:services(id))')
      .eq('client_id', client.id)
      .gte('appointment_date', startOfMonth)
      .in('status', ['COMPLETED', 'PENDING', 'CONFIRMED']);

    const { data: scData } = await supabase.from('service_components').select('*');
    const componentsMap: Record<string, string[]> = {};
    scData?.forEach((item: any) => {
      const pid = String(item.parent_service_id);
      if (!componentsMap[pid]) componentsMap[pid] = [];
      componentsMap[pid].push(String(item.component_service_id));
    });

    const usage: Record<string, number> = {};
    monthApps?.forEach((app: any) => {
      app.services?.forEach((sv: any) => {
        const sId = String(sv.service?.id);
        if (componentsMap[sId]) {
          componentsMap[sId].forEach(c => { usage[c] = (usage[c] || 0) + 1; });
        } else {
          usage[sId] = (usage[sId] || 0) + 1;
        }
      });
    });

    // Fetch pending/confirmed appointments for this client
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: pendingApps } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status, services:appointment_services(service:services(name))')
      .eq('client_id', client.id)
      .gte('appointment_date', today)
      .in('status', ['PENDING', 'CONFIRMED'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    setPendingAppointments(pendingApps || []);
    setSubStatus({ planName: plan.name, serviceLimits: limits, serviceUsage: usage, serviceNames });
    setLookupLoading(false);
  };

  useEffect(() => {
    supabase.from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
      .then(({ data }) => {
        if (data) setPlans(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative pb-12">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 border-b border-gray-200 dark:border-white/5 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-white">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Clube de Assinatura</h2>
          </div>
        </header>

      <main className="p-4 space-y-6 max-w-md mx-auto w-full">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase">ADRIANA COIFFEUR</h1>
          <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-4">Clube de Assinatura</p>
        </div>

        {/* Phone Lookup - Subscriber Status */}
        <div className="bg-zinc-900 dark:bg-black p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-amber-500 filled">crown</span>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">Consultar Meu Plano</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="(00) 0 0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="flex-1 bg-white/10 border border-white/10 text-white placeholder:text-gray-500 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleLookup}
              disabled={lookupLoading || phone.replace(/\D/g, '').length < 10}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95"
            >
              {lookupLoading ? '...' : 'Consultar'}
            </button>
          </div>

          {notFound && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">error</span>
              Nenhuma assinatura ativa encontrada para este número.
            </div>
          )}

          {subStatus && (
            <div className="border-t border-white/10 pt-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-amber-500 font-black text-sm uppercase tracking-widest">{subStatus.planName}</span>
                <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full font-bold uppercase">Ativo</span>
              </div>
              <div className="space-y-2">
                {Object.entries(subStatus.serviceLimits).map(([sId, limitVal]) => {
                  const limit = Number(limitVal);
                  const used = subStatus.serviceUsage[sId] || 0;
                  const remaining = Math.max(0, limit - used);
                  const pct = limit > 0 ? (used / limit) * 100 : 0;
                  return (
                    <div key={sId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300 font-medium">{subStatus.serviceNames[sId] || sId}</span>
                        <span className={`font-black ${remaining === 0 ? 'text-red-400' : 'text-amber-400'}`}>{remaining}/{limit} restante{remaining !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pending Appointments for Cancellation */}
          {subStatus && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Meus Agendamentos</p>
              {pendingAppointments.length === 0 ? (
                <p className="text-[10px] text-gray-600 font-medium text-center py-2">Nenhum agendamento futuro encontrado</p>
              ) : pendingAppointments.map((app: any) => {
                const [year, month, day] = app.appointment_date.split('-');
                const dateLabel = `${day}/${month}/${year}`;
                const timeLabel = app.appointment_time?.slice(0, 5) || '';
                const svcNames = app.services?.map((sv: any) => sv.service?.name).filter(Boolean).join(' + ') || '—';
                const isCancelling = cancellingId === app.id;
                return (
                  <div key={app.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{svcNames}</p>
                      <p className="text-gray-400 text-[10px] font-medium mt-0.5">{dateLabel} às {timeLabel}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (isCancelling) {
                          const { error } = await supabase.from('appointments').delete().eq('id', app.id);
                          if (!error) {
                            setPendingAppointments((prev: any[]) => prev.filter((a: any) => a.id !== app.id));
                          }
                          setCancellingId(null);
                        } else {
                          setCancellingId(app.id);
                        }
                      }}
                      className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${isCancelling
                        ? 'bg-red-500 border-red-500 text-white animate-pulse'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                        }`}
                    >
                      <span className="material-symbols-outlined text-xs">{isCancelling ? 'warning' : 'close'}</span>
                      {isCancelling ? 'Confirmar' : 'Cancelar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-center">Escolha o seu plano</p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold text-sm tracking-widest">CARREGANDO PLANOS...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="relative bg-zinc-900 dark:bg-black p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden group hover:border-amber-500/50 transition-all active:scale-[0.98]">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-8xl text-white">card_membership</span>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-500 text-xl">content_cut</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                  </div>
                  <p className="text-gray-400 text-xs font-medium">{plan.description}</p>

                  <div className="my-4">
                    <span className="text-amber-500 text-2xl font-black">R$ {Number(plan.price).toFixed(2)}</span>
                    <span className="text-gray-500 text-xs ml-2 font-bold uppercase tracking-wider">{plan.benefits}</span>
                  </div>

                  <button
                    onClick={() => onSelect(plan)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest"
                  >
                    Assinar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  </div>
);
};

const SubscriptionPaymentScreen: React.FC<{
  plan: SubscriptionPlan;
  onBack: () => void;
  onSubmit: (proof: string, phone: string, name: string) => void;
}> = ({ plan, onBack, onSubmit }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [proof, setProof] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchClientName = async (rawPhone: string) => {
    if (rawPhone.length < 10) return;
    const { data } = await supabase.from('clients').select('name').eq('phone', rawPhone).single();
    if (data?.name) setName(data.name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatPhone = (v: string) => {
    const numbers = v.replace(/\D/g, '').slice(0, 11);
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col pb-12 transition-colors">
      <header className="sticky top-0 z-50 flex items-center p-4 bg-white/95 dark:bg-background-dark/95 border-b border-gray-200 dark:border-white/5 transition-colors">
        <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10">
          <span className="material-symbols-outlined text-gray-600 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Pagamento</h2>
      </header>

      <main className="p-6 space-y-6 max-w-md mx-auto w-full">
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
          <div className="size-12 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-lg">
            <span className="material-symbols-outlined font-black">star</span>
          </div>
          <div>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest">Plano Selecionado</p>
            <h3 className="font-black text-lg text-slate-900 dark:text-white leading-none">{plan.name}</h3>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">R$ {Number(plan.price).toFixed(2)}/mês</p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-gray-200 dark:border-white/5 flex flex-col items-center text-center shadow-lg">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Escaneie o QR Code para pagar</h3>
          <div className="size-48 bg-gray-100 rounded-2xl flex items-center justify-center border-4 border-slate-900 dark:border-white mb-4 overflow-hidden shadow-inner">
            {plan.qr_code_url ? (
              <img src={plan.qr_code_url} alt="QR Code PIX" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-6xl text-gray-300">qr_code_2</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-6">Realize o pagamento e anexe o comprovante abaixo para ativação.</p>

          {plan.pix_code && (
            <div className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pix Copia e Cola</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-200 dark:border-white/10 text-[10px] font-mono break-all line-clamp-2">
                  {plan.pix_code}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(plan.pix_code || '');
                    alert('Código Pix copiado!');
                  }}
                  className="size-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
          )}

          <div className="w-full space-y-4">
            <input
              placeholder="Seu Telefone (WhatsApp)"
              className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              value={phone}
              onChange={e => {
                const formatted = formatPhone(e.target.value);
                setPhone(formatted);
                fetchClientName(formatted.replace(/\D/g, ''));
              }}
            />
            <input
              placeholder="Seu Nome Completo"
              className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${proof ? 'border-green-500 bg-green-500/5' : 'border-gray-200 dark:border-white/10 hover:border-amber-500/50'}`}>
                {proof ? (
                  <>
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <span className="text-green-600 font-bold text-xs uppercase">Comprovante Anexado</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-gray-400">upload_file</span>
                    <span className="text-gray-500 font-bold text-xs uppercase text-center px-4">Anexar Comprovante de Pagamento</span>
                  </>
                )}
              </div>
            </div>

            <button
              disabled={!name || !phone || !proof || loading}
              onClick={async () => {
                setLoading(true);
                await onSubmit(proof, phone, name);
                setLoading(false);
              }}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl shadow-xl disabled:opacity-30 disabled:scale-100 active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
            >
              {loading ? 'ENVIANDO...' : 'ENVIAR PARA APROVAÇÃO'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Admin Subscription Screens ---

const AdminSubscriptionsScreen: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [confirmCancelSubId, setConfirmCancelSubId] = useState<number | null>(null);
  const [availablePlans, setAvailablePlans] = useState<{ id: number; name: string }[]>([]);
  const [changingPlanId, setChangingPlanId] = useState<number | null>(null);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, client:clients(name, phone), plan:subscription_plans(id, name)')
      .order('created_at', { ascending: false });
    if (data) setSubs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
    supabase.from('subscription_plans').select('id, name').eq('is_active', true).order('price', { ascending: true })
      .then(({ data }) => { if (data) setAvailablePlans(data); });
  }, []);

  const handleStatus = async (id: number, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status, approved_at: status === 'APPROVED' ? new Date().toISOString() : null })
      .eq('id', id);
    if (!error) fetchSubs();
  };

  const handleChangePlan = async (subId: number, planId: number) => {
    setChangingPlanId(subId);
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ plan_id: planId })
      .eq('id', subId);
    if (!error) fetchSubs();
    setChangingPlanId(null);
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col pb-12 transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-4xl mx-auto w-full flex items-center p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-600 dark:text-white font-bold">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Gerenciar Assinaturas</h2>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : subs.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-medium">Nenhuma assinatura encontrada.</div>
        ) : (
          <div className="grid gap-4">
            {subs.map(sub => (
              <div key={sub.id} className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.client?.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      sub.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        sub.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-700'
                      }`}>
                      {sub.status === 'APPROVED' ? 'APROVADO' :
                        sub.status === 'CANCELLED' ? 'CANCELADO' :
                          sub.status === 'REJECTED' ? 'REJEITADO' :
                            'PENDENTE'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{sub.client?.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-xs text-gray-400">swap_horiz</span>
                    <select
                      value={sub.plan?.id ?? sub.plan_id}
                      disabled={changingPlanId === sub.id}
                      onChange={async (e) => {
                        const newPlanId = Number(e.target.value);
                        if (newPlanId !== (sub.plan?.id ?? sub.plan_id)) {
                          await handleChangePlan(sub.id, newPlanId);
                        }
                      }}
                      className="text-xs font-bold text-primary bg-transparent border-none outline-none cursor-pointer hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {availablePlans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {changingPlanId === sub.id && (
                      <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(sub.created_at).toLocaleString('pt-BR')}</p>
                </div>

                <div className="flex items-center gap-3">
                  {sub.payment_proof_url && (
                    <button
                      onClick={() => setSelectedProof(sub.payment_proof_url)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      VER COMPROVANTE
                    </button>
                  )}

                  {sub.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatus(sub.id, 'APPROVED')}
                        className="size-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                        title="Aprovar"
                      >
                        <span className="material-symbols-outlined">check</span>
                      </button>
                      <button
                        onClick={() => handleStatus(sub.id, 'REJECTED')}
                        className="size-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        title="Rejeitar"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}

                  {sub.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        if (confirmCancelSubId === sub.id) {
                          handleStatus(sub.id, 'CANCELLED');
                          setConfirmCancelSubId(null);
                        } else {
                          setConfirmCancelSubId(sub.id);
                        }
                      }}
                      className={`size-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${confirmCancelSubId === sub.id
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400 hover:bg-red-500 hover:text-white'
                        }`}
                      title={confirmCancelSubId === sub.id ? 'Confirmar cancelamento' : 'Cancelar Assinatura'}
                    >
                      <span className="material-symbols-outlined text-sm">{confirmCancelSubId === sub.id ? 'warning' : 'block'}</span>
                    </button>
                  )}

                  {(sub.status === 'CANCELLED' || sub.status === 'REJECTED') && (
                    <button
                      onClick={() => handleStatus(sub.id, 'APPROVED')}
                      className="flex items-center gap-1.5 px-3 h-10 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-green-500/20 transition-all active:scale-95"
                      title="Reativar Assinatura"
                    >
                      <span className="material-symbols-outlined text-sm">bookmark_add</span>
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Proof Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-bold text-slate-900 dark:text-white">Comprovante de Pagamento</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-black/20 min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={selectedProof}
                alt="Comprovante"
                className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-white/5"
              />
            </div>
            <div className="p-4 text-center">
              <button
                onClick={() => setSelectedProof(null)}
                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all active:scale-95 text-xs uppercase"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminManagePlansScreen: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  // Local controlled state for Qtd inputs: planId -> serviceId -> limit value
  const [localLimits, setLocalLimits] = useState<Record<string, Record<string, number>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<{
    name: string;
    price: number;
    pix_code: string;
    qr_code_url: string;
    service_limits: Record<string, number>;
  }>({
    name: '',
    price: 0,
    pix_code: '',
    qr_code_url: '',
    service_limits: {}
  });

  // Sync localLimits whenever plans data is refreshed from DB
  useEffect(() => {
    const next: Record<string, Record<string, number>> = {};
    plans.forEach(p => {
      next[p.id] = { ...(p.service_limits || {}) };
    });
    setLocalLimits(next);
  }, [plans]);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setServices(data.map((s: any) => ({ ...s, id: String(s.id), imageUrl: s.image_url })));
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true });
    if (data) {
      const withServices = await Promise.all(
        data.map(async (p: any) => {
          const { data: ps } = await supabase.from('plan_services').select('service_id, monthly_limit').eq('plan_id', p.id);
          const serviceLimits: Record<string, number> = {};
          ps?.forEach(s => {
            serviceLimits[String(s.service_id)] = s.monthly_limit;
          });
          return {
            ...p,
            allowed_services: ps?.map(s => String(s.service_id)) || [],
            service_limits: serviceLimits
          };
        })
      );
      setPlans(withServices);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
    fetchServices();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlan.name || newPlan.price <= 0) {
      alert('Por favor, preencha o nome e um preço válido.');
      return;
    }

    const { data: createdPlan, error: planError } = await supabase
      .from('subscription_plans')
      .insert({
        name: newPlan.name,
        description: `Plano ${newPlan.name}`,
        price: newPlan.price,
        pix_code: newPlan.pix_code,
        qr_code_url: newPlan.qr_code_url,
        is_active: true,
        monthly_limit: 0
      })
      .select()
      .single();

    if (planError) {
      alert('Erro ao criar plano: ' + planError.message);
      return;
    }

    if (createdPlan) {
      const servicesList = Object.keys(newPlan.service_limits);
      if (servicesList.length > 0) {
        await supabase.from('plan_services').insert(
          servicesList.map(sId => ({
            plan_id: createdPlan.id,
            service_id: parseInt(sId),
            monthly_limit: newPlan.service_limits[sId] || 0
          }))
        );
      }
      setIsCreating(false);
      setNewPlan({ name: '', price: 0, pix_code: '', qr_code_url: '', service_limits: {} });
      fetchPlans();
    }
  };

  const handleUpdate = async (id: string, price: number, qr_code_url: string, pix_code: string, service_limits: Record<string, number>) => {
    const current = plans.find(p => p.id === id);
    const servicesList = Object.keys(service_limits).sort();
    const currentServicesList = (current?.allowed_services || []).sort();

    if (current &&
      Number(current.price) === price &&
      current.qr_code_url === qr_code_url &&
      current.pix_code === pix_code &&
      JSON.stringify(currentServicesList) === JSON.stringify(servicesList) &&
      JSON.stringify(current.service_limits) === JSON.stringify(service_limits)) {
      return;
    }

    const { error } = await supabase
      .from('subscription_plans')
      .update({ price, qr_code_url, pix_code })
      .eq('id', id);

    if (!error) {
      // Update services mapping with limits
      await supabase.from('plan_services').delete().eq('plan_id', id);
      if (servicesList.length > 0) {
        await supabase.from('plan_services').insert(
          servicesList.map(sId => ({
            plan_id: parseInt(id),
            service_id: parseInt(sId),
            monthly_limit: service_limits[sId] || 0
          }))
        );
      }
      fetchPlans();
    } else {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col pb-12 transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-2xl mx-auto w-full flex items-center p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-600 dark:text-white font-bold">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center text-slate-900 dark:text-white">Planos de Assinatura</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="size-10 rounded-full flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined font-bold">add</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {plans.map(plan => (
          <div key={`${plan.id}-${JSON.stringify(plan.service_limits)}`} className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
              <span className="material-symbols-outlined text-amber-500">card_membership</span>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                    defaultValue={plan.price}
                    onBlur={(e) => handleUpdate(plan.id, Number(e.target.value), plan.qr_code_url || '', plan.pix_code || '', plan.service_limits || {})}
                  />
                </div>

                {/* Removed monthly_limit input as it is now per-service */}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviços Inclusos</label>
                  <div className="grid grid-cols-1 gap-2 border border-gray-100 dark:border-white/5 p-3 rounded-2xl bg-gray-50/50 dark:bg-black/10">
                    {(() => {
                      const sorted = [...services].sort((a, b) => {
                        const aChecked = plan.allowed_services?.includes(a.id);
                        const bChecked = plan.allowed_services?.includes(b.id);
                        if (aChecked && !bChecked) return -1;
                        if (!aChecked && bChecked) return 1;
                        return 0;
                      });
                      return sorted.map(s => {
                        const isChecked = plan.allowed_services?.includes(s.id);
                        const currentLimit = plan.service_limits?.[s.id] || 0;
                        return (
                          <div key={s.id} className="flex items-center justify-between gap-2 group">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                className="accent-amber-500"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newLimits = { ...(plan.service_limits || {}) };
                                  if (e.target.checked) {
                                    newLimits[s.id] = currentLimit || 1;
                                  } else {
                                    delete newLimits[s.id];
                                  }
                                  handleUpdate(plan.id, plan.price, plan.qr_code_url || '', plan.pix_code || '', newLimits);
                                }}
                              />
                              <span className="text-xs font-medium text-slate-600 dark:text-gray-400 group-hover:text-amber-500 transition-colors">{s.name}</span>
                            </label>
                            {isChecked && (
                              <div className="flex items-center gap-1 bg-white dark:bg-black/40 rounded-lg px-2 py-1 border border-gray-100 dark:border-white/5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Qtd:</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-16 bg-transparent text-xs font-black text-amber-600 focus:outline-none text-center"
                                  value={localLimits[plan.id]?.[s.id] ?? currentLimit}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setLocalLimits(prev => ({
                                      ...prev,
                                      [plan.id]: { ...(prev[plan.id] || {}), [s.id]: val }
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const newLimits = { ...(plan.service_limits || {}), [s.id]: val };
                                    handleUpdate(plan.id, plan.price, plan.qr_code_url || '', plan.pix_code || '', newLimits);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Pix (Copia e Cola)</label>
                  <textarea
                    className="w-full bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-mono"
                    rows={3}
                    defaultValue={plan.pix_code}
                    onBlur={(e) => handleUpdate(plan.id, plan.price, plan.qr_code_url || '', e.target.value, plan.service_limits || {})}
                    placeholder="Cole aqui o código Pix Copia e Cola..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">QR Code (PIX)</label>
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                    {plan.qr_code_url ? (
                      <img src={plan.qr_code_url} className="size-16 rounded-lg object-cover border border-gray-200 dark:border-white/10 bg-white" alt="QR Preview" />
                    ) : (
                      <div className="size-16 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center border border-gray-200 dark:border-white/10">
                        <span className="material-symbols-outlined text-gray-400">qr_code_2</span>
                      </div>
                    )}
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleUpdate(plan.id, plan.price, reader.result as string, plan.pix_code || '', plan.service_limits || {});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="w-full bg-white dark:bg-black/40 p-3 rounded-lg border border-dashed border-gray-300 dark:border-white/10 text-[10px] font-black text-gray-400 text-center hover:border-amber-500/50 transition-colors uppercase tracking-widest">
                        ADICIONAR QR CODE
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-enter">
            <header className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Plano</h3>
              <button onClick={() => setIsCreating(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Plano</label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                    placeholder="Ex: Plano Diamante"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    value={newPlan.price || ''}
                    onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Serviços Inclusos e Limites</label>
                <div className="grid grid-cols-1 gap-2 border border-gray-100 dark:border-white/5 p-4 rounded-2xl bg-gray-50/50 dark:bg-black/10">
                  {services.map(s => {
                    const isChecked = newPlan.service_limits[s.id] !== undefined;
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            className="size-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = { ...newPlan.service_limits };
                              if (e.target.checked) next[s.id] = 1;
                              else delete next[s.id];
                              setNewPlan({ ...newPlan, service_limits: next });
                            }}
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{s.name}</span>
                        </label>
                        {isChecked && (
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 rounded-xl px-3 py-2 border border-gray-200 dark:border-white/5">
                             <span className="text-[10px] font-black text-gray-400 uppercase">Limite:</span>
                             <input
                               type="number"
                               min="1"
                               className="w-12 bg-transparent text-sm font-black text-amber-600 focus:outline-none text-center"
                               value={newPlan.service_limits[s.id]}
                               onChange={(e) => {
                                 const val = Math.max(1, parseInt(e.target.value) || 1);
                                 setNewPlan({ ...newPlan, service_limits: { ...newPlan.service_limits, [s.id]: val } });
                               }}
                             />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Código Pix</label>
                  <textarea
                    value={newPlan.pix_code}
                    onChange={e => setNewPlan({ ...newPlan, pix_code: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-mono"
                    rows={2}
                    placeholder="Pix Copia e Cola..."
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">QR Code</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPlan({ ...newPlan, qr_code_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
              </div>
            </main>

            <footer className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-xs tracking-widest transition-colors hover:text-red-500">Cancelar</button>
              <button 
                onClick={handleCreatePlan} 
                className="flex-[2] py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
              >
                Criar Plano
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

const SelectProfessionalScreen: React.FC<{
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
  professionals: Professional[];
}> = ({ booking, setBooking, onNext, onBack, professionals }) => {
  const filteredProfessionals = professionals.filter(p => {
    // If no services selected, show all (shouldn't happen in flow)
    if (booking.selectedServices.length === 0) return true;
    
    // In a more complex scenario, we'd check if the professional performs ALL selected services
    // For now, we show all active professionals as requested for "Adriana Coiffeur"
    return p.isActive;
  });

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors">
              <span className="material-symbols-outlined font-bold">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Profissional</h2>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-md mx-auto w-full">
          <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Com quem você quer agendar?</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Escolha o seu profissional de preferência.</p>
          
          <div className="space-y-4">
            {filteredProfessionals.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setBooking(prev => ({ ...prev, selectedProfessional: p }));
                  onNext();
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark border transition-all hover:shadow-lg ${
                  booking.selectedProfessional?.id === p.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="size-16 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border-2 border-white/50 dark:border-white/10 shadow-sm">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-400" style={{ color: p.color }}>
                      {p.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.role}</p>
                </div>
                <span className="material-symbols-outlined text-gray-300">chevron_right</span>
              </button>
            ))}
            
            <button
              onClick={() => {
                setBooking(prev => ({ ...prev, selectedProfessional: undefined }));
                onNext();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 transition-all hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <div className="size-16 rounded-full flex items-center justify-center bg-gray-200 dark:bg-white/10 text-gray-500 shrink-0">
                <span className="material-symbols-outlined text-3xl">people</span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-slate-700 dark:text-gray-300">Tanto faz</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Qualquer profissional disponível</p>
              </div>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminProfessionalsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [profs, setProfs] = useState<Professional[]>([]);
  const [editing, setEditing] = useState<Partial<Professional> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfs = async () => {
    const { data } = await supabase.from('professionals').select('*').order('created_at', { ascending: true });
    if (data) {
      setProfs(data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        isActive: p.is_active
      })));
    }
  };

  useEffect(() => { fetchProfs(); }, []);

  const handleSave = async () => {
    if (!editing?.name) return alert('Nome é obrigatório');
    setLoading(true);
    
    const payload = {
      name: editing.name,
      role: editing.role,
      bio: editing.bio,
      image_url: editing.imageUrl,
      color: editing.color || '#7c3aed',
      is_active: editing.isActive !== false
    };

    let error;
    if (editing.id) {
      const { error: err } = await supabase.from('professionals').update(payload).eq('id', editing.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('professionals').insert(payload);
      error = err;
    }

    setLoading(false);
    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      setEditing(null);
      fetchProfs();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('professionals').update({ is_active: !current }).eq('id', id);
    fetchProfs();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${name}? Todos os agendamentos e horários vinculados a este profissional serão afetados.`)) return;
    
    setLoading(true);
    const { error } = await supabase.from('professionals').delete().eq('id', id);
    setLoading(false);
    
    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchProfs();
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 p-4 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 flex items-center justify-between backdrop-blur-md transition-colors">
        <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="font-bold text-slate-900 dark:text-white">Equipe</h2>
        <button onClick={() => setEditing({ isActive: true, color: '#7c3aed' })} className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"><span className="material-symbols-outlined">add</span></button>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {profs.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4 group transition-all hover:border-primary/30">
            <div className="size-14 rounded-full bg-gray-100 dark:bg-white/5 shrink-0 flex items-center justify-center border-2" style={{ borderColor: p.color }}>
              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" /> : <span className="material-symbols-outlined text-2xl text-gray-400">person</span>}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.role}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleActive(p.id, p.isActive)} className={`size-10 rounded-xl flex items-center justify-center transition-colors ${p.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                <span className="material-symbols-outlined text-xl">{p.isActive ? 'check_circle' : 'do_not_disturb_on'}</span>
              </button>
              <button onClick={() => setEditing(p)} className="size-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button onClick={() => handleDelete(p.id, p.name)} className="size-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </main>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-up border border-gray-100 dark:border-white/10">
            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">{editing.id ? 'Editar Profissional' : 'Novo Profissional'}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome</label>
                <input value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl border-transparent focus:ring-primary focus:bg-white transition-all text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Cargo/Especialidade</label>
                <input value={editing.role || ''} onChange={e => setEditing({...editing, role: e.target.value})} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl border-transparent focus:ring-primary focus:bg-white transition-all text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Cor no Calendário</label>
                <div className="flex gap-2">
                  {['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'].map(c => (
                    <button key={c} onClick={() => setEditing({...editing, color: c})} className={`size-8 rounded-full transition-transform ${editing.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary dark:ring-offset-surface-dark' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button onClick={() => setEditing(null)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminProductsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setProducts(data.map((p: any) => ({ ...p, imageUrl: p.image_url, isActive: p.is_active })));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('services').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('services').getPublicUrl(fileName);
      setEditingProduct({ ...editingProduct, imageUrl: publicUrl });
    } catch (err: any) {
      alert('Erro ao carregar imagem: ' + err.message);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!editingProduct.name || !editingProduct.price) return;
    setLoading(true);
    const payload = {
      name: editingProduct.name,
      description: editingProduct.description,
      price: editingProduct.price,
      image_url: editingProduct.imageUrl,
      stock_quantity: editingProduct.stock_quantity || 0,
      display_order: editingProduct.display_order || 0,
      is_active: true
    };
    const { error } = editingProduct.id 
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert(payload);
    
    setLoading(false);
    if (error) alert('Erro ao salvar produto');
    else { setIsEditing(false); setEditingProduct({}); fetchProducts(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este produto?')) return;
    await supabase.from('products').update({ is_active: false }).eq('id', id);
    fetchProducts();
  };

  if (isEditing) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors p-6">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center mb-8">
            <button onClick={() => setIsEditing(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><span className="material-symbols-outlined">arrow_back</span></button>
            <h2 className="text-xl font-bold ml-2 text-slate-900 dark:text-white">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h2>
          </div>
          <div className="space-y-4">
            <div className="relative group mx-auto size-32 rounded-2xl bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/10 overflow-hidden flex items-center justify-center">
              {editingProduct.imageUrl ? (
                <img src={editingProduct.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-gray-400">add_a_photo</span>
              )}
              {uploading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center"><div className="animate-spin size-6 border-4 border-primary border-t-transparent rounded-full" /></div>}
              <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <input placeholder="Nome do Produto" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm" />
            <textarea placeholder="Descrição" value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm h-24" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Preço" value={editingProduct.price || ''} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm" />
              <input type="number" placeholder="Estoque" value={editingProduct.stock_quantity || ''} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm" />
            </div>
            <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Produto'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><span className="material-symbols-outlined">arrow_back</span></button>
          <h2 className="font-bold text-slate-900 dark:text-white">Gerenciar Vitrine</h2>
          <button onClick={() => { setEditingProduct({}); setIsEditing(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">add</span></button>
        </div>
      </header>
      <main className="p-4 space-y-4 max-w-md mx-auto">
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-2">shopping_basket</span>
            <p>Nenhum produto cadastrado.</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex gap-4 shadow-sm hover:border-primary/20 transition-all">
            <div className="size-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
              <img src={p.imageUrl} className="w-full h-full object-cover" onError={e => e.currentTarget.src = 'https://via.placeholder.com/80'} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{p.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-primary font-bold text-lg">R$ {p.price.toFixed(2)}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(p); setIsEditing(true); }} className="size-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                  <button onClick={() => handleDelete(p.id)} className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

const ProductShowcaseScreen: React.FC<{ products: Product[]; onBack: () => void }> = ({ products, onBack }) => {
  const handleIWant = (product: Product) => {
    const text = `Olá Adriana! Vi o produto *${product.name}* na vitrine do seu app e tenho interesse!`;
    window.open(`https://wa.me/5582996096247?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4">
        <div className="max-w-md mx-auto w-full flex items-center">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><span className="material-symbols-outlined font-bold">arrow_back</span></button>
          <h2 className="font-bold text-slate-900 dark:text-white ml-2 text-lg">Produtos</h2>
        </div>
      </header>
      <main className="p-4 grid grid-cols-2 gap-4 max-w-md mx-auto pb-24">
        {products.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-2">inventory_2</span>
            <p className="font-medium">Nenhum produto disponível no momento.</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm flex flex-col hover:border-primary/20 transition-all group">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
              <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={e => e.currentTarget.src = 'https://via.placeholder.com/200'} />
              <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-primary shadow-sm">
                R$ {p.price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 mb-3 flex-1 font-medium">{p.description}</p>
              <button 
                onClick={() => handleIWant(p)}
                className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-lg shadow-green-500/10 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">shopping_bag</span> Eu quero
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

// --- Theme Logic ---

// --- Main App Logic ---

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('LANDING');
  const [currentUserRole, setCurrentUserRole] = useState<'CUSTOMER' | 'BARBER'>('CUSTOMER');

  // Notification refs
  const prevAppCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const lastChatDataStringRef = useRef<string | null>(null);
  const lastAppointmentsDataStringRef = useRef<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [booking, setBooking] = useState<BookingState>({
    customerName: '',
    customerPhone: '',
    selectedServices: [],
    selectedCategory: undefined,
    selectedDate: '',
    selectedTime: '',
    selectedProfessional: undefined,
  });

  // Check for persistent login
  useEffect(() => {
    // Check local storage flag OR Supabase session
    const isAuth = localStorage.getItem('admin_auth');

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session || isAuth === 'true') {
        setCurrentUserRole('BARBER');
        // Restore last view or default to dashboard
        const lastView = localStorage.getItem('last_admin_view') as AppView;
        if (lastView && lastView.startsWith('ADMIN_')) {
          setView(lastView);
        } else {
          setView('ADMIN_DASHBOARD');
        }
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setCurrentUserRole('BARBER');
        setView(prev => {
          if (prev.startsWith('ADMIN_')) return prev;
          const lastView = localStorage.getItem('last_admin_view') as AppView;
          if (lastView && lastView.startsWith('ADMIN_')) return lastView;
          return 'ADMIN_DASHBOARD';
        });
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('admin_auth');
        setView('LANDING');
      }
    });

    // CUSTOMER IDENTITY INITIALIZATION
    const savedPhone = localStorage.getItem('customer_phone');
    const savedName = localStorage.getItem('customer_name');
    if (savedPhone) {
      setBooking(prev => ({ 
        ...prev, 
        customerPhone: savedPhone,
        customerName: savedName || prev.customerName 
      }));
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Request Notification Permission for Admin
  useEffect(() => {
    if (currentUserRole === 'BARBER' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [currentUserRole]);

  /* Refactored fetchServicesList to be reused */
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('service_categories').select('*').order('display_order', { ascending: true });
    if (error) console.error('Error fetching categories:', error);
    if (data) setCategories(data);
  };

  const fetchServicesList = async () => {
    const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (error) console.error('Error fetching services:', error);
    if (data) {
      setServices(data.map((s: any) => ({
        ...s,
        id: String(s.id),
        imageUrl: s.image_url
      })));
    }
  };


  const fetchProfessionals = async () => {
    const { data, error } = await supabase.from('professionals').select('*').eq('is_active', true).order('created_at', { ascending: true });
    if (error) console.error('Error fetching professionals:', error);
    if (data) {
      setProfessionals(data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        isActive: p.is_active
      })));
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (error) console.error('Error fetching products:', error);
    if (data) {
      setProducts(data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        isActive: p.is_active
      })));
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchServicesList();
    fetchProfessionals();
    fetchAppointments();
    fetchProducts();
  }, [booking.customerPhone]);


  const [selectedChatClient, setSelectedChatClient] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    // Fetch chat messages
    const fetchChat = async () => {
      // Guard: Only fetch if we have enough info to filter
      if (currentUserRole === 'BARBER' && !selectedChatClient) {
        setChatMessages([]);
        return;
      }
      
      if (currentUserRole === 'CUSTOMER' && !booking.customerPhone) {
        setChatMessages([]);
        return;
      }

      let query = supabase.from('chat_messages').select('*').order('sent_at', { ascending: true });

      if (currentUserRole === 'BARBER' && selectedChatClient) {
        query = query.eq('client_id', selectedChatClient.id);

        // Mark as read if Admin
        await supabase.from('chat_messages')
          .update({ is_read: true })
          .eq('client_id', selectedChatClient.id)
          .eq('sender_type', 'CUSTOMER')
          .eq('is_read', false);

      } else if (currentUserRole === 'CUSTOMER' && booking.customerPhone) {
        const normalizedPhone = booking.customerPhone.replace(/\D/g, '');
        // We need client ID from phone
        const { data: client } = await supabase.from('clients')
          .select('id')
          .eq('phone', normalizedPhone)
          .single();
          
        if (client) {
          query = query.eq('client_id', client.id);
        } else {
          setChatMessages([]);
          return; // user not found yet
        }
      }

      const { data, error } = await query;
      if (data) {
        const dataString = JSON.stringify(data);
        if (dataString === lastChatDataStringRef.current) return;
        lastChatDataStringRef.current = dataString;

        const mapped = data.map((m: any) => ({
          id: String(m.id),
          text: m.message_text,
          sender: m.sender_type,
          timestamp: new Date(m.sent_at)
        }));
        setChatMessages(mapped);
      } else if (error) {
        console.error('Error fetching chat:', error.message);
      }
    };
    
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [selectedChatClient, currentUserRole, booking.customerPhone]);

  // Dynamically set today's date for mock data
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [showSuccess, setShowSuccess] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showPastHistory, setShowPastHistory] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCountRef = useRef(0);
  const [notificationState, setNotificationState] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  // Watch for unread count increase
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
      setNotificationState({ visible: true, message: 'Você tem uma nova mensagem de cliente!' });
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => { });
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // --- Auto-completion Logic (Integrated with Fetch) ---
  const fetchAppointments = useCallback(async () => {
    if (currentUserRole === 'CUSTOMER' && !booking.customerPhone) {
      setAppointments([]);
      return;
    }

    const normalizedPhone = booking.customerPhone.replace(/\D/g, '');
    const today = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(addDays(new Date(), -30), 'yyyy-MM-dd');

    let query = supabase
      .from('appointments')
      .select(`
                  *,
                  services:appointment_services(
                    service:services(*)
                  ),
                  clients${currentUserRole === 'CUSTOMER' ? '!inner' : ''}(
                    id,
                    name, 
                    phone,
                    user_subscriptions(
                      *,
                      subscription_plans(*)
                    )
                  )
                  `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (currentUserRole === 'CUSTOMER') {
      query = query.eq('clients.phone', normalizedPhone);
      if (!showPastHistory) {
        const ninetyDaysAgo = format(addDays(new Date(), -90), 'yyyy-MM-dd');
        query = query.gte('appointment_date', ninetyDaysAgo);
      }
    } else {
      if (!showPastHistory) query = query.gte('appointment_date', today);
      else query = query.gte('appointment_date', thirtyDaysAgo);
    }

    if (currentUserRole === 'BARBER') {
      supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('sender_type', 'CUSTOMER')
        .then(({ count }) => setUnreadCount(count || 0));
    }

    const { data, error } = await query;

    if (error) {
      console.error('CRITICAL ERROR fetching appointments:', error);
      return;
    }

    if (data && data.length >= 0) {
      // 1. Mapping logic (always map fresh data to compare)
      const clientIds = [...new Set(data.map((a: any) => a.client_id).filter(Boolean))];
      const planIds = [...new Set(data.map((a: any) => a.clients?.user_subscriptions?.find((s: any) => s.status === 'APPROVED')?.subscription_plans?.id).filter(Boolean))];
      const startOfMonth = format(new Date(), 'yyyy-MM-01');
      const [psDataFetch, scDataFetch, monthAppsFetch] = await Promise.all([
        planIds.length > 0 ? supabase.from('plan_services').select('plan_id, service_id, monthly_limit').in('plan_id', planIds) : Promise.resolve({ data: [] }),
        supabase.from('service_components').select('*'),
        supabase.from('appointments').select('client_id, status, services:appointment_services(service_id)').gte('appointment_date', startOfMonth).in('status', ['COMPLETED', 'PENDING']).in('client_id', clientIds)
      ]);

      const psData = psDataFetch.data;
      const scData = scDataFetch.data;
      const monthApps = monthAppsFetch.data;

      const planServiceLimits: Record<string, Record<string, number>> = {};
      psData?.forEach((ps: any) => {
        const pid = String(ps.plan_id);
        if (!planServiceLimits[pid]) planServiceLimits[pid] = {};
        planServiceLimits[pid][String(ps.service_id)] = ps.monthly_limit;
      });

      const componentsMap: Record<string, string[]> = {};
      scData?.forEach((item: any) => {
        const pid = String(item.parent_service_id);
        if (!componentsMap[pid]) componentsMap[pid] = [];
        componentsMap[pid].push(String(item.component_service_id));
      });

      const clientUsage: Record<string, Record<string, number>> = {};
      monthApps?.forEach((app: any) => {
        const cid = String(app.client_id);
        if (!clientUsage[cid]) clientUsage[cid] = {};
        app.services?.forEach((sv: any) => {
          const sId = String(sv.service_id);
          clientUsage[cid][sId] = (clientUsage[cid][sId] || 0) + 1;
          if (componentsMap[sId]) {
            componentsMap[sId].forEach(compId => {
              clientUsage[cid][compId] = (clientUsage[cid][compId] || 0) + 1;
            });
          }
        });
      });

      let mappedApps = data.map((a: any) => {
        const client = a.clients;
        const activeSub = client?.user_subscriptions?.find((s: any) => s.status === 'APPROVED');
        let clientSubscription;
        if (activeSub) {
          const plan = activeSub.subscription_plans;
          const planId = String(plan.id);
          const serviceLimits = planServiceLimits[planId] || {};
          const serviceUsage = clientUsage[String(client.id)] || {};
          clientSubscription = {
            planName: plan.name,
            cutsUsed: Object.values(serviceUsage).reduce((a, b: any) => a + b, 0),
            cutsLimit: plan.monthly_limit || 0,
            serviceLimits,
            serviceUsage,
            allowedServices: Object.keys(serviceLimits),
            isActive: true
          };
        }
        return {
          id: String(a.id),
          date: a.appointment_date,
          time: a.appointment_time ? a.appointment_time.slice(0, 5) : '',
          status: a.status,
          totalPrice: a.total_price,
          customerName: client?.name || 'Cliente',
          customerPhone: client?.phone || '',
          services: a.services.map((s: any) => ({ ...s.service, imageUrl: s.service.image_url })),
          professionalId: a.professional_id,
          clientSubscription
        };
      });

      // 3. Update state if the resulting data is different
      const finalDataString = JSON.stringify(mappedApps);
      if (finalDataString !== lastAppointmentsDataStringRef.current) {
        if (currentUserRole === 'CUSTOMER' && booking.customerPhone) {
          mappedApps = mappedApps.filter((app: Appointment) => app.customerPhone === booking.customerPhone);
        }

        // Check new appointments
        if (currentUserRole === 'BARBER' && !isFirstLoadRef.current) {
          if (mappedApps.length > prevAppCountRef.current) {
            if (Notification.permission === 'granted') new Notification("Novo Agendamento!");
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => { });
          }
        }

        setAppointments(mappedApps);
        lastAppointmentsDataStringRef.current = finalDataString;
        prevAppCountRef.current = mappedApps.length;
        isFirstLoadRef.current = false;
      }
    }
  }, [currentUserRole, booking.customerPhone, showPastHistory]);

  useEffect(() => {
    fetchAppointments();
    const channel = supabase.channel('realtime-appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAppointments()).subscribe();
    const interval = setInterval(fetchAppointments, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [fetchAppointments]);

  // --- FOOLPROOF AUTO-CLOSE LOGIC ---
  useEffect(() => {
    if (currentUserRole !== 'BARBER') return;

    const checkExpirations = async () => {
      if (appointments.length === 0) return;
      
      const idsToClose: string[] = [];
      const now = new Date(); // Local time

      const updatedApps = appointments.map(app => {
        if (app.status === 'PENDING' || app.status === 'CONFIRMED') {
          try {
            if (!app.date || !app.time) return app;
            
            const [y, m, d] = app.date.split('-').map(Number);
            const [h, min] = app.time.split(':').map(Number);
            
            // Months are 0-indexed in Date constructor. This ensures perfect local time handling.
            const startTime = new Date(y, m - 1, d, h, min, 0, 0);
            const duration = app.services.reduce((acc, s) => acc + (Number(s.duration) || 30), 0);
            
            // endTime is startTime + duration minutes
            const endTime = new Date(startTime.getTime() + duration * 60000);
            
            if (now > endTime) {
              console.log(`[Auto-Close] EXPIRED: ${app.id} (Scheduled: ${app.date} ${app.time}, EndTime: ${endTime.toLocaleTimeString()})`);
              idsToClose.push(app.id);
              return { ...app, status: 'COMPLETED' };
            }
          } catch (err) {
            console.error('[Auto-Close] Error checking app:', app.id, err);
          }
        }
        return app;
      });

      if (idsToClose.length > 0) {
        console.log(`[Auto-Close] Triggering DB update for ${idsToClose.length} apps:`, idsToClose);
        const { error } = await supabase.from('appointments').update({ status: 'COMPLETED' }).in('id', idsToClose);
        if (error) {
           console.error('[Auto-Close] DB Update Error:', error);
        } else {
           console.log('[Auto-Close] DB Update Success!');
           // Force update appointments in state to trigger re-renders and stop further checks for these IDs
           setAppointments(updatedApps);
        }
      }
    };

    // Run once after a brief delay, then periodically
    const timeout = setTimeout(checkExpirations, 2000); 
    const interval = setInterval(checkExpirations, 10000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [appointments, currentUserRole]);

  const handleRegisterIdentity = (identity: { name: string, phone: string }) => {
    setBooking(prev => ({ ...prev, customerName: identity.name, customerPhone: identity.phone }));
  };

  const handleLogout = useCallback(() => {
    setCurrentUserRole('CUSTOMER');
    setBooking(prev => ({ ...prev, customerName: '', customerPhone: '', clientSubscription: undefined }));
    localStorage.removeItem('admin_auth');
    supabase.auth.signOut();
    setView('LANDING');
  }, []);

  const handleSendMessage = async (text: string, identity?: { name: string, phone: string }) => {
    if (identity) {
      setBooking(prev => ({ ...prev, customerName: identity.name, customerPhone: identity.phone }));
    }

    const phoneToSend = identity?.phone || booking.customerPhone;
    const nameToSend = identity?.name || booking.customerName;

    let cId = selectedChatClient?.id;

    const normalizedPhone = phoneToSend.replace(/\D/g, '');

    // Resolve Client ID
    if (!cId) {
      // Look up by phone
      const { data: client } = await supabase.from('clients').select('id').eq('phone', normalizedPhone).single();
      if (client) {
        cId = client.id;
      } else {
        // Create
        const { data: newClient } = await supabase.from('clients').insert({ name: nameToSend, phone: normalizedPhone }).select().single();
        if (newClient) cId = newClient.id;
      }
    }

    if (!cId) return;

    await supabase.from('chat_messages').insert({
      client_id: cId,
      sender_type: currentUserRole,
      message_text: text,
      sent_at: new Date().toISOString()
    });

    // Re-fetch handled by polling or subscription (polling in this case)
  };

  const handleFinishBooking = async () => {
    // 1. Find or Create Client
    let clientId: number | undefined;
    const phoneDigits = booking.customerPhone.replace(/\D/g, '');
    const { data: clientData } = await supabase.from('clients').select('id').eq('phone', phoneDigits).single();
    if (clientData) {
      clientId = clientData.id;
      if (booking.birthDate) {
        await supabase.from('clients').update({ birth_date: booking.birthDate }).eq('id', clientId);
      }
    } else {
      // Fallback for existing clients with formatting
      const { data: allClients } = await supabase.from('clients').select('id, phone, birth_date');
      const existing = allClients?.find(c => c.phone.replace(/\D/g, '') === phoneDigits);

      if (existing) {
        clientId = existing.id;
        if (booking.birthDate && !existing.birth_date) {
            await supabase.from('clients').update({ birth_date: booking.birthDate }).eq('id', clientId);
        }
      } else {
        const { data: newClient, error: clientError } = await supabase.from('clients').insert({ name: booking.customerName, phone: phoneDigits, birth_date: booking.birthDate }).select().single();
        if (clientError || !newClient) { alert('Erro ao salvar cliente'); return; }
        clientId = newClient.id;
      }
    }

    // 1.5 Check Availability
    const { data: dayApps } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', booking.selectedDate)
      .neq('status', 'CANCELLED');

    const { data: dayBlocks } = await supabase
      .from('blocked_slots')
      .select('time')
      .eq('date', booking.selectedDate);

    const isTaken = dayApps?.some(a => a.appointment_time?.startsWith(booking.selectedTime));
    const isBlocked = dayBlocks?.some(b => b.time?.startsWith(booking.selectedTime));

    if (isTaken || isBlocked) {
      alert('Este horário acabou de ser reservado ou bloqueado. Por favor, escolha outro.');
      return;
    }

    // Calculate final price based on per-service limits
    const isSubscriber = booking.clientSubscription?.isActive;
    const serviceLimits = booking.clientSubscription?.serviceLimits || {};
    const serviceUsage = booking.clientSubscription?.serviceUsage || {};
    const runningUsage = { ...serviceUsage };

    const finalPrice = booking.selectedServices.reduce((sum, s) => {
      if (isSubscriber) {
        const limit = serviceLimits[s.id];
        if (limit !== undefined && limit > 0) {
          const used = runningUsage[s.id] || 0;
          if (used < limit) {
            runningUsage[s.id] = used + 1;
            return sum; // free
          }
        }
      }
      return sum + s.price;
    }, 0);

    const { data: appData, error: appError } = await supabase.from('appointments').insert({
      client_id: clientId,
      professional_id: booking.selectedProfessional?.id,
      appointment_date: booking.selectedDate,
      appointment_time: booking.selectedTime,
      total_price: finalPrice,
      status: 'PENDING'
    }).select().single();

    if (appError || !appData) { alert('Erro ao agendar: ' + (appError?.message || '')); return; }

    // 3. Insert Services
    const serviceInserts = booking.selectedServices.map(s => ({
      appointment_id: appData.id,
      service_id: s.id,
      price_at_booking: s.price
    }));
    await supabase.from('appointment_services').insert(serviceInserts);

    // Success
    localStorage.setItem('customer_phone', phoneDigits);
    localStorage.setItem('customer_name', booking.customerName);
    setShowSuccess(true);
    setBooking(prev => ({
      ...prev,
      selectedServices: [],
      selectedDate: '',
      selectedTime: '',
    }));
    fetchAppointments();
    setTimeout(() => {
      setShowSuccess(false);
      setView('MY_APPOINTMENTS');
    }, 3000);
  };

  const renderView = () => {
    switch (view) {
      case 'LANDING':
        return <LandingScreen onStart={() => setView('HOME')} onAdmin={() => setView('LOGIN')} />;
      case 'HOME':
        return <HomeScreen
          onAgendar={() => {
            fetchCategories();
            setView('SELECT_CATEGORY');
          }}
          onChat={() => { setCurrentUserRole('CUSTOMER'); setView('CHAT'); }}
          onPerfil={() => {
            setView('CUSTOMER_LOGIN');
          }}
          onMais={handleLogout}
          onAssinatura={() => setView('SELECT_PLAN')}
          onProducts={() => setView('PRODUCTS')}
        />;
      case 'SELECT_CATEGORY':
        return <SelectCategoryScreen
          categories={categories}
          booking={booking}
          setBooking={setBooking}
          onNext={() => {
            fetchServicesList();
            setView('SELECT_SERVICES');
          }}
          onBack={() => setView('HOME')}
        />;
      case 'SELECT_SERVICES':
        return <SelectServicesScreen
          booking={booking}
          setBooking={setBooking}
          onNext={() => setView('SELECT_PROFESSIONAL')}
          onBack={() => setView('SELECT_CATEGORY')}
          services={services}
        />;
      case 'SELECT_PROFESSIONAL':
        return <SelectProfessionalScreen
          booking={booking}
          setBooking={setBooking}
          onNext={() => setView('SELECT_DATE_TIME')}
          onBack={() => setView('SELECT_SERVICES')}
          professionals={professionals}
        />;
      case 'SELECT_DATE_TIME':
        return <SelectDateTimeScreen
          booking={booking}
          setBooking={setBooking}
          onNext={() => setView('REVIEW')}
          onBack={() => setView('SELECT_PROFESSIONAL')}
        />;
      case 'REVIEW':
        return <ReviewScreen
          booking={booking}
          onConfirm={handleFinishBooking}
          onBack={() => setView('SELECT_DATE_TIME')}
        />;
      case 'MY_APPOINTMENTS':
        return <MyAppointmentsScreen
          appointments={appointments}
          showPastHistory={showPastHistory}
          setShowPastHistory={setShowPastHistory}
          onBack={() => setView('HOME')}
          onNew={() => setView('SELECT_SERVICES')}
          onRefresh={fetchAppointments}
        />;
      case 'LOGIN':
        return <LoginScreen onLogin={() => { setCurrentUserRole('BARBER'); setView('ADMIN_DASHBOARD'); }} onBack={() => setView('LANDING')} />;
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard
          appointments={appointments}
          showPastHistory={showPastHistory}
          setShowPastHistory={setShowPastHistory}
          onLogout={handleLogout}
          onOpenChat={() => setView('ADMIN_CHAT')}
          onManageServices={() => setView('ADMIN_SERVICES')}
          onBlockSchedule={() => setView('ADMIN_BLOCK_SCHEDULE')}
          onSettings={() => setView('ADMIN_SETTINGS')}
          onWeeklySchedule={() => setView('ADMIN_WEEKLY_SCHEDULE')}
          onFinance={() => setView('ADMIN_FINANCE')}
          onTV={() => setView('ADMIN_TV')}
          unreadCount={unreadCount}
          onSubscriptions={() => setView('ADMIN_SUBSCRIPTIONS')}
          onManagePlans={() => setView('ADMIN_MANAGE_PLANS')}
          onManageProducts={() => setView('ADMIN_PRODUCTS')}
          onRefresh={fetchAppointments}
          onClients={() => setView('ADMIN_CLIENTS')}
          onProfessionals={() => setView('ADMIN_PROFESSIONALS')}
          setAppointments={setAppointments}
          professionals={professionals}
        />;
      case 'ADMIN_PROFESSIONALS':
        return <AdminProfessionalsScreen onBack={() => { fetchProfessionals(); setView('ADMIN_DASHBOARD'); }} />;
      case 'ADMIN_SERVICES':
        return <AdminServicesScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_BLOCK_SCHEDULE':
        return <AdminBlockScheduleScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_SETTINGS':
        return <AdminSettingsScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_WEEKLY_SCHEDULE':
        return <AdminWeeklyScheduleScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_FINANCE':
        return <AdminFinanceScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_TV':
        return <AdminTVScreen appointments={appointments} onRefresh={fetchAppointments} onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_PRODUCTS':
        return <AdminProductsScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'PRODUCTS':
        return <ProductShowcaseScreen products={products} onBack={() => setView('HOME')} />;
      case 'ADMIN_CHAT_LIST':
        return <AdminChatListScreen
          onBack={() => setView('ADMIN_DASHBOARD')}
          onSelectChat={(cId, cName) => {
            setSelectedChatClient({ id: cId, name: cName });
            setView('CHAT');
          }}
        />;
      case 'CHAT':
        return <ChatScreen
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onRegister={handleRegisterIdentity}
          currentUserRole={currentUserRole}
          customerIdentity={{ name: booking.customerName, phone: booking.customerPhone }}
          chatClientId={selectedChatClient?.id}
          onBack={() => {
            if (currentUserRole === 'BARBER') setView('ADMIN_CHAT_LIST');
            else setView('HOME');
          }}
        />;
      case 'CUSTOMER_LOGIN':
        return <CustomerLoginScreen
          onLogin={(phone) => {
            localStorage.setItem('customer_phone', phone);
            setBooking(prev => ({ ...prev, customerPhone: phone }));
            setView('MY_APPOINTMENTS');
            // fetchAppointments will be triggered by useEffect dependency on customerPhone
          }}
          onBack={() => setView('HOME')}
        />;
      case 'ADMIN_CLIENTS':
        return <AdminClientsScreen
          onBack={() => setView('ADMIN_DASHBOARD')}
          onChat={(cId, cName) => {
            setSelectedChatClient({ id: cId, name: cName });
            setCurrentUserRole('BARBER');
            setView('CHAT');
          }}
        />;
      case 'ADMIN_SUBSCRIPTIONS':
        return <AdminSubscriptionsScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'ADMIN_MANAGE_PLANS':
        return <AdminManagePlansScreen onBack={() => setView('ADMIN_DASHBOARD')} />;
      case 'SELECT_PLAN':
        return <SelectPlanScreen
          onBack={() => setView('HOME')}
          onSelect={(p) => {
            setBooking(prev => ({ ...prev, selectedPlan: p }));
            setView('SUBSCRIPTION_PAYMENT');
          }}
        />;
      case 'SUBSCRIPTION_PAYMENT':
        return <SubscriptionPaymentScreen
          plan={booking.selectedPlan!}
          onBack={() => setView('SELECT_PLAN')}
          onSubmit={async (proof, phone, name) => {
            // Register/Find Client
            let cId;
            const normalizedPhone = phone.replace(/\D/g, '');
            const { data: client } = await supabase.from('clients').select('id').eq('phone', normalizedPhone).single();
            if (client) {
              cId = client.id;
              await supabase.from('clients').update({ name }).eq('id', cId);
            } else {
              const { data: newClient } = await supabase.from('clients').insert({ name, phone: normalizedPhone }).select().single();
              if (newClient) cId = newClient.id;
            }

            if (!cId) {
              alert('Erro ao processar dados do cliente.');
              return;
            }

            const { error } = await supabase.from('user_subscriptions').insert({
              client_id: cId,
              plan_id: booking.selectedPlan!.id,
              payment_proof_url: proof,
              status: 'PENDING'
            });

            if (error) {
              alert('Erro ao enviar assinatura: ' + error.message);
            } else {
              alert('Assinatura enviada com sucesso! Aguarde a aprovação do barbeiro.');
              setView('HOME');
            }
          }}
        />;
      default:
        return <LandingScreen onStart={() => setView('HOME')} onAdmin={() => setView('LOGIN')} />;
    }
  };

  // Persist View State
  useEffect(() => {
    if (view.startsWith('ADMIN_')) {
      localStorage.setItem('last_admin_view', view);
    }
  }, [view]);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-white font-display transition-colors duration-300">
      {showSuccess && <SuccessOverlay />}
      <IOSNotification
        visible={notificationState.visible}
        message={notificationState.message}
        onClose={() => setNotificationState(prev => ({ ...prev, visible: false }))}
      />
      {renderView()}
      <ReloadPrompt />
    </div>
  );
};

export default App;
