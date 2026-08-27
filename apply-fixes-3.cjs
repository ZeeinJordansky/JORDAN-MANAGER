const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const targetSync = `      if (["/sync", "/синхронизация", "/синх", "/синк", "/синхронизировать", "/resync"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const isAllowed = isVkAdmin || user.role >= 6 || userChatRole >= 6 || isAdmin;
         if (!isAllowed) return await sendResponse("У вас недостаточно прав!");

         const { profiles } = await getChatMembers(peerId);
         let syncCount = 0;
         for (const p of profiles) {
           if (p.id > 0) {
             await getOrCreateUser(p.id, \`\${p.first_name} \${p.last_name}\`);
             syncCount++;
           }
         }
         return await sendResponse(\`Синхронизация беседы успешно завершена!\\n\\n| Обновлено участников: \${syncCount}\`);
      }`;

const replacementSync = `      if (["/sync", "/синхронизация", "/синх", "/синк", "/синхронизировать", "/resync"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const isAllowed = isVkAdmin || user.role >= 6 || userChatRole >= 6 || isAdmin;
         if (!isAllowed) return await sendResponse("У вас недостаточно прав!");

         let titleSyncStr = "";
         try {
           const convRes = await axios.get("https://api.vk.com/method/messages.getConversationsById", {
             params: { access_token: VK_TOKEN, v: "5.199", peer_ids: peerId }
           });
           const convItem = convRes.data?.response?.items?.[0];
           if (convItem && convItem.chat_settings?.title) {
             const newTitle = convItem.chat_settings.title;
             await updateChat(peerId, { title: newTitle });
             titleSyncStr = \`\\n| Название беседы: \${newTitle}\`;
           }
         } catch (e) {}

         const { profiles } = await getChatMembers(peerId);
         let syncCount = 0;
         for (const p of profiles) {
           if (p.id > 0) {
             await getOrCreateUser(p.id, \`\${p.first_name} \${p.last_name}\`);
             syncCount++;
           }
         }
         return await sendResponse(\`Синхронизация беседы успешно завершена!\${titleSyncStr}\\n| Обновлено участников: \${syncCount}\`);
      }`;

if (code.includes(targetSync)) {
  code = code.replace(targetSync, replacementSync);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("SUCCESS: Replaced /sync block with title sync!");
} else {
  console.log("ERROR: targetSync not found");
}
