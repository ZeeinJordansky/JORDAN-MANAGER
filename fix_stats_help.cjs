const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const profileSearch = `if (["/профиль", "/profile", "/проф", "/stats", "/стата", "/статистика"].includes(rawCmd)) {`;
const profileReplacement = `if (["/профиль", "/profile", "/проф"].includes(rawCmd)) {`;

code = code.replace(profileSearch, profileReplacement);

// We need to inject the /stats and /help commands. Let's find a good spot, e.g. right before /баланс
const balanceSearch = `if (["/баланс", "/balance", "/б", "/bal", "/бал"].includes(rawCmd)) {`;

const newCode = `      if (["/stats", "/стата", "/статистика", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd)) {
        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const resData = await getStatsMainPage(targetId, peerId, userId);
        return await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard) });
      }

      if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands"].includes(rawCmd)) {
        let text = "...::Помощь по командам бота::...\\n\\nКоманды пользователей:\\n/help - Помощь по командам.\\n/gamehelp - Помощь по игровым командам.\\n/stats - Узнать статистику пользователя.\\n/ping - Узнать пинг бота.\\n/infobot - Информация о боте.\\n/q - Покинуть беседу.";
        let availableButtons = [];
        const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
        const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
        if (effRole >= 1) availableButtons.push({ cmd: "help_moder", label: "Модератор" });
        if (effRole >= 2) availableButtons.push({ cmd: "help_smoder", label: "Ст. Модератор" });
        if (effRole >= 3) availableButtons.push({ cmd: "help_admin", label: "Администратор" });
        if (effRole >= 4) availableButtons.push({ cmd: "help_sadmin", label: "Ст. Администратор" });
        if (effRole >= 5) availableButtons.push({ cmd: "help_zsa", label: "Зам. Спец. Администратора" });
        if (effRole >= 6) availableButtons.push({ cmd: "help_sa", label: "Спец. Администратор" });
        if (effRole >= 7) availableButtons.push({ cmd: "help_zsr", label: "Зам. Создателя" });
        if (effRole >= 8) availableButtons.push({ cmd: "ghelp_zr", label: "Зам. Руководителя" });
        if (effRole >= 9) availableButtons.push({ cmd: "ghelp_ozr", label: "Осн. Зам. Руководителя" });
        if (effRole >= 10) availableButtons.push({ cmd: "ghelp_ruk", label: "Руководитель" });
        if (effRole >= 10.5) availableButtons.push({ cmd: "ghelp_gruk", label: "Глав. Руководитель" });
        if (effRole >= 11) availableButtons.push({ cmd: "ghelp_zown", label: "Зам. Владельца" });
        if (effRole >= 12) availableButtons.push({ cmd: "ghelp_own", label: "Владелец бота" });
        
        let row = [];
        let keyboard = { inline: true, buttons: [] };
        for (const btn of availableButtons) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: userId }) }, color: "secondary" });
          if (row.length === 2) {
             keyboard.buttons.push(row);
             row = [];
          }
        }
        if (row.length > 0) keyboard.buttons.push(row);
        
        return await sendResponse(text, { keyboard: JSON.stringify(keyboard) });
      }

      ` + balanceSearch;

if (code.includes(balanceSearch)) {
  code = code.replace(balanceSearch, newCode);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Injected /stats and /help !");
} else {
  console.log("Could not find balance search.");
}
