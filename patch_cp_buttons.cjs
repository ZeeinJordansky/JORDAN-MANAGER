const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const confirmSearch = `          const askRes = await sendVkMessageLocal(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\nВведите код для входа в панель управления\`);`;
const confirmReplace = `          const askRes = await sendVkMessage(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\nВведите код для входа в панель управления\`);`;

if (code.includes(confirmSearch)) {
  code = code.replace(confirmSearch, confirmReplace);
}

const cancelSearch = `          await sendVkMessageLocal(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\nВы отменили вход в панель управления.\`);`;
const cancelReplace = `          await sendVkMessage(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\nВы отменили вход в панель управления.\`);`;

if (code.includes(cancelSearch)) {
  code = code.replace(cancelSearch, cancelReplace);
}

const loginSearch = `await sendVkMessageLocal(VK_TOKEN, 2000000011, \`...::Панель Управления Чат-Менеджером::...\\n\\nПользователь [id\${userId}|\${cuName}] запросил вход в панель управления.\\n\\nКод для входа: \${genCode}\`);`;
const loginReplace = `await sendVkMessage(VK_TOKEN, 2000000011, \`...::Панель Управления Чат-Менеджером::...\\n\\nПользователь [id\${userId}|\${cuName}] запросил вход в панель управления.\\n\\nКод для входа: \${genCode}\`);`;

if (code.includes(loginSearch)) {
  code = code.replace(loginSearch, loginReplace);
}

fs.writeFileSync('server.ts', code);
console.log("Patched cp buttons to use sendVkMessage directly!");
