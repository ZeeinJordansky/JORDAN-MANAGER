import React, { useState } from 'react';
import { Search, Terminal, Shield, Gamepad2, Users, Coins, Settings, Crown, UserCheck, ShieldAlert, Award } from 'lucide-react';

export type PermissionLevel = 'Участник' | 'Модератор' | 'Ст. Модератор' | 'Администратор' | 'Владелец';

interface CommandItem {
  name: string;
  aliases: string;
  category: 'moderation' | 'games' | 'economy' | 'settings' | 'owner';
  categoryLabel: string;
  usage: string;
  description: string;
  permissionLevel: PermissionLevel;
}

const REAL_BOT_COMMANDS: CommandItem[] = [
  // ================= 1. УЧАСТНИК =================
  {
    name: '/профиль',
    aliases: '/стата, /статистика, /profile, /stats',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/профиль [@пользователь]',
    description: 'Посмотреть личный профиль, баланс монет, ранг, статус в беседе и клан.',
    permissionLevel: 'Участник',
  },
  {
    name: '/баланс',
    aliases: '/банк, /балик',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/баланс',
    description: 'Мгновенная проверка количества монет и сбережений на счёте.',
    permissionLevel: 'Участник',
  },
  {
    name: '/передать',
    aliases: '/pay, /transfer, /перевод, /датьденег',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/передать [@пользователь] [сумма]',
    description: 'Перевести монеты другому участнику беседы без комиссии.',
    permissionLevel: 'Участник',
  },
  {
    name: '/бонус',
    aliases: '/ежедневный, /ежедневный_бонус',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/бонус',
    description: 'Получить ежедневную денежную награду монет за активность.',
    permissionLevel: 'Участник',
  },
  {
    name: '/топ',
    aliases: '/top',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/топ [монеты / баланс]',
    description: 'Рейтинг самых богатых и активных участников беседы.',
    permissionLevel: 'Участник',
  },
  {
    name: '/онлайн',
    aliases: '/online, /онлайнлист, /olist',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/онлайн',
    description: 'Список участников беседы, находящихся в сети прямо сейчас.',
    permissionLevel: 'Участник',
  },
  {
    name: '/инфо',
    aliases: '/info, /инфобот, /infobot',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/инфо',
    description: 'Информация о беседе, количестве участников, статусе и настройках.',
    permissionLevel: 'Участник',
  },
  {
    name: '/пинг',
    aliases: '/ping',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/пинг',
    description: 'Проверка реального времени отклика бота в миллисекундах.',
    permissionLevel: 'Участник',
  },
  {
    name: '/правила',
    aliases: '/rules',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/правила',
    description: 'Просмотр официально установленных правил текущей беседы.',
    permissionLevel: 'Участник',
  },
  {
    name: '/помощь',
    aliases: '/help, /хелп, /команды, /меню',
    category: 'settings',
    categoryLabel: 'Справка',
    usage: '/помощь',
    description: 'Главное интерактивное меню помощи по всем командам чат-менеджера.',
    permissionLevel: 'Участник',
  },
  {
    name: '/титул',
    aliases: '/title',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/титул [название]',
    description: 'Установить или изменить отображаемый титул в профиле.',
    permissionLevel: 'Участник',
  },
  {
    name: '/депозиты',
    aliases: '/открытьдепозит',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/депозиты [сумма] [срок]',
    description: 'Открыть банковский депозит под процент для приумножения монет.',
    permissionLevel: 'Участник',
  },

  // Игры
  {
    name: '/дуэль',
    aliases: '/duel',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/дуэль [@пользователь] [ставка]',
    description: 'Вызвать участника на дуэль на монеты. Победитель забирает банк.',
    permissionLevel: 'Участник',
  },
  {
    name: '/дуэльбиз',
    aliases: '/duel_biz',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/дуэльбиз [@пользователь]',
    description: 'Опасная дуэль, где ставкой является один из ваших бизнесов.',
    permissionLevel: 'Участник',
  },
  {
    name: '/казино',
    aliases: '/casino',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/казино [сумма]',
    description: 'Сделать ставку в рулетке с шансом выигрыша x2 или x3.',
    permissionLevel: 'Участник',
  },
  {
    name: '/рулетка',
    aliases: '/roulette',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/рулетка [число / цвет] [ставка]',
    description: 'Ставки на красное, черное или конкретный номер в рулетке.',
    permissionLevel: 'Участник',
  },
  {
    name: '/монетка',
    aliases: '/coin, /кнб',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/монетка [орел/решка] [ставка]',
    description: 'Бросок монетки на удачу против бота или другого игрока.',
    permissionLevel: 'Участник',
  },
  {
    name: '/кейсы',
    aliases: '/кейс, /case',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/кейсы [открыть]',
    description: 'Открытие сундуков с редкими призами, монетами и статусными титулами.',
    permissionLevel: 'Участник',
  },
  {
    name: '/бизнес',
    aliases: '/бизнесы, /купитьбиз, /продатьбиз',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/бизнес [купить / продать / прибыль]',
    description: 'Покупка и управление коммерческими объектами с пассивным доходом.',
    permissionLevel: 'Участник',
  },
  {
    name: '/работа',
    aliases: '/работать',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/работа',
    description: 'Устроиться на работу и получать стабильный почасовой заработок.',
    permissionLevel: 'Участник',
  },
  {
    name: '/майнинг',
    aliases: '/ферма',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/майнинг [купить / снять]',
    description: 'Покупка видеокарт и майнинг виртуальной криптовалюты.',
    permissionLevel: 'Участник',
  },
  {
    name: '/брак',
    aliases: '/поженить',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/брак [@пользователь]',
    description: 'Предложить руку и сердце участнику беседы для создания семьи.',
    permissionLevel: 'Участник',
  },
  {
    name: '/развод',
    aliases: '/развести',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/развод',
    description: 'Расторгнуть текущий виртуальный брак.',
    permissionLevel: 'Участник',
  },
  {
    name: '/мафия',
    aliases: '/mafia',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/мафия [старт / войти]',
    description: 'Запуск классической игры Мафия прямо в беседе ВКонтакте.',
    permissionLevel: 'Участник',
  },
  {
    name: '/крокодил',
    aliases: '/croc',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/крокодил [старт]',
    description: 'Игра «Крокодил»: ведущий объясняет загаданное слово, чат угадывает.',
    permissionLevel: 'Участник',
  },
  {
    name: '/клан',
    aliases: '/clan',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/клан [создать / инфо / казна / топ / покинуть]',
    description: 'Создание кланов, клановая казна, прокачка и турниры за рейтинг.',
    permissionLevel: 'Участник',
  },

  // ================= 2. МОДЕРАТОР =================
  {
    name: '/кик',
    aliases: '/kick, /выгнать, /исключить, /k',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/кик [@пользователь] [причина]',
    description: 'Исключить нарушителя из беседы (по ссылке или ответному сообщению).',
    permissionLevel: 'Модератор',
  },
  {
    name: '/мут',
    aliases: '/mute, /мутить, /замутить, /заглушить, /m',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/мут [@пользователь] [время в мин] [причина]',
    description: 'Запретить участнику писать сообщения в чат на указанное время.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/размут',
    aliases: '/unmute, /размутить, /разглушить, /unm',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/размут [@пользователь]',
    description: 'Досрочно снять ограничение на отправку сообщений.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/варн',
    aliases: '/warn, /пред, /предупреждение, /w',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/варн [@пользователь] [причина]',
    description: 'Выдать предупреждение. При наборе 3 варнов нарушитель кикается.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/разварн',
    aliases: '/unwarn, /анварн, /снятьварн, /снятьпред, /unw',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/разварн [@пользователь]',
    description: 'Аннулировать предупреждение участника беседы.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/варны',
    aliases: '/warns, /warnlist, /инфоварн',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/варны [@пользователь]',
    description: 'Просмотр истории и активных предупреждений нарушителя.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/очистить',
    aliases: '/чистка, /purge, /mclear',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/очистить [1-100]',
    description: 'Массовое удаление последних сообщений при спаме или флуде.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/тишина',
    aliases: '/silence',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/тишина [вкл/выкл]',
    description: 'Режим тишины: только модераторы и администраторы могут писать.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/закрепить',
    aliases: '/pin',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/закрепить [в ответ на сообщение]',
    description: 'Закрепить выбранное сообщение в шапке беседы.',
    permissionLevel: 'Модератор',
  },
  {
    name: '/открепить',
    aliases: '/unpin',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/открепить',
    description: 'Удалить закрепленное сообщение из шапки беседы.',
    permissionLevel: 'Модератор',
  },

  // ================= 3. СТАРШИЙ МОДЕРАТОР =================
  {
    name: '/бан',
    aliases: '/ban, /забанить, /б',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/бан [@пользователь] [причина]',
    description: 'Перманентный бан нарушителя с запретом повторного входа.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/разбан',
    aliases: '/unban, /разбанить, /избана',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/разбан [@пользователь]',
    description: 'Снять блокировку и разрешить участнику повторный вход.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/банлист',
    aliases: '/banlist, /инфобан',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/банлист',
    description: 'Полный перечень всех заблокированных участников беседы.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/собачки',
    aliases: '/собаки, /чисткасобачек',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/собачки [кик/чек]',
    description: 'Поиск и автоматическое исключение удаленных страниц ВКонтакте (DELETED).',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/кикнеактив',
    aliases: '/неактив, /очиститьнеактив',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/кикнеактив [кол-во дней]',
    description: 'Автоматический кик молчунов, не писавших в беседу указанное число дней.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/чс',
    aliases: '/чсб, /addblack, /добавитьвчс',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/чс [@пользователь] [причина]',
    description: 'Внесение пользователя в локальный черный список беседы.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/анчс',
    aliases: '/unblack, /изчс, /удалитьизчс',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/анчс [@пользователь]',
    description: 'Удаление пользователя из черного списка беседы.',
    permissionLevel: 'Ст. Модератор',
  },
  {
    name: '/логи',
    aliases: '/logs, /логимут, /логикик, /логиварн, /логибан',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/логи [мут / кик / бан / варн]',
    description: 'Просмотр журнала модераторских действий и выданных наказаний.',
    permissionLevel: 'Ст. Модератор',
  },

  // ================= 4. АДМИНИСТРАТОР =================
  {
    name: '/настройки',
    aliases: '/settings',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/настройки',
    description: 'Панель управления всеми параметрами беседы, фильтрами и модулями.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/приветствие',
    aliases: '/welcometext',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/приветствие [текст с тегами {user} и {chat}]',
    description: 'Установка автоприветствия новых вступивших участников беседы.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/модер',
    aliases: '/setmoder, /аддмодер, /выдатьмодера',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/модер [@пользователь]',
    description: 'Назначить участника модератором беседы.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/снятьмодер',
    aliases: '/unmoder, /снятьроль',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/снятьмодер [@пользователь]',
    description: 'Отозвать модераторские полномочия у участника.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/админ',
    aliases: '/setadmin, /аддадмин, /выдатьадмина',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/админ [@пользователь]',
    description: 'Назначить полноправного администратора беседы.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/снятьадмин',
    aliases: '/унроль',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/снятьадмин [@пользователь]',
    description: 'Снять полномочия администратора с участника.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/ачат',
    aliases: '/achat',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/ачат',
    description: 'Присвоить беседе статус админ-чата для закрытых обсуждений.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/уначат',
    aliases: '/unachat',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/уначат',
    description: 'Снять статус админ-чата с беседы.',
    permissionLevel: 'Администратор',
  },
  {
    name: '/зов',
    aliases: '/zov, /tegall, /все',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/зов [текст объявления]',
    description: 'Упомянуть всех участников беседы одним сообщением при важном сборе.',
    permissionLevel: 'Администратор',
  },

  // ================= 5. ВЛАДЕЛЕЦ БЕСЕДЫ 👑 =================
  {
    name: '/setowner',
    aliases: '/giveowner, /передатьвладельца, /передатьправа',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/setowner [@пользователь]',
    description: 'Полная и безоговорочная передача прав Владельца беседы другому участнику.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/снятьвладельца',
    aliases: '/делетоунер, /снятьправа',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/снятьвладельца',
    description: 'Снять полномочия владельца и сбросить права создателя беседы.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/префикс',
    aliases: '/prefix',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/префикс [символ]',
    description: 'Изменить командный символ бота для этой беседы (например: !, ?, ., /).',
    permissionLevel: 'Владелец',
  },
  {
    name: '/безпрефикса',
    aliases: '/noprefix',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/безпрефикса [вкл/выкл]',
    description: 'Включить или отключить выполнение команд бота без префикса.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/роль',
    aliases: '/nrole, /setrole',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/роль [@пользователь] [название]',
    description: 'Установить кастомную текстовую роль участнику в беседе.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/снятьроль',
    aliases: '/nremoverole, /removerole',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/снятьроль [@пользователь]',
    description: 'Снять назначенную роль с участника беседы.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/сброс',
    aliases: '/reset',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/сброс [подтвердить]',
    description: 'Полный сброс параметров, правил, экономики и модерации беседы к начальным.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/инфочат',
    aliases: '/infochat, /чатинфо',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/инфочат',
    description: 'Полная техническая информация о текущей беседе, правах и модулях.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/банигр',
    aliases: '/снятьбанигр, /чсигр, /снятьчсигр',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/банигр [вкл/выкл]',
    description: 'Полный запрет или разрешение на использование игровых и азартных команд в чате.',
    permissionLevel: 'Владелец',
  },
  {
    name: '/чсбота',
    aliases: '/blacklist',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/чсбота [инфо]',
    description: 'Просмотр базы глобально заблокированных участников в чат-менеджере.',
    permissionLevel: 'Владелец',
  },
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
          : 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-black';
      case 'Администратор':
        return isLight
          ? 'bg-violet-100 text-violet-900 border-violet-300 font-bold'
          : 'bg-violet-500/15 text-violet-300 border-violet-500/30 font-bold';
      case 'Ст. Модератор':
        return isLight
          ? 'bg-purple-100 text-purple-900 border-purple-300 font-semibold'
          : 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold';
      case 'Модератор':
        return isLight
          ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
          : 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold';
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
              placeholder="Поиск по реальным командам бота и алиасам..."
              className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all font-medium ${
                isLight
                  ? 'bg-white border border-neutral-200 focus:border-violet-500 text-neutral-900 placeholder:text-neutral-400 shadow-sm'
                  : 'bg-neutral-950/80 border border-white/10 focus:border-violet-500 text-white placeholder:text-neutral-500'
              }`}
            />
          </div>

          {/* Level Filter (до владельца беседы) */}
          <div className={`flex items-center gap-1.5 p-1 rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar border ${
            isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/80 border-white/10'
          }`}>
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
                      ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
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

            <div className="space-y-1.5">
              <div className={`p-2.5 rounded-xl border font-mono text-[11px] truncate flex items-center justify-between gap-2 ${
                isLight ? 'bg-neutral-100/80 border-neutral-200 text-neutral-800' : 'bg-black/50 border-white/5 text-violet-300'
              }`}>
                <span className="truncate">{cmd.usage}</span>
                <span className="text-[10px] text-neutral-500 shrink-0 font-sans">синтаксис</span>
              </div>

              {cmd.aliases && (
                <div className="text-[10px] font-mono text-neutral-500 truncate px-1">
                  Синонимы: {cmd.aliases}
                </div>
              )}
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
