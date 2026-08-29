import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Start message
code = code.replace(/приветствуем!\\nВы хотите подать заявку/g, 'приветствуем!\\n\\nВы хотите подать заявку');

// 2. apply_start
code = code.replace(/if \(cmd === "apply_start"\) \{[\s\S]+?applyStates\.set\(userId, \{ step: 1, answers: \[\] \}\);[\s\S]+?return;[\s\S]+?\}/, 
`        if (cmd === "apply_start") {
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
        }`);

// 3. apply_cancel
code = code.replace(/if \(cmd === "apply_cancel"\) \{[\s\S]+?applyStates\.delete\(userId\);[\s\S]+?return;[\s\S]+?\}/,
`        if (cmd === "apply_cancel") {
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
        }`);

// 4. applyMsgHandler
code = code.replace(/if \(peerId < 2000000000 && applyStates\.has\(userId\)\) \{[\s\S]+?if \(!rawCmd\.startsWith\("\/"\)\) \{[\s\S]+?\}[\s\S]+?\}/,
`      if (peerId < 2000000000 && applyStates.has(userId)) {
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
      }`);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Regex replacements applied');
