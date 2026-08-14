const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/addblack") {`;

const infochatStr = `
      if (rawCmd === "/infochat" || rawCmd === "/чатинфо" || rawCmd === "/инфочат" || rawCmd === "/chatinfo") {
         if (user.role < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const cId = parseInt(args[1]) || peerId;
         const chData = await getOrCreateChat(cId);
         
         let membersCount = 0;
         let title = "Неизвестно";
         let link = "Неизвестно";
         let sysAdminsCount = 0;
         let sysOwnerStr = "Неизвестно";
         
         if (cId > 2000000000) {
            try {
               const convRes = await vkApi.get("messages.getConversationsById", { peer_ids: cId });
               if (convRes.items && convRes.items[0]) {
                  const settings = convRes.items[0].chat_settings;
                  if (settings) {
                     membersCount = settings.members_count || 0;
                     title = settings.title || "Без названия";
                     if (settings.owner_id) {
                        const ou = await getOrCreateUser(settings.owner_id);
                        sysOwnerStr = \`[id\${settings.owner_id}|\${ou.nick || "Владелец"}]\`;
                     }
                  }
               }
               const linkRes = await vkApi.get("messages.getInviteLink", { peer_id: cId, reset: 0 }).catch(() => null);
               if (linkRes && linkRes.link) link = linkRes.link;
               
               const memRes = await vkApi.get("messages.getConversationMembers", { peer_id: cId }).catch(() => null);
               if (memRes && memRes.items) {
                  sysAdminsCount = memRes.items.filter((i: any) => i.is_admin).length;
               }
            } catch(e) {}
         }
         
         // Find local owner
         let localOwnerStr = "Неизвестно";
         const usersSnap = await firestoreDb.collection("users").get();
         usersSnap.forEach(doc => {
            const u = doc.data();
            if (u.chatRoles && u.chatRoles[cId] === 6) {
               localOwnerStr = \`[id\${u.userId}|\${u.nickname || u.nick || "Владелец"}]\`;
            }
         });
         
         const text = \`Информация о беседе \${cId}\\n\\n| Название беседы: \${title}\\n| Кол-во участников: \${membersCount}\\n\\n| Системный Владелец беседы: \${sysOwnerStr}\\n| Владелец беседы: \${localOwnerStr}\\n\\n| Кол-во системных администраторов беседы: \${sysAdminsCount}\\n\\n| Ссылка на вступление в беседу: \${link}\`;
         return await sendResponse(text);
      }

` + anchor;

code = code.replace(anchor, infochatStr);
fs.writeFileSync('server.ts', code);
console.log("Infochat added");
