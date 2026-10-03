import React, { useState, useEffect } from 'react';
import {
  Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink,
  Command, Sun, Moon, Activity, MessageSquare, LifeBuoy
} from 'lucide-react';
import CommandsDirectory from './CommandsDirectory';
import RulesAndPrivacy from './RulesAndPrivacy';
import FAQSection from './FAQSection';
import ScrollToTop from './ScrollToTop';
import { useRealPing } from '../hooks/useRealPing';

interface BotLandingProps {
  initialView?: 'landing' | 'commands' | 'faq' | 'rules' | 'privacy';
  initialBanUser?: string;
  onNavigate?: (path: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function BotLanding({
  initialView = 'landing',
  onNavigate,
  theme,
  onToggleTheme
}: BotLandingProps) {
  const [currentView, setCurrentView] = useState<'landing' | 'commands' | 'faq' | 'rules' | 'privacy'>(
    initialView === 'commands' || initialView === 'faq' || initialView === 'rules' || initialView === 'privacy'
      ? initialView
      : 'landing'
  );
  const [connectedChats, setConnectedChats] = useState<number | null>(null);
  const realPing = useRealPing(3500); 

  const isLight = theme === 'light';

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/public-stats');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data?.connectedChats === 'number') {
            setConnectedChats(data.connectedChats);
          }
        }
      } catch (e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (initialView === 'commands' || initialView === 'faq' || initialView === 'rules' || initialView === 'privacy') {
      setCurrentView(initialView);
    } else {
      setCurrentView('landing');
    }
  }, [initialView]);

  useEffect(() => {
    const titles: Record<string, string> = {
      landing: 'Главная | «Mint» - чат-менеджер',
      commands: 'Команды | «Mint» - чат-менеджер',
      faq: 'Часто задаваемые вопросы (FAQ) | «Mint» - чат-менеджер',
      rules: 'Регламент и правила | «Mint» - чат-менеджер',
      privacy: 'Конфиденциальность | «Mint» - чат-менеджер',
    };
    if (typeof document !== 'undefined') {
      document.title = titles[currentView] || 'Главная | «Mint» - чат-менеджер';
    }
  }, [currentView]);

  const changeView = (view: 'landing' | 'commands' | 'faq' | 'rules' | 'privacy') => {
    setCurrentView(view);
    if (onNavigate) {
      if (view === 'landing') onNavigate('/main');
      else if (view === 'commands') onNavigate('/commands');
      else if (view === 'faq') onNavigate('/faq');
      else if (view === 'rules') onNavigate('/rules');
      else if (view === 'privacy') onNavigate('/privacy');
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex flex-col relative ${
      isLight
        ? 'bg-transparent text-neutral-900 selection:bg-violet-500 selection:text-white'
        : 'bg-transparent text-neutral-100 selection:bg-violet-600 selection:text-white'
    }`}>
      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 transition-colors duration-300 backdrop-blur-2xl border-b ${
        isLight ? 'bg-white/90 border-neutral-200' : 'bg-black/80 border-white/5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4 relative">
          <button
            onClick={() => changeView('landing')}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer group shrink-0 z-20"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-violet-500/20 bg-neutral-950 flex items-center justify-center shrink-0">
              <img src="/ming.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`ml-3 text-lg font-black tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>Mint</span>
          </button>

          {/* Centered Nav Links - Hidden only on small mobile */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 z-10">
            {[
              { id: 'landing', label: 'Главная' },
              { id: 'commands', label: 'Команды' },
              { id: 'faq', label: 'Вопросы' },
              { id: 'rules', label: 'Регламент' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => changeView(item.id as any)}
                className={`px-3 lg:px-5 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer whitespace-nowrap ${
                  currentView === item.id
                    ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm'
                    : isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0 z-20">
            <button
              onClick={() => onNavigate('/login')}
              className={`hidden sm:flex items-center gap-2.5 px-4 lg:px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm ${
                isLight 
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                  : 'bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Вход в панель</span>
              <span className="lg:hidden">Вход</span>
            </button>
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800 border-white/5 text-neutral-300'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span>Добавить бота</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 space-y-24">
        {currentView === 'landing' && (
          <>
            {/* Hero */}
            <section className="text-center max-w-4xl mx-auto space-y-8 py-10">
              <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] ${
                isLight ? 'text-neutral-950' : 'text-white'
              }`}>
                Умный чат-менеджер <br /> для Вашей беседы.
              </h1>
              <p className={`text-lg sm:text-xl font-bold max-w-2xl mx-auto ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                Мгновенная модерация, игровая экономика, кланы и <br className="hidden sm:block" /> детальная настройка прав доступа в одном боте.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <a
                  href="https://vk.ru/app6441755_-239281784"
                  target="_blank"
                  rel="noreferrer"
                  className="px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2.5"
                >
                  <span>Добавить в беседу</span>
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  onClick={() => {
                    const el = document.getElementById('commands-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else changeView('commands');
                  }}
                  className={`px-10 py-4 border font-black text-sm rounded-2xl transition-all flex items-center gap-2.5 cursor-pointer ${
                    isLight ? 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50' : 'bg-neutral-900 border-white/10 text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>Список команд</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div className={`p-8 rounded-[2.5rem] border text-center space-y-2 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-white/5'}`}>
                <div className={`text-5xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  {connectedChats !== null ? connectedChats : '1,520'}
                </div>
                <div className="text-xs uppercase tracking-widest font-black text-neutral-500">Бесед подключено</div>
              </div>
              <div className={`p-8 rounded-[2.5rem] border text-center space-y-2 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-white/5'}`}>
                <div className="text-5xl font-black text-violet-500">
                  {realPing !== null ? `${realPing}мс` : '24мс'}
                </div>
                <div className="text-xs uppercase tracking-widest font-black text-neutral-500 flex items-center justify-center gap-2">
                   <Activity className="w-3.5 h-3.5" />
                   Задержка ответа
                </div>
              </div>
            </section>

            {/* Support Box replacement */}
            <section className={`max-w-4xl mx-auto p-8 sm:p-12 rounded-[3rem] border text-center space-y-6 ${
              isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-900' : 'bg-neutral-900 border-white/5 text-white'
            }`}>
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl mx-auto flex items-center justify-center text-violet-500">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black">Нужна помощь?</h2>
              <p className={`text-lg max-w-xl mx-auto font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                обратитесь в поддержку по команде <code className="bg-violet-500/10 text-violet-500 px-2 py-1 rounded-lg">/тикет</code> в чат-менеджере
              </p>
            </section>

            {/* Features */}
            <section className="space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-3xl sm:text-4xl font-black">Почему выбирают Mint?</h2>
                <p className={`text-sm max-w-xl mx-auto font-medium ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Надёжная защита и увлекательный геймплей в одной оболочке.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: Zap, title: 'Скорость', desc: 'Бот отвечает мгновенно на любые запросы, не заставляя участников ждать.' },
                  { icon: Shield, title: 'Безопасность', desc: 'Автомодерация спама, мата и внешних ссылок работает 24/7.' },
                  { icon: Gamepad2, title: 'Активность', desc: 'Экономика, кланы и игры мотивируют участников общаться чаще.' }
                ].map((f) => (
                  <div key={f.title} className={`p-8 rounded-[2.5rem] border space-y-4 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-white/5'}`}>
                    <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-500">
                      <f.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">{f.title}</h3>
                    <p className={`text-sm leading-relaxed font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Commands */}
            <section id="commands-section" className="space-y-10 pt-10">
              <div className="text-center space-y-3">
                <h2 className="text-3xl sm:text-4xl font-black">Команды проекта</h2>
                <p className={`text-sm font-medium ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>Интерактивный справочник всех функций чат-менеджера</p>
              </div>
              <CommandsDirectory theme={theme} />
            </section>

            {/* FAQ */}
            <FAQSection theme={theme} />
          </>
        )}

        {currentView === 'commands' && <CommandsDirectory theme={theme} />}
        {currentView === 'faq' && <FAQSection theme={theme} />}
        {currentView === 'rules' && <RulesAndPrivacy initialTab="rules" onBack={() => changeView('landing')} theme={theme} />}
        {currentView === 'privacy' && <RulesAndPrivacy initialTab="privacy" onBack={() => changeView('landing')} theme={theme} />}
      </main>

      <footer className={`border-t py-12 mt-auto transition-colors ${isLight ? 'bg-white border-neutral-200' : 'bg-black border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
               <img src="/ming.jpg" alt="Mint" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className={`text-lg font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>Mint</div>
              <div className="text-[10px] uppercase tracking-tighter text-neutral-500">© 2026 Все права защищены</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-[11px] font-black uppercase tracking-widest text-neutral-500">
             <button onClick={() => changeView('landing')} className="hover:text-violet-500 transition-colors cursor-pointer">Главная</button>
             <button onClick={() => changeView('commands')} className="hover:text-violet-500 transition-colors cursor-pointer">Команды</button>
             <button onClick={() => changeView('faq')} className="hover:text-violet-500 transition-colors cursor-pointer">Помощь</button>
             <button onClick={() => changeView('rules')} className="hover:text-violet-500 transition-colors cursor-pointer">Регламент</button>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
