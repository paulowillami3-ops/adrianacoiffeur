import React from 'react';
import { motion } from 'framer-motion';

interface HomeScreenProps {
  onAgendar: () => void;
  onChat: () => void;
  onPerfil: () => void;
  onMais: () => void;
  onAssinatura: () => void;
  onProducts: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onAgendar, 
  onChat, 
  onPerfil, 
  onMais, 
  onAssinatura, 
  onProducts 
}) => {
  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark transition-colors">
      <header className="sticky top-0 z-50 flex items-center justify-center bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-gray-200 dark:border-white/5 gap-2 transition-colors">
        <img 
          src="/logo-icon.webp" 
          alt="Logo" 
          className="h-8 w-auto" 
          onError={e => (e.currentTarget.src = '/logo-icon.png')} 
        />
        <h2 className="text-lg font-bold leading-tight tracking-tight text-center text-slate-900 dark:text-white font-serif">Adriana Coiffeur</h2>
      </header>
      
      <main className="flex-1 flex flex-col px-4 pt-4 max-w-md mx-auto w-full">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vamos agendar o seu<br />horário?</h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAgendar}
            className="relative group flex flex-col items-start justify-end p-4 h-40 w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all glass-effect bg-white"
          >
            <div className="absolute inset-0 z-0">
              <img 
                alt="Agendamento" 
                src="/agendamento.webp" 
                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
                onError={e => (e.currentTarget.src = '/agendamento.png')} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            </div>
            <div className="relative z-10 flex flex-col items-start gap-1">
              <div className="mb-1 rounded-full bg-primary p-2 text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </div>
              <span className="text-left text-sm font-bold leading-tight text-white">Fazer o meu agendamento</span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onChat}
            className="relative group flex flex-col items-start justify-end p-4 h-40 w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5 transition-all glass-effect bg-white"
          >
            <div className="absolute inset-0 z-0">
              <img 
                alt="Adriana" 
                src="/adriana.webp" 
                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
                onError={e => (e.currentTarget.src = '/adriana.png')} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            </div>
            <div className="relative z-10 flex flex-col items-start gap-1">
              <div className="mb-1 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm">
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </div>
              <span className="text-left text-sm font-bold leading-tight text-white">Falar com Adriana</span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onAssinatura}
            className="relative group flex flex-col items-start justify-end h-32 w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5 transition-all col-span-2 glass-effect premium-glow"
          >
            <div className="absolute inset-0 z-0">
              <img 
                alt="Clube" 
                src="/clube.webp" 
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                onError={e => (e.currentTarget.src = '/clube.png')} 
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onProducts}
            className="relative group flex flex-col items-start justify-end p-4 h-32 w-full rounded-[2rem] overflow-hidden shadow-lg bg-gradient-to-br from-pink-500 to-rose-600 transition-all col-span-2 premium-glow"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform duration-500">
               <span className="material-symbols-outlined text-6xl text-white">shopping_basket</span>
            </div>
            <div className="relative z-10 flex flex-col items-start gap-1">
              <div className="mb-1 rounded-full bg-white/20 p-2 text-white backdrop-blur-md shadow-lg">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </div>
              <span className="text-left text-sm font-bold leading-tight text-white uppercase tracking-wider">Conheça nossa Vitrine</span>
            </div>
          </motion.button>
        </div>

        <div className="flex flex-col flex-1 items-start gap-4 text-slate-800 dark:text-white px-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Horários de Funcionamento</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Seg - Sáb: 10:00 - 20:00</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="material-symbols-outlined">location_on</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Endereço</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Shopping da Vila, Centro, Delmiro Gouveia - AL</p>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg pt-2 transition-colors">
        <div className="flex items-center justify-around px-2 pb-6">
          <motion.button onClick={onAgendar} className="flex flex-1 flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[24px] filled">calendar_month</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Agendar</span>
          </motion.button>
          <motion.button onClick={onPerfil} className="flex flex-1 flex-col items-center gap-1 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">calendar_month</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Agendamentos</span>
          </motion.button>
          <motion.button onClick={onMais} className="flex flex-1 flex-col items-center gap-1 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">logout</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Sair</span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
};

export default HomeScreen;
