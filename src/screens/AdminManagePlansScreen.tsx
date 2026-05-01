import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import { Service, SubscriptionPlan } from '../../types';

const AdminManagePlansScreen: React.FC<{
  onBack: () => void;
  hideHeader?: boolean;
}> = ({ onBack, hideHeader }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<{
    name: string;
    price: number;
    original_price?: number;
    pix_code: string;
    qr_code_url: string;
    description: string;
    discount_percentage: number;
    price_on_evaluation: boolean;
    service_limits: Record<string, number>;
  }>({
    name: '',
    price: 0,
    original_price: undefined,
    pix_code: '',
    qr_code_url: '',
    description: '',
    discount_percentage: 0,
    price_on_evaluation: false,
    service_limits: {}
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const [localLimits, setLocalLimits] = useState<Record<string, Record<string, number>>>({});
  const [localNames, setLocalNames] = useState<Record<string, string>>({});
  const [localPercentages, setLocalPercentages] = useState<Record<string, number>>({});
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [localOriginalPrices, setLocalOriginalPrices] = useState<Record<string, number | undefined>>({});
  const [localPixCodes, setLocalPixCodes] = useState<Record<string, string>>({});
  const [localQrCodes, setLocalQrCodes] = useState<Record<string, string>>({});
  const [localAllowedServices, setLocalAllowedServices] = useState<Record<string, string[]>>({});
  const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({});
  const [localOnEvaluation, setLocalOnEvaluation] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const limits: Record<string, Record<string, number>> = {};
    const names: Record<string, string> = {};
    const percentages: Record<string, number> = {};
    const prices: Record<string, number> = {};
    const oPrices: Record<string, number | undefined> = {};
    const pix: Record<string, string> = {};
    const qr: Record<string, string> = {};
    const allowed: Record<string, string[]> = {};
    const descriptions: Record<string, string> = {};
    const onEvaluation: Record<string, boolean> = {};
    
    plans.forEach(p => {
      limits[p.id] = { ...(p.service_limits || {}) };
      names[p.id] = p.name;
      prices[p.id] = p.price;
      oPrices[p.id] = p.original_price;
      pix[p.id] = p.pix_code || '';
      qr[p.id] = p.qr_code_url || '';
      allowed[p.id] = [...(p.allowed_services || [])];
      descriptions[p.id] = p.description || '';
      onEvaluation[p.id] = !!p.price_on_evaluation;
      
      percentages[p.id] = (p.discount_percentage !== undefined && p.discount_percentage !== null) 
        ? p.discount_percentage 
        : (p.original_price && p.original_price > 0) 
          ? Math.round((1 - p.price / p.original_price) * 100)
          : 0;
    });
    
    setLocalLimits(limits);
    setLocalNames(names);
    setLocalPercentages(percentages);
    setLocalPrices(prices);
    setLocalOriginalPrices(oPrices);
    setLocalPixCodes(pix);
    setLocalQrCodes(qr);
    setLocalAllowedServices(allowed);
    setLocalDescriptions(descriptions);
    setLocalOnEvaluation(onEvaluation);
  }, [plans]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('is_club_only', { ascending: false })
      .order('display_order', { ascending: true });
    if (data) setServices(data.map((s: any) => ({ ...s, id: String(s.id), imageUrl: s.image_url })));
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*, plan_services(service_id, monthly_limit)')
      .order('display_order', { ascending: true });

    if (data) {
      const withServices = data.map((p: any) => {
        const serviceLimits: Record<string, number> = {};
        p.plan_services?.forEach((s: any) => {
          serviceLimits[String(s.service_id)] = s.monthly_limit;
        });
        return {
          ...p,
          id: String(p.id),
          allowed_services: p.plan_services?.map((s: any) => String(s.service_id)) || [],
          service_limits: serviceLimits
        };
      });
      setPlans(withServices);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
    fetchServices();
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlan.name || (!newPlan.price_on_evaluation && newPlan.price <= 0)) {
      alert('Por favor, preencha o nome e um preço válido (ou marque como Sob Avaliação).');
      return;
    }

    const { data: createdPlan, error: planError } = await supabase
      .from('subscription_plans')
      .insert({
        name: newPlan.name,
        description: newPlan.description,
        price: newPlan.price,
        original_price: newPlan.original_price,
        pix_code: newPlan.pix_code,
        qr_code_url: newPlan.qr_code_url,
        price_on_evaluation: newPlan.price_on_evaluation,
        discount_percentage: newPlan.discount_percentage,
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
      setNewPlan({ 
        name: '', 
        price: 0, 
        original_price: undefined, 
        pix_code: '', 
        qr_code_url: '', 
        description: '', 
        description: '', 
        discount_percentage: 0, 
        price_on_evaluation: false, 
        service_limits: {} 
      });
      fetchPlans();
    }
  };

  const handleUpdate = async (id: string, price: number, original_price: number | undefined, qr_code_url: string, pix_code: string, service_limits: Record<string, number>, price_on_evaluation: boolean) => {
    const current = plans.find(p => p.id === id);
    const servicesList = Object.keys(service_limits).sort();
    const currentServicesList = (current?.allowed_services || []).sort();

    const planChanged = !current || 
      Number(current.price) !== price || 
      current.original_price !== original_price || 
      (current.qr_code_url || '') !== qr_code_url || 
      (current.pix_code || '') !== pix_code ||
      (current.description || '') !== localDescriptions[id] ||
      current.name !== localNames[id] ||
      !!current.price_on_evaluation !== price_on_evaluation ||
      current.discount_percentage !== localPercentages[id];
      
    const servicesChanged = JSON.stringify(currentServicesList) !== JSON.stringify(servicesList) ||
      JSON.stringify(current?.service_limits || {}) !== JSON.stringify(service_limits);

    if (!planChanged && !servicesChanged) {
      return;
    }

    setSavingId(id);
    try {
      if (planChanged) {
        const { error: planError } = await supabase
          .from('subscription_plans')
          .update({ 
            price, 
            original_price: original_price ?? null, 
            qr_code_url, 
            pix_code,
            description: localDescriptions[id],
            name: localNames[id],
            price_on_evaluation,
            discount_percentage: localPercentages[id]
          })
          .eq('id', id);
        
        if (planError) {
          alert('Erro ao atualizar plano: ' + planError.message);
          setSavingId(null);
          return;
        }
      }

      if (servicesChanged) {
        const planIdInt = parseInt(id);
        const { error: delError } = await supabase
          .from('plan_services')
          .delete()
          .eq('plan_id', planIdInt);
          
        if (delError) {
          console.error('Delete error:', delError);
        }
        
        if (servicesList.length > 0) {
          const { error: insError } = await supabase.from('plan_services').insert(
            servicesList.map(sId => ({
              plan_id: planIdInt,
              service_id: parseInt(sId),
              monthly_limit: service_limits[sId] || 0
            }))
          );
          if (insError) {
            console.error('Insert error:', insError);
          }
        }
      }
      
      await fetchPlans();
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setSavingId(null);
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

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(plans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const updatedItems = items.map((item: any, index: number) => ({
      ...item,
      display_order: index
    }));
    
    setPlans(updatedItems);

    try {
      await Promise.all(updatedItems.map((item) => 
        supabase.from('subscription_plans')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      ));
    } catch (err) {
      console.error('Error reordering plans:', err);
      fetchPlans(); // revert on error
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
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="plans-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                      {plans.map((plan, index) => (
                        <Draggable key={plan.id} draggableId={plan.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.9 : 1,
                                transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none'
                              }}
                            >
                              <div className={`bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border-2 ${snapshot.isDragging ? 'border-amber-500 shadow-2xl scale-[1.02]' : 'border-gray-200 dark:border-white/10 shadow-sm'} transition-all duration-200 space-y-6 relative overflow-hidden`}>
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab hover:text-amber-500 text-gray-300 dark:text-gray-600 transition-colors">
                                      <span className="material-symbols-outlined">drag_indicator</span>
                                    </div>
                                    <div className="size-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                                      <span className="material-symbols-outlined">card_membership</span>
                                    </div>
                                      <input
                                        type="text"
                                        className="bg-transparent font-black text-slate-900 dark:text-white uppercase tracking-tight flex-1 min-w-[500px] focus:outline-none focus:border-b-2 focus:border-amber-500 border-b-2 border-transparent"
                                        value={localNames[plan.id] || ''}
                                        onChange={(e) => setLocalNames(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                      />
                                  </div>
                                  
                                  {confirmDeleteId === plan.id ? (
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancelar</button>
                                      <button onClick={() => handleDeletePlan(plan.id)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">warning</span>
                                        Excluir
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmDeleteId(plan.id)} className="size-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all">
                                      <span className="material-symbols-outlined">delete</span>
                                    </button>
                                  )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor De (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold line-through text-gray-400 focus:border-amber-500/50 transition-colors disabled:opacity-50"
                                          value={localOriginalPrices[plan.id] ?? ''}
                                          onChange={(e) => {
                                            const orig = e.target.value ? Number(e.target.value) : undefined;
                                            setLocalOriginalPrices(prev => ({ ...prev, [plan.id]: orig }));
                                            const pct = localPercentages[plan.id];
                                            if (orig && orig > 0 && pct !== undefined) {
                                              const newPrice = Number((orig * (1 - pct / 100)).toFixed(2));
                                              setLocalPrices(prev => ({ ...prev, [plan.id]: newPrice }));
                                            }
                                          }}
                                          placeholder="0.00"
                                          disabled={localOnEvaluation[plan.id]}
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor Por (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-amber-500 focus:border-amber-500 transition-colors disabled:opacity-50"
                                          value={localPrices[plan.id] ?? ''}
                                          onChange={(e) => {
                                            const newPrice = Number(e.target.value);
                                            setLocalPrices(prev => ({ ...prev, [plan.id]: newPrice }));
                                            const orig = localOriginalPrices[plan.id];
                                            if (orig && orig > 0) {
                                              setLocalPercentages(prev => ({ ...prev, [plan.id]: Math.round((1 - newPrice / orig) * 100) }));
                                            }
                                          }}
                                          placeholder="0.00"
                                          disabled={localOnEvaluation[plan.id]}
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Desconto (%)</label>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-green-500 focus:border-green-500 transition-colors"
                                            value={localPercentages[plan.id] ?? ''}
                                            onChange={(e) => {
                                              const pct = Number(e.target.value);
                                              setLocalPercentages(prev => ({ ...prev, [plan.id]: pct }));
                                              const orig = localOriginalPrices[plan.id];
                                              if (orig && orig > 0) {
                                                const newPrice = Number((orig * (1 - pct / 100)).toFixed(2));
                                                setLocalPrices(prev => ({ ...prev, [plan.id]: newPrice }));
                                              }
                                            }}
                                            placeholder="0"
                                          />
                                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                      <input
                                        type="checkbox"
                                        id={`eval-${plan.id}`}
                                        checked={localOnEvaluation[plan.id] || false}
                                        onChange={(e) => setLocalOnEvaluation(prev => ({ ...prev, [plan.id]: e.target.checked }))}
                                        className="size-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                      />
                                      <label htmlFor={`eval-${plan.id}`} className="text-xs font-bold text-slate-600 dark:text-gray-400 cursor-pointer">
                                        Preço sob avaliação técnica
                                      </label>
                                    </div>

                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tópicos de Descrição (Um por linha)</label>
                                      <textarea
                                        className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium focus:border-amber-500 transition-colors min-h-[100px] resize-none"
                                        value={localDescriptions[plan.id] || ''}
                                        onChange={(e) => setLocalDescriptions(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                        placeholder="Ex: 6 sessões de design&#10;Epilação de buço"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <button 
                                        onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 hover:border-amber-500 transition-colors"
                                      >
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                          Serviços e Quantidades ({localAllowedServices[plan.id]?.length || 0})
                                        </span>
                                        <span className="material-symbols-outlined text-gray-400 transition-transform duration-300" style={{ transform: expandedPlanId === plan.id ? 'rotate(180deg)' : 'none' }}>
                                          expand_more
                                        </span>
                                      </button>
                                      
                                      {expandedPlanId === plan.id && (
                                        <div className="grid grid-cols-1 gap-2 border border-gray-100 dark:border-white/5 p-4 rounded-2xl bg-gray-50/50 dark:bg-black/10 mt-2 animate-enter">
                                          {services.map(s => {
                                            const isChecked = localAllowedServices[plan.id]?.includes(s.id);
                                            const currentLimit = localLimits[plan.id]?.[s.id] || 0;
                                            return (
                                              <div key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                  <input
                                                    type="checkbox"
                                                    className="size-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      const nextAllowed = [...(localAllowedServices[plan.id] || [])];
                                                      const nextLimits = { ...(localLimits[plan.id] || {}) };
                                                      if (e.target.checked) {
                                                        nextAllowed.push(s.id);
                                                        nextLimits[s.id] = nextLimits[s.id] || 1;
                                                      } else {
                                                        const idx = nextAllowed.indexOf(s.id);
                                                        if (idx > -1) nextAllowed.splice(idx, 1);
                                                        delete nextLimits[s.id];
                                                      }
                                                      setLocalAllowedServices(prev => ({ ...prev, [plan.id]: nextAllowed }));
                                                      setLocalLimits(prev => ({ ...prev, [plan.id]: nextLimits }));
                                                    }}
                                                  />
                                                  <span className="text-sm font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                                                     {s.name}
                                                     {s.is_club_only && (
                                                       <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-200 dark:border-amber-500/30">
                                                         Exclusivo Club
                                                       </span>
                                                     )}
                                                   </span>
                                                </label>
                                                {isChecked && (
                                                  <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-xl px-3 py-1.5 border border-gray-100 dark:border-white/5 shadow-sm">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase">Qtd:</span>
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      className="w-20 bg-transparent text-sm font-black text-amber-600 focus:outline-none text-center"
                                                      value={localLimits[plan.id]?.[s.id] ?? 1}
                                                      onChange={(e) => {
                                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                                        setLocalLimits(prev => ({
                                                          ...prev,
                                                          [plan.id]: { ...(prev[plan.id] || {}), [s.id]: val }
                                                        }));
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-6">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Código Pix (Copia e Cola)</label>
                                      <textarea
                                        className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-mono focus:border-amber-500 transition-colors"
                                        rows={3}
                                        value={localPixCodes[plan.id] || ''}
                                        onChange={(e) => setLocalPixCodes(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                        placeholder="Cole aqui o código Pix..."
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">QR Code (PIX)</label>
                                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                                        <div className="size-20 rounded-2xl bg-white dark:bg-black/40 flex items-center justify-center border border-gray-200 dark:border-white/10 overflow-hidden shadow-inner">
                                          {localQrCodes[plan.id] ? (
                                            <img src={localQrCodes[plan.id]} className="w-full h-full object-cover" alt="QR" />
                                          ) : (
                                            <span className="material-symbols-outlined text-gray-300 text-3xl">qr_code_2</span>
                                          )}
                                        </div>
                                        <div className="flex-1 relative">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setLocalQrCodes(prev => ({ ...prev, [plan.id]: reader.result as string }));
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />
                                          <button className="w-full bg-white dark:bg-black/40 p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-[10px] font-black text-gray-400 hover:text-amber-500 hover:border-amber-500 transition-all uppercase tracking-widest">
                                            ALTERAR QR CODE
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                  <button
                                    onClick={() => handleUpdate(
                                      plan.id,
                                      localPrices[plan.id],
                                      localOriginalPrices[plan.id],
                                      localQrCodes[plan.id],
                                      localPixCodes[plan.id],
                                      localLimits[plan.id],
                                      localOnEvaluation[plan.id] || false
                                    )}
                                    disabled={savingId === plan.id}
                                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                                      savingId === plan.id 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-amber-500 text-white shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                                  >
                                    {savingId === plan.id ? (
                                      <>
                                        <div className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        Salvando...
                                      </>
                                    ) : (
                                      <>
                                        <span className="material-symbols-outlined text-sm">save</span>
                                        Salvar Alterações
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor De (R$)</label>
                    <input
                      type="number"
                      value={newPlan.original_price || ''}
                      onChange={e => {
                        const orig = e.target.value ? Number(e.target.value) : undefined;
                        const pct = newPlan.discount_pct;
                        let newPrice = newPlan.price;
                        if (orig && orig > 0 && pct > 0) {
                          newPrice = Number((orig * (1 - pct / 100)).toFixed(2));
                        }
                        setNewPlan({ ...newPlan, original_price: orig, price: newPrice });
                      }}
                      className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-400 line-through"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor Por (R$)</label>
                    <input
                      type="number"
                      value={newPlan.price || ''}
                      onChange={e => {
                        const newPrice = Number(e.target.value);
                        const orig = newPlan.original_price;
                        let pct = newPlan.discount_pct;
                        if (orig && orig > 0) {
                          pct = Math.round((1 - newPrice / orig) * 100);
                        }
                        setNewPlan({ ...newPlan, price: newPrice, discount_pct: pct });
                      }}
                      className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-amber-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Desconto (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newPlan.discount_percentage || ''}
                      onChange={e => {
                        const pct = Number(e.target.value);
                        const orig = newPlan.original_price;
                        let newPrice = newPlan.price;
                        if (orig && orig > 0) {
                          newPrice = Number((orig * (1 - pct / 100)).toFixed(2));
                        }
                        setNewPlan({ ...newPlan, discount_percentage: pct, price: newPrice });
                      }}
                      className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-green-500"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="new-eval"
                    checked={newPlan.price_on_evaluation}
                    onChange={(e) => setNewPlan({ ...newPlan, price_on_evaluation: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="new-eval" className="text-xs font-bold text-slate-600 dark:text-gray-400 cursor-pointer">
                    Sob Avaliação Técnica
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tópicos de Descrição (Um por linha)</label>
                <textarea
                  value={newPlan.description}
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-medium min-h-[100px] resize-none focus:border-amber-500 transition-colors"
                  placeholder="Ex: 6 sessões de design&#10;Epilação de buço"
                />
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
                          <span className="text-sm font-bold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                            {s.name}
                            {s.is_club_only && (
                              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-200 dark:border-amber-500/30">
                                Exclusivo Club
                              </span>
                            )}
                          </span>
                        </label>
                        {isChecked && (
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 rounded-xl px-3 py-2 border border-gray-200 dark:border-white/5">
                             <span className="text-[10px] font-black text-gray-400 uppercase">Limite:</span>
                             <input
                               type="number"
                               min="1"
                               className="w-20 bg-transparent text-sm font-black text-amber-600 focus:outline-none text-center"
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
