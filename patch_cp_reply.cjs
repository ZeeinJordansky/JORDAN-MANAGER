const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const search = `          await sendVkMessageLocal(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\n[id\${userId}|\${uFirstName}], добро пожаловать в панель управления!\`, {
            keyboard: JSON.stringify(cpKeyboard)
          });`;

const replace = `          await sendVkMessage(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\n[id\${userId}|\${uFirstName}], добро пожаловать в панель управления!\`, {
            keyboard: JSON.stringify(cpKeyboard)
          });`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched cp_reply successfully!");
} else {
  console.log("Could not find cp_reply logic!");
}
