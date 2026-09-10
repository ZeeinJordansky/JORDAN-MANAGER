const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  // 3. /unwarn
  {
    find: /return await sendResponse\(`\[id\$\{parsed\.targetId\}\|пользователю\] снято одно предупреждение\.\\n\\n\| Текущее количество: \$\{newWarns\}\/3\\n\| Модератор - \[id\$\{userId\}\|\$\{fullName\}\]`,\s*\{ noReply: true \}\);/g,
    replace: 'return await sendResponse(`[id${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });'
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
