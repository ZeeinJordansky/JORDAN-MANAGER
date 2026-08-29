const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// 1. Remove /addga and /addzga from MANAGEMENT_ONLY_CMDS set
code = code.replace(
  `const MANAGEMENT_ONLY_CMDS = new Set([\n  "/addzsr", "/addozsr", "/addruk", "/addzga", "/addga"`,
  `const MANAGEMENT_ONLY_CMDS = new Set([\n  "/addzsr", "/addozsr", "/addruk"`
);

// 2. Clean promotion lines (remove /addga and /addzga, update role names)
const oldPromos = `       if (rawCmd === "/addmoder" || rawCmd === "/модер" || rawCmd === "/выдатьмодера" || rawCmd === "/setmoder" || rawCmd === "/аддмодер") return await handlePromotion(2, 1, "Модератор");
       if (rawCmd === "/addsenmoder" || rawCmd === "/смодер" || rawCmd === "/setsenmoder" || rawCmd === "/setsmoder" || rawCmd === "/старшиймодератор" || rawCmd === "/аддсмодер") return await handlePromotion(3, 2, "Старший модератор");
       if (rawCmd === "/addadmin" || rawCmd === "/админ" || rawCmd === "/setadmin" || rawCmd === "/аддадмин" || rawCmd === "/выдатьадмина") return await handlePromotion(4, 3, "Администратор");
       if (rawCmd === "/addsenadmin" || rawCmd === "/садмин" || rawCmd === "/setsenadmin" || rawCmd === "/setsadmin" || rawCmd === "/старшийадминистратор" || rawCmd === "/аддсадмин") return await handlePromotion(5, 4, "Старший администратор");
       if (rawCmd === "/addzga" || rawCmd === "/замспец" || rawCmd === "/выдатьзса" || rawCmd === "/setzsa" || rawCmd === "/addzamspets" || rawCmd === "/аддзса") return await handlePromotion(6, 5, "Зам. Глав. Администратора");
       if (rawCmd === "/addga" || rawCmd === "/са" || rawCmd === "/sa" || rawCmd === "/setsa" || rawCmd === "/выдатьса" || rawCmd === "/addspets" || rawCmd === "/аддса" || rawCmd === "/спецадмин") return await handlePromotion(7, 6, "Главный Администратор");
       if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Зам. Руководителя");
       if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Осн. Зам. Руководителя");
       if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");`;

const newPromos = `       if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Заместитель Руководителя");
       if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Основной Заместитель Руководителя");
       if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");`;

if (code.includes(oldPromos)) {
  code = code.replace(oldPromos, newPromos);
  console.log("Replaced old promotions");
} else {
  console.log("Warning: oldPromos exact match not found, checking line replacement...");
}

// 3. Update handlePromotion return text (around line 10771)
code = code.replace(
  `return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] выдан уровень прав «\${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id\${userId}|\${fullName}]\`, { noReply: true });`,
  `return await sendResponse(\`[id\${parsed.targetId}|Пользователю] выдан уровень прав «\${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id\${userId}|\${fullName}]\`, { noReply: true });`
);

// 4. Update /addaccesslevel text format (around line 13661)
code = code.replace(
  `return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] выдан уровень прав «\${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id\${userId}|\${fullName}]\`, { noReply: true });`,
  `return await sendResponse(\`[id\${parsed.targetId}|Пользователю] выдан уровень прав «\${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id\${userId}|\${fullName}]\`, { noReply: true });`
);

// 5. Update /removerole text format
code = code.replace(
  `return await sendResponse(\`[id\${userId}|\${fullName}] снял(-а) права у [id\${parsed.targetId}|пользователя]\`, { noReply: true });`,
  `return await sendResponse(\`у [id\${parsed.targetId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id\${userId}|\${fullName}]\`, { noReply: true });`
);

// 6. Update /mute command
const muteIdx = code.indexOf('if (["/mute", "/мут"');
const unmuteIdx = code.indexOf('if (["/unmute", "/анмут"');
if (muteIdx !== -1 && unmuteIdx !== -1) {
  const oldMuteStr = code.substring(muteIdx, unmuteIdx);
  const newMuteStr = `if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          
          const { timeMin, argIndex } = parseMuteDuration(args);
          const durationSec = Math.max(60, timeMin * 60);
          
          const reasonArgs = args.slice(message.reply_message ? 1 : 2).filter((_, idx) => {
            const actualIdx = (message.reply_message ? 1 : 2) + idx;
            return actualIdx !== argIndex;
          });
          const reason = reasonArgs.join(" ") || "без причины";
          
          const vkRes = await executeVkMute(peerId, parsed.targetId, durationSec);
          const systemMuteSuccess = vkRes.success;
          const vkErrMsg = vkRes.errorMsg;

          const muteUntil = Date.now() + durationSec * 1000;
          await updateUser(parsed.targetId, { muteUntil, muteReason: reason, mutePeerId: peerId });
          const targetU = await getOrCreateUser(parsed.targetId);
          targetU.muteUntil = muteUntil;
          targetU.muteReason = reason;
          targetU.mutePeerId = peerId;
          userCache.set(parsed.targetId, targetU);

          await logBotAction({ type: "mute", peerId, userId, targetId: parsed.targetId, text: \`[id\${userId}|\${fullName}] выдал(-а) блокировку чата [id\${parsed.targetId}|пользователю] на \${timeMin} мин (Причина: \${reason})\` });
          
          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_reply", targetId: parsed.targetId, reason }) }, color: "secondary" }]);
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\${systemMuteSuccess ? "" : (vkErrMsg ? "\\n| Предупреждение VK API: " + vkErrMsg : "")}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });
        }\n\n       `;
  code = code.replace(oldMuteStr, newMuteStr);
  console.log("Replaced /mute block");
}

// 7. Update /unmute command
const unmuteIdx2 = code.indexOf('if (["/unmute", "/анмут"');
const smuteIdx = code.indexOf('if (["/smute", "/смут"');
if (unmuteIdx2 !== -1 && smuteIdx !== -1) {
  const oldUnmuteStr = code.substring(unmuteIdx2, smuteIdx);
  const newUnmuteStr = `if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
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
       }\n\n       `;
  code = code.replace(oldUnmuteStr, newUnmuteStr);
  console.log("Replaced /unmute block");
}

// 8. Update /warn & /unwarn
const warnIdx = code.indexOf('if (["/warn", "/варн"');
const snickIdx = code.indexOf('if (rawCmd === "/snick"');
if (warnIdx !== -1 && snickIdx !== -1) {
  const oldWarnStr = code.substring(warnIdx, snickIdx);
  const newWarnStr = `if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason } = extractReasonAndDuration(remainingArgs);

         const targetU = await getOrCreateUser(parsed.targetId);
         const newWarns = (targetU.warnings || 0) + 1;
         await updateUser(parsed.targetId, { 
            warnings: newWarns, 
            warnBy: userId, 
            warnReason: reason, 
            warnDate: Date.now() 
         });
         await logBotAction({ type: "warn", peerId, userId, targetId: parsed.targetId, text: \`[id\${userId}|\${fullName}] выдал(-а) предупреждение [id\${parsed.targetId}|пользователю] (\${newWarns}/3, Причина: \${reason})\` });
         
         const buttons: any[] = [
           [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }]
         ];
         if (message.reply_message) {
           buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_reply", targetId: parsed.targetId, reason }) }, color: "secondary" }]);
           buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
         }
         const keyboard = { inline: true, buttons };
         
         let msg = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;
         
         if (newWarns >= 3) {
            msg += \`\\n\\nДостигнуто 3/3 предупреждений. Пользователь будет исключён.\`;
            await updateUser(parsed.targetId, { warnings: 0 });
            try {
              await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
            } catch (e) {}
         }
         
         return await sendResponse(msg, { noReply: true, keyboard: JSON.stringify(keyboard) });
       }

       if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         const targetU = await getOrCreateUser(parsed.targetId);
         const newWarns = Math.max(0, (targetU.warnings || 0) - 1);
         await updateUser(parsed.targetId, { warnings: newWarns });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
       }\n\n       `;
  code = code.replace(oldWarnStr, newWarnStr);
  console.log("Replaced /warn and /unwarn block");
}

// 9. Update /kick command
const kickIdx = code.indexOf('if (["/kick", "/кик"');
const idIdx = code.indexOf('if (rawCmd === "/id"');
if (kickIdx !== -1 && idIdx !== -1) {
  const oldKickStr = code.substring(kickIdx, idIdx);
  const newKickStr = `if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const reason = remainingArgs.join(" ") || "без причины";

          const targetU = await getOrCreateUser(parsed.targetId);
          const targetName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;

          const members = await getChatMembers(peerId);
          const tProfile = (members.profiles || []).find((p: any) => p.id === parsed.targetId);
          if (tProfile && tProfile.is_owner) {
             return await sendResponse("Вы не можете исключить владельца беседы!");
          }

          try {
            await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
              params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId }
            });
          } catch (e) {
            return await sendResponse("Не удалось кикнуть пользователя из беседы. Возможно у него имеются права системного администратора/владельца.");
          }
          return await sendResponse(\`[id\${parsed.targetId}|\${targetName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
       }\n\n       `;
  code = code.replace(oldKickStr, newKickStr);
  console.log("Replaced /kick block");
}

// 10. Update /ban and /unban
const banIdx = code.indexOf('if (["/ban", "/бан"');
const clearIdx = code.indexOf('if (["/clear", "/очистить"');
if (banIdx !== -1 && clearIdx !== -1) {
  const oldBanStr = code.substring(banIdx, clearIdx);
  const newBanStr = `if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const termStr = duration ? duration.text : "Навсегда";

          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
          await updateUser(parsed.targetId, { chatBans });

          try {
             await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
          } catch (e) {}

          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка скором на \${termStr} по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { keyboard: JSON.stringify(keyboard) });
       }

       if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          delete chatBans[peerId];
          await updateUser(parsed.targetId, { chatBans });

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
       }\n\n       `;
  code = code.replace(oldBanStr, newBanStr);
  console.log("Replaced /ban and /unban block");
}

// 11. Update /gban command
const gbanIdx = code.indexOf('if (rawCmd === "/gban"');
const abanIdx = code.indexOf('if (rawCmd === "/aban"');
if (gbanIdx !== -1 && abanIdx !== -1) {
  const oldGbanStr = code.substring(gbanIdx, abanIdx);
  const newGbanStr = `if (rawCmd === "/gban" || rawCmd === "/гбан") {
          if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const termStr = duration ? duration.text : "Навсегда";

          await updateUser(parsed.targetId, { role: 0, chatRoles: {}, gban: true, gbanBy: userId, gbanReason: reason, gbanDate: Date.now(), gbanExpiresAt: expiresAt });

          const allChats = await getAllChats();
          for (const c of allChats) {
             if (c.id && c.id > 2000000000 && c.type !== "PL") {
                try {
                  const remRes = await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                  if (remRes.data && remRes.data.response === 1) {
                    await sendVkMessage(VK_TOKEN, c.id, \`[id\${parsed.targetId}|пользователю] выдана глобальная блокировка во всех беседах по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`);
                  }
                } catch(e) {}
             }
          }

          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять глобальную блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_cleargban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана глобальная блокировка во всех беседах по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });
       }\n\n       `;
  code = code.replace(oldGbanStr, newGbanStr);
  console.log("Replaced /gban block");
}

// 12. Update /addblack and /unblack
const addblackIdx = code.indexOf('if (["/addblack", "/аддблэк"');
const welcomeIdx = code.indexOf('if (rawCmd === "/welcometext"');
if (addblackIdx !== -1 && welcomeIdx !== -1) {
  const oldBlackStr = code.substring(addblackIdx, welcomeIdx);
  const newBlackStr = `if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
          if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const termStr = duration ? duration.text : "Навсегда";
          
          const targetU = await getOrCreateUser(parsed.targetId);
          const targetName = targetU.fullName || targetU.nick || \`id\${parsed.targetId}\`;

          await updateUser(parsed.targetId, { blacklisted: true, blackBy: userId, blackReason: reason, blackDate: Date.now(), blackExpiresAt: expiresAt });

          const buttons: any[] = [
            [{ action: { type: "callback", label: "Снять чёрный список", payload: JSON.stringify({ cmd: "mod_unblack", targetId: parsed.targetId }) }, color: "positive" }]
          ];
          if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearblack", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]);
          }
          const keyboard = { inline: true, buttons };

          return await sendResponse(\`[id\${parsed.targetId}|\${targetName}] занесён в чёрный список чат-менеджера по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${expiresAt ? fmtD(expiresAt) : "Навсегда"}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });
       }

       if (["/unblack", "/анблэк", "/анчс", "/изчс", "/удалитьизчс", "/унчсб", "/unb", "/изчсб"].includes(rawCmd)) {
          if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          
          await updateUser(parsed.targetId, { blacklisted: false });
          return await sendResponse(\`[id\${parsed.targetId}|пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
       }\n\n       `;
  code = code.replace(oldBlackStr, newBlackStr);
  console.log("Replaced /addblack & /unblack block");
}

// 13. Update /giveowner command
const giveownerIdx = code.indexOf('if (rawCmd === "/giveowner") {');
const adminCmdsIdx = code.indexOf('// ADMIN COMMANDS (Role >= 12');
if (giveownerIdx !== -1 && adminCmdsIdx !== -1) {
  const oldGiveownerStr = code.substring(giveownerIdx, adminCmdsIdx);
  const newGiveownerStr = `if (rawCmd === "/giveowner") {
          if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Да, передать", payload: JSON.stringify({ cmd: "mod_giveowner_yes", targetId: parsed.targetId }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Нет, не передавать", payload: JSON.stringify({ cmd: "mod_giveowner_no", targetId: parsed.targetId }) }, color: "negative" }]
            ]
          };
          return await sendResponse(\`Вы действительно хотите передать уровень прав «Владелец Беседы» [id\${parsed.targetId}|пользователю]?\`, { keyboard: JSON.stringify(keyboard), isReply: true });
       }\n\n       `;
  code = code.replace(oldGiveownerStr, newGiveownerStr);
  console.log("Replaced /giveowner block");
}

fs.writeFileSync("server.ts", code);
