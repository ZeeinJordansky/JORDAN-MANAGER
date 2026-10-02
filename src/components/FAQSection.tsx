import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageSquare, Shield, ShieldCheck, Zap, Sparkles, Terminal, Users, ExternalLink } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'general' | 'moderation' | 'economy' | 'troubleshooting';
  question: string;
  answer: string;
  details?: string[];
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'add-bot',
    category: 'general',
    question: 'Как добавить чат-менеджера «Mint» в беседу ВКонтакте?',
    answer: 'Добавить бота очень просто:',
    details: [
      '1. Нажмите кнопку «Добавить в беседу» в шапке сайта или перейдите по официальной ссылке приложения VK.',
      '2. Выберите нужную беседу из предложенного списка.',
      '3. Зайдите в настройки беседы ВКонтакте и обязательно выдайте боту права Администратора (чтобы он мог исключать нарушителей, удалять спам и управлять правами).',
      '4. Напишите в чат /хелп или /инфо для проверки работоспособности.'
    ]
  },
  {
    id: 'pricing',
    category: 'general',
    question: 'Бот бесплатный или нужно платить за использование?',
    answer: 'Основной функционал бота «Mint» полностью бесплатный! Сюда входят автомодерация, защита от спама и рейдов, приветствия новых участников, экономика, игры, дуэли, кланы и полная система команд. Для масштабных сетей бесед доступны дополнительные функции кастомизации.',
  },
  {
    id: 'bans-registry',
    category: 'moderation',
    question: 'Что такое реестр блокировок и как он работает?',
    answer: 'Реестр блокировок — это инструмент проверки пользователей по всем подключенным к «Mint» беседам. Введя ID или ссылку на профиль (например, /getbans=durov), администраторы могут мгновенно увидеть, есть ли у пользователя активные баны за спам, скам или рейды в других беседах сети.',
  },
  {
    id: 'prefixes',
    category: 'general',
    question: 'Какие префиксы поддерживаются для вызова команд?',
    answer: 'Чат-менеджер «Mint» поддерживает гибкую систему префиксов. Вы можете использовать любой из следующих вариантов перед названием команды:',
    details: [
      '• Слэш: / (например, /профиль, /бан, /кик, /топ)',
      '• Восклицательный знак: ! (например, !профиль, !варн)',
      '• Точка: . (например, .профиль, .мут)',
      '• Текстовые префиксы: «минт» или «см» (например, минт профиль, см баланс)'
    ]
  },
  {
    id: 'bot-not-responding',
    category: 'troubleshooting',
    question: 'Что делать, если бот не отвечает на команды в беседе?',
    answer: 'Если бот молчит, выполните следующие шаги проверки:',
    details: [
      '1. Проверьте права администратора: перейдите в список участников беседы и убедитесь, что боту присвоен статус «Администратор».',
      '2. Доступ к сообщениям: в настройках группы ВК у бота должен быть включен доступ к переписке.',
      '3. Проверьте пинг: введите /пинг в чате.',
      '4. Если бот временно перезагружается, статус и пинг можно проверить на главной странице нашего сайта в реальном времени.'
    ]
  },
  {
    id: 'automod',
    category: 'moderation',
    question: 'Как настроить авто-модерацию и защиту от спама/рейдов?',
    answer: 'Администраторы беседы могут тонко настраивать правила автомодерации:',
    details: [
      '• Защита от спама и флуда: бот автоматически ограничивает пользователей, отправляющих одинаковые сообщения.',
      '• Анти-ссылки: авто-удаление сторонних ссылок и рекламных постов.',
      '• Фильтр нецензурных выражений и капса: автоматическая выдача мута или предупреждения.',
      '• Анти-рейд: запрет на массовый вход подозрительных страниц.'
    ]
  },
  {
    id: 'clans-economy',
    category: 'economy',
    question: 'Как создать клан и участвовать в битвах?',
    answer: 'Для создания клана используйте команду /создать клан [название]. Создатель становится лидером клана, может приглашать участников (/клан пригласить), устанавливать налоги в казну и объявлять клановые битвы за рейтинг.',
  },
  {
    id: 'command-help',
    category: 'general',
    question: 'Как посмотреть подробное объяснение любой команды?',
    answer: 'На главной странице сайта или во вкладке «Команды» нажмите на любую карточку команды. Откроется подробная справка с точным форматом ввода, объяснением всех аргументов и готовым примером.',
  }
];

interface FAQSectionProps {
  theme?: 'dark' | 'light';
}

export default function FAQSection({ theme = 'dark' }: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'add-bot': true,
    'bans-registry': true
  });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'moderation' | 'economy' | 'troubleshooting'>('all');

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
    { id: 'general', label: 'Общие вопросы' },
    { id: 'moderation', label: 'Модерация и Баны' },
    { id: 'economy', label: 'Экономика и Кланы' },
    { id: 'troubleshooting', label: 'Помощь и Решение проблем' }
  ];

  return (
    <section className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Справка и Поддержка</span>
        </div>
        <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
          Часто задаваемые вопросы (FAQ)
        </h2>
        <p className={`text-xs sm:text-sm max-w-xl mx-auto ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Ответы на самые популярные вопросы по добавлению, настройке команд и возможностям чат-менеджера «Mint»
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
        {categories.map(cat => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? isLight
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30'
                  : isLight
                  ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  : 'bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-850'
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
                    ? 'bg-white border-violet-300 shadow-md'
                    : 'bg-white/80 border-neutral-200 hover:border-neutral-300'
                  : isOpen
                  ? 'bg-neutral-900/90 border-violet-500/40 shadow-xl shadow-violet-950/20'
                  : 'bg-neutral-950/60 border-white/5 hover:border-white/10'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className={`text-sm sm:text-base font-bold transition-colors ${
                  isOpen
                    ? 'text-violet-500'
                    : isLight ? 'text-neutral-900' : 'text-neutral-200'
                }`}>
                  {item.question}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 border ${
                  isOpen
                    ? 'rotate-180 bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : isLight
                    ? 'bg-neutral-100 border-neutral-200 text-neutral-500'
                    : 'bg-neutral-800 border-white/5 text-neutral-400'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className={`px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm leading-relaxed border-t ${
                  isLight ? 'border-neutral-100 text-neutral-700' : 'border-white/5 text-neutral-300'
                }`}>
                  <p className="font-medium">{item.answer}</p>
                  {item.details && item.details.length > 0 && (
                    <div className="mt-3 space-y-1.5 pl-1 font-normal">
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

      {/* Still have questions banner */}
      <div className={`p-6 rounded-3xl border text-center space-y-3 backdrop-blur-xl ${
        isLight ? 'bg-violet-50/60 border-violet-200' : 'bg-gradient-to-r from-violet-950/30 to-indigo-950/30 border-violet-500/20'
      }`}>
        <h3 className={`text-base font-bold ${isLight ? 'text-neutral-900' : 'text-white'}`}>
          Не нашли ответ на свой вопрос?
        </h3>
        <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Напишите команду <code className="font-mono font-bold text-violet-400">/хелп</code> прямо в беседе с ботом или обратитесь в официальную группу поддержки ВКонтакте.
        </p>
        <div className="pt-1">
          <a
            href="https://vk.ru/app6441755_-239281784"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>Перейти к боту ВК</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
