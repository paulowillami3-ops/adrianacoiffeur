import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion } from 'framer-motion';

const AdminClubDashboardScreen: React.FC = () => {
  const [metrics, setMetrics] = useState({
    mrr: 0,
    activeClients: 0,
    retentionRate: 0,
    packagesSold: 0
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // 1. Get Active Clients and MRR in one go
      const { data: activeSubs, error: activeError } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          client_id,
          subscription_plans ( price )
        `)
        .eq('status', 'APPROVED');

      if (activeError) throw activeError;

      const activeClients = activeSubs?.length || 0;
      const mrr = activeSubs?.reduce((sum, s) => sum + (Number(s.subscription_plans?.price) || 0), 0) || 0;
      const activeClientIds = activeSubs?.map(s => s.client_id) || [];

      // 2. Get Total Packages Sold (Total minus REJECTED or just count APPROVED/CANCELLED)
      const { count: packagesSold, error: countError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['APPROVED', 'CANCELLED']);

      if (countError) throw countError;

      // 3. Get Total Processed for Retention (Active + Cancelled)
      const { count: totalProcessed, error: processedError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['APPROVED', 'CANCELLED']);

      const retentionRate = totalProcessed && totalProcessed > 0 ? (activeClients / totalProcessed) * 100 : 0;

      setMetrics({
        mrr,
        activeClients,
        retentionRate,
        packagesSold: packagesSold || 0
      });

      // Fetch today's appointments for active members
      const today = new Date().toISOString().split('T')[0];
      if (activeClientIds.length > 0) {
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select(`
            *,
            clients ( name, phone ),
            appointment_services (
              service:services ( name )
            )
          `)
          .eq('appointment_date', today)
          .in('client_id', activeClientIds)
          .order('appointment_time', { ascending: true });

        if (!apptError && appts) {
          // Process appointments to flatten service names
          const processedApps = appts.map((a: any) => ({
            ...a,
            time: a.appointment_time?.slice(0, 5),
            serviceName: a.appointment_services?.map((as: any) => as.service?.name).join(' + ') || 'Serviço'
          }));
          setTodayAppointments(processedApps);
        }
      }

    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Visão Geral do Clube</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* MRR */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">MRR</div>
          <div className="text-2xl font-black text-amber-500">R$ {metrics.mrr.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-1">Receita Mensal Recorrente</div>
        </motion.div>

        {/* Active Clients */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Membros Ativos</div>
          <div className="text-2xl font-black text-primary">{metrics.activeClients}</div>
          <div className="text-[10px] text-gray-500 mt-1">Assinantes atuais</div>
        </motion.div>

        {/* Retention Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Retenção</div>
          <div className="text-2xl font-black text-emerald-500">{metrics.retentionRate.toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500 mt-1">Membros vs Cancelados</div>
        </motion.div>

        {/* Packages Sold */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm"
        >
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pacotes</div>
          <div className="text-2xl font-black text-purple-500">{metrics.packagesSold}</div>
          <div className="text-[10px] text-gray-500 mt-1">Total de pacotes vendidos</div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm mt-8">
        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Agenda do Dia (Membros do Clube)</h4>
        
        {todayAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">calendar_month</span>
            <p className="text-sm">Nenhum membro agendado para hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                    {appt.time}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {appt.clients?.name || 'Cliente Oculto'}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                      {appt.serviceName}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg font-bold uppercase tracking-widest">
                  VIP
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClubDashboardScreen;
