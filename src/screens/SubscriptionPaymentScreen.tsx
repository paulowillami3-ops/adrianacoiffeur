import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';

interface SubscriptionPaymentScreenProps {
  plan: SubscriptionPlan;
  onBack: () => void;
  onSubmit: (proof: string, phone: string, name: string) => void;
}

const SubscriptionPaymentScreen: React.FC<SubscriptionPaymentScreenProps> = ({ plan, onBack, onSubmit }) => {
  const [proof, setProof] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!proof || !phone || !name) return alert('Preencha todos os campos');
    onSubmit(proof, phone, name);
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4">
        <div className="max-w-md mx-auto w-full flex items-center">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><span className="material-symbols-outlined font-bold">arrow_back</span></button>
          <h2 className="font-bold text-slate-900 dark:text-white ml-2 text-lg">Pagamento PIX</h2>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-md mx-auto w-full pb-24 text-center">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl">
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Plano Escolhido</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
          <p className="text-2xl font-black text-slate-900 dark:text-white">R$ {plan.price.toFixed(2)} / mês</p>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
             <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">Escaneie o QR Code PIX abaixo</p>
             <div className="aspect-square bg-white rounded-2xl p-4 flex items-center justify-center mx-auto max-w-[200px]">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('PIX_KEY_PLACEHOLDER')}`} alt="QR Code" />
             </div>
             <p className="text-[10px] text-gray-400 font-bold uppercase mt-4 tracking-widest">Chave Celular: (82) 99609-6247</p>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-2">Seu Nome Completo</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Como está no banco" className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-2">Celular com DDD</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(82) 00000-0000" className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-2">Chave da Transação / ID</label>
              <input value={proof} onChange={e => setProof(e.target.value)} placeholder="Cole o código do comprovante aqui" className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-2xl shadow-primary/30 text-lg hover:scale-[1.02] active:scale-95 transition-all">
          ENVIAR COMPROVANTE
        </button>
      </main>
    </div>
  );
};

export default SubscriptionPaymentScreen;
