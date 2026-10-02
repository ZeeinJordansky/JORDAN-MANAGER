import React, { useState, useEffect, useRef } from 'react';
import { Shield, User, Lock, ArrowRight, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { panelApi } from '../api';

interface LoginModalProps {
  onSuccess: (data: { token: string; isRoot: boolean; login: string }) => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
  const [authMode, setAuthMode] = useState<'vkid' | 'password'>('vkid');
  const [step, setStep] = useState<1 | 2>(1);
  const [vkId, setVkId] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  // Captcha State
  const [captchaNum1, setCaptchaNum1] = useState(12);
  const [captchaNum2, setCaptchaNum2] = useState(8);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vkContainerRef = useRef<HTMLDivElement>(null);
  const vkidInitializedRef = useRef(false);

  // Regenerate captcha
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 40) + 10;
    const n2 = Math.floor(Math.random() * 40) + 5;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaAnswer('');
    setCaptchaSolved(false);
    setCaptchaError('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Initialize VK ID SDK
  useEffect(() => {
    if (authMode !== 'vkid') return;

    let checkInterval: any = null;
    let attempts = 0;

    const initVkId = () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID || !vkContainerRef.current) return false;

      try {
        if (vkContainerRef.current) {
          vkContainerRef.current.innerHTML = '';
        }

        VKID.Config.init({
          app: 54801343,
          redirectUrl: 'https://mint-8pp.pages.dev/',
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: '',
        });

        const oneTap = new VKID.OneTap();

        const vkidOnSuccess = async (data: any) => {
          setLoading(true);
          setError(null);
          try {
            const res = await panelApi.loginWithVkId({
              code: data?.code,
              deviceId: data?.device_id || data?.deviceId,
              user: data?.user,
              vkId: data?.user_id || data?.user?.id,
              accessToken: data?.access_token || data?.token
            });
            if (res.success && res.token) {
              localStorage.setItem('panel_token', res.token);
              onSuccess({ token: res.token, isRoot: res.isRoot, login: res.login });
            }
          } catch (e: any) {
            setError(e.message || 'Ошибка входа через VK ID');
          } finally {
            setLoading(false);
          }
        };

        const vkidOnError = (err: any) => {
          console.warn('[VK ID Widget Error]', err);
        };

        oneTap.render({
          container: vkContainerRef.current,
          showAlternativeLogin: true,
          styles: {
            borderRadius: 50,
            width: 325,
            height: 42
          }
        })
        .on(VKID.WidgetEvents.ERROR, vkidOnError)
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, function (payload: any) {
          const code = payload.code;
          const deviceId = payload.device_id;

          if (VKID.Auth && typeof VKID.Auth.exchangeCode === 'function') {
            VKID.Auth.exchangeCode(code, deviceId)
              .then(vkidOnSuccess)
              .catch((err: any) => {
                // If exchange fails on frontend, send payload directly to server
                vkidOnSuccess({ code, device_id: deviceId });
              });
          } else {
            vkidOnSuccess({ code, device_id: deviceId });
          }
        });

        vkidInitializedRef.current = true;
        return true;
      } catch (err) {
        console.error('[VK ID Init Error]', err);
        return false;
      }
    };

    if (!initVkId()) {
      checkInterval = setInterval(() => {
        attempts++;
        if (initVkId() || attempts > 20) {
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [authMode, onSuccess]);

  const handleVkIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Digits only
    setVkId(val);
    setError(null);
  };

  const verifyCaptcha = () => {
    const expected = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer) === expected) {
      setCaptchaSolved(true);
      setCaptchaError('');
    } else {
      setCaptchaSolved(false);
      setCaptchaError('Неверный ответ капчи!');
    }
  };

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vkId) {
      setError('Пожалуйста, введите ваш VK ID (только цифры)');
      return;
    }

    if (!captchaSolved) {
      setError('Пожалуйста, решите капчу перед продолжением!');
      return;
    }

    setLoading(true);
    try {
      await panelApi.checkVkId(vkId, captchaAnswer);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Ошибка проверки VK ID');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login.trim() || !password) {
      setError('Заполните все поля (Логин и Пароль)');
      return;
    }

    setLoading(true);
    try {
      const res = await panelApi.login(vkId, login.trim(), password);
      if (res.success && res.token) {
        localStorage.setItem('panel_token', res.token);
        onSuccess({ token: res.token, isRoot: res.isRoot, login: res.login });
      } else {
        setError('Неудачная попытка входа');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900 p-6 border-b border-slate-800 text-center relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-wide text-white">Панель Управления Ботом</h2>
          <p className="text-xs text-slate-400 mt-1">Авторизация персональной системы VK</p>
          
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setAuthMode('vkid')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${authMode === 'vkid' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'}`}
            >
              Вход через VK ID
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('password')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${authMode === 'password' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'}`}
            >
              Логин / Пароль
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'vkid' ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> Быстрый и безопасный вход
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Войдите в один клик через официальный VK ID SDK:
                </p>
              </div>

              {/* VK ID SDK Widget Container */}
              <div className="min-h-[44px] flex items-center justify-center w-full">
                <div ref={vkContainerRef} className="flex justify-center" />
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Авторизация через VK ID...
                </div>
              )}

              <div className="w-full pt-3 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Войти с помощью логина и пароля →
                </button>
              </div>
            </div>
          ) : (
            <>
              {step === 1 ? (
                <form onSubmit={handleStep1Next} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      VK ID (только цифры, без символов)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Например: 778382713"
                        value={vkId}
                        onChange={handleVkIdChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Укажите ваш чистый цифровой идентификатор ВКонтакте.
                    </p>
                  </div>

                  {/* Captcha Section */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Капча (Защита от роботов)
                      </span>
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        className="text-slate-500 hover:text-indigo-400 transition-colors"
                        title="Обновить капчу"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm font-bold text-indigo-300 tracking-wider font-mono select-none">
                        {captchaNum1} + {captchaNum2} = ?
                      </div>
                      <input
                        type="number"
                        placeholder="Ответ"
                        value={captchaAnswer}
                        onChange={(e) => {
                          setCaptchaAnswer(e.target.value);
                          setCaptchaSolved(false);
                        }}
                        onBlur={verifyCaptcha}
                        className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={verifyCaptcha}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition-colors"
                      >
                        Проверить
                      </button>
                    </div>

                    {captchaSolved && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Капча успешно пройдена!
                      </div>
                    )}
                    {captchaError && (
                      <div className="text-[11px] text-red-400 font-medium">
                        {captchaError}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !captchaSolved}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Далее</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStep2Login} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Логин панели
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Введите ваш логин"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
                    >
                      Назад
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Войти</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
