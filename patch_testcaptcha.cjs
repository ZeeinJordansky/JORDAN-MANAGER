const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const testCmd = `
      if (rawCmd === "/testcaptcha") {
         if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
         await triggerCaptcha(userId, peerId, message);
         return;
      }
`;
code = code.replace('if (rawCmd === "/closebot"', testCmd.trim() + '\n      if (rawCmd === "/closebot"');

fs.writeFileSync('server.ts', code);
