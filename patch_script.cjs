const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// 1. Update /mute
const muteStart = code.indexOf('if (["/mute", "/мут"');
const muteEnd = code.indexOf('if (["/unmute", "/анмут"');
if (muteStart !== -1 && muteEnd !== -1) {
  const oldMute = code.substring(muteStart, muteEnd);
  const newMute = `if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {
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
  code = code.replace(oldMute, newMute);
  console.log("Updated /mute");
}

// 2. Update /unmute
const unmuteStart = code.indexOf('if (["/unmute", "/анмут"');
const unmuteEnd = code.indexOf('if (["/smute", "/смут"');
if (unmuteStart !== -1 && unmuteEnd !== -1) {
  const oldUnmute = code.substring(unmuteStart, unmuteEnd);
  const newUnmute = `if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
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
  code = code.replace(oldUnmute, newUnmute);
  console.log("Updated /unmute");
}

// 3. Update /warn & /unwarn
const warnStart = code.indexOf('if (["/warn", "/варн"');
const unwarnEnd = code.indexOf('if (rawCmd === "/snick"');
if (warnStart !== -1 && unwarnEnd !== -1) {
  const oldWarnBlock = code.substring(warnStart, unwarnEnd);
  const newWarnBlock = `if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
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
  code = code.replace(oldWarnBlock, newWarnBlock);
  console.log("Updated /warn and /unwarn");
}

// 4. Update /kick
const kickStart = code.indexOf('if (["/kick", "/кик"');
const idEnd = code.indexOf('if (rawCmd === "/id"');
if (kickStart !== -1 && idEnd !== -1) {
  const oldKick = code.substring(kickStart, idEnd);
  const newKick = `if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {
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
  code = code.replace(oldKick, newKick);
  console.log("Updated /kick");
}

fs.writeFileSync("server.ts", code);
