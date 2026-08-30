const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Ensure Rules URL and command
if (!code.includes('if (["/rules", "/правила", "/правилабота"].includes(rawCmd))')) {
  code = code.replace(
    'if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы" || rawCmd === "/aliases") {',
    `if (["/rules", "/правила", "/правилабота"].includes(rawCmd)) {
        return await sendResponse("Правила использования чат-менеджера: https://vk.ru/@gm_manager_official-pravila-bota");
      }
      if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы" || rawCmd === "/aliases") {`
  );
}

// 2. Fix Bot added to chat greeting with button
code = code.replace(
  /if \(isBot\) \{[\s\S]*?await sendVkMessage\(VK_TOKEN, peerId, greeting\);\s*return;\s*\}/,
  `if (isBot) {
          const joinKb = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_chat_btn" }) }, color: "positive" }]
            ]
          };
          const greeting = \`JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.\`;
          const u = await getOrCreateUser(userId);
          const fullName = u.fullName || u.nick || \`User\${userId}\`;
          const logMsg = \`Бот был добавлен в новую беседу.\\n\\n| Добавил: [id\${userId}|\${fullName}]\\n| ID Беседы: \${peerId}\`;
          sendVkMessage(VK_TOKEN, 2000000010, logMsg).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, greeting, { keyboard: JSON.stringify(joinKb) });
          return;
        }`
);

// 3. Fix User left chat with callback buttons
code = code.replace(
  /if \(memberId === userId\) \{[\s\S]*?await sendVkMessage\(VK_TOKEN, peerId, `\[id\${memberId}\|\${memberName}\] (?:покинул\(-ла\)|вышел\(-ла\)) беседу`\);[\s\S]*?if \(chatData\.leaveKick\) \{/,
  `if (memberId === userId) {
           const uData = await getOrCreateUser(memberId);
           const memberName = uData.fullName || uData.nick || \`User\${memberId}\`;
           const leaveKb = {
             inline: true,
             buttons: [
               [
                 { action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "kick_left_user", targetId: memberId }) }, color: "negative" },
                 { action: { type: "callback", label: "Снять роль", payload: JSON.stringify({ cmd: "remove_role_left_user", targetId: memberId }) }, color: "secondary" }
               ]
             ]
           };
           await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(leaveKb) });
           if (chatData.leaveKick) {`
);

// 4. Fix Anti-Sliv exact message
code = code.replace(
  /const responseText = `Роль у \[id\${userId}\|\${uName}\] была снята из-за подозрения в сливе\.[\s\S]*?`;/,
  'const responseText = `У [id${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.`;'
);

// 5. Fix Anti-Teg exact message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, peerId, `\[id\${userId}\|\${tegUName}\] получил\(-а\) предупреждение из-за упоминания всех участников беседы\.[\s\S]*?`, \{ noReply: true \}\);/,
  'await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.`, { noReply: true });'
);

// 6. Fix Auto-unmute message
code = code.replace(
  /await sendVkMessage\(VK_TOKEN, targetPeerId, `Блокировка чата у \[id\${uId}\|пользователя\] была окончена\.`\);/,
  'await sendVkMessage(VK_TOKEN, targetPeerId, `Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.`, { noReply: true });'
);

// 7. Fix PM check for /заявка
code = code.replace(
  /if \(peerId < 2000000000\) \{[\s\S]*?if \(!allowedInDm\.has\(rawCmd\)\) \{[\s\S]*?return await sendVkMessage\(VK_TOKEN, peerId, "В ЛС бота работают только игровые команды!"\);\s*\}\s*\}/,
  `if (peerId < 2000000000) {
        const isPmAllowed = ALL_GAME_CMDS.has(rawCmd) || ["/заявка", "/zayavka", "/податьзаявку", "/start", "/старт", "/help", "/помощь", "/гхелп", "/gamehelp", "/ghelp", "/хелп", "/команды", "/меню", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот", "/audio", "/аудио"].includes(rawCmd) || user.zayavkaState;
        if (!isPmAllowed) {
          return await sendVkMessage(VK_TOKEN, peerId, "В ЛС бота работают только игровые команды!");
        }
      }`
);

// 8. Add /audio and /аудио command for Bot Owner & attach to stats / profile
if (!code.includes('if (["/audio", "/аудио", "/музыка", "/music"].includes(rawCmd))')) {
  const audioHandler = `
      if (["/audio", "/аудио", "/музыка", "/music"].includes(rawCmd)) {
        if (user.role < 12 && userId !== 778382713 && userId !== 1115715881 && !isAdmin) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
        }

        // Check if removing audio
        const subArg = (args[1] || "").toLowerCase();
        if (["удалить", "снять", "clear", "remove", "off", "del"].includes(subArg)) {
          await updateUser(userId, { customAudio: "", customAudioTitle: "" });
          return await sendResponse("🎵 Аудиозапись из вашего /профиль и /стата успешно удалена!");
        }

        // Look for audio in message attachments, reply message, or forwarded messages
        let foundAudio: any = null;
        const allAtts = [
          ...(message.attachments || []),
          ...(message.reply_message?.attachments || []),
          ...((message.fwd_messages || []).flatMap((f: any) => f.attachments || []))
        ];

        for (const att of allAtts) {
          if (att.type === "audio" && att.audio) {
            foundAudio = att.audio;
            break;
          }
        }

        let audioAttachmentString = "";
        let audioTitle = "";

        if (foundAudio) {
          audioAttachmentString = \`audio\${foundAudio.owner_id}_\${foundAudio.id}\` + (foundAudio.access_key ? \`_\${foundAudio.access_key}\` : "");
          audioTitle = \`\${foundAudio.artist || ""} - \${foundAudio.title || ""}\`.trim();
        } else if (args[1] && args[1].startsWith("audio")) {
          audioAttachmentString = args[1];
          audioTitle = args.slice(2).join(" ") || args[1];
        }

        if (!audioAttachmentString) {
          return await sendResponse("Прикрепите аудиозапись (трек) к сообщению с командой /аудио для установки в /профиль и /стата!");
        }

        await updateUser(userId, { customAudio: audioAttachmentString, customAudioTitle: audioTitle });
        return await sendResponse(\`🎵 В ваш /профиль и /стата успешно установлена музыка: \${audioTitle || audioAttachmentString}!\`, {
          attachment: audioAttachmentString
        });
      }
`;
  code = code.replace(
    'if (["/rules", "/правила", "/правилабота"].includes(rawCmd)) {',
    audioHandler + '\n      if (["/rules", "/правила", "/правилабота"].includes(rawCmd)) {'
  );
}

// 9. Attach customAudio in /stats and /profile response
code = code.replace(
  /const resData = await getStatsMainPage\(finalId, peerId, userId\);\s*await sendResponse\(resData\.text, \{ keyboard: JSON\.stringify\(resData\.keyboard\), disable_mentions: 1 \}\);/,
  `const resData = await getStatsMainPage(finalId, peerId, userId);
        const attachOpt: any = {};
        if (targetU.customAudio) {
          attachOpt.attachment = targetU.customAudio;
        }
        await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1, ...attachOpt });`
);

// Include /profile and /профиль in stats aliases if not present
code = code.replace(
  'else if (rawCmd === "/stats" || rawCmd === "/стата" || rawCmd === "/я" || rawCmd === "/статс" || rawCmd === "/stata" || rawCmd === "/статистика") {',
  'else if (rawCmd === "/stats" || rawCmd === "/стата" || rawCmd === "/я" || rawCmd === "/статс" || rawCmd === "/stata" || rawCmd === "/статистика" || rawCmd === "/profile" || rawCmd === "/профиль" || rawCmd === "/проф") {'
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Applied full fixes successfully!');
