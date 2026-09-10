import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// replace cmd_import payload
code = code.replace(/\{ cmd: "confirm_import", sourceId: sourcePeerId \}/g, 
  '{ cmd: "confirm_import", sourcePeerId: sourcePeerId, authorId: userId }');
code = code.replace(/\{ cmd: "cancel_import" \}/g, 
  '{ cmd: "cancel_import", authorId: userId }');
code = code.replace(/\{ cmd: "confirm_deletenicks" \}/g, 
  '{ cmd: "confirm_deletenicks", authorId: userId }');
code = code.replace(/\{ cmd: "cancel_deletenicks" \}/g, 
  '{ cmd: "cancel_deletenicks", authorId: userId }');
code = code.replace(/\{ cmd: "confirm_deleteroles" \}/g, 
  '{ cmd: "confirm_deleteroles", authorId: userId }');
code = code.replace(/\{ cmd: "cancel_deleteroles" \}/g, 
  '{ cmd: "cancel_deleteroles", authorId: userId }');

// Add handlers
const handlers = `
       if (cmd === "confirm_deletenicks") {
          const authorId = Number(payloadObj.authorId || payloadObj.author_id || 0);
          if (authorId > 0 && userId !== authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете подтвердить это действие за другого пользователя!");
             return;
          }
          const clickingU = await getOrCreateUser(userId);
          const isOwner = await checkIsOwner(userId, peerId, clickingU.role);
          if (!isOwner && !isAdminMember && clickingU.role < 12) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Владелец беседы)!");
             return;
          }
          const chat = await getOrCreateChat(peerId);
          for (const u of Object.values(chat.members || {})) {
            if (u && (u as any).nick) {
              delete (u as any).nick;
            }
          }
          await updateChat(peerId, { members: chat.members });
          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { preserveAttachment: true, keyboard: JSON.stringify({inline: true, buttons: []}) });
          await sendVkMessage(VK_TOKEN, peerId, "Все ники пользователей в этой беседе были успешно удалены.");
          return;
       }

       if (cmd === "cancel_deletenicks") {
          const authorId = Number(payloadObj.authorId || payloadObj.author_id || 0);
          if (authorId > 0 && userId !== authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете отменить это действие за другого пользователя!");
             return;
          }
          await editVkMessage(VK_TOKEN, peerId, cmId, "Удаление ников отменено.", { preserveAttachment: true, keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }

       if (cmd === "confirm_deleteroles") {
          const authorId = Number(payloadObj.authorId || payloadObj.author_id || 0);
          if (authorId > 0 && userId !== authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете подтвердить это действие за другого пользователя!");
             return;
          }
          const clickingU = await getOrCreateUser(userId);
          const isOwner = await checkIsOwner(userId, peerId, clickingU.role);
          if (!isOwner && !isAdminMember && clickingU.role < 12) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Владелец беседы)!");
             return;
          }
          const chat = await getOrCreateChat(peerId);
          if (chat.roles) {
             for (const uId of Object.keys(chat.roles)) {
               const r = chat.roles[uId];
               if (r >= 1 && r <= 6) {
                 delete chat.roles[uId];
               }
             }
             await updateChat(peerId, { roles: chat.roles });
          }
          await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { preserveAttachment: true, keyboard: JSON.stringify({inline: true, buttons: []}) });
          await sendVkMessage(VK_TOKEN, peerId, "Уровни прав у всех пользователей с ролями от 1 до 6 в этой беседе были успешно сняты.");
          return;
       }

       if (cmd === "cancel_deleteroles") {
          const authorId = Number(payloadObj.authorId || payloadObj.author_id || 0);
          if (authorId > 0 && userId !== authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете отменить это действие за другого пользователя!");
             return;
          }
          await editVkMessage(VK_TOKEN, peerId, cmId, "Удаление уровней прав отменено.", { preserveAttachment: true, keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
`;

code = code.replace(/if \(cmd === "confirm_import"\)/, handlers + "\n       if (cmd === \"confirm_import\")");
fs.writeFileSync('server.ts', code);
