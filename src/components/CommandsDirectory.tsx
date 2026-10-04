import React, { useState, useEffect } from 'react';
import {
  Search, Terminal, Shield, Gamepad2, Coins, Settings, Crown,
  UserCheck, ShieldAlert, Award, X, Copy, Check, Info, ArrowRight, Users,
  Hash, HelpCircle, CheckCircle2, BookOpen, MessageSquare, List, Clock, Zap,
  ChevronRight, Sparkles, Filter, Layout, ShieldCheck, Heart
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
    name: "/пинг",
    aliases: "/ping, /pong, /понг",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/пинг",
    description: "Проверить скорость отклика и состояние бота.",
    permissionLevel: "Участник"
  },
  {
    name: "/помощь",
    aliases: "/help, /хелп, /команды, /меню",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/помощь",
    description: "Вызвать интерактивное меню со списком доступных команд.",
    permissionLevel: "Участник"
  },
  {
    name: "/стата",
    aliases: "/stats, /статистика, /профиль, /profile",
    category: "economy",
    categoryLabel: "Экономика",
    usage: "/стата [@пользователь]",
    description: "Посмотреть личную статистику или профиль другого участника.",
    permissionLevel: "Участник"
  },
  {
    name: "/айди",
    aliases: "/id, /ид",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/айди [@пользователь]",
    description: "Узнать уникальный цифровой ID пользователя ВКонтакте.",
    permissionLevel: "Участник"
  },
  {
    name: "/состав",
    aliases: "/staff, /стафф, /руководство",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/состав",
    description: "Показать список администрации текущей беседы.",
    permissionLevel: "Участник"
  },
  {
    name: "/ник",
    aliases: "/nick, /сник",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/ник [имя]",
    description: "Установить себе персональный никнейм в беседе.",
    permissionLevel: "Участник"
  },
  {
    name: "/гник",
    aliases: "/gnick, /инфоник",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/гник [@пользователь]",
    description: "Узнать текущий никнейм участника.",
    permissionLevel: "Участник"
  },
  {
    name: "/тикет",
    aliases: "/ticket, /репорт, /report",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/тикет [текст]",
    description: "Отправить сообщение в службу поддержки бота.",
    permissionLevel: "Участник"
  },
  {
    name: "/чекроль",
    aliases: "/getrole, /инфороль, /checkrole",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/чекроль [@пользователь]",
    description: "Узнать уровень прав доступа участника.",
    permissionLevel: "Участник"
  },
  {
    name: "/топ",
    aliases: "/top",
    category: "games",
    categoryLabel: "Игры",
    usage: "/топ",
    description: "Глобальные рейтинги лучших участников.",
    permissionLevel: "Участник"
  },
  {
    name: "/рулетка",
    aliases: "/roulette",
    category: "games",
    categoryLabel: "Игры",
    usage: "/рулетка [сумма] [цвет/число]",
    description: "Испытать удачу в классической рулетке.",
    permissionLevel: "Участник"
  },

  // ================= МОДЕРАТОР =================
  {
    name: "/get",
    aliases: "/гет, /инфо",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/get [@пользователь]",
    description: "Посмотреть подробную информацию о наказаниях пользователя.",
    permissionLevel: "Модератор"
  },
  {
    name: "/онлайн",
    aliases: "/olist, /online",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/онлайн",
    description: "Показать список участников, которые сейчас в сети.",
    permissionLevel: "Модератор"
  },
  {
    name: "/оффлайн",
    aliases: "/offlinelist, /офф",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/оффлайн",
    description: "Список участников, находящихся вне сети.",
    permissionLevel: "Модератор"
  },
  {
    name: "/мут",
    aliases: "/mute, /замутить, /км",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/мут [@пользователь] [время] [причина]",
    description: "Ограничить участнику возможность писать в чат.",
    permissionLevel: "Модератор"
  },
  {
    name: "/размут",
    aliases: "/unmute, /размут",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/размут [@пользователь]",
    description: "Снять текущее ограничение чата.",
    permissionLevel: "Модератор"
  },
  {
    name: "/варн",
    aliases: "/warn, /пред",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/варн [@пользователь] [причина]",
    description: "Выдать предупреждение за нарушение правил.",
    permissionLevel: "Модератор"
  },
  {
    name: "/разварн",
    aliases: "/unwarn, /разварн",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/разварн [@пользователь]",
    description: "Снять предупреждение с участника.",
    permissionLevel: "Модератор"
  },
  {
    name: "/кик",
    aliases: "/kick, /кикнуть",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/кик [@пользователь] [причина]",
    description: "Исключить участника из текущей беседы.",
    permissionLevel: "Модератор"
  },
  {
    name: "/очистить",
    aliases: "/clear, /клир",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/очистить [кол-во]",
    description: "Удалить сообщения из истории чата.",
    permissionLevel: "Модератор"
  },
  {
    name: "/тихиймут",
    aliases: "/smute, /смут",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/тихиймут [@пользователь] [время] [причина]",
    description: "Выдать мут без уведомления в общем чате.",
    permissionLevel: "Модератор"
  },
  {
    name: "/тихийкик",
    aliases: "/skick, /скик",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/тихийкик [@пользователь] [причина]",
    description: "Тихо исключить участника из беседы.",
    permissionLevel: "Модератор"
  },
  {
    name: "/склир",
    aliases: "/sclear, /тихийклир",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/склир [кол-во]",
    description: "Тихая очистка сообщений.",
    permissionLevel: "Модератор"
  },
  {
    name: "/листы",
    aliases: "/lists, /списки",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/листы",
    description: "Посмотреть списки наказаний (муты, варны).",
    permissionLevel: "Модератор"
  },
  {
    name: "/пурдж",
    aliases: "/purge, /чистка",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/пурдж [кол-во]",
    description: "Быстрое удаление большого количества сообщений.",
    permissionLevel: "Модератор"
  },

  // ================= СТ. МОДЕРАТОР =================
  {
    name: "/бан",
    aliases: "/ban, /забанить",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/бан [@пользователь] [причина]",
    description: "Заблокировать доступ в беседу навсегда.",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/разбан",
    aliases: "/unban, /разбан",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/разбан [id / ссылка]",
    description: "Удалить пользователя из черного списка.",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/сбан",
    aliases: "/sban, /тихийбан",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/сбан [@пользователь] [причина]",
    description: "Тихая блокировка пользователя.",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/банлист",
    aliases: "/banlist",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/банлист",
    description: "Список всех заблокированных участников.",
    permissionLevel: "Ст. Модератор"
  },
  {
    name: "/банворд",
    aliases: "/banword, /стопслово",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/банворд [добавить/удалить/список] [слово]",
    description: "Управление списком запрещенных слов в беседе.",
    permissionLevel: "Администратор"
  },
  // ================= АДМИНИСТРАТОР =================
  {
    name: "/зов",
    aliases: "/zov, /все, /призыв",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/зов [текст]",
    description: "Упомянуть всех участников беседы.",
    permissionLevel: "Администратор"
  },
  {
    name: "/тишина",
    aliases: "/silence, /мутчат",
    category: "moderation",
    categoryLabel: "Модерация",
    usage: "/тишина [вкл/выкл]",
    description: "Запретить отправку сообщений всем участникам (кроме модерации).",
    permissionLevel: "Администратор"
  },
  {
    name: "/автокик",
    aliases: "/autokick",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/автокик [вкл/выкл]",
    description: "Автоматическое исключение участников за определенные нарушения (например, выход из беседы).",
    permissionLevel: "Администратор"
  },
  {
    name: "/приветствие",
    aliases: "/welcome, /привет",
    category: "settings",
    categoryLabel: "Беседа",
    usage: "/приветствие [текст]",
    description: "Установить текст, который бот будет присылать новым участникам.",
    permissionLevel: "Администратор"
  },
  // ================= ВЛАДЕЛЕЦ =================
  {
    name: "/выдатьуровень",
    aliases: "/addaccesslevel, /сетлевел, /выдатьправа",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/выдатьуровень [@пользователь] [лвл]",
    description: "Назначить участнику определенный уровень прав (1-4).",
    permissionLevel: "Владелец"
  },
  {
    name: "/снятьроль",
    aliases: "/removerole, /delrole, /снятьроль",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/снятьроль [@пользователь]",
    description: "Лишить участника всех должностных полномочий.",
    permissionLevel: "Владелец"
  },
  {
    name: "/настройки",
    aliases: "/settings, /сеттингс",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/настройки",
    description: "Открыть меню управления системами беседы.",
    permissionLevel: "Владелец"
  },
  {
    name: "/размутвсех",
    aliases: "/unmuteall",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/размутвсех",
    description: "Снять муты со всех участников беседы одним разом.",
    permissionLevel: "Владелец"
  },
  {
    name: "/передать",
    aliases: "/transfer",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/передать [@пользователь]",
    description: "Передать полномочия Создателя беседы другому участнику (в рамках бота).",
    permissionLevel: "Владелец"
  },
  {
    name: "/hidetop",
    aliases: "/скрытьтоп, /скрытьстопа",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/hidetop [@пользователь]",
    description: "Скрыть пользователя из всех топов чат-менеджера (доступно Владельцу).",
    permissionLevel: "Владелец"
  },
  {
    name: "/unhidetop",
    aliases: "/раскрытьтоп, /вернутьвтоп",
    category: "owner",
    categoryLabel: "Владелец",
    usage: "/unhidetop [@пользователь]",
    description: "Перестать скрывать пользователя из топов чат-менеджера (доступно Владельцу).",
    permissionLevel: "Владелец"
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
    { id: 'games', label: 'Игры', icon: Gamepad2 },
    { id: 'economy', label: 'Экономика', icon: Coins },
    { id: 'settings', label: 'Беседа', icon: Settings },
    { id: 'owner', label: 'Владелец', icon: Crown },
  ];

  const levels: { id: string; label: string; icon: any }[] = [
    { id: 'all', label: 'Все ранги', icon: Award },
    { id: 'Участник', label: 'Участник', icon: Users },
    { id: 'Модератор', label: 'Модератор', icon: Shield },
    { id: 'Ст. Модератор', label: 'Ст. Модератор', icon: ShieldAlert },
    { id: 'Администратор', label: 'Администратор', icon: UserCheck },
    { id: 'Владелец', label: 'Владелец', icon: Crown },
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
  }).sort((a, b) => {
    const order: Record<PermissionLevel, number> = {
      'Участник': 0,
      'Модератор': 1,
      'Ст. Модератор': 2,
      'Администратор': 3,
      'Владелец': 4
    };
    return order[a.permissionLevel] - order[b.permissionLevel];
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
    <div className="w-full space-y-10 font-sans">
      {/* Top Main Section Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {[
          { id: 'catalog', label: 'Команды', icon: Terminal, count: REAL_BOT_COMMANDS.length },
          { id: 'prefixes', label: 'Префиксы', icon: Hash },
          { id: 'arguments', label: 'Аргументы', icon: BookOpen }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`px-8 py-4 rounded-[1.5rem] text-sm font-black transition-all flex items-center gap-3 cursor-pointer border-2 ${
              currentTab === tab.id
                ? isLight
                  ? 'bg-neutral-950 text-white border-neutral-950 shadow-2xl scale-105'
                  : 'bg-violet-600 border-violet-500 text-white shadow-2xl shadow-violet-600/40 scale-105'
                : isLight
                ? 'bg-white border-neutral-100 text-neutral-500 hover:text-neutral-900 hover:border-neutral-200 shadow-sm'
                : 'bg-neutral-900/40 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${currentTab === tab.id ? 'animate-pulse' : ''}`} />
            <span>{tab.label}</span>
            {tab.count && (
              <span className={`text-[11px] px-2 py-0.5 rounded-lg font-mono font-bold ${currentTab === tab.id ? 'bg-white/20' : 'bg-neutral-500/10'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: CATALOG ================= */}
      {currentTab === 'catalog' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header & Filter Controls */}
          <div className={`p-8 rounded-[2.5rem] border ${
            isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950/40 border-white/5 backdrop-blur-xl'
          } space-y-8`}>
            <div className="flex flex-col xl:flex-row gap-6 items-stretch xl:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className={`w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Найти по команде или описанию..."
                  className={`w-full rounded-2xl pl-14 pr-6 py-4.5 text-base outline-none transition-all font-bold border-2 ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-100 focus:border-violet-400 text-neutral-900 placeholder:text-neutral-400 shadow-inner'
                      : 'bg-black/40 border-white/5 focus:border-violet-600 text-white placeholder:text-neutral-600'
                  }`}
                />
              </div>

              {/* Level Filter Chips */}
              <div className={`flex items-center gap-2 p-2 rounded-2xl overflow-x-auto no-scrollbar border-2 ${
                isLight ? 'bg-neutral-100 border-neutral-100' : 'bg-black/20 border-white/5'
              }`}>
                {levels.map((lvl) => {
                  const active = activeLevel === lvl.id;
                  const Icon = lvl.icon;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setActiveLevel(lvl.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2.5 cursor-pointer border ${
                        active
                          ? isLight ? 'bg-white border-neutral-200 text-violet-600 shadow-md' : 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/20'
                          : isLight
                          ? 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
                          : 'border-transparent text-neutral-500 hover:text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{lvl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
              <div className={`flex items-center gap-3 p-1.5 rounded-2xl border ${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-white/5 border-white/5'}`}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-6 py-3 rounded-[1.25rem] text-[11px] uppercase tracking-wider font-black transition-all whitespace-nowrap flex items-center gap-3 cursor-pointer border ${
                        active
                          ? isLight
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xl'
                            : 'bg-white text-black border-white shadow-xl'
                          : isLight
                          ? 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-900'
                          : 'bg-transparent border-transparent text-neutral-500 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Commands Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommands.map((cmd, idx) => {
              return (
                  <div className={`group rounded-[3rem] p-10 border-2 transition-all cursor-pointer flex flex-col justify-between gap-10 active:scale-[0.98] hover:shadow-[0_40px_80px_-15px_rgba(124,58,237,0.25)] hover:-translate-y-4 relative overflow-hidden ${
                    isLight
                      ? 'bg-white border-neutral-100 hover:border-violet-300'
                      : 'bg-neutral-900 border-white/5 hover:border-violet-500/50'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Decorative background glow on hover */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/10 blur-[60px] group-hover:bg-violet-600/20 transition-all rounded-full" />
                  
                  <div className="space-y-6 relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3 className={`text-3xl font-black font-mono tracking-tighter group-hover:text-violet-500 transition-colors ${
                          isLight ? 'text-neutral-950' : 'text-white'
                        }`}>
                          {cmd.name}
                        </h3>
                        <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {cmd.categoryLabel}
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-[10px] uppercase font-black border-2 tracking-widest shadow-sm ${getPermissionBadge(cmd.permissionLevel)}`}>
                        {cmd.permissionLevel}
                      </div>
                    </div>
                    <p className={`text-base leading-relaxed font-bold line-clamp-3 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      {cmd.description}
                    </p>
                  </div>

                  <div className="space-y-6 relative">
                    <div className={`px-6 py-5 rounded-[1.75rem] font-black text-sm border-2 flex items-center justify-between gap-4 transition-all shadow-sm ${
                      isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-900 group-hover:bg-white group-hover:border-violet-100' : 'bg-black/40 border-white/5 text-violet-300 group-hover:bg-black/60 group-hover:border-white/10'
                    }`}>
                      <span className="truncate tracking-tight opacity-90">{cmd.usage}</span>
                      <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-12 transition-all shadow-lg shadow-violet-600/30">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCommands.length === 0 && (
            <div className={`text-center py-32 rounded-[3rem] border-4 border-dashed ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-400' : 'bg-neutral-950/40 border-white/10 text-neutral-600'}`}>
              <div className="w-20 h-20 bg-neutral-500/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-violet-500/30">
                <Search className="w-10 h-10" />
              </div>
              <p className="text-xl font-black">Команд не найдено</p>
              <p className="text-sm font-bold mt-2 max-w-xs mx-auto">Попробуйте изменить поисковый запрос или выбрать другую категорию</p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PREFIXES GUIDE ================= */}
      {currentTab === 'prefixes' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className={`text-4xl font-black tracking-tight ${isLight ? 'text-neutral-950' : 'text-white'}`}>
              Руководство по префиксам
            </h2>
            <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Префикс — это специальный символ перед командой, который даёт боту понять, что сообщение адресовано ему.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-10 rounded-[3rem] border-2 space-y-8 ${
              isLight ? 'bg-white border-neutral-100 shadow-xl' : 'bg-neutral-900/40 border-white/5'
            }`}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-violet-600 flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
                  <Terminal className="w-8 h-8" />
                </div>
                <h3 className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Стандартные
                </h3>
              </div>
              <div className="space-y-4">
                {['/', '!', '.'].map((p) => (
                  <div key={p} className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all hover:scale-[1.02] ${
                    isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-black/50 border-white/5'
                  }`}>
                    <span className="text-3xl font-black font-mono text-violet-500">{p}</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {p === '/' ? 'Системный' : p === '!' ? 'Модерация' : 'Вспомогательный'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-10 rounded-[3rem] border-2 space-y-8 ${
              isLight ? 'bg-white border-neutral-100 shadow-xl' : 'bg-neutral-900/40 border-white/5'
            }`}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                  Обращения
                </h3>
              </div>
              <div className="space-y-4">
                {['Минт,', 'Бот,', 'Mint,'].map((p) => (
                  <div key={p} className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all hover:scale-[1.02] ${
                    isLight ? 'bg-neutral-50 border-neutral-100' : 'bg-black/50 border-white/5'
                  }`}>
                    <span className="text-xl font-black text-blue-500">{p}</span>
                    <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className={`text-4xl font-black tracking-tight ${isLight ? 'text-neutral-950' : 'text-white'}`}>
              Справочник аргументов
            </h2>
            <p className={`text-base leading-relaxed font-medium ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Некоторые команды требуют ввода дополнительных данных. Узнайте, как правильно их указывать.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                arg: '[срок]',
                title: 'Время действия',
                type: 'Число (мин)',
                desc: 'Указывается целым числом. Например: 60 для часа или 1440 для полных суток блокировки.',
                example: '/мут @user 60 спам'
              },
              {
                arg: '[@user]',
                title: 'Цель команды',
                type: 'Упоминание / Ответ',
                desc: 'Можно использовать @упоминание, ссылку на профиль или просто ответить на сообщение нарушителя.',
                example: '/бан @ivan нарушитель'
              },
              {
                arg: '[текст]',
                title: 'Текстовый параметр',
                type: 'Строка',
                desc: 'Причина наказания, текст приветствия или любое другое произвольное сообщение.',
                example: '/варн @user Причина варна'
              },
              {
                arg: '[лвл]',
                title: 'Уровень прав',
                type: 'Число (1-3)',
                desc: 'Цифровой код должности: 1 - Модератор, 2 - Ст. Мод, 3 - Админ.',
                example: '/выдатьуровень @user 2'
              }
            ].map((item) => (
              <div key={item.arg} className={`p-10 rounded-[3rem] border-2 space-y-6 ${
                isLight ? 'bg-white border-neutral-100 shadow-xl' : 'bg-neutral-900/40 border-white/5'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-2 rounded-xl bg-violet-600 text-white font-mono font-black text-sm shadow-lg shadow-violet-600/20">
                      {item.arg}
                    </span>
                    <h3 className={`text-xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase text-violet-500 bg-violet-500/10 px-3 py-1 rounded-full tracking-widest border border-violet-500/20">
                    {item.type}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed font-bold ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {item.desc}
                </p>
                <div className={`p-5 rounded-2xl border-2 font-mono text-xs flex items-center justify-between ${
                  isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-900' : 'bg-black/60 border-white/5 text-violet-300 shadow-inner'
                }`}>
                  <span className="font-black opacity-80">{item.example}</span>
                  <span className="text-[10px] uppercase font-sans font-black opacity-30 tracking-tighter">Пример</span>
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 backdrop-blur-2xl bg-black/70 transition-all animate-in fade-in duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-3xl rounded-[3rem] overflow-hidden border-4 shadow-2xl transition-all scale-in-95 duration-300 flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-neutral-100' : 'bg-neutral-900 border-white/5'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-8 sm:p-12 border-b-2 flex items-start justify-between gap-8 ${isLight ? 'border-neutral-100 bg-neutral-50/30' : 'border-white/5 bg-black/20'}`}>
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isLight ? 'bg-white border-neutral-200 text-violet-600' : 'bg-neutral-800 border-white/10 text-violet-400'}`}>
                    <Terminal className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-3xl sm:text-4xl font-black font-mono tracking-tighter ${isLight ? 'text-neutral-950' : 'text-white'}`}>
                      {selectedCommand.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getPermissionBadge(selectedCommand.permissionLevel)}`}>
                        {selectedCommand.permissionLevel}
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isLight ? 'bg-neutral-100 text-neutral-500' : 'bg-white/5 text-neutral-500'}`}>
                        {selectedCommand.categoryLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <p className={`text-base sm:text-lg font-bold leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  {selectedCommand.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedCommand(null)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer shrink-0 active:scale-90 ${
                  isLight ? 'bg-white hover:bg-neutral-100 border-neutral-100 text-neutral-400' : 'bg-white/5 hover:bg-white/10 border-white/5 text-neutral-500 hover:text-white'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-10 no-scrollbar">
              {/* Usage Section */}
              <div className="space-y-5">
                <h4 className={`text-[11px] font-black uppercase tracking-[0.3em] ml-1 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Пример вызова в чате
                </h4>
                <div className={`group relative p-10 rounded-[2.5rem] border-2 transition-all shadow-inner ${
                  isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-900' : 'bg-neutral-950 border-white/5 text-white'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 ${
                      isLight ? 'bg-white border-neutral-200 text-violet-600 shadow-sm' : 'bg-neutral-800 border-white/10 text-violet-400'
                    }`}>
                      <Zap className="w-7 h-7" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black break-all pr-16 tracking-tighter">
                      {selectedCommand.usage}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(selectedCommand.usage)}
                    className={`absolute right-6 top-1/2 -translate-y-1/2 p-5 rounded-2xl transition-all cursor-pointer active:scale-90 ${
                      isLight 
                        ? 'bg-neutral-950 text-white shadow-2xl hover:bg-neutral-800' 
                        : 'bg-violet-600 text-white shadow-2xl shadow-violet-600/40 hover:bg-violet-500'
                    }`}
                    title="Копировать команду"
                  >
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Aliases */}
              <div className="space-y-5">
                <h4 className={`text-[11px] font-black uppercase tracking-[0.3em] ml-1 text-neutral-500`}>Синонимы (алиасы)</h4>
                <div className={`p-6 rounded-3xl border-2 text-sm font-black font-mono break-all leading-loose tracking-tight ${
                  isLight ? 'bg-neutral-50 border-neutral-100 text-neutral-700' : 'bg-black/20 border-white/5 text-neutral-500 shadow-inner'
                }`}>
                  {selectedCommand.aliases}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-8 sm:p-12 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-6 ${isLight ? 'border-neutral-100 bg-neutral-50/50' : 'border-white/5 bg-black/40'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className={`text-[11px] font-black block uppercase tracking-widest ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>Безопасность</span>
                  <span className={`text-xs font-black ${isLight ? 'text-neutral-800' : 'text-neutral-300'}`}>
                    Бот реагирует на префиксы: <span className="text-violet-500 font-mono">/ ! . минт</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCommand(null)}
                className="w-full sm:w-auto px-10 py-5 rounded-[1.5rem] bg-neutral-950 dark:bg-violet-600 text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl cursor-pointer"
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
