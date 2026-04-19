import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface AdminChatListScreenProps {
  onBack: () => void;
  onSelectChat: (clientId: string, clientName: string) => void;
}

const AdminChatListScreen: React.FC<AdminChatListScreenProps> = ({ onBack, onSelectChat }) => {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    const fetchConvos = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, clients!chat_messages_client_id_fkey(name, phone)')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      if (data) {
        const convos: any[] = [];
        const clientIds = new Set();

        data.forEach((msg: any) => {
          if (msg.client_id && !clientIds.has(msg.client_id)) {
            clientIds.add(msg.client_id);
            convos.push({
              id: String(msg.client_id),
              name: msg.clients?.name || 'Unknown',
              phone: msg.clients?.phone || '',
              last_message: msg.sent_at,
            });
          }
        });
        setConversations(convos);
      }
    };

    fetchConvos();
    const interval = setInterval(fetchConvos, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors text-slate-900 dark:text-white">
          <div className="max-w-md mx-auto w-full flex items-center justify-between p-4">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-bold">Conversas</h2>
            <div className="size-10"></div>
          </div>
        </header>
        <main className="max-w-md mx-auto w-full p-4 space-y-2 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">Nenhuma conversa iniciada.</div>
          ) : (conversations.map(c => (
            <button key={c.id} onClick={() => onSelectChat(c.id, c.name)} className="w-full bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex gap-4 items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm">
              <div className="size-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold border border-primary/20">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{c.name}</h3>
                  <span className="text-[10px] text-gray-400">{new Date(c.last_message).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</p>
              </div>
            </button>
          )))}
        </main>
      </div>
    </div>
  );
};

export default AdminChatListScreen;
