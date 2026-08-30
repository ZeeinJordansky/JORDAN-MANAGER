const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. RULES URL
code = code.replace(/https:\/\/vk\.com\/@gm_manager_official-pravila-bota/g, 'https://vk.ru/@gm_manager_official-pravila-bota');
code = code.replace(/https:\/\/vk\.com\/[^"]*pravila[^\s"]*/g, 'https://vk.ru/@gm_manager_official-pravila-bota');

// 2. NICKNAME LENGTH LIMIT TO 35
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

// 8. INVITING BANNED USER & GBAN USER
code = code.replace(
  /`\[id\${memberId}\|\${memberName}\] заблокирован\(-а\) в этой беседе администратором/g,
  '`[id${memberId}|${memberName}] заблокирован(-а) в этой беседе [id${bInfo.by || 0}|модератором]'
);
code = code.replace(
  /`\[id\${memberId}\|\${memberName}\] занесён\(-на\) в глобальный бан чат-менеджера/g,
  '`[id${memberId}|${memberName}] занесён(-на) в глобальную блокировку во всех беседах'
);

// 9. REPLACE "выдать права" with "выдать уровень прав" in help texts
code = code.replace(/выдать права/g, 'выдать уровень прав');
code = code.replace(/Выдать права/g, 'Выдать уровень прав');

// 10. BOT JOINED MESSAGE WITH KEYBOARD
code = code.replace(
  `await sendVkMessage(VK_TOKEN, peerId, "JORDAN MANAGER успешно подключен к беседе! Для начала работы выдайте боту права администратора и напишите команду /start.");`,
  `const joinKb = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_chat_btn" }) }, color: "positive" }]
            ]
          };
          await sendVkMessage(VK_TOKEN, peerId, "JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.", { keyboard: JSON.stringify(joinKb) });`
);

// 11. USER LEAVE MESSAGE WITH KEYBOARDS
code = code.replace(
  `await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`);`,
  `const leaveKb = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "kick_left_user", targetId: memberId }) }, color: "negative" },
                { action: { type: "callback", label: "Снять роль", payload: JSON.stringify({ cmd: "remove_role_left_user", targetId: memberId }) }, color: "secondary" }
              ]
            ]
          };
          await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(leaveKb) });`
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Successfully applied comprehensive update step 1');
