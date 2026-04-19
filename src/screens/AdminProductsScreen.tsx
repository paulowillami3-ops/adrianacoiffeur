import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Product } from '../../types';

interface AdminProductsScreenProps {
  onBack: () => void;
}

const AdminProductsScreen: React.FC<AdminProductsScreenProps> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (data) {
      setProducts(data.map((p: any) => ({
        ...p,
        imageUrl: p.image_url,
        isActive: p.is_active
      })));
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('services') // Using same bucket for products
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('services')
        .getPublicUrl(fileName);

      setEditingProduct({ ...editingProduct, imageUrl: publicUrl });
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert('Erro ao carregar imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct.name || editingProduct.price === undefined) {
      alert('Nome e preço são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: editingProduct.price,
        image_url: editingProduct.imageUrl || '',
        stock_quantity: editingProduct.stock_quantity || 0,
        display_order: editingProduct.display_order || 0,
        is_active: true
      };

      const { error } = editingProduct.id 
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
        : await supabase.from('products').insert(payload);
      
      if (error) throw error;

      setIsEditing(false);
      setEditingProduct({});
      await fetchProducts();
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este produto?')) return;
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      await fetchProducts();
    } catch (err: any) {
      alert('Erro ao excluir produto');
    }
  };

  if (isEditing) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors p-6">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center mb-8">
            <button onClick={() => setIsEditing(false)} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-xl font-bold ml-2 text-slate-900 dark:text-white">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="relative group mx-auto size-32 rounded-2xl bg-gray-100 dark:bg-white/5 border-2 border-dashed border-gray-300 dark:border-white/10 overflow-hidden flex items-center justify-center">
              {editingProduct.imageUrl ? (
                <img src={editingProduct.imageUrl} className="w-full h-full object-cover" alt="Produto" />
              ) : (
                <span className="material-symbols-outlined text-gray-400">add_a_photo</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
                  <div className="animate-spin size-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              )}
              <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome</label>
              <input placeholder="Nome do Produto" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Descrição</label>
              <textarea placeholder="Descrição rápida..." value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm h-24 text-slate-900 dark:text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Preço (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" value={editingProduct.price ?? ''} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Estoque</label>
                <input type="number" placeholder="0" value={editingProduct.stock_quantity ?? ''} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) })} className="w-full bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white" />
              </div>
            </div>

            <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md p-4 transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Gerenciar Vitrine</h2>
          <button onClick={() => { setEditingProduct({}); setIsEditing(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto w-full pb-24">
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-2">shopping_bag</span>
            <p>Nenhum produto cadastrado.</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4 group transition-all hover:border-primary/30 shadow-sm">
            <div className="size-16 rounded-xl bg-gray-100 dark:bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
              {p.imageUrl ? (
                <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
              ) : (
                <span className="material-symbols-outlined text-gray-400">image</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
              <p className="text-xs text-gray-500 font-medium">R$ {p.price?.toFixed(2)} • {p.stock_quantity || 0} em estoque</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingProduct(p); setIsEditing(true); }} className="size-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button onClick={() => handleDelete(p.id)} className="size-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default AdminProductsScreen;
