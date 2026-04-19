import React, { useState } from 'react';

interface CustomerLoginScreenProps {
  onLogin: (phone: string) => void;
  onBack: () => void;
}

export const CustomerLoginScreen: React.FC<CustomerLoginScreenProps> = ({ onLogin, onBack }) => {
  const [phone, setPhone] = useState('');

  const formatPhone = (v: string) => {
    const numbers = v.replace(/\D/g, '').slice(0, 11);
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative p-6 max-w-md mx-auto w-full justify-center">
        <button onClick={onBack} className="absolute top-6 left-6 size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center mb-8">
          <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl">smartphone</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Identifique-se</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Informe seu celular para ver seus agendamentos.</p>
        </div>
        <div className="space-y-4">
          <input
            value={phone}
            onChange={handlePhoneChange}
            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400 text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="(00) 0 0000-0000"
            type="tel"
          />
          <button
            onClick={() => {
              const raw = phone.replace(/\D/g, '');
              if (raw.length > 8) onLogin(raw);
              else alert('Telefone inválido');
            }}
            className="w-full bg-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 text-white active:scale-[0.98] transition-all"
          >
            Ver Agendamentos
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginScreen;
