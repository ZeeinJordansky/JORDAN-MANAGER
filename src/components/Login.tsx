import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import OrbBackground from './OrbBackground';

interface LoginProps {
  onLogin: (userData: any) => void;
  theme: 'dark' | 'light';
  onNavigate: (path: string) => void;
}

export default function Login({ onLogin, theme, onNavigate }: LoginProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [pendingUser, setPendingUser] = useState<any>(null);

  const isLight = theme === 'light';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.startsWith('mint-') || key.length < 10) {
      setError('Неверный формат ключа. Формат: mint-(символы)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setPendingUser({ ...result.data, key });
        setStep('confirm');
      } else {
        setError(result.error || 'Ключ не найден или недействителен.');
      }
    } catch (err: any) {
      setError('Нет соединения с сервером. Проверьте интернет или попробуйте позже.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onLogin(pendingUser);
    onNavigate('/panel');
  };

  const handleCancel = () => {
    setStep('input');
    setPendingUser(null);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex overflow-hidden ${isLight ? 'bg-white' : 'bg-black'}`}>
      {/* Background orbs on the right */}
      <div className="absolute inset-0 pointer-events-none">
        <OrbBackground theme={theme} />
      </div>

      {/* Left side: White/Dark vertical container */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`relative z-10 w-full md:w-[450px] h-full flex flex-col p-8 sm:p-12 shadow-2xl border-r ${
          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-white/5'
        }`}
      >
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[10px] font-black uppercase tracking-widest">
              <Shield className="w-3 h-3" />
              <span>Панель управления</span>
            </div>
            <h1 className={`text-3xl font-black tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              «Mint» - Вход
            </h1>
            <p className={`text-sm font-medium ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Введите ваш ключ доступа для управления беседами.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'input' ? (
              <motion.form
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleVerify}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Ключ доступа
                    </label>
                    <button
                      type="button"
                      onClick={() => setError('Инструкция по получению ключа: Введите команду /ключ в личные сообщения бота ВКонтакте. Бот выдаст вам персональный код для входа.')}
                      className="text-[10px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-400 transition-colors"
                    >
                      Забыли ключ?
                    </button>
                  </div>
                  <div className="relative group">
                    <Key className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      error ? 'text-rose-500' : isLight ? 'text-neutral-400 group-focus-within:text-violet-500' : 'text-neutral-600 group-focus-within:text-violet-400'
                    }`} />
                    <input
                      type="password"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="mint-..."
                      className={`w-full h-14 pl-12 pr-4 rounded-2xl text-sm font-bold outline-none transition-all border ${
                        error 
                          ? 'border-rose-500 bg-rose-500/5 text-rose-500' 
                          : isLight 
                            ? 'bg-neutral-50 border-neutral-200 focus:border-violet-500 focus:bg-white text-neutral-900' 
                            : 'bg-white/5 border-white/10 focus:border-violet-500 focus:bg-white/10 text-white'
                      }`}
                    />
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] font-bold text-rose-500 ml-1"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !key}
                  className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-violet-600/20 ${
                    loading || !key
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-white/5 dark:text-neutral-600'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Продолжить</span>}
                  {!loading && <ChevronRight className="w-5 h-5" />}
                </button>

                <div className={`p-4 rounded-2xl border text-[11px] leading-relaxed font-medium ${
                  isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-white/5 border-white/5 text-neutral-400'
                }`}>
                  <p>
                    Получить ключ можно в личных сообщениях бота по команде <code className="text-violet-500 font-bold">/ключ</code>. Ключ привязан к вашему ID VK.
                  </p>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8 py-4"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-500/30 shadow-2xl">
                      <img src={pendingUser?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center border-4 border-neutral-950">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      {pendingUser?.fullName}
                    </h2>
                    <p className={`text-sm font-bold ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      Это вы?
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleConfirm}
                    className="h-14 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>Да, это я</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className={`h-14 rounded-2xl font-black text-sm transition-all active:scale-95 border flex items-center justify-center gap-2 ${
                      isLight 
                        ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50' 
                        : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/5'
                    }`}
                  >
                    <X className="w-5 h-5" />
                    <span>Нет, сменить ключ</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/5 opacity-50">
           <button 
             onClick={() => onNavigate('/main')}
             className="text-[10px] font-black uppercase tracking-widest hover:text-violet-500 transition-colors"
           >
             Вернуться на сайт
           </button>
           <span className="text-[10px] font-bold">MINT v2.4</span>
        </div>
      </motion.div>
      
      {/* Right side spacer to keep background visible */}
      <div className="flex-1 hidden md:block" />
    </div>
  );
}
