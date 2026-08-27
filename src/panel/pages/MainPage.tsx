import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { DashboardStats } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, ShieldAlert, AlertOctagon, RefreshCw, HandCoins, Building2, Wallet } from 'lucide-react';
import { formatLargeNumber } from '../utils';

export default function MainPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await panelApi.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Главная страница</h2>
        <button onClick={fetchStats} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

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
