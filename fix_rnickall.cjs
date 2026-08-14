const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/gnick") {`;
const cmdsStr = `
      if (rawCmd === "/rnickall") {
         if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         for (const p of profiles) {
            if (p.id > 0) {
               const u = await getOrCreateUser(p.id);
               if (u.chatNicks && u.chatNicks[peerId]) {
                  delete u.chatNicks[peerId];
                  await updateUser(p.id, { chatNicks: u.chatNicks });
               }
            }
         }
         return await sendResponse(\`[id\${userId}|\${fullName}] очистил(-а) все ники в текущей беседе!\`);
      }
      
      if (rawCmd === "/nlist") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         let list = "Список пользователей с никами:\\n\\n";
         let i = 1;
         for (const p of profiles) {
            if (p.id > 0) {
               const u = await getOrCreateUser(p.id);
               if (u.chatNicks && u.chatNicks[peerId]) {
                  list += \`\${i}. [id\${p.id}|\${p.first_name} \${p.last_name}] - \${u.chatNicks[peerId]}\\n\`;
                  i++;
               }
            }
         }
         if (i === 1) list += "Ников не найдено.";
         return await sendResponse(list);
      }

` + anchor;

code = code.replace(anchor, cmdsStr);
fs.writeFileSync('server.ts', code);
console.log("Rnickall added");
