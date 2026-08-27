const fs = require('fs');
const esbuild = require('esbuild');

let code = fs.readFileSync('server.ts', 'utf8');

function replaceSection(startHeader, endHeader, newContent, label) {
  const startIdx = code.indexOf(startHeader);
  if (startIdx === -1) {
    console.error(`[FAIL] startHeader not found for ${label}`);
    return false;
  }
  const endIdx = code.indexOf(endHeader, startIdx + startHeader.length);
  if (endIdx === -1) {
    console.error(`[FAIL] endHeader not found for ${label}`);
    return false;
  }
  
  const before = code.substring(0, startIdx);
  const after = code.substring(endIdx);
  code = before + newContent + "\n      " + after;
  console.log(`[SUCCESS] Replaced: ${label}`);
  return true;
}

// 1. Replace /mute (starts at 'if (["/mute", "/мут", "/заглушить"' and ends at 'if (["/unmute", "/анмут"')
replaceSection(
  'if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {',
  'if (["/unmute", "/анмут", "/унмут", "/размут"',
  `if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         let timeMin = 30;
         let reason = "Нарушение правил";

         if (remainingArgs.length > 0) {
            const firstArg = remainingArgs[0];
            const parsedTime = parseTime(firstArg);
            if (parsedTime > 0) {
               timeMin = parsedTime;
               if (remainingArgs.length > 1) {
                  reason = remainingArgs.slice(1).join(" ");
               }
            } else {
               reason = remainingArgs.join(" ");
            }
         }

         const targetU = await getOrCreateUser(parsed.targetId);
         const muteUntil = Date.now() + timeMin * 60 * 1000;
         await updateUser(parsed.targetId, {
            muteUntil,
            muteReason: reason,
            mutePeerId: peerId
         });
         await executeVkMute(peerId, parsed.targetId, timeMin * 60);

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_action", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
            ]
         };

         const text = \`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\`;
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
      }`,
  "/mute"
);

// 2. Replace /unmute (starts at 'if (["/unmute", "/анмут"' and ends at 'if (["/smute"')
replaceSection(
  'if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {',
  'if (["/smute", "/смут"].includes(rawCmd))',
  `if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        const targetU = await getOrCreateUser(parsed.targetId);
        await updateUser(parsed.targetId, { muteUntil: 0, muteReason: "", mutePeerId: 0 });
        targetU.muteUntil = 0;
        targetU.muteReason = "";
        targetU.mutePeerId = 0;
        userCache.set(parsed.targetId, targetU);
        await executeVkUnmute(peerId, parsed.targetId);
        return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка чата.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/unmute"
);

// 3. Replace /warn (starts at 'if (["/warn", "/варн"' and ends at 'if (["/unwarn"')
replaceSection(
  'if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {',
  'if (["/unwarn", "/анварн", "/снятьварн"',
  `if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

        const reason = (message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ")) || "Нарушение правил";
        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = (targetU.warnings || 0) + 1;
        
        const activeList = targetU.activeWarningsList || [];
        activeList.push({
           reason,
           by: userId,
           date: Date.now()
        });

        await updateUser(parsed.targetId, {
           warnings: newWarns,
           warnReason: reason,
           warnedBy: userId,
           warnDate: Date.now(),
           activeWarningsList: activeList
        });

        if (newWarns >= 3) {
           await updateUser(parsed.targetId, { warnings: 0, activeWarningsList: [] });
           try {
              await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
                 params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId }
              });
           } catch (e) {}
           return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Пользователь набрал 3/3 предупреждений и был исключён из беседы.\`, { noReply: true });
        }

        const keyboard = {
           inline: true,
           buttons: [
              [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_action", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
           ]
        };

        const text = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;
        return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
      }`,
  "/warn"
);

// 4. Replace /unwarn (starts at 'if (["/unwarn", "/анварн"' and ends at 'if (rawCmd === "/snick"')
replaceSection(
  'if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {',
  'if (rawCmd === "/snick" || rawCmd === "/сник")',
  `if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        const targetU = await getOrCreateUser(parsed.targetId);
        const newW = Math.max(0, (targetU.warnings || 0) - 1);
        const activeList = (targetU.activeWarningsList || []).slice(0, newW);
        await updateUser(parsed.targetId, { warnings: newW, activeWarningsList: activeList });
        return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/unwarn"
);

// 5. Replace /kick (starts at 'if (["/kick", "/кик"' and ends at 'if (rawCmd === "/id"')
replaceSection(
  'if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {',
  'if (rawCmd === "/id" || rawCmd === "/айди" || rawCmd === "/ид")',
  `if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const reason = (message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ")) || "Нарушение правил";
         const targetU = await getOrCreateUser(parsed.targetId);
         const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;

         try {
            await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId }
            });
         } catch (e) {}

         const text = \`[id\${parsed.targetId}|\${tName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;
         return await sendResponse(text, { noReply: true });
      }`,
  "/kick"
);

// 6. Replace /gban (starts at 'if (rawCmd === "/gban"' and ends at 'if (rawCmd === "/aban"')
replaceSection(
  'if (rawCmd === "/gban" || rawCmd === "/гбан") {',
  'if (rawCmd === "/aban" || rawCmd === "/абан")',
  `if (rawCmd === "/gban" || rawCmd === "/гбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         let expiresAt = 0;
         let reason = "Нарушение правил проекта";

         if (remainingArgs.length > 0) {
            const firstArg = remainingArgs[0];
            const parsedTime = parseTime(firstArg);
            if (parsedTime > 0) {
               expiresAt = Date.now() + parsedTime * 60 * 1000;
               if (remainingArgs.length > 1) {
                  reason = remainingArgs.slice(1).join(" ");
               }
            } else {
               reason = remainingArgs.join(" ");
            }
         }

         const targetU = await getOrCreateUser(parsed.targetId);
         await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
         });

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]
            ]
         };

         const text = \`[id\${parsed.targetId}|пользователю] выдана глобальная блокировка во всех беседах по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`;
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
      }`,
  "/gban"
);

// 7. Replace /ban (starts at 'if (["/ban", "/бан", "/забанить"' and ends at 'if (["/unban", "/разбан"')
replaceSection(
  'if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {',
  'if (["/unban", "/разбан", "/унбан", "/разбанить"',
  `if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         let termText = "навсегда";
         let expiresAt = 0;
         let reason = "Нарушение правил";

         if (remainingArgs.length > 0) {
            const firstArg = remainingArgs[0];
            const parsedTime = parseTime(firstArg);
            if (parsedTime > 0) {
               expiresAt = Date.now() + parsedTime * 60 * 1000;
               termText = \`\${parsedTime} мин.\`;
               if (remainingArgs.length > 1) {
                  reason = remainingArgs.slice(1).join(" ");
               }
            } else {
               reason = remainingArgs.join(" ");
            }
         }

         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         chatBans[peerId] = {
            by: userId,
            reason,
            date: Date.now(),
            until: expiresAt
         };

         await updateUser(parsed.targetId, { chatBans });
         try {
            await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId }
            });
         } catch (e) {}

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_clearban", targetId: parsed.targetId }) }, color: "positive" }]
            ]
         };

         const text = \`[id\${parsed.targetId}|пользователю] выдана блокировка скором на \${termText} по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`;
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
      }`,
  "/ban"
);

// 8. Replace /unban (starts at 'if (["/unban", "/разбан"' and ends at 'if (["/sban", "/сбан"]')
replaceSection(
  'if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {',
  'if (["/sban", "/сбан"].includes(rawCmd))',
  `if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         delete chatBans[peerId];
         delete chatBans[String(peerId)];
         await updateUser(parsed.targetId, { chatBans, isGameBanned: false });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/unban"
);

// 9. Replace /addblack (starts at 'if (["/addblack", "/аддблэк"' and ends at 'if (["/unblack", "/анблэк"')
replaceSection(
  'if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {',
  'if (["/unblack", "/анблэк", "/анчс"',
  `if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете занести в черный список самого себя!");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         let expiresAt = 0;
         let reason = "Чёрный список";

         if (remainingArgs.length > 0) {
            const firstArg = remainingArgs[0];
            const parsedTime = parseTime(firstArg);
            if (parsedTime > 0) {
               expiresAt = Date.now() + parsedTime * 60 * 1000;
               if (remainingArgs.length > 1) {
                  reason = remainingArgs.slice(1).join(" ");
               }
            } else {
               reason = remainingArgs.join(" ");
            }
         }

         const targetU = await getOrCreateUser(parsed.targetId);
         const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;
         await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
         });

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]
            ]
         };

         const text = \`[id\${parsed.targetId}|\${tName}] занесён в чёрный список чат-менеджера по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`;
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
      }`,
  "/addblack"
);

// 10. Replace /stats main page format
replaceSection(
  'statsStr += `Статистика [id${targetId}|${targetName}]\\n\\n`;',
  'return { text: statsStr, keyboard };',
  `const warnsCount = targetUser.warnings || 0;
  const hasWarns = warnsCount > 0;
  const hasMute = !!(targetUser.muteUntil && targetUser.muteUntil > Date.now());

  let statsStr = \`Статистика [id\${targetId}|пользователя]\\n\\n\`;
  statsStr += \`| Nick_Name: \${nickStr}\\n\`;
  statsStr += \`| VK ID - \${targetId}\\n\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  if (userStatus) {
    statsStr += \`| Статус: \${userStatus}\\n\`;
  }
  statsStr += \`| Активная глобальная блокировка: \${hasGban ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активные блокировки в беседах: \${hasChatBans ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Активные предупреждения в беседе: \${hasWarns ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активная блокировка чата в беседе: \${hasMute ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений за сегодня: \${todayMsgs}\\n\`;
  statsStr += \`| Кол-во сообщений за всё время: \${targetUser.messagesCount || targetUser.messagesTotal || 0}\\n\`;
  statsStr += \`| Последнее сообщение: \${fmtD(targetUser.lastMessageTime || targetUser.lastActivity || Date.now())}\`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };
  return { text: statsStr, keyboard };`,
  "/stats"
);

fs.writeFileSync("server.ts", code, "utf8");

// Validate syntax with esbuild
try {
  esbuild.transformSync(code, { loader: 'ts' });
  console.log("ESBUILD VALIDATION PASSED!");
} catch (e) {
  console.error("ESBUILD VALIDATION FAILED:", e.message);
}
