import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Database, Settings, LogOut, Users, DollarSign, Beer, Building2, Coins, Gamepad2, RefreshCw, Zap, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import MessagesTab from './MessagesTab';
import DatabaseTab from './DatabaseTab';
import QuickActionsTab from './QuickActionsTab';
import SessionsTab from './SessionsTab';

interface DashboardProps {
  secret: string;
  onLogout: () => void;
}

type Tab = 'stats' | 'messages' | 'database' | 'quick-actions' | 'sessions' | 'settings';

interface StatsData {
  totalUsers: number;
  totalCash: number;
  totalBank: number;
  totalBeer: string;
  totalBusinesses: number;
  jcRate: number;
  activeCrocodiles: number;
  activeDuels: number;
  activeRps: number;
}

export default function Dashboard({ secret, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row text-text-main">
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-[240px] bg-bg-main border-b md:border-b-0 md:border-r border-border-dim flex flex-col shrink-0 p-4 md:py-6">
        <div className="px-2 mb-4 md:mb-8 flex items-center justify-between md:block">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-vk-blue rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-900/40 text-lg">
              J
            </div>
            <div>
              <span className="font-extrabold text-lg text-text-main block leading-none">JordanManager</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">VK Bot Console v3.0</span>
            </div>
          </div>
          <button onClick={onLogout} className="md:hidden text-text-muted hover:text-red-400 p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Панель управления
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'messages' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Сообщения
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'database' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4" />
            База данных
          </button>
          <button
            onClick={() => setActiveTab('quick-actions')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'quick-actions' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" />
            Быстрые действия
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'sessions' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Мониторинг сессий
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-vk-blue text-white shadow-md shadow-blue-900/30' : 'text-text-muted hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            Настройки
          </button>
        </nav>

        <div className="hidden md:block px-2 mt-auto pt-6 border-t border-border-dim/50">
          <div className="text-[11px] text-text-muted mb-4 leading-relaxed">
            Статус: <span className="text-green-500 font-bold">● В сети</span><br />
            Группа: <span className="text-vk-blue font-semibold">239281784</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            Выйти из консоли
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-text-main flex items-center gap-2">
              {activeTab === 'stats' && 'Панель управления ботом'}
              {activeTab === 'messages' && 'Личные сообщения'}
              {activeTab === 'database' && 'Управление Базой Данных'}
              {activeTab === 'quick-actions' && 'Быстрые действия (GBAN)'}
              {activeTab === 'sessions' && 'Мониторинг сессий'}
              {activeTab === 'settings' && 'Настройки и Конфигурация'}
            </h2>
            <p className="text-text-muted text-xs md:text-sm mt-0.5">
              Управление экономикой, играми и Callback API VK
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchStats}
              disabled={loadingStats}
              className="bg-bg-card hover:bg-white/10 text-text-main border border-border-dim px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
              Обновить данные
            </button>
          </div>
        </header>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeTab === 'messages' && <MessagesTab secret={secret} />}
          {activeTab === 'database' && <DatabaseTab secret={secret} />}
          {activeTab === 'quick-actions' && <QuickActionsTab secret={secret} />}
          {activeTab === 'sessions' && <SessionsTab secret={secret} />}

          {activeTab === 'stats' && (
            <div className="space-y-6 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card p-4 rounded-xl border border-border-dim">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-vk-blue" />
                    Пользователей
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats?.totalUsers ?? '—'}</div>
                  <div className="text-[10px] text-green-400 mt-1 font-medium">Активных профилей</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Деньги в обороте
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {stats ? `${((stats.totalCash + stats.totalBank) / 1000000).toFixed(1)}M$` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">На руках и в банке</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <Beer className="w-4 h-4 text-amber-400" />
                    Выпито пива
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300">
                    {stats ? `${stats.totalBeer} л.` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">За текущий период</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    Всего бизнесов
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-300">
                    {stats?.totalBusinesses ?? '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">Куплено игроками</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bg-card rounded-xl border border-border-dim p-5">
                  <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    Курс JORDAN'S COIN & Игры
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted">1 JORDAN'S COIN</span>
                      <span className="mono text-sm font-bold text-yellow-400">
                        {stats?.jcRate ? `${stats.jcRate.toLocaleString()}$` : '95,000,000$'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-vk-blue" />
                        Активных лобби "Крокодил"
                      </span>
                      <span className="mono text-sm font-bold text-vk-blue">{stats?.activeCrocodiles ?? 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                        Активных дуэлей
                      </span>
                      <span className="mono text-sm font-bold text-purple-400">{stats?.activeDuels ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-card rounded-xl border border-border-dim p-5">
                  <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-text-muted">Параметры VK Callback API</h3>
                  <div className="space-y-3">
                    <div className="grid gap-1">
                      <label className="text-[10px] text-text-muted uppercase font-bold">ID Сообщества VK</label>
                      <div className="mono text-xs bg-black/30 p-2.5 border border-border-dim rounded-lg text-vk-blue font-semibold">239281784</div>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] text-text-muted uppercase font-bold">Код подтверждения (Confirmation String)</label>
                      <div className="mono text-xs bg-blue-900/10 border border-blue-500/20 p-2.5 rounded-lg text-blue-400 font-semibold">0bffd2d1</div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 p-3 rounded-xl mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                      <span className="text-green-400 font-bold text-xs">Callback Webhook Активен</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-bg-card rounded-xl border border-border-dim p-6 max-w-2xl space-y-6">
              <h3 className="font-bold text-base text-text-main">Параметры безопасности и системы</h3>
              
              <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-border-dim">
                <div>
                  <div className="font-semibold text-sm text-text-main">Секретный код консоли</div>
                  <div className="text-xs text-text-muted mt-0.5">Для авторизации в панели управления</div>
                </div>
                <div className="mono text-xs bg-bg-main px-3 py-1.5 rounded-lg border border-border-dim text-vk-blue font-bold">
                  Jordanmanager
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase">Ограничители и Команды</label>
                <div className="p-4 bg-black/30 rounded-xl border border-border-dim text-xs text-text-muted leading-relaxed space-y-1">
                  <p><strong className="text-white">Разделитель:</strong> <code className="text-vk-blue font-bold">=======</code></p>
                  <p><strong className="text-white">Кулдаун цитаты:</strong> 10 секунд</p>
                  <p><strong className="text-white">Кулдаун пива:</strong> 1 час</p>
                  <p><strong className="text-white">Лимит строки цитаты:</strong> 13 символов (автоперенос на новую строку)</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
