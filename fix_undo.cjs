const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The block I inserted was:
// origHelpCode = orig.substring(helpStart, helpEnd).replace(/\/\/ \/warn \& \/swarn\s*$/, '');
// Then I inserted it at helpStartCurrent, replacing the old help block.
// Let's just find the first `if (["/help", "/помощь"...` and the next `// /warn & /swarn`.
// Wait, the old help block was exactly what was there before!
// If I just find the first `/help` in server.ts and remove everything up to the next `      // /warn & /swarn` and replace with my tiny `/help` block, it will be fixed!

const helpStartCurrent = code.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');
const helpEndCurrent = code.indexOf('// /warn & /swarn', helpStartCurrent + 100);

if (helpStartCurrent !== -1 && helpEndCurrent !== -1) {
   const before = code.substring(0, helpStartCurrent);
   const after = code.substring(helpEndCurrent);
   const tinyHelp = `if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {
         let helpText = "...::Помощь по командам бота::...\\n\\nКоманды пользователей:\\n/help - Помощь по командам.\\n/gamehelp - Помощь по игровым командам.\\n/stats - Узнать статистику пользователя.\\n/ping - Узнать пинг бота.\\n/infobot - Информация о боте.\\n/q - Покинуть беседу.";
         return await sendResponse(helpText);
      }
      `;
   code = before + tinyHelp + after;
   fs.writeFileSync('server.ts', code, 'utf8');
   console.log("Reverted! Size:", code.length);
} else {
   console.log("Could not revert.");
}
