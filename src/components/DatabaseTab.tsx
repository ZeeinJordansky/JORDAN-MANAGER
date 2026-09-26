import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, Search, RefreshCw, Save, X, AlertTriangle, Check, ShieldAlert, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface DatabaseTabProps {
  secret: string;
}

export default function DatabaseTab({ secret }: DatabaseTabProps) {
  const [isSpecial, setIsSpecial] = useState(() => {
    return localStorage.getItem('session_is_special') === 'true';
  });

  const [selectedCollection, setSelectedCollection] = useState<string>('users');
  const [allTables, setAllTables] = useState<string[]>(['users', 'chats', 'messages', 'promocodes', 'bans', 'mutes', 'warns', 'panel_logs']);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Locked access code state
  const [specialCodeInput, setSpecialCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [docId, setDocId] = useState<string>('');
  const [docJson, setDocJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // PostgreSQL state
  const [pgStatus, setPgStatus] = useState<any>(null);
  const [pgLoading, setPgLoading] = useState<boolean>(false);
  const [vacuumLoading, setVacuumLoading] = useState<boolean>(false);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  
  const fetchTables = async () => {
    try {
      const res = await fetch('/api/panel/db/tables', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Merge with core firestore-style collections for better UX
          const core = ['users', 'chats', 'messages', 'promocodes', 'bans', 'mutes', 'warns', 'panel_logs'];
          const combined = Array.from(new Set([...core, ...data]));
          setAllTables(combined.sort());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPgStatus = async () => {
    setPgLoading(true);
    try {
      const res = await fetch('/api/panel/dashboard/postgres/status', {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPgStatus(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setPgLoading(false);
    }
  };

  const handleSyncToPostgres = async () => {
    if (!confirm('Вы действительно хотите перенести ВСЕ данные из SQLite в PostgreSQL? Это создаст полную копию таблиц.')) {
      return;
    }
    setSyncLoading(true);
    try {
      const res = await fetch('/api/panel/dashboard/postgres/sync_from_sqlite', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Синхронизация завершена! Скопировано ${data.totalRowsCopied} записей в ${data.syncedTables.length} таблиц.`);
        fetchPgStatus();
      } else {
        showToast(data.error || 'Ошибка при синхронизации данных', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncFromOrionBucket = async () => {
    if (!confirm('Вы действительно хотите скачать базу из бакета DATABASE-ORION-MANAGER и перенести её в PostgreSQL?')) {
      return;
    }
    setSyncLoading(true);
    try {
      const res = await fetch('/api/panel/dashboard/postgres/sync_from_hf_bucket', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Синхронизация из бакета завершена! Скопировано ${data.totalRowsCopied} записей в ${data.syncedTables.length} таблиц.`);
        fetchPgStatus();
      } else {
        showToast(data.error || 'Ошибка при синхронизации из бакета', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRunPgVacuum = async () => {
    setVacuumLoading(true);
    try {
      const res = await fetch('/api/panel/dashboard/postgres/vacuum', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Сжатие PostgreSQL завершено! Освобождено ${data.freedMb} МБ. Новый размер: ${data.formattedSize}`);
        fetchPgStatus();
      } else {
        showToast(data.error || 'Ошибка при выполнении сжатия', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setVacuumLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDocuments = async (collName = selectedCollection) => {
    if (!isSpecial) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/db/documents?collection=${collName}`, {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Ошибка при загрузке документов', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchDocuments(selectedCollection);
    fetchPgStatus();
  }, [selectedCollection, isSpecial]);

  const handleUnlockDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialCodeInput.trim()) {
      setUnlockError('Введите Особый Код!');
      return;
    }

    setUnlockLoading(true);
    setUnlockError('');

    try {
      const vkId = localStorage.getItem('session_vk_id') || '1115715881';
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vkId, code: specialCodeInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.isSpecial) {
        localStorage.setItem('session_is_special', 'true');
        setIsSpecial(true);
        showToast('Особый доступ успешно подтвержден!');
      } else {
        setUnlockError('Введен неверный Особый Код!');
      }
    } catch (err) {
      setUnlockError('Ошибка связи с сервером');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setDocId('');
    if (selectedCollection === 'users') {
      const defaultUser = {
        userId: 123456789,
        nick: 'НовыйИгрок',
        balance: 1000,
        bank: 0,
        beer: 0,
        role: 0,
        businesses: 0,
        jc: 0,
        rep: 0,
        isGameBanned: false
      };
      setDocJson(JSON.stringify(defaultUser, null, 2));
    } else if (selectedCollection === 'promocodes') {
      const defaultPromo = {
        type: 'деньги',
        value: 50000,
        maxActivations: 100,
        usedCount: 0,
        usedUsers: []
      };
      setDocJson(JSON.stringify(defaultPromo, null, 2));
    } else {
      setDocJson(JSON.stringify({ created: Math.floor(Date.now() / 1000) }, null, 2));
    }
    setJsonError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (doc: any) => {
    setActiveDoc(doc);
    setDocId(doc._id);
    const cleanDoc = { ...doc };
    delete cleanDoc._id;
    setDocJson(JSON.stringify(cleanDoc, null, 2));
    setJsonError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveDoc = async (isNew = false) => {
    setJsonError(null);
    if (!docId.trim()) {
      setJsonError('Идентификатор документа (Doc ID) обязателен!');
      return;
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(docJson);
    } catch (e: any) {
      setJsonError(`Некорректный JSON: ${e.message}`);
      return;
    }

    try {
      const res = await fetch('/api/dashboard/db/save-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: selectedCollection,
          docId: docId.trim(),
          data: parsedData
        })
      });

      if (res.ok) {
        showToast(isNew ? 'Запись успешно создана!' : 'Запись успешно обновлена!');
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        fetchDocuments();
      } else {
        const err = await res.json();
        setJsonError(err.error || 'Ошибка при сохранении');
      }
    } catch (e: any) {
      setJsonError(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteDoc = async (targetId: string) => {
    if (!confirm(`Вы действительно хотите удалить запись "${targetId}" из коллекции "${selectedCollection}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/dashboard/db/delete-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          collectionName: selectedCollection,
          docId: targetId
        })
      });

      if (res.ok) {
        showToast(`Запись "${targetId}" удалена!`);
        fetchDocuments();
      } else {
        showToast('Ошибка при удалении записи', 'error');
      }
    } catch (e: any) {
      showToast(`Ошибка: ${e.message}`, 'error');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const str = JSON.stringify(doc).toLowerCase();
    return str.includes(query);
  });

  // If session does not have Special Access, render the gorgeous lock screen!
  if (!isSpecial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center relative shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <ShieldAlert className="w-10 h-10 text-amber-500 drop-shadow-[0_0_10px_#f59e0b]" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-extrabold uppercase text-white tracking-wider">ТРЕБУЕТСЯ ОСОБЫЙ ДОСТУП</h2>
          <p className="text-xs text-text-muted leading-relaxed font-medium">
            Ваша текущая сессия авторизована по Обычному Коду (ОК). Для просмотра, изменения структуры и мутаций базы данных требуется Особый Код с повышенной криптостойкостью.
          </p>
        </div>

        <form onSubmit={handleUnlockDatabase} className="w-full max-w-sm space-y-3">
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="password"
              placeholder="Вставьте Особый Код (SPECIAL_...)"
              value={specialCodeInput}
              onChange={(e) => { setSpecialCodeInput(e.target.value); setUnlockError(''); }}
              className="w-full bg-[#0b0e14] pl-10 pr-4 py-3 rounded-xl border border-border-dim focus:border-[#00BFFF]/50 outline-none transition-all text-xs text-white font-mono"
            />
          </div>
          {unlockError && (
            <p className="text-rose-400 text-[11px] font-bold text-left ml-1">{unlockError}</p>
          )}
          <button
            type="submit"
            disabled={unlockLoading}
            className="w-full py-3 bg-[#0077ff] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-900/30"
          >
            {unlockLoading ? 'Проверка...' : 'Разблокировать базу данных'}
          </button>
        </form>
      </div>
    );
  }

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

      {/* Header controls */}
      <div className="bg-bg-card rounded-xl border border-border-dim p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-[#00BFFF]/20 rounded-xl">
            <Database className="w-5 h-5 text-[#00BFFF]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Управление Базой Данных</h3>
            <p className="text-xs text-text-muted">Просмотр, добавление, редактирование и удаление записей в Firestore</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchDocuments()}
            disabled={loading}
            className="px-3 py-2 bg-[#0b0e14] hover:bg-white/5 border border-border-dim rounded-xl text-xs font-semibold text-text-muted flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#0077ff] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-900/40 transition-colors uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Добавить запись
          </button>
        </div>
      </div>

      {/* PostgreSQL Status & Bucket Storage Card */}
      <div className="bg-[#121824] rounded-xl border border-indigo-500/20 p-4 space-y-3 relative overflow-hidden shadow-lg shadow-indigo-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 font-bold text-lg">
              🐘
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white">PostgreSQL 16 (Hugging Face)</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  pgStatus?.online 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {pgLoading ? 'Проверка...' : pgStatus?.online ? '🟢 Онлайн (HTTPS Proxy)' : '🟡 В фоновом режиме'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Хранилище: <span className="text-indigo-300 font-mono font-bold">{pgStatus?.formattedSize || '16 MB'}</span> | Таблиц: <span className="text-white font-mono">{pgStatus?.tableCount || 1}</span> | Активный движок бота: <span className="text-sky-400 font-bold">SQLite</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchPgStatus}
              disabled={pgLoading}
              className="px-3 py-2 bg-[#0b0e14] hover:bg-white/5 border border-border-dim rounded-xl text-xs font-semibold text-text-muted flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pgLoading ? 'animate-spin' : ''}`} />
              Статус
            </button>
            <button
              onClick={handleSyncToPostgres}
              disabled={syncLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-900/40 transition-colors uppercase tracking-wider"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Копирование...' : 'Синхронизация (Все локальные .db → Postgres)'}
            </button>
            <button
              onClick={handleSyncFromOrionBucket}
              disabled={syncLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-900/40 transition-colors uppercase tracking-wider"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Копирование...' : 'Миграция из DATABASE-ORION-MANAGER'}
            </button>
            <button
              onClick={handleRunPgVacuum}
              disabled={vacuumLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-900/40 transition-colors uppercase tracking-wider"
            >
              <Database className="w-4 h-4" />
              {vacuumLoading ? 'Сжатие...' : 'Вакуум & Сжатие (Postgres)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 border-t border-white/5 text-[11px]">
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex items-center justify-between">
            <span className="text-text-muted">HF Space:</span>
            <a href="https://huggingface.co/spaces/RomanJordansky/BOT_JORDANS" target="_blank" rel="noreferrer" className="text-sky-400 font-mono font-semibold hover:underline truncate max-w-[160px]">
              RomanJordansky/BOT_JORDANS
            </a>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex items-center justify-between">
            <span className="text-text-muted">Привязанный Бакет:</span>
            <a href="https://huggingface.co/buckets/RomanJordansky/postre" target="_blank" rel="noreferrer" className="text-indigo-400 font-mono font-semibold hover:underline truncate max-w-[160px]">
              RomanJordansky/postre
            </a>
          </div>
          <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <span className="text-text-muted">Режим подключения:</span>
            <span className="text-emerald-400 font-bold font-mono">HTTPS REST API Proxy (443)</span>
          </div>
        </div>
      </div>

      {/* Collection tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {allTables.map((tblId) => (
            <button
              key={tblId}
              onClick={() => setSelectedCollection(tblId)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCollection === tblId
                  ? 'bg-sky-500/10 border-[#00BFFF] text-[#00E5FF] shadow-sm shadow-blue-950/20'
                  : 'bg-bg-card border-border-dim text-text-muted hover:border-white/10'
              }`}
            >
              {tblId}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск по базе..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-border-dim rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#00BFFF]/50 focus:outline-none font-medium"
          />
        </div>
      </div>

      {/* Documents List / Cards */}
      <div className="bg-bg-card rounded-xl border border-border-dim overflow-hidden">
        <div className="px-4 py-3 border-b border-border-dim bg-black/20 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Коллекция: <span className="text-sky-400 font-mono">{selectedCollection}</span> ({filteredDocuments.length} записей)
          </span>
          {loading && <span className="text-xs text-[#00BFFF] font-semibold animate-pulse">Загрузка данных...</span>}
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {loading ? 'Загрузка...' : 'Записи не найдены в этой коллекции'}
          </div>
        ) : (
          <div className="divide-y divide-border-dim/50 max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredDocuments.map((doc) => {
              const docId = doc._id;
              const titleName = doc.nick || doc.userName || doc.type || `Doc #${docId}`;
              return (
                <div key={docId} className="p-4 hover:bg-white/[0.01] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 overflow-hidden flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono text-[10px] font-bold bg-[#0077ff]/10 border border-[#0077ff]/20 text-white px-2 py-0.5 rounded-md">
                        ID: {docId}
                      </span>
                      <span className="font-bold text-sm text-white">{titleName}</span>
                      {doc.role >= 12 && (
                        <span className="text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                          Спец. Руководитель
                        </span>
                      )}
                    </div>

                    <div className="mono text-[11px] text-emerald-400 bg-black/40 p-2.5 rounded-xl border border-border-dim/50 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(doc, null, 2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="px-3 py-2 bg-white/5 hover:bg-[#0077ff] hover:text-white border border-border-dim text-text-muted rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(docId)}
                      className="px-3 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add Document */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-text-muted hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00BFFF]" />
              Добавить запись в коллекцию "{selectedCollection}"
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                  Идентификатор документа (Doc ID) *
                </label>
                <input
                  type="text"
                  placeholder="Например: 778382713 или promo123"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-border-dim rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:border-[#00BFFF]/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                  Данные документа (JSON формат)
                </label>
                <textarea
                  rows={10}
                  value={docJson}
                  onChange={(e) => setDocJson(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-border-dim rounded-xl p-3.5 text-xs font-mono text-emerald-400 focus:border-[#00BFFF]/50 focus:outline-none"
                />
              </div>

              {jsonError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold">
                  {jsonError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-muted rounded-xl text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSaveDoc(true)}
                className="px-5 py-2 bg-[#0077ff] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/40 uppercase tracking-wider"
              >
                <Save className="w-4 h-4" />
                Создать запись
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Document */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-text-muted hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#00BFFF]" />
              Редактирование записи: <span className="text-sky-400 font-mono">{docId}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                  Идентификатор документа (Doc ID)
                </label>
                <input
                  type="text"
                  disabled
                  value={docId}
                  className="w-full bg-[#0b0e14]/50 border border-border-dim rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-text-muted block mb-1">
                  Данные документа (JSON формат)
                </label>
                <textarea
                  rows={12}
                  value={docJson}
                  onChange={(e) => setDocJson(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-border-dim rounded-xl p-3.5 text-xs font-mono text-emerald-400 focus:border-[#00BFFF]/50 focus:outline-none"
                />
              </div>

              {jsonError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold">
                  {jsonError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-muted rounded-xl text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSaveDoc(false)}
                className="px-5 py-2 bg-[#0077ff] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/40 uppercase tracking-wider"
              >
                <Save className="w-4 h-4" />
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
