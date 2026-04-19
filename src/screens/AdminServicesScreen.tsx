import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Service, Category } from '../../types';

interface AdminServicesScreenProps {
  onBack: () => void;
  services: Service[];
  categories: Category[];
  onRefresh: () => void;
}

const CATEGORY_ICONS = [
  'content_cut', 'face', 'brush', 'spa', 'self_care', 'palette', 
  'auto_fix_high', 'face_retouching_natural', 'hand_gesture', 
  'health_and_beauty', 'flare', 'diamond', 'water_drop', 'chair',
  'person', 'girl', 'boy', 'magic_button'
];

const AdminServicesScreen: React.FC<AdminServicesScreenProps> = ({ onBack, services, categories: cats, onRefresh }) => {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({});
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);



  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('services')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found')) {
          alert('Erro: O "bucket" de armazenamento "services" não foi encontrado no Supabase. Por favor, crie-o no painel do Supabase com acesso público.');
        } else {
          throw error;
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('services')
        .getPublicUrl(filePath);

      setEditingService({ ...editingService, imageUrl: publicUrl });
    } catch (err: any) {
      console.error('Error uploading:', err);
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveService = async () => {
    console.log('[handleSaveService] iniciando, dados:', editingService);

    if (!editingService.name?.trim()) {
      alert('Por favor, preencha o nome do serviço.');
      return;
    }

    // Aceita: preço fixo OU faixa de preço (min/max)
    const hasPriceRange = editingService.min_price !== undefined && editingService.min_price !== null &&
                          editingService.max_price !== undefined && editingService.max_price !== null;
    const hasFixedPrice = editingService.price !== undefined && editingService.price !== null && !isNaN(Number(editingService.price));

    if (!hasFixedPrice && !hasPriceRange) {
      alert('Por favor, preencha o Preço Fixo OU a Faixa de Preço (Mínimo e Máximo).');
      return;
    }

    if (!editingService.category_id || editingService.category_id === '') {
      alert('Por favor, selecione uma categoria para o serviço.\n\nSem categoria, o serviço não aparecerá para os clientes.');
      return;
    }

    setLoading(true);

    try {
      const finalDuration = parseInt(String(editingService.duration || 30));
      // Se usar só faixa de preço, salva price=0 como fallback
      const finalPrice = hasFixedPrice ? parseFloat(String(editingService.price)) : 0;
      const finalCategoryId = editingService.category_id;

      const payload: any = {
        name: editingService.name.trim(),
        description: editingService.description || '',
        price: isNaN(finalPrice) ? 0 : finalPrice,
        min_price: editingService.min_price ?? null,
        max_price: editingService.max_price ?? null,
        duration: isNaN(finalDuration) ? 30 : finalDuration,
        image_url: editingService.imageUrl || '',
        category_id: finalCategoryId,
        is_active: true
      };

      console.log('[handleSaveService] payload para o banco:', payload);

      let error;
      if (editingService.id) {
        const { error: err } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('services')
          .insert(payload);
        error = err;
      }

      if (error) {
        console.error('[handleSaveService] Erro do Supabase:', error);
        throw error;
      }

      console.log('[handleSaveService] Salvo com sucesso!');
      setIsEditing(false);
      setEditingService({});
      await onRefresh();
    } catch (err: any) {
      console.error('[handleSaveService] Exceção:', err);
      alert('Erro ao salvar serviço: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCat?.name) return;
    setLoading(true);
    
    try {
      const payload = { 
        name: editingCat.name, 
        icon: editingCat.icon, 
        description: editingCat.description,
        display_order: editingCat.display_order || 0 
      };
      
      let error;
      if (editingCat.id) {
        const { error: err } = await supabase.from('service_categories').update(payload).eq('id', editingCat.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('service_categories').insert(payload);
        error = err;
      }
      
      if (error) throw error;
      
      setEditingCat(null); 
      await onRefresh(); 
    } catch (err: any) {
      console.error('Error saving category:', err);
      alert('Erro ao salvar categoria: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm('Excluir categoria? Serviços vinculados ficarão sem categoria.')) return;
    await supabase.from('service_categories').delete().eq('id', id);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este serviço?')) return;
    supabase.from('services').update({ is_active: false }).eq('id', id)
      .then(() => onRefresh());
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const catId = result.source.droppableId;
    if (catId !== result.destination.droppableId) return;

    const catServices = services.filter(s => String(s.category_id) === catId);
    const items = Array.from(catServices).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    for (let i = 0; i < items.length; i++) {
      await supabase.from('services').update({ display_order: i }).eq('id', items[i].id);
    }

    await onRefresh();
  };

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isEditing) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
        <div className="flex flex-col p-6 max-w-md mx-auto w-full">
          <div className="flex items-center mb-8">
            <button onClick={() => setIsEditing(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
            <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome do Serviço</label>
              <input className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Ex: Corte de Cabelo" value={editingService.name || ''} onChange={e => setEditingService({ ...editingService, name: e.target.value })} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Descrição</label>
              <textarea className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 h-24 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Descreva os detalhes do serviço..." value={editingService.description || ''} onChange={e => setEditingService({ ...editingService, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Preço Fixo (Padrão)</label>
                <input type="number" step="0.01" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="0.00" value={editingService.price || ''} onChange={e => setEditingService({ ...editingService, price: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Duração (min)</label>
                <input type="number" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="30" value={editingService.duration ?? ''} onChange={e => setEditingService({ ...editingService, duration: e.target.value === '' ? undefined : parseInt(e.target.value) })} />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">payments</span>
                <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Faixa de Preço (Opcional)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Mínimo (R$)</label>
                  <input type="number" step="0.01" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="0.00" value={editingService.min_price || ''} onChange={e => setEditingService({ ...editingService, min_price: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 px-1">Máximo (R$)</label>
                  <input type="number" step="0.01" className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="0.00" value={editingService.max_price || ''} onChange={e => setEditingService({ ...editingService, max_price: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase text-center">Se preenchido, a faixa terá prioridade sobre o preço fixo na exibição para o cliente com a nota "Valor final após avaliação".</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Foto do Serviço</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input className="w-full bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 truncate pr-10" placeholder="URL ou carregue um arquivo" value={editingService.imageUrl || ''} onChange={e => setEditingService({ ...editingService, imageUrl: e.target.value })} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="material-symbols-outlined text-sm">{editingService.imageUrl ? 'link' : 'image'}</span></div>
                </div>
                <label className="shrink-0 size-12 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-all overflow-hidden relative">
                  {uploading ? <div className="size-5 border-2 border-primary border-t-transparent animate-spin rounded-full"></div> : <><span className="material-symbols-outlined">add_a_photo</span><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></>}
                </label>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1 flex items-center gap-1">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                value={editingService.category_id || ''}
                onChange={e => setEditingService({ ...editingService, category_id: e.target.value })}
                className={`w-full bg-white dark:bg-surface-dark p-3 rounded-lg border text-slate-900 dark:text-white ${
                  !editingService.category_id || editingService.category_id === ''
                    ? 'border-red-300 dark:border-red-500/40 bg-red-50/30 dark:bg-red-500/5'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <option value="">— Selecione uma categoria —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {(!editingService.category_id || editingService.category_id === '') && (
                <p className="text-[9px] text-red-500 font-bold uppercase px-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Obrigatório — sem categoria o serviço ficará invisível
                </p>
              )}
            </div>

            <button onClick={handleSaveService} disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
              {loading ? 'Salvando...' : 'Salvar Serviço'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center p-4">
          <button onClick={onBack} className="size-12 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"><span className="material-symbols-outlined text-2xl">arrow_back</span></button>
          <h2 className="font-bold text-slate-900 dark:text-white ml-2">Gerenciar Serviços</h2>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto w-full pb-24">
        <DragDropContext onDragEnd={onDragEnd}>
          {cats.map(cat => {
            const catServices = services.filter(s => String(s.category_id) === String(cat.id)).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
            const isExpanded = expandedCats.has(cat.id);
            return (
              <div key={cat.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm transition-all mb-4">
                <div className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleCat(cat.id)}>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="material-symbols-outlined text-primary">{cat.icon || 'category'}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{cat.name}</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-gray-500 font-bold">{catServices.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); }} className="size-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                    <span className={`material-symbols-outlined transition-transform duration-300 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                </div>

                {isExpanded && (
                  <Droppable droppableId={String(cat.id)}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="p-2 space-y-2 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
                        {catServices.length === 0 && <p className="text-center py-6 text-[10px] text-gray-400 italic font-bold uppercase">Nenhum serviço nesta categoria</p>}
                        {catServices.map((s, index) => (
                          <Draggable key={s.id} draggableId={String(s.id)} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-200 dark:border-white/5 flex gap-3 items-center shadow-sm">
                                <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 p-1 shrink-0"><span className="material-symbols-outlined text-lg">drag_indicator</span></div>
                                {s.imageUrl ? <img src={s.imageUrl} className="size-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0" /> : <div className="size-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-gray-400">image</span></div>}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">{s.name}</h3>
                                  <p className="text-[10px] text-gray-500 font-medium">
                                    {(s.min_price || s.max_price) 
                                      ? `R$ ${s.min_price?.toFixed(2) || '0.00'} - R$ ${s.max_price?.toFixed(2) || '?'}`
                                      : `R$ ${(s.price || 0).toFixed(2)}`
                                    } • {s.duration} min
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingService(s); setIsEditing(true); }} className="size-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                                  <button onClick={() => handleDelete(s.id)} className="size-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </DragDropContext>

        <button onClick={() => setEditingCat({ name: '', icon: 'category', display_order: cats.length })} className="w-full py-6 mt-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 font-bold hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 bg-white/30 dark:bg-white/5 group">
          <span className="material-symbols-outlined text-lg">add</span> Nova Categoria
        </button>

        {editingCat && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-scale-in">
              <h3 className="text-xl font-black text-slate-900 dark:text-white text-center">{editingCat.id ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <div className="space-y-4">
                <input placeholder="Nome da Categoria" value={editingCat.name || ''} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-4 rounded-2xl border border-gray-200 dark:bg-background-dark dark:border-white/10 dark:text-white outline-none" />
                <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 dark:bg-background-dark rounded-2xl border border-gray-100 dark:border-white/5 max-h-40 overflow-y-auto no-scrollbar">
                  {CATEGORY_ICONS.map(icon => (
                    <button key={icon} onClick={() => setEditingCat({...editingCat, icon})} className={`size-10 rounded-xl flex items-center justify-center transition-all ${editingCat.icon === icon ? 'bg-primary text-white' : 'text-gray-500'}`}><span className="material-symbols-outlined text-lg">{icon}</span></button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingCat(null)} className="flex-1 py-4 font-bold text-gray-500 uppercase text-[10px]">Cancelar</button>
                <button onClick={handleSaveCategory} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-[10px] uppercase">Salvar</button>
              </div>
              {editingCat.id && <button onClick={() => handleDeleteCat(editingCat.id!)} className="w-full text-red-500 text-[10px] font-black uppercase pt-2">Excluir Categoria</button>}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => { setEditingService({}); setIsEditing(true); }} className="size-16 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-transform active:scale-95 shadow-2xl"><span className="material-symbols-outlined text-3xl">add</span></button>
      </div>
    </div>
  );
};

export default AdminServicesScreen;
