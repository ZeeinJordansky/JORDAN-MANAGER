import re

def update_help():
    with open("server.ts", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Buttons definition
    old_buttons_block = r'const btnSModer = \{ action: \{ type: "callback", label: "Старший Модератор", payload: JSON\.stringify\(\{ cmd: "help_smoder", authorId: safeAuthorId \}\) \}, color: "secondary" \};[\s\S]*?const btnBack = \{ action: \{ type: "callback", label: "Назад", payload: JSON\.stringify\(\{ cmd: "cmd_help_main", authorId: safeAuthorId \}\) \}, color: "negative" \};'

    new_buttons_block = '''const btnModer = { action: { type: "callback", label: "Модератор", payload: JSON.stringify({ cmd: "help_moder", authorId: safeAuthorId }) }, color: "secondary" };
  const btnSModer = { action: { type: "callback", label: "Старший Модератор", payload: JSON.stringify({ cmd: "help_smoder", authorId: safeAuthorId }) }, color: "secondary" };
  const btnAdmin = { action: { type: "callback", label: "Администратор", payload: JSON.stringify({ cmd: "help_admin", authorId: safeAuthorId }) }, color: "secondary" };
  const btnGA = { action: { type: "callback", label: "Главный Администратор", payload: JSON.stringify({ cmd: "help_ga", authorId: safeAuthorId }) }, color: "secondary" };
  const btnRuk = { action: { type: "callback", label: "Руководитель беседы", payload: JSON.stringify({ cmd: "help_ruk", authorId: safeAuthorId }) }, color: "secondary" };
  const btnOwner = { action: { type: "callback", label: "Владелец беседы", payload: JSON.stringify({ cmd: "help_owner", authorId: safeAuthorId }) }, color: "secondary" };
  const btnGames = { action: { type: "callback", label: "Игровые команды", payload: JSON.stringify({ cmd: "help_games", authorId: safeAuthorId }) }, color: "positive" };
  const btnBack = { action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: safeAuthorId }) }, color: "negative" };'''

    content = re.sub(old_buttons_block, new_buttons_block, content, count=1)

    # 2. Update switch (cmd) in help
    old_switch_pattern = r'switch \(cmd\) \{\s*case "cmd_help_main":[\s\S]*?case "help_owner":[\s\S]*?break;'

    new_switch_block = '''switch (cmd) {
    case "cmd_help_main":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Префиксы команд: «/» «!» «.» «;» «:» «,»\\n\\n` +
        `| Выберите уровень прав, чтобы узнать какие команды ему доступны:`;
      keyboard.buttons = [
        [btnUser],
        [btnModer, btnSModer],
        [btnAdmin, btnGA],
        [btnRuk, btnOwner],
        [btnGames]
      ];
      break;

    case "help_user":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Пользователь (0 LVL)\\n\\n` +
        `| Команды:\\n` +
        `**/id** [Ссылка/упоминание] — Узнать ID страницы пользователя или сообщества.\\n` +
        `**/ping** — Проверить работоспособность и пинг бота.\\n` +
        `**/staff** — Список администрации беседы.\\n` +
        `**/rules** — Правила беседы.\\n` +
        `**/info** — Информация о беседе.\\n` +
        `**/online** — Список участников онлайн.\\n` +
        `**/top** — Топ активности участников.\\n` +
        `**/me** [действие] — Выполнить действие от своего лица.\\n` +
        `**/try** [действие] — Попытать удачу.\\n` +
        `**/report** [ответ на сообщение] — Отправить жалобу администрации.`;
      keyboard.buttons = [
        [btnModer, btnSModer],
        [btnAdmin, btnGA],
        [btnRuk, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_moder":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Модератор (1 LVL)\\n\\n` +
        `| Команды:\\n` +
        `/𝗴𝗲𝘁 [Ссылка/упоминание] — Информация о наказаниях пользователя.\\n` +
        `/𝗺𝘂𝘁𝗲 [Ссылка/упоминание] [срок] [причина] — Выдать блокировку чата пользователю.\\n` +
        `/𝘂𝗻𝗺𝘂𝘁𝗲 [Ссылка/упоминание] — Снять блокировку чата пользователю.\\n` +
        `/𝘄𝗮𝗿𝗻 [Ссылка/упоминание] [причина] — Выдать предупреждение пользователю.\\n` +
        `/𝘂𝗻𝘄𝗮𝗿𝗻 [Ссылка/упоминание] — Снять предупреждение пользователю.\\n` +
        `/𝗸𝗶𝗰𝗸 [Ссылка/упоминание] [причина] — Исключить пользователя из беседы.\\n` +
        `/𝗰𝗹𝗲𝗮𝗿 [Ссылка/упоминание] — Очистить сообщение от пользователя.\\n` +
        `/𝗺𝗰𝗹𝗲𝗮𝗿 [Ссылка/упоминание] — Очистить несколько сообщений от пользователя.\\n` +
        `/𝘀𝗺𝘂𝘁𝗲 [Ссылка/упоминание] — Выдать тихую блокировку чата пользователю.\\n` +
        `/𝘀𝗸𝗶𝗰𝗸 [Ссылка/упоминание] — Тихо исключить пользователя из беседы.\\n` +
        `/𝘀𝗰𝗹𝗲𝗮𝗿 [Ссылка/упоминание] — Тихо очистить сообщение от пользователя.\\n` +
        `/𝘀𝗺𝗰𝗹𝗲𝗮𝗿 [Ссылка/упоминание] — Тихо очистить несколько сообщений от пользователя.\\n` +
        `/𝗹𝗶𝘀𝘁𝘀 — Список пользователей с наказаниями.\\n` +
        `/𝘀𝘁𝗮𝗳𝗳 — Список руководства беседы.\\n` +
        `/𝘀𝗻𝗶𝗰𝗸 [Ссылка/упоминание] [Ник] — Установить Nick_Name пользователю.\\n` +
        `/𝗴𝗻𝗶𝗰𝗸 [Ссылка/упоминание] — Узнать Nick_Name пользователя.\\n` +
        `/𝗿𝗻𝗶𝗰𝗸 [Ссылка/упоминание] — Удалить Nick_Name пользователю.`;
      keyboard.buttons = [
        [btnUser, btnSModer],
        [btnAdmin, btnGA],
        [btnRuk, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_smoder":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Старший Модератор (2 LVL)\\n\\n` +
        `| Команды:\\n` +
        `/𝗯𝗮𝗻 [Ссылка/упоминание] [срок] [причина] — Заблокировать пользователя в беседе.\\n` +
        `/𝘂𝗻𝗯𝗮𝗻 [Ссылка/упоминание] — Разблокировать пользователя в беседе.\\n` +
        `/𝘀𝗯𝗮𝗻 [Ссылка/упоминание] [срок] [причина] — Тихо заблокировать пользователя в беседе.\\n` +
        `/𝘀𝘂𝗻𝗯𝗮𝗻 [Ссылка/упоминание] — Тихо разблокировать пользователя в беседе.\\n` +
        `/𝗮𝗱𝗱𝗮𝗰𝗰𝗲𝘀𝘀𝗹𝗲𝘃𝗲𝗹 [Ссылка/упоминание] [Уровень] — Выдать уровень прав пользователю.\\n` +
        `/𝗿𝗲𝗺𝗼𝘃𝗲𝗿𝗼𝗹𝗲 [Ссылка/упоминание] — Забрать уровень прав у пользователя.\\n` +
        `/𝗹𝗶𝘀𝘁𝘀 — Список пользователей с наказаниями.\\n` +
        `/𝘇𝗼𝘃 [причина] — Вызвать всех участников беседы.\\n` +
        `/𝗼𝗹𝗶𝘀𝘁 — Список участников беседы, которые в сети.\\n` +
        `/𝗼𝗳𝗳𝗹𝗶𝗻𝗲𝗹𝗶𝘀𝘁 — Список участников беседы, которые оффлайн.`;
      keyboard.buttons = [
        [btnUser, btnModer],
        [btnAdmin, btnGA],
        [btnRuk, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_admin":
    case "cmd_help_admin_bot":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Администратор (3 LVL)\\n\\n` +
        `| Команды:\\n` +
        `/𝗽𝘂𝗿𝗴𝗲 — Очистить ненужную информацию в беседе.\\n` +
        `/𝘀𝗶𝗹𝗲𝗻𝗰𝗲 — Включить или выключить режим тишины.\\n` +
        `/𝗻𝗯𝗮𝗻 [Ссылка/упоминание] [срок] [причина] — Заблокировать пользователя в беседах сетки.\\n` +
        `/𝗻𝘂𝗻𝗯𝗮𝗻 [Ссылка/упоминание] — Разблокировать пользователя в беседах сетки.\\n` +
        `/𝗻𝗸𝗶𝗰𝗸 [Ссылка/упоминание] — Исключить пользователя из бесед сетки.\\n` +
        `/𝗻𝗿𝗼𝗹𝗲 [Ссылка/упоминание] [LVL] — Выдать уровень прав пользователю в беседах сетки.\\n` +
        `/𝗻𝗿𝗲𝗺𝗼𝘃𝗲𝗿𝗼𝗹𝗲 [Ссылка/упоминание] — Забрать уровень прав у пользователя в беседах сетки.\\n` +
        `/𝘀𝗻𝗯𝗮𝗻 [Ссылка/упоминание] [срок] [причина] — Тихо заблокировать пользователя в беседах сетки.\\n` +
        `/𝘀𝗻𝗸𝗶𝗰𝗸 [Ссылка/упоминание] — Тихо исключить пользователя из бесед сетки.\\n` +
        `/𝘀𝗻𝗿𝗼𝗹𝗲 [Ссылка/упоминание] [LVL] — Тихо выдать уровень прав пользователю в беседах сетки.\\n` +
        `/𝘀𝗻𝗿𝗲𝗺𝗼𝘃𝗲𝗿𝗼𝗹𝗲 [Ссылка/упоминание] — Тихо забрать уровень прав у пользователя в беседах сетки.`;
      keyboard.buttons = [
        [btnUser, btnModer],
        [btnSModer, btnGA],
        [btnRuk, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_ga":
    case "help_sa":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Главный Администратор (4 LVL)\\n\\n` +
        `| Команды:\\n` +
        `/𝗽𝗶𝗻 [ответ на сообщение] — Закрепить сообщение в беседе.\\n` +
        `/𝘂𝗻𝗽𝗶𝗻 — Открепить сообщение в беседе.`;
      keyboard.buttons = [
        [btnUser, btnModer],
        [btnSModer, btnAdmin],
        [btnRuk, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_ruk":
    case "help_zsa":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Руководитель беседы (5 LVL)\\n\\n` +
        `| Команды:\\n` +
        `Команды временно отсутствуют.`;
      keyboard.buttons = [
        [btnUser, btnModer],
        [btnSModer, btnAdmin],
        [btnGA, btnOwner],
        [btnGames, btnBack]
      ];
      break;

    case "help_owner":
      text = `...::Помощь по командам чат-менеджера::...\\n\\n` +
        `| Уровень прав: Владелец Беседы (6 LVL)\\n\\n` +
        `| Команды:\\n` +
        `**/settings** — Настройки чат-менеджера в беседе.\\n` +
        `**/start** — Активировать чат-менеджера в беседе.\\n` +
        `**/sync** — Синхронизировать беседу с базой данных чат-менеджера.\\n` +
        `**/setrules** [текст] — Установить правила беседы.\\n` +
        `**/setinfo** [текст] — Установить информацию беседы.\\n` +
        `**/addaccesslevel** [Ссылка/упоминание] [1-5] — Выдать уровень прав в беседе.\\n` +
        `**/giveowner** [Ссылка/упоминание] — Передать уровень прав «Владелец Беседы» пользователю.\\n` +
        `**/addap** [Ссылка/упоминание] — Выдать «Анти Наказание» пользователю в беседе.\\n` +
        `**/unap** [Ссылка/упоминание] — Забрать «Анти Наказание» у пользователя.\\n` +
        `**/aplist** — Список пользователей с функцией «Анти Наказание».`;
      keyboard.buttons = [
        [btnUser, btnModer],
        [btnSModer, btnAdmin],
        [btnGA, btnRuk],
        [btnGames, btnBack]
      ];
      break;'''

    content = re.sub(old_switch_pattern, new_switch_block, content, count=1)

    # 3. Add /mclear alias to /clear if needed so user can invoke /mclear
    old_clear_cmd = 'if (["/clear", "/очистить", "/клиар", "/delmsg"].includes(rawCmd)) {'
    new_clear_cmd = 'if (["/clear", "/очистить", "/клиар", "/delmsg", "/mclear", "/мклир", "/мочистить", "/delmsgs"].includes(rawCmd)) {'
    content = content.replace(old_clear_cmd, new_clear_cmd)

    with open("server.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("Help updated successfully!")

if __name__ == "__main__":
    update_help()
