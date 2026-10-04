import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronLeft } from 'lucide-react';

interface ChatButton {
  label: string;
  payload?: any;
  color?: 'white' | 'blue' | 'red' | 'green';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  isVkFormatted?: boolean;
  buttons?: ChatButton[];
  buttonRows?: ChatButton[][];
  imageUrl?: string;
  rouletteResult?: { number: number; color: 'red' | 'black' | 'green' };
}

// Russian declension helper for names in genitive case (родительный падеж)
function toGenitive(name: string): string {
  if (!name) return name;
  const parts = name.split(/\s+/);
  return parts.map(part => {
    const w = part.toLowerCase();
    let res = w;
    if (w.endsWith("ий")) res = w.slice(0, -2) + "ого";
    else if (w.endsWith("ый")) res = w.slice(0, -2) + "ого";
    else if (w.endsWith("ая")) res = w.slice(0, -2) + "ой";
    else if (w.endsWith("ова") || w.endsWith("ева") || w.endsWith("ина") || w.endsWith("ына")) res = w.slice(0, -1) + "ой";
    else if (/[гкхжчшщ]а$/.test(w)) res = w.slice(0, -1) + "и";
    else if (w.endsWith("а")) res = w.slice(0, -1) + "ы";
    else if (w.endsWith("я")) res = w.slice(0, -1) + "и";
    else if (w.endsWith("ь")) res = w.slice(0, -1) + "я";
    else if (w.endsWith("й")) res = w.slice(0, -1) + "я";
    else if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) res = w + "а";
    return part[0] === part[0].toUpperCase() ? res.charAt(0).toUpperCase() + res.slice(1) : res;
  }).join(" ");
}

const ROULETTE_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export default function CommandSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '🤖 Чат-менеджер «Mint» подключен к беседе. Префикс: "/"\nВведите команду ниже или выберите готовую подсказку!',
      timestamp: '12:00',
    },
  ]);

  const [input, setInput] = useState('');
  const [rateLimitToast, setRateLimitToast] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const clickHistory = useRef<number[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rate limit: max 5 button clicks per 10 seconds (5 нажатий за 10 секунд)
  const checkRateLimit = () => {
    const now = Date.now();
    clickHistory.current = clickHistory.current.filter(t => now - t < 10000);
    if (clickHistory.current.length >= 5) {
      const oldest = clickHistory.current[0];
      const remainingSec = Math.ceil((10000 - (now - oldest)) / 1000) || 1;
      setRateLimitToast(`⚠️ Подождите ${remainingSec} сек. перед следующим нажатием!`);
      setTimeout(() => setRateLimitToast(null), 1500);
      return false;
    }
    clickHistory.current.push(now);
    return true;
  };

  const presetCommands = [
    '/профиль',
    '/get',
    '/рулетка',
    '/казино',
    '/баланс',
    '/hidetop @user',
    '/unhidetop @user',
    '/дуэль @friend 5000',
    '/клан инфо',
    '/кик @spammer',
    '/правила',
  ];

  const handleButtonClick = (button: ChatButton, msgId: string) => {
    if (!checkRateLimit()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (button.payload?.type === 'get_info') {
      const { subType, userName } = button.payload;
      let newText = '';
      let newButtonRows: ChatButton[][] = [];

      const genitiveTargetName = toGenitive(userName || 'Олег Сиротинин');

      if (subType === 'main') {
        newText = `🔎 Наказания пользователя [id1|${genitiveTargetName}]`;
        newButtonRows = [
          [{ label: '⚠️ Предупреждения', payload: { type: 'get_info', subType: 'warns', userName }, color: 'white' }],
          [
            { label: '🔇 Блокировка чата', payload: { type: 'get_info', subType: 'mutes', userName }, color: 'white' },
            { label: '🔒 Блокировка', payload: { type: 'get_info', subType: 'bans', userName }, color: 'white' }
          ]
        ];
      } else if (subType === 'warns') {
        newText = `⚠️ Предупреждения у пользователя нету в данной беседе.`;
        newButtonRows = [
          [
            { label: '🔇 Блокировка чата', payload: { type: 'get_info', subType: 'mutes', userName }, color: 'white' },
            { label: '🔒 Блокировка', payload: { type: 'get_info', subType: 'bans', userName }, color: 'white' }
          ],
          [{ label: 'Назад', payload: { type: 'get_info', subType: 'main', userName }, color: 'white' }]
        ];
      } else if (subType === 'mutes') {
        newText = `🔇 Блокировки чата у пользователя нету в данной беседе.`;
        newButtonRows = [
          [
            { label: '⚠️ Предупреждения', payload: { type: 'get_info', subType: 'warns', userName }, color: 'white' },
            { label: '🔒 Блокировка', payload: { type: 'get_info', subType: 'bans', userName }, color: 'white' }
          ],
          [{ label: 'Назад', payload: { type: 'get_info', subType: 'main', userName }, color: 'white' }]
        ];
      } else if (subType === 'bans') {
        newText = `🔒 Блокировки у пользователя нету в данной беседе.`;
        newButtonRows = [
          [{ label: '⚠️ Предупреждения', payload: { type: 'get_info', subType: 'warns', userName }, color: 'white' }],
          [{ label: '🔇 Блокировка чата', payload: { type: 'get_info', subType: 'mutes', userName }, color: 'white' }],
          [{ label: 'Назад', payload: { type: 'get_info', subType: 'main', userName }, color: 'white' }]
        ];
      }

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: newText, buttonRows: newButtonRows, buttons: undefined } : m));
    } else if (button.payload?.type === 'casino_spin' || button.label === 'Повторить' || button.label === 'Сыграть на весь баланс') {
      const emojis = ['💎', '🍒', '🍀', '🪙', '🔔', '🍋', '💰', '⭐'];
      const e1 = emojis[Math.floor(Math.random() * emojis.length)];
      const e2 = emojis[Math.floor(Math.random() * emojis.length)];
      const e3 = emojis[Math.floor(Math.random() * emojis.length)];
      const isWin = e1 === e2 || e2 === e3 || e1 === e3;
      const stake = button.label === 'Сыграть на весь баланс' ? 1450000 : 1000;
      const resText = `🎰 Казино\n\n💵 Ставка: ${stake.toLocaleString()}$\n🎯 Выпало: [ ${e1} | ${e2} | ${e3} ]\n\nИтог: ${isWin ? `Вы выиграли +${Math.floor(stake * 0.5).toLocaleString()} $! (всего: ${Math.floor(stake * 1.5).toLocaleString()}$)` : `Комбинация не совпала. Ставка сгорела (-${stake.toLocaleString()} $)`}\nБонус: ${isWin ? '+50%' : '0%'}`;
      const newButtonRows: ChatButton[][] = [
        [
          { label: 'Повторить', payload: { type: 'casino_spin' }, color: 'white' },
          { label: 'Сыграть на весь баланс', payload: { type: 'casino_spin' }, color: 'white' }
        ]
      ];
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        text: resText,
        buttonRows: newButtonRows
      } : m));
    } else if (button.payload?.type === 'roulette_spin') {
      const { bet, color } = button.payload;
      const winningNumber = Math.floor(Math.random() * 37);
      const isRed = RED_NUMBERS.includes(winningNumber);
      const isGreen = winningNumber === 0;
      const winningColorLabel = isGreen ? '🟢 Зелёное' : (isRed ? '🔴 Красное' : '⚫ Чёрное');
      const won = (color === 'red' && isRed) || (color === 'black' && !isRed && !isGreen) || (color === 'green' && isGreen);
      
      const chosenLabel = color === 'red' ? '🔴 Красное' : color === 'black' ? '⚫ Чёрное' : '🟢 Зелёное';
      let resText = `🎰 Рулетка\n\n💵 Ставка: ${bet}$\n🎯 Выбор: ${chosenLabel}\n\n🎯 Выпало: ${winningNumber} (${winningColorLabel})\n`;
      if (won) resText += `\n🎉 ВЫИГРЫШ! Вы получили ${bet * (color === 'green' ? 35 : 2)}$!`;
      else resText += `\nУвы, ставка ${bet}$ сгорела. Повезет в следующий раз!`;

      setMessages(prev => prev.map(m => m.id === msgId ? { 
        ...m, 
        text: resText, 
        buttonRows: [[{ label: '🔄 Сыграть снова', payload: { type: 'roulette_reset' }, color: 'white' }]],
        rouletteResult: { number: winningNumber, color: isGreen ? 'green' : (isRed ? 'red' : 'black') }
      } : m));
    } else if (button.payload?.type === 'roulette_reset') {
       setMessages(prev => prev.map(m => m.id === msgId ? { 
         ...m, 
         text: `🎰 Рулетка\n\n💵 Ставка: 1000$\n🎯 Выбор: (число / цвет)\n\n[🔴 Красное] [⚫ Чёрное] [🟢 Зелёное]\n\n🍀 Сделайте ставку, чтобы запустить рулетку.`, 
         buttonRows: [
            [
              { label: '🔴 Красное', payload: { type: 'roulette_spin', bet: 1000, color: 'red' }, color: 'white' },
              { label: '⚫ Чёрное', payload: { type: 'roulette_spin', bet: 1000, color: 'black' }, color: 'white' },
              { label: '🟢 Зелёное', payload: { type: 'roulette_spin', bet: 1000, color: 'green' }, color: 'white' }
            ]
         ],
         rouletteResult: undefined
       } : m));
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: button.label, timestamp: time }]);
      handleSend(button.label, true);
    }
  };

  const handleSend = (cmdToSend?: string, skipRateLimitCheck?: boolean) => {
    if (!skipRateLimitCheck && !checkRateLimit()) return;
    const textCmd = (cmdToSend || input).trim();
    if (!textCmd) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!cmdToSend) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: 'user', text: textCmd, timestamp: time }]);
      setInput('');
    }

    setTimeout(() => {
      let botResponse = '';
      let botButtonRows: ChatButton[][] = [];
      let botImage = '';
      const lower = textCmd.toLowerCase();

      if (lower.includes('/профиль') || lower.includes('/profile') || lower.includes('/стата') || lower.includes('/stats')) {
        botResponse = `👤 Профиль участника [id778382713|Олег]:\n💳 Баланс: 1,450,000 🪙\n🌟 Уровень: 42 (Опыт: 1,240 / 2,000)\n🏆 Ранг: 👑 Главный Управляющий\n🛡️ Статус в беседе: Владелец\n⚔️ Побед в дуэлях: 124`;
        botImage = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop&bg=000000'; 
      } else if (lower.includes('/get') || lower.includes('/гет')) {
        const userName = 'Олег Сиротинин';
        const genitiveTargetName = toGenitive(userName);
        botResponse = `🔎 Наказания пользователя [id1|${genitiveTargetName}]`;
        botButtonRows = [
          [{ label: '⚠️ Предупреждения', payload: { type: 'get_info', subType: 'warns', userName }, color: 'white' }],
          [
            { label: '🔇 Блокировка чата', payload: { type: 'get_info', subType: 'mutes', userName }, color: 'white' },
            { label: '🔒 Блокировка', payload: { type: 'get_info', subType: 'bans', userName }, color: 'white' }
          ]
        ];
      } else if (lower.includes('/рулетка') || lower.includes('/roulette')) {
        botResponse = `🎰 Рулетка\n\n💵 Ставка: 1000$\n🎯 Выбор: (число / цвет)\n\n[🔴 Красное] [⚫ Чёрное] [🟢 Зелёное]\n\n🍀 Сделайте ставку, чтобы запустить рулетку.`;
        botButtonRows = [
          [
            { label: '🔴 Красное', payload: { type: 'roulette_spin', bet: 1000, color: 'red' }, color: 'white' },
            { label: '⚫ Чёрное', payload: { type: 'roulette_spin', bet: 1000, color: 'black' }, color: 'white' },
            { label: '🟢 Зелёное', payload: { type: 'roulette_spin', bet: 1000, color: 'green' }, color: 'white' }
          ]
        ];
      } else if (lower.includes('/казино') || lower.includes('/casino')) {
        const emojis = ['💎', '🍒', '🍀', '🪙', '🔔', '🍋', '💰', '⭐'];
        const e1 = emojis[Math.floor(Math.random() * emojis.length)];
        const e2 = emojis[Math.floor(Math.random() * emojis.length)];
        const e3 = emojis[Math.floor(Math.random() * emojis.length)];
        const isWin = e1 === e2 || e2 === e3 || e1 === e3;
        const stake = 1000;
        botResponse = `🎰 Казино\n\n💵 Ставка: ${stake.toLocaleString()}$\n🎯 Выпало: [ ${e1} | ${e2} | ${e3} ]\n\nИтог: ${isWin ? `Вы выиграли +500 $! (всего: 1.500$)` : `Комбинация не совпала. Ставка сгорела (-1.000 $)`}\nБонус: ${isWin ? '+50%' : '0%'}`;
        botButtonRows = [
          [
            { label: 'Повторить', color: 'white' },
            { label: 'Сыграть на весь баланс', color: 'white' }
          ]
        ];
      } else if (lower.includes('/баланс') || lower.includes('/balance')) {
        botResponse = `💰 Ваш кошелек: 1,450,000 🪙\n🏦 В банке беседы: 45,200,000 🪙\n💎 Изумрудов: 850`;
      } else if (lower.includes('/hidetop') || lower.includes('/скрытьтоп')) {
        botResponse = `✅ Пользователь [id778382713|Олег] успешно скрыт из топов.`;
      } else if (lower.includes('/unhidetop') || lower.includes('/раскрытьтоп') || lower.includes('/вернутьвтоп')) {
        botResponse = `✅ Пользователь [id778382713|Олег] снова отображается в топах.`;
      } else if (lower.includes('/дуэль') || lower.includes('/duel')) {
        botResponse = `⚔️ Вы вызвали @friend на дуэль на 5,000 🪙!\nСоперник принял вызов!\n💥 Победитель: [id778382713|Олег] (+10,000 🪙)`;
      } else if (lower.includes('/кик') || lower.includes('/kick')) {
        botResponse = `🛡️ Модерация беседы:\nУчастник @spammer успешно исключен из беседы.\nПричина: Нарушение правил (Спам)`;
      } else if (lower.includes('/правила') || lower.includes('/rules')) {
        botResponse = `📜 Правила беседы:\n1. Запрещен спам и реклама чужих сервисов.\n2. Уважайте участников беседы.\n3. Матерная речь ограничена (автомутирование за капс).\n4. Команды бота использовать без флуда.`;
      } else {
        botResponse = `✅ Команда "${textCmd}" успешно выполнена за 3.2 мс!\nЧат-менеджер «Mint» активен 24/7.`;
      }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVkFormatted: true,
        buttonRows: botButtonRows,
        imageUrl: botImage
      }]);
    }, 280);
  };

  return (
    <div className="w-full bg-neutral-950/70 backdrop-blur-xl border border-white/10 hover:border-violet-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px] transition-all relative">
      {/* Toast Notification for Rate Limit */}
      {rateLimitToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-xs shadow-2xl animate-bounce">
          {rateLimitToast}
        </div>
      )}

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
              {m.imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black">
                  <img src={m.imageUrl} alt="Bot attachment" className="w-full h-auto object-contain" />
                </div>
              )}

              {/* Roulette Casino Green Visual Result */}
              {m.rouletteResult !== undefined && (
                <div className="mb-4 p-5 rounded-2xl bg-[#0c502b] border-4 border-[#146b3a] flex flex-col items-center justify-center gap-4 shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)]">
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-black/40 px-3 py-1 rounded-full border border-emerald-500/30">
                     🎰 Казино Mint · Результат раунда
                   </div>

                   {/* Circular Roulette Wheel with Upright Numbers (NEVER UPSIDE DOWN) */}
                   <div className="relative w-56 h-56 rounded-full bg-[#1e1308] border-4 border-[#d4af37] shadow-2xl flex items-center justify-center overflow-hidden">
                      {/* Sector Ring with completely upright numbers */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                        {ROULETTE_NUMBERS.map((num, idx) => {
                          const angle = (idx * 360) / ROULETTE_NUMBERS.length;
                          const rad = (angle - 90) * (Math.PI / 180);
                          const isRed = RED_NUMBERS.includes(num);
                          const isZero = num === 0;
                          const fillColor = isZero ? '#059669' : isRed ? '#dc2626' : '#18181b';
                          const x = 100 + 78 * Math.cos(rad);
                          const y = 100 + 78 * Math.sin(rad);
                          return (
                            <g key={idx}>
                              {/* Colored sector dot / marker */}
                              <circle cx={x} cy={y} r="8" fill={fillColor} stroke="#d4af37" strokeWidth="0.5" />
                              {/* Numbers are drawn horizontally, completely upright, NEVER upside-down! */}
                              <text
                                x={x}
                                y={y + 3}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                {num}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Giant Center Winning Number */}
                      <div className={`z-10 w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl ${
                        m.rouletteResult.color === 'red' ? 'bg-red-600 border-red-300 shadow-red-600/60' :
                        m.rouletteResult.color === 'green' ? 'bg-emerald-500 border-emerald-200 shadow-emerald-500/60' :
                        'bg-neutral-900 border-neutral-500 shadow-black'
                      }`}>
                         <span className="text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                           {m.rouletteResult.number}
                         </span>
                         <span className="text-[9px] font-black uppercase text-white/90 tracking-tighter">
                           {m.rouletteResult.color === 'red' ? 'Красное' : m.rouletteResult.color === 'green' ? 'Зелёное' : 'Чёрное'}
                         </span>
                      </div>
                   </div>
                </div>
              )}

              {/* Roulette Initial Idle Wheel on Green Background */}
              {(!m.rouletteResult && m.text.includes('🎰 Рулетка') && !m.imageUrl) && (
                <div className="mb-4 p-5 rounded-2xl bg-[#0c502b] border-4 border-[#146b3a] flex flex-col items-center gap-3 shadow-xl">
                   <div className="relative w-44 h-44 rounded-full bg-[#1e1308] border-4 border-[#d4af37] flex items-center justify-center shadow-xl">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                        {ROULETTE_NUMBERS.filter((_, i) => i % 2 === 0).map((num, idx) => {
                          const angle = (idx * 360) / (ROULETTE_NUMBERS.length / 2);
                          const rad = (angle - 90) * (Math.PI / 180);
                          const isRed = RED_NUMBERS.includes(num);
                          const isZero = num === 0;
                          const fillColor = isZero ? '#059669' : isRed ? '#dc2626' : '#18181b';
                          const x = 100 + 74 * Math.cos(rad);
                          const y = 100 + 74 * Math.sin(rad);
                          return (
                            <g key={idx}>
                              <circle cx={x} cy={y} r="8" fill={fillColor} stroke="#d4af37" strokeWidth="0.5" />
                              <text x={x} y={y + 3} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                                {num}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <div className="z-10 w-20 h-20 rounded-full bg-black/80 border-2 border-[#d4af37] flex items-center justify-center">
                         <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                      </div>
                   </div>
                   <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-emerald-500/30">
                      Зелёное сукно казино · Сделайте ставку
                   </div>
                </div>
              )}

              <div>{m.text}</div>
              
              {/* Interactive Buttons (grouped into rows for accurate VK layout) */}
              {(m.buttonRows && m.buttonRows.length > 0) && (
                <div className="mt-4 space-y-2">
                  {m.buttonRows.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex flex-wrap gap-2">
                      {row.map((btn, btnIdx) => (
                        <button
                          key={btnIdx}
                          onClick={() => handleButtonClick(btn, m.id)}
                          className="px-3.5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-90 shadow-md border flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 border-white"
                        >
                          {btn.label === 'Назад' && <ChevronLeft className="w-3 h-3 text-black" />}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy Flat Buttons Support */}
              {(!m.buttonRows && m.buttons && m.buttons.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleButtonClick(btn, m.id)}
                      className="px-3.5 py-2 rounded-xl text-[11px] font-black transition-all active:scale-90 shadow-md border flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 border-white"
                    >
                      {btn.label === 'Назад' && <ChevronLeft className="w-3 h-3 text-black" />}
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
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
          placeholder="Введите команду бота (например: /get, /рулетка, /баланс)..."
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
