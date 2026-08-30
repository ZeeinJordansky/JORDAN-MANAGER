const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Ensure rules URL
code = code.replace(/https:\/\/vk\.(?:com|ru)\/[^"\s]*pravila[^"\s]*/gi, 'https://vk.ru/@gm_manager_official-pravila-bota');
code = code.replace(/https:\/\/vk\.com\/topic-228741364_52899478/g, 'https://vk.ru/@gm_manager_official-pravila-bota');

// 2. Fix nickname limit to 35
code = code.replace(/rawNick\.length > \d+/g, 'rawNick.length > 35');
code = code.replace(/\d+ символов/g, '35 символов');

// 3. Fix Flood mute message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, peerId, `.*?получил\(-а\) блокировку чата на 30 минут за флуд сообщениями.*?`/gs,
  'await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.`'
);

// 4. Fix Tag all message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, peerId, `.*?получил\(-а\) предупреждение за упоминание всех участников беседы.*?`/gs,
  'await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.`'
);

// 5. Fix Antisliv message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, peerId, `.*?попытался совершить слив беседы.*?`/gs,
  'await sendVkMessage(VK_TOKEN, peerId, `У [id${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.`'
);

// 6. Fix Auto-unmute message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, uData\.mutePeerId, `.*?был\(-а\) автоматически размучен\(-а\).*?`/gs,
  'await sendVkMessage(VK_TOKEN, uData.mutePeerId, `Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.`, { noReply: true }'
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Fixed precision texts in server.ts');
