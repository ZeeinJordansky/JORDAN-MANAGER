import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Shield, Users, Command, Sliders, MessageSquare, AlertTriangle, Coins, LifeBuoy } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'general' | 'moderation' | 'roles' | 'economy' | 'troubleshooting';
  question: string;
  answer: string;
  details?: string[];
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'add-bot',
    category: 'general',
    question: 'Как добавить чат-менеджера «Mint» в свою беседу?',
    answer: 'Добавление бота максимально упрощено:',
    details: [
      '1. Перейдите по кнопке «Добавить в беседу» в верхней части сайта.',
      '2. Выберите нужную беседу из предложенного списка диалогов ВКонтакте.',
      '3. Зайдите в управление беседой и обязательно назначьте бота Администратором. Это критически важно для работы функций удаления сообщений, выдачи мутов и кика участников.',
      '4. Напишите в чате команду /инфо или /пинг, чтобы убедиться, что бот активен и видит сообщения.'
    ]
  },
  {
    id: 'pricing',
    category: 'general',
    question: 'Является ли использование бота платным?',
    answer: 'Основной функционал «Mint» — абсолютно бесплатный. Мы предоставляем все инструменты модерации, игровую экономику, систему кланов и приветствий без каких-либо обязательных подписок. Проект поддерживается за счёт добровольных пожертвований и дополнительных игровых возможностей, не влияющих на безопасность вашей беседы.'
  },
  {
    id: 'prefixes',
    category: 'general',
    question: 'Какие символы (префиксы) нужно писать перед командами?',
    answer: 'Бот «Mint» поддерживает несколько удобных способов вызова:',
    details: [
      '• Стандартные знаки: / (слэш), ! (восклицательный знак) или . (точка).',
      '• Обращение по имени: «Минт, ...», «Mint, ...» или «Бот, ...».'
    ]
  },
  {
    id: 'roles-hierarchy',
    category: 'roles',
    question: 'Какие уровни прав существуют в боте?',
    answer: 'В «Mint» используется строгая иерархия должностей:',
    details: [
      '• Участник (0) — базовые команды и игры.',
      '• Модератор (1) — базовое наказание нарушителей (варны, муты, кики).',
      '• Ст. Модератор (2) — полное управление наказаниями и бан-листом.',
      '• Администратор (3) — настройка модулей бота, приветствий и прав доступа.',
      '• Владелец (4) — полный доступ ко всем системным настройкам беседы.'
    ]
  },
  {
    id: 'assign-role',
    category: 'roles',
    question: 'Как выдать права модератора другому участнику?',
    answer: 'Назначать модераторов может Владелец или Администратор беседы командами:',
    details: [
      '• /модер @упоминание — сразу назначить на должность модератора.',
      '• /админ @упоминание — назначить на должность администратора.'
    ]
  },
  {
    id: 'automod-setup',
    category: 'moderation',
    question: 'Как настроить защиту от спама и ссылок?',
    answer: 'По умолчанию основные фильтры включены. Вы можете тонко настроить их в меню /настройки. Бот автоматически распознает флуд, массовые упоминания, сторонние ссылки и нецензурную лексику, применяя соответствующие меры (удаление или мут).'
  },
  {
    id: 'ban-system',
    category: 'moderation',
    question: 'В чём разница между киком, мутом и баном?',
    answer: 'Это разные степени наказания:',
    details: [
      '• Кик (/кик) — простое исключение из беседы. Участник может вернуться по ссылке.',
      '• Мут (/мут) — временный запрет на отправку сообщений (бот будет удалять их).',
      '• Бан (/бан) — занесение в чёрный список. Бот будет мгновенно исключать участника при попытке зайти обратно.'
    ]
  },
  {
    id: 'economy-how',
    category: 'economy',
    question: 'Как зарабатывать монеты в экономике бота?',
    answer: 'Существует множество способов пополнить баланс:',
    details: [
      '• Активность: Пишите сообщения в чате и получайте за это вознаграждение.',
      '• Бонусы: Используйте /бонус раз в сутки.',
      '• Работа: Команда /работа позволяет получать стабильный доход.',
      '• Игры: Выигрывайте монеты в дуэлях, рулетке или открывая кейсы.'
    ]
  },
  {
    id: 'clans-create',
    category: 'economy',
    question: 'Зачем нужны кланы и как их создавать?',
    answer: 'Кланы объединяют участников для совместной игры и борьбы за место в глобальном топе. Создать клан можно командой /создать клан [название]. После этого вы сможете приглашать друзей, развивать клановую казну и участвовать в битвах.'
  },
  {
    id: 'bot-ignoring',
    category: 'troubleshooting',
    question: 'Бот не реагирует на команды. Что делать?',
    answer: 'Проверьте следующие пункты:',
    details: [
      '1. Убедитесь, что бот является Администратором беседы.',
      '2. Проверьте, разрешены ли сообщения в настройках группы бота.',
      '3. Проверьте пинг на главной странице этого сайта — если он красный, возможны временные перебои на стороне VK.',
      '4. Попробуйте написать «Минт хелп» или «/инфо».'
    ]
  },
  {
    id: 'data-privacy',
    category: 'general',
    question: 'Какие данные сохраняет бот?',
    answer: 'Мы храним только минимально необходимую информацию для работы экономики и прав доступа: ваш ID ВКонтакте, баланс монет, статистику сообщений и настройки вашей беседы. Мы никогда не читаем и не передаём личные переписки третьим лицам.'
  },
  {
    id: 'custom-welcome',
    category: 'moderation',
    question: 'Как изменить сообщение приветствия?',
    answer: 'Используйте команду /приветствие [ваш текст]. Вы можете использовать переменные {user} для упоминания вошедшего и {chat} для вывода названия вашей беседы.'
  },
  {
    id: 'transfer-coins',
    category: 'economy',
    question: 'Можно ли передавать монеты другим игрокам?',
    answer: 'Да, для этого используйте команду /передать @упоминание [сумма]. Обратите внимание, что системная комиссия при переводе отсутствует.'
  },
  {
    id: 'support-contact',
    category: 'troubleshooting',
    question: 'Как пожаловаться на баг или предложить идею?',
    answer: 'Лучший способ — воспользоваться внутренней системой тикетов. Напишите прямо в чате: /тикет [ваше сообщение]. Наша команда поддержки рассмотрит его в кратчайшие сроки.'
  },
  {
    id: 'delete-messages',
    category: 'moderation',
    question: 'Может ли бот удалять сообщения других участников?',
    answer: 'Да, если он назначен администратором беседы. Команда /очистить [число] позволяет быстро прибраться в чате после флуда или спама.'
  },
  {
    id: 'clan-wars',
    category: 'economy',
    question: 'Будут ли добавлены клановые войны?',
    answer: 'Мы активно работаем над системой захвата территорий и клановых сражений. Следите за обновлениями в нашей официальной группе и через команду /новости.'
  }
];

interface FAQSectionProps {
  theme?: 'dark' | 'light';
}

export default function FAQSection({ theme = 'dark' }: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'add-bot': true,
    'prefixes': true,
    'automod-setup': true
  });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'moderation' | 'roles' | 'economy' | 'troubleshooting'>('all');

  const isLight = theme === 'light';

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredItems = selectedCategory === 'all'
    ? FAQ_DATA
    : FAQ_DATA.filter(item => item.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'Все вопросы' },
    { id: 'general', label: 'Общие' },
    { id: 'moderation', label: 'Модерация и Защита' },
    { id: 'roles', label: 'Иерархия и Права' },
    { id: 'economy', label: 'Экономика и Кланы' },
    { id: 'troubleshooting', label: 'Решение проблем' }
  ];

  return (
    <section className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>База знаний</span>
        </div>
        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
          Часто задаваемые вопросы (FAQ)
        </h2>
        <p className={`text-xs sm:text-sm max-w-xl mx-auto ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Подробные ответы на все вопросы по настройке, ролям, безопасности и командам «Mint»
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-1">
        {categories.map(cat => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? isLight
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/25'
                  : isLight
                  ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : 'bg-neutral-900/70 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Accordion Questions List */}
      <div className="space-y-3">
        {filteredItems.map(item => {
          const isOpen = !!openItems[item.id];
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isLight
                  ? isOpen
                    ? 'bg-white border-violet-300 shadow-sm'
                    : 'bg-white/90 border-neutral-200 hover:border-neutral-300'
                  : isOpen
                  ? 'bg-neutral-900/90 border-violet-500/40 shadow-lg shadow-violet-950/20'
                  : 'bg-neutral-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className={`text-sm sm:text-base font-bold transition-colors ${
                  isOpen
                    ? isLight ? 'text-violet-700' : 'text-violet-400'
                    : isLight ? 'text-neutral-900' : 'text-neutral-200'
                }`}>
                  {item.question}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 border ${
                  isOpen
                    ? 'rotate-180 bg-violet-500/15 border-violet-500/30 text-violet-400'
                    : isLight
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-500'
                    : 'bg-neutral-800 border-white/5 text-neutral-400'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className={`px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm leading-relaxed border-t ${
                  isLight ? 'border-neutral-100 text-neutral-700' : 'border-white/5 text-neutral-300'
                }`}>
                  <p className="font-medium pt-3">{item.answer}</p>
                  {item.details && item.details.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 pl-1 font-normal">
                      {item.details.map((detail, idx) => (
                        <div key={idx} className={isLight ? 'text-neutral-600' : 'text-neutral-400'}>
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Callout Banner: exact requested text and replacement */}
      <div className={`p-6 sm:p-7 rounded-3xl border text-center space-y-3 backdrop-blur-xl ${
        isLight ? 'bg-neutral-100/90 border-neutral-200' : 'bg-neutral-900/80 border-white/10'
      }`}>
        <div className="w-10 h-10 mx-auto rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
          Остались вопросы по работе бота?
        </h3>
        <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
          обратитесь в поддержку по команде <code className="px-2 py-0.5 rounded-md font-mono font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20">/тикет</code> в чат-менеджере
        </p>
      </div>
    </section>
  );
}
