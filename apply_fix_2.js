import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Helper to escape regex special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceBlock(oldText, newText) {
  if (code.includes(oldText)) {
    code = code.replace(oldText, newText);
    return true;
  }
  // Try with normalized line endings or slightly different spacing if needed, 
  // but usually exact match works if I copy correctly.
  return false;
}

const replacements = [
  {
    old: `           return await sendResponse(\`[id\${userId}|\${userFirstName}], приветствуем!\\nВы хотите подать заявку на пост заместителя руководителя?\`, {
             keyboard: JSON.stringify(keyboard),
             noReply: true
           });`,
    new: `           return await sendResponse(\`[id\${userId}|\${userFirstName}], приветствуем!\\n\\nВы хотите подать заявку на пост заместителя руководителя?\`, {
             keyboard: JSON.stringify(keyboard),
             noReply: true
           });`
  },
  {
    old: `       if (cmd === "apply_cancel") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
             return;
          }
          applyStates.delete(userId);
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Подача заявки отменена." });
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          await sendVkMessage(VK_TOKEN, peerId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.", { noReply: true });
          return;
       }`,
    new: `        if (cmd === "apply_cancel") {
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
        }`
  },
  {
    old: `       if (cmd === "apply_start") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка начата." });
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          applyStates.set(userId, { step: 1, answers: [] });
          await sendVkMessage(VK_TOKEN, peerId, "Отлично, тогда we зададим вам пару вопросов.\\n\\nСколько вам лет?", { noReply: true });
          return;
       }`,
    new: `        if (cmd === "apply_start") {
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
        }`
  },
  {
    old: `       if (peerId < 2000000000 && applyStates.has(userId)) {
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
      }`,
    new: `      if (peerId < 2000000000 && applyStates.has(userId)) {
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
            const newCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (newCmId) state.lastCmId = newCmId;
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
            const newCmId = res?.response?.conversation_message_id || res?.conversation_message_id;
            if (newCmId) state.lastCmId = newCmId;
            return;
          }
        }
      }`
  }
];

replacements.forEach((r, i) => {
  if (replaceBlock(r.old, r.new)) {
    console.log(`Replacement ${i + 1} successful`);
  } else {
    console.log(`Replacement ${i + 1} FAILED - target not found`);
    // Debug: print start of old text to see if it even exists partially
    const start = r.old.slice(0, 50);
    if (code.includes(start)) {
        console.log(`  (Partially matched start: "${start}")`);
    }
  }
});

fs.writeFileSync('server.ts', code, 'utf8');
