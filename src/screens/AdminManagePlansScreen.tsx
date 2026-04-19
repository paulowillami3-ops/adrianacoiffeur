import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Service, SubscriptionPlan } from '../../types';

const AdminManagePlansScreen: React.FC<{
  onBack: () => void;
  hideHeader?: boolean;
}> = ({ onBack, hideHeader }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [localLimits, setLocalLimits] = useState<Record<string, Record<string, number>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<{
    name: string;
    price: number;
    pix_code: string;
    qr_code_url: string;
    service_limits: Record<string, number>;
  }>({
    name: '',
    price: 0,
    pix_code: '',
    qr_code_url: '',
    service_limits: {}
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, Record<string, number>> = {};
    plans.forEach(p => {
      next[p.id] = { ...(p.service_limits || {}) };
    });
    setLocalLimits(next);
  }, [plans]);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setServices(data.map((s: any) => ({ ...s, id: String(s.id), imageUrl: s.image_url })));
  };

  const fetchPlans = async () => {
    const { data } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true });
    if (data) {
      const withServices = await Promise.all(
        data.map(async (p: any) => {
          const { data: ps } = await supabase.from('plan_services').select('service_id, monthly_limit').eq('plan_id', p.id);
          const serviceLimits: Record<string, number> = {};
          ps?.forEach(s => {
            serviceLimits[String(s.service_id)] = s.monthly_limit;
          });
          return {
            ...p,
            id: String(p.id),
            allowed_services: ps?.map(s => String(s.service_id)) || [],
            service_limits: serviceLimits
          };
        })
      );
      setPlans(withServices);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
    fetchServices();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlan.name || newPlan.price <= 0) {
      alert('Por favor, preencha o nome e um preço válido.');
      return;
    }

    const { data: createdPlan, error: planError } = await supabase
      .from('subscription_plans')
      .insert({
        name: newPlan.name,
        description: `Plano ${newPlan.name}`,
        price: newPlan.price,
        pix_code: newPlan.pix_code,
        qr_code_url: newPlan.qr_code_url,
        is_active: true,
        monthly_limit: 0
      })
      .select()
      .single();

    if (planError) {
      alert('Erro ao criar plano: ' + planError.message);
      return;
    }

    if (createdPlan) {
      const servicesList = Object.keys(newPlan.service_limits);
      if (servicesList.length > 0) {
        await supabase.from('plan_services').insert(
          servicesList.map(sId => ({
            plan_id: createdPlan.id,
            service_id: parseInt(sId),
            monthly_limit: newPlan.service_limits[sId] || 0
          }))
        );
      }
      setIsCreating(false);
      setNewPlan({ name: '', price: 0, pix_code: '', qr_code_url: '', service_limits: {} });
      fetchPlans();
    }
  };

  const handleUpdate = async (id: string, price: number, qr_code_url: string, pix_code: string, service_limits: Record<string, number>) => {
    const current = plans.find(p => p.id === id);
    const servicesList = Object.keys(service_limits).sort();
    const currentServicesList = (current?.allowed_services || []).sort();

    if (current &&
      Number(current.price) === price &&
      current.qr_code_url === qr_code_url &&
      current.pix_code === pix_code &&
      JSON.stringify(currentServicesList) === JSON.stringify(servicesList) &&
      JSON.stringify(current.service_limits) === JSON.stringify(service_limits)) {
      return;
    }

    const { error } = await supabase
      .from('subscription_plans')
      .update({ price, qr_code_url, pix_code })
      .eq('id', id);

    if (!error) {
      await supabase.from('plan_services').delete().eq('plan_id', id);
      if (servicesList.length > 0) {
        await supabase.from('plan_services').insert(
          servicesList.map(sId => ({
            plan_id: parseInt(id),
            service_id: parseInt(sId),
            monthly_limit: service_limits[sId] || 0
          }))
        );
      }
      fetchPlans();
    } else {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir plano: ' + error.message);
    } else {
      setConfirmDeleteId(null);
      fetchPlans();
    }
  };

  return (
    <div className={`bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col pb-12 transition-colors ${hideHeader ? 'min-h-0 bg-none pb-0' : ''}`}>
      {!hideHeader && (
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
          <div className="max-w-2xl mx-auto w-full flex items-center p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-600 dark:text-white font-bold">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center text-slate-900 dark:text-white">Planos de Assinatura</h2>
            <button 
              onClick={() => setIsCreating(true)}
              className="size-10 rounded-full flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined font-bold">add</span>
            </button>
          </div>
        </header>
      )}

      <main className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {hideHeader && (
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Novo Plano
                </button>
              </div>
            )}

            {plans.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
                <div className="size-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl">card_membership</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Nenhum Plano Encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">Você ainda não criou nenhum plano de assinatura para o seu clube exclusivo.</p>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
                >
                  Criar Primeiro Plano
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {plans.map(plan => (
                  <div key={`${plan.id}-${JSON.stringify(plan.service_limits)}`} className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">card_membership</span>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h3>
                      </div>
                      {confirmDeleteId === plan.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-[10px] font-black uppercase text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancelar</button>
                          <button onClick={() => handleDeletePlan(plan.id)} className="px-4 py-1.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            Confirmar?
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(plan.id)} className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Mensal (R$)</label>
                          <input
                            type="number"
                            className="w-full bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                            defaultValue={plan.price}
                            onBlur={(e) => handleUpdate(plan.id, Number(e.target.value), plan.qr_code_url || '', plan.pix_code || '', plan.service_limits || {})}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviços Inclusos</label>
                          <div className="grid grid-cols-1 gap-2 border border-gray-100 dark:border-white/5 p-3 rounded-2xl bg-gray-50/50 dark:bg-black/10">
                            {(() => {
                              const sorted = [...services].sort((a, b) => {
                                const aChecked = plan.allowed_services?.includes(a.id);
                                const bChecked = plan.allowed_services?.includes(b.id);
                                if (aChecked && !bChecked) return -1;
                                if (!aChecked && bChecked) return 1;
                                return 0;
                              });
                              return sorted.map(s => {
                                const isChecked = plan.allowed_services?.includes(s.id);
                                const currentLimit = plan.service_limits?.[s.id] || 0;
                                return (
                                  <div key={s.id} className="flex items-center justify-between gap-2 group">
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        className="accent-amber-500"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newLimits = { ...(plan.service_limits || {}) };
                                          if (e.target.checked) {
                                            newLimits[s.id] = currentLimit || 1;
                                          } else {
                                            delete newLimits[s.id];
                                          }
                                          handleUpdate(plan.id, plan.price, plan.qr_code_url || '', plan.pix_code || '', newLimits);
                                        }}
                                      />
                                      <span className="text-xs font-medium text-slate-600 dark:text-gray-400 group-hover:text-amber-500 transition-colors">{s.name}</span>
                                    </label>
                                    {isChecked && (
                                      <div className="flex items-center gap-1 bg-white dark:bg-black/40 rounded-lg px-2 py-1 border border-gray-100 dark:border-white/5">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Qtd:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          className="w-16 bg-transparent text-xs font-black text-amber-600 focus:outline-none text-center"
                                          value={localLimits[plan.id]?.[s.id] ?? currentLimit}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setLocalLimits(prev => ({
                                              ...prev,
                                              [plan.id]: { ...(prev[plan.id] || {}), [s.id]: val }
                                            }));
                                          }}
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            const newLimits = { ...(plan.service_limits || {}), [s.id]: val };
                                            handleUpdate(plan.id, plan.price, plan.qr_code_url || '', plan.pix_code || '', newLimits);
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código Pix (Copia e Cola)</label>
                          <textarea
                            className="w-full bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-mono"
                            rows={3}
                            defaultValue={plan.pix_code}
                            onBlur={(e) => handleUpdate(plan.id, plan.price, plan.qr_code_url || '', e.target.value, plan.service_limits || {})}
                            placeholder="Cole aqui o código Pix Copia e Cola..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">QR Code (PIX)</label>
                          <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                            {plan.qr_code_url ? (
                              <img src={plan.qr_code_url} className="size-16 rounded-lg object-cover border border-gray-200 dark:border-white/10 bg-white" alt="QR Preview" />
                            ) : (
                              <div className="size-16 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center border border-gray-200 dark:border-white/10">
                                <span className="material-symbols-outlined text-gray-400">qr_code_2</span>
                              </div>
                            )}
                            <div className="relative flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      handleUpdate(plan.id, plan.price, reader.result as string, plan.pix_code || '', plan.service_limits || {});
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <div className="w-full bg-white dark:bg-black/40 p-3 rounded-lg border border-dashed border-gray-300 dark:border-white/10 text-[10px] font-black text-gray-400 text-center hover:border-amber-500/50 transition-colors uppercase tracking-widest">
                                ADICIONAR QR CODE
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-enter">
            <header className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Plano</h3>
              <button onClick={() => setIsCreating(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Plano</label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                    placeholder="Ex: Plano Diamante"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    value={newPlan.price || ''}
                    onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Serviços Inclusos e Limites</label>
                <div className="grid grid-cols-1 gap-2 border border-gray-100 dark:border-white/5 p-4 rounded-2xl bg-gray-50/50 dark:bg-black/10">
                  {services.map(s => {
                    const isChecked = newPlan.service_limits[s.id] !== undefined;
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            className="size-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = { ...newPlan.service_limits };
                              if (e.target.checked) next[s.id] = 1;
                              else delete next[s.id];
                              setNewPlan({ ...newPlan, service_limits: next });
                            }}
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{s.name}</span>
                        </label>
                        {isChecked && (
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 rounded-xl px-3 py-2 border border-gray-200 dark:border-white/5">
                             <span className="text-[10px] font-black text-gray-400 uppercase">Limite:</span>
                             <input
                               type="number"
                               min="1"
                               className="w-12 bg-transparent text-sm font-black text-amber-600 focus:outline-none text-center"
                               value={newPlan.service_limits[s.id]}
                               onChange={(e) => {
                                 const val = Math.max(1, parseInt(e.target.value) || 1);
                                 setNewPlan({ ...newPlan, service_limits: { ...newPlan.service_limits, [s.id]: val } });
                               }}
                             />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Código Pix</label>
                  <textarea
                    value={newPlan.pix_code}
                    onChange={e => setNewPlan({ ...newPlan, pix_code: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-mono"
                    rows={2}
                    placeholder="Pix Copia e Cola..."
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">QR Code</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPlan({ ...newPlan, qr_code_url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
              </div>
            </main>

            <footer className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-xs tracking-widest transition-colors hover:text-red-500">Cancelar</button>
              <button 
                onClick={handleCreatePlan} 
                className="flex-[2] py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
              >
                Criar Plano
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagePlansScreen;
