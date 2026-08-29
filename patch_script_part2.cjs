const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// 1. Update /ban & /unban
const banStart = code.indexOf('if (["/ban", "/бан"');
const unbanEnd = code.indexOf('if (["/clear", "/очистить"');
if (banStart !== -1 && unbanEnd !== -1) {
  const oldBanBlock = code.substring(banStart, unbanEnd);
  const newBanBlock = `if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
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
  code = code.replace(oldBanBlock, newBanBlock);
  console.log("Updated /ban and /unban");
}

// 2. Update /gban
const gbanStart = code.indexOf('if (rawCmd === "/gban"');
const gbanEnd = code.indexOf('if (rawCmd === "/aban"');
if (gbanStart !== -1 && gbanEnd !== -1) {
  const oldGban = code.substring(gbanStart, gbanEnd);
  const newGban = `if (rawCmd === "/gban" || rawCmd === "/гбан") {
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
  code = code.replace(oldGban, newGban);
  console.log("Updated /gban");
}

// 3. Update /addblack and /unblack
const blackStart = code.indexOf('if (["/addblack", "/аддблэк"');
const blackEnd = code.indexOf('if (rawCmd === "/welcometext"');
if (blackStart !== -1 && blackEnd !== -1) {
  const oldBlack = code.substring(blackStart, blackEnd);
  const newBlack = `if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
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
  code = code.replace(oldBlack, newBlack);
  console.log("Updated /addblack and /unblack");
}

// 4. Update /giveowner
const giveownerStart = code.indexOf('if (rawCmd === "/giveowner") {');
const giveownerEnd = code.indexOf('// ADMIN COMMANDS (Role >= 12');
if (giveownerStart !== -1 && giveownerEnd !== -1) {
  const oldGiveowner = code.substring(giveownerStart, giveownerEnd);
  const newGiveowner = `if (rawCmd === "/giveowner") {
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
  code = code.replace(oldGiveowner, newGiveowner);
  console.log("Updated /giveowner");
}

// 5. Update /staff pluralization titles
const staffStart = code.indexOf('const text = `Список руководства беседы');
const staffEnd = code.indexOf('const keyboard = {');
if (staffStart !== -1 && staffEnd !== -1) {
  const oldStaffText = code.substring(staffStart, staffEnd);
  const newStaffText = `const cData = await getOrCreateChat(peerId);
          const customR = cData.customRoles || {};

          const ownerTitle = customR.owner || "Владелец беседы";
          const gaTitle = customR.ga || (byRole[6].length > 1 ? "Главные Администраторы" : "Главный Администратор");
          const zgaTitle = customR.zga || (byRole[5].length > 1 ? "Зам. Глав. Администраторов" : "Зам. Глав. Администратора");
          const sadminTitle = customR.sadmin || (byRole[4].length > 1 ? "Старшие Администраторы" : "Старший Администратор");
          const adminTitle = customR.admin || (byRole[3].length > 1 ? "Администраторы" : "Администратор");
          const smoderTitle = customR.smoder || (byRole[2].length > 1 ? "Старшие Модераторы" : "Старший Модератор");
          const moderTitle = customR.moder || (byRole[1].length > 1 ? "Модераторы" : "Модератор");

          const text = \`Список руководства беседы\\n\\n| \${ownerTitle}:\\n\${fmtList(byRole[7])}\\n\\n| \${gaTitle}:\\n\${fmtList(byRole[6])}\\n\\n| \${zgaTitle}:\\n\${fmtList(byRole[5])}\\n\\n| \${sadminTitle}:\\n\${fmtList(byRole[4])}\\n\\n| \${adminTitle}:\\n\${fmtList(byRole[3])}\\n\\n| \${smoderTitle}:\\n\${fmtList(byRole[2])}\\n\\n| \${moderTitle}:\\n\${fmtList(byRole[1])}\`;\n\n          `;
  code = code.replace(oldStaffText, newStaffText);
  console.log("Updated /staff pluralization!");
}

// 6. Update user leave event handler with buttons
const leaveMsgOld = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] покинул(-а) беседу\`);`;
const leaveMsgNew = `const leaveKeyboard = {
              inline: true,
              buttons: [
                [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "leave_kick", targetId: memberId }) }, color: "negative" }],
                [{ action: { type: "callback", label: "Снять роль", payload: JSON.stringify({ cmd: "leave_removerole", targetId: memberId }) }, color: "secondary" }]
              ]
            };
            await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(leaveKeyboard) });`;
if (code.includes(leaveMsgOld)) {
  code = code.replace(leaveMsgOld, leaveMsgNew);
  console.log("Updated user leave event!");
}

fs.writeFileSync("server.ts", code);
