import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import DDoSProtection from './DDoSProtection';

interface LoginProps {
  onLogin: (secret: string) => void;
}

type Step = 'ddos' | 'vkId' | 'code';

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep] = useState<Step>('ddos');
  const [vkId, setVkId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle VK ID input change (sanitize non-digits on the fly)
  const handleVkIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, '');
    setVkId(cleaned);
    setError('');
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vkId) {
      setError('Укажите ваш VK ID!');
      return;
    }

    const vkIdNum = parseInt(vkId);
    if (vkIdNum >= 1 && vkIdNum <= 999999) {
      setError('Вход с такими данными недоступен');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vkId })
      });

      const data = await res.json();
      if (res.ok) {
        setStep('code');
      } else {
        setError(data.error || 'Ошибка отправки кода');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Укажите код подтверждения!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vkId, code: code.trim() })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        // Save the active session info
        localStorage.setItem('session_vk_id', vkId);
        localStorage.setItem('session_user_name', data.fullName);
        localStorage.setItem('session_user_role', String(data.role));
        localStorage.setItem('session_is_special', String(data.isSpecial));
        onLogin(data.token);
      } else {
        setError(data.error || 'Неверный код подтверждения!');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'ddos') {
    return <DDoSProtection onVerify={() => setStep('vkId')} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] p-4 relative overflow-hidden text-[#c9d1d9] font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,191,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,191,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#161b22] rounded-2xl border border-white/[0.08] p-8 shadow-2xl relative z-10"
      >
        {step === 'vkId' && (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center border border-sky-500/20 mb-4 relative shadow-[0_0_20px_rgba(0,191,255,0.05)]">
                <Lock className="w-8 h-8 text-[#00BFFF]" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white">GAMES MANAGER</h1>
              <p className="text-[#8b949e] text-xs mt-2 max-w-xs leading-relaxed">
                Введите ваш цифровой VK ID для получения двухфакторного кода авторизации
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-widest block">VK ID пользователя</label>
              <input
                type="text"
                value={vkId}
                onChange={handleVkIdChange}
                placeholder="Например: 1115715881"
                className="w-full bg-[#0b0e14] px-4 py-3 rounded-xl border border-white/[0.08] focus:border-[#00BFFF]/50 outline-none transition-all text-sm text-white placeholder:text-[#8b949e]/30 font-semibold"
                autoFocus
                disabled={loading}
              />
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold mt-1"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !vkId}
              className="w-full bg-[#0077ff] hover:bg-blue-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-950/40 text-xs uppercase tracking-wider"
            >
              {loading ? 'Отправка...' : 'Получить код доступа'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <button 
                type="button" 
                onClick={() => { setStep('vkId'); setError(''); }}
                className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#00BFFF] mb-4 self-start transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Вернуться назад</span>
              </button>
              
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-4 relative shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                <KeyRound className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white">2FA Верификация</h1>
              <p className="text-[#8b949e] text-xs mt-2 max-w-xs leading-relaxed">
                Код авторизации отправлен в ваши личные сообщения VK. Введите его ниже.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[#8b949e] uppercase font-bold tracking-widest block">Код подтверждения (ОК или Особый)</label>
              <input
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                placeholder="Введите ОК или SPECIAL_..."
                className="w-full bg-[#0b0e14] px-4 py-3 rounded-xl border border-white/[0.08] focus:border-[#00BFFF]/50 outline-none transition-all text-sm text-white placeholder:text-[#8b949e]/30 font-mono font-semibold"
                autoFocus
                disabled={loading}
              />
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold mt-1"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !code}
              className="w-full bg-[#0077ff] hover:bg-blue-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-950/40 text-xs uppercase tracking-wider"
            >
              {loading ? 'Проверка...' : 'Войти в панель'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
