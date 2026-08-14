const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      // ==========================================
      // ADMIN COMMANDS (Role >= 12 Special Leader)
      // ==========================================
      const denyAdmin = async () => sendResponse("Недостаточно прав!");`;

const modCmdsStr = `
      // ==========================================
      // MODERATION COMMANDS (Role >= 1)
      // ==========================================
      if (rawCmd === "/mute") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const timeMin = parseInt(args[2]) || 30;
        const reason = args.slice(3).join(" ") || "без причины";
        
        await updateUser(parsed.targetId, { muteUntil: Date.now() + timeMin * 60 * 1000, muteReason: reason });
        
        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
          ]
        };
        return await sendResponse(\`[id\${userId}|Модератор] выдал(-а) блокировку чата [id\${parsed.targetId}|пользователю] на \${timeMin} мин\\n\\n| Причина: \${reason}\\n| Блокировка чата до: \${new Date(Date.now() + timeMin * 60 * 1000).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}\`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/unmute") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { muteUntil: 0 });
        return await sendResponse(\`[id\${userId}|Модератор] снял(-а) блокировку чата с [id\${parsed.targetId}|пользователя]\`);
      }

      if (rawCmd === "/warn") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const reason = args.slice(2).join(" ") || "без причины";
        
        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = (targetU.warnings || 0) + 1;
        await updateUser(parsed.targetId, { warnings: newWarns });
        
        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
          ]
        };
        
        let msg = \`[id\${userId}|Модератор] выдал(-а) предупреждение [id\${parsed.targetId}|пользователю]\\n\\n| Причина: \${reason}\\n| Предупреждений: \${newWarns}/3\`;
        
        if (newWarns >= 3) {
           msg += \`\\n\\nДостигнуто 3/3 предупреждений. Пользователь будет исключён.\`;
           await updateUser(parsed.targetId, { warnings: 0 });
           try {
             await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
           } catch (e) {}
        }
        
        return await sendResponse(msg, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/unwarn") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = Math.max(0, (targetU.warnings || 0) - 1);
        await updateUser(parsed.targetId, { warnings: newWarns });
        return await sendResponse(\`[id\${userId}|Модератор] снял(-а) предупреждение с [id\${parsed.targetId}|пользователя]\`);
      }

      if (rawCmd === "/snick") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const nick = args.slice(2).join(" ");
        if (!nick) return await sendResponse("Укажите ник!");
        await updateUser(parsed.targetId, { nickname: nick });
        return await sendResponse(\`[id\${userId}|Модератор] установил(-а) ник [id\${parsed.targetId}|пользователю]\\n\\n| Установленный ник: \${nick}\`);
      }

      if (rawCmd === "/rnick") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { nickname: null });
        return await sendResponse(\`[id\${userId}|Модератор] удалил(-а) ник [id\${parsed.targetId}|пользователю]\`);
      }
      
      if (rawCmd === "/gnick") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const targetU = await getOrCreateUser(parsed.targetId);
        const nick = targetU.nickname || "отсутствует";
        return await sendResponse(\`Ник пользователя [id\${parsed.targetId}|пользователя]: \${nick}\`);
      }
      
      // Promotion commands
      const handlePromotion = async (reqRole, giveRole, roleName) => {
         if (user.role < reqRole && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: giveRole });
         return await sendResponse(\`[id\${userId}|\${fullName}] выдал(-а) уровень прав «\${roleName}» [id\${parsed.targetId}|пользователю]\`);
      }
      
      if (rawCmd === "/addmoder" || rawCmd === "/модер" || rawCmd === "/выдатьмодера" || rawCmd === "/setmoder") return await handlePromotion(2, 1, "Модератор");
      if (rawCmd === "/addsenmoder" || rawCmd === "/смодер" || rawCmd === "/setsenmoder" || rawCmd === "/setsmoder" || rawCmd === "/старшиймодератор") return await handlePromotion(3, 2, "Старший модератор");
      if (rawCmd === "/addadmin" || rawCmd === "/админ" || rawCmd === "/setadmin") return await handlePromotion(4, 3, "Администратор");
      if (rawCmd === "/addsenadmin" || rawCmd === "/садмин" || rawCmd === "/setsenadmin") return await handlePromotion(5, 4, "Старший администратор");
      if (rawCmd === "/addsa" || rawCmd === "/са" || rawCmd === "/sa" || rawCmd === "/setsa") return await handlePromotion(12, 5, "Специальный администратор"); // Usually owner sets this
      
      if (rawCmd === "/giveowner") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Передать", payload: JSON.stringify({ cmd: "mod_giveowner_yes", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Не передавать", payload: JSON.stringify({ cmd: "mod_giveowner_no", targetId: parsed.targetId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(\`Вы действительно хотите передать права владельца беседы [id\${parsed.targetId}|пользователю]?\\n\\n| Для подтверждения нажмите на кнопку:\`, { keyboard: JSON.stringify(keyboard) });
      }

` + anchor;

code = code.replace(anchor, modCmdsStr);
fs.writeFileSync('server.ts', code);
console.log("Mod cmds added");
