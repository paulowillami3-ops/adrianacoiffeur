import React from 'react';
import { BookingState, Professional } from '../../types';

interface SelectProfessionalScreenProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
  professionals: Professional[];
}

const SelectProfessionalScreen: React.FC<SelectProfessionalScreenProps> = ({ 
  booking, 
  setBooking, 
  onNext, 
  onBack, 
  professionals 
}) => {

  const filteredProfessionals = professionals.filter(p => {
    if (!p.isActive) return false;
    if (booking.selectedCategory && p.categories && p.categories.length > 0) {
      return p.categories.includes(String(booking.selectedCategory.id));
    }
    return true;
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
                <div className="size-16 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border-2 border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-400" style={{ color: p.color }}>
                      {(p.name || '?').charAt(0)}
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
                <h3 className="font-bold text-slate-700 dark:text-gray-300">Automático</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">O sistema escolherá o melhor profissional disponível.</p>
              </div>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SelectProfessionalScreen;
