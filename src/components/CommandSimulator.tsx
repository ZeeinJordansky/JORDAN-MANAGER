import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isVkFormatted?: boolean;
}

export default function CommandSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '🤖 Чат-менеджер «Mint» подключен к беседе. Префикс: "/"\nВведите команду ниже или выберите готовую подсказку!',
      timestamp: '12:00',
    },
    {
      id: '2',
      sender: 'user',
      text: '/профиль',
      timestamp: '12:01',
    },
    {
      id: '3',
      sender: 'bot',
      text: `👤 Профиль участника @id778382713 (Олег):
💳 Баланс: 1,450,000 🪙
🌟 Уровень: 42 (Опыт: 1,240 / 2,000)
🏆 Ранг: 👑 Главный Управляющий
🛡️ Статус в беседе: Владелец
⚔️ Клановые победы: 124
🔥 Стрик активности: 14 дней подряд`,
      timestamp: '12:01',
      isVkFormatted: true,
    },
  ]);

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const presetCommands = [
    '/профиль',
    '/баланс',
    '/дуэль @friend 5000',
    '/казино 1000',
    '/клан инфо',
    '/кик @spammer',
    '/муты',
    '/правила',
  ];

  const handleSend = (cmdToSend?: string) => {
    const textCmd = (cmdToSend || input).trim();
    if (!textCmd) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textCmd,
      timestamp: time,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!cmdToSend) setInput('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse = '';
      const lower = textCmd.toLowerCase();

      if (lower.includes('/профиль') || lower.includes('/profile')) {
        botResponse = `👤 Профиль участника @id778382713 (Олег):\n💳 Баланс: 1,450,000 🪙\n🌟 Уровень: 42 (Опыт: 1,240 / 2,000)\n🏆 Ранг: 👑 Главный Управляющий\n🛡️ Статус в беседе: Владелец\n⚔️ Побед в дуэлях: 124`;
      } else if (lower.includes('/баланс') || lower.includes('/balance')) {
        botResponse = `💰 Ваш кошелек: 1,450,000 🪙\n🏦 В банке беседы: 45,200,000 🪙\n💎 Изумрудов: 850`;
      } else if (lower.includes('/дуэль') || lower.includes('/duel')) {
        botResponse = `⚔️ Вы вызвали @friend на дуэль на 5,000 🪙!\nСоперник принял вызов!\n💥 Победитель: @id778382713 (+10,000 🪙)`;
      } else if (lower.includes('/казино') || lower.includes('/casino')) {
        const win = Math.random() > 0.4;
        botResponse = win
          ? `🎰 Рулетка прокрутилась...\n🎉 ВЫИГРЫШ! Вы поставили 1,000 🪙 и выиграли 2,500 🪙! (Коэффициент x2.5)`
          : `🎰 Рулетка прокрутилась...\nУвы, ставка 1,000 🪙 сгорела. Повезет в следующий раз!`;
      } else if (lower.includes('/клан') || lower.includes('/clan')) {
        botResponse = `🏰 Клан: [MINT] Mint Dominators\n👑 Глава: @id778382713\n👥 Участников: 48 / 50\n⚔️ Казна клана: 12,400,000 🪙\n🏆 Место в рейтинге: #1`;
      } else if (lower.includes('/кик') || lower.includes('/kick')) {
        botResponse = `🛡️ Модерация беседы:\nУчастник @spammer успешно исключен из беседы.\nПричина: Нарушение правил (Спам)`;
      } else if (lower.includes('/муты') || lower.includes('/mutes')) {
        botResponse = `🤐 Список замученных участников:\n1. @bad_user (до 14:30) — Матерная речь\n2. @ad_bot (Навсегда) — Реклама`;
      } else if (lower.includes('/правила') || lower.includes('/rules')) {
        botResponse = `📜 Правила беседы:\n1. Запрещен спам и реклама чужих сервисов.\n2. Уважайте участников беседы.\n3. Матерная речь ограничена (автомутирование за капс).\n4. Команды бота использовать без флуда.`;
      } else {
        botResponse = `✅ Команда "${textCmd}" успешно выполнена за 3.2 мс!\nЧат-менеджер «Mint» активен 24/7.`;
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVkFormatted: true,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 280);
  };

  return (
    <div className="w-full bg-neutral-950/70 backdrop-blur-xl border border-white/10 hover:border-violet-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px] transition-all">
      {/* Header */}
      <div className="bg-black/80 px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/30 rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/20">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Чат-менеджер «Mint»</span>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-sm shadow-violet-400" />
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">Беседа #1 · Онлайн (отклик 3.2 мс)</div>
          </div>
        </div>
        <div className="text-[11px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/30 px-2.5 py-1 rounded-full shadow-sm">
          Молниеносный отклик
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs bg-black/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {m.sender === 'bot' ? (
                <span className="font-bold text-violet-400 text-[11px] flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Mint
                </span>
              ) : (
                <span className="font-bold text-neutral-300 text-[11px] flex items-center gap-1">
                  <User className="w-3 h-3" /> Вы
                </span>
              )}
              <span className="text-[10px] text-neutral-500 font-mono">{m.timestamp}</span>
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-tr-none shadow-md shadow-violet-600/20'
                  : 'bg-neutral-900/90 text-neutral-200 border border-white/5 rounded-tl-none font-mono text-[11.5px]'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      <div className="px-3 py-2 bg-black/70 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-neutral-500 shrink-0 uppercase tracking-wider">
          Тест:
        </span>
        {presetCommands.map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleSend(cmd)}
            className="shrink-0 px-2.5 py-1 bg-neutral-900/80 hover:bg-violet-600 hover:text-white border border-white/5 hover:border-violet-500/50 rounded-lg text-[11px] font-mono text-neutral-300 transition-colors shadow-sm"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-black/80 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Введите команду бота (например: /профиль, /казино 500, /клан)..."
          className="flex-1 bg-neutral-950/80 border border-neutral-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none font-mono transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 active:scale-95 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-violet-600/30 flex items-center gap-1.5"
        >
          <span>Отправить</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
