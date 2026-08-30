const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

// 1. Leave msg format
code = replaceAll(
  code,
  "`[id${memberId}|${memberName}] вышел(-ла) из беседы.`",
  "`[id${memberId}|${memberName}] вышел(-ла) из беседы.`"
); // It's already correct.

// 2. Buttons in leave msg
// kick_left_user -> [Ссылка|Модератор] исключил(-а) [ссылка|пользователя] из беседы.
code = replaceAll(
  code,
  "`[id${targetId}|${targetName}] был(-а) исключён из беседы.\\n\\n| Модератор, который исключил - [id${userId}|${adminName}]`",
  "`[id${userId}|${adminName}] исключил(-а) [id${targetId}|пользователя] из беседы.`"
);

// remove_role_left_user -> [Ссылка|Имя Фамилия] забрал(-а) уровень прав у [ссылка|пользователя]
// Wait, I need to check what the current string is.

// 3. /warn format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] выдано предупреждение ${newWarns}/3 по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] выдано предупреждение ${newWarns}/3 по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`" // already correct
);

// 4. /kick format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] был(-а) исключён из беседы по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|${parsed.targetName}] был(-а) исключён из беседы по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 5. /unmute format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] снята блокировка чата.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] было снята блокировка чата.\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 6. /unwarn format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] снято предупреждение.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] было снято предупреждение.\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 7. /unban format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] снята блокировка в беседе.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] было снята блокировка.\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 8. /ungban format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] снята глобальная блокировка.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] была снята глобальная блокировка.\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 9. /unblack format
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] снят чёрный список.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор - [id${userId}|${fullName}]`"
);

// 10. /removerole format
code = replaceAll(
  code,
  "`У [id${parsed.targetId}|пользователя] снята роль.\\n\\n| Модератор - [id${userId}|${fullName}]`",
  "`у [id${parsed.targetId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id${userId}|${fullName}]`"
);

// 11. /addaccesslevel format
code = replaceAll(
  code,
  "`[id${userId}|${fullName}] выдал(-а) уровень прав «${roleName}» [id${parsed.targetId}|пользователю]`",
  "`[id${parsed.targetId}|Пользователю] выдан уровень прав «${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id${userId}|${fullName}]`"
);

// 12. /addantiteg
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-тег».\\n\\n| Выдал - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-тег».\\n\\n| Модератор, который выдал функцию - [id${userId}|${fullName}]`"
);

// 13. /unantiteg
code = replaceAll(
  code,
  "`У [id${parsed.targetId}|пользователя] забрана функция «Анти-тег».\\n\\n| Забрал - [id${userId}|${fullName}]`",
  "`у [id${parsed.targetId}|пользователя] забрана функция «Анти-тег».\\n\\n| Модератор, который забрал функцию - [id${userId}|${fullName}]`"
);

// 14. /addawstats
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-Просмотр Stats».\\n\\n| Выдал - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-Просмотр Stats»\\n\\n| Модератор, который выдал функцию - [id${userId}|${fullName}]`"
);

// 15. /unawstats
code = replaceAll(
  code,
  "`У [id${parsed.targetId}|пользователя] забрана функция «Анти-Просмотр Stats».\\n\\n| Забрал - [id${userId}|${fullName}]`",
  "`У [id${parsed.targetId}|пользователя] была забрана функция «Анти-Просмотр Stats»\\n\\n| Модератор, который забрал функцию - [id${userId}|${fullName}]`"
);

// 16. /gaddawstats
code = replaceAll(
  code,
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-Просмотр Stats» во всём чат-менеджере.\\n\\n| Выдал - [id${userId}|${fullName}]`",
  "`[id${parsed.targetId}|Пользователю] выдана функция «Анти-Просмотр Stats» во всём чат-менеджере\\n\\n| Модератор, который выдал функцию - [id${userId}|${fullName}]`"
);

// 17. /gunawstats
code = replaceAll(
  code,
  "`У [id${parsed.targetId}|пользователя] забрана функция «Анти-Просмотр Stats» во всём чат-менеджере.\\n\\n| Забрал - [id${userId}|${fullName}]`",
  "`У [id${parsed.targetId}|пользователя] была забрана функция «Анти-Просмотр Stats» во всём чат-менеджере\\n\\n| Модератор, который забрал функцию - [id${userId}|${fullName}]`"
);

fs.writeFileSync("server.ts", code);
console.log("Done");
