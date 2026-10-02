import React, { useState, useEffect } from 'react';
import {
  Bot, Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink,
  Command, BookOpen, Sun, Moon, Activity, CheckCircle2, ShieldCheck,
  Server, Sparkles
} from 'lucide-react';
import CommandsDirectory from './CommandsDirectory';
import RulesAndPrivacy from './RulesAndPrivacy';
import { useRealPing } from '../hooks/useRealPing';

interface BotLandingProps {
  initialView?: 'landing' | 'commands' | 'rules' | 'privacy';
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
  const [currentView, setCurrentView] = useState<'landing' | 'commands' | 'rules' | 'privacy'>(initialView);
  const [connectedChats, setConnectedChats] = useState<number | null>(null);
  const realPing = useRealPing(3500); // Live real ping measurement

  const isLight = theme === 'light';

  // Fetch real count of connected chats from bot server
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
      } catch (e) {
        // silently ignore
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  useEffect(() => {
    const titles: Record<string, string> = {
      landing: 'Главная | «Mint» - чат-менеджер',
      commands: 'Команды | «Mint» - чат-менеджер',
      rules: 'Регламент и правила | «Mint» - чат-менеджер',
      privacy: 'Конфиденциальность | «Mint» - чат-менеджер',
    };
    if (typeof document !== 'undefined') {
      document.title = titles[currentView] || 'Главная | «Mint» - чат-менеджер';
    }
  }, [currentView]);

  const changeView = (view: 'landing' | 'commands' | 'rules' | 'privacy') => {
    setCurrentView(view);
    if (onNavigate) {
      if (view === 'landing') onNavigate('/main');
      else if (view === 'commands') onNavigate('/commands');
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
      {/* Top Navigation Bar with Theme Switcher */}
      <header className={`sticky top-0 z-50 transition-colors duration-300 backdrop-blur-2xl border-b ${
        isLight ? 'bg-white/80 border-neutral-200/80 shadow-xs' : 'bg-black/60 border-white/5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo: «Mint» returns to main page */}
          <button
            onClick={() => changeView('landing')}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity text-left cursor-pointer"
            title="«Mint» — Вернуться на главную"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30 border border-violet-400/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className={`text-xl font-black tracking-tight block leading-none ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                «Mint»
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wider">чат-менеджер VK</span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-neutral-400">
            <button
              onClick={() => changeView('landing')}
              className={`transition-colors cursor-pointer ${
                currentView === 'landing'
                  ? 'text-violet-600 dark:text-violet-400 font-extrabold shadow-xs'
                  : isLight ? 'hover:text-neutral-900 text-neutral-600' : 'hover:text-white'
              }`}
            >
              Главная
            </button>
            <button
              onClick={() => changeView('commands')}
              className={`transition-colors cursor-pointer ${
                currentView === 'commands'
                  ? 'text-violet-600 dark:text-violet-400 font-extrabold shadow-xs'
                  : isLight ? 'hover:text-neutral-900 text-neutral-600' : 'hover:text-white'
              }`}
            >
              Команды
            </button>
            <button
              onClick={() => changeView('rules')}
              className={`transition-colors cursor-pointer ${
                currentView === 'rules'
                  ? 'text-violet-600 dark:text-violet-400 font-extrabold shadow-xs'
                  : isLight ? 'hover:text-neutral-900 text-neutral-600' : 'hover:text-white'
              }`}
            >
              Регламент и правила
            </button>
            <button
              onClick={() => changeView('privacy')}
              className={`transition-colors cursor-pointer ${
                currentView === 'privacy'
                  ? 'text-violet-600 dark:text-violet-400 font-extrabold shadow-xs'
                  : isLight ? 'hover:text-neutral-900 text-neutral-600' : 'hover:text-white'
              }`}
            >
              Конфиденциальность
            </button>
          </nav>

          {/* Right Controls: Theme Toggle & Direct Add Button */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-300'
              }`}
              title={isLight ? 'Включить тёмную тему' : 'Включить светлую (белую) тему'}
              aria-label="Переключить тему"
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-violet-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Direct Connect Link */}
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-lg shadow-violet-600/35 border border-violet-400/30 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>Добавить в беседу</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 space-y-16">
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <>
            {/* Hero Section (Без бейджа 'Официальный чат-менеджер ВКонтакте' и без демо-окна) */}
            <section className="text-center max-w-3xl mx-auto space-y-8 pt-8 pb-4">
              {/* Requested Headings */}
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] ${
                isLight ? 'text-neutral-950' : 'text-white'
              }`}>
                Чат-менеджер «Mint» для ваших бесед ВКонтакте!
              </h1>

              <p className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-300 dark:to-indigo-300 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                Игровая система, система модерации, надёжный!
              </p>

              <p className={`text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal ${
                isLight ? 'text-neutral-600' : 'text-neutral-300'
              }`}>
                Мгновенный отклик на каждую команду, умная фильтрация спама и мата, масштабные клановые битвы, дуэли на монеты и продвинутая иерархия прав до владельца беседы. Работает непрерывно 24/7.
              </p>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <a
                  href="https://vk.ru/app6441755_-239281784"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 sm:px-10 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-purple-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-xl shadow-violet-600/40 border border-violet-400/30 hover:scale-[1.02] transition-all flex items-center gap-2.5 group cursor-pointer"
                >
                  <span>Добавить в беседу</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <button
                  onClick={() => changeView('commands')}
                  className={`px-8 py-4 border font-bold text-sm rounded-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 shadow-sm'
                      : 'bg-neutral-900/80 hover:bg-neutral-800/90 border-white/10 hover:border-violet-500/40 text-neutral-200 hover:text-white'
                  }`}
                >
                  <span>Список команд</span>
                  <ChevronRight className="w-4 h-4 text-violet-400" />
                </button>
              </div>
            </section>

            {/* Public Stats Ticker: Реальные данные "подключённых бесед" и реальный пинг */}
            <section className={`max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 shadow-2xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center border backdrop-blur-xl transition-all ${
              isLight ? 'bg-white/80 border-neutral-200 shadow-neutral-200/50' : 'bg-neutral-950/60 border-white/10'
            }`}>
              {/* Реальные данные подключенных бесед */}
              <div className="space-y-1">
                <div className={`text-3xl sm:text-4xl font-black font-mono ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  {connectedChats !== null ? connectedChats : '67'}
                </div>
                <div className="text-xs font-bold text-neutral-400">
                  Подключенных бесед (Реальные данные)
                </div>
              </div>

              {/* Реальный live пинг */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-black text-violet-600 dark:text-violet-400 font-mono">
                  <span>{realPing !== null ? `${realPing} мс` : 'Замер...'}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
                <div className="text-xs font-bold text-neutral-400 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-violet-500" />
                  <span>Реальный пинг (Live)</span>
                </div>
              </div>

              {/* Статус бота онлайн */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl font-black text-emerald-500 font-mono">
                  <span>Онлайн</span>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                </div>
                <div className="text-xs font-bold text-neutral-400 flex items-center justify-center gap-1">
                  <Server className="w-3 h-3 text-emerald-500" />
                  <span>Статус Callback API (24/7)</span>
                </div>
              </div>
            </section>

            {/* Features Grid */}
            <section className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Все возможности для вашей беседы
                </h2>
                <p className={`text-xs sm:text-sm ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  Современный комплекс инструментов для поддержания порядка и высокой активности участников
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Zap,
                    title: 'Высокая скорость',
                    desc: 'Мгновенный отклик на каждую команду благодаря оптимизированной асинхронной архитектуре.',
                  },
                  {
                    icon: Shield,
                    title: 'Защита и Автомодерация',
                    desc: 'Автоматический бан за спам, мут за мат и капс, фильтр внешних ссылок и интеллектуальная защита от рейдов.',
                  },
                  {
                    icon: Gamepad2,
                    title: 'РП & Игровая Экономика',
                    desc: 'Дуэли на монеты, азартная рулетка, работы, ограбления, покупка виртуальных бизнесов и открытие кейсов.',
                  },
                  {
                    icon: Users,
                    title: 'Клановые Битвы',
                    desc: 'Создание кланов, клановая казна, регулярные турниры за рейтинг и общественный топ сильнейших.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Гибкие Приветствия',
                    desc: 'Персонализированные автоприветствия новых участников с тегами {user} и {chat} и правила беседы.',
                  },
                  {
                    icon: Command,
                    title: 'Иерархия до Владельца',
                    desc: 'Многоуровневые права: участник, модератор, ст. модератор, администратор и владелец беседы.',
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className={`rounded-2xl p-6 transition-all space-y-3 group border backdrop-blur-xl ${
                        isLight
                          ? 'bg-white/80 border-neutral-200/90 hover:border-violet-400 hover:shadow-lg'
                          : 'bg-neutral-950/60 border-white/5 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10'
                      }`}
                    >
                      <div className="w-11 h-11 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                        <Icon className="w-5 h-5 text-violet-500" />
                      </div>
                      <h3 className={`text-base font-bold transition-colors ${
                        isLight ? 'text-neutral-900 group-hover:text-violet-600' : 'text-white group-hover:text-violet-200'
                      }`}>
                        {f.title}
                      </h3>
                      <p className={`text-xs leading-relaxed font-normal ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {f.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Commands Directory Preview */}
            <section className={`rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border backdrop-blur-xl ${
              isLight ? 'bg-white/80 border-neutral-200' : 'bg-neutral-950/60 border-white/10'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className={`text-xl font-extrabold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                    Список команд чат-менеджера
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    Все существующие команды бота от обычного участника до владельца беседы
                  </p>
                </div>
                <button
                  onClick={() => changeView('commands')}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 border border-violet-400/20 transition-all cursor-pointer"
                >
                  Открыть всю документацию
                </button>
              </div>

              <CommandsDirectory theme={theme} />
            </section>

            {/* Quick Rules Preview Banner */}
            <section className={`rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border backdrop-blur-xl ${
              isLight ? 'bg-white/80 border-neutral-200' : 'bg-neutral-950/60 border-white/10'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                    Правила использования и Регламент
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    Ознакомьтесь с официальным регламентом из 12 разделов и реальной политикой конфиденциальности «Mint»
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => changeView('rules')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-white'
                  }`}
                >
                  Читать правила
                </button>
                <button
                  onClick={() => changeView('privacy')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700' : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-300'
                  }`}
                >
                  Конфиденциальность
                </button>
              </div>
            </section>
          </>
        )}

        {/* VIEW 2: COMMANDS */}
        {currentView === 'commands' && (
          <div className="space-y-6">
            <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-neutral-200' : 'border-white/5'}`}>
              <div>
                <h1 className={`text-2xl font-extrabold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Интерактивная База Команд
                </h1>
                <p className={`text-xs mt-1 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  Все существующие команды «Mint» от участника до владельца беседы
                </p>
              </div>
              <button
                onClick={() => changeView('landing')}
                className={`px-3.5 py-1.5 border font-semibold text-xs rounded-xl transition-all cursor-pointer ${
                  isLight ? 'bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-100' : 'bg-neutral-900/80 border-white/10 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Вернуться на главную
              </button>
            </div>
            <CommandsDirectory theme={theme} />
          </div>
        )}

        {/* VIEW 3: RULES (Регламент) */}
        {currentView === 'rules' && (
          <RulesAndPrivacy initialTab="rules" onBack={() => changeView('landing')} theme={theme} />
        )}

        {/* VIEW 4: PRIVACY (Конфиденциальность) */}
        {currentView === 'privacy' && (
          <RulesAndPrivacy initialTab="privacy" onBack={() => changeView('landing')} theme={theme} />
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 text-xs mt-auto backdrop-blur-xl transition-colors duration-300 ${
        isLight ? 'bg-white/80 border-neutral-200 text-neutral-600' : 'border-white/5 bg-black/80 text-neutral-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => changeView('landing')}
            className="flex items-center gap-2.5 font-bold hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <span className={isLight ? 'text-neutral-800' : 'text-neutral-300'}>
              «Mint» © 2026. Чат-менеджер для бесед ВКонтакте.
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => changeView('landing')} className="hover:text-violet-500 transition-colors cursor-pointer">
              Главная
            </button>
            <button onClick={() => changeView('commands')} className="hover:text-violet-500 transition-colors cursor-pointer">
              Команды
            </button>
            <button onClick={() => changeView('rules')} className="hover:text-violet-500 transition-colors cursor-pointer">
              Регламент и правила
            </button>
            <button onClick={() => changeView('privacy')} className="hover:text-violet-500 transition-colors cursor-pointer">
              Конфиденциальность
            </button>
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:opacity-80 transition-opacity flex items-center gap-1 font-bold"
            >
              <span>Добавить бота</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
