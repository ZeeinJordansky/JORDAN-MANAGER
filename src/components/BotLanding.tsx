import React, { useState, useEffect } from 'react';
import {
  Bot, Shield, Zap, Gamepad2, Users, ChevronRight, ExternalLink,
  Sparkles, Command, BookOpen, ShieldCheck, Activity, Award
} from 'lucide-react';
import CommandsDirectory from './CommandsDirectory';
import RulesAndPrivacy from './RulesAndPrivacy';

interface BotLandingProps {
  initialView?: 'landing' | 'commands' | 'rules' | 'privacy';
  onNavigate?: (path: string) => void;
}

export default function BotLanding({ initialView = 'landing', onNavigate }: BotLandingProps) {
  const [currentView, setCurrentView] = useState<'landing' | 'commands' | 'rules' | 'privacy'>(initialView);

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
    <div className="min-h-screen bg-transparent text-neutral-100 font-sans selection:bg-violet-600 selection:text-white flex flex-col relative">
      {/* Top Navigation Bar with Glassmorphic Blur */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/5">
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
              <span className="text-xl font-black tracking-tight text-white block leading-none">
                «Mint»
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wider">чат-менеджер VK</span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-neutral-400">
            <button
              onClick={() => changeView('landing')}
              className={`hover:text-white transition-colors cursor-pointer ${currentView === 'landing' ? 'text-violet-400 font-extrabold shadow-sm' : ''}`}
            >
              Главная
            </button>
            <button
              onClick={() => changeView('commands')}
              className={`hover:text-white transition-colors cursor-pointer ${currentView === 'commands' ? 'text-violet-400 font-extrabold shadow-sm' : ''}`}
            >
              Команды
            </button>
            <button
              onClick={() => changeView('rules')}
              className={`hover:text-white transition-colors cursor-pointer ${currentView === 'rules' ? 'text-violet-400 font-extrabold shadow-sm' : ''}`}
            >
              Регламент и правила
            </button>
            <button
              onClick={() => changeView('privacy')}
              className={`hover:text-white transition-colors cursor-pointer ${currentView === 'privacy' ? 'text-violet-400 font-extrabold shadow-sm' : ''}`}
            >
              Конфиденциальность
            </button>
          </nav>

          {/* Primary Action Button (no control panel) */}
          <div className="flex items-center gap-3">
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-lg shadow-violet-600/35 border border-violet-400/30 active:scale-95 transition-all flex items-center gap-2 group"
            >
              <span>Добавить в беседу</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-10 space-y-16">
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-4">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-xs font-bold backdrop-blur-md shadow-sm shadow-violet-500/20">
                  <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                  <span>Официальный чат-менеджер ВКонтакте</span>
                </div>

                {/* Requested Headings */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                  Чат-менеджер «Mint» для ваших бесед ВКонтакте!
                </h1>

                <p className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 text-xl sm:text-2xl font-black tracking-tight">
                  Игровая система, система модерации, надёжный!
                </p>

                <p className="text-neutral-300 text-sm leading-relaxed max-w-xl font-normal">
                  Молниеносный отклик, умный фильтр спама и мата, масштабные клановые войны, экономика и дуэли в один клик. Работает непрерывно 24/7.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="https://vk.ru/app6441755_-239281784"
                    target="_blank"
                    rel="noreferrer"
                    className="px-8 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-purple-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-xl shadow-violet-600/40 border border-violet-400/30 hover:scale-[1.02] transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <span>Добавить в беседу</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>

                  <button
                    onClick={() => changeView('commands')}
                    className="px-6 py-4 bg-neutral-900/80 hover:bg-neutral-800/90 border border-white/10 hover:border-violet-500/40 text-neutral-200 hover:text-white font-bold text-sm rounded-xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Список команд</span>
                    <ChevronRight className="w-4 h-4 text-violet-400" />
                  </button>
                </div>
              </div>

              {/* High-end Showcase Card (replacing the simulator board) */}
              <div className="lg:col-span-5">
                <div className="bg-neutral-950/70 backdrop-blur-2xl border border-white/10 hover:border-violet-500/40 rounded-3xl p-7 shadow-2xl transition-all space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/30 border border-violet-400/30">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">«Mint»</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-[10px] font-bold text-violet-300">
                            <ShieldCheck className="w-3 h-3 text-violet-400" /> Проверен
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono">VK Chat Engine 2026</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/25 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-violet-300 font-mono">Онлайн</span>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                        <Activity className="w-3.5 h-3.5 text-violet-400" />
                        <span>Скорость отклика</span>
                      </div>
                      <div className="text-lg font-black text-white font-mono">~3.2 мс</div>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                        <Shield className="w-3.5 h-3.5 text-violet-400" />
                        <span>Безопасность</span>
                      </div>
                      <div className="text-lg font-black text-violet-300 font-mono">Антирейд</div>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                        <Gamepad2 className="w-3.5 h-3.5 text-violet-400" />
                        <span>Игры & Экономика</span>
                      </div>
                      <div className="text-sm font-bold text-white">40+ механик</div>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold">
                        <Award className="w-3.5 h-3.5 text-violet-400" />
                        <span>Аптайм</span>
                      </div>
                      <div className="text-sm font-bold text-white">99.98% 24/7</div>
                    </div>
                  </div>

                  {/* Quick Feature Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      'Автомодерация',
                      'Кланы и войны',
                      'Казино и рулетка',
                      'Дуэли на монеты',
                      'Автоприветствия',
                      'Фильтр спама',
                    ].map((badge) => (
                      <span
                        key={badge}
                        className="px-3 py-1 bg-white/5 border border-white/5 hover:border-violet-500/30 text-neutral-300 hover:text-white text-[11px] font-medium rounded-lg transition-colors"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Direct Add Button */}
                  <a
                    href="https://vk.ru/app6441755_-239281784"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 border border-violet-400/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <span>Подключить «Mint» к вашей беседе</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </section>

            {/* Public Stats Ticker with Glassmorphism */}
            <section className="bg-neutral-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
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
                <div className="text-2xl sm:text-3xl font-black text-violet-400 font-mono">~3.2 мс</div>
                <div className="text-xs font-bold text-neutral-400 mt-1">Скорость отклика</div>
              </div>
            </section>

            {/* Features Grid with Translucent Glass */}
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
                      className="bg-neutral-950/60 backdrop-blur-xl border border-white/5 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10 rounded-2xl p-6 transition-all space-y-3 group"
                    >
                      <div className="w-11 h-11 bg-violet-500/10 border border-violet-500/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shadow-violet-500/20">
                        <Icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition-colors">{f.title}</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-normal">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Commands Directory Preview */}
            <section className="bg-neutral-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Список команд чат-менеджера</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Свыше 40 встроенных команд с удобным поиском и синтаксисом
                  </p>
                </div>
                <button
                  onClick={() => changeView('commands')}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 border border-violet-400/20 transition-all cursor-pointer"
                >
                  Открыть всю документацию
                </button>
              </div>

              <CommandsDirectory />
            </section>

            {/* Quick Rules Preview Banner */}
            <section className="bg-neutral-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/20">
                  <BookOpen className="w-5 h-5 text-violet-400" />
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
                  className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 hover:border-violet-500/40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Читать правила
                </button>
                <button
                  onClick={() => changeView('privacy')}
                  className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 hover:border-violet-500/40 text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Интерактивная База Команд</h1>
                <p className="text-xs text-neutral-400 mt-1">Полный список доступных команд «Mint» с описанием и синтаксисом</p>
              </div>
              <button
                onClick={() => changeView('landing')}
                className="px-3.5 py-1.5 bg-neutral-900/80 border border-white/10 text-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-800 hover:border-violet-500/40 transition-all cursor-pointer"
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
      </main>

      {/* Footer (Clean, no control panel) */}
      <footer className="border-t border-white/5 bg-black/80 backdrop-blur-xl py-8 text-xs text-neutral-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => changeView('landing')}
            className="flex items-center gap-2.5 font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span>«Mint» © 2026. Чат-менеджер для бесед ВКонтакте.</span>
          </button>

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => changeView('landing')} className="hover:text-violet-300 transition-colors cursor-pointer">
              Главная
            </button>
            <button onClick={() => changeView('commands')} className="hover:text-violet-300 transition-colors cursor-pointer">
              Команды
            </button>
            <button onClick={() => changeView('rules')} className="hover:text-violet-300 transition-colors cursor-pointer">
              Регламент и правила
            </button>
            <button onClick={() => changeView('privacy')} className="hover:text-violet-300 transition-colors cursor-pointer">
              Конфиденциальность
            </button>
            <a
              href="https://vk.ru/app6441755_-239281784"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 font-bold"
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
