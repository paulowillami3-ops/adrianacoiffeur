import React from 'react';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { BookingState } from '../../types';

interface CustomerInfoScreenProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  onNext: () => void;
  onBack: () => void;
}

const CustomerInfoScreen: React.FC<CustomerInfoScreenProps> = ({ booking, setBooking, onNext, onBack }) => {
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
    setBooking(prev => ({ ...prev, customerPhone: formatted }));

    if (digits.length >= 10) {
      const { data: client } = await supabase.from('clients')
        .select('*')
        .eq('phone', digits)
        .single();

      if (client) {
        const { data: subs } = await supabase.from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('client_id', client.id);

        const activeSub = subs?.find((s: any) => s.status === 'APPROVED');
        let subData;
        if (activeSub) {
          const plan = activeSub.subscription_plans;
          const { data: ps } = await supabase.from('plan_services').select('service_id, monthly_limit').eq('plan_id', plan.id);
          const serviceLimits: Record<string, number> = {};
          ps?.forEach(s => { serviceLimits[String(s.service_id)] = s.monthly_limit; });
          const allowedIds = ps?.map(s => String(s.service_id)) || [];

          const startOfMonth = format(new Date(), 'yyyy-MM-01');
          const { data: monthApps } = await supabase
            .from('appointments')
            .select('id, services:appointment_services(service_id)')
            .eq('client_id', client.id)
            .gte('appointment_date', startOfMonth)
            .in('status', ['COMPLETED', 'PENDING']);

          const { data: sc } = await supabase.from('service_components').select('*');
          const componentsMap: Record<string, string[]> = {};
          sc?.forEach(item => {
            if (!componentsMap[String(item.parent_service_id)]) componentsMap[String(item.parent_service_id)] = [];
            componentsMap[String(item.parent_service_id)].push(String(item.component_service_id));
          });

          const usage: Record<string, number> = {};
          monthApps?.forEach(app => {
            const appServices = app.services || [];
            appServices.forEach((s: any) => {
              const sId = String(s.service_id);
              usage[sId] = (usage[sId] || 0) + 1;
              if (componentsMap[sId]) {
                componentsMap[sId].forEach(compId => {
                  usage[compId] = (usage[compId] || 0) + 1;
                });
              }
            });
          });

          subData = {
            planName: plan?.name || 'Assinatura',
            cutsUsed: monthApps?.length || 0,
            cutsLimit: plan?.monthly_limit || 0,
            serviceLimits,
            serviceUsage: usage,
            allowedServices: allowedIds,
            isActive: true
          };
        }
        setBooking(prev => ({
          ...prev,
          customerName: client.name,
          birthDate: client.birth_date,
          clientSubscription: subData
        }));
      } else {
        setBooking(prev => ({ ...prev, clientSubscription: undefined }));
      }
    } else {
      setBooking(prev => ({ ...prev, clientSubscription: undefined }));
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/10 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="p-4 flex items-center max-w-md mx-auto w-full">
        <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 transition-colors">
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <h2 className="ml-2 font-bold text-slate-800 dark:text-white text-lg">Suas Informações</h2>
      </header>
      <main className="flex-1 p-6 max-w-md mx-auto w-full space-y-6">
        <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-5 transition-colors">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Número de Telefone</label>
            <input
              type="text"
              placeholder="(00) 0 0000-0000"
              value={booking.customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-black/20 border-transparent px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:bg-white dark:focus:bg-surface-dark transition-all placeholder:text-gray-400"
            />
          </div>

          {booking.clientSubscription?.isActive && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 text-primary-dark dark:text-primary">
                <span className="material-symbols-outlined filled text-sm">crown</span>
                <span className="text-sm font-bold">{booking.clientSubscription.planName}</span>
              </div>
              <span className="text-[10px] font-black text-primary-dark dark:text-primary uppercase tracking-wider">Membro VIP</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Nome Completo</label>
            <input
              type="text"
              placeholder="Como quer ser chamado?"
              value={booking.customerName}
              onChange={(e) => setBooking({ ...booking, customerName: e.target.value })}
              className="w-full rounded-xl bg-gray-50 dark:bg-black/20 border-transparent px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:bg-white dark:focus:bg-surface-dark transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">AnIVERSÁRIO (OPCIONAL)</label>
            <input
              type="date"
              value={booking.birthDate || ''}
              onChange={(e) => setBooking({ ...booking, birthDate: e.target.value })}
              className="w-full rounded-xl bg-gray-50 dark:bg-black/20 border-transparent px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-primary focus:bg-white dark:focus:bg-surface-dark transition-all"
            />
            <p className="text-[9px] text-gray-400 px-2 italic mt-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">info</span> Cadastre para ganhar mimos especiais no seu mês!</p>
          </div>
        </div>

        <button
          disabled={!booking.customerName || !booking.customerPhone || booking.customerPhone.length < 14}
          onClick={onNext}
          className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
        >
          Revisar Agendamento
        </button>
      </main>
    </div>
  );
};

export default CustomerInfoScreen;
