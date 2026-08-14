const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStats = `        let text = "";
        if (cmd === "stats_warns") {
           text = \`Информация о предупреждениях:\\n\\n| У пользователя [id\${payloadTargetId}|пользователя] \${targetUser.warnings || 0} предупреждений.\`;
        } else {
           text = \`Информация о блокировках:\\n\\n| Активная блокировка чата: \${targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "Да" : "Нет"}\`;
        }
        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
        await sendVkMessage(VK_TOKEN, peerId, text);`;

const newStats = `        let text = "";
        let snack = "";
        if (cmd === "stats_warns") {
           text = \`Информация о предупреждениях у [id\${payloadTargetId}|пользователя]:\\n\\n| Текущее количество: \${targetUser.warnings || 0}/3\`;
           snack = \`Предупреждений: \${targetUser.warnings || 0}/3\`;
        } else {
           const isActive = targetUser.muteUntil && targetUser.muteUntil > Date.now();
           const lockText = isActive ? \`Активная блокировка чата: Да\\nДо: \${new Date(targetUser.muteUntil).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\\nПричина: \${targetUser.muteReason || 'нет'}\` : \`Активной блокировки чата нет.\`;
           text = \`Информация о блокировке чата у [id\${payloadTargetId}|пользователя]:\\n\\n\${lockText}\`;
           snack = isActive ? "Есть активная блокировка" : "Блокировок нет";
        }
        await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: snack });
        await sendVkMessage(VK_TOKEN, peerId, text);`;

code = code.replace(oldStats, newStats);
fs.writeFileSync('server.ts', code);
console.log("Stats bans fixed");
