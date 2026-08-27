const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `      if (rawCmd === "/увал" || rawCmd === "/уволить") {`;
const replacement1 = `      if (rawCmd === "/звезда" || rawCmd === "/датьзвезду") {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         if (!isOwner) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const res = await executeVkSetMemberRole(peerId, parsed.targetId, "admin");
         if (!res.success) {
            return await sendResponse(\`⚠️ Произошла ошибка\\n\\nVK говорит: \${res.errorMsg} (\${res.errorCode})\`);
         }
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
         return await sendResponse(\`[id\${userId}|\${fullName}] выдал(-а) права системного администратора (звездочку) [id\${parsed.targetId}|\${targetFullName}]\`, { noReply: true });
      }

      if (rawCmd === "/забратьзвезду" || rawCmd === "/снятьзвезду") {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         if (!isOwner) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const res = await executeVkSetMemberRole(peerId, parsed.targetId, "member");
         if (!res.success) {
            return await sendResponse(\`⚠️ Произошла ошибка\\n\\nVK говорит: \${res.errorMsg} (\${res.errorCode})\`);
         }
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
         return await sendResponse(\`[id\${userId}|\${fullName}] забрал(-а) права системного администратора (звездочку) у [id\${parsed.targetId}|\${targetFullName}]\`, { noReply: true });
      }

      if (rawCmd === "/увал" || rawCmd === "/уволить") {`;

code = code.replace(target1, replacement1);
fs.writeFileSync('server.ts', code);
console.log("Star commands added.");
