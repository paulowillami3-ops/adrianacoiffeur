import React, { useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, Professional, BlockedSlot } from '../types';

interface AdminWeeklyCalendarViewProps {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  professionals: Professional[];
  selectedDateStr: string;
  onDateChange: (dateStr: string) => void;
  onAppointmentClick: (app: Appointment) => void;
}

const AdminWeeklyCalendarView: React.FC<AdminWeeklyCalendarViewProps> = ({ 
  appointments, 
  blockedSlots, 
  professionals, 
  selectedDateStr, 
  onDateChange, 
  onAppointmentClick 
}) => {
  const [startOfWeekDate, setStartOfWeekDate] = useState(startOfWeek(parseISO(selectedDateStr), { weekStartsOn: 1 }));
  
  useEffect(() => {
    setStartOfWeekDate(startOfWeek(parseISO(selectedDateStr), { weekStartsOn: 1 }));
  }, [selectedDateStr]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeekDate, i));
  const START_HOUR = 8;
  const END_HOUR = 20;
  const PIXELS_PER_MINUTE = 1.5;

  const getPosition = (timeStr: string, duration: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startMinutes = (h * 60 + m) - (START_HOUR * 60);
    return { top: startMinutes * PIXELS_PER_MINUTE, height: duration * PIXELS_PER_MINUTE };
  };

  const navWeek = (amount: number) => {
    const newDate = addDays(startOfWeekDate, amount * 7);
    onDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl animate-fade-in transition-all">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-background-dark/50 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          <button onClick={() => navWeek(-1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-900 dark:text-white transition-all"><span className="material-symbols-outlined">chevron_left</span></button>
          <button onClick={() => onDateChange(format(new Date(), 'yyyy-MM-dd'))} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-slate-600 dark:text-gray-300 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">Hoje</button>
          <button onClick={() => navWeek(1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-900 dark:text-white transition-all"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Semana de {format(days[0], 'dd/MM')} a {format(days[6], 'dd/MM')}
        </h3>
        <div className="w-8"></div>
      </div>
      <div className="flex-1 overflow-auto no-scrollbar relative" style={{ height: '650px' }}>
        <div className="flex min-w-[900px] relative h-full">
          <div className="w-12 flex-shrink-0 border-r border-gray-100 dark:border-white/5 sticky left-0 bg-white/95 dark:bg-surface-dark/95 z-20 backdrop-blur-sm">
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(h => (
              <div key={h} className="h-[90px] border-b border-gray-50 dark:border-white/5 text-[9px] font-black text-gray-400 text-center pt-1.5">{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
          <div className="flex-1 flex">
            {days.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');
              const dayApps = appointments.filter(a => a.date === dayStr && a.status !== 'CANCELLED');
              const dayBlocks = blockedSlots.filter(b => b.date === dayStr);
              return (
                <div key={dayStr} className={`flex-1 min-w-[120px] border-r border-gray-100 dark:border-white/5 relative ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className={`sticky top-0 z-10 p-2 text-center border-b border-gray-100 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md ${isToday ? 'text-primary' : 'text-slate-600 dark:text-gray-400'}`}>
                    <div className="text-[9px] font-black uppercase tracking-tighter opacity-60 mb-0.5">{format(day, 'EEE', { locale: ptBR })}</div>
                    <div className={`text-sm font-black size-7 flex items-center justify-center mx-auto rounded-full ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/30' : ''}`}>{format(day, 'd')}</div>
                  </div>
                  <div className="relative h-full bg-[linear-gradient(to_bottom,transparent_89px,rgba(0,0,0,0.015)_90px)] dark:bg-[linear-gradient(to_bottom,transparent_89px,rgba(255,255,255,0.015)_90px)] bg-[size:100%_90px]">
                    {dayBlocks.map(block => {
                      const pos = getPosition(block.time || '08:00', 60);
                      return (
                        <div 
                          key={block.id} 
                          className="absolute left-0 right-0 hatched-red z-0" 
                          style={{ top: `${pos.top}px`, height: `${pos.height}px` }} 
                        />
                      );
                    })}
                    {dayApps.map(app => {
                      const duration = app.services.reduce((s, x) => s + x.duration, 0) || 30;
                      const pos = getPosition(app.time, duration);
                      const pro = professionals.find(p => p.id === app.professionalId);
                      return (
                        <div key={app.id} onClick={() => onAppointmentClick(app)} className="absolute left-0.5 right-0.5 rounded p-1 shadow-sm cursor-pointer z-10 overflow-hidden" style={{ top: `${pos.top}px`, height: `${pos.height}px`, backgroundColor: pro?.color ? `${pro.color}15` : '#eee', borderLeft: `3px solid ${pro?.color || '#999'}` }}>
                          <div className="text-[9px] font-black truncate leading-tight text-slate-800 dark:text-white">{app.customerName}</div>
                          <div className="text-[8px] opacity-60 truncate">{app.services.map(s => s.name).join(', ')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWeeklyCalendarView;
