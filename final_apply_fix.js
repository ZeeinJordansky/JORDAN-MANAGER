import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const t1 = `           return await sendResponse(\`[id\${userId}|\${userFirstName}], приветствуем!\\nВы хотите подать заявку на пост заместителя руководителя?\`, {`;
const r1 = `           return await sendResponse(\`[id\${userId}|\${userFirstName}], приветствуем!\\n\\nВы хотите подать заявку на пост заместителя руководителя?\`, {`;

if (code.includes(t1)) {
    code = code.replace(t1, r1);
    console.log('R1 success');
} else {
    console.log('R1 failed');
}

const t2 = `        if (cmd === "apply_start") {
           if (payloadObj.authorId && userId !== payloadObj.authorId) {
              await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
              return;
           }
           await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка начата." });
           try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
           applyStates.set(userId, { step: 1, answers: [] });
           await sendVkMessage(VK_TOKEN, peerId, "Отлично, тогда we зададим вам пару вопросов.\\n\\nСколько вам лет?", { noReply: true });
           return;
        }`;

const r2 = `        if (cmd === "apply_start") {
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
        }`;

if (code.includes(t2)) {
    code = code.replace(t2, r2);
    console.log('R2 success');
} else {
    console.log('R2 failed');
}

const t3 = `       if (peerId < 2000000000 && applyStates.has(userId)) {
        const state = applyStates.get(userId)!;
        if (!rawCmd.startsWith("/")) {
          state.answers.push(cmdText.trim());
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

          if (state.step <= 12) {
            const prefixes = [
              "",
              "Хорошо, теперь следующий вопрос\\n",
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
            return await sendVkMessage(VK_TOKEN, peerId, qText);
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
            return await sendVkMessage(VK_TOKEN, peerId, "Отлично, ваша заявка заполнена!\\nЖелаете отправить её на рассмотрение руководству?", { keyboard: JSON.stringify(keyboard) });
          }
        }
      }`;

const r3 = `      if (peerId < 2000000000 && applyStates.has(userId)) {
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
      }`;

if (code.includes(t3)) {
    code = code.replace(t3, r3);
    console.log('R3 success');
} else {
    console.log('R3 failed');
}

fs.writeFileSync('server.ts', code, 'utf8');
