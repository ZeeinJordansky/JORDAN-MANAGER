import React, { useState, useEffect } from 'react';
import { Bot, Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink, Sparkles, Command, Lock, MessageSquare, BookOpen, FileText } from 'lucide-react';
import CommandSimulator from './CommandSimulator';
import CommandsDirectory from './CommandsDirectory';
import UserChatPanel from './UserChatPanel';
import LoginModal from '../panel/components/LoginModal';
import RulesAndPrivacy from './RulesAndPrivacy';

interface BotLandingProps {
  onOpenAdminPanel: () => void;
  initialView?: 'landing' | 'commands' | 'rules' | 'privacy' | 'userPanel';
  onNavigate?: (path: string) => void;
}

export default function BotLanding({ onOpenAdminPanel, initialView = 'landing', onNavigate }: BotLandingProps) {
  const [currentView, setCurrentView] = useState<'landing' | 'commands' | 'rules' | 'privacy' | 'userPanel'>(initialView);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userLogin, setUserLogin] = useState('');

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  const changeView = (view: 'landing' | 'commands' | 'rules' | 'privacy' | 'userPanel') => {
    setCurrentView(view);
    if (onNavigate) {
      if (view === 'landing') onNavigate('/main');
      else if (view === 'commands') onNavigate('/commands');
      else if (view === 'rules') onNavigate('/rules');
      else if (view === 'privacy') onNavigate('/privacy');
      else if (view === 'userPanel') onNavigate('/user-panel');
    }
  };

  const handleUserLoginSuccess = (data: { token: string; isRoot: boolean; login: string }) => {
    setIsUserLoggedIn(true);
    setUserLogin(data.login);
    if (data.isRoot) {
      onOpenAdminPanel();
    } else {
      changeView('userPanel');
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans selection:bg-emerald-500 selection:text-black flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Zone 1: Wordmark Logo */}
          <button
            onClick={() => changeView('landing')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left"
          >
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase block leading-none">
                Mint <span className="text-emerald-400">Bot</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wider">Чат-менеджер VK</span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-neutral-400">
            <button
              onClick={() => changeView('landing')}
              className={`hover:text-white transition-colors ${currentView === 'landing' ? 'text-emerald-400 font-extrabold' : ''}`}
            >
              Главная
            </button>
            <button
              onClick={() => changeView('commands')}
              className={`hover:text-white transition-colors ${currentView === 'commands' ? 'text-emerald-400 font-extrabold' : ''}`}
            >
              Команды
            </button>
            <button
              onClick={() => changeView('rules')}
              className={`hover:text-white transition-colors ${currentView === 'rules' ? 'text-emerald-400 font-extrabold' : ''}`}
            >
              Регламент и правила
            </button>
            <button
              onClick={() => changeView('privacy')}
              className={`hover:text-white transition-colors ${currentView === 'privacy' ? 'text-emerald-400 font-extrabold' : ''}`}
            >
              Конфиденциальность
            </button>
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 text-emerald-400"
            >
              <span>Подключить бота</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Zone 3: Control Panel Entry (Top Right Corner) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => changeView('userPanel')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-black" />
              <span>Панель управления</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenAdminPanel}
              title="Панель администратора"
              className="p-2 sm:px-3 sm:py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Админ-панель</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-16">
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Официальный чат-менеджер ВКонтакте</span>
                </div>

                {/* Requested Headings */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                  Чат-менеджер «Mint» для ваших бесед ВКонтакте!
                </h1>

                <p className="text-emerald-400 text-lg sm:text-xl font-bold tracking-tight">
                  Игровая система, система модерации, надёжный!
                </p>

                <p className="text-neutral-400 text-sm leading-relaxed max-w-xl font-normal">
                  Молниеносный отклик, умный фильтр спама и мата, масштабные клановые войны, экономика и дуэли в один клик. Работает непрерывно 24/7.
                </p>

                {/* Primary CTA Button */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="https://vk.ru/app6441755_-239281784"
                    target="_blank"
                    rel="noreferrer"
                    className="px-7 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-sm rounded-xl shadow-xl shadow-emerald-500/25 transition-all flex items-center gap-2 group"
                  >
                    <span>Добавить в беседу</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>

                  <button
                    onClick={() => changeView('userPanel')}
                    className="px-6 py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
                  >
                    <span>Панель управления</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Interactive Simulator */}
              <div className="lg:col-span-6">
                <CommandSimulator />
              </div>
            </section>

            {/* Public Real Stats Ticker */}
            <section className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">1,420+</div>
                <div className="text-xs font-bold text-neutral-400 mt-1">Подключенных бесед</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">348,000+</div>
                <div className="text-xs font-bold text-neutral-400 mt-1">Участников чатов</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">18.5M+</div>
                <div className="text-xs font-bold text-neutral-400 mt-1">Обработано команд</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">~3.2 мс</div>
                <div className="text-xs font-bold text-neutral-400 mt-1">Скорость отклика</div>
              </div>
            </section>

            {/* Features Grid */}
            <section className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Все возможности для вашей беседы
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400">
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
                    title: 'Автоответы и Триггеры',
                    desc: 'Создавайте собственные автоматические ответы на ключевые фразы без сложного программирования.',
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 hover:border-emerald-500/40 transition-all space-y-3"
                    >
                      <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold text-white">{f.title}</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-normal">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Commands Directory Preview */}
            <section className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Список команд чат-менеджера</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Свыше 40 встроенных команд с удобным поиском и синтаксисом
                  </p>
                </div>
                <button
                  onClick={() => changeView('commands')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all"
                >
                  Открыть всю документацию
                </button>
              </div>

              <CommandsDirectory />
            </section>

            {/* Quick Rules Preview Banner */}
            <section className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Правила использования и Регламент</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ознакомьтесь с официальным регламентом из 12 разделов и политикой конфиденциальности «Mint»
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => changeView('rules')}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Читать правила
                </button>
                <button
                  onClick={() => changeView('privacy')}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold rounded-xl transition-colors"
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
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Интерактивная База Команд</h1>
                <p className="text-xs text-neutral-400 mt-1">Полный список доступных команд Mint Bot с описанием и синтаксисом</p>
              </div>
              <button
                onClick={() => changeView('landing')}
                className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Вернуться на главную
              </button>
            </div>
            <CommandsDirectory />
          </div>
        )}

        {/* VIEW 3: RULES (Регламент) */}
        {currentView === 'rules' && (
          <RulesAndPrivacy initialTab="rules" onBack={() => changeView('landing')} />
        )}

        {/* VIEW 4: PRIVACY (Конфиденциальность) */}
        {currentView === 'privacy' && (
          <RulesAndPrivacy initialTab="privacy" onBack={() => changeView('landing')} />
        )}

        {/* VIEW 5: USER CHAT PANEL */}
        {currentView === 'userPanel' && (
          <div className="space-y-6">
            {!isUserLoggedIn ? (
              <LoginModal
                onSuccess={handleUserLoginSuccess}
                title="Вход в Панель Управления"
                subtitle="Авторизуйтесь по логину и паролю для доступа к управлению вашими беседами"
              />
            ) : (
              <UserChatPanel onLogout={() => setIsUserLoggedIn(false)} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-black py-8 text-xs text-neutral-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-neutral-400">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>Чат-менеджер «Mint» © 2026. Для бесед ВКонтакте.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => changeView('landing')} className="hover:text-neutral-300 transition-colors">
              Главная
            </button>
            <button onClick={() => changeView('commands')} className="hover:text-neutral-300 transition-colors">
              Команды
            </button>
            <button onClick={() => changeView('rules')} className="hover:text-neutral-300 transition-colors">
              Регламент и правила
            </button>
            <button onClick={() => changeView('privacy')} className="hover:text-neutral-300 transition-colors">
              Конфиденциальность
            </button>
            <button onClick={() => changeView('userPanel')} className="hover:text-neutral-300 transition-colors">
              Панель управления
            </button>
            <button onClick={onOpenAdminPanel} className="hover:text-emerald-400 transition-colors">
              Админ-панель
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
