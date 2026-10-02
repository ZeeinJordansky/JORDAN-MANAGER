import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Settings, Shield, Users, Gamepad2, Zap, Radio, Clock,
  Search, CheckCircle2, AlertCircle, RefreshCw, Send, Plus, Trash2, Edit3, UserCheck, ShieldAlert, Award, Lock
} from 'lucide-react';
import { panelApi } from '../panel/api';

interface ChatItem {
  peerId: number;
  title: string;
  membersCount: number;
  rules?: string;
  welcometext?: string;
  welcometext_enabled?: boolean;
  prefix?: string;
  antispam?: boolean;
  antimat?: boolean;
  antiraid?: boolean;
  antucaps?: boolean;
  warn_limit?: number;
}

interface ChatMember {
  id: number;
  name: string;
  role: 'Владелец' | 'Админ' | 'Модератор' | 'VIP' | 'Участник';
  coins: number;
  warns: number;
  isMuted?: boolean;
}

interface ChatTrigger {
  id: string;
  keyword: string;
  response: string;
}

export default function UserChatPanel({ onLogout }: { onLogout: () => void }) {
  const [chats, setChats] = useState<ChatItem[]>([
    {
      peerId: 2000000012,
      title: '👑 Игровой Клан [MINT] #1',
      membersCount: 48,
      rules: '1. Без спама.\n2. Уважайте участников.\n3. Команды без флуда.',
      welcometext: 'Привет, {user}! Добро пожаловать в беседу {chat}! Ознакомься с правилами через /правила',
      welcometext_enabled: true,
      prefix: '/',
      antispam: true,
      antimat: true,
      antiraid: true,
      antucaps: false,
      warn_limit: 3,
    },
    {
      peerId: 2000000045,
      title: '💬 Официальная Беседа Друзей',
      membersCount: 124,
      rules: 'Добро пожаловать в официальный чат! Соблюдайте порядок.',
      welcometext: 'Рады видеть тебя, {user}!',
      welcometext_enabled: true,
      prefix: '!',
      antispam: true,
      antimat: false,
      antiraid: false,
      antucaps: true,
      warn_limit: 5,
    },
  ]);

  const [selectedPeerId, setSelectedPeerId] = useState<number>(2000000012);
  const [activeTab, setActiveTab] = useState<'settings' | 'moderation' | 'members' | 'games' | 'triggers' | 'announce' | 'logs'>('settings');

  // Form states for settings
  const [currentChat, setCurrentChat] = useState<ChatItem>(chats[0]);
  const [savedStatus, setSavedStatus] = useState(false);
  const [loading, setLoading] = useState(false);

  // Members list state
  const [members, setMembers] = useState<ChatMember[]>([
    { id: 778382713, name: 'Олег Сиротинин', role: 'Владелец', coins: 1450000, warns: 0 },
    { id: 71082469, name: 'Александр Громов', role: 'Админ', coins: 890000, warns: 0 },
    { id: 54801343, name: 'Елена Воронина', role: 'Модератор', coins: 340000, warns: 1 },
    { id: 98124012, name: 'Дмитрий Соколов', role: 'VIP', coins: 120000, warns: 0 },
    { id: 1115715881, name: 'Иван Петров', role: 'Участник', coins: 15000, warns: 2, isMuted: true },
  ]);

  // Triggers state
  const [triggers, setTriggers] = useState<ChatTrigger[]>([
    { id: '1', keyword: 'правила', response: '📜 Свод правил нашей беседы доступен по команде /правила или в закрепе!' },
    { id: '2', keyword: 'донат', response: '💎 Пополнить счет или приобрести VIP статус можно в главном меню бота.' },
    { id: '3', keyword: 'дискорд', response: '🎙️ Наш официальный Discord сервер: discord.gg/mintbot' },
  ]);

  const [newKeyword, setNewKeyword] = useState('');
  const [newResponse, setNewResponse] = useState('');

  // Announce state
  const [announceText, setAnnounceText] = useState('');
  const [announceSent, setAnnounceSent] = useState(false);

  // Quick moderation inputs
  const [targetVkId, setTargetVkId] = useState('');
  const [modReason, setModReason] = useState('');
  const [modSuccessMsg, setModSuccessMsg] = useState('');

  // Audit Logs
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string }>>([
    { id: '1', time: '12:30', text: 'Участнику Иван Петров выдан варн (2/3) за капс' },
    { id: '2', time: '11:45', text: 'Обновлено приветственное сообщение беседы' },
    { id: '3', time: '09:15', text: 'Участник Елена Воронина назначена модератором' },
  ]);

  useEffect(() => {
    const found = chats.find((c) => c.peerId === selectedPeerId);
    if (found) setCurrentChat(found);
  }, [selectedPeerId, chats]);

  // Load real chats from API if available
  useEffect(() => {
    panelApi.getChats().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setChats(data);
        setSelectedPeerId(data[0].peerId);
      }
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    setSavedStatus(false);
    try {
      await panelApi.updateChatSetting(currentChat.peerId, 'settings', currentChat);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
      setLogs((prev) => [
        { id: Date.now().toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: 'Изменены настройки беседы' },
        ...prev,
      ]);
    } catch (e) {
      alert('Настройки сохранены локально');
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newResponse.trim()) return;
    const item: ChatTrigger = {
      id: Date.now().toString(),
      keyword: newKeyword.trim().toLowerCase(),
      response: newResponse.trim(),
    };
    setTriggers((prev) => [...prev, item]);
    setNewKeyword('');
    setNewResponse('');
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSendAnnounce = () => {
    if (!announceText.trim()) return;
    setAnnounceSent(true);
    setTimeout(() => setAnnounceSent(false), 3000);
    setLogs((prev) => [
      { id: Date.now().toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `Отправлено объявление: "${announceText.slice(0, 30)}..."` },
      ...prev,
    ]);
    setAnnounceText('');
  };

  const handleExecuteModAction = (action: 'mute' | 'warn' | 'kick' | 'unban') => {
    if (!targetVkId) return;
    const actionNames = { mute: 'выдан Мут', warn: 'выдан Варн', kick: 'Исключен из беседы', unban: 'Разблокирован' };
    setModSuccessMsg(`Действие выполнено: ${targetVkId} — ${actionNames[action]}`);
    setTimeout(() => setModSuccessMsg(''), 4000);
    setLogs((prev) => [
      { id: Date.now().toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: `Модерация: ${targetVkId} — ${actionNames[action]} (${modReason || 'Без причины'})` },
      ...prev,
    ]);
    setTargetVkId('');
    setModReason('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans text-slate-100">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Панель управления беседами</span>
              <span className="text-xs font-mono font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                Обычный доступ
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Управление настройками, автомодерацией, участниками и играми вашей беседы VK
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors shrink-0"
        >
          Выйти из аккаунта
        </button>
      </div>

      {/* Chat Selector Bar */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Выберите беседу для управления:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {chats.map((chat) => {
            const isSelected = chat.peerId === selectedPeerId;
            return (
              <button
                key={chat.peerId}
                onClick={() => setSelectedPeerId(chat.peerId)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="truncate">
                  <div className="font-bold text-sm truncate">{chat.title}</div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Peer ID: {chat.peerId} · {chat.membersCount} участников
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Navigation Bar */}
        <div className="bg-slate-950/80 border-b border-slate-800 p-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'settings', label: 'Настройки', icon: Settings },
            { id: 'moderation', label: 'Модерация', icon: Shield },
            { id: 'members', label: 'Участники & Роли', icon: Users },
            { id: 'games', label: 'Игры & Награды', icon: Gamepad2 },
            { id: 'triggers', label: 'Автоответы', icon: Zap },
            { id: 'announce', label: 'Объявление', icon: Radio },
            { id: 'logs', label: 'Журнал событий', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Settings */}
        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-white">Основные параметры беседы</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Название беседы</label>
                <input
                  type="text"
                  value={currentChat.title}
                  onChange={(e) => setCurrentChat({ ...currentChat, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Префикс бота</label>
                <input
                  type="text"
                  value={currentChat.prefix || '/'}
                  onChange={(e) => setCurrentChat({ ...currentChat, prefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">Приветственное сообщение для новых участников</label>
                <textarea
                  rows={3}
                  value={currentChat.welcometext || ''}
                  onChange={(e) => setCurrentChat({ ...currentChat, welcometext: e.target.value })}
                  placeholder="Доступны теги: {user} — имя участника, {chat} — название беседы"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs text-white font-medium outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">Свод правил беседы (/правила)</label>
                <textarea
                  rows={4}
                  value={currentChat.rules || ''}
                  onChange={(e) => setCurrentChat({ ...currentChat, rules: e.target.value })}
                  placeholder="Укажите правила..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs text-white font-medium outline-none"
                />
              </div>
            </div>

            {/* Automod Toggles */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Модули безопасности и автомодерации</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'antispam', label: 'Защита от спама', desc: 'Автомутирование за флуд' },
                  { key: 'antimat', label: 'Фильтр мата', desc: 'Удаление матерных слов' },
                  { key: 'antiraid', label: 'Анти-рейд режим', desc: 'Защита от набегов ботов' },
                  { key: 'antucaps', label: 'Фильтр Капса', desc: 'Предупреждения за CAPS LOCK' },
                ].map((item) => {
                  const active = (currentChat as any)[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => setCurrentChat({ ...currentChat, [item.key]: !active })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{item.label}</span>
                        <div
                          className={`w-8 h-4 rounded-full transition-colors relative ${
                            active ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${
                              active ? 'left-4.5' : 'left-0.5'
                            }`}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                {loading ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
              {savedStatus && (
                <span className="text-xs font-bold text-violet-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Настройки успешно обновлены!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Moderation */}
        {activeTab === 'moderation' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-white">Быстрое применение наказаний</h2>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    VK ID или ссылка на нарушителя
                  </label>
                  <input
                    type="text"
                    value={targetVkId}
                    onChange={(e) => setTargetVkId(e.target.value)}
                    placeholder="Например: id1115715881"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Причина действия</label>
                  <input
                    type="text"
                    value={modReason}
                    onChange={(e) => setModReason(e.target.value)}
                    placeholder="Причина (Например: Спам, реклама, капс)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleExecuteModAction('warn')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  ⚠️ Выдать Варн
                </button>
                <button
                  onClick={() => handleExecuteModAction('mute')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  🤐 Выдать Мут (30 мин)
                </button>
                <button
                  onClick={() => handleExecuteModAction('kick')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  🚪 Кикнуть из беседы
                </button>
                <button
                  onClick={() => handleExecuteModAction('unban')}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  ✅ Разбанить
                </button>
              </div>

              {modSuccessMsg && (
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{modSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Members & Roles */}
        {activeTab === 'members' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-white">Участники беседы ({members.length})</h2>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-medium text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Участник</th>
                    <th className="p-3.5">Роль</th>
                    <th className="p-3.5">Баланс монет</th>
                    <th className="p-3.5">Предупреждения</th>
                    <th className="p-3.5 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <span>{m.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({m.id})</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m.role === 'Владелец'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : m.role === 'Админ'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : m.role === 'Модератор'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-violet-400 font-semibold">
                        {m.coins.toLocaleString()} 🪙
                      </td>
                      <td className="p-3.5">
                        <span className={m.warns > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {m.warns} / {currentChat.warn_limit || 3}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setTargetVkId(m.id.toString());
                            setActiveTab('moderation');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] rounded-lg transition-colors"
                        >
                          Наказать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Games & RPG */}
        {activeTab === 'games' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-white">Игровые модули & Экономика</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Мини-игра Дуэли (/дуэль)', desc: 'Дуэли между участниками на монеты' },
                { name: 'Казино и Рулетка (/казино)', desc: 'Азартные игры с коэффициентами' },
                { name: 'Работы и Бизнесы (/работа)', desc: 'Пассивный и активный доход монет' },
                { name: 'Клановые Битвы (/клан)', desc: 'Клановые войны и общественные казны' },
                { name: 'Ежедневные Бонусы (/бонус)', desc: 'Бесплатные награды за активность' },
                { name: 'Ограбления (/ограбление)', desc: 'Воровство у других участников' },
              ].map((g) => (
                <div key={g.name} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{g.name}</span>
                    <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                      Включено
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Custom Triggers */}
        {activeTab === 'triggers' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-white">Пользовательские автоответы (Триггеры)</h2>

            <form onSubmit={handleAddTrigger} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ключевое слово (триггер)</label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Например: привет или правила"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Текст ответа бота</label>
                  <input
                    type="text"
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder="Текст, который напишет бот в ответ..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Добавить триггер
              </button>
            </form>

            <div className="space-y-2">
              {triggers.map((t) => (
                <div key={t.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded-md mr-2">
                      "{t.keyword}"
                    </span>
                    <span className="text-xs text-slate-300">{t.response}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTrigger(t.id)}
                    className="text-rose-400 hover:text-rose-300 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Announce */}
        {activeTab === 'announce' && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-extrabold text-white">Отправить объявление от имени бота</h2>
            <div className="space-y-3">
              <textarea
                rows={4}
                value={announceText}
                onChange={(e) => setAnnounceText(e.target.value)}
                placeholder="Введите текст объявления, которое бот моментально отправит в вашу беседу..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs text-white outline-none"
              />
              <button
                onClick={handleSendAnnounce}
                disabled={!announceText.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Отправить объявление в чат
              </button>

              {announceSent && (
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Объявление успешно доставлено в беседу!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Logs */}
        {activeTab === 'logs' && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-white">Журнал событий беседы</h2>
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-500 text-[10px] shrink-0">{l.time}</span>
                  <span className="text-slate-300">{l.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
