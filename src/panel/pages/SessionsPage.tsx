import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { PanelSession } from '../types';
import { MonitorSmartphone, Trash2, ShieldAlert, RefreshCw, Globe, MapPin } from 'lucide-react';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<PanelSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const data = await panelApi.getSessions();
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm('Вы уверены, что хотите завершить эту сессию?')) return;
    try {
      await panelApi.revokeSession(id);
      fetchSessions();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="flex justify-center p-10 text-slate-500"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Активные сессии</h2>
          <p className="text-xs text-slate-400">Управление авторизованными пользователями панели</p>
        </div>
        <button onClick={fetchSessions} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions.map((s) => (
          <div key={s.id} className={`p-5 rounded-2xl border ${s.isCurrent ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-slate-900 border-slate-800'} flex items-center justify-between`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                <MonitorSmartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-white">{s.login}</h3>
                  {s.isRoot && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 uppercase tracking-wider">Root</span>
                  )}
                  {s.isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase tracking-wider">Текущая</span>
                  )}
                </div>
                
                {/* Format explicitly requested by user */}
                <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/60 inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-white font-semibold">{s.login}</span>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-emerald-400"/> IP Адрес: <span className="text-slate-300">{s.ip}</span></span>
                  <span className="text-slate-600">|</span>
                  <span>Провайдер: <span className="text-slate-300">{s.provider}</span></span>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-400"/> Город: <span className="text-slate-300">{s.city}</span></span>
                </div>
                
                <div className="mt-3 text-[10px] text-slate-500">
                  Вход: {new Date(s.loginTime * 1000).toLocaleString('ru-RU')} • Активность: {new Date(s.lastActive * 1000).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>

            {!s.isCurrent && (
              <button
                onClick={() => handleRevoke(s.id)}
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors"
                title="Завершить сессию"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
