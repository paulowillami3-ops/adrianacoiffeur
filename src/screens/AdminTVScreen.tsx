import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { supabase } from '../supabase';
import { Appointment } from '../../types';

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
  const activeApps = useMemo(() => appointments
    .filter(a => a.date === todayStr && (a.status === 'CONFIRMED' || a.status === 'PENDING'))
    .sort((a, b) => a.time.localeCompare(b.time)), [appointments, todayStr]);

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
  const nextSlots = useMemo(() => {
    if (!workHours.length) return [];

    const dow = currentTime.getDay(); // 0=Sun
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
            <img src="/logo.png" className="h-full w-full object-contain" alt="Logo" />
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
            <p className="text-slate-500 font-bold text-[10px]">Aponte a cámera</p>
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

export default AdminTVScreen;
