const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix /zunban
const zunbanOld = `        // /zunban: Remove all chat bans for user in all chats (Руководитель+, role >= 10)
        if (rawCmd === "/zunban" || rawCmd === "/зунбан") {
           const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
           if (effRole < 10 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");

           const parsed = await parseTargetUser(message, args.slice(1));
           if (!parsed.targetId) return await sendResponse(\`Для выполнения команды, укажите аргументы.\\n\\n| Пример: \${rawCmd} [ссылка/упоминание]\`);

           const targetU = await getOrCreateUser(parsed.targetId);
           const oldBansCount = Object.keys(targetU.chatBans || {}).length;
           await updateUser(parsed.targetId, { chatBans: {} });

           await logBotAction({
              type: "ban",
              peerId,
              userId,
              targetId: parsed.targetId,
              text: \`\${formatUserMention(userId, String(fullName), "nom")} снял(-а) все блокировки в беседах (\${oldBansCount}) \${formatUserMention(parsed.targetId, "пользователю", "dat")}\`
           });
           return await sendResponse(\`\${formatUserMention(userId, String(fullName), "nom")} снял(-а) \${oldBansCount} блокировок(-ки) \${formatUserMention(parsed.targetId, "пользователю", "dat")}\`, { noReply: true });
        }`;

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

if (code.includes(zunbanOld)) {
    code = code.replace(zunbanOld, zunbanNew);
} else {
    console.log("zunbanOld not found precisely");
}

// Fix /gban
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

if (gbanRegex.test(code)) {
    code = code.replace(gbanRegex, gbanNew);
} else {
    console.log("gbanRegex not found");
}

// Fix /olist
const olistOld = `        // /olist
        if (["/olist", "/онлайн", "/олист", "/онлайнлист", "/online", "/onlinelist"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
          const { profiles } = await getChatMembers(peerId);
          const onlineMembers: any[] = [];
          for (const p of profiles) {
            if (p.id > 0 && p.online) {
              onlineMembers.push(p);
            }
          }
          if (onlineMembers.length === 0) return await sendResponse("В данный момент нет участников онлайн.");
          let out = \`🌐 Участники онлайн (Всего: \${onlineMembers.length}):\\n\\n\`;
          onlineMembers.forEach((p, idx) => {
            const dev = p.online_mobile ? "📱 Mobile" : (p.online_app ? "📲 App" : "💻 PC");
            out += \`\${idx + 1}. [id\${p.id}|\${p.first_name} \${p.last_name}] — \${dev}\\n\`;
          });
          const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Оффлайн", payload: JSON.stringify({ cmd: "view_offlinelist" }) }, color: "secondary" }]
            ]
          };
          return await sendResponse(out, { noReply: true, keyboard: JSON.stringify(keyboard) });
        }`;

const olistNew = `        // /olist
        if (["/olist", "/онлайн", "/олист", "/онлайнлист", "/online", "/onlinelist"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
          const { profiles } = await getChatMembers(peerId);
          const onlineMembers: any[] = [];
          for (const p of profiles) {
            if (p.id > 0 && p.online) {
              onlineMembers.push(p);
            }
          }
          if (onlineMembers.length === 0) return await sendResponse("В данный момент нет участников онлайн.");
          let out = \`🌐 Участники онлайн (Всего: \${onlineMembers.length}):\\n\\n\`;
          onlineMembers.forEach((p, idx) => {
            const dev = p.online_mobile ? "Mobile" : (p.online_app ? "App" : "PC");
            out += \`\${idx + 1}. [id\${p.id}|\${p.first_name} \${p.last_name}] - с (\${dev}).\\n\`;
          });
          const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Оффлайн", payload: JSON.stringify({ cmd: "view_offlinelist" }) }, color: "secondary" }]
            ]
          };
          return await sendResponse(out, { noReply: true, keyboard: JSON.stringify(keyboard) });
        }`;

if (code.includes(olistOld)) {
    code = code.replace(olistOld, olistNew);
} else {
    console.log("olistOld not found");
}

fs.writeFileSync('server.ts', code);
