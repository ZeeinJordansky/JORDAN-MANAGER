const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  // 1. /warn
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] выдал\(-а\) предупреждение \[id\$\{parsed\.targetId\}\|\$\{tName\}\] \(\$\{newWarns\}\/3\)\\n\\n\| Причина: \$\{reason\}`,\s*\{ noReply: true,\s*keyboard: JSON\.stringify\(keyboard\) \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] выдано предупреждение (${newWarns}/3) по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true, keyboard: JSON.stringify(keyboard) });'
  },
  // 2. /warn (3/3)
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] выдал\(-а\) предупреждение \[id\$\{parsed\.targetId\}\|\$\{tName\}\] \(3\/3\)\\n\\n\| Пользователь исключен из беседы и заблокирован за превышение лимита предупреждений \(3\/3\)\.\\n\| Причина: \$\{reason\}`,\s*\{ noReply: true \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] выдано предупреждение (3/3) по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]\\n\\n| Пользователь исключён из беседы и заблокирован за превышение лимита предупреждений.`, { noReply: true });'
  },
  // 3. /unwarn
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] снял\(-а\) предупреждение с \[id\$\{parsed\.targetId\}\|\$\{tName\}\] \(\$\{newWarns\}\/3\)`,\s*\{ noReply: true \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] снято одно предупреждение.\\n\\n| Текущее количество: ${newWarns}/3\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  },
  // 4. /kick
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] исключил\(-а\) \[id\$\{parsed\.targetId\}\|\$\{tName\}\] из беседы\\n\\n\| Причина: \$\{reason\}`,\s*\{ noReply: true \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|${tName}] был(-а) исключён из беседы по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  },
  // 5. /ban
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] заблокировал\(-а\) \[id\$\{parsed\.targetId\}\|\$\{tName\}\] в текущей беседе\\n\\n\| Причина: \$\{reason\}\\n\| Срок: \$\{termStr\}`,\s*\{ keyboard: JSON\.stringify\(keyboard\) \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] выдана блокировка скором на ${termStr} по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]\\n| Блокировка до: ${fmtD(expiresAt)}`, { noReply: true, keyboard: JSON.stringify(keyboard) });'
  },
  // 6. /unban
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] разблокировал\(-а\) \[id\$\{parsed\.targetId\}\|\$\{tName\}\] в текущей беседе`,\s*\{ noReply: true \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  },
  // 7. /gban
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|\$\{fullName\}\] заблокировал\(-а\) \[id\$\{parsed\.targetId\}\|пользователя\] во всех беседах\\n\\n\| Причина: \$\{reason\}\\n\| Срок: \$\{termStr\}`,\s*\{ noReply: true,\s*keyboard: JSON\.stringify\(\{inline: true, buttons: \[\[\{action: \{type: "callback", label: "Снять блокировку", payload: JSON\.stringify\(\{cmd: "mod_ungban", targetId: parsed\.targetId\}\)\}, color: "positive"\}\]\]\}\) \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] занесён(-на) в глобальную блокировку во всех беседах по причине: ${reason}\\n\\n| Блокировка до: ${fmtD(expiresAt)}`, { noReply: true });'
  },
  // 8. /addblack
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|\$\{fullName\}\] добавил\(-а\) \[id\$\{parsed\.targetId\}\|пользователя\] в черный список сообщества\.\\n\\n\| Причина: \$\{reason\}\\n\| Срок: \$\{termStr\}`,\s*\{ noReply: true \}\);/,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователя] занесён в чёрный список чат-менеджера по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]\\n| Блокировка до: ${fmtD(expiresAt)}`, { noReply: true });'
  }
];

let changed = 0;
for (const r of regexes) {
  if (r.find.test(code)) {
    code = code.replace(r.find, r.replace);
    changed++;
    console.log("Replaced:", r.find);
  } else {
    console.log("NOT FOUND:", r.find);
  }
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log(`Updated ${changed} formats.`);
