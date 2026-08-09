import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Zap, TableProperties, Check, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickActionsTabProps {
  secret: string;
}

export default function QuickActionsTab({ secret }: QuickActionsTabProps) {
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [immunityData, setImmunityData] = useState<any | null>(null);
  const [checkingImmunity, setCheckingImmunity] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounced check for immunity status
  useEffect(() => {
    if (!targetId.trim()) {
      setImmunityData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingImmunity(true);
      try {
        const res = await fetch(`/api/dashboard/user-immunity-status?vkId=${targetId.trim()}`, {
          headers: { 'Authorization': `Bearer ${secret}` }
        });
        if (res.ok) {
          const data = await res.json();
          setImmunityData(data);
        } else {
          setImmunityData(null);
        }
      } catch (e) {
        setImmunityData(null);
      } finally {
        setCheckingImmunity(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [targetId, secret]);

  const handleGlobalAction = async (actionType: 'gban' | 'gbanpl') => {
    if (!targetId.trim()) {
      showToast('Укажите VK ID цели!', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Укажите причину действия!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/quick-actions/global-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          targetVkId: targetId.trim(),
          actionType,
          reason: reason.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Действие выполнено успешно!');
        setTargetId('');
        setReason('');
      } else {
        showToast(data.error || 'Ошибка при выполнении действия', 'error');
      }
    } catch (e) {
      showToast('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/quick-actions/deploy-tables', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Все необходимые таблицы успешно развернуты!');
      } else {
        showToast(data.error || 'Ошибка развертывания таблиц', 'error');
      }
    } catch (e) {
      showToast('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
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

      {/* Deploy tables card */}
      <div className="bg-bg-card rounded-xl border border-border-dim p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-sky-500/10 border border-[#00BFFF]/20 rounded-xl shrink-0">
              <TableProperties className="w-5 h-5 text-[#00BFFF]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Автоматическое развертывание таблиц</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Инициализирует недостающие системные таблицы и коллекции (<code className="text-sky-400">bans</code>, <code className="text-sky-400">mutes</code>, <code className="text-sky-400">warns</code>, <code className="text-sky-400">globalban</code>, <code className="text-sky-400">panel_logs</code>) в Firestore.
              </p>
            </div>
          </div>
          <button
            onClick={handleDeployTables}
            disabled={loading}
            className="px-4 py-2.5 bg-[#0077ff] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-md shadow-blue-900/30 shrink-0 uppercase tracking-wider"
          >
            Запустить развертывание
          </button>
        </div>
      </div>

      {/* Global Actions Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-bg-card rounded-xl border border-border-dim p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Управление глобальными санкциями (GBAN / GBANPL)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">VK ID пользователя</label>
              <input
                type="text"
                placeholder="Введите VK ID"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-[#0b0e14] px-3.5 py-2.5 rounded-xl border border-border-dim focus:border-[#00BFFF]/50 outline-none transition-all text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Причина блокировки / ограничения</label>
              <input
                type="text"
                placeholder="Например: Оскорбление игроков"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#0b0e14] px-3.5 py-2.5 rounded-xl border border-border-dim focus:border-[#00BFFF]/50 outline-none transition-all text-xs text-white"
              />
            </div>
          </div>

          {/* Immunity Alerts */}
          {checkingImmunity && (
            <div className="p-3.5 bg-black/20 border border-border-dim rounded-xl text-xs text-text-muted flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Проверка уровня иммунитета цели...</span>
            </div>
          )}

          {!checkingImmunity && immunityData && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {immunityData.hasImmunity ? (
                <div className="p-4 bg-amber-500/10 border-2 border-amber-500 rounded-xl text-xs text-amber-300 leading-relaxed space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <div className="flex items-center gap-2 font-black text-amber-400 text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    ВНИМАНИЕ! Этот пользователь защищен системой абсолютного иммунитета ядра (ID: 1115715881)
                  </div>
                  <p className="mt-1 font-medium">Любые действия по блокировке или наказанию будут принудительно отклонены ядром безопасности.</p>
                </div>
              ) : (
                <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sky-400">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Профиль цели идентифицирован
                  </div>
                  <p className="text-text-muted">
                    Ник: <span className="text-white font-bold">{immunityData.fullName}</span> | Роль: <span className="text-sky-400 font-bold">{immunityData.roleName}</span> ({immunityData.role})
                  </p>
                  {immunityData.isBanned && (
                    <p className="text-rose-400 font-semibold">⚠️ Внимание: Пользователь уже находится в игровом ЧС!</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleGlobalAction('gban')}
              disabled={loading || (immunityData && immunityData.hasImmunity)}
              className="flex-1 px-4 py-3 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/10 uppercase tracking-wider"
            >
              Глобальный бан (GBAN)
            </button>
            <button
              onClick={() => handleGlobalAction('gbanpl')}
              disabled={loading || (immunityData && immunityData.hasImmunity)}
              className="flex-1 px-4 py-3 bg-amber-500/10 hover:bg-amber-600 border border-amber-500/20 text-amber-400 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/10 uppercase tracking-wider"
            >
              Глобальный мут (GBANPL)
            </button>
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border-dim p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase text-text-muted tracking-wider">Принцип работы GBAN / GBANPL</h4>
            <div className="space-y-2 text-xs text-text-muted leading-relaxed font-medium">
              <p>
                <strong className="text-white">1. Авто-применение:</strong> Блокировка мгновенно синхронизируется с профилем Firestore и ЧС сообщества VK.
              </p>
              <p>
                <strong className="text-white">2. Мульти-рассылка:</strong> При активации бан/мут транслируется во все беседы из базы данных, кроме бесед с типом <code className="text-rose-400 font-mono font-bold">CH</code>.
              </p>
              <p>
                <strong className="text-white">3. Автоматический unban:</strong> Временные ограничения разбаниваются автоматически при первой же активности игрока.
              </p>
            </div>
          </div>
          <div className="p-3.5 bg-black/20 border border-border-dim rounded-xl text-[11px] text-text-muted">
            Идентификатор текущей сессии: <br />
            <code className="text-sky-400 text-[10px] break-all font-mono select-all">{secret}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
