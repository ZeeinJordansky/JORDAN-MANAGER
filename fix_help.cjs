const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const botHelpCmdsStr = `
      const botHelpCmds = ["cmd_help_main", "help_moder", "help_smoder", "cmd_help_admin_bot", "help_sadmin", "help_sa", "help_owner"];
      if (botHelpCmds.includes(cmd)) {
        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
        
        let text = "";
        if (cmd === "cmd_help_main") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды пользователей:\\n/help - Помощь по командам.\\n/stats - Узнать статистику пользователя.\\n/ping - Узнать пинг бота.\\n/gamehelp - Игровые команды бота.\`;
        } else if (cmd === "help_moder") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Модератора:\\n/mute -- Выдать блокировку чата пользователю.\\n/unmute -- Снять блокировку чата пользователю.\\n/warn -- Выдать предупреждение пользователю.\\n/unwarn -- Снять предупреждение пользователю.\`;
        } else if (cmd === "help_smoder") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Старшего Модератора:\\n/addmoder -- Выдать права модератора.\`;
        } else if (cmd === "cmd_help_admin_bot") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Администратора:\\n(Здесь команды администратора)\`;
        } else if (cmd === "help_sadmin") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Старшего Администратора:\\n/addadmin -- Выдать права администратора.\`;
        } else if (cmd === "help_sa") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Специального Администратора:\\n/addsenadmin -- Выдать права старшего администратора.\`;
        } else if (cmd === "help_owner") {
          text = \`...::Помощь по командам бота::...\\n\\nКоманды Владельца беседы:\\n/type - Изменить тип беседы.\\n/giveowner -- Передать права владельца.\`;
        }

        let keyboard = { inline: true, buttons: [] };
        let availableButtons = [];
        if (user.role >= 1) availableButtons.push({ cmd: "help_moder", label: "Модератор" });
        if (user.role >= 2) availableButtons.push({ cmd: "help_smoder", label: "Ст. Модератор" });
        if (user.role >= 3) availableButtons.push({ cmd: "cmd_help_admin_bot", label: "Администратор" });
        if (user.role >= 4) availableButtons.push({ cmd: "help_sadmin", label: "Ст. Администратор" });
        if (user.role >= 5) availableButtons.push({ cmd: "help_sa", label: "Спец. Администратор" });
        if (user.role >= 6) availableButtons.push({ cmd: "help_owner", label: "Владелец беседы" });
        
        let row = [];
        for (const btn of availableButtons) {
          if (btn.cmd !== cmd) {
            row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
            if (row.length === 2) {
              keyboard.buttons.push(row);
              row = [];
            }
          }
        }
        if (row.length > 0) keyboard.buttons.push(row);
        
        if (cmd !== "cmd_help_main") {
           keyboard.buttons.push([{ action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "secondary" }]);
        }

        await editVkMessage(VK_TOKEN, peerId, cmId, text, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
        return;
      }
`;

const cmdHelpStr = `
      if (rawCmd === "/help" || rawCmd === "/помощь" || rawCmd === "/хелп" || rawCmd === "/команды" || rawCmd === "/other") {
        let helpText = \`...::Помощь по командам бота::...\\n\\nКоманды пользователей:\\n/help - Помощь по командам.\\n/stats - Узнать статистику пользователя.\\n/ping - Узнать пинг бота.\\n/gamehelp - Игровые команды бота.\`;

        let keyboard = { inline: true, buttons: [] };
        let availableButtons = [];
        if (user.role >= 1) availableButtons.push({ cmd: "help_moder", label: "Модератор" });
        if (user.role >= 2) availableButtons.push({ cmd: "help_smoder", label: "Ст. Модератор" });
        if (user.role >= 3) availableButtons.push({ cmd: "cmd_help_admin_bot", label: "Администратор" });
        if (user.role >= 4) availableButtons.push({ cmd: "help_sadmin", label: "Ст. Администратор" });
        if (user.role >= 5) availableButtons.push({ cmd: "help_sa", label: "Спец. Администратор" });
        if (user.role >= 6) availableButtons.push({ cmd: "help_owner", label: "Владелец беседы" });
        
        let row = [];
        for (const btn of availableButtons) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
        if (row.length > 0) keyboard.buttons.push(row);

        return await sendResponse(helpText, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
      }
`;

code = code.replace(/const botHelpCmds = \["cmd_help_main"[\s\S]*?return;\n      }/, botHelpCmdsStr.trim());
code = code.replace(/if \(rawCmd === "\/help"[\s\S]*?return await sendResponse\(helpText, keyboard\.buttons\.length > 0 \? { keyboard: JSON\.stringify\(keyboard\) } : {}\);\n      }/, cmdHelpStr.trim());

fs.writeFileSync('server.ts', code);
console.log("Help fixed");
