import React, { useState } from 'react';
import { Bot, Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink, Sparkles, Command, CheckCircle2, Lock } from 'lucide-react';
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
    // If logged in as Root admin and clicked admin, open admin panel directly
    if (data.isRoot) {
      onOpenAdminPanel();
    } else {
      setCurrentView('userPanel');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Zone 1: Brand */}
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white uppercase">
              Mint <span className="text-indigo-400">Bot</span>
            </span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-400">
            <button
              onClick={() => setCurrentView('landing')}
              className={`hover:text-white transition-colors ${currentView === 'landing' ? 'text-indigo-400' : ''}`}
            >
              Главная
            </button>
            <button
              onClick={() => setCurrentView('commands')}
              className={`hover:text-white transition-colors ${currentView === 'commands' ? 'text-indigo-400' : ''}`}
            >
              Команды & Документация
            </button>
            <button
              onClick={() => setCurrentView('userPanel')}
              className={`hover:text-white transition-colors ${currentView === 'userPanel' ? 'text-indigo-400' : ''}`}
            >
              Панель бесед
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

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('userPanel')}
              className="hidden sm:flex px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-all items-center gap-1.5"
            >
              <span>Панель управления</span>
            </button>

            <button
              onClick={onOpenAdminPanel}
              className="px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Админ-панель</span>
            </button>

            <a
              href="https://vk.com"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Добавить в VK</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-16">
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Игровой Чат-Менеджер Нового Поколения</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                  Полный контроль и драйв <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
                    в ваших беседах VK
                  </span>
                </h1>

                <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
                  Mint Bot защитит вашу беседу от спама и мата, устроит увлекательные дуэли, создаст клановые битвы и поднимет активность участников до максимума!
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="https://vk.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <span>Подключить бота бесплатно</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setCurrentView('userPanel')}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-sm rounded-xl transition-all"
                  >
                    Панель управления беседами
                  </button>
                </div>
              </div>

              {/* Interactive Simulator */}
              <div className="lg:col-span-6">
                <CommandSimulator />
              </div>
            </section>

            {/* Public Metrics Ticker */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">1,420+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Активных бесед</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">348,000+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Участников чатов</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">18.5M+</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Обработано команд</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">~3.2 ms</div>
                <div className="text-xs font-bold text-slate-400 mt-1">Скорость движка</div>
              </div>
            </section>

            {/* Features Spotlight */}
            <section className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Все необходимые инструменты в одном боте
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Создан для обеспечения порядка, развлечения участников и непрерывной активности
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Zap,
                    title: 'Мгновенная скорость',
                    desc: 'Отклик ботов менее 5 миллисекунд благодаря архитектуре SQLite WAL + InMemory Cache.',
                  },
                  {
                    icon: Shield,
                    title: 'Умный Автомодератор',
                    desc: 'Автоматическая блокировка мата, внешних ссылок, капса, спама и защита от рейдов.',
                  },
                  {
                    icon: Gamepad2,
                    title: 'Игровая Экономика',
                    desc: 'Дуэли на монеты, казино, виртуальные работы, ограбления, покупки бизнесов и кейсы.',
                  },
                  {
                    icon: Users,
                    title: 'Клановая система',
                    desc: 'Создание кланов, клановые казны, регулярные турниры и глобальный топ лидеров.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Гибкие Приветствия',
                    desc: 'Настройка уникальных текстовых приветствий и правил беседы под стиль вашего сообщества.',
                  },
                  {
                    icon: Command,
                    title: 'Кастомные триггеры',
                    desc: 'Создавайте собственные автоответы и реакции на ключевые фразы участников.',
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

            {/* Quick Commands Teaser */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Команды и возможности</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Свыше 40 встроенных команд для администраторов и игроков
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
                title="Вход в Панель Бесед"
                subtitle="Авторизуйтесь для настройки автомодерации и управления вашими чатами"
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
              Панель управления
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
