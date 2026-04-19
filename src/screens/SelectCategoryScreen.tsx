import React from 'react';
import { motion } from 'framer-motion';
import { Category, BookingState } from '../../types';

interface SelectCategoryScreenProps {
  categories: Category[];
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
}

export const SelectCategoryScreen: React.FC<SelectCategoryScreenProps> = ({
  categories, booking, setBooking, onNext, onBack,
}) => (
  <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
    <div className="flex flex-col min-h-screen relative">
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Categorias</h2>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">O que faremos hoje?</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Selecione uma categoria para ver os serviços disponíveis.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              key={cat.id}
              onClick={() => { setBooking({ ...booking, selectedCategory: cat }); onNext(); }}
              className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-lg hover:shadow-primary/10 transition-all flex flex-col items-center gap-3 text-center group glass-effect"
            >
              <div className="size-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">{cat.icon || 'category'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold text-slate-900 dark:text-white leading-tight">{cat.name}</span>
                {cat.description && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 max-w-[120px] leading-tight font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">{cat.description}</p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  </div>
);

export default SelectCategoryScreen;
