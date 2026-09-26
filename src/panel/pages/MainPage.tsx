import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { DashboardStats } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, ShieldAlert, AlertOctagon, RefreshCw, HandCoins, Building2, Wallet, Database, HardDrive, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { formatLargeNumber } from '../utils';

export default function MainPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingDb, setRefreshingDb] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await panelApi.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshingDb(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshingDb(true);
    fetchStats();
  };

  useEffect(() => {
    fetchStats();
    const int = setInterval(fetchStats, 60000);
    return () => clearInterval(int);
  }, []);

  if (loading || !stats) {
    return <div className="flex h-full items-center justify-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin" /></div>;
  }

  const formatNum = formatLargeNumber;

  const pieData = [
    { name: 'Наличные', value: stats.economyBreakdown.cashTotal, color: '#34d399' },
    { name: 'В банке', value: stats.economyBreakdown.bankTotal, color: '#60a5fa' },
    { name: 'В кланах', value: stats.economyBreakdown.clansTotal, color: '#c084fc' },
  ];

  const StatCard = ({ title, value, icon: Icon, colorClass, borderClass }: any) => (
    <div className={`bg-slate-900 border ${borderClass} rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-white">{value}</h4>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-950 border border-slate-800 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  const dbInfo = stats.database;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Главная страница</h2>
        <button 
          onClick={handleManualRefresh} 
          disabled={refreshingDb}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingDb ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Обновить данные</span>
        </button>
      </div>

      {/* Database & WAL State Widget */}
      {dbInfo && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Состояние базы данных</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">bot_database.db</span>
                </h3>
                <p className="text-xs text-slate-400">Мониторинг физического размера и режима журнала записи</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                dbInfo.walEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {dbInfo.walEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>Режим WAL: {dbInfo.walEnabled ? 'ВКЛЮЧЕН (Активен)' : 'ОТКЛЮЧЕН'}</span>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={refreshingDb}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                title="Обновить статус БД"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingDb ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Основной файл (.db)</span>
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-white">{dbInfo.mainDbFormatted}</p>
              <span className="text-[11px] text-slate-500">{dbInfo.mainDbSize.toLocaleString()} байт</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Журнал WAL (.db-wal)</span>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-emerald-400">{dbInfo.walFormatted}</p>
              <span className="text-[11px] text-slate-500">{dbInfo.walSize.toLocaleString()} байт</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Общий объем на диске</span>
                <Database className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-lg font-bold text-cyan-400">{dbInfo.totalFormatted}</p>
              <span className="text-[11px] text-slate-500">Основная + WAL</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">БД Логов (bot_logs.db)</span>
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-lg font-bold text-purple-400">{dbInfo.logsDbFormatted}</p>
              <span className="text-[11px] text-slate-500">Страниц: {dbInfo.pageCount} (по {dbInfo.pageSize} Б)</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Общая экономика" 
          value={`$${formatNum(stats.totalEconomy)}`} 
          icon={Wallet} 
          colorClass="text-emerald-400" 
          borderClass="border-emerald-500/20" 
        />
        <StatCard 
          title="Активных блокировок" 
          value={formatNum(stats.activeChatMutesCount)} 
          icon={AlertOctagon} 
          colorClass="text-amber-400" 
          borderClass="border-amber-500/20" 
        />
        <StatCard 
          title="Глобальных банов" 
          value={formatNum(stats.usersInActiveGbanCount)} 
          icon={ShieldAlert} 
          colorClass="text-red-400" 
          borderClass="border-red-500/20" 
        />
        <StatCard 
          title="В ЧС бота" 
          value={formatNum(stats.usersInBotBlacklistCount)} 
          icon={Users} 
          colorClass="text-purple-400" 
          borderClass="border-purple-500/20" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Распределение Экономики</h3>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${formatNum(value)}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-4 min-w-[150px]">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-xs text-slate-400">{d.name}</p>
                    <p className="text-sm font-bold text-white">${formatNum(d.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Детализация</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Активных предов</span>
              <span className="text-sm font-bold text-amber-400">{formatNum(stats.usersWithActiveWarnsCount)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Всего юзеров</span>
              <span className="text-sm font-bold text-indigo-400">{formatNum(stats.totalUsersCount)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Всего чатов</span>
              <span className="text-sm font-bold text-emerald-400">{formatNum(stats.totalChatsCount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
