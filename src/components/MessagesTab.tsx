import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Message } from '../types';
import { User, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface MessagesTabProps {
  secret: string;
}

export default function MessagesTab({ secret }: MessagesTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  const users = Array.from(new Set(messages.map(m => m.userId))).map(userId => {
    const lastMsg = [...messages].reverse().find(m => m.userId === userId);
    return {
      id: userId,
      lastMessage: lastMsg?.text || '',
      timestamp: lastMsg?.timestamp || 0
    };
  }).sort((a, b) => b.timestamp - a.timestamp);

  const selectedMessages = messages.filter(m => m.userId === selectedUser);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedUser || isSending) return;

    setIsSending(true);
    try {
      await axios.post('/api/send-message', {
        userId: selectedUser,
        text: inputText,
        secret: secret
      });
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Ошибка при отправке сообщения');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-1 bg-bg-card rounded-xl border border-border-dim overflow-hidden shadow-2xl min-h-0">
      {/* Sidebar - Users List */}
      <div className="w-72 border-r border-border-dim flex flex-col bg-bg-main/30 shrink-0">
        <div className="p-4 border-b border-border-dim bg-bg-card">
          <h2 className="font-bold text-text-main text-xs uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-vk-blue" />
            Диалоги
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-[11px] uppercase tracking-wider font-semibold opacity-50">
              Нет активных сессий
            </div>
          ) : (
            users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-border-dim/50 ${selectedUser === user.id ? 'bg-vk-blue/10' : ''}`}
              >
                <div className="w-10 h-10 bg-bg-main rounded-full flex items-center justify-center flex-shrink-0 border border-border-dim">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <div className="text-left overflow-hidden">
                  <div className={`text-sm font-bold truncate ${selectedUser === user.id ? 'text-vk-blue' : 'text-text-main'}`}>ID: {user.id}</div>
                  <div className="text-[11px] text-text-muted truncate mt-0.5">{user.lastMessage}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black/20">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-border-dim bg-bg-card flex items-center justify-between">
              <div className="font-bold text-text-main flex items-center gap-2">
                <span className="text-vk-blue">#</span> User_{selectedUser}
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Active Session
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence initial={false}>
                {selectedMessages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.fromBot ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-3 rounded-lg text-[13px] leading-relaxed shadow-sm ${
                      msg.fromBot 
                        ? 'bg-vk-blue text-white rounded-tr-none' 
                        : 'bg-bg-card text-text-main border border-border-dim rounded-tl-none'
                    }`}>
                      {msg.text}
                      <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider opacity-60 mono ${msg.fromBot ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-bg-card border-t border-border-dim">
              <div className="flex gap-2 p-1 bg-black/30 rounded-xl border border-border-dim">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Введите сообщение для отправки пользователю..."
                  className="flex-1 px-4 py-2 bg-transparent text-sm text-text-main focus:outline-none placeholder:text-text-muted/50"
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputText.trim()}
                  className="p-2 bg-vk-blue text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-blue-900/40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-center p-12">
            <div className="w-20 h-20 bg-bg-card rounded-full flex items-center justify-center mb-6 border border-border-dim shadow-xl">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="font-bold text-text-main mb-2">Сессия не выбрана</h3>
            <p className="text-xs uppercase tracking-widest opacity-50 font-bold max-w-xs leading-relaxed">
              Выберите активный диалог из списка слева для мониторинга или ответа
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
