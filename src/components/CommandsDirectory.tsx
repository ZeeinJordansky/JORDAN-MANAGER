import React, { useState } from 'react';
import { Search, Terminal, Shield, Gamepad2, Users, Coins, Settings, Sparkles } from 'lucide-react';

interface CommandItem {
  name: string;
  category: 'moderation' | 'games' | 'clans' | 'economy' | 'settings';
  categoryLabel: string;
  usage: string;
  description: string;
  permissionLevel: 'Участник' | 'Модератор' | 'Администратор' | 'Владелец';
}

const COMMANDS_DATA: CommandItem[] = [
  // Модерация
  { name: '/кик', category: 'moderation', categoryLabel: 'Модерация', usage: '/кик [@пользователь или ссылка]', description: 'Исключить участника из беседы по ссылке или ответу на сообщение.', permissionLevel: 'Модератор' },
  { name: '/мут', category: 'moderation', categoryLabel: 'Модерация', usage: '/мут [@пользователь] [время в мин] [причина]', description: 'Запретить участнику писать в чат на указанный срок.', permissionLevel: 'Модератор' },
  { name: '/размут', category: 'moderation', categoryLabel: 'Модерация', usage: '/размут [@пользователь]', description: 'Снять временную блокировку отправки сообщений.', permissionLevel: 'Модератор' },
  { name: '/варн', category: 'moderation', categoryLabel: 'Модерация', usage: '/варн [@пользователь] [причина]', description: 'Выдать предупреждение. При достижении лимита производится автоматический кик.', permissionLevel: 'Модератор' },
  { name: '/снятьварн', category: 'moderation', categoryLabel: 'Модерация', usage: '/снятьварн [@пользователь]', description: 'Аннулировать одно или все предупреждения участника.', permissionLevel: 'Модератор' },
  { name: '/бан', category: 'moderation', categoryLabel: 'Модерация', usage: '/бан [@пользователь]', description: 'Заблокировать участника в беседе навсегда.', permissionLevel: 'Администратор' },
  { name: '/разбан', category: 'moderation', categoryLabel: 'Модерация', usage: '/разбан [@пользователь]', description: 'Разблокировать участника и разрешить повторный вход.', permissionLevel: 'Администратор' },
  { name: '/муты', category: 'moderation', categoryLabel: 'Модерация', usage: '/муты', description: 'Показать текущий список действующих мутов в беседе.', permissionLevel: 'Участник' },

  // Игры
  { name: '/дуэль', category: 'games', categoryLabel: 'Игры', usage: '/дуэль [@пользователь] [ставка]', description: 'Вызвать участника на дуэль на монеты. Победитель определяется алгоритмом.', permissionLevel: 'Участник' },
  { name: '/казино', category: 'games', categoryLabel: 'Игры', usage: '/казино [сумма]', description: 'Сделать ставку в рулетке с шансом выигрыша x2 или x3.', permissionLevel: 'Участник' },
  { name: '/работа', category: 'games', categoryLabel: 'Игры', usage: '/работа', description: 'Устроиться на работу и получать регулярный заработок монет раз в час.', permissionLevel: 'Участник' },
  { name: '/ограбление', category: 'games', categoryLabel: 'Игры', usage: '/ограбление [@пользователь]', description: 'Попытаться ограбить другого игрока с определенным риском.', permissionLevel: 'Участник' },
  { name: '/бизнес', category: 'games', categoryLabel: 'Игры', usage: '/бизнес', description: 'Покупка и управление виртуальными бизнесами, приносящими пассивный доход.', permissionLevel: 'Участник' },
  { name: '/кейсы', category: 'games', categoryLabel: 'Игры', usage: '/кейсы', description: 'Открыть кейс с призами (монеты, статус, уникальные титулы).', permissionLevel: 'Участник' },

  // Кланы
  { name: '/клан создать', category: 'clans', categoryLabel: 'Кланы', usage: '/клан создать [название]', description: 'Основать собственный клан и стать его главой.', permissionLevel: 'Участник' },
  { name: '/клан инфо', category: 'clans', categoryLabel: 'Кланы', usage: '/клан инфо', description: 'Информация о вашем клане, его казне, казне и уровне.', permissionLevel: 'Участник' },
  { name: '/клан пригласить', category: 'clans', categoryLabel: 'Кланы', usage: '/клан пригласить [@пользователь]', description: 'Пригласить участника беседы в ваш клан.', permissionLevel: 'Участник' },
  { name: '/клан казна', category: 'clans', categoryLabel: 'Кланы', usage: '/клан казна пополнить [сумма]', description: 'Внести монеты в общую казну клана для прокачки.', permissionLevel: 'Участник' },
  { name: '/клан топ', category: 'clans', categoryLabel: 'Кланы', usage: '/клан топ', description: 'Рейтинг сильнейших кланов бота.', permissionLevel: 'Участник' },

  // Экономика
  { name: '/профиль', category: 'economy', categoryLabel: 'Экономика', usage: '/профиль [@пользователь]', description: 'Посмотреть личный профиль, баланс, ранг и статистику.', permissionLevel: 'Участник' },
  { name: '/баланс', category: 'economy', categoryLabel: 'Экономика', usage: '/баланс', description: 'Мгновенная проверка количества монет и драгоценностей.', permissionLevel: 'Участник' },
  { name: '/перевод', category: 'economy', categoryLabel: 'Экономика', usage: '/перевод [@пользователь] [сумма]', description: 'Передать монеты другому участнику без комиссии.', permissionLevel: 'Участник' },
  { name: '/бонус', category: 'economy', categoryLabel: 'Экономика', usage: '/бонус', description: 'Забрать ежедневную награду монет.', permissionLevel: 'Участник' },
  { name: '/топ', category: 'economy', categoryLabel: 'Экономика', usage: '/топ', description: 'Рейтинг самых богатых участников беседы.', permissionLevel: 'Участник' },

  // Настройки
  { name: '/настройки', category: 'settings', categoryLabel: 'Настройки', usage: '/настройки', description: 'Посмотреть текущие параметры автомодерации и игр.', permissionLevel: 'Администратор' },
  { name: '/приветствие', category: 'settings', categoryLabel: 'Настройки', usage: '/приветствие [текст]', description: 'Установить новое текст-приветствие для вступающих участников.', permissionLevel: 'Администратор' },
  { name: '/правила', category: 'settings', categoryLabel: 'Настройки', usage: '/правила [текст]', description: 'Просмотр или изменение свода правил беседы.', permissionLevel: 'Участник' },
  { name: '/префикс', category: 'settings', categoryLabel: 'Настройки', usage: '/префикс [символ]', description: 'Изменить командный префикс бота для этой беседы.', permissionLevel: 'Владелец' },
  { name: '/антиссылки', category: 'settings', categoryLabel: 'Настройки', usage: '/антиссылки [вкл/выкл]', description: 'Включить автоудаление сообщений с внешними ссылками.', permissionLevel: 'Администратор' },
  { name: '/антимат', category: 'settings', categoryLabel: 'Настройки', usage: '/антимат [вкл/выкл]', description: 'Фильтрация матерных выражений и автоматическая выдача мута.', permissionLevel: 'Администратор' },
];

export default function CommandsDirectory() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const categories = [
    { id: 'all', label: 'Все команды', icon: Terminal },
    { id: 'moderation', label: 'Модерация', icon: Shield },
    { id: 'games', label: 'Игры & РП', icon: Gamepad2 },
    { id: 'clans', label: 'Кланы', icon: Users },
    { id: 'economy', label: 'Экономика', icon: Coins },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  const filteredCommands = COMMANDS_DATA.filter((cmd) => {
    const matchesCat = activeCategory === 'all' || cmd.category === activeCategory;
    const matchesSearch =
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.usage.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по командам..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all font-medium"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto w-full md:w-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCommands.map((cmd) => (
          <div
            key={cmd.name + cmd.usage}
            className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-sm hover:shadow-indigo-500/5"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  {cmd.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    cmd.permissionLevel === 'Владелец'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : cmd.permissionLevel === 'Администратор'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : cmd.permissionLevel === 'Модератор'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cmd.permissionLevel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed font-medium">
                {cmd.description}
              </p>
            </div>

            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 mt-2">
              <span className="text-[10px] font-mono text-slate-400 block truncate">
                Синтаксис: <code className="text-slate-200">{cmd.usage}</code>
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredCommands.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-xs">
          Ничего не найдено по запросу "{search}". Попробуйте изменить критерии поиска.
        </div>
      )}
    </div>
  );
}
