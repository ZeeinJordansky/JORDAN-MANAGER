const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Zunban Confirmation
const zunbanRegex = /\/\/ \/zunban: Remove all chat bans[\s\S]*?if \(rawCmd === "\/zunban" \|\| rawCmd === "\/зунбан"\) \{[\s\S]*?return await sendResponse\(`\$\{formatUserMention\(userId, String\(fullName\), "nom"\)\} снял\(-а\) \$\{oldBansCount\} блокировок\(-ки\) \$\{formatUserMention\(parsed\.targetId, "пользователю", "dat"\)\}`, \{ noReply: true \}\);\s*\}/;
const zunbanNew = `        // /zunban: Remove all chat bans for user in all chats (Руководитель+, role >= 10)
        if (rawCmd === "/zunban" || rawCmd === "/зунбан") {
           const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
           if (effRole < 10 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
 
           const parsed = await parseTargetUser(message, args.slice(1));
           if (!parsed.targetId) return await sendResponse(\`Для выполнения команды, укажите аргументы.\\n\\n| Пример: \${rawCmd} [ссылка/упоминание]\`);
 
           const kb = {
             inline: true,
             buttons: [
               [{ action: { type: "callback", label: "Да, снять", payload: JSON.stringify({ cmd: "confirm_zunban", targetId: parsed.targetId, authorId: userId }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет, не снимать", payload: JSON.stringify({ cmd: "cancel_zunban", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
             ]
           };
           return await sendResponse("Вы действительно хотите снять все блокировки пользователю?", { keyboard: JSON.stringify(kb) });
        }`;
code = code.replace(zunbanRegex, zunbanNew);

// 2. Gban Confirmation
const gbanRegex = /if \(rawCmd === "\/gban" \|\| rawCmd === "\/гбан"\) \{[\s\S]*?return await sendVkMessage\(VK_TOKEN, peerId, kickText, \{ keyboard: JSON\.stringify\(keyboard\), reply_to: message\.conversation_message_id \|\| message\.id \}\);[\s\S]*?\}/;
const gbanNew = `if (rawCmd === "/gban" || rawCmd === "/гбан") {
           if (user.role < 7 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
           const parsed = await parseTargetUser(message, args.slice(1));
           if (!parsed.targetId) return await sendResponse(\`Для выполнения команды, укажите аргументы.\\n\\n| Пример: \${rawCmd} [ссылка/упоминание] [срок] [причина]\`);
           
           const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
           
           const kb = {
             inline: true,
             buttons: [
               [{ action: { type: "callback", label: "Да, заблокировать", payload: JSON.stringify({ cmd: "confirm_gban", targetId: parsed.targetId, authorId: userId, args: remainingArgs }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет, не блокировать", payload: JSON.stringify({ cmd: "cancel_gban", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
             ]
           };
           return await sendResponse("Вы действительно хотите заблокировать пользователя во всех беседах?", { keyboard: JSON.stringify(kb) });
      }`;
code = code.replace(gbanRegex, gbanNew);

// 3. Olist Format
const olistOld = /onlineMembers\.forEach\(\(p, idx\) => \{[\s\S]*?const dev = p\.online_mobile \? "📱 Mobile" : \(p\.online_app \? "📲 App" : "💻 PC"\);[\s\S]*?out \+= `\$\{idx \+ 1\}\. \[id\$\{p\.id\}\|\$\{p\.first_name\} \$\{p\.last_name\}\] — \$\{dev\}\\n`;[\s\S]*?\}\);/;
const olistNew = `onlineMembers.forEach((p, idx) => {
            const dev = p.online_mobile ? "Mobile" : (p.online_app ? "App" : "PC");
            out += \`\${idx + 1}. [id\${p.id}|\${p.first_name} \${p.last_name}] - с (\${dev}).\\n\`;
          });`;
code = code.replace(olistOld, olistNew);

// 4. Callback Handlers
const callbackInsertPoint = 'if (cmd === "join_kick") {';
const callbackHandlers = `    if (cmd === "confirm_zunban") {
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
       }
       const targetId = Number(payloadObj.targetId);
       const targetU = await getOrCreateUser(targetId);
       const oldBansCount = Object.keys(targetU.chatBans || {}).length;
       await updateUser(targetId, { chatBans: {} });

       const u = await getOrCreateUser(userId);
       const modName = u.fullName || u.nick || "Модератор";
       const targetName = targetU.fullName || targetU.nick || "Пользователь";

       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, \`\${formatUserMention(targetId, String(targetName), "nom")} сняты все блокировки в беседах.\\n\\n| Кол-во блокировок снято: \${oldBansCount}\\n| Модератор, который снял блокировки - \${formatUserMention(userId, String(modName), "nom")}\`);
       return;
    }

    if (cmd === "cancel_zunban") {
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
       }
       const targetId = Number(payloadObj.targetId);
       const targetU = await getOrCreateUser(targetId);
       const targetName = targetU.fullName || targetU.nick || "Пользователь";

       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, \`Хорошо, вы отменили снятие всех блокировок \${formatUserMention(targetId, String(targetName), "dat")}\`);
       return;
    }

    if (cmd === "confirm_gban") {
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
       }
       const targetId = Number(payloadObj.targetId);
       const remainingArgs = payloadObj.args || [];
       const { reason, duration } = extractReasonAndDuration(remainingArgs);
       const expiresAt = duration ? duration.until : 0;

       await updateUser(targetId, { role: 0, chatRoles: {}, gban: true, gbanBy: userId, gbanReason: reason, gbanDate: Date.now(), gbanExpiresAt: expiresAt });

       try {
         await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, user_id: targetId, member_id: targetId } });
       } catch(e) {}

       const targetU = await getOrCreateUser(targetId);
       let targetFullName = targetU.fullName || targetU.nick || \`User\${targetId}\`;
       const targetMention = formatUserMention(targetId, String(targetFullName), "nom");
       const finalReason = reason || "Не указана";
       const kickText = \`\${targetMention} был исключён так как он(-а) занесён в глобальную блокировку во всех беседах по причине: \${finalReason}\\n\\n| Дата блокировки: \${formatAmPmDate(Date.now())}\\n| Дата разблокировки: \${formatAmPmDate(expiresAt)}\`;

       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, kickText);

       (async () => {
         const allChats = chatCache.size > 0 ? Array.from(chatCache.values()) : await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000 && c.id !== peerId) {
               try {
                 await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, user_id: targetId, member_id: targetId } });
               } catch (e) {}
            }
         }
       })();
       return;
    }

    if (cmd === "cancel_gban") {
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
       }
       const targetId = Number(payloadObj.targetId);
       const targetU = await getOrCreateUser(targetId);
       const targetName = targetU.fullName || targetU.nick || "Пользователь";

       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, \`Вы отменили выдачу глобальной блокировки \${formatUserMention(targetId, String(targetName), "dat")}\`);
       return;
    }

`;
code = code.replace(callbackInsertPoint, callbackHandlers + callbackInsertPoint);

fs.writeFileSync('server.ts', code);
