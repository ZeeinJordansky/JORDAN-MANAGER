import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, MessageSquare, Database, Settings, LogOut, Users, DollarSign, Beer, 
  Building2, Coins, Gamepad2, RefreshCw, Zap, Monitor, ToggleLeft, ToggleRight, 
  ShieldAlert, KeyRound, Check, AlertTriangle, Save, Plus, Trash2, Edit2, FileText, CheckSquare
} from 'lucide-react';
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
type SettingsSubTab = 'general' | 'chats' | 'promos';

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
  globalSettings?: {
    jcRate: number;
    duelMultiplier: number;
    rouletteMultiplier: number;
    prizeMultiplier: number;
    inviteRewardEnabled: boolean;
  };
}

export default function Dashboard({ secret, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Special Access State (shares state with localStorage)
  const [isSpecial, setIsSpecial] = useState(() => {
    return localStorage.getItem('session_is_special') === 'true';
  });
  const [specialCodeInput, setSpecialCodeInput] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // General Settings inputs
  const [jcRateInput, setJcRateInput] = useState('95000000');
  const [duelMult, setDuelMult] = useState('2');
  const [rouletteMult, setRouletteMult] = useState('3');
  const [prizeMult, setPrizeMult] = useState('1');
  const [inviteReward, setInviteReward] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Chat settings list state
  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [welcomeTextEdit, setWelcomeTextEdit] = useState('');

  // Promocodes list state
  const [promos, setPromos] = useState<any[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState('деньги');
  const [newPromoValue, setNewPromoValue] = useState('50000');
  const [newPromoMax, setNewPromoMax] = useState('100');
  const [creatingPromo, setCreatingPromo] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.globalSettings) {
          setJcRateInput(String(data.globalSettings.jcRate));
          setDuelMult(String(data.globalSettings.duelMultiplier));
          setRouletteMult(String(data.globalSettings.rouletteMultiplier));
          setPrizeMult(String(data.globalSettings.prizeMultiplier));
          setInviteReward(data.globalSettings.inviteRewardEnabled);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUnlockSpecial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialCodeInput.trim()) {
      setUnlockError('Введите Особый Код!');
      return;
    }
    setUnlockLoading(true);
    setUnlockError('');
    try {
      const res = await fetch('/api/auth/unlock-special', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({ code: specialCodeInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.isSpecial) {
        localStorage.setItem('session_is_special', 'true');
        setIsSpecial(true);
        showToast('Особый доступ получен!');
        setSpecialCodeInput('');
      } else {
        setUnlockError(data.error || 'Неверный Особый Код!');
      }
    } catch (err) {
      setUnlockError('Ошибка связи с сервером');
    } finally {
      setUnlockLoading(false);
    }
  };

  // Fetch chats from DB
  const fetchChats = async () => {
    if (!isSpecial) return;
    setLoadingChats(true);
    try {
      const res = await fetch('/api/dashboard/db/documents?collection=chats', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChats(false);
    }
  };

  // Fetch promos from DB
  const fetchPromos = async () => {
    if (!isSpecial) return;
    setLoadingPromos(true);
    try {
      const res = await fetch('/api/dashboard/db/documents?collection=promocodes', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPromos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPromos(false);
    }
  };

  // Trigger sub-tab loads
  useEffect(() => {
    if (activeTab === 'settings') {
      if (settingsSubTab === 'chats') fetchChats();
      if (settingsSubTab === 'promos') fetchPromos();
    }
  }, [activeTab, settingsSubTab, isSpecial]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await fetch('/api/dashboard/settings/global', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          jcRate: Number(jcRateInput),
          duelMultiplier: Number(duelMult),
          rouletteMultiplier: Number(rouletteMult),
          prizeMultiplier: Number(prizeMult),
          inviteRewardEnabled: inviteReward
        })
      });
      if (res.ok) {
        showToast('Экономические настройки успешно сохранены!');
        fetchStats();
      } else {
        showToast('Ошибка при сохранении настроек', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleToggleChatOption = async (chat: any, field: string) => {
    const updatedVal = !chat[field];
    try {
      const res = await fetch('/api/dashboard/db/save-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: 'chats',
          docId: chat._id,
          data: { [field]: updatedVal }
        })
      });
      if (res.ok) {
        showToast('Настройки чата обновлены!');
        setChats(prev => prev.map(c => c._id === chat._id ? { ...c, [field]: updatedVal } : c));
      } else {
        showToast('Не удалось обновить настройки чата', 'error');
      }
    } catch (e) {
      showToast('Ошибка связи при обновлении чата', 'error');
    }
  };

  const handleSaveWelcomeText = async (chatId: string) => {
    try {
      const res = await fetch('/api/dashboard/db/save-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: 'chats',
          docId: chatId,
          data: { 
            welcometext: welcomeTextEdit,
            welcometext_enabled: welcomeTextEdit.trim().length > 0 
          }
        })
      });
      if (res.ok) {
        showToast('Приветственное сообщение сохранено!');
        setChats(prev => prev.map(c => c._id === chatId ? { ...c, welcometext: welcomeTextEdit, welcometext_enabled: welcomeTextEdit.trim().length > 0 } : c));
        setEditingChatId(null);
      } else {
        showToast('Ошибка сохранения приветствия', 'error');
      }
    } catch (e) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) {
      showToast('Введите промокод!', 'error');
      return;
    }
    setCreatingPromo(true);
    try {
      const res = await fetch('/api/dashboard/db/save-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: 'promocodes',
          docId: newPromoCode.trim().toLowerCase(),
          data: {
            type: newPromoType,
            value: Number(newPromoValue),
            maxActivations: Number(newPromoMax),
            usedCount: 0,
            usedUsers: []
          }
        })
      });
      if (res.ok) {
        showToast(`Промокод "${newPromoCode}" успешно создан!`);
        setNewPromoCode('');
        fetchPromos();
      } else {
        showToast('Ошибка при создании промокода', 'error');
      }
    } catch (e) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm(`Вы действительно хотите удалить промокод "${promoId}"?`)) return;
    try {
      const res = await fetch('/api/dashboard/db/delete-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: 'promocodes',
          docId: promoId
        })
      });
      if (res.ok) {
        showToast(`Промокод "${promoId}" удален!`);
        fetchPromos();
      } else {
        showToast('Не удалось удалить промокод', 'error');
      }
    } catch (e) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!chatSearch) return true;
    const query = chatSearch.toLowerCase();
    const title = (chat.title || '').toLowerCase();
    const id = (chat._id || '').toLowerCase();
    return title.includes(query) || id.includes(query);
  });

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row text-text-main">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border font-semibold text-xs flex items-center gap-2 shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toast.message}
        </div>
      )}

      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-[240px] bg-bg-main border-b md:border-b-0 md:border-r border-border-dim flex flex-col shrink-0 p-4 md:py-6">
        <div className="px-2 mb-4 md:mb-8 flex items-center justify-between md:block">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-vk-blue rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-900/40 text-lg">
              J
            </div>
            <div>
              <span className="font-extrabold text-lg text-text-main block leading-none">JordanManager</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">VK Bot Console v3.1</span>
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
              {activeTab === 'settings' && 'Конфигурация и Настройки'}
            </h2>
            <p className="text-text-muted text-xs md:text-sm mt-0.5">
              {activeTab === 'settings' 
                ? 'Настройка экономики, игровых коэффициентов, бесед и промокодов'
                : 'Управление экономикой, играми и Callback API VK'}
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
              {/* Visual Stats Widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card p-4 rounded-xl border border-border-dim relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-vk-blue/5 rounded-full blur-2xl group-hover:bg-vk-blue/10 transition-colors" />
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-vk-blue" />
                    Пользователей
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats?.totalUsers ?? '—'}</div>
                  <div className="text-[10px] text-green-400 mt-1 font-medium">Активных профилей в базе</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Деньги в обороте
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {stats ? `${((stats.totalCash + stats.totalBank) / 1000000).toFixed(1)}M$` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">На руках и в банке</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                  <div className="flex items-center gap-2 text-text-muted text-xs font-bold mb-1 uppercase tracking-wider">
                    <Beer className="w-4 h-4 text-amber-400" />
                    Выпито пива
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300">
                    {stats ? `${stats.totalBeer} л.` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 font-medium">За весь игровой период</div>
                </div>

                <div className="bg-bg-card p-4 rounded-xl border border-border-dim relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
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

              {/* Economic & Callback Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bg-card rounded-xl border border-border-dim p-5">
                  <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    Курс Bitcoin (BTC) & Игровые лобби
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted">1 Bitcoin (BTC)</span>
                      <span className="mono text-sm font-bold text-yellow-400">
                        {stats?.jcRate ? `${stats.jcRate.toLocaleString()}$` : '95,000,000$'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-vk-blue" />
                        Активных сессий "Крокодил"
                      </span>
                      <span className="mono text-sm font-bold text-vk-blue">{stats?.activeCrocodiles ?? 0}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-border-dim">
                      <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                        Идет дуэлей в чатах
                      </span>
                      <span className="mono text-sm font-bold text-purple-400">{stats?.activeDuels ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-card rounded-xl border border-border-dim p-5">
                  <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-text-muted">Параметры VK Callback API</h3>
                  <div className="space-y-3">
                    <div className="grid gap-1">
                      <label className="text-[10px] text-text-muted uppercase font-bold">ID Группы VK</label>
                      <div className="mono text-xs bg-black/30 p-2.5 border border-border-dim rounded-lg text-vk-blue font-semibold">239281784</div>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-[10px] text-text-muted uppercase font-bold">Строка подтверждения (Confirmation)</label>
                      <div className="mono text-xs bg-blue-900/10 border border-blue-500/20 p-2.5 rounded-lg text-blue-400 font-semibold">74bdc85e</div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 p-3 rounded-xl mt-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                      <span className="text-green-400 font-bold text-xs">Подключение Webhook активно</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Settings Sub-Tabs navigation */}
              <div className="flex border-b border-border-dim/50 pb-px shrink-0">
                <button
                  onClick={() => setSettingsSubTab('general')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                    settingsSubTab === 'general'
                      ? 'border-[#00BFFF] text-white'
                      : 'border-transparent text-text-muted hover:text-white'
                  }`}
                >
                  Экономика и Общие
                </button>
                <button
                  onClick={() => setSettingsSubTab('chats')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                    settingsSubTab === 'chats'
                      ? 'border-[#00BFFF] text-white'
                      : 'border-transparent text-text-muted hover:text-white'
                  }`}
                >
                  Управление Беседами
                </button>
                <button
                  onClick={() => setSettingsSubTab('promos')}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                    settingsSubTab === 'promos'
                      ? 'border-[#00BFFF] text-white'
                      : 'border-transparent text-text-muted hover:text-white'
                  }`}
                >
                  Промокоды
                </button>
              </div>

              {/* Sub-tab views */}
              <div className="flex-1 overflow-y-auto pr-1">
                {settingsSubTab === 'general' && (
                  <div className="max-w-2xl bg-bg-card rounded-xl border border-border-dim p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-border-dim/50 pb-4">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <div>
                        <h4 className="font-bold text-sm text-white">Игровая Экономика Бота</h4>
                        <p className="text-xs text-text-muted">Коэффициенты и обменные курсы валют</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Курс 1 Jordan's Coin ($)</label>
                        <input
                          type="number"
                          value={jcRateInput}
                          onChange={(e) => setJcRateInput(e.target.value)}
                          className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2.5 text-xs font-mono text-yellow-400 focus:border-[#00BFFF]/50 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Множитель Дуэлей (X)</label>
                        <input
                          type="number"
                          value={duelMult}
                          onChange={(e) => setDuelMult(e.target.value)}
                          className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-[#00BFFF]/50 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Множитель Рулетки (X)</label>
                        <input
                          type="number"
                          value={rouletteMult}
                          onChange={(e) => setRouletteMult(e.target.value)}
                          className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-[#00BFFF]/50 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase">Множитель Ежедн. Призов (X)</label>
                        <input
                          type="number"
                          value={prizeMult}
                          onChange={(e) => setPrizeMult(e.target.value)}
                          className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-[#00BFFF]/50 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-black/20 rounded-xl border border-border-dim">
                      <div>
                        <div className="text-xs font-bold text-white">Награда за приглашение пользователей</div>
                        <div className="text-[10px] text-text-muted">Начислять бонусные средства за добавление участников</div>
                      </div>
                      <button 
                        onClick={() => setInviteReward(!inviteReward)}
                        className="text-[#00BFFF] hover:opacity-85 transition-opacity"
                      >
                        {inviteReward ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-text-muted" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0077ff]/5 rounded-xl border border-[#0077ff]/20">
                      <div>
                        <div className="text-xs font-bold text-white">Пароль авторизации веб-консоли</div>
                        <div className="text-[10px] text-text-muted">Используется для входа в панель JordanManager</div>
                      </div>
                      <span className="text-xs font-bold text-vk-blue font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-border-dim">
                        Jordanmanager
                      </span>
                    </div>

                    <button
                      onClick={handleSaveGeneral}
                      disabled={savingGeneral}
                      className="w-full sm:w-auto px-6 py-3 bg-[#0077ff] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-900/40"
                    >
                      <Save className="w-4 h-4" />
                      {savingGeneral ? 'Сохранение...' : 'Сохранить настройки'}
                    </button>
                  </div>
                )}

                {settingsSubTab === 'chats' && (
                  <div className="space-y-4">
                    {!isSpecial ? (
                      <div className="bg-bg-card rounded-xl border border-border-dim p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <ShieldAlert className="w-12 h-12 text-amber-500" />
                        <div>
                          <h4 className="font-bold text-sm text-white uppercase tracking-wider">ТРЕБУЕТСЯ ОСОБЫЙ ДОСТУП</h4>
                          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                            Для управления беседами, их защитными лимитами, анти-спамом и анти-флудом требуется ввести Особый Код.
                          </p>
                        </div>
                        <form onSubmit={handleUnlockSpecial} className="w-full max-w-xs space-y-2">
                          <input
                            type="password"
                            placeholder="Особый Код (SPECIAL_...)"
                            value={specialCodeInput}
                            onChange={(e) => setSpecialCodeInput(e.target.value)}
                            className="w-full bg-[#0b0e14] border border-border-dim px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-[#00BFFF]/50"
                          />
                          {unlockError && <p className="text-rose-400 text-[10px] text-left font-semibold">{unlockError}</p>}
                          <button
                            type="submit"
                            disabled={unlockLoading}
                            className="w-full py-2 bg-[#0077ff] text-white rounded-xl text-xs font-bold uppercase"
                          >
                            Разблокировать
                          </button>
                        </form>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <span className="text-xs font-bold text-text-muted uppercase">Найдено бесед в сети: {chats.length}</span>
                          <input
                            type="text"
                            placeholder="Поиск по названию или ID..."
                            value={chatSearch}
                            onChange={(e) => setChatSearch(e.target.value)}
                            className="bg-bg-card border border-border-dim rounded-xl px-3 py-2 text-xs text-white min-w-[200px] outline-none focus:border-[#00BFFF]/50"
                          />
                        </div>

                        {loadingChats ? (
                          <div className="p-8 text-center text-text-muted text-xs animate-pulse">Загрузка списка бесед...</div>
                        ) : filteredChats.length === 0 ? (
                          <div className="p-8 text-center text-text-muted text-xs">Активные беседы не найдены</div>
                        ) : (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {filteredChats.map(chat => (
                              <div key={chat._id} className="bg-bg-card rounded-xl border border-border-dim p-4 space-y-4">
                                <div className="flex items-center justify-between gap-2 border-b border-border-dim/50 pb-2">
                                  <div>
                                    <div className="font-bold text-sm text-white">{chat.title || `Беседа #${chat._id}`}</div>
                                    <div className="text-[10px] text-text-muted font-mono mt-0.5">PEER_ID: {chat._id}</div>
                                  </div>
                                  <span className="text-[10px] font-bold bg-[#0077ff]/10 text-white border border-[#0077ff]/20 px-2 py-0.5 rounded">
                                    ТИП: {chat.type || "PL"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Анти-Флуд:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'af')} className="text-[#00BFFF]">
                                      {chat.af ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Анти-Слив:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'antisliv')} className="text-[#00BFFF]">
                                      {chat.antisliv ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Анти-Рейд:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'raid')} className="text-[#00BFFF]">
                                      {chat.raid ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Сообщества:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'group')} className="text-[#00BFFF]">
                                      {chat.group ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Анти-Тег All:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'antiTegAll')} className="text-[#00BFFF]">
                                      {chat.antiTegAll ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between bg-black/25 p-2 rounded-xl border border-border-dim">
                                    <span>Анти-Реклама:</span>
                                    <button onClick={() => handleToggleChatOption(chat, 'antiAd')} className="text-[#00BFFF]">
                                      {chat.antiAd ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="bg-black/15 p-2.5 rounded-xl border border-border-dim text-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-text-muted">Приветствие чата:</span>
                                    <button 
                                      onClick={() => {
                                        setEditingChatId(chat._id);
                                        setWelcomeTextEdit(chat.welcometext || '');
                                      }}
                                      className="text-vk-blue hover:underline text-[11px] font-semibold flex items-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" /> Настроить
                                    </button>
                                  </div>
                                  <p className="text-text-muted italic text-[11px] font-medium leading-relaxed bg-black/40 p-2 rounded-lg">
                                    {chat.welcometext ? `"${chat.welcometext}"` : "Приветственное сообщение отключено"}
                                  </p>
                                </div>

                                {editingChatId === chat._id && (
                                  <div className="bg-black/35 p-3 rounded-xl border border-[#00BFFF]/30 space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase">Текст нового приветствия</label>
                                    <textarea
                                      rows={2}
                                      value={welcomeTextEdit}
                                      onChange={(e) => setWelcomeTextEdit(e.target.value)}
                                      className="w-full bg-[#0b0e14] border border-border-dim rounded-lg p-2 text-xs text-white"
                                      placeholder="Напишите приветствие для новых участников..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button 
                                        onClick={() => setEditingChatId(null)}
                                        className="px-3 py-1 bg-white/5 rounded-lg text-xs"
                                      >
                                        Отмена
                                      </button>
                                      <button 
                                        onClick={() => handleSaveWelcomeText(chat._id)}
                                        className="px-3 py-1 bg-[#0077ff] text-white rounded-lg text-xs font-bold"
                                      >
                                        Сохранить
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {settingsSubTab === 'promos' && (
                  <div className="space-y-6">
                    {!isSpecial ? (
                      <div className="bg-bg-card rounded-xl border border-border-dim p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <ShieldAlert className="w-12 h-12 text-amber-500" />
                        <div>
                          <h4 className="font-bold text-sm text-white uppercase tracking-wider">ТРЕБУЕТСЯ ОСОБЫЙ ДОСТУП</h4>
                          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                            Для управления промокодами ботов, удаления и создания кодов активации требуется ввести Особый Код.
                          </p>
                        </div>
                        <form onSubmit={handleUnlockSpecial} className="w-full max-w-xs space-y-2">
                          <input
                            type="password"
                            placeholder="Особый Код (SPECIAL_...)"
                            value={specialCodeInput}
                            onChange={(e) => setSpecialCodeInput(e.target.value)}
                            className="w-full bg-[#0b0e14] border border-border-dim px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-[#00BFFF]/50"
                          />
                          {unlockError && <p className="text-rose-400 text-[10px] text-left font-semibold">{unlockError}</p>}
                          <button
                            type="submit"
                            disabled={unlockLoading}
                            className="w-full py-2 bg-[#0077ff] text-white rounded-xl text-xs font-bold uppercase"
                          >
                            Разблокировать
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Create Promo Code Form */}
                        <div className="bg-bg-card border border-border-dim rounded-xl p-5 space-y-4 lg:col-span-1">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-vk-blue" />
                            Создать Промокод
                          </h4>

                          <form onSubmit={handleCreatePromo} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-muted uppercase">Название Кода *</label>
                              <input
                                type="text"
                                value={newPromoCode}
                                onChange={(e) => setNewPromoCode(e.target.value)}
                                placeholder="например: jordan2026"
                                className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-muted uppercase">Тип Награды</label>
                              <select
                                value={newPromoType}
                                onChange={(e) => setNewPromoType(e.target.value)}
                                className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2 text-xs text-white outline-none"
                              >
                                <option value="деньги">Игровые Деньги ($)</option>
                                <option value="коин">Jordan's Coin</option>
                                <option value="рейтинг">Очки рейтинга (Rep)</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-muted uppercase">Сумма / Награда</label>
                              <input
                                type="number"
                                value={newPromoValue}
                                onChange={(e) => setNewPromoValue(e.target.value)}
                                className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-muted uppercase">Максимум активаций</label>
                              <input
                                type="number"
                                value={newPromoMax}
                                onChange={(e) => setNewPromoMax(e.target.value)}
                                className="w-full bg-black/40 border border-border-dim rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={creatingPromo}
                              className="w-full py-2.5 bg-[#0077ff] text-white rounded-xl text-xs font-bold uppercase shadow-md shadow-blue-900/30"
                            >
                              {creatingPromo ? 'Создание...' : 'Добавить Промокод'}
                            </button>
                          </form>
                        </div>

                        {/* List of active promocodes */}
                        <div className="bg-bg-card border border-border-dim rounded-xl overflow-hidden lg:col-span-2">
                          <div className="px-4 py-3 border-b border-border-dim bg-black/20 font-bold text-xs uppercase tracking-wider text-text-muted">
                            Активные промокоды ({promos.length})
                          </div>

                          {loadingPromos ? (
                            <div className="p-8 text-center text-text-muted text-xs animate-pulse">Загрузка промокодов...</div>
                          ) : promos.length === 0 ? (
                            <div className="p-8 text-center text-text-muted text-xs">Список активных промокодов пуст</div>
                          ) : (
                            <div className="divide-y divide-border-dim/50 max-h-[450px] overflow-y-auto">
                              {promos.map(p => (
                                <div key={p._id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.01]">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-white font-mono">{p._id}</span>
                                      <span className="text-[10px] font-bold bg-[#0077ff]/10 text-white px-2 py-0.5 rounded uppercase">
                                        {p.type}
                                      </span>
                                    </div>
                                    <div className="text-xs text-text-muted leading-relaxed">
                                      Награда: <span className="text-green-400 font-bold">{Number(p.value).toLocaleString()}</span> | 
                                      Активации: <span className="text-white font-semibold">{p.usedCount || 0} / {p.maxActivations || 100}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleDeletePromo(p._id)}
                                    className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
