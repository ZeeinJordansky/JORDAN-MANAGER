import React, { useState, useEffect } from 'react';
import {
  Search, Terminal, Shield, Gamepad2, Coins, Settings, Crown,
  UserCheck, ShieldAlert, Award, X, Copy, Check, Info, ArrowRight, Users,
  Hash, HelpCircle, CheckCircle2, BookOpen, MessageSquare, List, Clock, Zap
} from 'lucide-react';

export type PermissionLevel = 'Участник' | 'Модератор' | 'Ст. Модератор' | 'Администратор' | 'Владелец';

interface CommandArgument {
  arg: string;
  name: string;
  required: boolean;
  format: string;
  description: string;
}

interface CommandItem {
  name: string;
  aliases: string;
  category: 'moderation' | 'games' | 'economy' | 'settings' | 'owner' | 'clans';
  categoryLabel: string;
  usage: string;
  description: string;
  permissionLevel: PermissionLevel;
  arguments?: CommandArgument[];
  example?: string;
  note?: string;
}

const REAL_BOT_COMMANDS: CommandItem[] = [
  // ================= УЧАСТНИК =================
  {
    name: "/профиль",
    aliases: "/profile, /стата",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/профиль [@пользователь]",
    description: "Посмотреть свой профиль или профиль другого участника.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[@пользователь]", name: "Пользователь", required: false, format: "@упоминание / id / ссылка", description: "Участник, профиль которого вы хотите увидеть." }
    ]
  },
  {
    name: "/баланс",
    aliases: "/bank, /балик",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/баланс",
    description: "Узнать количество монет на вашем счету.",
    permissionLevel: "Участник"
  },
  {
    name: "/бонус",
    aliases: "/daily",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/бонус",
    description: "Получить ежедневную награду в виде монет.",
    permissionLevel: "Участник"
  },
  {
    name: "/топ",
    aliases: "/top",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/топ [тип]",
    description: "Рейтинг лучших участников по монетам или активности.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[тип]", name: "Тип топа", required: false, format: "монеты / актив", description: "По какому критерию строить рейтинг." }
    ]
  },
  {
    name: "/передать",
    aliases: "/pay, /give",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/передать [@пользователь] [сумма]",
    description: "Передать свои монеты другому пользователю.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[@пользователь]", name: "Получатель", required: true, format: "@упоминание / ответ", description: "Кому передать средства." },
      { arg: "[сумма]", name: "Сумма", required: true, format: "Число", description: "Количество передаваемых монет." }
    ]
  },
  {
    name: "/дуэль",
    aliases: "/duel",
    category: "games",
    categoryLabel: "Игры",
    usage: "/дуэль [@пользователь] [ставка]",
    description: "Сыграть с участником в дуэль на монеты.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[@пользователь]", name: "Оппонент", required: true, format: "@упоминание / ответ", description: "С кем хотите сразиться." },
      { arg: "[ставка]", name: "Ставка", required: true, format: "Число", description: "Сумма, которую ставит каждый игрок." }
    ]
  },
  {
    name: "/брак",
    aliases: "/marry",
    category: "games",
    categoryLabel: "Игры",
    usage: "/брак [@пользователь]",
    description: "Сделать предложение участнику вступить в брак.",
    permissionLevel: "Участник"
  },
  {
    name: "/развод",
    aliases: "/divorce",
    category: "games",
    categoryLabel: "Игры",
    usage: "/развод",
    description: "Расторгнуть текущий брак.",
    permissionLevel: "Участник"
  },
  {
    name: "/онлайн",
    aliases: "/online",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/онлайн",
    description: "Показать список всех участников в сети.",
    permissionLevel: "Участник"
  },
  {
    name: "/инфо",
    aliases: "/info",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/инфо",
    description: "Информация о текущей беседе и её участниках.",
    permissionLevel: "Участник"
  },
  {
    name: "/пинг",
    aliases: "/ping",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/пинг",
    description: "Проверить время отклика чат-менеджера.",
    permissionLevel: "Участник"
  },
  {
    name: "/правила",
    aliases: "/rules",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/правила",
    description: "Прочитать установленные правила данной беседы.",
    permissionLevel: "Участник"
  },
  {
    name: "/клан",
    aliases: "/clan",
    category: "clans",
    categoryLabel: "Кланы",
    usage: "/клан [действие]",
    description: "Основные команды управления кланом.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[действие]", name: "Действие", required: true, format: "профиль / казна / участники", description: "Что вы хотите сделать с кланом." }
    ]
  },
  {
    name: "/ник",
    aliases: "/nickname",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/ник [имя]",
    description: "Установить себе персональный никнейм в беседе.",
    permissionLevel: "Участник",
    arguments: [
      { arg: "[имя]", name: "Новый ник", required: true, format: "Текст", description: "Желаемый никнейм." }
    ]
  },
  {
    name: "/кто",
    aliases: "/whois",
    category: "games",
    categoryLabel: "Игры",
    usage: "/кто [текст]",
    description: "Случайный выбор участника для заданного вопроса.",
    permissionLevel: "Участник"
  },

  // ================= МОДЕРАТОР =================
  {
    name: "/кик",
    aliases: "/kick",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/кик [@пользователь] [причина]",
    description: "Исключить пользователя из беседы.",
    permissionLevel: "Модератор",
    arguments: [
      { arg: "[@пользователь]", name: "Нарушитель", required: true, format: "@упоминание / ответ", description: "Кого нужно исключить." },
      { arg: "[причина]", name: "Причина", required: false, format: "Текст", description: "За что исключен участник." }
    ]
  },
  {
    name: "/мут",
    aliases: "/mute",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/мут [@пользователь] [срок] [причина]",
    description: "Запретить пользователю писать сообщения в чат.",
    permissionLevel: "Модератор",
    arguments: [
      { arg: "[@пользователь]", name: "Нарушитель", required: true, format: "@упоминание / ответ", description: "Кому выдать мут." },
      { arg: "[срок]", name: "Срок", required: true, format: "Число (в минутах)", description: "Длительность ограничения." },
      { arg: "[причина]", name: "Причина", required: false, format: "Текст", description: "Обоснование наказания." }
    ]
  },
  {
    name: "/размут",
    aliases: "/unmute",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/размут [@пользователь]",
    description: "Снять текущее ограничение на отправку сообщений.",
    permissionLevel: "Модератор"
  },
  {
    name: "/варн",
    aliases: "/warn",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/варн [@пользователь] [причина]",
    description: "Выдать предупреждение участнику. Лимит по умолчанию: 3 варна.",
    permissionLevel: "Модератор"
  },
  {
    name: "/разварн",
    aliases: "/unwarn",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/разварн [@пользователь]",
    description: "Снять одно или все предупреждения с участника.",
    permissionLevel: "Модератор"
  },
  {
    name: "/варны",
    aliases: "/warns",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/варны [@пользователь]",
    description: "Посмотреть список всех предупреждений участника.",
    permissionLevel: "Модератор"
  },
  {
    name: "/очистить",
    aliases: "/purge, /del",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/очистить [кол-во]",
    description: "Удалить последние сообщения в чате беседы.",
    permissionLevel: "Модератор",
    arguments: [
      { arg: "[кол-во]", name: "Количество", required: true, format: "Число (1-100)", description: "Сколько сообщений необходимо удалить." }
    ]
  },

  // ================= СТ. МОДЕРАТОР =================
  {
    name: "/бан",
    aliases: "/ban",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/бан [@пользователь] [причина]",
    description: "Заблокировать пользователя навсегда (добавление в чёрный список).",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/разбан",
    aliases: "/unban",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/разбан [id / ссылка]",
    description: "Разблокировать пользователя и убрать его из бан-листа.",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/банлист",
    aliases: "/banlist",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/банлист",
    description: "Вывести список всех заблокированных участников.",
    permissionLevel: "Ст. Модератор"
  },

  // ================= АДМИНИСТРАТОР =================
  {
    name: "/настройки",
    aliases: "/settings, /config",
    category: "settings",
    categoryLabel: "Настройки",
    usage: "/настройки",
    description: "Открыть меню настройки фильтров и модулей чата.",
    permissionLevel: "Администратор"
  },
  {
    name: "/приветствие",
    aliases: "/welcome, /greet",
    category: "settings",
    categoryLabel: "Настройки",
    usage: "/приветствие [текст]",
    description: "Установить или изменить текст приветствия для новичков.",
    permissionLevel: "Администратор"
  },
  {
    name: "/зов",
    aliases: "/all, /всем",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/зов [текст]",
    description: "Упомянуть всех участников беседы в одном сообщении.",
    permissionLevel: "Администратор"
  },
  {
    name: "/фильтр",
    aliases: "/filter",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/фильтр [слово]",
    description: "Добавить слово в список запрещенных (стоп-слова).",
    permissionLevel: "Администратор"
  }
];

interface CommandsDirectoryProps {
  theme?: 'dark' | 'light';
}

export default function CommandsDirectory({ theme = 'dark' }: CommandsDirectoryProps) {
  const [currentTab, setCurrentTab] = useState<'catalog' | 'prefixes' | 'arguments'>('catalog');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandItem | null>(null);
  const [copied, setCopied] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (selectedCommand) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCommand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCommand(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    { id: 'all', label: 'Все категории', icon: List },
    { id: 'moderation', label: 'Модерация', icon: Shield },
    { id: 'games', label: 'Игры & РП', icon: Gamepad2 },
    { id: 'economy', label: 'Экономика', icon: Coins },
    { id: 'clans', label: 'Кланы', icon: Users },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  const levels: { id: string; label: string; icon: any }[] = [
    { id: 'all', label: 'Все ранги', icon: Award },
    { id: 'Участник', label: 'Участник', icon: Users },
    { id: 'Модератор', label: 'Модератор', icon: Shield },
    { id: 'Ст. Модератор', label: 'Ст. Модератор', icon: ShieldAlert },
    { id: 'Администратор', label: 'Администратор', icon: UserCheck },
  ];

  const filteredCommands = REAL_BOT_COMMANDS.filter((cmd) => {
    const matchesCat = activeCategory === 'all' || cmd.category === activeCategory;
    const matchesLevel = activeLevel === 'all' || cmd.permissionLevel === activeLevel;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      cmd.name.toLowerCase().includes(q) ||
      cmd.aliases.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.usage.toLowerCase().includes(q);
    return matchesCat && matchesLevel && matchesSearch;
  });

  const getPermissionBadge = (level: PermissionLevel) => {
    switch (level) {
      case 'Владелец':
        return isLight
          ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-black';
      case 'Администратор':
        return isLight
          ? 'bg-violet-100 text-violet-900 border-violet-300 font-bold'
          : 'bg-violet-500/10 text-violet-400 border-violet-500/20 font-bold';
      case 'Ст. Модератор':
        return isLight
          ? 'bg-purple-100 text-purple-900 border-purple-300 font-semibold'
          : 'bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold';
      case 'Модератор':
        return isLight
          ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
          : 'bg-sky-500/10 text-sky-400 border-sky-500/20 font-semibold';
      default:
        return isLight
          ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
          : 'bg-neutral-900 text-neutral-500 border-neutral-800';
    }
  };

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Top Main Section Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setCurrentTab('catalog')}
          className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
            currentTab === 'catalog'
              ? isLight
                ? 'bg-neutral-950 text-white border-neutral-950 shadow-lg'
                : 'bg-violet-600 border-violet-500 text-white shadow-xl shadow-violet-600/30'
              : isLight
              ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              : 'bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Команды</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-mono font-bold ${currentTab === 'catalog' ? 'bg-white/20' : 'bg-neutral-500/10'}`}>
            {REAL_BOT_COMMANDS.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('prefixes')}
          className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
            currentTab === 'prefixes'
              ? isLight
                ? 'bg-neutral-950 text-white border-neutral-950 shadow-lg'
                : 'bg-violet-600 border-violet-500 text-white shadow-xl shadow-violet-600/30'
              : isLight
              ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              : 'bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Префиксы</span>
        </button>

        <button
          onClick={() => setCurrentTab('arguments')}
          className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer border ${
            currentTab === 'arguments'
              ? isLight
                ? 'bg-neutral-950 text-white border-neutral-950 shadow-lg'
                : 'bg-violet-600 border-violet-500 text-white shadow-xl shadow-violet-600/30'
              : isLight
              ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              : 'bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Аргументы</span>
        </button>
      </div>

      {/* ================= TAB 1: CATALOG ================= */}
      {currentTab === 'catalog' && (
        <>
          {/* Header & Filter Controls */}
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1 max-w-xl">
                <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Найти команду или описание..."
                  className={`w-full rounded-2xl pl-12 pr-5 py-3.5 text-sm outline-none transition-all font-medium border ${
                    isLight
                      ? 'bg-white border-neutral-200 focus:border-violet-400 text-neutral-900 placeholder:text-neutral-400 shadow-sm'
                      : 'bg-neutral-950/80 border-white/10 focus:border-violet-500 text-white placeholder:text-neutral-500'
                  }`}
                />
              </div>

              {/* Level Filter Chips */}
              <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border ${
                isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-white/5'
              }`}>
                {levels.map((lvl) => {
                  const active = activeLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setActiveLevel(lvl.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-white text-violet-600 shadow-sm'
                          : isLight
                          ? 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      <span>{lvl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer border ${
                      active
                        ? isLight
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                          : 'bg-white/10 border-violet-500/40 text-violet-300'
                        : isLight
                        ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-950'
                        : 'bg-neutral-950/60 border-white/5 text-neutral-400 hover:text-white'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCommands.map((cmd) => {
              return (
                <div
                  key={cmd.name}
                  onClick={() => setSelectedCommand(cmd)}
                  className={`group rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between gap-5 active:scale-[0.98] hover:shadow-2xl hover:-translate-y-1 ${
                    isLight
                      ? 'bg-white border-neutral-200 hover:border-violet-300 hover:shadow-violet-200/40'
                      : 'bg-neutral-950/60 backdrop-blur-xl border-white/5 hover:border-violet-500/40 hover:shadow-violet-500/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-lg font-black font-mono tracking-tight group-hover:text-violet-500 transition-colors ${
                        isLight ? 'text-neutral-950' : 'text-white'
                      }`}>
                        {cmd.name}
                      </h3>
                      <div className={`px-2.5 py-1 rounded-xl text-[10px] uppercase font-black border tracking-wider ${getPermissionBadge(cmd.permissionLevel)}`}>
                        {cmd.permissionLevel}
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed font-medium line-clamp-2 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                      {cmd.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className={`px-4 py-3 rounded-2xl font-mono text-[11px] border flex items-center justify-between gap-3 overflow-hidden ${
                      isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-900' : 'bg-black/40 border-white/5 text-violet-300'
                    }`}>
                      <span className="truncate">{cmd.usage}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-violet-500 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                    {cmd.aliases && (
                      <div className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 px-1">
                        <span className="opacity-50 uppercase tracking-tighter">Синонимы:</span>
                        <span className="truncate">{cmd.aliases}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCommands.length === 0 && (
            <div className={`text-center py-20 rounded-[2rem] border border-dashed ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-neutral-950/40 border-white/10 text-neutral-400'}`}>
              <div className="w-16 h-16 bg-neutral-500/5 rounded-3xl flex items-center justify-center mx-auto mb-4 text-violet-500/40">
                <Terminal className="w-8 h-8" />
              </div>
              <p className="text-base font-black">Команд не найдено</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">Попробуйте изменить поисковый запрос или сбросить фильтры категорий</p>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: PREFIXES GUIDE ================= */}
      {currentTab === 'prefixes' && (
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className={`text-3xl font-black tracking-tight ${isLight ? 'text-neutral-950' : 'text-white'}`}>
              Руководство по префиксам
            </h2>
            <p className={`text-sm leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Префикс — это специальный символ перед командой, который даёт боту понять, что сообщение адресовано ему.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-8 rounded-[2.5rem] border space-y-6 ${
              isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-900/40 border-white/5'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className={`text-xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Стандартные
                </h3>
              </div>
              <div className="space-y-3">
                {['/', '!', '.'].map((p) => (
                  <div key={p} className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-black/50 border-white/5'
                  }`}>
                    <span className="text-2xl font-black font-mono text-violet-500">{p}</span>
                    <span className={`text-xs font-bold ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                      {p === '/' ? 'Основной системный' : p === '!' ? 'Для модерации' : 'Вспомогательный'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border space-y-6 ${
              isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-900/40 border-white/5'
            }`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className={`text-xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Обращения
                </h3>
              </div>
              <div className="space-y-3">
                {['Минт,', 'Бот,', 'Mint,'].map((p) => (
                  <div key={p} className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-black/50 border-white/5'
                  }`}>
                    <span className="text-lg font-black text-blue-400">{p}</span>
                    <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300">
                      {p} хелп
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ARGUMENTS GUIDE ================= */}
      {currentTab === 'arguments' && (
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className={`text-3xl font-black tracking-tight ${isLight ? 'text-neutral-950' : 'text-white'}`}>
              Справочник аргументов
            </h2>
            <p className={`text-sm leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Некоторые команды требуют ввода дополнительных данных. Узнайте, как правильно их указывать.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                arg: '[срок]',
                title: 'Время действия',
                type: 'Число (мин)',
                desc: 'Указывается целым числом. Например: 60 для часа или 1440 для суток.',
                example: '/мут @user 60 спам'
              },
              {
                arg: '[@user]',
                title: 'Цель команды',
                type: 'Упоминание / Ответ',
                desc: 'Можно использовать @упоминание, ссылку на профиль или просто ответить на сообщение.',
                example: '/бан @ivan нарушитель'
              },
              {
                arg: '[текст]',
                title: 'Текстовый параметр',
                type: 'Строка',
                desc: 'Причина наказания, текст приветствия или клановое сообщение.',
                example: '/варн @user Причина варна'
              },
              {
                arg: '[ставка]',
                title: 'Игровая ставка',
                type: 'Сумма монет',
                desc: 'Количество монет для игры. Должно быть положительным числом.',
                example: '/дуэль @user 5000'
              }
            ].map((item) => (
              <div key={item.arg} className={`p-8 rounded-[2.5rem] border space-y-5 ${
                isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-900/40 border-white/5'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-400 font-mono font-black text-sm border border-violet-500/10">
                      {item.arg}
                    </span>
                    <h3 className={`text-lg font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{item.type}</span>
                </div>
                <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  {item.desc}
                </p>
                <div className={`p-4 rounded-2xl border font-mono text-[11px] flex items-center justify-between ${
                  isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-900' : 'bg-black/50 border-white/5 text-violet-300'
                }`}>
                  <span>{item.example}</span>
                  <span className="text-[9px] uppercase font-sans font-black opacity-40">Пример</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DETAILED COMMAND MODAL ================= */}
      {selectedCommand && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedCommand(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60 transition-all animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all scale-in-95 duration-200 flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-white/10'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-6 sm:p-8 border-b flex items-start justify-between gap-6 ${isLight ? 'border-neutral-100' : 'border-white/5'}`}>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${isLight ? 'text-neutral-950' : 'text-white'}`}>
                    {selectedCommand.name}
                  </h2>
                  <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${getPermissionBadge(selectedCommand.permissionLevel)}`}>
                    {selectedCommand.permissionLevel}
                  </div>
                </div>
                <p className={`text-sm font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  {selectedCommand.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedCommand(null)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                  isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-600' : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 no-scrollbar">
              {/* Usage Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Пример вызова
                  </h4>
                </div>
                <div className={`group relative p-8 rounded-[2rem] border transition-all ${
                  isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-900' : 'bg-neutral-900/50 border-white/5 text-white'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                      isLight ? 'bg-white border-neutral-200 text-violet-600' : 'bg-neutral-800 border-white/10 text-violet-400'
                    }`}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black break-all pr-12 tracking-tight">
                      {selectedCommand.usage}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(selectedCommand.usage)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-neutral-900 text-white shadow-xl opacity-0 group-hover:opacity-100' 
                        : 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Копировать команду"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Arguments Table */}
              {selectedCommand.arguments && selectedCommand.arguments.length > 0 && (
                <div className="space-y-4">
                  <h4 className={`text-xs font-black uppercase tracking-widest text-neutral-500`}>
                    Расшифровка аргументов ({selectedCommand.arguments.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedCommand.arguments.map((arg) => (
                      <div
                        key={arg.arg}
                        className={`p-5 rounded-3xl border transition-all ${
                          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-violet-500">{arg.arg}</span>
                            <span className={`text-sm font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>— {arg.name}</span>
                          </div>
                          {arg.required && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-tighter border border-rose-500/10">Обязательно</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                            {arg.description}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 pt-1">
                            <span className="opacity-50 text-[9px]">ТИП:</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-neutral-500/10 uppercase text-[9px] font-black tracking-widest">{arg.format}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aliases & Examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest text-neutral-500`}>Синонимы (алиасы)</h4>
                  <div className={`p-4 rounded-2xl border text-xs font-mono break-all leading-loose ${isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-950' : 'bg-black/20 border-white/5 text-neutral-400'}`}>
                    {selectedCommand.aliases}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest text-neutral-500`}>Категория</h4>
                  <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-950' : 'bg-black/20 border-white/5 text-neutral-300'}`}>
                    <Terminal className="w-4 h-4 text-violet-400" />
                    {selectedCommand.categoryLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 sm:p-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isLight ? 'border-neutral-100 bg-neutral-50/50' : 'border-white/5 bg-black/20'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                  <Zap className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-black ${isLight ? 'text-neutral-800' : 'text-neutral-300'}`}>
                  Бот реагирует на префиксы: / ! . минт
                </span>
              </div>
              <button
                onClick={() => setSelectedCommand(null)}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-neutral-900 dark:bg-violet-600 text-white font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                Закрыть справку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
