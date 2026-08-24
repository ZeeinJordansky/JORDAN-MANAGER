const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update testcaptcha logic to ignore silently
const oldTest = `      if (rawCmd === "/testcaptcha") {
         if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
         const triggered = await triggerCaptcha(userId, peerId, message);
         if (!triggered) return await sendResponse("Ошибка отправки капчи (фото не загрузилось).");
         return;
      }`;
const newTest = `      if (rawCmd === "/testcaptcha") {
         if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
         await triggerCaptcha(userId, peerId, message); // will log to console on fail but not reply
         return;
      }`;
code = code.replace(oldTest, newTest);

// 2. Update triggerCaptcha buttons to include uid
const oldButtons = `        { action: { type: "callback", label: allCodes[0], payload: JSON.stringify({ cmd: "captcha", code: allCodes[0] }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[1], payload: JSON.stringify({ cmd: "captcha", code: allCodes[1] }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: allCodes[2], payload: JSON.stringify({ cmd: "captcha", code: allCodes[2] }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[3], payload: JSON.stringify({ cmd: "captcha", code: allCodes[3] }) }, color: "secondary" }`;
const newButtons = `        { action: { type: "callback", label: allCodes[0], payload: JSON.stringify({ cmd: "captcha", code: allCodes[0], uid: userId }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[1], payload: JSON.stringify({ cmd: "captcha", code: allCodes[1], uid: userId }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: allCodes[2], payload: JSON.stringify({ cmd: "captcha", code: allCodes[2], uid: userId }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[3], payload: JSON.stringify({ cmd: "captcha", code: allCodes[3], uid: userId }) }, color: "secondary" }`;
code = code.replace(oldButtons, newButtons);

// 3. Update the event handler for captcha
const oldEvent = `    if (cmd === "captcha") {
      const selectedCode = payloadObj.code;
      if (activeCaptchas.has(userId)) {`;
const newEvent = `    if (cmd === "captcha") {
      const targetUid = payloadObj.uid;
      if (targetUid && targetUid !== userId) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Это не ваша капча!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      const selectedCode = payloadObj.code;
      if (activeCaptchas.has(userId)) {`;
code = code.replace(oldEvent, newEvent);

// 4. Update the toast message for incorrect captcha code
const oldToast = `await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Неверный код! Вы не прошли капчу.");`;
const newToast = `await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Неверный код!");`;
code = code.replace(oldToast, newToast);

fs.writeFileSync('server.ts', code);
