import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabase';
import { formatDateToBRL } from '../utils';

interface AdminFinanceScreenProps {
  onBack: () => void;
}

const AdminFinanceScreen: React.FC<AdminFinanceScreenProps> = ({ onBack }) => {
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-01'),
    end: format(startOfDay(new Date()), 'yyyy-MM-dd')
  });

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
                            {c.name ? c.name.charAt(0) : '?'}
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

export default AdminFinanceScreen;
