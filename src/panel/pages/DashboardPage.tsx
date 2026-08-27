import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Coins, ShieldAlert, UserX, AlertTriangle, Ban, UserCheck, RefreshCw, Activity, MessageSquare } from 'lucide-react';
import { panelApi } from '../api';
import { DashboardStats } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await panelApi.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-300 flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-red-900/60 hover:bg-red-800 rounded-xl text-xs font-semibold text-white transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ru-RU').format(val || 0) + ' $';
  };

  // Economy Pie Chart Data
  const economyPieData = [
    { name: 'На руках пользователей', value: stats?.economyBreakdown?.cashTotal || 0, color: '#6366f1' },
    { name: 'На счетах в банке', value: stats?.economyBreakdown?.bankTotal || 0, color: '#a855f7' },
    { name: 'Казна кланов', value: stats?.economyBreakdown?.clansTotal || 0, color: '#10b981' },
  ];

  // Dummy activity trend data based on total users
  const trendData = [
    { hour: '00:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.2) },
    { hour: '04:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.1) },
    { hour: '08:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.4) },
    { hour: '12:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.75) },
    { hour: '16:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.9) },
    { hour: '20:00', active: Math.floor((stats?.totalUsersCount || 10) * 0.85) },
    { hour: '23:59', active: Math.floor((stats?.totalUsersCount || 10) * 0.5) },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">Обзор Бота и Статистика</h2>
          <p className="text-xs text-slate-400">Мониторинг экономики, активности и модерационных данных</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить данные
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Economy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Общая экономика</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {formatMoney(stats?.totalEconomy || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Сумма всех средств в системе</p>
        </div>

        {/* Active Chat Mutes Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Активные блокировки чата</span>
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {stats?.activeChatMutesCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Бесед с режимом тишины / мута</p>
        </div>

        {/* Users with Active Mute */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Пользователи в муте</span>
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {stats?.usersWithActiveMuteCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">С активной блокировкой общения</p>
        </div>

        {/* Users with Active Warns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Пользователи с варнами</span>
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {stats?.usersWithActiveWarnsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Активные предупреждения {'>'} 0</p>
        </div>

      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Global Ban */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Глобальные блокировки (GBan)</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">
                {stats?.usersInActiveGbanCount || 0} пользователей
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-red-950 text-red-300 border border-red-800/40 rounded-full text-xs font-semibold">
            Игровой ГБан
          </span>
        </div>

        {/* Bot Blacklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Чёрный список Чат-Менеджера</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">
                {stats?.usersInBotBlacklistCount || 0} пользователей
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-950 text-rose-300 border border-rose-800/40 rounded-full text-xs font-semibold">
            ЧС Бота
          </span>
        </div>
      </div>

      {/* Economy Diagram & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Economy Pie Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Диаграмма экономики</h3>
            <p className="text-xs text-slate-400 mb-4">Распределение денежной массы по категориям</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={economyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {economyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Руки</div>
              <div className="text-xs font-bold text-indigo-400 font-mono mt-0.5">
                {formatMoney(stats?.economyBreakdown?.cashTotal || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Банк</div>
              <div className="text-xs font-bold text-purple-400 font-mono mt-0.5">
                {formatMoney(stats?.economyBreakdown?.bankTotal || 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Кланы</div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                {formatMoney(stats?.economyBreakdown?.clansTotal || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Top Rich Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-base font-bold text-white mb-1">Топ богатейших игроков</h3>
          <p className="text-xs text-slate-400 mb-4">Лидеры экономического рейтинга</p>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] pr-1">
            {stats?.economyBreakdown?.topUsers?.length ? (
              stats.economyBreakdown.topUsers.map((u, i) => (
                <div key={u.vkId} className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                      i === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                      {u.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {formatMoney(u.totalWealth)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-8">Нет данных</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
