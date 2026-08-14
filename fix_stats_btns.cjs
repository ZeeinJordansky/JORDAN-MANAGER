const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const botHelpCmdsStr = `
      const botHelpCmds = ["cmd_help_main", "help_moder", "help_smoder", "cmd_help_admin_bot", "help_sadmin", "help_sa", "help_owner"];
`;
const statsBtnsStr = `
      if (cmd === "stats_warns" || cmd === "stats_bans") {
        const payloadTargetId = payloadObj.targetId;
        if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
        const targetUser = await getOrCreateUser(payloadTargetId);
        
        let text = "";
        if (cmd === "stats_warns") {
           text = \`Информация о предупреждениях:\\n\\n| У пользователя [id\${payloadTargetId}|пользователя] \${targetUser.warnings || 0} предупреждений.\`;
        } else {
           text = \`Информация о блокировках:\\n\\n| Активная блокировка чата: \${targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "Да" : "Нет"}\`;
        }
        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
        await sendVkMessage(VK_TOKEN, peerId, text, { disable_mentions: 1 });
        return;
      }
      
      const botHelpCmds = ["cmd_help_main", "help_moder", "help_smoder", "cmd_help_admin_bot", "help_sadmin", "help_sa", "help_owner"];
`;

code = code.replace(botHelpCmdsStr.trim(), statsBtnsStr.trim());
fs.writeFileSync('server.ts', code);
console.log("Stats btns fixed");
