const fs = require('fs');
const esbuild = require('esbuild');

let code = fs.readFileSync('server.ts.clean_fixed', 'utf8');
let currentPos = 0;

function replaceExact(findStr, replaceStr, label) {
  const idx = code.indexOf(findStr, currentPos);
  if (idx === -1) {
    // Try from 0 as fallback
    const fallbackIdx = code.indexOf(findStr, 0);
    if (fallbackIdx === -1) {
      console.error(`[ERROR] Not found: ${label}`);
      process.exit(1);
    }
    code = code.substring(0, fallbackIdx) + replaceStr + code.substring(fallbackIdx + findStr.length);
    currentPos = fallbackIdx + replaceStr.length;
  } else {
    code = code.substring(0, idx) + replaceStr + code.substring(idx + findStr.length);
    currentPos = idx + replaceStr.length;
  }
  console.log(`[SUCCESS] Replaced: ${label}`);
}

function replaceRange(startStr, endStr, replaceStr, label) {
  let startIdx = code.indexOf(startStr, currentPos);
  if (startIdx === -1) {
    startIdx = code.indexOf(startStr, 0);
    if (startIdx === -1) {
      console.error(`[ERROR] Start not found: ${label}`);
      process.exit(1);
    }
  }
  const endIdx = code.indexOf(endStr, startIdx + startStr.length);
  if (endIdx === -1) {
    console.error(`[ERROR] End not found: ${label}`);
    process.exit(1);
  }
  code = code.substring(0, startIdx) + replaceStr + code.substring(endIdx);
  currentPos = startIdx + replaceStr.length;
  console.log(`[SUCCESS] Replaced Range: ${label}`);
}

// 1. Helpers before fmtD
const helpersToAdd = `const filterChatName = (title?: string): string => {
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

replaceExact("const fmtD =", helpersToAdd + "\nconst fmtD =", "Helpers before fmtD");

// 2. Stats
replaceRange(
  'const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number) => {',
  'const getStatsWarnsPage =',
  `const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || \`id\${targetId}\`;

  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};
  const todayMsgs = (chatLastMsgDateMap[currentPeerId] === currentMskStr)
    ? (chatTodayMsgsMap[currentPeerId] || 0)
    : 0;

  const chatNicks = targetUser.chatNicks || {};
  let nickStr = chatNicks[currentPeerId] || "отсутствует";
  let dispRole = await getRole(currentPeerId, targetId);
  let roleStr = getRoleDisplayName(dispRole);
  const hasGban = !!(targetUser.gban || targetUser.gbanpl);
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  const userStatus = targetUser.customStatus || targetUser.statusText;
  const warnsCount = targetUser.warnings || 0;
  const hasWarns = warnsCount > 0;
  const hasMute = !!(targetUser.muteUntil && targetUser.muteUntil > Date.now());

  let statsStr = \`Статистика [id\${targetId}|пользователя]\\n\\n\`;
  statsStr += \`| Nick_Name: \${nickStr}\\n\`;
  statsStr += \`| VK ID - \${targetId}\\n\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  if (userStatus) {
    statsStr += \`| Статус: \${userStatus}\\n\`;
  }
  statsStr += \`| Активная глобальная блокировка: \${hasGban ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активные блокировки в беседах: \${hasChatBans ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Активные предупреждения в беседе: \${hasWarns ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активная блокировка чата в беседе: \${hasMute ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений за сегодня: \${todayMsgs}\\n\`;
  statsStr += \`| Кол-во сообщений за всё время: \${targetUser.messagesCount || targetUser.messagesTotal || (targetUser.chatTotalMsgs?.[currentPeerId] || 0)}\\n\`;
  statsStr += \`| Последнее сообщение: \${fmtD(targetUser.lastMessageTime || targetUser.lastActivity || Date.now())}\`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };
  return { text: statsStr, keyboard };
};
`,
  "/stats"
);

// 3. chat_kick_user (user left)
replaceRange(
  'if (memberId === userId) {',
  'if (chatData.leaveKick) {',
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
           `,
  "chat_kick_user"
);

// 4. User join ban & gban notifications
replaceRange(
  'if (chatBans[peerId]) {',
  'if (chatData.welcometext_enabled && chatData.welcometext) {',
  `if (chatBans[peerId]) {
             const banInfo = chatBans[peerId];
             if (banInfo.expiresAt && Date.now() > banInfo.expiresAt) {
               delete chatBans[peerId];
               await updateUser(memberId, { chatBans });
             } else {
               const keyboard = {
                 inline: true,
                 buttons: [
                   [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: memberId }) }, color: "positive" }]
                 ]
               };
               await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${targetName}] заблокирован(-а) в этой беседе [id\${banInfo.by || 1}|модератором] по причине: \${banInfo.reason || "Нарушение правил"}\\n\\n| Блокировка до: \${fmtD(banInfo.until || banInfo.expiresAt)}\`, { keyboard: JSON.stringify(keyboard), noReply: true });
               try {
                 await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }

          if (uData.gban || uData.gbanpl) {
             const gReason = uData.gbanReason || uData.gbanplReason || "ЧС";
             const gExp = uData.gbanExpiresAt || uData.gbanplExpiresAt || 0;
             const keyboard = {
               inline: true,
               buttons: [
                 [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: memberId }) }, color: "positive" }]
               ]
             };
             await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${targetName}] занесён(-на) в глобальную блокировку во всех беседах по причине: \${gReason}\\n\\n| Блокировка до: \${fmtD(gExp)}\`, { keyboard: JSON.stringify(keyboard), noReply: true });
             try {
               await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
          `,
  "join ban & gban checks"
);

// 5. Bot added to chat greeting
replaceRange(
  'const greeting = `JORDAN MANAGER был добавлен в беседу.',
  'const u = await getOrCreateUser(userId);',
  `const greeting = \`JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.\`;
          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_bot_chat", authorId: userId }) }, color: "positive" }
              ]
            ]
          };
          `,
  "bot greeting"
);

replaceExact(
  'await sendVkMessage(VK_TOKEN, peerId, greeting);',
  'await sendVkMessage(VK_TOKEN, peerId, greeting, { keyboard: JSON.stringify(keyboard) });',
  "bot greeting send"
);

// 6. Callbacks
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

replaceExact(
  'if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {',
  newCallbacksBlock + '\n        if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {',
  "newCallbacksBlock"
);

// 7. /getban
replaceRange(
  'if (rawCmd === "/infobans" || rawCmd === "/getbans" || rawCmd === "/getban" || rawCmd === "/инфобан" || rawCmd === "/гетбан" || rawCmd === "/гетбанс") {',
  'if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {',
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
      }
      `,
  "/getban"
);

// 8. /mute
replaceRange(
  'if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {',
  'if (["/unmute", "/анмут", "/унмут", "/размут"',
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
      }
      `,
  "/mute"
);

// 9. /unmute
replaceRange(
  'if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {',
  'if (["/smute", "/смут"].includes(rawCmd))',
  `if (["/unmute", "/анмут", "/унмут", "/размут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
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
      }
      `,
  "/unmute"
);

// 10. /warn (with sequential pointer tracking currentPos is at ~476000, so it finds the command handler!)
replaceRange(
  'if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {',
  'if (["/unwarn", "/анварн", "/снятьварн"',
  `if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

        const reason = (message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ")) || "Нарушение правил";
        const targetU = await getOrCreateUser(parsed.targetId);
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
      }
      `,
  "/warn"
);

// 11. /unwarn
replaceRange(
  'if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {',
  'if (rawCmd === "/snick" || rawCmd === "/сник")',
  `if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        const targetU = await getOrCreateUser(parsed.targetId);
        const newW = Math.max(0, (targetU.warnings || 0) - 1);
        const activeList = (targetU.activeWarningsList || []).slice(0, newW);
        await updateUser(parsed.targetId, { warnings: newW, activeWarningsList: activeList });
        return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }
      `,
  "/unwarn"
);

// 12. /заместитель, /озаместитель, /addruk, /addaccesslevel
replaceRange(
  'if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Зам. Руководителя");',
  'if (rawCmd === "/addgr" || rawCmd === "/главруководитель"',
  `if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Заместитель Руководителя");
      if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Основной Заместитель Руководителя");
      if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");
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
      }
      `,
  "roles and access level"
);

// 13. /kick
replaceRange(
  'if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {',
  'if (rawCmd === "/id" || rawCmd === "/айди" || rawCmd === "/ид")',
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
      }
      `,
  "/kick"
);

// 14. /gban
replaceRange(
  'if (rawCmd === "/gban" || rawCmd === "/гбан") {',
  'if (rawCmd === "/aban" || rawCmd === "/абан")',
  `if (rawCmd === "/gban" || rawCmd === "/гбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

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
      }
      `,
  "/gban"
);

// 15. /ban
replaceRange(
  'if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {',
  'if (["/unban", "/разбан", "/унбан", "/разбанить"',
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
      }
      `,
  "/ban"
);

// 16. /unban
replaceRange(
  'if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {',
  'if (["/sban", "/сбан"].includes(rawCmd))',
  `if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         delete chatBans[peerId];
         delete chatBans[String(peerId)];
         await updateUser(parsed.targetId, { chatBans, isGameBanned: false });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });
      }
      `,
  "/unban"
);

// 17. /addantiteg & /unantiteg
replaceRange(
  'if (rawCmd === "/addantiteg") {',
  'if (rawCmd === "/antiteglist")',
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
      if (rawCmd === "/unantiteg") {
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
      `,
  "/addantiteg and /unantiteg"
);

// 18. /olist & /offlinelist
replaceRange(
  'if (["/olist", "/олист", "/онлайнлист"].includes(rawCmd)) {',
  'if (rawCmd === "/infoid")',
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
      if (["/offlinelist", "/оффлайнлист", "/офлайнлист"].includes(rawCmd)) {
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
      `,
  "/olist and /offlinelist"
);

// 19. /addblack
replaceRange(
  'if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {',
  'if (["/unblack", "/анблэк", "/анчс"',
  `if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
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
      }
      `,
  "/addblack"
);

// 20. /giveowner
replaceRange(
  'if (rawCmd === "/giveowner") {',
  '// ==========================================\n      // ADMIN COMMANDS',
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
      }
      `,
  "/giveowner"
);

// 21. Security triggers (Anti-flood, Anti-tegall, Anti-sliv)
code = code.replace(
  /\[id\$\{userId\}\|\$\{uData\.nick\s*\|\|\s*"Пользователь"\}\]\s*получил\(-а\)\s*блокировку\s*чата\s*на\s*30\s*минут\s*из-за\s*флуда\./g,
  `[id\${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.`
);

code = code.replace(
  /\[id\$\{userId\}\|\$\{tName\}\]\s*получил\(-а\)\s*предупреждение\s*за\s*тег\s*всех\./g,
  `[id\${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.`
);

code = code.replace(
  /const\s*slivMsg\s*=\s*\`\[id\$\{userId\}\|\$\{u\.nick\s*\|\|\s*"Пользователь"\}\]\s*был\(-а\)\s*снят\(-а\)\s*со\s*всех\s*должностей\s*из-за\s*подозрения\s*на\s*слив\.\`;/g,
  `const slivMsg = \`У [id\${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.\`;`
);

fs.writeFileSync('server.ts', code, 'utf8');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'ts' });
  console.log("\n==========================================");
  console.log("ESBUILD VALIDATION PASSED 100% SUCCESSFULLY!");
  console.log("==========================================");
} catch (e) {
  console.error("\nESBUILD VALIDATION FAILED:", e.message);
  process.exit(1);
}
