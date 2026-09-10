const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const snickSearch = `return await sendResponse(\`[id\${userId}|Модератор] установил(-а) ник [id\${parsed.targetId}|пользователю]\\n\\n| Установленный ник: \${nick}\`, { noReply: true });`;
const snickReplace = `return await sendResponse(\`[id\${parsed.targetId}|Пользователю] установлен новый Nick_Name.\\n\\n| Новый Nick_Name: \${nick}\\n| Модератор, который установил Nick_Name - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (code.includes(snickSearch)) {
  code = code.replace(snickSearch, snickReplace);
}

const rnickSearch = `return await sendResponse(\`[id\${userId}|Модератор] удалил(-а) ник [id\${parsed.targetId}|пользователю]\`, { noReply: true });`;
const rnickReplace = `return await sendResponse(\`[id\${parsed.targetId}|Пользователю] удалён Nick_Name.\\n\\n| Модератор, который удалил Nick_Name - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (code.includes(rnickSearch)) {
  code = code.replace(rnickSearch, rnickReplace);
}

fs.writeFileSync('server.ts', code);
console.log("Patched successfully!");
