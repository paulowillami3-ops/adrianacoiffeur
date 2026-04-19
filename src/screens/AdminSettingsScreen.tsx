import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface AdminSettingsScreenProps {
  onBack: () => void;
}

const AdminSettingsScreen: React.FC<AdminSettingsScreenProps> = ({ onBack }) => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [interval, setIntervalValue] = useState('30');
  const [minAdvance, setMinAdvance] = useState('0');

  // Bloqueio de Horas
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data: wh } = await supabase.from('work_hours').select('*').order('day_of_week');
    if (wh) setSchedule(wh);

    const { data: settingsData } = await supabase.from('settings').select('*');
    if (settingsData) {
      const s: any = {};
      settingsData.forEach((r: any) => s[r.key] = r.value);
      setIntervalValue(s.interval_minutes || '30');
      setMinAdvance(s.min_advance_minutes || '0');
    }
    setLoading(false);
  };

  const fetchBlocks = async () => {
    const { data } = await supabase.from('blocked_slots').select('*').order('date', { ascending: true }).order('time', { ascending: true });
    if (data) setBlockedSlots(data);
  };

  useEffect(() => { fetchSchedule(); fetchBlocks(); }, []);

  const handleToggleDay = async (day: any) => {
    const newVal = !day.is_open;
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
      setSchedule(prev => prev.map(d => d.id === editingDay.id ? editingDay : d));
      setEditingDay(null);
    }
  };

  const handleSaveInterval = async (val: string) => {
    setIntervalValue(val);
    await supabase.from('settings').upsert({ key: 'interval_minutes', value: val });
  };

  const handleSaveMinAdvance = async (val: string) => {
    setMinAdvance(val);
    await supabase.from('settings').upsert({ key: 'min_advance_minutes', value: val });
  };

  const handleBlock = async () => {
    if (!blockDate || !blockTime) return alert('Selecione data e hora');
    setLoadingBlocks(true);
    const { error } = await supabase.from('blocked_slots').insert({
      date: blockDate,
      time: blockTime,
      reason: blockReason || 'Bloqueado pelo Admin'
    });

    if (error) {
      alert('Erro ao bloquear: ' + error.message);
    } else {
      setBlockDate(''); setBlockTime(''); setBlockReason('');
      fetchBlocks();
      alert('Horário bloqueado!');
    }
    setLoadingBlocks(false);
  };

  const handleDeleteBlock = (id: string) => {
    if (!window.confirm('Liberar este horário?')) return;
    supabase.from('blocked_slots').delete().eq('id', id)
      .then(() => fetchBlocks());
  };

  const handleQuickBlock = async (type: 'LUNCH' | 'AFTERNOON' | 'MORNING') => {
    if (!blockDate) return alert('Selecione uma data primeiro');
    setLoadingBlocks(true);
    
    const blocks = [];
    if (type === 'LUNCH') {
      blocks.push({ date: blockDate, time: '12:00', reason: 'Intervalo de Almoço' });
      blocks.push({ date: blockDate, time: '12:30', reason: 'Intervalo de Almoço' });
    } else if (type === 'AFTERNOON') {
      for (let h = 14; h < 18; h++) {
        blocks.push({ date: blockDate, time: `${String(h).padStart(2, '0')}:00`, reason: 'Indisponível (Tarde)' });
        blocks.push({ date: blockDate, time: `${String(h).padStart(2, '0')}:30`, reason: 'Indisponível (Tarde)' });
      }
    } else if (type === 'MORNING') {
      for (let h = 8; h < 12; h++) {
        blocks.push({ date: blockDate, time: `${String(h).padStart(2, '0')}:00`, reason: 'Indisponível (Manhã)' });
        blocks.push({ date: blockDate, time: `${String(h).padStart(2, '0')}:30`, reason: 'Indisponível (Manhã)' });
      }
    }

    const { error } = await supabase.from('blocked_slots').insert(blocks);
    if (error) alert('Erro ao aplicar bloqueio rápido: ' + error.message);
    else {
      fetchBlocks();
      alert('Bloqueios aplicados com sucesso!');
    }
    setLoadingBlocks(false);
  };

  const dayNames = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Horário de Atendimento</h2>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto w-full pb-24">
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

        <h3 className="text-[11px] text-gray-500 font-bold uppercase pt-2 px-1">Escala Semanal</h3>

        {loading ? (
          <div className="text-center p-10 text-gray-400">Carregando...</div>
        ) : schedule.map(day => (
          <div key={day.id} className={`bg-white dark:bg-surface-dark rounded-3xl p-5 border ${day.is_open ? 'border-primary/20 shadow-sm' : 'border-gray-200 opacity-75'}`}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-800 dark:text-white capitalize">{dayNames[day.day_of_week]}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-gray-400">{day.is_open ? '' : 'Fechado'}</span>
                <button
                  onClick={() => handleToggleDay(day)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors ${day.is_open ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'}`}
                >
                  <div className={`h-5 w-5 bg-white rounded-full shadow-sm transition-transform ${day.is_open ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
              {day.is_open ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm font-bold text-slate-700 dark:text-gray-300">
                  <span>Manhã: {day.start_time_1?.slice(0, 5)} - {day.end_time_1?.slice(0, 5)}</span>
                  {day.is_afternoon_open && day.start_time_2 && day.end_time_2 && (
                    <span className="col-span-2">Tarde: {day.start_time_2?.slice(0, 5)} - {day.end_time_2?.slice(0, 5)}</span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-bold text-gray-400">Fora de Serviço</span>
              )}

              <button onClick={() => setEditingDay(day)} className="size-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-primary transition-all active:scale-95 shadow-sm">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
          </div>
        ))}

        <hr className="border-gray-200 dark:border-white/10 h-px w-full" />

        <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-gray-200 dark:border-white/10 space-y-4 transition-all shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 filled">block</span>
            Bloqueio de Horas
          </h3>
          <p className="text-xs text-gray-500">Bloqueie datas e horários específicos para pausas ou imprevistos.</p>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Data</label>
                <input type="date" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={blockDate} onChange={e => setBlockDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Horário</label>
                <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={blockTime} onChange={e => setBlockTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Motivo</label>
              <input type="text" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" placeholder="Ex: Médico, Reunião..." value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <button onClick={handleBlock} disabled={loadingBlocks} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              {loadingBlocks ? 'Bloqueando...' : (
                <>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Adicionar Bloqueio
                </>
              )}
            </button>

            <div className="pt-2">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-2 block">Bloqueios Rápidos ({blockDate || 'Selecione data'})</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleQuickBlock('LUNCH')}
                  disabled={!blockDate || loadingBlocks}
                  className="flex-1 py-3 px-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-tight hover:bg-amber-500/20 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm block mb-1">restaurant</span>
                  Almoço
                </button>
                <button 
                  onClick={() => handleQuickBlock('MORNING')}
                  disabled={!blockDate || loadingBlocks}
                  className="flex-1 py-3 px-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-tight hover:bg-blue-500/20 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm block mb-1">wb_sunny</span>
                  Manhã
                </button>
                <button 
                  onClick={() => handleQuickBlock('AFTERNOON')}
                  disabled={!blockDate || loadingBlocks}
                  className="flex-1 py-3 px-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-tight hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm block mb-1">nights_stay</span>
                  Tarde
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <h4 className="text-[10px] font-black uppercase text-gray-400 px-1">Bloqueios Ativos</h4>
            {blockedSlots.length === 0 ? (
              <p className="text-center py-4 text-xs text-gray-400 italic">Nenhum horário bloqueado.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                {blockedSlots.map(b => (
                  <div key={b.id} className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex justify-between items-center transition-colors">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {b.time}</p>
                      <p className="text-[10px] text-gray-500">{b.reason}</p>
                    </div>
                    <button onClick={() => handleDeleteBlock(b.id)} className="text-gray-400 hover:text-red-500 transition-colors active:scale-90">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {editingDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white/10 p-6 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{dayNames[editingDay.day_of_week]}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Início Manhã</label>
                  <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={editingDay.start_time_1 || ''} onChange={e => setEditingDay({...editingDay, start_time_1: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Fim Manhã</label>
                  <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={editingDay.end_time_1 || ''} onChange={e => setEditingDay({...editingDay, end_time_1: e.target.value})} />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="afternoon_open" checked={editingDay.is_afternoon_open} onChange={e => setEditingDay({...editingDay, is_afternoon_open: e.target.checked})} />
                <label htmlFor="afternoon_open" className="text-sm font-bold text-slate-700 dark:text-gray-300">Atender à Tarde?</label>
              </div>

              {editingDay.is_afternoon_open && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Início Tarde</label>
                    <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={editingDay.start_time_2 || ''} onChange={e => setEditingDay({...editingDay, start_time_2: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1 mb-1 block">Fim Tarde</label>
                    <input type="time" className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" value={editingDay.end_time_2 || ''} onChange={e => setEditingDay({...editingDay, end_time_2: e.target.value})} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingDay(null)} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSaveDay} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsScreen;
