import React, { useState, useEffect } from 'react';
import { Users, LogOut, Check, AlertTriangle, RefreshCw, KeyRound, Monitor } from 'lucide-react';
import { motion } from 'motion/react';

interface SessionsTabProps {
  secret: string;
}

export default function SessionsTab({ secret }: SessionsTabProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/sessions', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        showToast('Ошибка при загрузке списка сессий', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleRevokeSession = async (vkId: number) => {
    try {
      const res = await fetch('/api/dashboard/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({ vkId })
      });

      if (res.ok) {
        showToast(`Сессия пользователя #${vkId} успешно отозвана!`);
        fetchSessions();
      } else {
        showToast('Ошибка при отзыве сессии', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto pr-1">
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

      {/* Header card */}
      <div className="bg-bg-card rounded-xl border border-border-dim p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-[#00BFFF]/20 rounded-xl">
            <Monitor className="w-5 h-5 text-[#00BFFF]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Мониторинг активных сессий</h3>
            <p className="text-xs text-text-muted">Просмотр и принудительное завершение активных сеансов администраторов панели</p>
          </div>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="px-3.5 py-2 bg-bg-main hover:bg-white/5 border border-border-dim rounded-xl text-xs font-semibold text-text-muted flex items-center gap-2 transition-colors self-end md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Обновить список
        </button>
      </div>

      {/* Sessions list */}
      <div className="bg-bg-card rounded-xl border border-border-dim overflow-hidden">
        <div className="px-4 py-3 border-b border-border-dim bg-black/20 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Активные подключения ({sessions.length})
          </span>
          {loading && <span className="text-xs text-[#00BFFF] font-semibold animate-pulse">Загрузка данных...</span>}
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {loading ? 'Загрузка...' : 'Сессии не найдены.'}
          </div>
        ) : (
          <div className="divide-y divide-border-dim/50 max-h-[500px] overflow-y-auto">
            {sessions.map((sess) => {
              const loginDate = new Date(sess.loginTime * 1000).toLocaleTimeString();
              const lastActiveDate = new Date(sess.lastActive * 1000).toLocaleTimeString();
              return (
                <div key={sess.vkId} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono text-xs font-bold bg-[#0077ff]/20 border border-[#0077ff]/30 text-white px-2 py-0.5 rounded-md">
                        ID: {sess.vkId}
                      </span>
                      <span className="font-bold text-sm text-white">{sess.fullName}</span>
                      
                      {sess.isSpecial ? (
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          <KeyRound className="w-3 h-3 text-emerald-400" />
                          Особый доступ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Обычный доступ (ОК)
                        </span>
                      )}

                      {sess.isCurrent && (
                        <span className="text-[10px] font-bold bg-[#0077ff]/20 text-[#00E5FF] border border-[#00BFFF]/30 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_10px_rgba(0,191,255,0.1)]">
                          Вы
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-text-muted flex items-center gap-4 flex-wrap">
                      <span>Время входа: <strong className="text-white font-mono">{loginDate}</strong></span>
                      <span>Активность: <strong className="text-white font-mono">{lastActiveDate}</strong></span>
                      <span>Роль: <strong className="text-sky-400 font-bold">{sess.roleName || `Уровень ${sess.role}`}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 self-end md:self-center">
                    <button
                      disabled={sess.isCurrent}
                      onClick={() => handleRevokeSession(sess.vkId)}
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 disabled:opacity-30 disabled:pointer-events-none text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Отозвать сессию
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
