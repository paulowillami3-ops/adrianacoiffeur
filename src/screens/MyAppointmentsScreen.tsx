import React, { useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { Appointment, Service } from '../../types';
import { formatDateToBRL } from '../utils';

interface MyAppointmentsScreenProps {
  appointments: Appointment[];
  showPastHistory: boolean;
  setShowPastHistory: (show: boolean) => void;
  onBack: () => void;
  onNew: () => void;
  onRefresh: () => void;
}

// Check if an appointment has any service with a price range (min_price/max_price)
const hasPriceRange = (services: Service[]): boolean =>
  services.some(
    s => (s.min_price !== null && s.min_price !== undefined) ||
         (s.max_price !== null && s.max_price !== undefined)
  );


const MyAppointmentsScreen: React.FC<MyAppointmentsScreenProps> = ({ 
  appointments, 
  showPastHistory, 
  setShowPastHistory, 
  onBack, 
  onNew, 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return appointments.filter(app => {
      if (app.date > currentDate) return activeTab === 'upcoming';
      if (app.date < currentDate) return activeTab === 'past';

      const [h, m] = app.time.split(':').map(Number);
      const appTime = h * 60 + m;

      if (activeTab === 'upcoming') {
        return appTime > currentTime;
      } else {
        return appTime <= currentTime;
      }
    }).sort((a, b) => {
      if (activeTab === 'upcoming') {
        return (a.date + a.time).localeCompare(b.date + b.time);
      } else {
        return (b.date + b.time).localeCompare(a.date + a.time);
      }
    });
  }, [appointments, activeTab]);

  const renderPrice = (app: Appointment) => {
    const withRange = hasPriceRange(app.services);

    if (!withRange) {
      // Normal fixed price
      return (
        <span className="font-bold text-slate-900 dark:text-white">
          R$ {Number(app.totalPrice).toFixed(2)}
        </span>
      );
    }

    if (app.finalPriceSet) {
      // Admin already defined the final price
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-bold text-slate-900 dark:text-white">
            R$ {Number(app.totalPrice).toFixed(2)}
          </span>
          <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 rounded-full uppercase tracking-tight">
            Preço Definido ✓
          </span>
        </div>
      );
    }

    // Price range — admin hasn't defined the final price yet
    const rangeService = app.services.find(
      s => s.min_price !== null && s.min_price !== undefined
    );
    const minP = rangeService?.min_price;
    const maxP = rangeService?.max_price;

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="font-bold text-slate-900 dark:text-white text-sm">
          {minP !== undefined && maxP !== undefined
            ? `R$ ${Number(minP).toFixed(0)} – R$ ${Number(maxP).toFixed(0)}`
            : minP !== undefined
              ? `A partir de R$ ${Number(minP).toFixed(0)}`
              : '—'}
        </span>
        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-tight border border-amber-200 dark:border-amber-500/20 animate-pulse">
          Valor final após avaliação
        </span>
      </div>
    );
  };

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
                {filteredAppointments.map(app => {
                  const withRange = hasPriceRange(app.services);
                  const priceSet = withRange ? (app.finalPriceSet ?? false) : true;

                  return (
                    <div key={app.id} className={`bg-white dark:bg-surface-dark rounded-2xl border mb-4 overflow-hidden shadow-sm relative hover:border-primary/20 dark:hover:border-white/10 transition-all ${
                      withRange && !priceSet
                        ? 'border-amber-200 dark:border-amber-500/20'
                        : 'border-gray-200 dark:border-white/5'
                    }`}>
                      {/* Status badge */}
                      <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl tracking-wider uppercase ${
                        app.status === 'CANCELLED'
                          ? 'bg-red-500/10 text-red-500'
                          : app.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : app.status === 'CONFIRMED'
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>
                        {app.status === 'PENDING' ? 'Pendente' 
                          : app.status === 'CONFIRMED' ? 'Confirmado' 
                          : app.status === 'COMPLETED' ? 'Concluído' 
                          : app.status === 'CANCELLED' ? 'Cancelado' 
                          : app.status}
                      </div>

                      <div className="p-4 flex gap-4">
                        <div className={`size-16 rounded-xl flex flex-col items-center justify-center border transition-colors shrink-0 ${
                          activeTab === 'past'
                            ? 'bg-gray-100 border-gray-200 opacity-70'
                            : withRange && !priceSet
                              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                              : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'
                        }`}>
                          <span className="text-[10px] font-bold uppercase text-gray-500">Dia</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white">{app.date.split('-')[2]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {app.services?.[0]?.name || 'Serviço não especificado'}
                            {app.services?.length > 1 ? ` + ${app.services.length - 1} serviço` : ''}
                          </h3>
                          <div className="flex flex-col gap-1 mt-2">
                            <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                              {formatDateToBRL(app.date)}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {app.time}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] transition-colors">
                        {renderPrice(app)}
                        {activeTab === 'upcoming' && app.status !== 'COMPLETED' && app.status !== 'CANCELLED' && (
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
                  );
                })}
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
            <div className="p-4 bg-primary/10 rounded-2xl inline-flex text-primary mb-4 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">add_circle</span>
            </div>
            <h3 className="font-bold text-lg mb-1 text-slate-900 dark:text-white">Novo Agendamento</h3>
            <p className="text-sm text-gray-500 mb-6 px-4">Precisa de um trato no visual? Escolha um novo serviço e horário.</p>
            <button onClick={onNew} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">Agendar Horário</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyAppointmentsScreen;
