const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCaller = `        if (history.timestamps.length >= 10) {
          await triggerCaptcha(userId, peerId, message);
          return;
        }`;

const newCaller = `        if (history.timestamps.length >= 10) {
          const triggered = await triggerCaptcha(userId, peerId, message);
          if (triggered) {
            return;
          } else {
            history.timestamps = []; // reset if failed to upload photo
          }
        }`;

code = code.replace(oldCaller, newCaller);

// And update the testcaptcha caller
const oldTest = `      if (rawCmd === "/testcaptcha") {
         if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
         await triggerCaptcha(userId, peerId, message);
         return;
      }`;

const newTest = `      if (rawCmd === "/testcaptcha") {
         if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
         const triggered = await triggerCaptcha(userId, peerId, message);
         if (!triggered) return await sendResponse("Ошибка отправки капчи (фото не загрузилось).");
         return;
      }`;

code = code.replace(oldTest, newTest);

fs.writeFileSync('server.ts', code);
