import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix applyMsgHandler section
const msgStartText = 'const rawCmd = args[0].toLowerCase();';
const msgEndText = 'const ALL_GAME_CMDS = new Set([';

let msgStartIndex = code.indexOf(msgStartText);
let msgEndIndex = code.indexOf(msgEndText);

// We want to find the LAST occurrence of rawCmd before ALL_GAME_CMDS if there are duplicates, 
// or just find the one that is likely the right one.
// Actually, I'll just find the first one that is around line 8000.

if (msgStartIndex !== -1 && msgEndIndex !== -1 && msgStartIndex < msgEndIndex) {
    const newMsgBlock = `const rawCmd = args[0].toLowerCase();

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
            const prefixes = [
              "",
              "Хорошо, теперь следующий вопрос\\n\\n",
              "Отлично, теперь ",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              ""
            ];
            const pref = prefixes[state.step - 1] || "";
            const qText = pref + APPLY_QUESTIONS[state.step - 1];
            const res = await sendVkMessage(VK_TOKEN, peerId, qText, replyExtra);
            const nCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (nCmId) state.lastCmId = nCmId;
            return;
          } else {
            const keyboard = {
              inline: true,
              buttons: [
                [
                  { action: { type: "callback", label: "Да, отправить", payload: JSON.stringify({ cmd: "apply_submit", authorId: userId }) }, color: "positive" },
                  { action: { type: "callback", label: "Нет, не отправлять", payload: JSON.stringify({ cmd: "apply_cancel", authorId: userId }) }, color: "negative" }
                ]
              ]
            };
            const res = await sendVkMessage(VK_TOKEN, peerId, "Отлично, ваша заявка заполнена!\\n\\nЖелаете отправить её на рассмотрение руководству?", { ...replyExtra, keyboard: JSON.stringify(keyboard) });
            const nCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (nCmId) state.lastCmId = nCmId;
            return;
          }
        }
      }
      
      `;
    code = code.slice(0, msgStartIndex) + newMsgBlock + code.slice(msgEndIndex);
    console.log('Fixed applyMsgHandler section');
}

// 2. Fix callback section
const cbStartText = 'if (cmd === "apply_cancel") {';
const cbEndText = 'if (cmd === "mod_silence_off") {';

let cbStartIndex = code.indexOf(cbStartText);
let cbEndIndex = code.indexOf(cbEndText);

if (cbStartIndex !== -1 && cbEndIndex !== -1 && cbStartIndex < cbEndIndex) {
    const newCbBlock = `if (cmd === "apply_cancel") {
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
             buttons: [
               [
                 { action: { type: "callback", label: "Одобрить", payload: JSON.stringify({ cmd: "apply_approve", targetId: userId }) }, color: "positive" },
                 { action: { type: "callback", label: "Отказать", payload: JSON.stringify({ cmd: "apply_deny", targetId: userId }) }, color: "negative" }
               ]
             ]
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
    code = code.slice(0, cbStartIndex) + newCbBlock + code.slice(cbEndIndex);
    console.log('Fixed callback section');
}

fs.writeFileSync('server.ts', code, 'utf8');
