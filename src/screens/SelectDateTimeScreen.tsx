import React, { useState, useMemo, useEffect } from 'react';
import { BookingState } from '../../types';
import { supabase } from '../supabase';
import { getNextDays } from '../utils/helpers';

interface SelectDateTimeScreenProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
}

export const SelectDateTimeScreen: React.FC<SelectDateTimeScreenProps> = ({
  booking, setBooking, onNext, onBack,
}) => {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const nextDays = useMemo(() => getNextDays(14), []);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [workHours, setWorkHours] = useState<any[]>([]);
  const [minAdvance, setMinAdvance] = useState(0);
  const [appointmentInterval, setAppointmentInterval] = useState(15);

  useEffect(() => {
    const initData = async () => {
      let whQuery = supabase.from('work_hours').select('*');
      if (booking.selectedProfessional) {
        whQuery = whQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: wh } = await whQuery;
      if (wh) setWorkHours(wh);

      let blocksQuery = supabase.from('blocked_slots').select('*');
      if (booking.selectedProfessional) {
        blocksQuery = blocksQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: blocks } = await blocksQuery;
      if (blocks) {
        setBlockedSlots(blocks.map((b: any) => ({ ...b, time: b.time?.slice(0, 5) || b.time })));
      }

      let appsQuery = supabase.from('appointments').select('*, services:appointment_services(service:services(duration))').neq('status', 'CANCELLED');
      if (booking.selectedProfessional) {
        appsQuery = appsQuery.eq('professional_id', booking.selectedProfessional.id);
      }
      const { data: apps } = await appsQuery;
      if (apps) {
        setExistingAppointments(apps.map((a: any) => {
          const totalDuration = a.services?.reduce((sum: number, item: any) => sum + (item.service?.duration || 30), 0) || 30;
          return { ...a, date: a.appointment_date, time: a.appointment_time?.slice(0, 5) || a.appointment_time, duration: totalDuration };
        }));
      }

      const { data: settingsData } = await supabase.from('settings').select('*').eq('key', 'min_advance_minutes').maybeSingle();
      if (settingsData) setMinAdvance(parseInt(settingsData.value) || 0);

      const { data: intervalData } = await supabase.from('settings').select('*').eq('key', 'interval_minutes').maybeSingle();
      setAppointmentInterval(intervalData ? parseInt(intervalData.value) || 30 : 30);
    };
    initData();
  }, []);

  useEffect(() => {
    const selectedDateStr = nextDays[selectedDateIndex].dateStr;
    const dateObj = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayConfig = workHours.find(w => w.day_of_week === dayOfWeek);

    if (!dayConfig || !dayConfig.is_open) { setAvailableTimes([]); return; }

    const times: string[] = [];
    const step = appointmentInterval;
    const myDuration = booking.selectedServices.reduce((sum, s) => sum + s.duration, 0) || 30;

    const toMins = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + mm; };

    const generateSlots = (start: string, end: string) => {
      if (!start || !end) return;
      let [h, m] = start.slice(0, 5).split(':').map(Number);
      const shiftEndMins = toMins(end.slice(0, 5));

      while (true) {
        const currentSlotStart = h * 60 + m;
        const currentSlotEnd = currentSlotStart + myDuration;
        if (currentSlotEnd > shiftEndMins) break;

        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const now = new Date();
        const isToday = selectedDateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        let isPast = isToday && currentSlotStart <= (now.getHours() * 60 + now.getMinutes() + minAdvance);

        let isBlocked = false;
        if (!isPast) {
          for (const bloc of blockedSlots) {
            if (bloc.date === selectedDateStr) {
              const blockStart = toMins(bloc.time);
              if (blockStart >= currentSlotStart && blockStart < currentSlotEnd) { isBlocked = true; break; }
            }
          }
          if (!isBlocked) {
            for (const app of existingAppointments) {
              if (app.date === selectedDateStr && app.status !== 'CANCELLED') {
                const appStart = toMins(app.time);
                const appEnd = appStart + app.duration;
                if (currentSlotStart < appEnd && currentSlotEnd > appStart) { isBlocked = true; break; }
              }
            }
          }
        }

        if (!isPast && !isBlocked) times.push(timeStr);
        m += step;
        if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
      }
    };

    if (dayConfig.is_morning_open !== false) generateSlots(dayConfig.start_time_1, dayConfig.end_time_1);
    if (dayConfig.start_time_2 && dayConfig.end_time_2 && dayConfig.is_afternoon_open !== false) generateSlots(dayConfig.start_time_2, dayConfig.end_time_2);

    setAvailableTimes(times);
  }, [selectedDateIndex, blockedSlots, workHours, existingAppointments, booking.selectedServices, minAdvance, appointmentInterval]);

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
                <span className="text-[10px] font-bold uppercase">{d.label}</span>
                <span className="text-xl font-bold">{d.dayNum}</span>
              </button>
            ))}
          </div>

          <h3 className="text-slate-900 dark:text-white font-bold mb-4">Horários Livres</h3>
          <div className="grid grid-cols-4 gap-3">
            {availableTimes.length === 0 && (
              <p className="col-span-4 text-center text-gray-400 text-sm py-6">Nenhum horário disponível neste dia.</p>
            )}
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

export default SelectDateTimeScreen;
