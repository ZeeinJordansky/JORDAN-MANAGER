import React, { useState, useEffect } from 'react';
import {
  Search, Terminal, Shield, Gamepad2, Coins, Settings, Crown,
  UserCheck, ShieldAlert, Award, X, Copy, Check, Info, Sparkles, ArrowRight, Users
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
  category: 'moderation' | 'games' | 'economy' | 'settings' | 'owner';
  categoryLabel: string;
  usage: string;
  description: string;
  permissionLevel: PermissionLevel;
  arguments?: CommandArgument[];
  example?: string;
  note?: string;
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
    example: '/профиль @durov',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Пользователь',
        required: false,
        format: 'Ссылка (vk.com/...), @id или ответ на сообщение',
        description: 'Укажите участника для просмотра его профиля. Если аргумент не указан, покажет ваш собственный профиль.',
      },
    ],
  },
  {
    name: '/баланс',
    aliases: '/банк, /балик',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/баланс',
    description: 'Мгновенная проверка количества монет и сбережений на счёте.',
    permissionLevel: 'Участник',
    example: '/баланс',
    note: 'Команда не требует аргументов и моментально возвращает текущий баланс монет в чате.',
  },
  {
    name: '/передать',
    aliases: '/pay, /transfer, /перевод, /датьденег',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/передать [@пользователь] [сумма]',
    description: 'Перевести монеты другому участнику беседы без комиссии.',
    permissionLevel: 'Участник',
    example: '/передать @friend 50000',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Получатель',
        required: true,
        format: 'Ссылка (vk.com/...), @упоминание или ответ на сообщение',
        description: 'Участник беседы, которому переводятся средства.',
      },
      {
        arg: '[сумма]',
        name: 'Сумма перевода',
        required: true,
        format: 'Целое число либо k/kk (например: 1000, 50k, 1kk)',
        description: 'Количество монет для отправки. Не может превышать ваш текущий баланс.',
      },
    ],
  },
  {
    name: '/бонус',
    aliases: '/ежедневный, /ежедневный_бонус',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/бонус',
    description: 'Получить ежедневную денежную награду монет за активность.',
    permissionLevel: 'Участник',
    example: '/бонус',
    note: 'Доступно раз в 24 часа. Стрик ежедневного захода увеличивает размер награды.',
  },
  {
    name: '/топ',
    aliases: '/top',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/топ [монеты / баланс]',
    description: 'Рейтинг самых богатых и активных участников беседы.',
    permissionLevel: 'Участник',
    example: '/топ монеты',
    arguments: [
      {
        arg: '[монеты / баланс]',
        name: 'Критерий рейтинга',
        required: false,
        format: 'монеты | уровень | активность | кланы',
        description: 'Критерий для сортировки топа. По умолчанию отображает список самых богатых участников беседы.',
      },
    ],
  },
  {
    name: '/онлайн',
    aliases: '/online, /онлайнлист, /olist',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/онлайн',
    description: 'Список участников беседы, находящихся в сети прямо сейчас.',
    permissionLevel: 'Участник',
    example: '/онлайн',
  },
  {
    name: '/инфо',
    aliases: '/info, /инфобот, /infobot',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/инфо',
    description: 'Информация о беседе, количестве участников, статусе и настройках.',
    permissionLevel: 'Участник',
    example: '/инфо',
  },
  {
    name: '/пинг',
    aliases: '/ping',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/пинг',
    description: 'Проверка реального времени отклика бота в миллисекундах.',
    permissionLevel: 'Участник',
    example: '/пинг',
  },
  {
    name: '/правила',
    aliases: '/rules',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/правила',
    description: 'Просмотр официально установленных правил текущей беседы.',
    permissionLevel: 'Участник',
    example: '/правила',
  },
  {
    name: '/помощь',
    aliases: '/help, /хелп, /команды, /меню',
    category: 'settings',
    categoryLabel: 'Справка',
    usage: '/помощь',
    description: 'Главное интерактивное меню помощи по всем командам чат-менеджера.',
    permissionLevel: 'Участник',
    example: '/помощь',
  },
  {
    name: '/титул',
    aliases: '/title',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/титул [название]',
    description: 'Установить или изменить отображаемый титул в профиле.',
    permissionLevel: 'Участник',
    example: '/титул Легенда чата',
    arguments: [
      {
        arg: '[название]',
        name: 'Текст титула',
        required: true,
        format: 'Текстовая строка от 2 до 30 символов',
        description: 'Персональный статус, который будет отображаться в карточке /профиль.',
      },
    ],
  },
  {
    name: '/депозиты',
    aliases: '/открытьдепозит',
    category: 'economy',
    categoryLabel: 'Экономика',
    usage: '/депозиты [сумма] [срок]',
    description: 'Открыть банковский депозит под процент для приумножения монет.',
    permissionLevel: 'Участник',
    example: '/депозиты 100000 7',
    arguments: [
      {
        arg: '[сумма]',
        name: 'Сумма вклада',
        required: true,
        format: 'Число монет',
        description: 'Сумма, вносимая на накопительный счет под процент.',
      },
      {
        arg: '[срок]',
        name: 'Срок вклада',
        required: true,
        format: 'Количество дней (от 1 до 30)',
        description: 'Период заморозки средств до выплаты повышенных процентов.',
      },
    ],
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
    example: '/дуэль @rival 25000',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Соперник',
        required: true,
        format: 'Упоминание (@id) или ответ на сообщение',
        description: 'Игрок, которого вы вызываете на поединок.',
      },
      {
        arg: '[ставка]',
        name: 'Ставка',
        required: true,
        format: 'Число монет',
        description: 'Сумма ставки на кон, списываемая у обоих дуэлянтов.',
      },
    ],
  },
  {
    name: '/дуэльбиз',
    aliases: '/duel_biz',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/дуэльбиз [@пользователь]',
    description: 'Опасная дуэль, где ставкой является один из ваших бизнесов.',
    permissionLevel: 'Участник',
    example: '/дуэльбиз @rival',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Соперник',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Участник с бизнесом, которого вы вызываете на рискованную битву за владение.',
      },
    ],
  },
  {
    name: '/казино',
    aliases: '/casino',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/казино [сумма]',
    description: 'Сделать ставку в рулетке с шансом выигрыша x2 или x3.',
    permissionLevel: 'Участник',
    example: '/казино 5000',
    arguments: [
      {
        arg: '[сумма]',
        name: 'Ставка',
        required: true,
        format: 'Число монет (или "все" для ставки на весь баланс)',
        description: 'Размер ставки в азартной игре.',
      },
    ],
  },
  {
    name: '/рулетка',
    aliases: '/roulette',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/рулетка [число / цвет] [ставка]',
    description: 'Ставки на красное, черное или конкретный номер в европейской рулетке.',
    permissionLevel: 'Участник',
    example: '/рулетка красное 10000',
    arguments: [
      {
        arg: '[число / цвет]',
        name: 'Сектор ставки',
        required: true,
        format: '"красное", "черное", "зеро" либо число от 0 до 36',
        description: 'Сектор колеса рулетки, на который вы делаете прогноз.',
      },
      {
        arg: '[ставка]',
        name: 'Размер ставки',
        required: true,
        format: 'Число монет',
        description: 'Количество монет, которые ставятся на выбранный сектор.',
      },
    ],
  },
  {
    name: '/монетка',
    aliases: '/coin, /кнб',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/монетка [орел/решка] [ставка]',
    description: 'Бросок монетки на удачу против бота или другого игрока.',
    permissionLevel: 'Участник',
    example: '/монетка орел 2000',
    arguments: [
      {
        arg: '[орел/решка]',
        name: 'Сторона монеты',
        required: true,
        format: '"орел" либо "решка"',
        description: 'Предполагаемый исход броска монеты.',
      },
      {
        arg: '[ставка]',
        name: 'Ставка',
        required: true,
        format: 'Число монет',
        description: 'Сумма монет, поставленная на бросок.',
      },
    ],
  },
  {
    name: '/кейсы',
    aliases: '/кейс, /case',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/кейсы [открыть]',
    description: 'Открытие сундуков с редкими призами, монетами и статусными титулами.',
    permissionLevel: 'Участник',
    example: '/кейсы открыть',
    note: 'Кейсы можно приобрести за монеты либо получить за победы в клановых битвах.',
    arguments: [
      {
        arg: '[открыть]',
        name: 'Действие с кейсами',
        required: false,
        format: 'открыть | список | инфо',
        description: 'Открыть кейс из инвентаря или просмотреть список доступных кейсов и шансы выпадения.',
      },
    ],
  },
  {
    name: '/бизнес',
    aliases: '/бизнесы, /купитьбиз, /продатьбиз',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/бизнес [купить / продать / прибыль]',
    description: 'Покупка и управление коммерческими объектами с пассивным доходом.',
    permissionLevel: 'Участник',
    example: '/бизнес прибыль',
    arguments: [
      {
        arg: '[действие]',
        name: 'Операция',
        required: false,
        format: '"купить", "продать" либо "прибыль"',
        description: 'Без аргументов показывает список бизнесов. "прибыль" собирает накопленную выручку.',
      },
    ],
  },
  {
    name: '/работа',
    aliases: '/работать',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/работа',
    description: 'Устроиться на работу и получать стабильный почасовой заработок.',
    permissionLevel: 'Участник',
    example: '/работа',
  },
  {
    name: '/майнинг',
    aliases: '/ферма',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/майнинг [купить / снять]',
    description: 'Покупка видеокарт и майнинг виртуальной криптовалюты.',
    permissionLevel: 'Участник',
    example: '/майнинг снять',
    arguments: [
      {
        arg: '[действие]',
        name: 'Действие',
        required: false,
        format: '"купить" (видеокарту) или "снять" (намайненную прибыль)',
        description: 'Управление криптофермой участника.',
      },
    ],
  },
  {
    name: '/брак',
    aliases: '/поженить',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/брак [@пользователь]',
    description: 'Предложить руку и сердце участнику беседы для создания семьи.',
    permissionLevel: 'Участник',
    example: '/брак @partner',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Партнёр',
        required: true,
        format: 'Упоминание (@id) или ответ на сообщение',
        description: 'Пользователь, которому вы делаете предложение о браке.',
      },
    ],
  },
  {
    name: '/развод',
    aliases: '/развести',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/развод',
    description: 'Расторгнуть текущий виртуальный брак.',
    permissionLevel: 'Участник',
    example: '/развод',
  },
  {
    name: '/мафия',
    aliases: '/mafia',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/мафия [старт / войти]',
    description: 'Запуск классической игры Мафия прямо в беседе ВКонтакте.',
    permissionLevel: 'Участник',
    example: '/мафия старт',
    arguments: [
      {
        arg: '[старт / войти]',
        name: 'Действие в игре',
        required: true,
        format: 'старт | войти | выйти | стоп',
        description: 'Запустить сбор игроков, присоединиться к комнате, покинуть лобби или принудительно завершить партию.',
      },
    ],
  },
  {
    name: '/крокодил',
    aliases: '/croc',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/крокодил [старт]',
    description: 'Игра «Крокодил»: ведущий объясняет загаданное слово, чат угадывает.',
    permissionLevel: 'Участник',
    example: '/крокодил старт',
    arguments: [
      {
        arg: '[старт]',
        name: 'Действие в игре',
        required: true,
        format: 'старт | стоп | сдаться',
        description: 'Запуск нового раунда со случайным словом, досрочная остановка игры или сдача текущего ведущего.',
      },
    ],
  },
  {
    name: '/клан',
    aliases: '/clan',
    category: 'games',
    categoryLabel: 'Игры',
    usage: '/клан [создать / инфо / казна / топ / покинуть]',
    description: 'Создание кланов, клановая казна, прокачка и турниры за рейтинг.',
    permissionLevel: 'Участник',
    example: '/клан инфо',
    arguments: [
      {
        arg: '[подкоманда]',
        name: 'Раздел клана',
        required: false,
        format: '"создать [имя]", "инфо", "казна [сумма]", "топ", "покинуть"',
        description: 'Управление кланом и взаимодействие с соклановцами.',
      },
    ],
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
    example: '/кик @spammer Спам рекламой',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Нарушитель',
        required: true,
        format: 'Ссылка (vk.com/...), @id или ответ на сообщение',
        description: 'Участник беседы, которого необходимо исключить.',
      },
      {
        arg: '[причина]',
        name: 'Причина кика',
        required: false,
        format: 'Текстовая строка',
        description: 'Основание исключения, которое будет зафиксировано в журнале модерации.',
      },
    ],
  },
  {
    name: '/мут',
    aliases: '/mute, /мутить, /замутить, /заглушить, /m',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/мут [@пользователь] [срок] [причина]',
    description: 'Запретить участнику писать сообщения в чат на указанное время.',
    permissionLevel: 'Модератор',
    example: '/мут @user 60 Оскорбление участников',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Нарушитель',
        required: true,
        format: 'Ссылка, @упоминание или ответ на сообщение',
        description: 'Пользователь, которому выдается ограничение на отправку сообщений.',
      },
      {
        arg: '[срок]',
        name: 'Срок наказания',
        required: true,
        format: 'Целое число минут (например: 10, 60, 1440)',
        description: 'Срок действия наказания в минутах (например: 60 = 1 час, 1440 = 24 часа).',
      },
      {
        arg: '[причина]',
        name: 'Причина мута',
        required: false,
        format: 'Текстовое пояснение',
        description: 'Причина наложения блокировки (будет записана в логи и сообщена нарушителю).',
      },
    ],
  },
  {
    name: '/размут',
    aliases: '/unmute, /размутить, /разглушить, /unm',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/размут [@пользователь]',
    description: 'Досрочно снять ограничение на отправку сообщений.',
    permissionLevel: 'Модератор',
    example: '/размут @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Участник',
        required: true,
        format: 'Ссылка, @id или ответ на сообщение',
        description: 'Пользователь, с которого снимается мут.',
      },
    ],
  },
  {
    name: '/варн',
    aliases: '/warn, /пред, /предупреждение, /w',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/варн [@пользователь] [причина]',
    description: 'Выдать предупреждение. При наборе 3 варнов нарушитель кикается.',
    permissionLevel: 'Модератор',
    example: '/варн @user Нарушение правил беседы',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Нарушитель',
        required: true,
        format: 'Ссылка, @упоминание или ответ на сообщение',
        description: 'Участник, которому выносится предупреждение.',
      },
      {
        arg: '[причина]',
        name: 'Причина варна',
        required: false,
        format: 'Текст',
        description: 'Пояснение причины вынесения замечания.',
      },
    ],
  },
  {
    name: '/разварн',
    aliases: '/unwarn, /анварн, /снятьварн, /снятьпред, /unw',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/разварн [@пользователь]',
    description: 'Аннулировать предупреждение участника беседы.',
    permissionLevel: 'Модератор',
    example: '/разварн @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Участник',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Пользователь, у которого снимается одно предупреждение.',
      },
    ],
  },
  {
    name: '/варны',
    aliases: '/warns, /warnlist, /инфоварн',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/варны [@пользователь]',
    description: 'Просмотр истории и активных предупреждений нарушителя.',
    permissionLevel: 'Модератор',
    example: '/варны @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Участник',
        required: false,
        format: 'Упоминание или ответ',
        description: 'Без аргументов покажет ваши предупреждения, с аргументом — варны указанного участника.',
      },
    ],
  },
  {
    name: '/очистить',
    aliases: '/чистка, /purge, /mclear',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/очистить [1-100]',
    description: 'Массовое удаление последних сообщений при спаме или флуде.',
    permissionLevel: 'Модератор',
    example: '/очистить 50',
    arguments: [
      {
        arg: '[1-100]',
        name: 'Количество сообщений',
        required: true,
        format: 'Целое число от 1 до 100',
        description: 'Сколько последних сообщений в беседе бот должен удалить.',
      },
    ],
  },
  {
    name: '/тишина',
    aliases: '/silence',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/тишина [вкл/выкл]',
    description: 'Режим тишины: только модераторы и администраторы могут писать.',
    permissionLevel: 'Модератор',
    example: '/тишина вкл',
    arguments: [
      {
        arg: '[вкл/выкл]',
        name: 'Состояние режима',
        required: true,
        format: '"вкл" (активировать) или "выкл" (отключить)',
        description: 'Включение запрета отправки сообщений для обычных участников во время важных объявлений.',
      },
    ],
  },
  {
    name: '/закрепить',
    aliases: '/pin',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/закрепить',
    description: 'Закрепить выбранное сообщение в шапке беседы (в ответ на сообщение).',
    permissionLevel: 'Модератор',
    example: '/закрепить (в ответ на нужное сообщение)',
    note: 'Команда отправляется ответом (Reply) на сообщение, которое необходимо закрепить.',
  },
  {
    name: '/открепить',
    aliases: '/unpin',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/открепить',
    description: 'Удалить закрепленное сообщение из шапки беседы.',
    permissionLevel: 'Модератор',
    example: '/открепить',
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
    example: '/бан @malicious_user Рейд и спам ботами',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Нарушитель',
        required: true,
        format: 'Ссылка (vk.com/...), @id или ответ',
        description: 'Участник, добавляемый в черный список беседы навсегда.',
      },
      {
        arg: '[причина]',
        name: 'Причина бана',
        required: false,
        format: 'Текст',
        description: 'Основание для бессрочной блокировки.',
      },
    ],
  },
  {
    name: '/разбан',
    aliases: '/unban, /разбанить, /избана',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/разбан [@пользователь]',
    description: 'Снять блокировку и разрешить участнику повторный вход.',
    permissionLevel: 'Ст. Модератор',
    example: '/разбан @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Заблокированный',
        required: true,
        format: 'Ссылка (vk.com/...) или числовой ID',
        description: 'Пользователь, с которого снимается бан в беседе.',
      },
    ],
  },
  {
    name: '/банлист',
    aliases: '/banlist, /инфобан',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/банлист',
    description: 'Полный перечень всех заблокированных участников беседы.',
    permissionLevel: 'Ст. Модератор',
    example: '/банлист',
  },
  {
    name: '/собачки',
    aliases: '/собаки, /чисткасобачек',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/собачки [кик/чек]',
    description: 'Поиск и автоматическое исключение удаленных страниц ВКонтакте (DELETED).',
    permissionLevel: 'Ст. Модератор',
    example: '/собачки кик',
    arguments: [
      {
        arg: '[кик/чек]',
        name: 'Действие',
        required: false,
        format: '"чек" (только показать) или "кик" (исключить удаленные профили)',
        description: 'Очистка состава беседы от заблокированных аккаунтов VK.',
      },
    ],
  },
  {
    name: '/кикнеактив',
    aliases: '/неактив, /очиститьнеактив',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/кикнеактив [кол-во дней]',
    description: 'Автоматический кик молчунов, не писавших в беседу указанное число дней.',
    permissionLevel: 'Ст. Модератор',
    example: '/кикнеактив 14',
    arguments: [
      {
        arg: '[кол-во дней]',
        name: 'Период неактивности',
        required: true,
        format: 'Целое число дней (например: 7, 14, 30)',
        description: 'Участники, не написавшие ни одного сообщения за данный период, будут удалены.',
      },
    ],
  },
  {
    name: '/чс',
    aliases: '/чсб, /addblack, /добавитьвчс',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/чс [@пользователь] [причина]',
    description: 'Внесение пользователя в локальный черный список беседы.',
    permissionLevel: 'Ст. Модератор',
    example: '/чс @toxic_user Неадекватное поведение',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Пользователь',
        required: true,
        format: 'Ссылка или @id',
        description: 'Участник для добавления в ЧС беседы.',
      },
      {
        arg: '[причина]',
        name: 'Причина',
        required: false,
        format: 'Текст',
        description: 'Причина добавления в локальный черный список.',
      },
    ],
  },
  {
    name: '/анчс',
    aliases: '/unblack, /изчс, /удалитьизчс',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/анчс [@пользователь]',
    description: 'Удаление пользователя из черного списка беседы.',
    permissionLevel: 'Ст. Модератор',
    example: '/анчс @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Пользователь',
        required: true,
        format: 'Ссылка или ID',
        description: 'Участник, удаляемый из черного списка.',
      },
    ],
  },
  {
    name: '/логи',
    aliases: '/logs, /логимут, /логикик, /логиварн, /логибан',
    category: 'moderation',
    categoryLabel: 'Модерация',
    usage: '/логи [мут / кик / бан / варн]',
    description: 'Просмотр журнала модераторских действий и выданных наказаний.',
    permissionLevel: 'Ст. Модератор',
    example: '/логи мут',
    arguments: [
      {
        arg: '[тип]',
        name: 'Тип логов',
        required: false,
        format: '"мут", "кик", "бан" или "варн"',
        description: 'Фильтрация журнала по конкретному типу наказаний.',
      },
    ],
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
    example: '/настройки',
  },
  {
    name: '/приветствие',
    aliases: '/welcometext',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/приветствие [текст с тегами {user} и {chat}]',
    description: 'Установка автоприветствия новых вступивших участников беседы.',
    permissionLevel: 'Администратор',
    example: '/приветствие Привет, {user}! Добро пожаловать в беседу {chat}. Соблюдай /правила!',
    arguments: [
      {
        arg: '[текст]',
        name: 'Шаблон текста',
        required: true,
        format: 'Текст с поддержкой переменных {user} и {chat}',
        description: '{user} автоматически заменится на кликабельное имя новичка, а {chat} — на название вашей беседы.',
      },
    ],
  },
  {
    name: '/модер',
    aliases: '/setmoder, /аддмодер, /выдатьмодера',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/модер [@пользователь]',
    description: 'Назначить участника модератором беседы.',
    permissionLevel: 'Администратор',
    example: '/модер @active_member',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Кандидат',
        required: true,
        format: 'Ссылка, @id или ответ',
        description: 'Участник, которому присваиваются модераторские полномочия.',
      },
    ],
  },
  {
    name: '/снятьмодер',
    aliases: '/unmoder, /снятьроль',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/снятьмодер [@пользователь]',
    description: 'Отозвать модераторские полномочия у участника.',
    permissionLevel: 'Администратор',
    example: '/снятьмодер @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Модератор',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Пользователь, с которого снимаются права модератора.',
      },
    ],
  },
  {
    name: '/админ',
    aliases: '/setadmin, /аддадмин, /выдатьадмина',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/админ [@пользователь]',
    description: 'Назначить полноправного администратора беседы.',
    permissionLevel: 'Администратор',
    example: '/админ @trusted_user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Кандидат в админы',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Участник, получающий права администратора беседы.',
      },
    ],
  },
  {
    name: '/снятьадмин',
    aliases: '/унроль',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/снятьадмин [@пользователь]',
    description: 'Снять полномочия администратора с участника.',
    permissionLevel: 'Администратор',
    example: '/снятьадмин @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Администратор',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Пользователь, разжалуемый до обычного участника.',
      },
    ],
  },
  {
    name: '/ачат',
    aliases: '/achat',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/ачат',
    description: 'Присвоить беседе статус админ-чата для закрытых обсуждений.',
    permissionLevel: 'Администратор',
    example: '/ачат',
  },
  {
    name: '/уначат',
    aliases: '/unachat',
    category: 'settings',
    categoryLabel: 'Настройки',
    usage: '/уначат',
    description: 'Снять статус админ-чата с беседы.',
    permissionLevel: 'Администратор',
    example: '/уначат',
  },
  {
    name: '/зов',
    aliases: '/zov, /tegall, /все',
    category: 'settings',
    categoryLabel: 'Беседа',
    usage: '/зов [текст объявления]',
    description: 'Упомянуть всех участников беседы одним сообщением при важном сборе.',
    permissionLevel: 'Администратор',
    example: '/зов Общий сбор беседы в 19:00!',
    arguments: [
      {
        arg: '[текст объявления]',
        name: 'Текст созыва',
        required: true,
        format: 'Текстовое сообщение',
        description: 'Текст, который будет разослан вместе с тегом всех участников беседы.',
      },
    ],
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
    example: '/setowner @successor',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Новый владелец',
        required: true,
        format: 'Ссылка (vk.com/...), @id или ответ',
        description: 'Участник, которому передается высший уровень прав в беседе.',
      },
    ],
  },
  {
    name: '/снятьвладельца',
    aliases: '/делетоунер, /снятьправа',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/снятьвладельца',
    description: 'Снять полномочия владельца и сбросить права создателя беседы.',
    permissionLevel: 'Владелец',
    example: '/снятьвладельца',
    note: 'Используется для добровольного сложения полномочий создателя.',
  },
  {
    name: '/префикс',
    aliases: '/prefix',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/префикс [символ]',
    description: 'Изменить командный символ бота для этой беседы (например: !, ?, ., /).',
    permissionLevel: 'Владелец',
    example: '/префикс !',
    arguments: [
      {
        arg: '[символ]',
        name: 'Знак префикса',
        required: true,
        format: 'Один символ: "/", "!", ".", "?", ";" или "#"',
        description: 'Символ, с которого бот будет распознавать команды в беседе.',
      },
    ],
  },
  {
    name: '/безпрефикса',
    aliases: '/noprefix',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/безпрефикса [вкл/выкл]',
    description: 'Включить или отключить выполнение команд бота без префикса.',
    permissionLevel: 'Владелец',
    example: '/безпрефикса вкл',
    arguments: [
      {
        arg: '[вкл/выкл]',
        name: 'Режим',
        required: true,
        format: '"вкл" или "выкл"',
        description: 'При "вкл" бот будет реагировать на команды без начального слеша или префикса.',
      },
    ],
  },
  {
    name: '/роль',
    aliases: '/nrole, /setrole',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/роль [@пользователь] [название]',
    description: 'Установить кастомную текстовую роль участнику в беседе.',
    permissionLevel: 'Владелец',
    example: '/роль @friend Главный Заводила',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Участник',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Пользователь, которому присваивается роль.',
      },
      {
        arg: '[название]',
        name: 'Название роли',
        required: true,
        format: 'Текст от 2 до 25 символов',
        description: 'Кастомный текстовый статус, отображаемый в профиле участника.',
      },
    ],
  },
  {
    name: '/снятьроль',
    aliases: '/nremoverole, /removerole',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/снятьроль [@пользователь]',
    description: 'Снять назначенную роль с участника беседы.',
    permissionLevel: 'Владелец',
    example: '/снятьроль @user',
    arguments: [
      {
        arg: '[@пользователь]',
        name: 'Участник',
        required: true,
        format: 'Упоминание или ответ',
        description: 'Пользователь, с которого удаляется кастомная роль.',
      },
    ],
  },
  {
    name: '/сброс',
    aliases: '/reset',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/сброс [подтвердить]',
    description: 'Полный сброс параметров, правил, экономики и модерации беседы к начальным.',
    permissionLevel: 'Владелец',
    example: '/сброс подтвердить',
    arguments: [
      {
        arg: '[подтвердить]',
        name: 'Подтверждение',
        required: true,
        format: 'Слово "подтвердить"',
        description: 'Защита от непреднамеренного удаления настроек и базы данных беседы.',
      },
    ],
  },
  {
    name: '/инфочат',
    aliases: '/infochat, /чатинфо',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/инфочат',
    description: 'Полная техническая информация о текущей беседе, правах и модулях.',
    permissionLevel: 'Владелец',
    example: '/инфочат',
  },
  {
    name: '/банигр',
    aliases: '/снятьбанигр, /чсигр, /снятьчсигр',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/банигр [вкл/выкл]',
    description: 'Полный запрет или разрешение на использование игровых и азартных команд в чате.',
    permissionLevel: 'Владелец',
    example: '/банигр вкл',
    arguments: [
      {
        arg: '[вкл/выкл]',
        name: 'Состояние',
        required: true,
        format: '"вкл" (заблокировать игры) или "выкл" (разрешить)',
        description: 'Позволяет владельцу выключить казино, дуэли и рулетку в деловых или учебных беседах.',
      },
    ],
  },
  {
    name: '/чсбота',
    aliases: '/blacklist',
    category: 'owner',
    categoryLabel: 'Владелец',
    usage: '/чсбота',
    description: 'Просмотр базы глобально заблокированных участников в чат-менеджере.',
    permissionLevel: 'Владелец',
    example: '/чсбота',
  },
];

interface CommandsDirectoryProps {
  theme?: 'dark' | 'light';
}

export default function CommandsDirectory({ theme = 'dark' }: CommandsDirectoryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandItem | null>(null);
  const [copied, setCopied] = useState(false);

  const isLight = theme === 'light';

  // Handle ESC key to close modal
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
      {/* Informative Hint Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        isLight
          ? 'bg-violet-50/80 border-violet-200 text-violet-950'
          : 'bg-violet-950/20 border-violet-500/20 text-violet-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 text-violet-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block text-sm">Интерактивный справочник параметров</span>
            <span className={isLight ? 'text-neutral-600' : 'text-neutral-400'}>
              Нажмите на любую команду, чтобы узнать, что вводить, в каком формате и просмотреть подробное объяснение аргументации (например: <code className="font-mono text-violet-400 font-bold">[срок]</code> — Срок действия наказания в минутах).
            </span>
          </div>
        </div>
      </div>

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
            onClick={() => setSelectedCommand(cmd)}
            className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3 cursor-pointer group ${
              isLight
                ? 'bg-white/90 border-neutral-200 hover:border-violet-400 hover:shadow-lg'
                : 'bg-neutral-950/60 backdrop-blur-xl border-white/5 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-base font-black font-mono tracking-tight group-hover:text-violet-500 transition-colors ${
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
              <p className={`text-xs leading-relaxed font-normal line-clamp-2 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {cmd.description}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className={`p-2.5 rounded-xl border font-mono text-[11px] truncate flex items-center justify-between gap-2 ${
                isLight ? 'bg-neutral-100/80 border-neutral-200 text-neutral-800' : 'bg-black/50 border-white/5 text-violet-300'
              }`}>
                <span className="truncate font-semibold">{cmd.usage}</span>
                <span className="text-[10px] text-violet-400 font-sans font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20 shrink-0">
                  Формат и аргументы <ArrowRight className="w-3 h-3" />
                </span>
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

      {/* ================= DETAILED COMMAND MODAL ================= */}
      {selectedCommand && (
        <div
          onClick={() => setSelectedCommand(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border transition-all max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-neutral-200 text-neutral-900 shadow-xl' : 'bg-neutral-950 border-white/10 text-neutral-100 shadow-2xl shadow-violet-500/10'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-violet-500">
                    {selectedCommand.name}
                  </span>
                  <span
                    className={`text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-lg border font-bold ${getPermissionBadge(
                      selectedCommand.permissionLevel
                    )}`}
                  >
                    {selectedCommand.permissionLevel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>Категория: <strong className="text-violet-400">{selectedCommand.categoryLabel}</strong></span>
                  <span>•</span>
                  <span>Подробная справка по аргументам</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCommand(null)}
                className={`p-2 rounded-xl transition-colors cursor-pointer border shrink-0 ${
                  isLight ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700' : 'bg-neutral-900 hover:bg-neutral-800 border-white/10 text-neutral-400 hover:text-white'
                }`}
                title="Закрыть (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Описание команды
              </div>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-neutral-700' : 'text-neutral-200'}`}>
                {selectedCommand.description}
              </p>
            </div>

            {/* What to enter & Format */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Что вводить в чат (синтаксис команды)
                </div>
                <div className="text-[11px] text-violet-400 font-medium">
                  Префикс: <code className="font-mono font-bold">/</code>
                </div>
              </div>
              <div className={`p-4 rounded-2xl border font-mono text-xs flex items-center justify-between gap-3 ${
                isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-900' : 'bg-black/60 border-white/10 text-violet-300'
              }`}>
                <span className="select-all font-bold text-sm tracking-wide">{selectedCommand.usage}</span>
                <button
                  onClick={() => handleCopy(selectedCommand.usage)}
                  className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Arguments Breakdown ("Объяснение аргументации") */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-violet-400" />
                <span>Объяснение аргументации (параметры)</span>
              </div>

              {selectedCommand.arguments && selectedCommand.arguments.length > 0 ? (
                <div className="space-y-3">
                  {selectedCommand.arguments.map((arg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        isLight ? 'bg-neutral-50/90 border-neutral-200' : 'bg-neutral-900/60 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {arg.arg}
                          </span>
                          <span className="font-bold text-neutral-300">
                            — {arg.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                            arg.required
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {arg.required ? 'Обязательный аргумент' : 'Необязательный'}
                        </span>
                      </div>

                      <div className={`text-xs leading-relaxed ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                        <strong className="text-neutral-400 font-semibold">Назначение аргумента: </strong>
                        {arg.description}
                      </div>

                      <div className={`p-2 rounded-xl font-mono text-[11px] border ${
                        isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-black/40 border-white/5 text-neutral-300'
                      }`}>
                        <span className="text-neutral-400 font-sans font-semibold">Формат ввода: </span>
                        <span className="text-amber-400 font-bold">{arg.format}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/50 border-white/5'
                }`}>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Check className="w-4 h-4" />
                    <span>Без дополнительных аргументов</span>
                  </div>
                  <p className={isLight ? 'text-neutral-600' : 'text-neutral-400'}>
                    Команда не требует ввода дополнительных параметров. Чтобы вызвать действие бота, достаточно просто ввести <code className="font-mono text-violet-400 font-bold">{selectedCommand.name}</code> в беседу.
                  </p>
                </div>
              )}
            </div>

            {/* Working Example */}
            {selectedCommand.example && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Готовый пример использования в беседе
                </div>
                <div className={`p-3.5 rounded-xl border font-mono text-xs flex items-center justify-between gap-2 ${
                  isLight ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-violet-500/10 border-violet-500/20 text-violet-200'
                }`}>
                  <span className="select-all font-bold">{selectedCommand.example}</span>
                  <button
                    onClick={() => handleCopy(selectedCommand.example!)}
                    className="p-1.5 hover:bg-violet-500/20 rounded-lg text-violet-400 transition-colors cursor-pointer"
                    title="Скопировать пример"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Note / Tip */}
            {selectedCommand.note && (
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              }`}>
                <strong>Пояснение разработчиков:</strong> {selectedCommand.note}
              </div>
            )}

            {/* Aliases */}
            {selectedCommand.aliases && (
              <div className="pt-3 border-t border-white/10 text-xs font-mono text-neutral-400 flex items-center gap-2 flex-wrap">
                <span className="font-sans font-semibold text-neutral-400">Синонимы (алиасы):</span>
                <span className={`px-2 py-0.5 rounded-md ${isLight ? 'bg-neutral-100 text-neutral-800' : 'bg-white/5 text-neutral-200'}`}>
                  {selectedCommand.aliases}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
