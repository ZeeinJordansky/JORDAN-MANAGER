import React, { useState } from 'react';
import { Bot, Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink, Sparkles, Command, Lock, UserCheck, MessageSquare } from 'lucide-react';
import CommandSimulator from './CommandSimulator';
import CommandsDirectory from './CommandsDirectory';
import UserChatPanel from './UserChatPanel';
import LoginModal from '../panel/components/LoginModal';

interface BotLandingProps {
  onOpenAdminPanel: () => void;
}

export default function BotLanding({ onOpenAdminPanel }: BotLandingProps) {
  const [currentView, setCurrentView] = useState<'landing' | 'commands' | 'userPanel'>('landing');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userLogin, setUserLogin] = useState('');

  const handleUserLoginSuccess = (data: { token: string; isRoot: boolean; login: string }) => {
    setIsUserLoggedIn(true);
    setUserLogin(data.login);
    if (data.isRoot) {
      onOpenAdminPanel();
    } else {
      setCurrentView('userPanel');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Navbar Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left Zone: Brand Logo & Title */}
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white uppercase block leading-none">
                Mint <span className="text-indigo-400">Bot</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">Чат-менеджер VK</span>
            </div>
          </button>

          {/* Center Zone: Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-400">
            <button
              onClick={() => setCurrentView('landing')}
              className={`hover:text-white transition-colors ${currentView === 'landing' ? 'text-indigo-400 font-extrabold' : ''}`}
            >
              Главная
            </button>
            <button
              onClick={() => setCurrentView('commands')}
              className={`hover:text-white transition-colors ${currentView === 'commands' ? 'text-indigo-400 font-extrabold' : ''}`}
            >
              Команды & Документация
            </button>
            <a
              href="https://vk.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Сообщество VK</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Right Zone: Control Panel Entry Buttons (Top Right Corner) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentView('userPanel')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 group"
            >
              <MessageSquare className="w-4 h-4 text-indigo-200" />
              <span>Панель управления</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onOpenAdminPanel}
              title="Секретная админ-панель суперадмина"
              className="p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Админ-панель</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-16">
        {/* VIEW 1: LANDING PAGE (DEFAULT) */}
        {currentView === 'landing' && (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Игровой Чат-Менеджер ВКонтакте</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                  Идеальный порядок <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
                    и максимум активности
                  </span>
                </h1>

                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                  Mint Bot обеспечит защиту беседы от спама и рейдов, развлечет участников дуэлями, кланами и работами, а также предоставит удобную панель управления.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="https://vk.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <span>Добавить бота в беседу</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setCurrentView('userPanel')}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
                  >
                    <span>Открыть панель бесед</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Interactive Command Simulator */}
              <div className="lg:col-span-6">
                <CommandSimulator />
              </div>
            </section>

            {/* Public Metrics Ticker */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">1,420+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Подключенных бесед</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">348,000+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Активных участников</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">18.5M+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Обработано команд</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">~3.2 ms</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Скорость отклика</div>
              </div>
            </section>

            {/* Features Spotlight */}
            <section className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Все возможности для вашей беседы
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Мощные алгоритмы модерации и продвинутая игровая экономика
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Zap,
                    title: 'Высокая скорость',
                    desc: 'Мгновенная реакция бота благодаря SQLite WAL двигателю и кэшированию в памяти.',
                  },
                  {
                    icon: Shield,
                    title: 'Защита и Автомодерация',
                    desc: 'Автоматический бан за спам, мут за мат и капс, фильтр внешних ссылок и защита от рейдов.',
                  },
                  {
                    icon: Gamepad2,
                    title: 'РП & Экономика',
                    desc: 'Дуэли на монеты, азартные игры, работы, ограбления, покупка бизнеса и кейсов.',
                  },
                  {
                    icon: Users,
                    title: 'Кланы и Войны',
                    desc: 'Создание кланов, клановые казны, регулярные битвы за рейтинг и общественный топ.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Гибкие Приветствия',
                    desc: 'Персонализированные автоприветствия вступающих участников с тегами {user} и {chat}.',
                  },
                  {
                    icon: Command,
                    title: 'Автоответы и Триггеры',
                    desc: 'Создавайте собственные автоответы на ключевые фразы без навыков программирования.',
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/40 transition-all space-y-3"
                    >
                      <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h3 className="text-base font-bold text-white">{f.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Commands Directory Preview */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Список команд бота</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Свыше 40 встроенных команд с удобным поиском и синтаксисом
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('commands')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Открыть всю документацию
                </button>
              </div>

              <CommandsDirectory />
            </section>
          </>
        )}

        {/* VIEW 2: COMMANDS DIRECTORY */}
        {currentView === 'commands' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Интерактивная База Команд</h1>
                <p className="text-xs text-slate-400 mt-1">Полный список доступных команд Mint Bot с описанием и синтаксисом</p>
              </div>
              <button
                onClick={() => setCurrentView('landing')}
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Вернуться на главную
              </button>
            </div>
            <CommandsDirectory />
          </div>
        )}

        {/* VIEW 3: USER CHAT PANEL */}
        {currentView === 'userPanel' && (
          <div className="space-y-6">
            {!isUserLoggedIn ? (
              <LoginModal
                onSuccess={handleUserLoginSuccess}
                title="Вход в Панель Управления"
                subtitle="Авторизуйтесь под вашим логином и паролем для доступа к управлению беседами"
              />
            ) : (
              <UserChatPanel onLogout={() => setIsUserLoggedIn(false)} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Mint Bot © 2026. Игровой чат-менеджер ВКонтакте.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('landing')} className="hover:text-slate-300 transition-colors">
              Главная
            </button>
            <button onClick={() => setCurrentView('commands')} className="hover:text-slate-300 transition-colors">
              Команды
            </button>
            <button onClick={() => setCurrentView('userPanel')} className="hover:text-slate-300 transition-colors">
              Панель бесед
            </button>
            <button onClick={onOpenAdminPanel} className="hover:text-indigo-400 transition-colors">
              Админ-панель
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
