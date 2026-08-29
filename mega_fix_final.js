import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix "unmute" type
code = code.replace(/type: "unmute"/g, 'type: "mute"');

// 2. Add applyStates
if (!code.includes('const applyStates =')) {
    code = code.replace('dotenv.config();', 'dotenv.config();\nconst applyStates = new Map<number, { step: number; answers: string[]; lastCmId?: number }>();');
}

// 3. Add /addowner and /заявка
const addCmds = `
      if (rawCmd === "/addowner" || rawCmd === "/аддвладелец") {
         if (user.role < 13 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 12 });
         return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] назначен на пост Второстепенного владельца!\`);
      }

      if (["/заявка", "/податьзаявку", "/заявки", "/apply", "/заявканапост", "/анкета"].includes(rawCmd)) {
         if (peerId > 2000000000) return await sendResponse("Данная команда доступна только в ЛС бота!");
         
         const keyboard = {
           inline: true,
           buttons: [
             [
               { action: { type: "callback", label: "Да, хочу", payload: JSON.stringify({ cmd: "apply_start", authorId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Нет, не хочу", payload: JSON.stringify({ cmd: "apply_cancel", authorId: userId }) }, color: "negative" }
             ]
           ]
         };

         return await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName.split(' ')[0]}], приветствуем!\\n\\nВы хотите подать заявку на пост заместителя руководителя?\`, {
           keyboard: JSON.stringify(keyboard)
         });
      }
`;

const insertionPoint = 'if (["/start", "/старт", "/активировать", "/активация", "/включитьбота", "/activate", "/начать"].includes(rawCmd)) {';
code = code.replace(insertionPoint, addCmds + "\n      " + insertionPoint);

// 4. applyMsgHandler
const rawCmdDef = 'const rawCmd = args[0].toLowerCase();';
const applyMsgHandler = `
      if (peerId < 2000000000 && applyStates.has(userId)) {
        const state = applyStates.get(userId)!;
        if (!rawCmd.startsWith("/")) {
          state.answers.push(cmdText.trim());
          if (state.lastCmId) {
            deleteVkMessage(VK_TOKEN, peerId, state.lastCmId).catch(() => {});
          }
          state.step++;
          const APPLY_QUESTIONS = [
            "Сколько вам лет?",
            "Укажите вашу электронную почту",
            "Укажите ваш Telegram",
            "Какой у вас часовой пояс (от МСК)?",
            "Расскажите, почему вы хотите попасть на пост Заместителя руководителя?",
            "Что вы будете делать на посте Заместителя руководителя?",
            "Почему мы должны взять на пост именно вас?",
            "Есть ли у вас опыт в этой сфере?",
            "Готовы ли вы получить ЧСБ/ЧСР за слив своего поста?",
            "Сколько вы готовы уделять время нашему чат-менеджеру?",
            "Укажите ваш ежедневный онлайн в ВКонтакте",
            "Готовы ли вы слушаться высшее руководство?"
          ];
          const replyExtra = {
            forward: JSON.stringify({
              peer_id: peerId,
              conversation_message_ids: [message.conversation_message_id],
              is_reply: true
            })
          };
          if (state.step <= 12) {
            const prefixes = ["", "Хорошо, теперь следующий вопрос\\n\\n", "Отлично, теперь ", "", "", "", "", "", "", "", "", ""];
            const pref = prefixes[state.step - 1] || "";
            const qText = pref + APPLY_QUESTIONS[state.step - 1];
            const res = await sendVkMessage(VK_TOKEN, peerId, qText, replyExtra);
            const nCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (nCmId) state.lastCmId = nCmId;
            return;
          } else {
            const keyboard = {
              inline: true,
              buttons: [[
                { action: { type: "callback", label: "Да, отправить", payload: JSON.stringify({ cmd: "apply_submit", authorId: userId }) }, color: "positive" },
                { action: { type: "callback", label: "Нет, не отправлять", payload: JSON.stringify({ cmd: "apply_cancel", authorId: userId }) }, color: "negative" }
              ]]
            };
            const res = await sendVkMessage(VK_TOKEN, peerId, "Отлично, ваша заявка заполнена!\\n\\nЖелаете отправить её на рассмотрение руководству?", { ...replyExtra, keyboard: JSON.stringify(keyboard) });
            const nCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (nCmId) state.lastCmId = nCmId;
            return;
          }
        }
      }
`;
code = code.replace(rawCmdDef, rawCmdDef + applyMsgHandler);

// 5. Update /staff
const oldStaffStart = 'if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {';
const newStaffBlock = `if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const byRole: Record<number, string[]> = {
           13: [], 12: [], 11: [], 10: [], 9: [], 8: [], 7: [], 6: [], 5: [], 4: [], 3: [], 2: [], 1: []
         };
         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.gban || u.gbanpl || u.blacklisted || (u.chatBans && u.chatBans[peerId])) continue;
             const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0; 
             const gRole = u.role || 0; 
             const effRole = Math.max(gRole, cRole); 
             const r = Math.floor(effRole);
             if (r >= 1 && r <= 13) {
               const name = p.first_name && p.last_name ? \`\${p.first_name} \${p.last_name}\` : (u.fullName || u.nick || \`User\${p.id}\`);
               if (!byRole[r]) byRole[r] = [];
               byRole[r].push(\`- [id\${p.id}|\${name}]\`);
             }
           }
         }
         const fmtList = (arr: string[]) => arr.length > 0 ? arr.join("\\n") : " - Отсутствует";
         const text = \`Список руководства беседы\\n\\n\` +
           \`| Создатель чат-менеджера:\\n\${fmtList(byRole[13])}\\n\` +
           \`| Второстепенный владелец:\\n\${fmtList(byRole[12])}\\n\` +
           \`| Основной Зам. Руководителя:\\n\${fmtList(byRole[11] || byRole[9])}\\n\` +
           \`| Зам. Руководителя:\\n\${fmtList(byRole[10] || byRole[8])}\\n\` +
           \`| Гл. Модератор:\\n\${fmtList(byRole[7])}\\n\` +
           \`| Пом. Гл. Модератора:\\n\${fmtList(byRole[6])}\\n\` +
           \`| Старший Администратор:\\n\${fmtList(byRole[5] || byRole[4])}\\n\` +
           \`| Администратор:\\n\${fmtList(byRole[3])}\\n\` +
           \`| Старший Модератор:\\n\${fmtList(byRole[2])}\\n\` +
           \`| Модератор:\\n\${fmtList(byRole[1])}\`;
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Ники", payload: JSON.stringify({ cmd: "staff_nicks" }) }, color: "primary" }]
           ]
         };
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }`;

// Find the end of old staff block
const staffStartIndex = code.indexOf(oldStaffStart);
if (staffStartIndex !== -1) {
    const endSearch = 'return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });';
    const endOfBlock = code.indexOf(endSearch, staffStartIndex) + endSearch.length;
    // Account for closing braces
    let closingCount = 0;
    let curr = endOfBlock;
    while (closingCount < 1 && curr < code.length) {
        if (code[curr] === '}') closingCount++;
        curr++;
    }
    code = code.slice(0, staffStartIndex) + newStaffBlock + code.slice(curr);
}

// 6. Callbacks in message_event
const cbStart = 'const cmd = payloadObj?.cmd || payloadObj?.action || payloadObj?.type || "";';
const applyCallbacks = `
        if (cmd === "apply_cancel") {
           if (payloadObj.authorId && userId !== payloadObj.authorId) {
              await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
              return;
           }
           applyStates.delete(userId);
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Подача заявки отменена." });
           if (cmId) deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
           await sendVkMessage(VK_TOKEN, peerId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.", {
             forward: JSON.stringify({
               peer_id: peerId,
               conversation_message_ids: [cmId],
               is_reply: true
             })
           });
           return;
        }
        if (cmd === "apply_start") {
           if (payloadObj.authorId && userId !== payloadObj.authorId) {
              await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка начата." });
           if (cmId) deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
           applyStates.set(userId, { step: 1, answers: [] });
           const res = await sendVkMessage(VK_TOKEN, peerId, "Отлично, тогда мы зададим вам пару вопросов.\\n\\nСколько вам лет?", {
             forward: JSON.stringify({
               peer_id: peerId,
               conversation_message_ids: [cmId],
               is_reply: true
             })
           });
           const newCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
           if (newCmId) {
             const st = applyStates.get(userId);
             if (st) st.lastCmId = newCmId;
           }
           return;
        }
        if (cmd === "apply_submit") {
           if (payloadObj.authorId && userId !== payloadObj.authorId) {
              await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
              return;
           }
           const state = applyStates.get(userId);
           applyStates.delete(userId);
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка отправлена." });
           try {
             await editVkMessage(VK_TOKEN, peerId, cmId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.", {
               keyboard: JSON.stringify({ inline: true, buttons: [] })
             });
           } catch(e) {
             await sendVkMessage(VK_TOKEN, peerId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.", { noReply: true });
           }
           const applicant = await getOrCreateUser(userId);
           const appName = applicant.fullName || (await fetchVkFullName(userId)) || \`Пользователь \${userId}\`;
           const ans = state?.answers || [];
           const appText = \`Поступила новая заявка на пост Заместителя Руководителя!\\n\\n\` +
             \`| Заявку отправил - [id\${userId}|\${appName}]\\n\` +
             \`| VK ID пользователя - \${userId}\\n\\n\` +
             \`Ответы на вопросы в заявке:\\n\\n\` +
             \`| Сколько вам лет?\\n- \${ans[0] || "Не указано"}\\n\\n\` +
             \`| Укажите вашу электронную почту:\\n- \${ans[1] || "Не указано"}\\n\\n\` +
             \`| Отлично, теперь укажите ваш Telegram:\\n- \${ans[2] || "Не указано"}\\n\\n\` +
             \`| Какой у вас часовой пояс (от МСК)?\\n- \${ans[3] || "Не указано"}\\n\\n\` +
             \`| Расскажите, почему вы хотите попасть на пост Заместителя руководителя?\\n- \${ans[4] || "Не указано"}\\n\\n\` +
             \`| Что вы будете делать на посте Заместителя руководителя?\\n- \${ans[5] || "Не указано"}\\n\\n\` +
             \`| Почему мы должны взять на пост именно вас?\\n- \${ans[6] || "Не указано"}\\n\\n\` +
             \`| Есть ли у вас опыт в этой сфере?\\n- \${ans[7] || "Не указано"}\\n\\n\` +
             \`| Готовы ли вы получить ЧСБ/ЧСР за слив своего поста?\\n- \${ans[8] || "Не указано"}\\n\\n\` +
             \`| Сколько вы готовы уделять время нашему чат-менеджеру?\\n- \${ans[9] || "Не указано"}\\n\\n\` +
             \`| Укажите ваш ежедневный онлайн в ВКонтакте:\\n- \${ans[10] || "Не указано"}\\n\\n\` +
             \`| Готовы ли вы слушаться высшее руководство?\\n- \${ans[11] || "Не указано"}\`;
           const leadersKeyboard = {
             inline: true,
             buttons: [[
               { action: { type: "callback", label: "Одобрить", payload: JSON.stringify({ cmd: "apply_approve", targetId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Отказать", payload: JSON.stringify({ cmd: "apply_deny", targetId: userId }) }, color: "negative" }
             ]]
           };
           await sendVkMessage(VK_TOKEN, 2000000026, appText, { keyboard: JSON.stringify(leadersKeyboard) });
           return;
        }
        if (cmd === "apply_approve" || cmd === "apply_deny") {
           const targetId = Number(payloadObj.targetId);
           const leaderUser = await getOrCreateUser(userId);
           const leaderName = leaderUser.fullName || leaderUser.nick || (await fetchVkFullName(userId)) || \`Руководитель\`;
           const targetUser = await getOrCreateUser(targetId);
           const targetFirstName = (targetUser.fullName || "").split(" ")[0] || (await fetchVkFullName(targetId)).split(" ")[0] || "Пользователь";
           try {
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
           } catch(e) {}
           const replyExtra = {
             forward: JSON.stringify({
               peer_id: peerId,
               conversation_message_ids: [cmId],
               is_reply: true
             })
           };
           if (cmd === "apply_approve") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка одобрена." });
             await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${leaderName}] одобрил(-а) заявку на пост заместителя руководителя от [id\${targetId}|пользователя]\`, replyExtra);
             await sendVkMessage(VK_TOKEN, targetId, \`[id\${targetId}|\${targetFirstName}], доброго времени суток!\\n\\nВаша заявка на пост заместителя руководителя была одобрена.\`, { noReply: true });
           } else {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка отказана." });
             await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${leaderName}] отказал(-а) заявку на пост заместителя руководителя от [id\${targetId}|пользователя]\`, replyExtra);
             await sendVkMessage(VK_TOKEN, targetId, \`[id\${targetId}|\${targetFirstName}], доброго времени суток!\\n\\nВаша заявка на пост заместителя руководителя была отказана.\\n\\nЕсли вы хотите узнать причину, то напишите [id\${userId}|модератору] который отказал вам заявку.\`, { noReply: true });
           }
           return;
        }
`;
code = code.replace(cbStart, cbStart + applyCallbacks);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('FINAL MEGA FIX APPLIED SUCCESSFULLY');
