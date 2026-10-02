import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { panelApi } from '../api';

interface LoginModalProps {
  onSuccess: (data: { token: string; isRoot: boolean; login: string }) => void;
  title?: string;
  subtitle?: string;
}

export default function LoginModal({ onSuccess, title, subtitle }: LoginModalProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login.trim() || !password) {
      setError('Заполните логин и пароль для входа');
      return;
    }

    setLoading(true);
    try {
      const res = await panelApi.login('1', login.trim(), password);
      if (res.success && res.token) {
        localStorage.setItem('panel_token', res.token);
        onSuccess({ token: res.token, isRoot: res.isRoot, login: res.login });
      } else {
        setError('Неверный логин или пароль');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации. Проверьте правильность введенных данных.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setLogin('1230вы9фа');
    setPassword('67сыкссевенкранченидл');
    setError(null);
  };

  const handleFillDemoUser = () => {
    setLogin('user');
    setPassword('123456');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Dynamic background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-4 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {title || 'Авторизация в панели'}
          </h1>
          <p className="text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
            {subtitle || 'Введите учетные данные вашего аккаунта для доступа к управлению'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Логин пользователя</span>
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => { setLogin(e.target.value); setError(null); }}
              placeholder="Введите логин"
              className="w-full bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none transition-all text-sm text-white placeholder:text-slate-600 font-medium"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Пароль доступа</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              className="w-full bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none transition-all text-sm text-white placeholder:text-slate-600 font-medium"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !login || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/25 text-sm flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <span>Авторизация...</span>
            ) : (
              <>
                <span>Войти в систему</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center mb-1">
            Быстрый ввод (Демо-доступ):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFillDemoUser}
              className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs font-medium text-slate-300 transition-colors text-center"
            >
              👤 Управляющий
            </button>
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="px-3 py-2 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/40 rounded-lg text-xs font-medium text-indigo-300 transition-colors text-center"
            >
              👑 Администратор
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
