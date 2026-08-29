const fs = require("fs");
let lines = fs.readFileSync("server.ts", "utf8").split("\n");

// 1. MANAGEMENT_ONLY_CMDS: remove /addzga and /addga
lines.forEach((l, i) => {
  if (l.includes('const MANAGEMENT_ONLY_CMDS = new Set([')) {
    lines[i] = lines[i].replace('"/addzga", "/addga"', '');
    lines[i] = lines[i].replace('"/addzga", ', '');
    lines[i] = lines[i].replace('"/addga", ', '');
  }
});

// 2. handlePromotion text line 10769
lines.forEach((l, i) => {
  if (l.includes("`[id${userId}|${fullName}] выдал(-а) уровень прав «${roleName}» [id${parsed.targetId}|пользователю]`")) {
    lines[i] = l.replace(
      "`[id${userId}|${fullName}] выдал(-а) уровень прав «${roleName}» [id${parsed.targetId}|пользователю]`",
      "`[id${parsed.targetId}|Пользователю] выдан уровень прав «${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id${userId}|${fullName}]`"
    );
  }
});

// 3. Demotions /removerole line 10825 (or around line 10788/10825)
lines.forEach((l, i) => {
  if (l.includes("`[id${userId}|${fullName}] снял(-а) права у [id${parsed.targetId}|пользователя]`")) {
    lines[i] = l.replace(
      "`[id${userId}|${fullName}] снял(-а) права у [id${parsed.targetId}|пользователя]`",
      "`у [id${parsed.targetId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id${userId}|${fullName}]`"
    );
  }
});

// 4. Delete /addzga and /addga promotion lines (around 10796-10797)
lines.forEach((l, i) => {
  if (l.includes('rawCmd === "/addzga"') || l.includes('rawCmd === "/addga"')) {
    lines[i] = "// " + l; // comment out
  }
});

// 5. Update /addzsr, /addozsr, /addruk role names
lines.forEach((l, i) => {
  if (l.includes('rawCmd === "/addzsr"')) {
    lines[i] = '       if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Заместитель Руководителя");';
  }
  if (l.includes('rawCmd === "/addozsr"')) {
    lines[i] = '       if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Основной Заместитель Руководителя");';
  }
  if (l.includes('rawCmd === "/addruk"')) {
    lines[i] = '       if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");';
  }
});

// 6. User Leave event line 7196
lines.forEach((l, i) => {
  if (l.includes("`[id${memberId}|${memberName}] покинул(-а) беседу`")) {
    lines[i] = `           const leaveKeyboard = {
             inline: true,
             buttons: [
               [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "leave_kick", targetId: memberId }) }, color: "negative" }],
               [{ action: { type: "callback", label: "Снять роль", payload: JSON.stringify({ cmd: "leave_removerole", targetId: memberId }) }, color: "secondary" }]
             ]
           };
           await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(leaveKeyboard) });`;
  }
});

// 7. Update /mute command line ~10463 to 10515
lines.forEach((l, i) => {
  if (l.includes('if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_reply", targetId: parsed.targetId, reason }) }, color: "secondary" }]);
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\${systemMuteSuccess ? "" : (vkErrMsg ? "\\n| Предупреждение VK API: " + vkErrMsg : "")}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;
    }
  }
});

// 8. Update /unmute command line ~10550
lines.forEach((l, i) => {
  if (i > 10500 && l.includes('if (["/unmute", "/анмут"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка чата.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
    }
  }
});

// 9. Update /warn command line ~10604
lines.forEach((l, i) => {
  if (i > 10550 && l.includes('if (["/warn", "/варн"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('let msg =')) j++;
    if (j < lines.length) {
      lines[j] = `         const buttons: any[] = [
           [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }]
         ];
         if (message.reply_message) {
           buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_reply", targetId: parsed.targetId, reason }) }, color: "secondary" }]);
           buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
         }
         const keyboard = { inline: true, buttons };

         let msg = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;`;
    }
  }
});

// 10. Update /unwarn command line ~10650
lines.forEach((l, i) => {
  if (i > 10630 && l.includes('if (["/unwarn", "/анварн"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
    }
  }
});

// 11. Update /kick command line ~10963
lines.forEach((l, i) => {
  if (i > 10900 && l.includes('if (["/kick", "/кик"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse(`[id${parsed.targetId}|${targetName}]')) j++;
    if (j < lines.length) {
      lines[j] = `          return await sendResponse(\`[id\${parsed.targetId}|\${targetName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
    }
  }
});

// 12. Update /gban command line ~11135
lines.forEach((l, i) => {
  if (i > 11100 && l.includes('if (rawCmd === "/gban" || rawCmd === "/гбан") {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять глобальную блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_cleargban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана глобальная блокировка во всех беседах по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;
    }
  }
});

// 13. Update /ban command line ~11800
lines.forEach((l, i) => {
  if (i > 11750 && l.includes('if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка скором на \${termStr} по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { keyboard: JSON.stringify(keyboard) });`;
    }
  }
});

// 14. Update /unban command line ~11835
lines.forEach((l, i) => {
  if (i > 11820 && l.includes('if (["/unban", "/разбан"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
    }
  }
});

// 15. Update /addblack command line ~12942
lines.forEach((l, i) => {
  if (i > 12900 && l.includes('if (["/addblack", "/аддблэк"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять чёрный список", payload: JSON.stringify({ cmd: "mod_unblack", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearblack", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|\${targetName}] занесён в чёрный список чат-менеджера по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;
    }
  }
});

// 16. Update /unblack command line ~12970
lines.forEach((l, i) => {
  if (i > 12950 && l.includes('if (["/unblack", "/анблэк"')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          return await sendResponse(\`[id\${parsed.targetId}|пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
    }
  }
});

// 17. Update /giveowner command line ~13347
lines.forEach((l, i) => {
  if (i > 13300 && l.includes('if (rawCmd === "/giveowner") {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('return await sendResponse')) j++;
    if (j < lines.length) {
      lines[j] = `          const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Да, передать", payload: JSON.stringify({ cmd: "mod_giveowner_yes", targetId: parsed.targetId }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Нет, не передавать", payload: JSON.stringify({ cmd: "mod_giveowner_no", targetId: parsed.targetId }) }, color: "negative" }]
            ]
          };
          return await sendResponse(\`Вы действительно хотите передать уровень прав «Владелец Беседы» [id\${parsed.targetId}|пользователю]?\`, { keyboard: JSON.stringify(keyboard), isReply: true });`;
    }
  }
});

// 18. Callback responses for mod_unmute, mod_unwarn, mod_unban_chat, mod_ungban, mod_giveowner_yes, mod_giveowner_no
lines.forEach((l, i) => {
  if (l.includes('await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) блокировку чата с [id${tId}|${tName}]`);')) {
    lines[i] = `              await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята блокировка чата.\\n\\n| Модератор, который снял блокировку чата - [id\${userId}|\${modName}]\`);`;
  }
  if (l.includes('await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) предупреждение с [id${tId}|${tName}]`);')) {
    lines[i] = `              await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${tId}|пользователю] было снято предупреждение.\\n\\n| Модератор, который снял предупреждение - [id\${userId}|\${modName}]\`);`;
  }
  if (l.includes('await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) блокировку с [id${tId}|пользователя]`);')) {
    lines[i] = `              await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята блокировка.\\n\\n| Модератор, который снял блокировку - [id\${userId}|\${modName}]\`);`;
  }
  if (l.includes('await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) глобальную блокировку с [id${tId}|пользователя] во всех беседах`);')) {
    lines[i] = `              await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята глобальная блокировка.\\n\\n| Модератор, который снял блокировку - [id\${userId}|\${modName}]\`);`;
  }
  if (l.includes('await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|Пользователь] передал(-а) свои права «Владелец Беседы» [id${tId}|пользователю]`);')) {
    lines[i] = `           const tUser = await getOrCreateUser(tId);
           const tName = tUser.fullName || tUser.nick || \`User\${tId}\`;
           const modUser = await getOrCreateUser(userId);
           const modName = modUser.fullName || modUser.nick || \`Модератор\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${tId}|\${tName}] становится новым владельцем беседы.\\n\\n| Бывший владелец беседы - [id\${userId}|\${modName}]\`);
           try {
             const cData = await getOrCreateChat(peerId);
             const chatTitle = cData.title || \`№\${peerId}\`;
             await sendVkMessage(VK_TOKEN, tId, \`Вам были передан уровень прав «Владелец Беседы» в беседе \${chatTitle} [id\${userId}|пользователем]\`);
           } catch (e) {}`;
  }
  if (l.includes('await editVkMessage(VK_TOKEN, peerId, cmId, `Передача прав «Владелец Беседы» отменена.`')) {
    lines[i] = `           const modUser = await getOrCreateUser(userId);
           const modName = modUser.fullName || modUser.nick || \`Модератор\`;
           const tUser = await getOrCreateUser(payloadObj.targetId || 0);
           const tName = tUser.fullName || tUser.nick || \`пользователю\`;
           await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|\${modName}] отменил(-а) передачу уровня прав «Владелец Беседы» [id\${payloadObj.targetId || 0}|\${tName}]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });`;
  }
});

// Add extra callback handlers for leave_kick, leave_removerole, mod_kick_reply, mod_clearmute, mod_clearwarn, mod_clearban, mod_cleargban, mod_clearblack if not present
lines.forEach((l, i) => {
  if (l.includes('if (cmd === "kick_left_user") {')) {
    lines[i] = `     if (cmd === "leave_kick") {
       const targetId = payloadObj.targetId;
       const uRole = await getRole(peerId, userId);
       if (uRole < 2) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас нет прав для этого действия!" });
          return;
       }
       const targetUser = await getOrCreateUser(targetId);
       const targetName = targetUser.fullName || targetUser.nick || \`User\${targetId}\`;
       const modUser = await getOrCreateUser(userId);
       const modName = modUser.fullName || modUser.nick || \`Модератор\`;
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       try {
         await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
           params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId }
         });
       } catch (e) {}
       await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${targetId}|\${targetName}] был исключён из беседы.\\n\\n| Модератор, который исключил - [id\${userId}|\${modName}]\`);
       await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       return;
     }

     if (cmd === "leave_removerole") {
       const targetId = payloadObj.targetId;
       const uRole = await getRole(peerId, userId);
       if (uRole < 2) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас нет прав для этого действия!" });
          return;
       }
       const targetUser = await getOrCreateUser(targetId);
       const chatRoles = { ...(targetUser.chatRoles || {}) };
       delete chatRoles[peerId];
       await updateUser(targetId, { chatRoles });
       const modUser = await getOrCreateUser(userId);
       const modName = modUser.fullName || modUser.nick || \`Модератор\`;
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await sendVkMessageLocal(VK_TOKEN, peerId, \`у [id\${targetId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id\${userId}|\${modName}]\`);
       await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       return;
     }

     if (cmd === "mod_kick_reply") {
       const targetId = payloadObj.targetId;
       const reason = payloadObj.reason || "без причины";
       const targetUser = await getOrCreateUser(targetId);
       const targetName = targetUser.fullName || targetUser.nick || \`User\${targetId}\`;
       const modUser = await getOrCreateUser(userId);
       const modName = modUser.fullName || modUser.nick || \`Модератор\`;
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       try {
         await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
           params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId }
         });
       } catch (e) {}
       await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${targetId}|\${targetName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${modName}]\`);
       return;
     }

     ` + l;
  }
});

fs.writeFileSync("server.ts", lines.join("\n"));
console.log("Applied precise updates successfully!");
