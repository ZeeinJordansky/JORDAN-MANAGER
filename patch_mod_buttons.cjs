const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexUnmute = /await sendVkMessageLocal\(VK_TOKEN, peerId, \`\[id\$\{tId\}\|пользователю\] была снята блокировка чата\.\\n\\n\| Модератор - \[id\$\{userId\}\|\$\{modName\}\]\`\);\s*await editVkMessage\(VK_TOKEN, peerId, cmId, undefined, \{ keyboard: JSON\.stringify\(\{inline: true, buttons: \[\]\}\) \}\);/m;
const replaceUnmute = `await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${tId}|пользователю] была снята блокировка чата.\\n\\n| Модератор - [id\${userId}|\${modName}]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });`;

if (regexUnmute.test(code)) {
  code = code.replace(regexUnmute, replaceUnmute);
}

const regexUnbanChat = /await sendVkMessageLocal\(VK_TOKEN, peerId, \`\[id\$\{tId\}\|Пользователю\] была снята блокировка в этой беседе\. Теперь его снова можно сюда добавить\.\\n\\n\| Модератор, который разблокировал - \[id\$\{userId\}\|\$\{modName\}\]\`\);\s*await editVkMessage\(VK_TOKEN, peerId, cmId, undefined, \{ keyboard: JSON\.stringify\(\{inline: true, buttons: \[\]\}\) \}\);/m;
const replaceUnbanChat = `await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${tId}|Пользователю] была снята блокировка в этой беседе. Теперь его снова можно сюда добавить.\\n\\n| Модератор, который разблокировал - [id\${userId}|\${modName}]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });`;

if (regexUnbanChat.test(code)) {
  code = code.replace(regexUnbanChat, replaceUnbanChat);
}

const regexUngban = /await sendVkMessageLocal\(VK_TOKEN, peerId, \`\[id\$\{tId\}\|Пользователю\] была снята глобальная блокировка во всех беседах\.\\n\\n\| Модератор, который разблокировал - \[id\$\{userId\}\|\$\{modName\}\]\`\);\s*await editVkMessage\(VK_TOKEN, peerId, cmId, undefined, \{ keyboard: JSON\.stringify\(\{inline: true, buttons: \[\]\}\) \}\);/m;
const replaceUngban = `await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${tId}|Пользователю] была снята глобальная блокировка во всех беседах.\\n\\n| Модератор, который разблокировал - [id\${userId}|\${modName}]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });`;

if (regexUngban.test(code)) {
  code = code.replace(regexUngban, replaceUngban);
}

fs.writeFileSync('server.ts', code);
console.log("Patched mod buttons to update existing message!");
