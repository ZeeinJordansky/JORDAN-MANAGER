const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update gban
const gbanOldRegex = /if \(rawCmd === "\/gban" \|\| rawCmd === "\/гбан"\) \{[\s\S]*?return await sendResponse\(responseText, \{ noReply: true, keyboard: JSON\.stringify\(keyboard\) \}\);[\s\S]*?\}/;
const gbanNew = `if (rawCmd === "/gban" || rawCmd === "/гбан") {
           if (user.role < 7 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
           const parsed = await parseTargetUser(message, args.slice(1));
           if (!parsed.targetId) return await sendResponse(\`Для выполнения команды, укажите аргументы.\\n\\n| Пример: \${rawCmd} [ссылка/упоминание] [срок] [причина]\`);
           
           const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
           
           const kb = {
             inline: true,
             buttons: [
               [{ action: { type: "callback", label: "Да, заблокировать", payload: JSON.stringify({ cmd: "confirm_gban", targetId: parsed.targetId, authorId: userId, args: remainingArgs }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет, не блокировать", payload: JSON.stringify({ cmd: "cancel_gban", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
             ]
           };
           return await sendResponse("Вы действительно хотите заблокировать пользователя во всех беседах?", { keyboard: JSON.stringify(kb) });
      }`;

if (gbanOldRegex.test(code)) {
    code = code.replace(gbanOldRegex, gbanNew);
} else {
    console.log("gbanOldRegex not found");
}

// Update ungban
const ungbanOldRegex = /\/\/ \/ungban[\s\S]*?if \(\["\/ungban", "\/унгбан", "\/разгбан", "\/разбанвовсех"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(`✅ \$\{formatUserMention\(parsed\.targetId, "Пользователь", "nom"\)\} был\(-а\) разблокирован\(-а\) во всех беседах\.\\n\\n\| Модератор - \$\{formatUserMention\(userId, String\(fullName\), "nom"\)\}\\n\\n#ungban \| #id\$\{userId\} \| #id\$\{parsed\.targetId\}`, \{ noReply: true \}\);\s*\}/;
const ungbanNew = `        // /ungban
        if (["/ungban", "/унгбан", "/разгбан", "/разбанвовсех"].includes(rawCmd)) {
            if (user.role < 7 && !isAdmin) return await sendResponse("Ваш уровень прав недостаточный для выполнения этой команды.");
            const parsed = await parseTargetUser(message, args.slice(1));
            if (!parsed.targetId) return await sendResponse(\`Для выполнения команды, укажите аргументы.\\n\\n| Пример: \${rawCmd} [ссылка/упоминание]\`);
            
            await updateUser(parsed.targetId, { gban: false, gbanBy: null, gbanReason: null, gbanDate: null, gbanExpiresAt: null });
            return await sendResponse(\`✅ \${formatUserMention(parsed.targetId, "Пользователь", "nom")} был(-а) разблокирован(-а) во всех беседах.\\n\\n| Модератор - \${formatUserMention(userId, String(fullName), "nom")}\\n\\n#ungban | #id\${userId} | #id\${parsed.targetId}\`, { noReply: true });
        }`;

if (ungbanOldRegex.test(code)) {
    code = code.replace(ungbanOldRegex, ungbanNew);
} else {
    console.log("ungbanOldRegex not found");
}

fs.writeFileSync('server.ts', code);
