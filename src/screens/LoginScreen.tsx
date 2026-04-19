import React, { useState } from 'react';
import { supabase } from '../supabase';

interface LoginScreenProps {
  onLogin: () => void;
  onBack: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      console.error('Login error:', loginError.message);
      setError(loginError.message === 'Invalid login credentials' ? 'Email ou senha inválidos' : 'Erro ao fazer login');
    } else if (data.user) {
      if (remember) {
        localStorage.setItem('admin_auth', 'true');
      }
      onLogin();
    }
  };

  return (
    <div className="bg-gradient-to-b from-primary/20 to-white dark:bg-background-dark min-h-screen transition-colors">
      <div className="flex flex-col p-6 max-w-md mx-auto w-full min-h-screen relative">
        <div className="flex items-center mb-8">
          <button onClick={onBack} className="size-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h2 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Login</h2>
        </div>
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Painel Administrativo</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seu salão com facilidade e profissionalismo.</p>
        </div>

        <div className="flex flex-col items-center mb-10">
          <div className="size-24 rounded-full bg-white dark:bg-surface-dark border-4 border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden relative group shadow-lg transition-colors">
            <img src="/adriana.png" className="h-full w-full object-cover" alt="Logo" />
            <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-white dark:border-background-dark shadow-md">
              <span className="material-symbols-outlined text-xs text-white">photo_camera</span>
            </div>
          </div>
          <span className="text-primary text-sm font-bold mt-3">Adriana Henrique</span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">alternate_email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-surface-dark border-transparent h-14 pl-12 pr-4 focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 dark:text-white placeholder:text-gray-400 shadow-sm"
              placeholder="E-mail profissional"
              type="email"
            />
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-surface-dark border-transparent h-14 pl-12 pr-4 focus:ring-primary focus:border-primary transition-all text-sm text-slate-900 dark:text-white placeholder:text-gray-400 shadow-sm"
              placeholder="Senha"
              type="password"
            />
          </div>
          
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="remember" className="text-sm text-gray-500 dark:text-gray-400">Manter conectado</label>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center mt-2">{error}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary h-14 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Entrando...' : 'Acessar Painel'}</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
