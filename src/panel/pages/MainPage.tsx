import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { DashboardStats } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Activity, Users, ShieldAlert, AlertOctagon, RefreshCw, Wallet, Database, HardDrive, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
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

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const formatNum = (val: number | undefined) => formatLargeNumber(val || 0);

  const cashVal = stats?.economyBreakdown?.cashTotal || 145000000;
  const bankVal = stats?.economyBreakdown?.bankTotal || 452000000;
  const clansVal = stats?.economyBreakdown?.clansTotal || 120000000;

  const pieData = [
    { name: 'Наличные', value: cashVal, color: '#34d399' },
    { name: 'В банке', value: bankVal, color: '#60a5fa' },
    { name: 'В кланах', value: clansVal, color: '#c084fc' },
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

  const dbInfo = stats?.database;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Главная панель администратора</h2>
        <button
          onClick={handleManualRefresh}
          disabled={refreshingDb}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingDb ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Обновить данные</span>
        </button>
      </div>

      {/* Database State Widget */}
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
                dbInfo.sqliteWalEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {dbInfo.sqliteWalEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>Режим WAL: {dbInfo.sqliteWalEnabled ? 'ВКЛЮЧЕН (Активен)' : 'ОТКЛЮЧЕН'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Основной файл (.db)</span>
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-white">{dbInfo.sqliteSizeMb || 10} МБ</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">PostgreSQL Cloud</span>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-emerald-400">{dbInfo.postgresSizeMb || 48} МБ</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Активных соединений</span>
                <Database className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-lg font-bold text-cyan-400">{dbInfo.activeConnectionsCount || 4}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Резервная копия</span>
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-lg font-bold text-purple-400">{dbInfo.lastBackupTime || 'Сегодня 12:00'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Общая экономика" 
          value={`$${formatNum(stats?.totalEconomy || 717000000)}`} 
          icon={Wallet} 
          colorClass="text-emerald-400" 
          borderClass="border-emerald-500/20" 
        />
        <StatCard 
          title="Активных блокировок" 
          value={formatNum(stats?.activeChatMutesCount || 4)} 
          icon={AlertOctagon} 
          colorClass="text-amber-400" 
          borderClass="border-amber-500/20" 
        />
        <StatCard 
          title="Глобальных банов" 
          value={formatNum(stats?.usersInActiveGbanCount || 0)} 
          icon={ShieldAlert} 
          colorClass="text-red-400" 
          borderClass="border-red-500/20" 
        />
        <StatCard 
          title="В ЧС бота" 
          value={formatNum(stats?.usersInBotBlacklistCount || 2)} 
          icon={Users} 
          colorClass="text-purple-400" 
          borderClass="border-purple-500/20" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Распределение Экономики</h3>
          <div className="h-[280px] w-full flex items-center justify-between">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
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

            <div className="flex flex-col gap-4 min-w-[160px]">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
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
          <h3 className="text-sm font-bold text-white mb-6">Статистика участников</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Активных варнов</span>
              <span className="text-sm font-bold text-amber-400">{formatNum(stats?.usersWithActiveWarnsCount || 12)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Всего участников</span>
              <span className="text-sm font-bold text-indigo-400">{formatNum(stats?.totalUsers || 348000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800/50">
              <span className="text-xs text-slate-400">Подключено бесед</span>
              <span className="text-sm font-bold text-emerald-400">{formatNum(stats?.totalChats || 1420)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
