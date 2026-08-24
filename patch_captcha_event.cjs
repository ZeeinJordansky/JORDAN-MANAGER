const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const captchaEventCode = `    if (cmd === "captcha") {
      const selectedCode = payloadObj.code;
      if (activeCaptchas.has(userId)) {
        const cState = activeCaptchas.get(userId);
        if (cState.cmid === cmId) {
          if (selectedCode === cState.code) {
            clearTimeout(cState.timeout);
            activeCaptchas.delete(userId);
            await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Успешно! Вы прошли проверку на человека.");
            eventAnsweredMap.set(eventId, true);
            
            await editVkMessage(VK_TOKEN, peerId, cmId, "Мы смогли убедиться, что вы человек, можете продолжать пользоваться ботом.", {
              keyboard: JSON.stringify({ buttons: [], inline: true })
            }).catch(() => {});
          } else {
            // Immediately fail if wrong button
            clearTimeout(cState.timeout);
            activeCaptchas.delete(userId);
            await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Неверный код! Вы не прошли капчу.");
            eventAnsweredMap.set(eventId, true);
            
            await editVkMessage(VK_TOKEN, peerId, cmId, "Вы выбрали неверный код.", {
              keyboard: JSON.stringify({ buttons: [], inline: true })
            }).catch(() => {});
            
            const user = await getOrCreateUser(userId);
            const expireDate = new Date(Date.now() + 120 * 60000);
            await updateUser(userId, {
              mute: true,
              muteAdminId: 0,
              muteReason: "Не прошёл капчу (неверный код)",
              muteExpires: expireDate.toISOString()
            });
            userCache.delete(userId);
            const fullName = user.fullName || user.nick || "Пользователь";
            const muteMsg = \`[id\${userId}|\${fullName}] получил(-а) блокировку чата на 120 минут из-за непрохождения капчи. (#CAPTCHA)\`;
            await sendVkMessageLocal(VK_TOKEN, peerId, muteMsg);
          }
        } else {
           await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Это не ваша капча!");
           eventAnsweredMap.set(eventId, true);
        }
      } else {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Капча уже не актуальна или не для вас.");
        eventAnsweredMap.set(eventId, true);
      }
      return;
    }`;

code = code.replace('if (cmd) {', 'if (cmd) {\n' + captchaEventCode);
fs.writeFileSync('server.ts', code);
