import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { ChatItem } from '../types';
import { MessageSquare, Users, Link as LinkIcon, RefreshCw } from 'lucide-react';

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    try {
      const data = await panelApi.getChats();
      setChats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  if (loading) return <div className="flex justify-center p-10 text-slate-500"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Беседы с чат-менеджером</h2>
          <p className="text-xs text-slate-400">Список бесед, где установлен бот</p>
        </div>
        <button onClick={fetchChats} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chats.map((c) => (
          <div key={c.peerId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-white truncate" title={c.title}>{c.title || 'Беседа без названия'}</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {c.peerId}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Участников</span>
                <span className="text-white font-medium">{c.membersCount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Ссылка</span>
                {c.inviteLink && c.inviteLink !== 'Отсутствует' ? (
                  <a href={c.inviteLink} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate max-w-[120px]">
                    {c.inviteLink}
                  </a>
                ) : (
                  <span className="text-slate-600">Нет</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
