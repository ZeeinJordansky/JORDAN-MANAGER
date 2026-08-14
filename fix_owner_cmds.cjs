const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/giveowner") {`;

const cmdsStr = `
      // Chat owner commands
      if (rawCmd === "/af") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !(chatData.af);
         await updateChat(peerId, { af: newVal });
         return await sendResponse(\`[id\${userId}|\${fullName}] \${newVal ? 'включил(-а)' : 'выключил(-а)'} систему анти-флуд сообщениями\`);
      }
      
      if (rawCmd === "/antisliv") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !(chatData.antisliv);
         await updateChat(peerId, { antisliv: newVal });
         return await sendResponse(\`[id\${userId}|\${fullName}] \${newVal ? 'включил(-а)' : 'выключил(-а)'} систему анти-слив беседы\`);
      }

      if (rawCmd === "/raid") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !(chatData.raid);
         await updateChat(peerId, { raid: newVal });
         return await sendResponse(\`[id\${userId}|\${fullName}] \${newVal ? 'включил(-а)' : 'выключил(-а)'} систему анти-рейд беседы\`);
      }

      if (rawCmd === "/group") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !(chatData.group);
         await updateChat(peerId, { group: newVal });
         return await sendResponse(\`[id\${userId}|\${fullName}] \${newVal ? 'включил(-а)' : 'выключил(-а)'} систему анти-сообщества\`);
      }

      if (rawCmd === "/addblack") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         // Ban in vk group
         try {
            await axios.get(\`https://api.vk.com/method/groups.ban\`, { params: { access_token: VK_TOKEN, v: "5.199", group_id: 228020832, owner_id: parsed.targetId } });
            return await sendResponse(\`[id\${userId}|\${fullName}] добавил(-а) [id\${parsed.targetId}|пользователя] в черный список сообщества.\`);
         } catch (e) {
            return await sendResponse(\`Ошибка при добавлении в чс: \${e.message}\`);
         }
      }

      if (rawCmd === "/setowner") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 6 });
         return await sendResponse(\`[id\${userId}|\${fullName}] назначил(-а) [id\${parsed.targetId}|пользователя] владельцем текущей беседы.\`);
      }
` + anchor;

code = code.replace(anchor, cmdsStr);
fs.writeFileSync('server.ts', code);
console.log("Owner cmds added");
