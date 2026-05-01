import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../supabase';

interface SubscriptionPaymentScreenProps {
  plan: SubscriptionPlan;
  onBack: () => void;
  onSubmit: (proof: string, phone: string, name: string, birthDate: string, cpf: string, paymentMethod: string) => void;
}

const SubscriptionPaymentScreen: React.FC<SubscriptionPaymentScreenProps> = ({ plan, onBack, onSubmit }) => {
  const [proof, setProof] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT' | 'SALON'>('PIX');
  const [loadingClient, setLoadingClient] = useState(false);

  const formatPhoneBr = (v: string) => {
    const numbers = v.replace(/\D/g, '').slice(0, 11);
    if (!numbers) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}${numbers.length > 2 ? '-' : ''}${numbers.slice(7)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return numbers;
  };

  const handlePhoneChange = async (val: string) => {
    const formatted = formatPhoneBr(val);
    const digits = formatted.replace(/\D/g, '');
    setPhone(formatted);

    if (digits.length >= 10) {
      setLoadingClient(true);
      const { data: client } = await supabase.from('clients')
        .select('*')
        .eq('phone', digits)
        .single();

      if (client) {
        setName(client.name || '');
        if (client.birth_date) setBirthDate(client.birth_date);
        if (client.notes?.includes('CPF: ')) {
          const match = client.notes.match(/CPF: ([\d.-]+)/);
          if (match) setCpf(match[1]);
        }
      }
      setLoadingClient(false);
    }
  };

  const handleSubmit = () => {
    if (!phone || !name || !birthDate) return alert('Por favor, preencha seus dados pessoais.');
    if (paymentMethod === 'PIX' && !proof) return alert('Por favor, insira o comprovante ou ID do Pix.');
    onSubmit(proof || 'N/A', phone, name, birthDate, cpf, paymentMethod);
  };

  const methods = [
    { id: 'PIX', name: 'Pix', icon: 'qr_code_2' },
    { id: 'CREDIT', name: 'Cartão', icon: 'credit_card' },
    { id: 'SALON', name: 'No Salão', icon: 'storefront' },
  ];

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4">
        <div className="max-w-md mx-auto w-full flex items-center">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 transition-colors">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white ml-2 text-lg">Cadastro no Clube</h2>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-md mx-auto w-full pb-32">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl text-center">
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Plano Escolhido</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
          <p className="text-2xl font-black text-slate-900 dark:text-white">R$ {plan.price.toFixed(2)} / mês</p>
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Informações Pessoais</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">WhatsApp *</label>
              <input 
                value={phone} 
                onChange={e => handlePhoneChange(e.target.value)} 
                placeholder="(82) 99999-9999" 
                className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" 
              />
              {loadingClient && (
                <div className="absolute right-4 bottom-4">
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nome Completo *</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: Maria Silva" 
                className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nascimento *</label>
                <input 
                  type="date"
                  value={birthDate} 
                  onChange={e => setBirthDate(e.target.value)} 
                  className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">CPF (Opcional)</label>
                <input 
                  value={cpf} 
                  onChange={e => setCpf(e.target.value)} 
                  placeholder="000.000.000-00" 
                  className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Forma de Pagamento</h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id as any)}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === m.id 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400'
                }`}
              >
                <span className="material-symbols-outlined">{m.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-tighter">{m.name}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {paymentMethod === 'PIX' && (
              <motion.div 
                key="pix"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-white/5 shadow-inner text-center space-y-4">
                  <p className="text-xs font-bold text-gray-500">Escaneie o QR Code abaixo ou use a chave celular</p>
                  <div className="aspect-square bg-white rounded-2xl p-4 flex items-center justify-center mx-auto max-w-[180px] shadow-sm border border-gray-50">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(plan.pix_code || 'PIX_CHAVE_CELULAR_82996096247')}`} alt="QR Code" />
                  </div>
                  <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Chave Celular</p>
                    <p className="text-sm font-black text-primary">(82) 99609-6247</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Comprovante / ID Transação *</label>
                  <input 
                    value={proof} 
                    onChange={e => setProof(e.target.value)} 
                    placeholder="Cole o código ou ID aqui" 
                    className="w-full bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
              </motion.div>
            )}

            {paymentMethod === 'CREDIT' && (
              <motion.div 
                key="credit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 bg-primary/10 border border-primary/20 rounded-[32px] text-center space-y-3"
              >
                <span className="material-symbols-outlined text-4xl text-primary">link</span>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Link de Pagamento</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Após clicar em finalizar, você receberá o link de pagamento recorrente via WhatsApp ou poderá solicitar na recepção.
                </p>
              </motion.div>
            )}

            {paymentMethod === 'SALON' && (
              <motion.div 
                key="salon"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[32px] text-center space-y-3"
              >
                <span className="material-symbols-outlined text-4xl text-slate-600 dark:text-slate-400">storefront</span>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Pagar no Salão</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sua assinatura ficará pendente. Na sua próxima visita, realize o pagamento para ativar seus benefícios VIP.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <button onClick={handleSubmit} className="w-full bg-primary text-white font-black py-5 rounded-3xl shadow-2xl shadow-primary/30 text-lg hover:scale-[1.02] active:scale-95 transition-all">
          FINALIZAR CADASTRO
        </button>
      </main>
    </div>
  );
};

export default SubscriptionPaymentScreen;
