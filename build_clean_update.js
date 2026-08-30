const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. UPDATE RULES URL
code = code.replace(/https:\/\/vk\.com\/@gm_manager_official-pravila-bota/g, 'https://vk.ru/@gm_manager_official-pravila-bota');
code = code.replace(/https:\/\/vk\.com\/[^"]*pravila[^\s"]*/g, 'https://vk.ru/@gm_manager_official-pravila-bota');

// 2. UPDATE NICKNAME LENGTH LIMIT TO 35
code = code.replace(/rawNick\.length > 25/g, 'rawNick.length > 35');
code = code.replace(/rawNick\.length > 30/g, 'rawNick.length > 35');
code = code.replace(/25 символов/g, '35 символов');
code = code.replace(/30 символов/g, '35 символов');

// 3. ALLOW /заявка in PM
code = code.replace(
  `if (peerId < 2000000000) {
        if (!ALL_GAME_CMDS.has(rawCmd)) {
          return await sendVkMessage(VK_TOKEN, peerId, "В ЛС бота работают только игровые команды!");
        }
      }`,
  `if (peerId < 2000000000) {
        const isPmAllowed = ALL_GAME_CMDS.has(rawCmd) || ["/заявка", "/zayavka", "/податьзаявку", "/start", "/старт", "/help", "/помощь"].includes(rawCmd) || user.zayavkaState;
        if (!isPmAllowed) {
          return await sendVkMessage(VK_TOKEN, peerId, "В ЛС бота работают только игровые команды!");
        }
      }`
);

// 4. FLOOD MUTE MESSAGE
code = code.replace(
  /sendVkMessage\(VK_TOKEN, peerId, `\[id\${userId}\|[^\]]+\] получил\(-а\) блокировку чата на 30 минут за флуд сообщениями/g,
  'sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.'
);

// 5. TAG ALL MESSAGE
code = code.replace(
  /sendVkMessage\(VK_TOKEN, peerId, `\[id\${userId}\|[^\]]+\] получил\(-а\) предупреждение за упоминание всех участников беседы/g,
  'sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.'
);

// 6. ANTISLIV MESSAGE
code = code.replace(
  /sendVkMessage\(VK_TOKEN, peerId, `🚨 Внимание! \[id\${userId}\|[^\]]+\] попытался совершить слив беседы/g,
  'sendVkMessage(VK_TOKEN, peerId, `У [id${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.'
);

// 7. AUTO-UNMUTE MESSAGE
code = code.replace(
  /sendVkMessage\(VK_TOKEN, uData\.mutePeerId, `\[id\${uId}\|[^\]]+\] был\(-а\) автоматически размучен\(-а\)\.`/g,
  'sendVkMessage(VK_TOKEN, uData.mutePeerId, `Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.`, { noReply: true })'
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Applied base fixes to server.ts');
