import React, { useState } from 'react';
import { Search, Terminal, Shield, Gamepad2, Users, Coins, Settings, Crown, UserCheck, ShieldAlert, Award } from 'lucide-react';

export type PermissionLevel = 'Участник' | 'Модератор' | 'Ст. Модератор' | 'Администратор' | 'Владелец';

interface CommandItem {
  name: string;
  category: 'moderation' | 'games' | 'clans' | 'economy' | 'settings' | 'owner';
  categoryLabel: string;
  usage: string;
  description: string;
  permissionLevel: PermissionLevel;
}

const COMMANDS_DATA: CommandItem[] = [
  // ================= 1. УЧАСТНИК =================
  { name: '/профиль', category: 'economy', categoryLabel: 'Экономика', usage: '/профиль [@пользователь]', description: 'Посмотреть личный профиль, баланс монет, ранг, статус в беседе и клан.', permissionLevel: 'Участник' },
  { name: '/баланс', category: 'economy', categoryLabel: 'Экономика', usage: '/баланс', description: 'Мгновенная проверка количества монет и драгоценностей в кошельке.', permissionLevel: 'Участник' },
  { name: '/перевод', category: 'economy', categoryLabel: 'Экономика', usage: '/перевод [@пользователь] [сумма]', description: 'Передать монеты другому участнику беседы без комиссии.', permissionLevel: 'Участник' },
  { name: '/бонус', category: 'economy', categoryLabel: 'Экономика', usage: '/бонус', description: 'Получить ежедневную денежную награду за активность.', permissionLevel: 'Участник' },
  { name: '/топ', category: 'economy', categoryLabel: 'Экономика', usage: '/топ [монеты/ранг/активность]', description: 'Рейтинг богатейших участников и самых активных собеседников.', permissionLevel: 'Участник' },
  { name: '/онлайн', category: 'settings', categoryLabel: 'Беседа', usage: '/онлайн', description: 'Список участников беседы, находящихся в сети прямо сейчас.', permissionLevel: 'Участник' },
  { name: '/инфо', category: 'settings', categoryLabel: 'Беседа', usage: '/инфо', description: 'Подробная сводка о беседе: количество участников, ID и настройки.', permissionLevel: 'Участник' },
  { name: '/пинг', category: 'settings', categoryLabel: 'Беседа', usage: '/пинг', description: 'Проверка реального отклика и скорости работы сервера чат-менеджера.', permissionLevel: 'Участник' },
  { name: '/правила', category: 'settings', categoryLabel: 'Беседа', usage: '/правила', description: 'Просмотр официально установленных правил текущей беседы.', permissionLevel: 'Участник' },
  { name: '/муты', category: 'moderation', categoryLabel: 'Модерация', usage: '/муты', description: 'Список действующих ограничений и замолкнувших участников.', permissionLevel: 'Участник' },
  { name: '/помощь', category: 'settings', categoryLabel: 'Справка', usage: '/помощь', description: 'Краткая справка по основным разделам и синтаксису команд.', permissionLevel: 'Участник' },

  // Игры & РП (Участник)
  { name: '/дуэль', category: 'games', categoryLabel: 'Игры & РП', usage: '/дуэль [@пользователь] [ставка]', description: 'Вызвать участника на дуэль на монеты. Победитель определяется алгоритмом.', permissionLevel: 'Участник' },
  { name: '/казино', category: 'games', categoryLabel: 'Игры & РП', usage: '/казино [сумма]', description: 'Испытать удачу в рулетке с шансом выигрыша x2 или x3.', permissionLevel: 'Участник' },
  { name: '/рулетка', category: 'games', categoryLabel: 'Игры & РП', usage: '/рулетка [число 0-36 или цвет] [ставка]', description: 'Классическая европейская рулетка со ставками на красное, черное и зеро.', permissionLevel: 'Участник' },
  { name: '/монетка', category: 'games', categoryLabel: 'Игры & РП', usage: '/монетка [орел/решка] [ставка]', description: 'Подбросить виртуальную монетку против системы.', permissionLevel: 'Участник' },
  { name: '/работа', category: 'games', categoryLabel: 'Игры & РП', usage: '/работа', description: 'Устроиться на работу и получать стабильный почасовой заработок.', permissionLevel: 'Участник' },
  { name: '/ограбление', category: 'games', categoryLabel: 'Игры & РП', usage: '/ограбление [@пользователь]', description: 'Попытка ограбить карманы другого игрока с определенным риском штрафа.', permissionLevel: 'Участник' },
  { name: '/бизнес', category: 'games', categoryLabel: 'Игры & РП', usage: '/бизнес', description: 'Покупка и управление коммерческими объектами с пассивным доходом.', permissionLevel: 'Участник' },
  { name: '/кейсы', category: 'games', categoryLabel: 'Игры & РП', usage: '/кейсы [открыть]', description: 'Открытие сундуков с редкими призами, монетами и статусными титулами.', permissionLevel: 'Участник' },
  { name: '/брак', category: 'games', categoryLabel: 'Игры & РП', usage: '/брак [@пользователь]', description: 'Предложить руку и сердце участнику беседы для создания виртуальной семьи.', permissionLevel: 'Участник' },
  { name: '/развод', category: 'games', categoryLabel: 'Игры & РП', usage: '/развод', description: 'Расторгнуть текущий виртуальный брак.', permissionLevel: 'Участник' },
  { name: '/семья', category: 'games', categoryLabel: 'Игры & РП', usage: '/семья', description: 'Просмотр семейного статуса, даты свадьбы и совместного бюджета.', permissionLevel: 'Участник' },

  // Кланы (Участник)
  { name: '/клан создать', category: 'clans', categoryLabel: 'Кланы', usage: '/клан создать [название]', description: 'Основать собственный клан и стать его лидером.', permissionLevel: 'Участник' },
  { name: '/клан инфо', category: 'clans', categoryLabel: 'Кланы', usage: '/клан инфо', description: 'Подробная информация о составе, уровне и казне вашего клана.', permissionLevel: 'Участник' },
  { name: '/клан пригласить', category: 'clans', categoryLabel: 'Кланы', usage: '/клан пригласить [@пользователь]', description: 'Отправить приглашение на вступление в клан участнику беседы.', permissionLevel: 'Участник' },
  { name: '/клан исключить', category: 'clans', categoryLabel: 'Кланы', usage: '/клан исключить [@пользователь]', description: 'Исключить участника из состава вашего клана (для главы/офицеров).', permissionLevel: 'Участник' },
  { name: '/клан казна', category: 'clans', categoryLabel: 'Кланы', usage: '/клан казна пополнить [сумма]', description: 'Внести монеты в общую казну для прокачки кланового уровня.', permissionLevel: 'Участник' },
  { name: '/клан топ', category: 'clans', categoryLabel: 'Кланы', usage: '/клан топ', description: 'Общий рейтинг сильнейших и богатейших кланов.', permissionLevel: 'Участник' },
  { name: '/клан покинуть', category: 'clans', categoryLabel: 'Кланы', usage: '/клан покинуть', description: 'Добровольный выход из состава текущего клана.', permissionLevel: 'Участник' },

  // ================= 2. МОДЕРАТОР =================
  { name: '/кик', category: 'moderation', categoryLabel: 'Модерация', usage: '/кик [@пользователь] [причина]', description: 'Исключить нарушителя из беседы (по ссылке или ответному сообщению).', permissionLevel: 'Модератор' },
  { name: '/мут', category: 'moderation', categoryLabel: 'Модерация', usage: '/мут [@пользователь] [время в мин] [причина]', description: 'Запретить участнику писать сообщения в чат на указанное время.', permissionLevel: 'Модератор' },
  { name: '/размут', category: 'moderation', categoryLabel: 'Модерация', usage: '/размут [@пользователь]', description: 'Досрочно снять ограничение на отправку сообщений.', permissionLevel: 'Модератор' },
  { name: '/варн', category: 'moderation', categoryLabel: 'Модерация', usage: '/варн [@пользователь] [причина]', description: 'Выдать официальное предупреждение. При лимите срабатывает автокик.', permissionLevel: 'Модератор' },
  { name: '/снятьварн', category: 'moderation', categoryLabel: 'Модерация', usage: '/снятьварн [@пользователь]', description: 'Аннулировать одно или все предупреждения участника.', permissionLevel: 'Модератор' },
  { name: '/варны', category: 'moderation', categoryLabel: 'Модерация', usage: '/варны [@пользователь]', description: 'Просмотр истории и списка активных предупреждений нарушителя.', permissionLevel: 'Модератор' },
  { name: '/медленно', category: 'moderation', categoryLabel: 'Модерация', usage: '/медленно [секунды]', description: 'Включить задержку между отправкой сообщений (slowmode).', permissionLevel: 'Модератор' },
  { name: '/очистить', category: 'moderation', categoryLabel: 'Модерация', usage: '/очистить [1-100]', description: 'Удалить последние N сообщений в беседе при флуде или спаме.', permissionLevel: 'Модератор' },
  { name: '/стата', category: 'moderation', categoryLabel: 'Модерация', usage: '/стата [@пользователь]', description: 'Просмотр модераторской истории наказаний участника.', permissionLevel: 'Модератор' },

  // ================= 3. СТАРШИЙ МОДЕРАТОР =================
  { name: '/бан', category: 'moderation', categoryLabel: 'Модерация', usage: '/бан [@пользователь] [причина]', description: 'Внести нарушителя в черный список беседы навсегда.', permissionLevel: 'Ст. Модератор' },
  { name: '/разбан', category: 'moderation', categoryLabel: 'Модерация', usage: '/разбан [@пользователь]', description: 'Исключить нарушителя из черного списка беседы и разрешить вход.', permissionLevel: 'Ст. Модератор' },
  { name: '/банлист', category: 'moderation', categoryLabel: 'Модерация', usage: '/банлист', description: 'Полный перечень участников, находящихся в бане беседы.', permissionLevel: 'Ст. Модератор' },
  { name: '/собачки', category: 'moderation', categoryLabel: 'Модерация', usage: '/собачки [кик/чек]', description: 'Поиск и автоматическое удаление заблокированных страниц (DELETED).', permissionLevel: 'Ст. Модератор' },
  { name: '/кикнеактив', category: 'moderation', categoryLabel: 'Модерация', usage: '/кикнеактив [дней]', description: 'Исключение участников, не написавших ни одного сообщения за N дней.', permissionLevel: 'Ст. Модератор' },

  // ================= 4. АДМИНИСТРАТОР =================
  { name: '/настройки', category: 'settings', categoryLabel: 'Настройки', usage: '/настройки', description: 'Интерактивное меню управления параметрами беседы и фильтрами.', permissionLevel: 'Администратор' },
  { name: '/приветствие', category: 'settings', categoryLabel: 'Настройки', usage: '/приветствие [текст]', description: 'Установить текст автоприветствия с поддержкой тегов {user} и {chat}.', permissionLevel: 'Администратор' },
  { name: '/правила установить', category: 'settings', categoryLabel: 'Настройки', usage: '/правила установить [текст]', description: 'Записать или обновить официальный свод правил беседы.', permissionLevel: 'Администратор' },
  { name: '/антиссылки', category: 'settings', categoryLabel: 'Настройки', usage: '/антиссылки [вкл/выкл]', description: 'Автоудаление любых рекламных и подозрительных ссылок.', permissionLevel: 'Администратор' },
  { name: '/антимат', category: 'settings', categoryLabel: 'Настройки', usage: '/антимат [вкл/выкл]', description: 'Автоматическая цензура ненормативной лексики с выдачей мута.', permissionLevel: 'Администратор' },
  { name: '/антикапс', category: 'settings', categoryLabel: 'Настройки', usage: '/антикапс [вкл/выкл]', description: 'Фильтр сообщений, написанных преимущественно заглавными буквами.', permissionLevel: 'Администратор' },
  { name: '/автокик', category: 'settings', categoryLabel: 'Настройки', usage: '/автокик [вкл/выкл]', description: 'Автоматическое исключение при накоплении установленного числа варнов.', permissionLevel: 'Администратор' },
  { name: '/назначить модератор', category: 'settings', categoryLabel: 'Настройки', usage: '/назначить модератор [@пользователь]', description: 'Выдать участнику полномочия модератора беседы.', permissionLevel: 'Администратор' },
  { name: '/снять модератор', category: 'settings', categoryLabel: 'Настройки', usage: '/снять модератор [@пользователь]', description: 'Отозвать модераторские права у участника.', permissionLevel: 'Администратор' },
  { name: '/лог', category: 'settings', categoryLabel: 'Беседа', usage: '/лог [кол-во]', description: 'Журнал последних модераторских и системных действий в беседе.', permissionLevel: 'Администратор' },

  // ================= 5. ВЛАДЕЛЕЦ БЕСЕДЫ 👑 =================
  { name: '/создатель', category: 'owner', categoryLabel: 'Владелец', usage: '/создатель', description: 'Информация о создателе и текущем юридическом владельце беседы.', permissionLevel: 'Владелец' },
  { name: '/передать права', category: 'owner', categoryLabel: 'Владелец', usage: '/передать права [@пользователь]', description: 'Полная и безоговорочная передача статуса Владельца беседы другому участнику.', permissionLevel: 'Владелец' },
  { name: '/назначить админ', category: 'owner', categoryLabel: 'Владелец', usage: '/назначить админ [@пользователь]', description: 'Назначение полноправного администратора беседы с расширенными правами.', permissionLevel: 'Владелец' },
  { name: '/снять админ', category: 'owner', categoryLabel: 'Владелец', usage: '/снять админ [@пользователь]', description: 'Разжалование администратора до уровня обычного участника.', permissionLevel: 'Владелец' },
  { name: '/префикс', category: 'owner', categoryLabel: 'Владелец', usage: '/префикс [символ]', description: 'Изменение командного символа бота для беседы (например: !, ?, ., /).', permissionLevel: 'Владелец' },
  { name: '/иммунитет', category: 'owner', categoryLabel: 'Владелец', usage: '/иммунитет [@пользователь] [уровень]', description: 'Выдача абсолютного иммунитета от наказаний (киков, мутов, варнов).', permissionLevel: 'Владелец' },
  { name: '/снять все права', category: 'owner', categoryLabel: 'Владелец', usage: '/снять все права', description: 'Экстренное аннулирование полномочий всех назначенных модераторов и админов.', permissionLevel: 'Владелец' },
  { name: '/черный список', category: 'owner', categoryLabel: 'Владелец', usage: '/черный список [вкл/выкл]', description: 'Синхронизация беседы с глобальной базой рейдеров и спамеров Mint Guard.', permissionLevel: 'Владелец' },
  { name: '/сброс беседы', category: 'owner', categoryLabel: 'Владелец', usage: '/сброс беседы [подтвердить]', description: 'Полный сброс параметров, правил, экономики и базы данных текущей беседы.', permissionLevel: 'Владелец' },
  { name: '/резервная копия', category: 'owner', categoryLabel: 'Владелец', usage: '/резервная копия', description: 'Создание и выгрузка зашифрованного архива настроек и рангов беседы.', permissionLevel: 'Владелец' },
  { name: '/восстановить', category: 'owner', categoryLabel: 'Владелец', usage: '/восстановить [ключ бэкапа]', description: 'Восстановление всех настроек и иерархии беседы из резервной копии.', permissionLevel: 'Владелец' },
  { name: '/белый список', category: 'owner', categoryLabel: 'Владелец', usage: '/белый список [@пользователь]', description: 'Добавление доверенного участника в белый список без проверок фильтрами.', permissionLevel: 'Владелец' },
];

interface CommandsDirectoryProps {
  theme?: 'dark' | 'light';
}

export default function CommandsDirectory({ theme = 'dark' }: CommandsDirectoryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const isLight = theme === 'light';

  const categories = [
    { id: 'all', label: 'Все категории', icon: Terminal },
    { id: 'moderation', label: 'Модерация', icon: Shield },
    { id: 'games', label: 'Игры & РП', icon: Gamepad2 },
    { id: 'clans', label: 'Кланы', icon: Users },
    { id: 'economy', label: 'Экономика', icon: Coins },
    { id: 'settings', label: 'Настройки', icon: Settings },
    { id: 'owner', label: 'Владелец', icon: Crown },
  ];

  const levels: { id: string; label: string; icon: any }[] = [
    { id: 'all', label: 'Все ранги', icon: Award },
    { id: 'Участник', label: 'Участник', icon: Users },
    { id: 'Модератор', label: 'Модератор', icon: Shield },
    { id: 'Ст. Модератор', label: 'Ст. Модератор', icon: ShieldAlert },
    { id: 'Администратор', label: 'Администратор', icon: UserCheck },
    { id: 'Владелец', label: 'Владелец беседы 👑', icon: Crown },
  ];

  const filteredCommands = COMMANDS_DATA.filter((cmd) => {
    const matchesCat = activeCategory === 'all' || cmd.category === activeCategory;
    const matchesLevel = activeLevel === 'all' || cmd.permissionLevel === activeLevel;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      cmd.name.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.usage.toLowerCase().includes(q);
    return matchesCat && matchesLevel && matchesSearch;
  });

  const getPermissionBadge = (level: PermissionLevel) => {
    switch (level) {
      case 'Владелец':
        return isLight
          ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-black';
      case 'Администратор':
        return isLight
          ? 'bg-violet-100 text-violet-900 border-violet-300 font-bold'
          : 'bg-violet-500/15 text-violet-300 border-violet-500/30 font-bold';
      case 'Ст. Модератор':
        return isLight
          ? 'bg-purple-100 text-purple-900 border-purple-300'
          : 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Модератор':
        return isLight
          ? 'bg-blue-100 text-blue-900 border-blue-300'
          : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return isLight
          ? 'bg-neutral-100 text-neutral-700 border-neutral-300'
          : 'bg-neutral-900 text-neutral-400 border-neutral-800';
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Search and Level Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск команды, синтаксиса или действия..."
              className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all font-medium ${
                isLight
                  ? 'bg-white border border-neutral-200 focus:border-violet-500 text-neutral-900 placeholder:text-neutral-400 shadow-sm'
                  : 'bg-neutral-950/80 border border-white/10 focus:border-violet-500 text-white placeholder:text-neutral-500'
              }`}
            />
          </div>

          {/* Level Filter (до владельца беседы) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar border">
            {levels.map((lvl) => {
              const Icon = lvl.icon;
              const active = activeLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setActiveLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? isLight
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/30'
                      : isLight
                      ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lvl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
                  active
                    ? isLight
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                      : 'bg-white/10 border-violet-500/50 text-violet-300 shadow-sm'
                    : isLight
                    ? 'bg-white/60 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                    : 'bg-neutral-950/40 border-white/5 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-violet-400" />
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
            key={cmd.name}
            className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3 group ${
              isLight
                ? 'bg-white/90 border-neutral-200 hover:border-violet-400 hover:shadow-md'
                : 'bg-neutral-950/60 backdrop-blur-xl border-white/5 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-base font-black font-mono tracking-tight group-hover:text-violet-400 transition-colors ${
                  isLight ? 'text-neutral-900' : 'text-white'
                }`}>
                  {cmd.name}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPermissionBadge(
                    cmd.permissionLevel
                  )}`}
                >
                  {cmd.permissionLevel}
                </span>
              </div>
              <p className={`text-xs leading-relaxed font-normal ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {cmd.description}
              </p>
            </div>

            <div className={`p-2.5 rounded-xl border font-mono text-[11px] truncate flex items-center justify-between gap-2 ${
              isLight ? 'bg-neutral-100/80 border-neutral-200 text-neutral-800' : 'bg-black/50 border-white/5 text-violet-300'
            }`}>
              <span className="truncate">{cmd.usage}</span>
              <span className="text-[10px] text-neutral-500 shrink-0 font-sans">синтаксис</span>
            </div>
          </div>
        ))}
      </div>

      {filteredCommands.length === 0 && (
        <div className={`text-center py-14 rounded-2xl border ${isLight ? 'bg-white border-neutral-200 text-neutral-500' : 'bg-neutral-950/40 border-white/5 text-neutral-400'}`}>
          <Terminal className="w-8 h-8 mx-auto text-violet-400 opacity-60 mb-2" />
          <p className="text-sm font-bold">Команд по заданным критериям не найдено</p>
          <p className="text-xs text-neutral-500 mt-1">Попробуйте изменить поисковый запрос или фильтр ранга</p>
        </div>
      )}
    </div>
  );
}
