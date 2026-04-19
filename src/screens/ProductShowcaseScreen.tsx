import React from 'react';
import { Product } from '../../types';

interface ProductShowcaseScreenProps {
  products: Product[];
  onBack: () => void;
}

const ProductShowcaseScreen: React.FC<ProductShowcaseScreenProps> = ({ products, onBack }) => {
  const handleIWant = (product: Product) => {
    const text = `Olá Adriana! Vi o produto *${product.name}* na vitrine do seu app e tenho interesse!`;
    window.open(`https://wa.me/5582996096247?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4">
        <div className="max-w-md mx-auto w-full flex items-center">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white ml-2 text-lg">Produtos</h2>
        </div>
      </header>
      <main className="p-4 grid grid-cols-2 gap-4 max-w-md mx-auto pb-24">
        {products.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-2">inventory_2</span>
            <p className="font-medium">Nenhum produto disponível no momento.</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm flex flex-col hover:border-primary/20 transition-all group">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
              <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={e => e.currentTarget.src = 'https://via.placeholder.com/200'} />
              <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-primary shadow-sm">
                R$ {p.price.toFixed(2)}
              </div>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 mb-3 flex-1 font-medium">{p.description}</p>
              <button 
                onClick={() => handleIWant(p)}
                className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-lg shadow-green-500/10 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">shopping_bag</span> Eu quero
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default ProductShowcaseScreen;
