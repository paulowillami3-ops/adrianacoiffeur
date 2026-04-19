import React from 'react';
import { BookingState } from '../../types';
import { formatDateToBRL } from '../utils';

interface ReviewScreenProps {
  booking: BookingState;
  onConfirm: () => void;
  onBack: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ booking, onConfirm, onBack }) => {
  const isSubscriber = booking.clientSubscription?.isActive;
  const serviceLimits = booking.clientSubscription?.serviceLimits || {};
  const serviceUsage = booking.clientSubscription?.serviceUsage || {};

  const runningUsage = { ...serviceUsage };
  const serviceIsFree: Record<string, boolean> = {};
  if (isSubscriber) {
    booking.selectedServices.forEach(s => {
      const limit = serviceLimits[s.id];
      if (limit !== undefined && limit > 0) {
        const used = runningUsage[s.id] || 0;
        if (used < limit) { serviceIsFree[s.id] = true; runningUsage[s.id] = used + 1; }
        else { serviceIsFree[s.id] = false; }
      } else { serviceIsFree[s.id] = false; }
    });
  }

  const totalPrice = booking.selectedServices.reduce((sum, s) => serviceIsFree[s.id] ? sum : sum + s.price, 0);
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

export default ReviewScreen;
