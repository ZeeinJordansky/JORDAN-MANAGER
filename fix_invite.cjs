const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor1 = `    // Check if bot was added to the conversation
    if (message.action) {
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
          const greeting = \`GAMES MANAGER был добавлен в беседу.\\n\\n\` +
            \`Если вы желаете, что бы бот отвечал на команды без префикса, выдайте ему права администратора.\\n\\n\` +
            \`Если вы желаете, что бы бот отвечал на команды которые только начинаются с префиксов, не выдавайте ему права администратора.\`;
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          await sendVkMessage(VK_TOKEN, 2000000010, \`🔧 Бот добавлен в беседу!\\n\\n| Peer_id: \${peerId}\\n| Пользователь: [id\${userId}|\${userId}]\`);
          return;
        }
      }
    }`;

const newAnchor1 = `    // Check if bot was added to the conversation
    if (message.action) {
      const chatData = await getOrCreateChat(peerId);
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
          const greeting = \`JORDAN MANAGER был добавлен в беседу.\\n\\nВыдайте ему права администратора для началы работы с ним.\\n\\nПосле выдачи прав администратора, активируйте беседу по команде - /start и выберите тип беседы с помощью команды - /type\`;
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          return;
        } else if (memberId < 0) { // It's a group
          if (chatData.group) {
             await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|Пользователь], добавлять сообщества в беседу запрещено!\`);
             try {
               await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
        } else {
          // It's a user
          if (act === "chat_invite_user_by_link" && chatData.raid) {
             await sendVkMessage(VK_TOKEN, peerId, \`Вход в беседу через ссылку запрещён настройками.\`);
             try {
               await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
          const uData = await getOrCreateUser(memberId);
          if (uData.gban || (chatData.type === "PL" && uData.gbanpl)) {
             await sendVkMessage(VK_TOKEN, peerId, \`Данный пользователь находится в глобальной блокировке.\`);
             try {
               await axios.get(\`https://api.vk.com/method/messages.removeChatUser\`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
          if (chatData.welcometext_enabled && chatData.welcometext) {
             let wText = chatData.welcometext;
             wText = wText.replace(/%u/g, \`id\${memberId}\`);
             wText = wText.replace(/%n/g, \`[id\${memberId}|\${uData.nick || "Участник"}]\`);
             wText = wText.replace(/%i/g, \`id\${userId}\`);
             wText = wText.replace(/%p/g, \`[id\${userId}|Пользователь]\`); // simplified
             await sendVkMessage(VK_TOKEN, peerId, wText);
          }
        }
      }
    }`;

code = code.replace(anchor1, newAnchor1);
fs.writeFileSync('server.ts', code);
console.log("Invites fixed");
