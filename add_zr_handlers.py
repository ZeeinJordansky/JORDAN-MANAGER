with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add DM message interception for ZR application questionnaire
target_dm_check = 'if (peerId < 2000000000) {'

dm_intercept_code = '''if (peerId < 2000000000 && zrApplicationStateMap.has(userId) && !rawCmd.startsWith("/")) {
        const state = zrApplicationStateMap.get(userId)!;
        const currentStep = state.step;
        state.answers[currentStep] = cmdText;

        if (state.lastMsgId) {
          try { await deleteVkMessage(VK_TOKEN, peerId, state.lastMsgId); } catch (e) {}
        }
        if (message.conversation_message_id) {
          try { await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id); } catch (e) {}
        }

        const nextStep = currentStep + 1;
        state.step = nextStep;

        let nextMsgText = "";
        let nextKeyboard: any = null;

        if (nextStep === 2) {
          nextMsgText = "Хорошо, теперь следующий вопрос\\n\\nУкажите вашу электронную почту";
        } else if (nextStep === 3) {
          nextMsgText = "Отлично, теперь укажите ваш Telegram\\n\\nУкажите ваш Telegram";
        } else if (nextStep === 4) {
          nextMsgText = "Какой у вас часовой пояс (от МСК)?\\n\\nКакой у вас часовой пояс (от МСК)?";
        } else if (nextStep === 5) {
          nextMsgText = "Расскажите, почему вы хотите попасть на пост Заместителя руководителя?\\n\\nРасскажите, почему вы хотите попасть на пост Заместителя руководителя?";
        } else if (nextStep === 6) {
          nextMsgText = "Что вы будете делать на посте Заместителя руководителя?\\n\\nЧто вы будете делать на посте Заместителя руководителя?";
        } else if (nextStep === 7) {
          nextMsgText = "Почему мы должны взять на пост именно вас?\\n\\nПочему мы должны взять на пост именно вас?";
        } else if (nextStep === 8) {
          nextMsgText = "Есть ли у вас опыт в этой сфере?\\n\\nЕсть ли у вас опыт в этой сфере?";
        } else if (nextStep === 9) {
          nextMsgText = "Готовы ли вы получить ЧСБ/ЧСР за слив своего поста?\\n\\nГотовы ли вы получить ЧСБ/ЧСР за слив своего поста?";
        } else if (nextStep === 10) {
          nextMsgText = "Сколько вы готовы уделять время нашему чат-менеджеру?\\n\\nСколько вы готовы уделять время нашему чат-менеджеру?";
        } else if (nextStep === 11) {
          nextMsgText = "Укажите ваш ежедневный онлайн в ВКонтакте\\n\\nУкажите ваш ежедневный онлайн в ВКонтакте";
        } else if (nextStep === 12) {
          nextMsgText = "Готовы ли вы слушаться высшее руководство?\\n\\nГотовы ли вы слушаться высшее руководство?";
        } else if (nextStep >= 13) {
          nextMsgText = "Отлично, ваша заявка заполнена!\\n\\nЖелаете отправить её на рассмотрение руководству?";
          nextKeyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Да, отправить", payload: JSON.stringify({ cmd: "zr_send_app" }) }, color: "positive" },
                { action: { type: "callback", label: "Нет, не отправлять", payload: JSON.stringify({ cmd: "zr_cancel_app" }) }, color: "negative" }
              ]
            ]
          };
        }

        const sentRes = await sendVkMessageLocal(VK_TOKEN, peerId, nextMsgText, nextKeyboard ? { keyboard: JSON.stringify(nextKeyboard) } : {});
        if (sentRes) {
          state.lastMsgId = sentRes;
        }
        return;
      }

      if (peerId < 2000000000) {'''

code = code.replace(target_dm_check, dm_intercept_code, 1)

# 2. Add /заявка command handler
target_cmd_placement = 'if (["/snick", "/сник", "/ник"].includes(rawCmd)) {'

cmd_zr_code = '''if (rawCmd === "/заявка" || rawCmd === "/зр" || rawCmd === "/заявказр") {
        if (peerId > 2000000000) {
          return await sendResponse("Команда /заявка доступна только в личных сообщениях с ботом!");
        }
        const uFirstName = await fetchVkFirstName(userId);
        const welcomeText = `[id${userId}|${uFirstName}], приветствуем!\\n\\nВы хотите подать заявку на пост заместителя руководителя?`;
        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Да, хочу", payload: JSON.stringify({ cmd: "zr_start" }) }, color: "positive" },
              { action: { type: "callback", label: "Нет, не хочу", payload: JSON.stringify({ cmd: "zr_cancel" }) }, color: "negative" }
            ]
          ]
        };
        zrApplicationStateMap.delete(userId);
        return await sendResponse(welcomeText, { keyboard: JSON.stringify(keyboard) });
      }

      if (["/snick", "/сник", "/ник"].includes(rawCmd)) {'''

code = code.replace(target_cmd_placement, cmd_zr_code, 1)

# 3. Add callback handlers in message_event
target_callback_placement = 'if (cmd === "mod_unmute") {'

zr_callbacks_code = '''if (cmd === "zr_cancel" || cmd === "zr_cancel_app") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             zrApplicationStateMap.delete(userId);
             await editVkMessage(VK_TOKEN, peerId, cmId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             return;
          }

          if (cmd === "zr_start") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             zrApplicationStateMap.set(userId, { step: 1, answers: {}, lastMsgId: cmId });
             await editVkMessage(VK_TOKEN, peerId, cmId, "Отлично, тогда мы зададим вам пару вопросов.\\n\\nСколько вам лет?", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             return;
          }

          if (cmd === "zr_send_app") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             const state = zrApplicationStateMap.get(userId);
             const answers = state?.answers || {};
             zrApplicationStateMap.delete(userId);

             await editVkMessage(VK_TOKEN, peerId, cmId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

             const appUser = await getOrCreateUser(userId);
             const fullName = appUser.fullName || (await fetchVkFullName(userId)) || `User${userId}`;

             const targetChatPeer = 2000000026;
             const appText = `Поступила новая заявка на пост Заместителя Руководителя!\\n\\n` +
               `| Заявку отправил - [id${userId}|${fullName}]\\n` +
               `| VK ID пользователя - ${userId}\\n\\n` +
               `Ответы на вопросы в заявке:\\n\\n` +
               `| Сколько вам лет?\\n- ${answers[1] || "—"}\\n\\n` +
               `| Укажите вашу электронную почту:\\n- ${answers[2] || "—"}\\n\\n` +
               `| Отлично, теперь укажите ваш Telegram:\\n- ${answers[3] || "—"}\\n\\n` +
               `| Какой у вас часовой пояс (от МСК)?\\n- ${answers[4] || "—"}\\n\\n` +
               `| Расскажите, почему вы хотите попасть на пост Заместителя руководителя?\\n- ${answers[5] || "—"}\\n\\n` +
               `| Что вы будете делать на посте Заместителя руководителя?\\n- ${answers[6] || "—"}\\n\\n` +
               `| Почему мы должны взять на пост именно вас?\\n- ${answers[7] || "—"}\\n\\n` +
               `| Есть ли у вас опыт в этой сфере?\\n- ${answers[8] || "—"}\\n\\n` +
               `| Готовы ли вы получить ЧСБ/ЧСР за слив своего поста?\\n- ${answers[9] || "—"}\\n\\n` +
               `| Сколько вы готовы уделять время нашему чат-менеджеру?\\n- ${answers[10] || "—"}\\n\\n` +
               `| Укажите ваш ежедневный онлайн в ВКонтакте:\\n- ${answers[11] || "—"}\\n\\n` +
               `| Готовы ли вы слушаться высшее руководство?\\n- ${answers[12] || "—"}`;

             const appKeyboard = {
               inline: true,
               buttons: [
                 [
                   { action: { type: "callback", label: "Одобрить", payload: JSON.stringify({ cmd: "zr_approve", applicantId: userId }) }, color: "positive" },
                   { action: { type: "callback", label: "Отказать", payload: JSON.stringify({ cmd: "zr_reject", applicantId: userId }) }, color: "negative" }
                 ]
               ]
             };

             await sendVkMessage(VK_TOKEN, targetChatPeer, appText, { keyboard: JSON.stringify(appKeyboard) });
             return;
          }

          if (cmd === "zr_approve") {
             eventAnsweredMap.set(eventId, true);
             const applicantId = payloadObj.applicantId || 0;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка одобрена." });

             const modUser = await getOrCreateUser(userId);
             const modFullName = modUser.fullName || (await fetchVkFullName(userId)) || "Модератор";

             const appUser = await getOrCreateUser(applicantId);
             const appFullName = appUser.fullName || (await fetchVkFullName(applicantId)) || "пользователя";
             const appFirstName = appUser.firstName || (await fetchVkFirstName(applicantId)) || "Пользователь";

             try {
               if (cmId) await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             } catch (e) {}

             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modFullName}] одобрил(-а) заявку на пост заместителя руководителя от [id${applicantId}|${appFullName}]`);

             await sendVkMessage(VK_TOKEN, applicantId, `[id${applicantId}|${appFirstName}], доброго времени суток!\\n\\nВаша заявка на пост заместителя руководителя была одобрена.`);
             return;
          }

          if (cmd === "zr_reject") {
             eventAnsweredMap.set(eventId, true);
             const applicantId = payloadObj.applicantId || 0;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка отклонена." });

             const modUser = await getOrCreateUser(userId);
             const modFullName = modUser.fullName || (await fetchVkFullName(userId)) || "Модератор";

             const appUser = await getOrCreateUser(applicantId);
             const appFullName = appUser.fullName || (await fetchVkFullName(applicantId)) || "пользователя";
             const appFirstName = appUser.firstName || (await fetchVkFirstName(applicantId)) || "Пользователь";

             try {
               if (cmId) await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             } catch (e) {}

             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modFullName}] отказал(-а) заявку на пост заместителя руководителя от [id${applicantId}|${appFullName}]`);

             await sendVkMessage(VK_TOKEN, applicantId, `[id${applicantId}|${appFirstName}], доброго времени суток!\\n\\nВаша заявка на пост заместителя руководителя была отказана.\\n\\nЕсли вы хотите узнать причину, то напишите [id${userId}|модератору] который отказал вам заявку.`);
             return;
          }

          if (cmd === "mod_unmute") {'''

code = code.replace(target_callback_placement, zr_callbacks_code, 1)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("ZR handlers added successfully!")
