import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Remove double answerVkEvent in mod_unban_chat
code = code.replace(/await answerVkEvent\(VK_TOKEN, eventId, userId, peerId, \{ text: "Блокировка снята\." \}\);\n             await updateUser\(tId, \{ chatBans, isGameBanned: false \}\);\n             await answerVkEvent\(VK_TOKEN, eventId, userId, peerId, \{ text: "Пользователь разблокирован\." \}\);/g, 
  'await updateUser(tId, { chatBans, isGameBanned: false });\n             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Пользователь разблокирован." });');

fs.writeFileSync('server.ts', code);
