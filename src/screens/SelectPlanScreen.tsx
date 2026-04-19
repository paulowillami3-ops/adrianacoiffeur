import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { AnimatePresence, motion } from 'framer-motion';

interface SelectPlanScreenProps {
  onBack: () => void;
  clientId: string;
}

const SelectPlanScreen: React.FC<SelectPlanScreenProps> = ({ onBack, clientId }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
    if (data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const handleSubscribe = async (planId: string) => {
    if (!confirm('Deseja assinar este plano?')) return;
    
    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: clientId,
      plan_id: planId,
      status: 'PENDING'
    });

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Solicitação enviada! Aguarde a aprovação no salão.');
      onBack();
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
       <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined font-black">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Assinaturas VIP</h2>
          <div className="size-10" />
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-4xl mx-auto w-full pb-24 text-center">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white">Escolha sua Experiência</h3>
        <p className="text-gray-500 font-medium max-w-sm mx-auto">Assine e garanta preços fixos e benefícios exclusivos no Adriana Coiffeur.</p>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6">
            {plans.map(plan => (
              <div 
                key={plan.id}
                className={`bg-white dark:bg-surface-dark p-8 rounded-[40px] border-2 transition-all text-left relative overflow-hidden ${selectedPlan?.id === plan.id ? 'border-primary shadow-xl scale-105' : 'border-gray-100 dark:border-white/5 opacity-80'}`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.name.includes('Premium') && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase">Mais Popular</div>
                )}
                
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-primary font-black text-3xl">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase">/ mês</span>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.description?.split('\n').map((line: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                       <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{line}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); handleSubscribe(plan.id); }}
                  className={`w-full py-4 rounded-2xl font-black transition-all ${
                    selectedPlan?.id === plan.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  ASSINAR AGORA
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SelectPlanScreen;
