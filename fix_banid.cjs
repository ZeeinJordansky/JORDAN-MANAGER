const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/setowner") {`;

const banidStr = `
      if (rawCmd === "/banid") {
         if (user.role < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const cId = parseInt(args[1]);
         if (!cId || isNaN(cId)) return await sendResponse("Укажите Peer_id беседы!");
         
         await updateChat(cId, { banned: true });
         await sendResponse(\`[id\${userId}|\${fullName}] заблокировал(-а) беседу №\${cId}\`);
         
         try {
            await axios.get(\`https://api.vk.com/method/messages.send\`, { params: { access_token: VK_TOKEN, v: "5.199", peer_id: cId, random_id: Math.floor(Math.random() * 1000000), message: \`Беседа была заблокирована руководством бота.\\n\\nРабота бота в этой беседе прекращена.\` } });
            await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: cId - 2000000000, member_id: "-" + VK_GROUP_ID } });
         } catch (e) {}
         return;
      }

      if (rawCmd === "/unbanid") {
         if (user.role < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const cId = parseInt(args[1]);
         if (!cId || isNaN(cId)) return await sendResponse("Укажите Peer_id беседы!");
         
         await updateChat(cId, { banned: false });
         await sendResponse(\`[id\${userId}|\${fullName}] разблокировал(-а) беседу №\${cId}\`);
         
         // Bot cannot easily self-invite unless it has permissions or an admin does it, but we can try to send a message if it's still there.
         try {
            await axios.get(\`https://api.vk.com/method/messages.send\`, { params: { access_token: VK_TOKEN, v: "5.199", peer_id: cId, random_id: Math.floor(Math.random() * 1000000), message: \`Беседа была разблокирована руководством бота.\\n\\nРабота бота в этой беседе восстановлена.\` } });
         } catch (e) {}
         return;
      }

` + anchor;

code = code.replace(anchor, banidStr);
fs.writeFileSync('server.ts', code);
console.log("Banid cmds added");
