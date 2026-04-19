import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AdminSubscriptionsScreen: React.FC<{
  onBack: () => void;
  hideHeader?: boolean;
}> = ({ onBack, hideHeader }) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [confirmCancelSubId, setConfirmCancelSubId] = useState<number | null>(null);
  const [availablePlans, setAvailablePlans] = useState<{ id: number; name: string }[]>([]);
  const [changingPlanId, setChangingPlanId] = useState<number | null>(null);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, client:clients(name, phone), plan:subscription_plans(id, name)')
      .order('created_at', { ascending: false });
    if (data) setSubs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
    supabase.from('subscription_plans').select('id, name').eq('is_active', true).order('price', { ascending: true })
      .then(({ data }) => { if (data) setAvailablePlans(data); });
  }, []);

  const handleStatus = async (id: number, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status, approved_at: status === 'APPROVED' ? new Date().toISOString() : null })
      .eq('id', id);
    if (!error) fetchSubs();
  };

  const handleChangePlan = async (subId: number, planId: number) => {
    setChangingPlanId(subId);
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ plan_id: planId })
      .eq('id', subId);
    if (!error) fetchSubs();
    setChangingPlanId(null);
  };

  return (
    <div className={`bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col pb-12 transition-colors ${hideHeader ? 'min-h-0 bg-none pb-0' : ''}`}>
      {!hideHeader && (
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
          <div className="max-w-4xl mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-white font-bold">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Gerenciar Assinaturas</h2>
          </div>
        </header>
      )}

      <main className="p-4 space-y-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : subs.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-medium">Nenhuma assinatura encontrada.</div>
        ) : (
          <div className="grid gap-4">
            {subs.map(sub => (
              <div key={sub.id} className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.client?.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      sub.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        sub.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-700'
                      }`}>
                      {sub.status === 'APPROVED' ? 'APROVADO' :
                        sub.status === 'CANCELLED' ? 'CANCELADO' :
                          sub.status === 'REJECTED' ? 'REJEITADO' :
                            'PENDENTE'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{sub.client?.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-xs text-gray-400">swap_horiz</span>
                    <select
                      value={sub.plan?.id ?? sub.plan_id}
                      disabled={changingPlanId === sub.id}
                      onChange={async (e) => {
                        const newPlanId = Number(e.target.value);
                        if (newPlanId !== (sub.plan?.id ?? sub.plan_id)) {
                          await handleChangePlan(sub.id, newPlanId);
                        }
                      }}
                      className="text-xs font-bold text-primary bg-transparent border-none outline-none cursor-pointer hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {availablePlans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {changingPlanId === sub.id && (
                      <div className="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(sub.created_at).toLocaleString('pt-BR')}</p>
                </div>

                <div className="flex items-center gap-3">
                  {sub.payment_proof_url && (
                    <button
                      onClick={() => setSelectedProof(sub.payment_proof_url)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      VER COMPROVANTE
                    </button>
                  )}

                  {sub.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatus(sub.id, 'APPROVED')}
                        className="size-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                        title="Aprovar"
                      >
                        <span className="material-symbols-outlined">check</span>
                      </button>
                      <button
                        onClick={() => handleStatus(sub.id, 'REJECTED')}
                        className="size-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        title="Rejeitar"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}

                  {sub.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        if (confirmCancelSubId === sub.id) {
                          handleStatus(sub.id, 'CANCELLED');
                          setConfirmCancelSubId(null);
                        } else {
                          setConfirmCancelSubId(sub.id);
                        }
                      }}
                      className={`size-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${confirmCancelSubId === sub.id
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400 hover:bg-red-500 hover:text-white'
                        }`}
                      title={confirmCancelSubId === sub.id ? 'Confirmar cancelamento' : 'Cancelar Assinatura'}
                    >
                      <span className="material-symbols-outlined text-sm">{confirmCancelSubId === sub.id ? 'warning' : 'block'}</span>
                    </button>
                  )}

                  {(sub.status === 'CANCELLED' || sub.status === 'REJECTED') && (
                    <button
                      onClick={() => handleStatus(sub.id, 'APPROVED')}
                      className="flex items-center gap-1.5 px-3 h-10 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider border border-green-500/20 transition-all active:scale-95"
                      title="Reativar Assinatura"
                    >
                      <span className="material-symbols-outlined text-sm">bookmark_add</span>
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Proof Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-bold text-slate-900 dark:text-white">Comprovante de Pagamento</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-black/20 min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={selectedProof}
                alt="Comprovante"
                className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-white/5"
              />
            </div>
            <div className="p-4 text-center">
              <button
                onClick={() => setSelectedProof(null)}
                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all active:scale-95 text-xs uppercase"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptionsScreen;
