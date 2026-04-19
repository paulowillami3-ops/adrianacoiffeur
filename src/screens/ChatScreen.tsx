import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';

interface ChatScreenProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRegister: (identity: { name: string, phone: string }) => void;
  onBack: () => void;
  currentUserRole: 'CUSTOMER' | 'BARBER';
  customerIdentity?: { name: string; phone: string };
  chatClientId?: string; // For Admin
}

const ChatScreen: React.FC<ChatScreenProps> = ({ 
  messages, 
  onSendMessage, 
  onRegister, 
  onBack, 
  currentUserRole, 
  customerIdentity, 
  chatClientId 
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Local state for identifying customer if not provided
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  // Determine if we need identity. 
  // If Customer role and no identity provided via props, show form.
  const needsIdentity = currentUserRole === 'CUSTOMER' && !customerIdentity?.phone;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, needsIdentity]);

  const handleStartChat = () => {
    if (!tempName || !tempPhone) {
      alert("Por favor, informe seu nome e telefone para iniciar o chat.");
      return;
    }
    onRegister({ name: tempName, phone: tempPhone });
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const otherPersonName = currentUserRole === 'CUSTOMER' ? 'Adriana Henrique' : (customerIdentity?.name || 'Cliente');
  const otherPersonRole = currentUserRole === 'CUSTOMER' ? 'Atendimento' : 'Cliente';

  if (needsIdentity) {
    return (
      <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
        <div className="flex flex-col p-6 max-w-md mx-auto w-full justify-center min-h-screen relative">
          <button onClick={onBack} className="absolute top-6 left-6 size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"><span className="material-symbols-outlined">arrow_back</span></button>
          <div className="text-center mb-8">
            <div className="size-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20"><span className="material-symbols-outlined text-4xl filled">chat</span></div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quase lá!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Para falar com a Adriana, precisamos saber quem é você.</p>
          </div>
          <div className="space-y-4">
            <input value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Seu Nome" />
            <input value={tempPhone} onChange={e => setTempPhone(e.target.value)} className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-gray-400" placeholder="Seu Telefone (WhatsApp)" />
            <button onClick={handleStartChat} className="w-full bg-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 text-white">Iniciar Chat</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col h-screen relative">
        <header className="p-4 border-b border-gray-200 dark:border-white/5 bg-white/95 dark:bg-background-dark/95 flex items-center gap-3 transition-colors">
          <div className="max-w-md mx-auto w-full flex items-center gap-3">
            <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="size-10 rounded-full bg-gray-200 dark:bg-surface-dark border border-gray-200 dark:border-white/5 flex items-center justify-center overflow-hidden">
              <img src={currentUserRole === 'CUSTOMER' ? "/adriana.png" : "/logo.png"} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">{otherPersonName}</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500"></span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{otherPersonRole} Online</span>
              </div>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-transparent transition-colors">
          <div className="max-w-md mx-auto w-full space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === currentUserRole ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === currentUserRole
                  ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10'
                  : 'bg-white dark:bg-surface-dark text-slate-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-white/5 shadow-sm'
                  }`}>
                  {msg.text}
                  <div className={`text-[10px] mt-1 opacity-50 ${msg.sender === currentUserRole ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="p-4 bg-white/95 dark:bg-surface-dark/50 border-t border-gray-200 dark:border-white/5 pb-8 transition-colors">
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-gray-100 dark:bg-surface-dark border-transparent dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary text-slate-900 dark:text-white placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              className="size-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined filled">send</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatScreen;
