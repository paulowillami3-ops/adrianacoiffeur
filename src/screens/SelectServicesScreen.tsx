import React from 'react';
import { motion } from 'framer-motion';
import { BookingState, Service } from '../../types';

interface SelectServicesScreenProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
  services: Service[];
}

const SelectServicesScreen: React.FC<SelectServicesScreenProps> = ({ 
  booking, 
  setBooking, 
  onNext, 
  onBack, 
  services 
}) => {

  const toggleService = (service: Service) => {
    setBooking(prev => {
      const exists = prev.selectedServices.find(s => s.id === service.id);
      if (exists) {
        return { ...prev, selectedServices: prev.selectedServices.filter(s => s.id !== service.id) };
      }
      return { ...prev, selectedServices: [...prev.selectedServices, service] };
    });
  };

  const totalPrice = booking.selectedServices.reduce((sum, s) => {
    const basePrice = (s.min_price !== undefined && s.min_price !== null) ? s.min_price : s.price;
    return sum + basePrice;
  }, 0);

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
                <motion.label
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  key={service.id}
                  className={`relative flex gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark border transition-all cursor-pointer ${booking.selectedServices.some(s => s.id === service.id) ? 'border-primary shadow-lg shadow-primary/10' : 'border-gray-100 dark:border-white/5'} shadow-sm hover:shadow-md glass-effect`}
                >
                  {service.imageUrl && (
                    <div className="size-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 shadow-inner">
                      <img
                        src={service.imageUrl}
                        onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                        className="w-full h-full object-cover"
                        alt={service.name}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{service.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-[11px] line-clamp-2 mt-1 leading-relaxed">{service.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-primary font-bold text-sm">
                        {(() => {
                          const isSub = booking.clientSubscription?.isActive;
                          const isAllowed = booking.clientSubscription?.allowedServices?.includes(service.id);

                          if (isSub && isAllowed) {
                            return (
                              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1 font-black tracking-wide">
                                <span className="material-symbols-outlined text-sm filled">check_circle</span>
                                {(() => {
                                  const isSelected = booking.selectedServices.some(s => s.id === service.id);
                                  const limit = (booking.clientSubscription as any).serviceLimits?.[service.id] || 0;
                                  const currentUsed = (booking.clientSubscription as any).serviceUsage?.[service.id] || 0;

                                  if (limit > 0) {
                                    let available = limit - currentUsed;
                                    if (isSelected) {
                                      const idx = booking.selectedServices.findIndex(s => s.id === service.id);
                                      const countBefore = booking.selectedServices.slice(0, idx).filter(s => s.id === service.id).length;
                                      available = Math.max(0, available - (countBefore + 1));
                                    }
                                    return `${available}/${limit}`;
                                  }
                                  return "Incluso";
                                })()}
                              </span>
                            );
                          }

                          if (service.min_price || service.max_price) {
                            return (
                              <div className="flex flex-col">
                                <span className="text-primary font-bold text-sm">
                                  {service.max_price 
                                    ? `R$ ${service.min_price?.toFixed(2) || '0.00'} - ${service.max_price.toFixed(2)}`
                                    : `A partir de R$ ${service.min_price?.toFixed(2) || '0.00'}`
                                  }
                                </span>
                                <span className="text-[8px] text-gray-400 uppercase font-black tracking-tighter -mt-1">Valor final após avaliação</span>
                              </div>
                            );
                          }

                          return `R$ ${service.price.toFixed(2)}`;
                        })()}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span> {service.duration} min
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={booking.selectedServices.some(s => s.id === service.id)}
                    onChange={() => toggleService(service)}
                    className="hidden"
                  />
                  {booking.selectedServices.some(s => s.id === service.id) && (
                    <div className="absolute top-2 right-2 text-primary">
                      <span className="material-symbols-outlined filled text-xl">check_circle</span>
                    </div>
                  )}
                </motion.label>
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
                  const limits = sub.serviceLimits || {};
                  const usage = { ...(sub.serviceUsage || {}) };
                  const price = booking.selectedServices.reduce((sum, s) => {
                    const limit = limits[s.id];
                    if (limit !== undefined && limit > 0) {
                      const used = usage[s.id] || 0;
                      if (used < limit) { usage[s.id] = used + 1; return sum; }
                    }
                    const basePrice = (s.min_price !== undefined && s.min_price !== null) ? s.min_price : s.price;
                    return sum + basePrice;
                  }, 0);
                  return `R$ ${price.toFixed(2)}`;
                })()}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={booking.selectedServices.length === 0}
              onClick={onNext}
              className="flex-1 bg-primary text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 premium-glow uppercase tracking-widest text-xs"
            >
              Continuar
            </motion.button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SelectServicesScreen;

