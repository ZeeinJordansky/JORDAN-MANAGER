import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const newCallbackCode = `    // Business callbacks
    if (cmd === "biz_collect_new" || cmd === "biz_renew" || cmd === "biz_my_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }

      if (cmd === "biz_collect_new") {
        const incomeAcc = user.bizIncomeAcc || 0;
        if (incomeAcc <= 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Нет дохода для снятия!");
        
        await updateUser(userId, { balance: (user.balance || 0) + incomeAcc, bizIncomeAcc: 0 });
        sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName}] снял(-а) деньги с баланса бизнесов\`);
        return;
      }

      if (cmd === "biz_renew") {
        const now = Date.now();
        const expireAt = user.bizExpireAt || 0;
        if (expireAt > now) {
           return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бизнесы еще работают!");
        }
        await updateUser(userId, { bizExpireAt: now + 5 * 3600 * 1000, lastBizCollectTime: Math.floor(now / 1000) });
        sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName}] продлил(-а) работу бизнесов\`);
        return;
      }

      if (cmd === "biz_my_list") {
         const bCount = user.businesses || 0;
         const bType = user.bizType || 0;
         if (bCount === 0 || bType === 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас нет бизнесов!");

         const bizInfo = BIZ_TYPES[bType as keyof typeof BIZ_TYPES];
         
         const txt = \`Список бизнесов пользователя [id\${userId}|\${fullName}]\\n\\n\${bizInfo.name} | Кол-во: \${bCount}\`;
         if (bizInfo.img) {
            const photoAttachment = await uploadPhoto(peerId, bizInfo.img);
            sendVkMessage(VK_TOKEN, peerId, txt, { attachment: photoAttachment });
         } else {
            sendVkMessage(VK_TOKEN, peerId, txt);
         }
         return;
      }
    }`;

let oldLines = code.split('\n');
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < oldLines.length; i++) {
  if (oldLines[i].includes("// Business collect income button")) {
    startIndex = i;
  }
  if (startIndex !== -1 && oldLines[i].includes("// Duel join button")) {
    endIndex = i;
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  let newLines = [...oldLines.slice(0, startIndex), newCallbackCode, ...oldLines.slice(endIndex)];
  fs.writeFileSync('server.ts', newLines.join('\n'));
}

