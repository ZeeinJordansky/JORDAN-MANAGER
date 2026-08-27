const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes("const applyStates = new Map")) {
  code = "const applyStates = new Map<number, { step: number; answers: string[] }>();\n" + code;
}

const targetStr = `       if (["/frozenlist", "/списокзамороженных", "/замороженные", "/frozen", "/фризлист"].includes(rawCmd)) {
          if (userEffectiveRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const allUsers = await getAllUsers();
          const frozenList: any[] = [];
          for (const u of allUsers) {
             const fChats = u.frozenChats || {};
             if (fChats[peerId] || fChats[String(peerId)]) {
                frozenList.push({
                   id: u.userId,
                   name: u.fullName || u.nick || \`User\${u.userId}\`,
                   info: fChats[peerId] || fChats[String(peerId)]
                });
             }
          }

          if (frozenList.length === 0) {
             return await sendResponse("В данной беседе нет замороженных участников.");
          }

          let out = \`...:: Список замороженных участников беседы (\${frozenList.length}) ::...\\n\\n\`;
          for (let i = 0; i < frozenList.length; i++) {
             const f = frozenList[i];
             const modUser = f.info.by ? await getOrCreateUser(f.info.by) : null;
             const modName = modUser?.fullName || modUser?.nick || \`Модератор\`;
             out += \`\${i + 1}) [id\${f.id}|\${f.name}]\\n\`;
             out += \`| Модератор: [id\${f.info.by || 1}|\${modName}]\\n\`;
             out += \`| Дата: \${fmtD(f.info.date || Date.now())}\\n\`;
             out += \`| Причина: \${f.info.reason || "Нарушение правил"}\\n\\n\`;
          }
          return await sendResponse(out.trim(), { disable_mentions: 1 });
       }

       if (["/kickfrozen", "/кикзамороженных", "/исключитьзамороженных", "/кикфриз"].includes(rawCmd)) {
          if (userEffectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Администратор.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;

          const allUsers = await getAllUsers();
          const toKick: number[] = [];
          for (const u of allUsers) {
             const fChats = u.frozenChats || {};
             if (fChats[peerId] || fChats[String(peerId)]) {
                toKick.push(u.userId);
             }
          }

          if (toKick.length === 0) {
             return await sendResponse("В данной беседе нет замороженных участников для исключения.");
          }

          let kickedCount = 0;
          for (const tId of toKick) {
             try {
                if (peerId > 2000000000) {
                   await axios.get("https://api.vk.com/method/messages.removeChatUser", {
                      params: {
                         access_token: VK_TOKEN,
                         v: "5.199",
                         chat_id: peerId - 2000000000,
                         user_id: tId,
                         member_id: tId
                      }
                   });
                   kickedCount++;
                   // Unfreeze on kick
                   const tU = await getOrCreateUser(tId);
                   const fChats = tU.frozenChats || {};
                   delete fChats[peerId];
                   delete fChats[String(peerId)];
                   await updateUser(tId, { frozenChats: fChats, isFrozen: Object.keys(fChats).length > 0 });
                }
             } catch (e) {}
             await new Promise(r => setTimeout(r, 200));
          }

          return await sendResponse(\`⚡ Исключение замороженных участников завершено!\\n\\n| Исключено участников: \${kickedCount} из \${toKick.length}\`, { noReply: true });
       }`;

const replacementStr = `       if (["/frozenlist", "/списокзамороженных", "/замороженные", "/frozen", "/фризлист"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
          const isAllowed = userEffectiveRole >= 1 || userChatRole >= 6 || isVkAdmin || isAdmin;
          if (!isAllowed) return await sendResponse("У вас недостаточно прав! Данная команда доступна Владельцу беседы и Модераторам.");

          const { profiles } = await getChatMembers(peerId);
          const frozenListMap = new Map<number, { name: string, reason: string, modStr: string, date: string }>();

          for (const p of profiles) {
            if (p.deactivated) {
              const deactText = p.deactivated === "deleted" ? "Удалённый аккаунт (Страница удалена)" : "Замороженный аккаунт (Страница заблокирована)";
              frozenListMap.set(p.id, {
                name: \`\${p.first_name} \${p.last_name}\`,
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
          if (listArr.length === 0) {
             return await sendResponse("В данной беседе нет удалённых или замороженных участников.");
          }

          const page = Number(args[1]) || 1;
          const pageSize = 15;
          const totalPages = Math.ceil(listArr.length / pageSize);
          const curPage = Math.max(1, Math.min(page, totalPages));
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

          let keyboard;
          if (totalPages > 1) {
             const buttons: any[] = [];
             if (curPage > 1) {
                buttons.push({ action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "frozen_page", p: curPage - 1, authorId: userId }) }, color: "primary" });
             }
             buttons.push({ action: { type: "callback", label: \`\${curPage}/\${totalPages}\`, payload: JSON.stringify({ cmd: "frozen_page_noop" }) }, color: "secondary" });
             if (curPage < totalPages) {
                buttons.push({ action: { type: "callback", label: "Вперёд ▶", payload: JSON.stringify({ cmd: "frozen_page", p: curPage + 1, authorId: userId }) }, color: "primary" });
             }
             keyboard = { inline: true, buttons: [buttons] };
          }

          return await sendResponse(out.trim(), { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, disable_mentions: 1 });
       }

       if (["/kickfrozen", "/кикзамороженных", "/исключитьзамороженных", "/кикфриз"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
          const isAllowed = userEffectiveRole >= 1 || userChatRole >= 6 || isVkAdmin || isAdmin;
          if (!isAllowed) return await sendResponse("У вас недостаточно прав! Данная команда доступна Владельцу беседы и Модераторам.");

          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Да, исключить", payload: JSON.stringify({ cmd: "kickfrozen_confirm", authorId: userId }) }, color: "positive" },
                { action: { type: "callback", label: "Нет, не исключать", payload: JSON.stringify({ cmd: "kickfrozen_cancel", authorId: userId }) }, color: "negative" }
              ]
            ]
          };

          return await sendResponse(\`Вы действительно хотите исключить всех удалённых/замороженных пользователей из беседы?\`, {
            keyboard: JSON.stringify(keyboard),
            noReply: true
          });
       }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("SUCCESS: Replaced frozenlist and kickfrozen blocks!");
} else {
  console.log("ERROR: targetStr not found");
}
