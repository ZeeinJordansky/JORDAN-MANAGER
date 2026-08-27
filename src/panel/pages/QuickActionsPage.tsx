import React, { useState } from 'react';
import { panelApi } from '../api';
import { Zap, Search, ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatLargeNumber } from '../utils';
import { BotUserItem } from '../types';

export default function QuickActionsPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<BotUserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    try {
      const data = await panelApi.searchBotUsers(search);
      setUsers(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!confirm('Подтвердите выполнение глобального действия')) return;
    try {
      const res = await panelApi.executeQuickAction(action);
      alert(res.message || 'Выполнено');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Быстрые действия</h2>
        <p className="text-xs text-slate-400">Управление пользователями бота и системными утилитами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск юзера по ID или Имени..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="absolute right-2 top-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
              {loading ? '...' : 'Найти'}
            </button>
          </form>

          {users.map(u => (
            <div key={u.userId} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{u.fullName || u.nick} <span className="text-slate-500 font-mono text-xs ml-2">ID: {u.userId}</span></h3>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span>Баланс: <span className="text-emerald-400 font-medium">${formatLargeNumber(u.balance || 0)}</span></span>
                  <span>Роль: <span className="text-indigo-400 font-medium">{u.role || 'Пользователь'}</span></span>
                  {u.isGameBanned && <span className="text-red-400 font-bold">GBAN</span>}
                  {u.isBlacklisted && <span className="text-slate-500 font-bold">ЧС</span>}
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && search && !loading && (
            <div className="text-center p-8 text-slate-500 text-sm">Ничего не найдено</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Системные скрипты
            </h3>
            <button 
              onClick={() => handleAction('deploy-tables')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Развернуть таблицы БД</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Инициализирует пустые таблицы</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
