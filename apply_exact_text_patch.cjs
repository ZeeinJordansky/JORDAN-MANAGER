const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Rules command URL
code = code.replace(
  /if \(rawCmd === "\/rules"[\s\S]*?return await sendResponse\([^)]+\);[\s\S]*?\}/,
  `if (rawCmd === "/rules" || rawCmd === "/правила" || rawCmd === "/правилабота") {
        return await sendResponse("Правила использования чат-менеджера: https://vk.ru/@gm_manager_official-pravila-bota");
      }`
);
code = code.replace(/https:\/\/vk\.com\/topic-228741364_52899478/g, 'https://vk.ru/@gm_manager_official-pravila-bota');
code = code.replace(/https:\/\/vk\.ru\/topic-228741364_52899478/g, 'https://vk.ru/@gm_manager_official-pravila-bota');

// 2. Flood Mute Exact text
code = code.replace(
  /\[id\${userId}\|Пользователю\] была выдана блокировка чата на 30 минут по причине флуда сообщениями\. \(#FLOOD\)/g,
  '[id${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.'
);

// 3. Tag All Exact text
code = code.replace(
  /`\[id\${userId}\|[^\]]+\] получил\(-а\) предупреждение за упоминание всех участников беседы/g,
  '`[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.'
);
code = code.replace(
  /`\[id\${userId}\|[^\]]+\] получил\(-а\) предупреждение за тег всех участников беседы/g,
  '`[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.'
);

// 4. Antisliv Exact text
code = code.replace(
  /sendVkMessage\(VK_TOKEN, peerId, `.*?попытался совершить слив беседы.*?`\)/gs,
  'sendVkMessage(VK_TOKEN, peerId, `У [id${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.`)'
);

// 5. Auto unmute exact text
code = code.replace(
  /sendVkMessage\(VK_TOKEN, uData\.mutePeerId, `.*?был\(-а\) автоматически размучен\(-а\)\.`\)/gs,
  'sendVkMessage(VK_TOKEN, uData.mutePeerId, `Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.`, { noReply: true })'
);

// 6. Bot added to chat greeting with button
code = code.replace(
  /const greeting = `JORDAN MANAGER был добавлен в беседу\.[\s\S]*?`\s*;\s*await sendVkMessage\(VK_TOKEN, peerId, greeting\);/,
  `const joinKb = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_chat_btn" }) }, color: "positive" }]
            ]
          };
          const greeting = \`JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.\`;
          await sendVkMessage(VK_TOKEN, peerId, greeting, { keyboard: JSON.stringify(joinKb) });`
);

// 7. User left chat message with buttons
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, peerId, `\[id\${memberId}\|\${memberName}\] вышел\(-ла\) из беседы\.`\);/,
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

// 8. /заявка in PM
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

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Applied exact text patch!');
