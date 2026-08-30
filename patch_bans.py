
import re

with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Update /gban response
old_gban = '''      if (rawCmd === "/gban" || rawCmd === "/гбан") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const durationStr = duration ? duration.text : "Навсегда";
          const expDate = expiresAt > 0 ? formatMskDateAmPm(expiresAt) : "Никогда";
          await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
          });
          await logToChat10({
            isGame: false,
            action: `Выдал глобальную блокировку пользователю [id${parsed.targetId}|пользователю]`,
            cmdName: rawCmd,
            userId,
            fullName,
            targetId: parsed.targetId,
            reason: reason !== "None" ? reason : undefined,
            duration: durationStr !== "None" ? durationStr : undefined
          });
          return await sendResponse(`[id${parsed.targetId}|Пользователю] выдана глобальная блокировка во всех беседах по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка до: ${expDate}`, { noReply: true });
       }'''

new_gban = '''      if (rawCmd === "/gban" || rawCmd === "/гбан") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const durationStr = duration ? duration.text : "Навсегда";
          await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
          });
          await logToChat10({
            isGame: false,
            action: `Выдал глобальную блокировку пользователю [id${parsed.targetId}|пользователю]`,
            cmdName: rawCmd,
            userId,
            fullName,
            targetId: parsed.targetId,
            reason: reason !== "None" ? reason : undefined,
            duration: durationStr !== "None" ? durationStr : undefined
          });
          await sendBanAlert(peerId, parsed.targetId, "gban", reason, Date.now(), expiresAt);
          return;
       }'''

content = content.replace(old_gban, new_gban)

# 2. Update /gbanpl
old_gbanpl = '''      if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const durationStr = duration ? duration.text : "Навсегда";
          const expDate = expiresAt > 0 ? formatMskDateAmPm(expiresAt) : "Никогда";
          await updateUser(parsed.targetId, {
            gbanpl: true,
            gbanplReason: reason,
            gbanplBy: userId,
            gbanplDate: Date.now(),
            gbanplExpiresAt: expiresAt
          });
          return await sendResponse(`[id${parsed.targetId}|Пользователю] выдана глобальная блокировка во всех беседах по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка до: ${expDate}`, { noReply: true });
       }'''

new_gbanpl = '''      if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          await updateUser(parsed.targetId, {
            gbanpl: true,
            gbanplReason: reason,
            gbanplBy: userId,
            gbanplDate: Date.now(),
            gbanplExpiresAt: expiresAt
          });
          await sendBanAlert(peerId, parsed.targetId, "gbanpl", reason, Date.now(), expiresAt);
          return;
       }'''

content = content.replace(old_gbanpl, new_gbanpl)

# 3. Update /ban
old_ban = '''      if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
         } catch (e) {}
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Разблокировать", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`[id${userId}|Модератор] заблокировал(-а) [id${parsed.targetId}|пользователя] в текущей беседе\n\n| Причина: ${reason}\n| Срок: ${termStr}`, { keyboard: JSON.stringify(keyboard) });
      }'''

new_ban = '''      if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
         if (effRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна Старшему модератору.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
                  const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
         await updateUser(parsed.targetId, { chatBans });
         try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
         } catch (e) {}
         await sendBanAlert(peerId, parsed.targetId, "ban", reason, Date.now(), expiresAt);
         return;
      }'''

content = content.replace(old_ban, new_ban)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
