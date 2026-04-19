import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminClientsScreenProps {
  onBack: () => void;
  onChat: (id: string, name: string) => void;
}

const AdminClientsScreen: React.FC<AdminClientsScreenProps> = ({ onBack, onChat }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [modalTab, setModalTab] = useState<'PERFIL' | 'HISTORICO'>('PERFIL');
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (editingClient && modalTab === 'HISTORICO') {
      setIsLoadingHistory(true);
      supabase
        .from('appointments')
        .select(`*, appointment_services(services(name))`)
        .eq('client_id', editingClient.id)
        .order('appointment_date', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setClientHistory(data);
          setIsLoadingHistory(false);
        });
    }
  }, [editingClient, modalTab]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, subscriptions:user_subscriptions(plan:subscription_plans(name), status)')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching clients:', error);
    else if (data) {
      const processed = data.map(c => ({
        ...c,
        active_plan: (c.subscriptions as any[])?.find(s => s.status === 'APPROVED')?.plan?.name
      }));
      setClients(processed);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${name}? Isso apagará também o histórico de agendamentos e conversas.`)) {
      await supabase.from('chat_messages').delete().eq('client_id', id);
      await supabase.from('appointments').delete().eq('client_id', id);
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) alert('Erro ao excluir: ' + error.message);
      else fetchClients();
    }
  };

  const handleUpdate = async () => {
    if (!editingClient) return;
    const normalizedPhone = editingClient.phone.replace(/\D/g, '');

    const { data: duplicateClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', normalizedPhone)
      .neq('id', editingClient.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for duplicate client:', checkError);
    }

    if (duplicateClient) {
      alert('Este telefone já está cadastrado para outro cliente.');
      return;
    }

    const { error } = await supabase.from('clients').update({
      name: editingClient.name,
      phone: normalizedPhone,
      birth_date: editingClient.birth_date || null,
      birthday: editingClient.birthday || null,
      notes: editingClient.notes || null,
      instagram: editingClient.instagram || null
    })
      .eq('id', editingClient.id);

    if (error) alert('Erro ao atualizar: ' + error.message);
    else {
      setEditingClient(null);
      fetchClients();
    }
  };

  const currentMonth = new Date().getMonth() + 1;

  const filtered = clients.filter(c => {
    const searchLower = search.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(searchLower);
    const searchDigits = search.replace(/\D/g, '');
    const phoneMatch = searchDigits ? c.phone.includes(searchDigits) : false;
    
    let birthdayMatch = true;
    if (showBirthdaysOnly) {
      if (!c.birth_date && !c.birthday) return false;
      const dateToParse = c.birthday || c.birth_date;
      const bMonth = parseISO(dateToParse).getMonth() + 1;
      birthdayMatch = (bMonth === currentMonth);
    }
    
    return (nameMatch || phoneMatch) && birthdayMatch;
  });

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen flex flex-col transition-colors relative">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-bold transition-colors">
            <span className="material-symbols-outlined font-black">arrow_back</span>
          </button>
          <h2 className="font-bold text-slate-900 dark:text-white">Clientes Cadastrados</h2>
          <div className="bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
            {clients.length}
          </div>
        </div>
      </header>
      <div className="p-4 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-white/5 sticky top-[73px] z-40 flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-gray-100 dark:bg-surface-dark pl-9 pr-3 py-3 rounded-lg border-transparent text-sm text-slate-900 dark:text-white outline-none"
          />
        </div>
        <button 
          onClick={() => setShowBirthdaysOnly(!showBirthdaysOnly)}
          className={`px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border ${showBirthdaysOnly ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-white/5 text-gray-500'}`}
        >
          <span className="material-symbols-outlined text-sm">{showBirthdaysOnly ? 'cake' : 'event'}</span>
          {showBirthdaysOnly ? 'Aniversariantes' : 'Todos'}
        </button>
      </div>
      <main className="p-4 space-y-2 flex-1 pb-24 max-w-md mx-auto w-full">
        {filtered.map(c => (
          <div key={c.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 flex flex-col gap-4 transition-colors">
            <div 
              className="flex items-center gap-4 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity"
              onClick={() => { setEditingClient(c); setModalTab('HISTORICO'); }}
            >
              <div className="size-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 font-bold uppercase relative">
                {c.name?.charAt(0) || '?'}
                {c.active_plan && (
                  <div className="absolute -top-1 -right-1 size-5 bg-primary-dark rounded-full flex items-center justify-center text-white border-2 border-white dark:border-surface-dark shadow-sm">
                    <span className="material-symbols-outlined text-[10px] font-black">workspace_premium</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</p>
                  {c.active_plan && (
                    <span className="text-[9px] font-black bg-primary/10 text-primary-dark px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                      {c.active_plan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {(c.birth_date || c.birthday) && (
                     <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold flex items-center gap-1">
                       <span className="material-symbols-outlined text-[12px]">cake</span>
                       {format(parseISO(c.birthday || c.birth_date), 'dd/MM/yyyy')}
                     </p>
                  )}
                  {c.instagram && (
                     <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold flex items-center gap-1 truncate max-w-[100px]">
                       <span className="material-symbols-outlined text-[12px]">alternate_email</span>
                       {c.instagram.replace('@', '')}
                     </p>
                  )}
                </div>
                {c.notes && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-1 border-l-2 border-gray-200 dark:border-white/10 pl-1.5 italic">
                    {c.notes}
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400">
                #{c.id.toString().substring(0,6)}
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
              <button onClick={() => onChat(String(c.id), c.name)} className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[16px]">chat</span> Chat
              </button>
              <button onClick={() => { setEditingClient(c); setModalTab('PERFIL'); }} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 text-xs font-bold flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[16px]">edit</span> Editar
              </button>
              <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Detalhes do Cliente</h3>
              <button onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-background-dark rounded-xl shrink-0">
              <button 
                onClick={() => setModalTab('PERFIL')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${modalTab === 'PERFIL' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                Perfil
              </button>
              <button 
                onClick={() => setModalTab('HISTORICO')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${modalTab === 'HISTORICO' ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                Histórico
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
              {modalTab === 'PERFIL' ? (
                <div className="space-y-4 pb-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nome do Cliente</label>
                    <input
                      value={editingClient.name}
                      onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-background-dark p-4 rounded-xl text-slate-900 dark:text-white outline-none border border-gray-200/50 dark:border-white/5 focus:border-primary/50"
                      placeholder="Nome"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Telefone</label>
                    <input
                      value={editingClient.phone}
                      onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-background-dark p-4 rounded-xl text-slate-900 dark:text-white outline-none border border-gray-200/50 dark:border-white/5 focus:border-primary/50"
                      placeholder="Telefone"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Instagram</label>
                    <input
                      value={editingClient.instagram || ''}
                      onChange={e => setEditingClient({ ...editingClient, instagram: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-background-dark p-4 rounded-xl text-slate-900 dark:text-white outline-none border border-gray-200/50 dark:border-white/5 focus:border-primary/50"
                      placeholder="Instagram (@usuario)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={editingClient.birthday || editingClient.birth_date || ''}
                      onChange={e => setEditingClient({ ...editingClient, birthday: e.target.value, birth_date: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-background-dark p-4 rounded-xl text-slate-900 dark:text-white text-sm outline-none border border-gray-200/50 dark:border-white/5 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Observações</label>
                    <textarea
                      value={editingClient.notes || ''}
                      onChange={e => setEditingClient({ ...editingClient, notes: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-background-dark p-4 rounded-xl text-slate-900 dark:text-white h-24 resize-none outline-none border border-gray-200/50 dark:border-white/5 focus:border-primary/50"
                      placeholder="Anotações gerais, alergias..."
                    />
                  </div>
                  <div className="pt-2">
                    <button onClick={handleUpdate} className="w-full h-14 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                      Salvar Perfil
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {isLoadingHistory ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Carregando histórico...</div>
                  ) : clientHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhum agendamento encontrado.</div>
                  ) : (
                    clientHistory.map(app => (
                      <div key={app.id} className="bg-gray-50 dark:bg-background-dark p-4 rounded-2xl border border-gray-200/50 dark:border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {format(parseISO(app.appointment_date), 'dd/MM/yyyy')} às {app.appointment_time?.slice(0,5)}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${app.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : app.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                          {app.appointment_services?.map((as:any) => as.services?.name).join(', ')}
                        </div>
                        <div className="text-sm font-black text-primary mt-2 text-right">
                          {app.total_price ? `R$ ${app.total_price.toFixed(2)}` : '--'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientsScreen;
