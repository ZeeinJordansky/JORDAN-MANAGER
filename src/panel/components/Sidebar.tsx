import React from 'react';
import { LayoutDashboard, MessageSquare, Zap, Coins, Radio, MonitorSmartphone, Users, Bot } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRoot: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isRoot }: SidebarProps) {
  const menuItems = [
    { id: 'main', label: 'Главная страница', icon: LayoutDashboard },
    { id: 'chats', label: 'Беседы с чат-менеджером', icon: MessageSquare },
    { id: 'actions', label: 'Быстрые действия', icon: Zap },
    ...(isRoot ? [
      { id: 'economy', label: 'Управление экономикой', icon: Coins },
      { id: 'broadcasts', label: 'Управление рассылками', icon: Radio },
      { id: 'sessions', label: 'Сессии', icon: MonitorSmartphone },
      { id: 'users', label: 'Управление пользователями', icon: Users },
    ] : []),
  ];

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300">
      {/* Brand Profile */}
      <div className="p-6 flex flex-col items-center border-b border-slate-800/60 bg-slate-900/50">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 mb-4">
          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Bot className="w-10 h-10 text-indigo-400" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-white tracking-wide">GAMES MANAGER</h1>
        <p className="text-xs font-medium text-indigo-400 mt-1 uppercase tracking-widest">Панель Управления</p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
              <span className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
