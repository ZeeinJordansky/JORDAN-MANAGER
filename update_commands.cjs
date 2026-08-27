const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Helper to replace with safety checks
function safeReplace(originalPattern, replacement, name) {
  if (code.match(originalPattern)) {
    code = code.replace(originalPattern, replacement);
    console.log(`[SUCCESS] Replaced: ${name}`);
  } else {
    console.error(`[ERROR] Pattern not found for: ${name}`);
  }
}

// 1. /mute
safeReplace(
  /if\s*\(\["\/mute",\s*"\/мут",\s*"\/заглушить",\s*"\/замутить",\s*"\/мутить",\s*"\/датьмут",\s*"\/m"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] получил\(-а\) блокировку чата на \$\{timeMin\} мин\.[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
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
         const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;
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

// 2. /warn
safeReplace(
  /if\s*\(\["\/warn",\s*"\/варн",\s*"\/предупреждение",\s*"\/датьварн",\s*"\/пред",\s*"\/выдатьварн",\s*"\/w"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] получил\(-а\) предупреждение \(\$\{newWarns\}\/3\)[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
  `if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

        const reason = (message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ")) || "Нарушение правил";
        const targetU = await getOrCreateUser(parsed.targetId);
        const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;
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

// 3. /kick
safeReplace(
  /if\s*\(\["\/kick",\s*"\/кик",\s*"\/исключить",\s*"\/выгнать",\s*"\/к",\s*"\/k"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] был\(-а\) исключён\(-а\) из беседы[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
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

// 4. /ban
safeReplace(
  /if\s*\(\["\/ban",\s*"\/бан",\s*"\/забанить",\s*"\/б",\s*"\/b"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] получил\(-а\) блокировку в беседе[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
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
         const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;
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

// 5. /unmute, /unwarn, /unban
safeReplace(
  /if\s*\(\["\/unmute",\s*"\/размут",\s*"\/анмут",\s*"\/снятьмут",\s*"\/разглушить",\s*"\/размутить",\s*"\/измута",\s*"\/unm"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{userId\}\|\$\{fullName\}\] снял\(-а\) блокировку чата с \[id\$\{parsed\.targetId\}\|\$\{tName\}\]`\);\s*\}/,
  `if (["/unmute", "/размут", "/анмут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
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

safeReplace(
  /if\s*\(\["\/unwarn",\s*"\/разварн",\s*"\/снятьварн",\s*"\/снятьпред",\s*"\/анварн",\s*"\/анпред",\s*"\/unw"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{userId\}\|\$\{fullName\}\] снял\(-а\) предупреждение с \[id\$\{parsed\.targetId\}\|\$\{tName\}\]`\);\s*\}/,
  `if (["/unwarn", "/разварн", "/снятьварн", "/снятьпред", "/анварн", "/анпред", "/unw"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const targetU = await getOrCreateUser(parsed.targetId);
         const newW = Math.max(0, (targetU.warnings || 0) - 1);
         const activeList = (targetU.activeWarningsList || []).slice(0, newW);
         await updateUser(parsed.targetId, { warnings: newW, activeWarningsList: activeList });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/unwarn"
);

safeReplace(
  /if\s*\(\["\/unban",\s*"\/разбан",\s*"\/разбанить",\s*"\/анбан",\s*"\/снятьбан",\s*"\/unb"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{userId\}\|\$\{fullName\}\] снял\(-а\) блокировку с \[id\$\{parsed\.targetId\}\|\$\{tName\}\]`\);\s*\}/,
  `if (["/unban", "/разбан", "/разбанить", "/анбан", "/снятьбан", "/unb"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         delete chatBans[peerId];
         delete chatBans[String(peerId)];
         await updateUser(parsed.targetId, { chatBans, isGameBanned: false });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/unban"
);

// 6. /gban & /addblack
safeReplace(
  /if\s*\(\["\/gban",\s*"\/гбан",\s*"\/глобалбан",\s*"\/глобальныйбан"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] получил\(-а\) глобальную блокировку[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
  `if (["/gban", "/гбан", "/глобалбан", "/глобальныйбан"].includes(rawCmd)) {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");

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

safeReplace(
  /if\s*\(\["\/addblack",\s*"\/аддблэк",\s*"\/чс",\s*"\/вчс"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{tName\}\] занесён в чёрный список[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
  `if (["/addblack", "/аддблэк", "/чс", "/вчс"].includes(rawCmd)) {
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

// 7. /giveowner
safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/giveowner"\)\s*\{[\s\S]*?return\s*await\s*sendResponse\(`Вы\s*действительно\s*хотите\s*передать\s*права[\s\S]*?\}\s*catch\s*\(e\)\s*\{\s*\}\s*\}/,
  `if (rawCmd === "/giveowner") {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const isAdminMember = await checkIsAdmin(userId, peerId, user.role);
         if (!isOwner && !isAdminMember && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете передать права самому себе!");

         const keyboard = {
           inline: true,
           buttons: [
             [
               { action: { type: "callback", label: "Да, передать", payload: JSON.stringify({ cmd: "giveowner_confirm", targetId: parsed.targetId, authorId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Нет, не передавать", payload: JSON.stringify({ cmd: "giveowner_cancel", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }
             ]
           ]
         };
         return await sendResponse(\`Вы действительно хотите передать уровень прав «Владелец Беседы» [id\${parsed.targetId}|пользователю]?\`, { keyboard: JSON.stringify(keyboard) });
      }`,
  "/giveowner"
);

// 8. /olist & /offlinelist
safeReplace(
  /if\s*\(\["\/olist",\s*"\/олист",\s*"\/онлайнлист"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return\s*await\s*sendResponse\(`Список участников онлайн[\s\S]*?\}\s*if\s*\(\["\/offlinelist"/,
  `if (["/olist", "/олист", "/онлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = (profiles || []).filter((p: any) => p.id > 0 && (p.online === 1 || p.online_mobile === 1));
         if (onlineList.length === 0) return await sendResponse("Список участников онлайн в беседе пуст.");

         const page = 1;
         const pageSize = 25;
         const totalPages = Math.ceil(onlineList.length / pageSize);
         const pageItems = onlineList.slice(0, pageSize);
         const list = pageItems.map((p: any) => \`[id\${p.id}|\${p.first_name} \${p.last_name}] - \${getDeviceName(p)}\`).join("\\n");
         const text = \`Список пользователей которые в сети:\\n\\n\${list}\`;

         const btnRow: any[] = [];
         btnRow.push({ action: { type: "callback", label: "Оффлайн", payload: JSON.stringify({ cmd: "offlinelist_page", p: 1, authorId: userId }) }, color: "secondary" });
         if (totalPages > 1) {
           btnRow.push({ action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "olist_page", p: 2, authorId: userId }) }, color: "primary" });
         }
         const keyboard = { inline: true, buttons: [btnRow] };
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }
      if (["/offlinelist"`
);

safeReplace(
  /if\s*\(\["\/offlinelist",\s*"\/оффлайнлист",\s*"\/офлайнлист"\]\.includes\(rawCmd\)\)\s*\{[\s\S]*?return\s*await\s*sendResponse\(`Список участников оффлайн[\s\S]*?\}\s*if\s*\(\["\/online"/,
  `if (["/offlinelist", "/оффлайнлист", "/офлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const offlineList = (profiles || []).filter((p: any) => p.id > 0 && !p.online && !p.online_mobile);
         if (offlineList.length === 0) return await sendResponse("Список участников оффлайн в беседе пуст.");

         const page = 1;
         const pageSize = 25;
         const totalPages = Math.ceil(offlineList.length / pageSize);
         const pageItems = offlineList.slice(0, pageSize);
         const list = pageItems.map((p: any) => {
           const lastSeenMs = p.last_seen?.time ? p.last_seen.time * 1000 : 0;
           return \`[id\${p.id}|\${p.first_name} \${p.last_name}] - Был в сети: \${formatElapsedDetailed(lastSeenMs)}\`;
         }).join("\\n");
         const text = \`Список пользователей которые не в сети:\\n\\n\${list}\`;

         const btnRow: any[] = [];
         btnRow.push({ action: { type: "callback", label: "Онлайн", payload: JSON.stringify({ cmd: "olist_page", p: 1, authorId: userId }) }, color: "secondary" });
         if (totalPages > 1) {
           btnRow.push({ action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "offlinelist_page", p: 2, authorId: userId }) }, color: "primary" });
         }
         const keyboard = { inline: true, buttons: [btnRow] };
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }
      if (["/online"`
);

// 9. /addantiteg & /unantiteg
safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/addantiteg"\)\s*\{[\s\S]*?return\s*await\s*sendResponse\(`Слово\/тег[\s\S]*?\}\s*if\s*\(rawCmd\s*===\s*"\/unantiteg"\)/,
  `if (rawCmd === "/addantiteg") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6 && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (parsed.targetId) {
            const targetU = await getOrCreateUser(parsed.targetId);
            const antiTegUsers = targetU.antiTegImmune || {};
            antiTegUsers[peerId] = true;
            await updateUser(parsed.targetId, { antiTegImmune: antiTegUsers });
            return await sendResponse(\`[id\${parsed.targetId}|Пользователю] выдана функция «Анти-тег».\\n\\n| Выдал - [id\${userId}|\${fullName}]\`, { noReply: true });
         }
         const tag = args.slice(1).join(" ").trim().toLowerCase();
         if (!tag) return await sendResponse("Укажите пользователя или запрещенное слово/тег!");
         const chatData = await getOrCreateChat(peerId);
         const list = chatData.antiTegList || [];
         if (!list.includes(tag)) {
            list.push(tag);
            await updateChat(peerId, { antiTegList: list });
         }
         return await sendResponse(\`Слово/тег «\${tag}» успешно добавлено в фильтр анти-тега.\`);
      }
      if (rawCmd === "/unantiteg")`,
  "/addantiteg"
);

safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/unantiteg"\)\s*\{[\s\S]*?return\s*await\s*sendResponse\(`Слово\/тег[\s\S]*?\}\s*if\s*\(rawCmd\s*===\s*"\/antiteglist"\)/,
  `if (rawCmd === "/unantiteg") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6 && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (parsed.targetId) {
            const targetU = await getOrCreateUser(parsed.targetId);
            const antiTegUsers = targetU.antiTegImmune || {};
            delete antiTegUsers[peerId];
            delete antiTegUsers[String(peerId)];
            await updateUser(parsed.targetId, { antiTegImmune: antiTegUsers });
            return await sendResponse(\`у [id\${parsed.targetId}|пользователя] забрана функция «Анти-тег».\\n\\n| Забрал - [id\${userId}|\${fullName}]\`, { noReply: true });
         }
         const tag = args.slice(1).join(" ").trim().toLowerCase();
         if (!tag) return await sendResponse("Укажите пользователя или слово/тег для удаления!");
         const chatData = await getOrCreateChat(peerId);
         let list = chatData.antiTegList || [];
         list = list.filter((t: string) => t !== tag);
         await updateChat(peerId, { antiTegList: list });
         return await sendResponse(\`Слово/тег «\${tag}» успешно удалено из фильтра анти-тега.\`);
      }
      if (rawCmd === "/antiteglist")`,
  "/unantiteg"
);

// 10. /addaccesslevel, /заместитель, /озаместитель, /addruk
safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/заместитель"[\s\S]*?handlePromotion\(10,\s*8,\s*"Зам\.\s*Руководителя"\);/,
  `if (rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Заместитель Руководителя");`,
  "/заместитель"
);

safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/addozsr"[\s\S]*?handlePromotion\(10,\s*9,\s*"Осн\.\s*Зам\.\s*Руководителя"\);/,
  `if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Основной Заместитель Руководителя");`,
  "/озаместитель"
);

safeReplace(
  /if\s*\(rawCmd\s*===\s*"\/addruk"[\s\S]*?handlePromotion\(10\.5,\s*10,\s*"Руководитель"\);/,
  `if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");
      if (rawCmd === "/addaccesslevel" || rawCmd === "/выдатьуровень") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const levelName = (message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ")) || "Модератор";
         const targetU = await getOrCreateUser(parsed.targetId);
         const customRoles = targetU.customRoleNames || {};
         customRoles[peerId] = levelName;
         await updateUser(parsed.targetId, { customRoleNames: customRoles });
         return await sendResponse(\`[id\${parsed.targetId}|Пользователю] выдан уровень прав «\${levelName}»\\n\\n| Выдал - [id\${userId}|\${fullName}]\`, { noReply: true });
      }`,
  "/addaccesslevel"
);

// 11. Security triggers (Anti-flood, Anti-tegall, Anti-sliv)
safeReplace(
  /\[id\$\{userId\}\|\$\{uData\.nick\s*\|\|\s*"Пользователь"\}\]\s*получил\(-а\)\s*блокировку\s*чата\s*на\s*30\s*минут\s*из-за\s*флуда\./,
  `[id\${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.`,
  "Anti-flood notification"
);

safeReplace(
  /\[id\$\{userId\}\|\$\{tName\}\]\s*получил\(-а\)\s*предупреждение\s*за\s*тег\s*всех\./,
  `[id\${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.`,
  "Anti-tegall notification"
);

safeReplace(
  /const\s*slivMsg\s*=\s*\`\[id\$\{userId\}\|\$\{u\.nick\s*\|\|\s*"Пользователь"\}\]\s*был\(-а\)\s*снят\(-а\)\s*со\s*всех\s*должностей\s*из-за\s*подозрения\s*на\s*слив\.\`;/,
  `const slivMsg = \`У [id\${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.\`;`,
  "Anti-sliv notification"
);

// 12. /getban response format
safeReplace(
  /if\s*\(\s*rawCmd\s*===\s*"\/infobans"\s*\|\|\s*rawCmd\s*===\s*"\/getbans"\s*\|\|\s*rawCmd\s*===\s*"\/getban"[\s\S]*?return\s*await\s*sendResponse\(out\);\s*\}/,
  `if (rawCmd === "/infobans" || rawCmd === "/getbans" || rawCmd === "/getban" || rawCmd === "/инфобан" || rawCmd === "/гетбан" || rawCmd === "/гетбанс") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || \`User\${parsed.targetId}\`;

         let out = \`Информация о блокировках [id\${parsed.targetId}|\${targetName}]:\\n\\n\`;
         
         const fmtGetBanDate = (ms?: number) => {
           if (!ms || ms === 0) return "Никогда";
           return fmtD(ms);
         };

         if (targetU.gban || targetU.gbanpl) {
           const gBy = targetU.gbanBy || targetU.gbanplBy || 1;
           const gReason = targetU.gbanReason || targetU.gbanplReason || "ЧС";
           const gDate = targetU.gbanDate || targetU.gbanplDate || Date.now();
           const gExp = targetU.gbanExpiresAt || targetU.gbanplExpiresAt || 0;
           out += \`Глобальная блокировка во всех беседах:\\n\`;
           out += \`| Модератор - [id\${gBy}|Модератор]\\n\`;
           out += \`| Дата выдачи: \${fmtD(gDate)}\\n\`;
           out += \`| Дата окончания: \${fmtGetBanDate(gExp)}\\n\`;
           out += \`| Причина: \${gReason}\\n\\n\`;
         }

         const chatBans = targetU.chatBans || {};
         const chatBanEntries = Object.entries(chatBans);
         if (chatBanEntries.length > 0) {
           out += \`Блокировки в беседах:\\n\`;
           let idx = 1;
           for (const [cPeerId, banInfo] of chatBanEntries as any) {
             const cData = await getOrCreateChat(Number(cPeerId));
             const safeTitle = filterChatName(cData.title || \`Беседа \${cPeerId}\`);
             out += \`\${idx}) \${safeTitle}\\n\`;
             out += \`| Модератор - [id\${banInfo.by || 1}|Модератор]\\n\`;
             out += \`| Дата выдачи: \${fmtD(banInfo.date || Date.now())}\\n\`;
             out += \`| Дата окончания: \${fmtGetBanDate(banInfo.until)}\\n\`;
             out += \`| Причина: \${banInfo.reason || "Нарушение правил"}\\n\\n\`;
             idx++;
           }
         }

         if (!targetU.gban && !targetU.gbanpl && chatBanEntries.length === 0) {
           out += "Активные блокировки отсутствуют.";
         }

         return await sendResponse(out.trim(), { disable_mentions: 1 });
      }`,
  "/getban"
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Commands update complete. Code length:", code.length);
