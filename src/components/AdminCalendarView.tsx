import React, { useState, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, Professional, BlockedSlot } from '../types';

interface AdminCalendarViewProps {
  appointments: Appointment[];
  selectedDateStr: string;
  onDateChange: (dateStr: string) => void;
  onAppointmentClick: (app: Appointment) => void;
  workHours: any[];
  professionals: Professional[];
  blockedSlots: BlockedSlot[];
}

const AdminCalendarView: React.FC<AdminCalendarViewProps> = ({ 
  appointments, 
  selectedDateStr, 
  onDateChange, 
  onAppointmentClick, 
  workHours, 
  professionals, 
  blockedSlots 
}) => {
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
            {/* Blocked Slots Overlay */}
            {blockedSlots.filter(b => b.date === selectedDateStr).map(block => {
              const pos = getPosition(block.time || '08:00', 60);
              return (
                <div 
                  key={block.id}
                  className="absolute left-0 right-0 hatched-red z-0 flex items-center justify-center overflow-hidden"
                  style={{ top: `${pos.top}px`, height: `${pos.height}px` }}
                >
                  <div className="rotate-12 opacity-20 whitespace-nowrap text-[10px] font-black uppercase select-none text-red-600 dark:text-red-400">BLOQUEADO: {block.reason}</div>
                </div>
              );
            })}

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

export default AdminCalendarView;
