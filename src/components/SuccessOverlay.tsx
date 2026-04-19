import React from 'react';

export const SuccessOverlay: React.FC = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/90 backdrop-blur-md animate-fade-in px-6">
    <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-scale-up border border-gray-100 dark:border-white/10 max-w-sm w-full">
      <div className="size-24 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-6 animate-bounce-custom">
        <span className="material-symbols-outlined text-6xl text-green-600 dark:text-green-400">check_circle</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">Agendamento feito com sucesso!</h2>
      <p className="text-gray-500 dark:text-gray-400 font-medium">Seu horário está reservado.</p>
    </div>
  </div>
);

export default SuccessOverlay;
