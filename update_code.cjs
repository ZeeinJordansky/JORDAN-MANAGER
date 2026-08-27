const fs = require('fs');
const esbuild = require('esbuild');

let code = fs.readFileSync('server.ts.clean_fixed', 'utf8');

console.log("Original clean code length:", code.length);

// 1. Helpers
const helpersToAdd = `
const filterChatName = (title?: string): string => {
  if (!title) return "Беседа";
  try {
    if (typeof containsBadWord === "function" && containsBadWord(title)) {
      return "####";
    }
  } catch (e) {}
  return title;
};

const formatElapsedDetailed = (lastSeenMs?: number): string => {
  if (!lastSeenMs || lastSeenMs === 0) return "давно";
  const diffSec = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  
  const parts: string[] = [];
  if (days > 0) parts.push(\`\${days} д.\`);
  if (days > 0 || hours > 0) parts.push(\`\${hours} ч.\`);
  if (days > 0 || hours > 0 || minutes > 0) parts.push(\`\${minutes} мин.\`);
  parts.push(\`\${seconds} сек. назад\`);
  return parts.join(" ");
};

const getDeviceName = (p: any): string => {
  const platform = p?.last_seen?.platform || p?.online_info?.platform;
  if (platform === 2) return "iPhone";
  if (platform === 3) return "iPad";
  if (platform === 4) return "Android";
  if (platform === 7) return "Компьютер";
  if (platform === 1) return "Мобильный браузер";
  if (platform === 6) return "Windows";
  if (p?.online_mobile) return "Телефон";
  if (p?.online) return "Компьютер";
  return "Устройство";
};
`;

if (!code.includes("formatElapsedDetailed")) {
  code = code.replace("const fmtD =", helpersToAdd + "\nconst fmtD =");
}

// 2. Event chat_kick_user (when user left the conversation)
// Replace: [id${memberId}|${memberName}] покинул(-а) беседу
code = code.replace(
  /if\s*\(memberId\s*===\s*userId\)\s*\{\s*const uData = await getOrCreateUser\(memberId\);[\s\S]*?if\s*\(chatData\.leaveKick\)/,
  `if (memberId === userId) {
           const uData = await getOrCreateUser(memberId);
           const memberName = uData.fullName || uData.nick || \`User\${memberId}\`;
           const keyboard = {
             inline: true,
             buttons: [
               [
                 { action: { type: "callback", label: "Исключить", payload: JSON.stringify({ cmd: "mod_kick_left", targetId: memberId, authorId: userId }) }, color: "secondary" },
                 { action: { type: "callback", label: "Забрать роль", payload: JSON.stringify({ cmd: "mod_strip_role", targetId: memberId, authorId: userId }) }, color: "secondary" }
               ]
             ]
           };
           await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(keyboard) });
           if (chatData.leaveKick)`
);

// 3. When bot is added to conversation
code = code.replace(
  /const greeting = \`JORDAN MANAGER был добавлен в беседу\.[\s\S]*?await sendVkMessage\(VK_TOKEN, peerId, greeting\);/,
  `const greeting = \`JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.\`;
          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_bot_chat", authorId: userId }) }, color: "positive" }
              ]
            ]
          };
          const u = await getOrCreateUser(userId);
          const fullName = u.fullName || u.nick || \`User\${userId}\`;
          const logMsg = \`Бот был добавлен в новую беседу.\\n\\n| Добавил: [id\${userId}|\${fullName}]\\n| ID Беседы: \${peerId}\`;
          sendVkMessage(VK_TOKEN, 2000000010, logMsg).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, greeting, { keyboard: JSON.stringify(keyboard) });`
);

// 4. In callbacks handling:
// Add mod_kick_left, mod_strip_role, mod_kick_action, giveowner_confirm, giveowner_cancel, activate_bot_chat, olist_page, offlinelist_page
const newCallbacksBlock = `
        if (cmd === "activate_bot_chat") {
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Беседа активирована!" });
           await updateChat(peerId, { isActive: true, isActivated: true, active: true });
           const u = await getOrCreateUser(userId);
           const fullName = u.fullName || u.nick || (await fetchVkFullName(userId)) || \`User\${userId}\`;
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           const replyText = \`[id\${userId}|\${fullName}] активировал(-а) чат-менеджера в беседе.\\n\\nТеперь выберите тип беседы по команде - /type.\\n\\nТакже синхронизируйте беседу с помощью команды - /sync.\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyText, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });
           return;
        }

        if (cmd === "mod_kick_left") {
           const tId = Number(payloadObj.targetId || 0);
           const u = await getOrCreateUser(userId);
           const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
           const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
           const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
           if (effectiveRole < 1 && !isAdminMember) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас недостаточно прав!" });
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Пользователь исключён." });
           try {
             await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: tId }
             });
           } catch (e) {}
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           const modName = u.fullName || u.nick || (await fetchVkFullName(userId)) || "Модератор";
           const replyMsg = \`[id\${userId}|\${modName}] исключил(-а) [id\${tId}|пользователя] из беседы.\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });
           return;
        }

        if (cmd === "mod_strip_role") {
           const tId = Number(payloadObj.targetId || 0);
           const u = await getOrCreateUser(userId);
           const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
           const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
           const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
           if (effectiveRole < 1 && !isAdminMember) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас недостаточно прав!" });
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Роль забрана." });
           const targetU = await getOrCreateUser(tId);
           const targetChatRoles = targetU.chatRoles || {};
           delete targetChatRoles[peerId];
           delete targetChatRoles[String(peerId)];
           await updateUser(tId, { role: 0, chatRoles: targetChatRoles });
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           const modName = u.fullName || u.nick || (await fetchVkFullName(userId)) || "Модератор";
           const replyMsg = \`[id\${userId}|\${modName}] забрал(-а) уровень прав у [id\${tId}|пользователя]\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });
           return;
        }

        if (cmd === "mod_kick_action") {
           const tId = Number(payloadObj.targetId || 0);
           const actReason = payloadObj.reason || "Нарушение правил";
           const u = await getOrCreateUser(userId);
           const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
           const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
           const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
           if (effectiveRole < 1 && !isAdminMember) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас недостаточно прав!" });
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Пользователь исключён из беседы." });
           try {
             await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: tId }
             });
           } catch (e) {}
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           const targetU = await getOrCreateUser(tId);
           const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(tId)) || \`User\${tId}\`;
           const modName = u.fullName || u.nick || (await fetchVkFullName(userId)) || "Модератор";
           const replyMsg = \`[id\${tId}|\${tName}] был(-а) исключён из беседы по причине: \${actReason}\\n\\n| Модератор - [id\${userId}|\${modName}]\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });
           return;
        }

        if (cmd === "giveowner_confirm") {
           const tId = Number(payloadObj.targetId || 0);
           const u = await getOrCreateUser(userId);
           const isOwner = await checkIsOwner(userId, peerId, u.role);
           const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
           if (!isOwner && !isAdminMember && u.role < 12) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Только владелец беседы может подтвердить передачу прав!" });
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Права переданы." });
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           
           const targetU = await getOrCreateUser(tId);
           const tChatRoles = targetU.chatRoles || {};
           tChatRoles[peerId] = 7;
           await updateUser(tId, { chatRoles: tChatRoles });

           const userChatRoles = u.chatRoles || {};
           delete userChatRoles[peerId];
           await updateUser(userId, { chatRoles: userChatRoles });

           const chatDataObj = await getOrCreateChat(peerId);
           chatDataObj.ownerId = tId;
           chatDataObj.adminId = tId;
           await updateChat(peerId, { ownerId: tId, adminId: tId });

           const fullName = u.fullName || u.nick || (await fetchVkFullName(userId)) || \`User\${userId}\`;
           const targetName = targetU.fullName || targetU.nick || (await fetchVkFullName(tId)) || \`User\${tId}\`;
           const chatTitle = chatDataObj.title || "Беседа";

           const replyMsg = \`[id\${userId}|\${fullName}] передал(-а) уровень прав «Владелец Беседы» [id\${tId}|пользователю]\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });

           // Send private message to target user
           try {
             await sendVkMessage(VK_TOKEN, tId, \`Вам были передан уровень прав «Владелец Беседы» в беседе \${chatTitle} [id\${userId}|\${fullName}]\`);
           } catch (e) {}
           return;
        }

        if (cmd === "giveowner_cancel") {
           const tId = Number(payloadObj.targetId || 0);
           const u = await getOrCreateUser(userId);
           const fullName = u.fullName || u.nick || (await fetchVkFullName(userId)) || \`User\${userId}\`;
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Передача прав отменена." });
           await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           const replyMsg = \`[id\${userId}|\${fullName}] отменил(-а) передачу уровня прав «Владелец Беседы» [id\${tId}|пользователю]\`;
           await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
           });
           return;
        }

        if (cmd === "olist_page") {
           const page = Number(payloadObj.p || 1);
           const { profiles } = await getChatMembers(peerId);
           const onlineList = (profiles || []).filter((p: any) => p.id > 0 && (p.online === 1 || p.online_mobile === 1));
           if (onlineList.length === 0) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Список онлайн пуст" });
              return;
           }
           const pageSize = 25;
           const totalPages = Math.ceil(onlineList.length / pageSize);
           const startIdx = (page - 1) * pageSize;
           const pageItems = onlineList.slice(startIdx, startIdx + pageSize);
           const list = pageItems.map((p: any) => \`[id\${p.id}|\${p.first_name} \${p.last_name}] - \${getDeviceName(p)}\`).join("\\n");
           const text = \`Список пользователей которые в сети:\\n\\n\${list}\`;

           const btnRow: any[] = [];
           if (page > 1) {
             btnRow.push({ action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "olist_page", p: page - 1, authorId: payloadObj.authorId }) }, color: "primary" });
           }
           btnRow.push({ action: { type: "callback", label: "Оффлайн", payload: JSON.stringify({ cmd: "offlinelist_page", p: 1, authorId: payloadObj.authorId }) }, color: "secondary" });
           if (page < totalPages) {
             btnRow.push({ action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "olist_page", p: page + 1, authorId: payloadObj.authorId }) }, color: "primary" });
           }
           const keyboard = { inline: true, buttons: [btnRow] };
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: \`Страница \${page}/\${totalPages}\` });
           await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
           return;
        }

        if (cmd === "offlinelist_page") {
           const page = Number(payloadObj.p || 1);
           const { profiles } = await getChatMembers(peerId);
           const offlineList = (profiles || []).filter((p: any) => p.id > 0 && !p.online && !p.online_mobile);
           if (offlineList.length === 0) {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Список оффлайн пуст" });
              return;
           }
           const pageSize = 25;
           const totalPages = Math.ceil(offlineList.length / pageSize);
           const startIdx = (page - 1) * pageSize;
           const pageItems = offlineList.slice(startIdx, startIdx + pageSize);
           const list = pageItems.map((p: any) => {
             const lastSeenMs = p.last_seen?.time ? p.last_seen.time * 1000 : 0;
             return \`[id\${p.id}|\${p.first_name} \${p.last_name}] - Был в сети: \${formatElapsedDetailed(lastSeenMs)}\`;
           }).join("\\n");
           const text = \`Список пользователей которые не в сети:\\n\\n\${list}\`;

           const btnRow: any[] = [];
           if (page > 1) {
             btnRow.push({ action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "offlinelist_page", p: page - 1, authorId: payloadObj.authorId }) }, color: "primary" });
           }
           btnRow.push({ action: { type: "callback", label: "Онлайн", payload: JSON.stringify({ cmd: "olist_page", p: 1, authorId: payloadObj.authorId }) }, color: "secondary" });
           if (page < totalPages) {
             btnRow.push({ action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "offlinelist_page", p: page + 1, authorId: payloadObj.authorId }) }, color: "primary" });
           }
           const keyboard = { inline: true, buttons: [btnRow] };
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: \`Страница \${page}/\${totalPages}\` });
           await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
           return;
        }
`;

code = code.replace(
  'if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {',
  newCallbacksBlock + '\n        if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {'
);

fs.writeFileSync("server.ts", code, "utf8");
console.log("Callbacks updated");
