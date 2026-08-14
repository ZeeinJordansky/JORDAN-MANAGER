const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/rnickall") {`;
const silenceCmdStr = `
      if (rawCmd === "/тишина") {
         if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.silence;
         await updateChat(peerId, { silence: newVal });
         return await sendResponse(\`[id\${userId}|\${fullName}] \${newVal ? 'включил(-а)' : 'выключил(-а)'} режим тишины.\\n\\nТеперь все сообщения обычных пользователей будут удаляться!\`);
      }
` + anchor;

code = code.replace(anchor, silenceCmdStr);

const filterAnchor = `      if (checkFlood(peerId, userId, chatData)) {`;
const filterNew = `      if (chatData.silence && (!user.role || user.role < 3) && !isAdmin) {
         try {
           await axios.get(\`https://api.vk.com/method/messages.delete\`, { params: { access_token: VK_TOKEN, v: "5.199", message_ids: message.conversation_message_id, delete_for_all: 1, peer_id: peerId } });
         } catch (e) {}
         return; // silence mode
      }

      if (checkFlood(peerId, userId, chatData)) {`;

code = code.replace(filterAnchor, filterNew);
fs.writeFileSync('server.ts', code);
console.log("Silence added");
