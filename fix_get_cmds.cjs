const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (rawCmd === "/mute") {`;
const cmdsStr = `
      if (rawCmd === "/getmute") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);
         const isActive = tUser.muteUntil && tUser.muteUntil > Date.now();
         const text = isActive ? \`Активная блокировка чата: Да\\nДо: \${new Date(tUser.muteUntil).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\\nПричина: \${tUser.muteReason || 'нет'}\` : \`Активной блокировки чата нет.\`;
         return await sendResponse(\`Информация о блокировке чата у [id\${parsed.targetId}|пользователя]:\\n\\n\${text}\`);
      }

      if (rawCmd === "/getwarn" || rawCmd === "/getwarns") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);
         return await sendResponse(\`Информация о предупреждениях у [id\${parsed.targetId}|пользователя]:\\n\\n| Текущее количество: \${tUser.warnings || 0}/3\`);
      }

      if (rawCmd === "/getban") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);
         const isGban = tUser.gban;
         const isGbanpl = tUser.gbanpl;
         let text = "Блокировок нет.";
         if (isGban) text = "Глобальная блокировка во всех беседах.";
         else if (isGbanpl) text = "Глобальная блокировка во всех беседах игроков.";
         return await sendResponse(\`Информация о блокировках у [id\${parsed.targetId}|пользователя]:\\n\\n| Статус: \${text}\`);
      }

` + anchor;

code = code.replace(anchor, cmdsStr);
fs.writeFileSync('server.ts', code);
console.log("Get cmds added");
