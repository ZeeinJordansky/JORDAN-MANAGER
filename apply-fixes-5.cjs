const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add callbacks right after mod_giveowner_no
const oldGiveOwnerNo = `       if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Отменено." });
          await editVkMessage(VK_TOKEN, peerId, cmId, \`Передача прав «Владелец Беседы» отменена.\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }`;

const newCallbacksBlock = `       if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Отменено." });
          await editVkMessage(VK_TOKEN, peerId, cmId, \`Передача прав «Владелец Беседы» отменена.\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }

       if (cmd === "frozen_page") {
          const p = Number(payloadObj.p) || 1;
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: \`Страница \${p}\` });
          const { profiles } = await getChatMembers(peerId);
          const frozenListMap = new Map<number, { name: string, reason: string, modStr: string, date: string }>();

          for (const pr of profiles) {
            if (pr.deactivated) {
              const deactText = pr.deactivated === "deleted" ? "Удалённый аккаунт (Страница удалена)" : "Замороженный аккаунт (Страница заблокирована)";
              frozenListMap.set(pr.id, {
                name: \`\${pr.first_name} \${pr.last_name}\`,
                reason: deactText,
                modStr: "Система VK",
                date: fmtD(Date.now())
              });
            }
          }

          const allUsers = await getAllUsers();
          for (const u of allUsers) {
             const fChats = u.frozenChats || {};
             if (fChats[peerId] || fChats[String(peerId)]) {
                const info = fChats[peerId] || fChats[String(peerId)];
                const modUser = info.by ? await getOrCreateUser(info.by) : null;
                const modName = modUser?.fullName || modUser?.nick || \`Модератор\`;
                frozenListMap.set(u.userId, {
                   name: u.fullName || u.nick || \`User\${u.userId}\`,
                   reason: info.reason || "Заморозка в беседе",
                   modStr: \`[id\${info.by || 1}|\${modName}]\`,
                   date: fmtD(info.date || Date.now())
                });
             }
          }

          const listArr = Array.from(frozenListMap.entries());
          const pageSize = 15;
          const totalPages = Math.ceil(listArr.length / pageSize);
          const curPage = Math.max(1, Math.min(p, totalPages));
          const startIndex = (curPage - 1) * pageSize;
          const pageItems = listArr.slice(startIndex, startIndex + pageSize);

          let out = \`...:: Список удалённых/замороженных пользователей (\${listArr.length}) ::...\\n\\n\`;
          for (let i = 0; i < pageItems.length; i++) {
             const [fId, item] = pageItems[i];
             out += \`\${startIndex + i + 1}) [id\${fId}|\${item.name}]\\n\`;
             out += \`| Причина/Статус: \${item.reason}\\n\`;
             out += \`| Инициатор: \${item.modStr}\\n\`;
             out += \`| Дата: \${item.date}\\n\\n\`;
          }

          const buttons: any[] = [];
          if (curPage > 1) {
             buttons.push({ action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "frozen_page", p: curPage - 1, authorId: userId }) }, color: "primary" });
          }
          buttons.push({ action: { type: "callback", label: \`\${curPage}/\${totalPages}\`, payload: JSON.stringify({ cmd: "frozen_page_noop" }) }, color: "secondary" });
          if (curPage < totalPages) {
             buttons.push({ action: { type: "callback", label: "Вперёд ▶", payload: JSON.stringify({ cmd: "frozen_page", p: curPage + 1, authorId: userId }) }, color: "primary" });
          }
          const keyboard = { inline: true, buttons: [buttons] };
          await editVkMessage(VK_TOKEN, peerId, cmId, out.trim(), { keyboard: JSON.stringify(keyboard) });
          return;
       }

       if (cmd === "frozen_page_noop") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Текущая страница" });
          return;
       }

       if (cmd === "kickfrozen_cancel") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор команды может взаимодействовать с этой кнопкой!");
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Отменено." });
          const modUser = await getOrCreateUser(userId);
          const modName = modUser.fullName || modUser.nick || (await fetchVkFullName(userId)) || \`Модератор\`;
          await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|\${modName}] отменил(-а) исключение всех удалённых/замороженных пользователей из беседы.\`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return;
       }

       if (cmd === "kickfrozen_confirm") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор команды может взаимодействовать с этой кнопкой!");
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Начато исключение..." });
          const modUser = await getOrCreateUser(userId);
          const modName = modUser.fullName || modUser.nick || (await fetchVkFullName(userId)) || \`Модератор\`;

          await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|\${modName}] начал(-а) исключение всех удалённых/замороженных пользователей из беседы.\`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

          const { profiles } = await getChatMembers(peerId);
          const toKickSet = new Set<number>();
          for (const pr of profiles) {
            if (pr.deactivated) toKickSet.add(pr.id);
          }
          const allUsers = await getAllUsers();
          for (const u of allUsers) {
             const fChats = u.frozenChats || {};
             if (fChats[peerId] || fChats[String(peerId)]) toKickSet.add(u.userId);
          }

          const toKick = Array.from(toKickSet);
          let kickedCount = 0;
          let failedCount = 0;

          for (const tId of toKick) {
             try {
                if (peerId > 2000000000) {
                   await axios.get("https://api.vk.com/method/messages.removeChatUser", {
                      params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, user_id: tId, member_id: tId }
                   });
                   kickedCount++;
                   const tU = await getOrCreateUser(tId);
                   const fChats = tU.frozenChats || {};
                   delete fChats[peerId]; delete fChats[String(peerId)];
                   await updateUser(tId, { frozenChats: fChats, isFrozen: Object.keys(fChats).length > 0 });
                }
             } catch (e) {
                failedCount++;
             }
             await new Promise(r => setTimeout(r, 200));
          }

          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          await sendVkMessageLocal(VK_TOKEN, peerId, \`Исключение всех удалённых/замороженных пользователей из беседы завершено.\\n\\n| Успешно исключено: (\${kickedCount})\\n| Неуспешно исключено: (\${failedCount})\`);
          return;
       }

       if (cmd === "apply_cancel") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
             return;
          }
          applyStates.delete(userId);
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Подача заявки отменена." });
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          await sendVkMessageLocal(VK_TOKEN, peerId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.");
          return;
       }

       if (cmd === "apply_start") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор заявки может использовать эту кнопку!");
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка начата." });
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          applyStates.set(userId, { step: 1, answers: [] });
          await sendVkMessageLocal(VK_TOKEN, peerId, "Отлично, тогда мы зададим вам пару вопросов.\\n\\nСколько вам лет?");
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
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          await sendVkMessageLocal(VK_TOKEN, peerId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.");

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

          await sendVkMessageLocal(VK_TOKEN, 2000000026, appText, { keyboard: JSON.stringify(leadersKeyboard) });
          return;
       }

       if (cmd === "apply_approve" || cmd === "apply_deny") {
          const targetId = Number(payloadObj.targetId);
          const leaderUser = await getOrCreateUser(userId);
          const leaderName = leaderUser.fullName || leaderUser.nick || (await fetchVkFullName(userId)) || \`Руководитель\`;
          const targetUser = await getOrCreateUser(targetId);
          const targetFirstName = (targetUser.fullName || "").split(" ")[0] || (await fetchVkFullName(targetId)).split(" ")[0] || "Пользователь";

          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

          if (cmd === "apply_approve") {
            await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка одобрена." });
            await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${userId}|\${leaderName}] одобрил(-а) заявку на пост заместителя руководителя от [id\${targetId}|пользователя]\`);
            await sendVkMessageLocal(VK_TOKEN, targetId, \`[id\${targetId}|\${targetFirstName}], доброго времени суток!\\nВаша заявка на пост заместителя руководителя была одобрена.\`);
          } else {
            await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Заявка отказана." });
            await sendVkMessageLocal(VK_TOKEN, peerId, \`[id\${userId}|\${leaderName}] отказал(-а) заявку на пост заместителя руководителя от [id\${targetId}|пользователя]\`);
            await sendVkMessageLocal(VK_TOKEN, targetId, \`[id\${targetId}|\${targetFirstName}], доброго времени суток!\\nВаша заявка на пост заместителя руководителя была отказана.\\nЕсли вы хотите узнать причину, то напишите [id\${userId}|модератору] который отказал вам заявку.\`);
          }
          return;
       }`;

if (code.includes(oldGiveOwnerNo)) {
  code = code.replace(oldGiveOwnerNo, newCallbacksBlock);
  console.log("SUCCESS: Replaced oldGiveOwnerNo");
} else {
  console.log("ERROR: oldGiveOwnerNo not found");
}

// Replace /заявка command handler
const oldApplyCmdHeader = `       if (["/заявка", "/податьзаявку", "/заявки", "/apply", "/заявканапост", "/анкета"].includes(rawCmd)) {`;

if (code.includes(oldApplyCmdHeader)) {
  const index = code.indexOf(oldApplyCmdHeader);
  const closingBraceIndex = code.indexOf("\n       }", index);
  if (closingBraceIndex !== -1) {
    const toReplace = code.substring(index, closingBraceIndex + 8);
    const replacement = `       if (["/заявка", "/податьзаявку", "/заявки", "/apply", "/заявканапост", "/анкета"].includes(rawCmd)) {
          if (peerId > 2000000000) {
             return await sendResponse("Команда /заявка доступна только в личных сообщениях бота!");
          }
          const userFirstName = (user.fullName || "").split(" ")[0] || (await fetchVkFullName(userId)).split(" ")[0] || "Пользователь";
          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Да, хочу", payload: JSON.stringify({ cmd: "apply_start", authorId: userId }) }, color: "positive" },
                { action: { type: "callback", label: "Нет, не хочу", payload: JSON.stringify({ cmd: "apply_cancel", authorId: userId }) }, color: "negative" }
              ]
            ]
          };
          return await sendResponse(\`[id\${userId}|\${userFirstName}], приветствуем!\\nВы хотите подать заявку на пост заместителя руководителя?\`, {
            keyboard: JSON.stringify(keyboard),
            noReply: true
          });
       }`;
    code = code.replace(toReplace, replacement);
    console.log("SUCCESS: Replaced /заявка command handler");
  }
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Updated server.ts step 5 successfully!");
