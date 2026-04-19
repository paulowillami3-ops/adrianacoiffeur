import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Professional, Category } from '../../types';

interface AdminProfessionalsScreenProps {
  onBack: () => void;
  categories?: Category[];
  professionals: Professional[];
  onRefresh: () => void;
}

const SUPABASE_URL = 'https://lthbvoauhaqjlcmkybud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aGJ2b2F1aGFxamxjbWt5YnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg1MDIsImV4cCI6MjA5MDAzNDUwMn0.BCOQF_lnGJYE-HGqhMKPDsb53GKJX0c9iBhABjhGU20';

async function callAdminAuthFunction(action: string, payload: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

const AdminProfessionalsScreen: React.FC<AdminProfessionalsScreenProps> = ({ onBack, categories = [], professionals: profs, onRefresh }) => {
  const [editing, setEditing] = useState<Partial<Professional> | null>(null);
  const [loading, setLoading] = useState(false);
  // Credential management
  const [credSection, setCredSection] = useState<'none' | 'create' | 'change-password'>('none');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);
  const [credMessage, setCredMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openEditing = (p: Partial<Professional>) => {
    setEditing(p);
    setCredSection('none');
    setNewEmail(p.email || '');
    setNewPassword('');
    setCredMessage(null);
  };

  const handleSave = async () => {
    if (!editing?.name) return alert('Nome é obrigatório');
    setLoading(true);

    try {
      const payload = {
        name: editing.name,
        role: editing.role || '',
        bio: editing.bio || '',
        image_url: editing.imageUrl || '',
        color: editing.color || '#7c3aed',
        is_active: editing.isActive !== false
      };

      let proId = editing.id;
      let error;

      if (editing.id) {
        const { error: err } = await supabase.from('professionals').update(payload).eq('id', editing.id);
        error = err;
      } else {
        const { data, error: err } = await supabase.from('professionals').insert(payload).select().single();
        if (data) proId = data.id;
        error = err;
      }

      if (error) throw error;

      if (proId) {
        await supabase.from('category_professionals').delete().eq('professional_id', proId);
        if (editing.categories && editing.categories.length > 0) {
          const inserts = editing.categories.map(cid => ({
            category_id: parseInt(cid),
            professional_id: proId
          }));
          const { error: relError } = await supabase.from('category_professionals').insert(inserts);
          if (relError) throw relError;
        }
      }

      setEditing(null);
      await onRefresh();
    } catch (err: any) {
      console.error('Error saving professional:', err);
      alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredentials = async () => {
    if (!editing?.id) return;
    if (!newEmail.trim() || !newPassword.trim()) {
      setCredMessage({ type: 'error', text: 'Preencha o email e a senha.' });
      return;
    }
    if (newPassword.length < 6) {
      setCredMessage({ type: 'error', text: 'A senha deve ter ao menos 6 caracteres.' });
      return;
    }
    setCredLoading(true);
    setCredMessage(null);
    try {
      const result = await callAdminAuthFunction('create', {
        email: newEmail.trim(),
        password: newPassword,
        professional_id: editing.id,
      });
      if (result.error) {
        setCredMessage({ type: 'error', text: result.error });
      } else {
        setCredMessage({ type: 'success', text: 'Acesso criado com sucesso!' });
        setCredSection('none');
        setNewPassword('');
        await onRefresh();
        // Update local editing state
        setEditing(prev => prev ? { ...prev, authUserId: result.user_id, email: newEmail.trim() } : prev);
      }
    } catch (err: any) {
      setCredMessage({ type: 'error', text: err.message || 'Erro ao criar acesso.' });
    } finally {
      setCredLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!editing?.authUserId) return;
    if (!newPassword.trim()) {
      setCredMessage({ type: 'error', text: 'Preencha a nova senha.' });
      return;
    }
    if (newPassword.length < 6) {
      setCredMessage({ type: 'error', text: 'A senha deve ter ao menos 6 caracteres.' });
      return;
    }
    setCredLoading(true);
    setCredMessage(null);
    try {
      const result = await callAdminAuthFunction('update-password', {
        auth_user_id: editing.authUserId,
        new_password: newPassword,
      });
      if (result.error) {
        setCredMessage({ type: 'error', text: result.error });
      } else {
        setCredMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setCredSection('none');
        setNewPassword('');
      }
    } catch (err: any) {
      setCredMessage({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setCredLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!editing?.authUserId || !editing?.id) return;
    if (!window.confirm(`Remover o acesso ao painel de ${editing.name}? Esta ação não pode ser desfeita.`)) return;
    setCredLoading(true);
    setCredMessage(null);
    try {
      const result = await callAdminAuthFunction('delete-user', {
        auth_user_id: editing.authUserId,
        professional_id: editing.id,
      });
      if (result.error) {
        setCredMessage({ type: 'error', text: result.error });
      } else {
        setCredMessage({ type: 'success', text: 'Acesso revogado com sucesso.' });
        setCredSection('none');
        setNewPassword('');
        await onRefresh();
        setEditing(prev => prev ? { ...prev, authUserId: undefined, email: undefined } : prev);
      }
    } catch (err: any) {
      setCredMessage({ type: 'error', text: err.message || 'Erro ao revogar acesso.' });
    } finally {
      setCredLoading(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('professionals').update({ is_active: !current }).eq('id', id);
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${name}? Todos os agendamentos e horários vinculados serão afetados.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('professionals').delete().eq('id', id);
      if (error) throw error;
      await onRefresh();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors">
      <header className="sticky top-0 z-50 p-4 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 flex items-center justify-between backdrop-blur-md transition-colors">
        <button onClick={onBack} className="size-12 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="font-bold text-slate-900 dark:text-white">Equipe</h2>
        <button onClick={() => openEditing({ isActive: true, color: '#7c3aed', categories: [] })} className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {profs.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-2">group</span>
            <p>Nenhum profissional cadastrado.</p>
          </div>
        )}
        {profs.map(p => (
          <div key={p.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4 group transition-all hover:border-primary/30">
            <div className="size-16 rounded-full bg-gray-100 dark:bg-white/5 shrink-0 flex items-center justify-center border-2" style={{ borderColor: p.color }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" alt={p.name} />
              ) : (
                <span className="material-symbols-outlined text-3xl text-gray-400">person</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
                {p.authUserId && (
                  <span title={`Acesso: ${p.email}`} className="flex items-center gap-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <span className="material-symbols-outlined text-xs">key</span> Acesso
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.role}</p>
              {p.email && <p className="text-[10px] text-gray-400 truncate">{p.email}</p>}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleActive(p.id, p.isActive!)} className={`size-10 rounded-xl flex items-center justify-center transition-colors ${p.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                <span className="material-symbols-outlined text-xl">{p.isActive ? 'check_circle' : 'do_not_disturb_on'}</span>
              </button>
              <button onClick={() => openEditing(p)} className="size-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button onClick={() => handleDelete(p.id, p.name)} className="size-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </main>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-up border border-gray-100 dark:border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">{editing.id ? 'Editar Profissional' : 'Novo Profissional'}</h3>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome</label>
                <input value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl border-transparent focus:ring-primary focus:bg-white transition-all text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Cargo/Especialidade</label>
                <input value={editing.role || ''} onChange={e => setEditing({...editing, role: e.target.value})} className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl border-transparent focus:ring-primary focus:bg-white transition-all text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Cor no Calendário</label>
                <div className="flex gap-2 flex-wrap">
                  {['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#000000'].map(c => (
                    <button key={c} onClick={() => setEditing({...editing, color: c})} className={`size-8 rounded-full transition-transform ${editing.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary dark:ring-offset-surface-dark' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Categorias de Atendimento</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categories.map(c => (
                    <label key={c.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${editing.categories?.includes(String(c.id)) ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 dark:bg-black/20 dark:text-gray-400 dark:hover:bg-white/5'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={editing.categories?.includes(String(c.id))}
                        onChange={(e) => {
                          const cats = editing.categories || [];
                          if (e.target.checked) setEditing({...editing, categories: [...cats, String(c.id)]});
                          else setEditing({...editing, categories: cats.filter(id => id !== String(c.id))});
                        }}
                      />
                      <span className="material-symbols-outlined text-sm">{c.icon || 'category'}</span>
                      <span className="text-xs font-bold truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Credential Management (only for existing professionals) ── */}
              {editing.id && (
                <div className="border-t border-gray-100 dark:border-white/10 pt-4 mt-2 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-lg">lock</span>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Acesso ao Painel Admin</span>
                  </div>

                  {editing.authUserId ? (
                    /* Already has access */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                        <span className="material-symbols-outlined text-emerald-600 text-lg">verified_user</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Acesso configurado</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-300 truncate">{editing.email}</p>
                        </div>
                      </div>

                      {credSection !== 'change-password' ? (
                        <div className="flex gap-2">
                          <button onClick={() => { setCredSection('change-password'); setCredMessage(null); setNewPassword(''); }} className="flex-1 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black rounded-xl flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-sm">password</span> Trocar Senha
                          </button>
                          <button onClick={handleRevokeAccess} disabled={credLoading} className="flex-1 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-black rounded-xl flex items-center justify-center gap-1 disabled:opacity-50">
                            <span className="material-symbols-outlined text-sm">no_accounts</span> Revogar Acesso
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl text-sm text-slate-900 dark:text-white border border-gray-200 dark:border-white/10"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => { setCredSection('none'); setNewPassword(''); setCredMessage(null); }} className="flex-1 py-2.5 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">Cancelar</button>
                            <button onClick={handleChangePassword} disabled={credLoading} className="flex-1 py-2.5 bg-primary text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">
                              {credLoading ? 'Salvando...' : 'Salvar Senha'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No access yet */
                    credSection !== 'create' ? (
                      <button onClick={() => { setCredSection('create'); setCredMessage(null); setNewEmail(''); setNewPassword(''); }} className="w-full py-3 border-2 border-dashed border-primary/30 text-primary text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                        <span className="material-symbols-outlined text-sm">add_circle</span> Criar Acesso ao Painel
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="Email de login"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl text-sm text-slate-900 dark:text-white border border-gray-200 dark:border-white/10"
                        />
                        <input
                          type="password"
                          placeholder="Senha (mín. 6 caracteres)"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-background-dark p-3 rounded-xl text-sm text-slate-900 dark:text-white border border-gray-200 dark:border-white/10"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setCredSection('none'); setCredMessage(null); }} className="flex-1 py-2.5 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">Cancelar</button>
                          <button onClick={handleCreateCredentials} disabled={credLoading} className="flex-1 py-2.5 bg-primary text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">
                            {credLoading ? 'Criando...' : 'Criar Acesso'}
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {credMessage && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${credMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      <span className="material-symbols-outlined text-sm">{credMessage.type === 'success' ? 'check_circle' : 'error'}</span>
                      {credMessage.text}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={() => setEditing(null)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfessionalsScreen;
