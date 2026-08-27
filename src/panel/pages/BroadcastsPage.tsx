import React, { useState } from 'react';
import { panelApi } from '../api';
import { Send, Users, MessageSquare } from 'lucide-react';

export default function BroadcastsPage() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [target, setTarget] = useState<'all_chats' | 'all_users'>('all_chats');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!confirm('Вы уверены, что хотите запустить массовую рассылку?')) return;
    
    setLoading(true);
    try {
      const res = await panelApi.sendBroadcast(title, text, target);
      alert(`Рассылка успешно завершена. Отправлено сообщений: ${res.sentCount}`);
      setTitle('');
      setText('');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Управление рассылками</h2>
        <p className="text-xs text-slate-400">Глобальная отправка сообщений от лица группы (Только Root)</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Получатели</label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${target === 'all_chats' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                <input type="radio" name="target" checked={target === 'all_chats'} onChange={() => setTarget('all_chats')} className="hidden" />
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-semibold">Все беседы</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${target === 'all_users' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                <input type="radio" name="target" checked={target === 'all_users'} onChange={() => setTarget('all_users')} className="hidden" />
                <Users className="w-4 h-4" />
                <span className="text-sm font-semibold">Личные сообщения (Все юзеры)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Заголовок (Необязательно)</label>
            <input
              type="text"
              placeholder="Например: ВАЖНОЕ ОБНОВЛЕНИЕ"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Текст сообщения</label>
            <textarea
              placeholder="Введите текст рассылки..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? 'Отправка...' : <><Send className="w-4 h-4" /> Запустить рассылку</>}
          </button>
        </form>
      </div>
    </div>
  );
}
