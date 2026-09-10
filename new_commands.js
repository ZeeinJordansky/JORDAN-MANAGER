import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const commands = `
        // /deletenicknames
        if (["/deletenicknames", "/delnicks", "/удалитьники"].includes(rawCmd)) {
          const isOwner = await checkIsOwner(userId, peerId, user.role);
          if (!isOwner && !isAdmin && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Подтвердить", payload: JSON.stringify({ cmd: "confirm_deletenicks" }) }, color: "positive" },
                { action: { type: "callback", label: "Отмена", payload: JSON.stringify({ cmd: "cancel_deletenicks" }) }, color: "negative" }
              ]
            ]
          };
          return await sendResponse("Вы действительно хотите удалить все ники у пользователей в этой беседе?", { noReply: true, keyboard: JSON.stringify(keyboard) });
        }

        // /deleteaccesslevel
        if (["/deleteaccesslevel", "/delroles", "/удалитьроли"].includes(rawCmd)) {
          const isOwner = await checkIsOwner(userId, peerId, user.role);
          if (!isOwner && !isAdmin && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Подтвердить", payload: JSON.stringify({ cmd: "confirm_deleteroles" }) }, color: "positive" },
                { action: { type: "callback", label: "Отмена", payload: JSON.stringify({ cmd: "cancel_deleteroles" }) }, color: "negative" }
              ]
            ]
          };
          return await sendResponse("Вы действительно хотите снять уровень прав (от 1 до 6) всем пользователям в этой беседе?", { noReply: true, keyboard: JSON.stringify(keyboard) });
        }

        // /import
        if (["/import", "/импорт"].includes(rawCmd)) {
          const isOwner = await checkIsOwner(userId, peerId, user.role);
          if (!isOwner && !isAdmin && user.role < 12) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;

          const sourcePeerId = parseInt(args[1]);
          if (!sourcePeerId || isNaN(sourcePeerId)) return await sendResponse("Укажите ID беседы (peer_id) с которой нужно импортировать данные!");

          const sourceChat = await getOrCreateChat(sourcePeerId);
          const isSourceOwner = await checkIsOwner(userId, sourcePeerId, user.role);
          if (!isSourceOwner && !isAdmin && user.role < 12) return await sendResponse(\`Вы не являетесь владельцем беседы \${sourcePeerId}.\`);

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Подтвердить", payload: JSON.stringify({ cmd: "confirm_import", sourceId: sourcePeerId }) }, color: "positive" },
                { action: { type: "callback", label: "Отмена", payload: JSON.stringify({ cmd: "cancel_import" }) }, color: "negative" }
              ]
            ]
          };
          return await sendResponse(\`Вы действительно хотите импортировать все данные из беседы \${sourcePeerId}? Все настройки этой беседы будут заменены, а в исходной беседе настройки будут сброшены (Владелец сохранится).\`, { noReply: true, keyboard: JSON.stringify(keyboard) });
        }
`;

code = code.replace(/\/\/ \/giveowner/g, commands + "\n        // /giveowner");
fs.writeFileSync('server.ts', code);
