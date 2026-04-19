import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSubscriptionsScreen from './AdminSubscriptionsScreen';
import AdminManagePlansScreen from './AdminManagePlansScreen';

const AdminClubManagementScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'PLANS'>('MEMBERS');

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-4xl mx-auto w-full p-4">
          <div className="flex items-center mb-6">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 font-bold">arrow_back</span>
            </button>
            <div className="flex-1 text-center pr-10">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Clube do Cabelo Perfeito</h2>
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Painel de Gestão Premium</p>
            </div>
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl max-w-sm mx-auto border border-gray-200 dark:border-white/5">
            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MEMBERS' 
                  ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              Membros
            </button>
            <button
              onClick={() => setActiveTab('PLANS')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'PLANS' 
                  ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">settings_suggest</span>
              Planos
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeTab === 'MEMBERS' ? (
              <AdminSubscriptionsScreen onBack={onBack} hideHeader />
            ) : (
              <AdminManagePlansScreen onBack={onBack} hideHeader />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminClubManagementScreen;
