const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/addblack") {`;

const gbanStr = `
      if (rawCmd === "/gbanpl") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const reason = args.slice(2).join(" ") || "без причины";
         await updateUser(parsed.targetId, { gbanpl: true, gbanReason: reason });
         
         const chatsSnap = await firestoreDb.collection("chats").get();
         chatsSnap.forEach(async (doc) => {
            const c = doc.data();
            if (c.id && c.type === "PL") {
               try {
                 await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 await sendVkMessage(VK_TOKEN, c.id, \`[id\${userId}|\${fullName}] заблокировал(-а) [id\${parsed.targetId}|пользователя] во всех беседах игроков!\\n\\n| Причина: \${reason}\`);
               } catch(e) {}
            }
         });
         return await sendResponse(\`[id\${userId}|\${fullName}] заблокировал(-а) [id\${parsed.targetId}|пользователя] во всех беседах игроков\\n\\n| Причина: \${reason}\`, { keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungbanpl", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/gban") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const reason = args.slice(2).join(" ") || "без причины";
         await updateUser(parsed.targetId, { gban: true, gbanReason: reason });
         
         const chatsSnap = await firestoreDb.collection("chats").get();
         chatsSnap.forEach(async (doc) => {
            const c = doc.data();
            if (c.id) {
               try {
                 await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 await sendVkMessage(VK_TOKEN, c.id, \`[id\${userId}|\${fullName}] заблокировал(-а) [id\${parsed.targetId}|пользователя] во всех беседах!\\n\\n| Причина: \${reason}\`);
               } catch(e) {}
            }
         });
         return await sendResponse(\`[id\${userId}|\${fullName}] заблокировал(-а) [id\${parsed.targetId}|пользователя] во всех беседах\\n\\n| Причина: \${reason}\`, { keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungban", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/ungbanpl" || rawCmd === "/gungbanp" || rawCmd === "/юнгбанпл" || rawCmd === "/ангбанл" || rawCmd === "/унгбанплl") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gbanpl: false });
         return await sendResponse(\`[id\${userId}|\${fullName}] снял(-а) глобальную блокировку во всех беседах игроков с [id\${parsed.targetId}|пользователя]\`);
      }

      if (rawCmd === "/ungban" || rawCmd === "/юнгбан" || rawCmd === "/унгбан" || rawCmd === "/ангбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gban: false });
         return await sendResponse(\`[id\${userId}|\${fullName}] снял(-а) глобальную блокировку во всех беседах с [id\${parsed.targetId}|пользователя]\`);
      }

` + anchor;

code = code.replace(anchor, gbanStr);

const payloadsStr = `
         if (cmd === "mod_ungbanpl") {
            await updateUser(tId, { gbanpl: false });
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Пользователь] снял(-а) глобальную блокировку во всех беседах игроков с [id\${tId}|пользователя]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
         if (cmd === "mod_ungban") {
            await updateUser(tId, { gban: false });
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Пользователь] снял(-а) глобальную блокировку во всех беседах с [id\${tId}|пользователя]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
`;

code = code.replace(/if \(cmd === "mod_giveowner_no"\) {/, payloadsStr + `\n         if (cmd === "mod_giveowner_no") {`);
fs.writeFileSync('server.ts', code);
console.log("GBan added");
