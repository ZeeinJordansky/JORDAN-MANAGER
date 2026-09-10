const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  // 1. /warn (regular)
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] выдал\(-а\) предупреждение \[id\$\{parsed\.targetId\}\|\$\{tName\}\] \(\$\{newWarns\}\/3\)\\n\\n\| Причина: \$\{reason\}`,\s*\{ noReply: true \}\);/g,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] выдано предупреждение (${newWarns}/3) по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  },
  // 3. /unwarn
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] снял\(-а\) предупреждение с \[id\$\{parsed\.targetId\}\|\$\{tName\}\] \(Текущие предупреждения: \$\{newWarns\}\/3\)`,\s*\{ noReply: true \}\);/g,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] снято одно предупреждение.\\n\\n| Текущее количество: ${newWarns}/3\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  },
  // 4. /kick
  {
    find: /return await sendResponse\(`\[id\$\{userId\}\|Модератор\] исключил\(-а\) пользователя \[id\$\{parsed\.targetId\}\|\$\{tName\}\] из беседы\.\\n\\n\| Причина: \$\{reason\}`,\s*\{ noReply: true \}\);/g,
    replace: 'return await sendResponse(`[id${parsed.targetId}|${tName}] был(-а) исключён из беседы по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
  }
];

let changed = 0;
for (const r of regexes) {
  if (r.find.test(code)) {
    code = code.replace(r.find, r.replace);
    changed++;
    console.log("Replaced");
  } else {
    console.log("NOT FOUND:", r.find);
  }
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log(`Updated ${changed} formats.`);
