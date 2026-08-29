const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// ==========================================
// 1. Fix DM sendVkMessage reply issue & allowedInDm check
// ==========================================
code = code.replace(
  `if (targetPeerId === peerId && cmId && !finalExtra.forward && !finalExtra.reply_to) {`,
  `if (targetPeerId === peerId && cmId && !finalExtra.forward && !finalExtra.reply_to && !finalExtra.noReply) {`
);

// Update sendVkMessage inside message_event to delete finalExtra.noReply if present
code = code.replace(
  `return await rawSendVkMessage(token, targetPeerId, text, finalExtra);`,
  `if (finalExtra.noReply) delete finalExtra.noReply;\n      return await rawSendVkMessage(token, targetPeerId, text, finalExtra);`
);

// Update /заявка aliases in allowedInDm
code = code.replace(
  `"/игровые", "/игры", "/гхелп", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот", "/заявка"`,
  `"/игровые", "/игры", "/гхелп", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот", "/заявка", "/податьзаявку", "/заявки", "/apply", "/заявканапост", "/анкета"`
);

// Fix apply_cancel, apply_start, apply_submit calls to pass { noReply: true }
code = code.replace(
  `await sendVkMessage(VK_TOKEN, peerId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.");`,
  `await sendVkMessage(VK_TOKEN, peerId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.", { noReply: true });`
);

code = code.replace(
  `await sendVkMessage(VK_TOKEN, peerId, "Отлично, тогда мы зададим вам пару вопросов.\\n\\nСколько вам лет?");`,
  `await sendVkMessage(VK_TOKEN, peerId, "Отлично, тогда мы зададим вам пару вопросов.\\n\\nСколько вам лет?", { noReply: true });`
);

code = code.replace(
  `await sendVkMessage(VK_TOKEN, peerId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.");`,
  `await sendVkMessage(VK_TOKEN, peerId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.", { noReply: true });`
);

// ==========================================
// 2. Fix /addblack to target blacklisted instead of gban
// ==========================================
const oldAddblackCode = `await updateUser(parsed.targetId, {
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
         };`;

const newAddblackCode = `await updateUser(parsed.targetId, {
            blacklisted: true,
            blackReason: reason,
            blackBy: userId,
            blackDate: Date.now(),
            blackExpiresAt: expiresAt
         });

         const buttonsRow1 = [{ action: { type: "callback", label: "Снять чёрный список", payload: JSON.stringify({ cmd: "mod_unblack", targetId: parsed.targetId }) }, color: "positive" }];
         const buttons: any[] = [buttonsRow1];
         if (message.reply_message) {
            buttons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "purge_user_msgs", targetId: parsed.targetId, targetCmId: message.reply_message.conversation_message_id, authorId: userId }) }, color: "negative" }]);
         }
         const keyboard = { inline: true, buttons };`;

if (code.includes('gbanReason: reason,')) {
  code = code.replace(oldAddblackCode, newAddblackCode);
}

// ==========================================
// 3. Add "Очистить сообщения" button helper to /mute, /ban, /gban, /warn
// ==========================================
// Update /mute keyboard when reply_message exists
code = code.replace(
  `[{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }]`,
  `[{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
             ...(message.reply_message ? [[{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "purge_user_msgs", targetId: parsed.targetId, targetCmId: message.reply_message.conversation_message_id, authorId: userId }) }, color: "negative" }]] : [])`
);

// Update /warn keyboard when reply_message exists
code = code.replace(
  `[{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }]`,
  `[{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
             ...(message.reply_message ? [[{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "purge_user_msgs", targetId: parsed.targetId, targetCmId: message.reply_message.conversation_message_id, authorId: userId }) }, color: "negative" }]] : [])`
);

// Update /ban keyboard when reply_message exists
code = code.replace(
  `[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }]`,
  `[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }],
             ...(message.reply_message ? [[{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "purge_user_msgs", targetId: parsed.targetId, targetCmId: message.reply_message.conversation_message_id, authorId: userId }) }, color: "negative" }]] : [])`
);

// Update /gban keyboard when reply_message exists
code = code.replace(
  `[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]`,
  `[{ action: { type: "callback", label: "Снять глобальную блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }],
             ...(message.reply_message ? [[{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "purge_user_msgs", targetId: parsed.targetId, targetCmId: message.reply_message.conversation_message_id, authorId: userId }) }, color: "negative" }]] : [])`
);

// ==========================================
// 4. Update callback response texts to exact prompt specifications
// ==========================================

// mod_unmute
const oldUnmuteCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${modName}] снял(-а) блокировку чата с [id\${tId}|\${tName}]\`);`;
const newUnmuteCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята блокировка чата.\\n\\n| Модератор, который снял блокировку чата - [id\${userId}|\${modName}]\`, { noReply: true });`;
code = code.replace(oldUnmuteCode, newUnmuteCode);

// mod_unwarn
const oldUnwarnCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${modName}] снял(-а) предупреждение с [id\${tId}|\${tName}]\`);`;
const newUnwarnCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] было снято предупреждение.\\n\\n| Модератор, который снял предупреждение - [id\${userId}|\${modName}]\`, { noReply: true });`;
code = code.replace(oldUnwarnCode, newUnwarnCode);

// mod_unban_chat
const oldUnbanChatCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName}] снял(-а) блокировку с [id\${tId}|пользователя]\`);`;
const newUnbanChatCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята блокировка.\\n\\n| Модератор, который снял блокировку - [id\${userId}|\${modName}]\`, { noReply: true });`;
code = code.replace(oldUnbanChatCode, newUnbanChatCode);

// mod_unblack
const oldUnblackCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор, который снял чёрный список - [id\${userId}|\${modName}]\`, { reply_to: cmId });`;
const newUnblackCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор, который снял чёрный список - [id\${userId}|\${modName}]\`, { noReply: true });`;
code = code.replace(oldUnblackCode, newUnblackCode);

// mod_ungban & mod_ungbanpl
const oldUngbanCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName}] снял(-а) глобальную блокировку с [id\${tId}|пользователя] во всех беседах\`);`;
const newUngbanCode = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${tId}|пользователю] была снята глобальная блокировка.\\n\\n| Модератор, который снял блокировку - [id\${userId}|\${modName}]\`, { noReply: true });`;
code = code.replace(oldUngbanCode, newUngbanCode);

// purge_user_msgs / mod_clear_messages
if (!code.includes('if (cmd === "purge_user_msgs"')) {
  const purgeHandler = `
       if (cmd === "purge_user_msgs") {
          const tId = Number(payloadObj.targetId || 0);
          const targetCmId = Number(payloadObj.targetCmId || 0);
          const clickingUser = await getOrCreateUser(userId);
          const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || \`User\${userId}\`;
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Сообщения очищаются..." });
          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          await deleteMessagesForUser(peerId, tId, 15, cmId, targetCmId);
          await sendVkMessage(VK_TOKEN, peerId, \`Сообщения от [id\${tId}|пользователя] были очищены.\\n\\n| Модератор, который очистил сообщения - [id\${userId}|\${modName}]\`, { noReply: true });
          return;
       }
`;
  code = code.replace('if (cmd === "mod_unmute") {', purgeHandler + '\n       if (cmd === "mod_unmute") {');
}

// ==========================================
// 5. Update /giveowner & giveowner callbacks
// ==========================================
const oldGiveownerConfirmCode = `const replyMsg = \`[id\${userId}|\${fullName}] передал(-а) уровень прав «Владелец Беседы» [id\${tId}|пользователю]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
            });

            // Send private message to target user
            try {
              await sendVkMessage(VK_TOKEN, tId, \`Вам были передан уровень прав «Владелец Беседы» в беседе \${chatTitle} [id\${userId}|\${fullName}]\`);
            } catch (e) {}`;

const newGiveownerConfirmCode = `const tU = await getOrCreateUser(tId);
            const tName = tU.fullName || tU.nick || (await fetchVkFullName(tId)) || \`User\${tId}\`;
            const replyMsg = \`[id\${tId}|\${tName}] становится новым владельцем беседы.\\n\\n| Бывший владелец беседы - [id\${userId}|\${fullName}]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, { noReply: true });

            try {
              await sendVkMessage(VK_TOKEN, tId, \`Вам были передан уровень прав «Владелец Беседы» в беседе (\${chatTitle}) [id\${userId}|\${fullName}]\`);
            } catch (e) {}`;

code = code.replace(oldGiveownerConfirmCode, newGiveownerConfirmCode);

const oldGiveownerCancelCode = `const replyMsg = \`[id\${userId}|\${fullName}] отменил(-а) передачу уровня прав «Владелец Беседы» [id\${tId}|пользователю]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
            });`;

const newGiveownerCancelCode = `const replyMsg = \`[id\${userId}|\${fullName}] отменил(-а) передачу уровня прав «Владелец Беседы» [id\${tId}|пользователю]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, { noReply: true });`;

code = code.replace(oldGiveownerCancelCode, newGiveownerCancelCode);

// ==========================================
// 6. User Leave Chat message and callbacks
// ==========================================
code = code.replace(
  `{ action: { type: "callback", label: "Исключить", payload: JSON.stringify({ cmd: "mod_kick_left", targetId: memberId, authorId: userId }) }, color: "secondary" },`,
  `{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_left", targetId: memberId, authorId: userId }) }, color: "negative" },`
);

code = code.replace(
  `{ action: { type: "callback", label: "Забрать роль", payload: JSON.stringify({ cmd: "mod_strip_role", targetId: memberId, authorId: userId }) }, color: "secondary" }`,
  `{ action: { type: "callback", label: "Снять роль", payload: JSON.stringify({ cmd: "mod_strip_role", targetId: memberId, authorId: userId }) }, color: "secondary" }`
);

const oldModKickLeftMsg = `const replyMsg = \`[id\${userId}|\${modName}] исключил(-а) [id\${tId}|пользователя] из беседы.\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
            });`;

const newModKickLeftMsg = `const tUser = await getOrCreateUser(tId);
            const tName = tUser.fullName || tUser.nick || (await fetchVkFullName(tId)) || \`User\${tId}\`;
            const replyMsg = \`[id\${tId}|\${tName}] был исключён из беседы.\\n\\n| Модератор, который исключил - [id\${userId}|\${modName}]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, { noReply: true });`;

code = code.replace(oldModKickLeftMsg, newModKickLeftMsg);

const oldModStripRoleMsg = `const replyMsg = \`[id\${userId}|\${modName}] забрал(-а) роль у [id\${tId}|пользователя].\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
            });`;

const newModStripRoleMsg = `const replyMsg = \`У [id\${tId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id\${userId}|\${modName}]\`;
            await sendVkMessage(VK_TOKEN, peerId, replyMsg, { noReply: true });`;

code = code.replace(oldModStripRoleMsg, newModStripRoleMsg);

// ==========================================
// 7. Auto Unmute Message format
// ==========================================
code = code.replace(
  `await sendVkMessage(VK_TOKEN, u.mutePeerId, \`[id\${u.id}|\${fullName}] блокировка чата была автоматически снята.\`);`,
  `await sendVkMessage(VK_TOKEN, u.mutePeerId, \`Блокировка чата у [id\${u.id}|пользователя] была закончена и автоматически снята.\`, { noReply: true });`
);

code = code.replace(
  `await sendVkMessage(VK_TOKEN, u.mutePeerId, \`Блокировка чата у [id\${u.id}|пользователя] была автоматически снята.\`);`,
  `await sendVkMessage(VK_TOKEN, u.mutePeerId, \`Блокировка чата у [id\${u.id}|пользователя] была закончена и автоматически снята.\`, { noReply: true });`
);

// ==========================================
// 8. Management Chat Restriction Enforcement
// ==========================================
if (!code.includes('const MGMT_ONLY_COMMANDS = new Set([')) {
  const mgmtCheckCode = `
       const MGMT_ONLY_COMMANDS = new Set([
         "/gban", "/ungban", "/gbanlist", "/blacklist", "/rstats", "/grrole", "/banid",
         "/unbanid", "/infochat", "/infoid", "/addblack", "/unblack", "/gsnick", "/grnick",
         "/zunban", "/addzsr", "/addozsr", "/rebuke", "/unrebuke", "/addruk", "/addgr",
         "/гбан", "/унгбан", "/чсботам", "/анчс", "/гсник", "/грник"
       ]);

       if (MGMT_ONLY_COMMANDS.has(rawCmd)) {
          const chatDataObj = await getOrCreateChat(peerId);
          if (!chatDataObj.isAdminChat && peerId !== 2000000010) {
             return await sendResponse("Данная команда доступна только в беседе руководства!");
          }
       }
`;
  code = code.replace('if (peerId < 2000000000) {', mgmtCheckCode + '\n       if (peerId < 2000000000) {');
}

// ==========================================
// 9. Renameroles full logic & Callbacks
// ==========================================
if (!code.includes('if (cmd === "renameroles_set_prompt")')) {
  const renamerolesCallbacks = `
       if (cmd === "renameroles_set_prompt") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Установка ролей" });
          const text = \`Чтобы установить новые названия ролей, отправьте команду в таком формате:\\n\\n/renameroles\\n\\n| Владелец беседы:\\n- {owner}\\n\\n| Главный Администратор:\\n- {ga}\\n\\n| Зам. Глав. Администратора:\\n- {zga}\\n\\n| Старший Администратор:\\n- {sadmin}\\n\\n| Администратор:\\n- {admin}\\n\\n| Старший Модератор:\\n- {smoder}\\n\\n| Модератор:\\n- {moder}\`;
          return await sendVkMessage(VK_TOKEN, peerId, text, { noReply: true });
       }
       if (cmd === "renameroles_del_confirm") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Подтверждение" });
          const keyboard = {
             inline: true,
             buttons: [
                [
                   { action: { type: "callback", label: "Да", payload: JSON.stringify({ cmd: "renameroles_del_yes" }) }, color: "positive" },
                   { action: { type: "callback", label: "Нет", payload: JSON.stringify({ cmd: "renameroles_del_no" }) }, color: "negative" }
                ]
             ]
          };
          return await sendVkMessage(VK_TOKEN, peerId, "Вы действительно хотите удалить установленные названия ролей?", { keyboard: JSON.stringify(keyboard), noReply: true });
       }
       if (cmd === "renameroles_del_yes") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Удалено" });
          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          await updateChat(peerId, { customRoleNames: {} });
          return await sendVkMessage(VK_TOKEN, peerId, "Установленные названия ролей были успешно удалены!", { noReply: true });
       }
       if (cmd === "renameroles_del_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Отменено" });
          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return await sendVkMessage(VK_TOKEN, peerId, "Удаление названий ролей отменено.", { noReply: true });
       }
`;
  code = code.replace('if (cmd === "apply_cancel") {', renamerolesCallbacks + '\n       if (cmd === "apply_cancel") {');
}

// ==========================================
// 10. Add /alt command
// ==========================================
if (!code.includes('if (rawCmd === "/alt"')) {
  const altCmdCode = `
       if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы") {
          const text = \`...::Альтернативные команды (Алиасы):...\\n\\n| Основные команды:\\n/help - /помощь, /хелп, /команды, /меню\\n/stats - /стата, /статистика\\n/infobot - /инфобот, /инфо\\n\\n| Модерация:\\n/mute - /мут, /заглушить, /заблокироватьчат\\n/unmute - /анмут, /размут, /снятьмут\\n/warn - /варн, /предупреждение\\n/unwarn - /анварн, /разварн, /снятьварн\\n/kick - /кик, /исключить\\n/ban - /бан, /заблокировать\\n/unban - /анбан, /разбан, /снятьбан\\n/addaccesslevel - /роль, /addlevel, /setlevel, /setaccesslevel, /addaccess, /выдатьроль\\n/removerole - /снятьроль, /снятьправа, /delrole, /unrole\\n\\n| Глобальная модерация:\\n/gban - /гбан, /глобальныйбан\\n/ungban - /унгбан, /разгбан\\n/addblack - /вчс, /чс, /чсб, /добавитьвчс\\n/unblack - /анчс, /изчс, /удалитьизчс\\n\\n| Настройки и управление:\\n/start - /активировать, /старт, /включитьбота\\n/renameroles - /изменитьроли\\n/заявка - /податьзаявку, /заявки, /apply, /анкета\\n/х2 - /x2\`;
          return await sendResponse(text);
       }
`;
  code = code.replace(
    'if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {',
    altCmdCode + '\n       if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {'
  );
}

// ==========================================
// 11. Automatic X2 timer and /х2 command
// ==========================================
if (!code.includes('let x2ModeActive = false;')) {
  const x2TimerCode = `
let x2ModeActive = false;

function checkAutoX2() {
  const now = new Date();
  const mskTime = new Date(now.getTime() + (3 * 3600 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
  const day = mskTime.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
  const isWeekendX2 = (day === 5 || day === 6 || day === 0);

  if (isWeekendX2 && !x2ModeActive) {
    x2ModeActive = true;
    rawSendVkMessage(VK_TOKEN, 2000000015, "Х2 режим был включён до понедельника!").catch(() => {});
  } else if (!isWeekendX2 && x2ModeActive) {
    x2ModeActive = false;
    rawSendVkMessage(VK_TOKEN, 2000000015, "Х2 режим был отключён до пятницы.").catch(() => {});
  }
}

const initialMsk = new Date(Date.now() + (3 * 3600 * 1000) + (new Date().getTimezoneOffset() * 60 * 1000));
const initialDay = initialMsk.getDay();
x2ModeActive = (initialDay === 5 || initialDay === 6 || initialDay === 0);
setInterval(checkAutoX2, 60000);
`;
  code = x2TimerCode + '\n' + code;
}

if (!code.includes('if (rawCmd === "/х2"')) {
  const x2CmdCode = `
       if (rawCmd === "/х2" || rawCmd === "/x2") {
          if (user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          x2ModeActive = !x2ModeActive;
          if (x2ModeActive) {
             return await sendResponse("Х2 режим был включён до понедельника!");
          } else {
             return await sendResponse("Х2 режим был отключён до пятницы.");
          }
       }
`;
  code = code.replace(
    'if (rawCmd === "/giveowner") {',
    x2CmdCode + '\n       if (rawCmd === "/giveowner") {'
  );
}

fs.writeFileSync('server.ts', code);
console.log('patch_final.cjs applied successfully.');
