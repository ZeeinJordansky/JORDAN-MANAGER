const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}

// 1. Update /mute with button and new format
const muteRegex = /const vkRes = await executeVkMute\(peerId, parsed\.targetId, durationSec\);[\s\S]*?return await sendResponse\(`\[id\${parsed\.targetId}\|пользователю\] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n\| Модератор - \[id\${userId}\|\${fullName}\]\\n\| Блокировка чата выдана до: \${fmtD\(muteUntil\)\}`, \{ noReply: true, keyboard: JSON\.stringify\(keyboard\) \}\);/;
const muteReplacement = `const vkRes = await executeVkMute(peerId, parsed.targetId, durationSec);
         const systemMuteSuccess = vkRes.success;
         const vkErrMsg = vkRes.errorMsg;
         const muteUntil = Date.now() + durationSec * 1000;
         await updateUser(parsed.targetId, { muteUntil, muteReason: reason, mutePeerId: peerId });
         const targetU = await getOrCreateUser(parsed.targetId);
         targetU.muteUntil = muteUntil;
         targetU.muteReason = reason;
         targetU.mutePeerId = peerId;
         userCache.set(parsed.targetId, targetU);
         await logBotAction({ type: "mute", peerId, userId, targetId: parsed.targetId, text: \`[id\${userId}|\${fullName}] выдал(-а) блокировку чата [id\${parsed.targetId}|пользователю] на \${timeMin} мин (Причина: \${reason})\` });
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
           ]
         };
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;

if (replaceCode(muteRegex, muteReplacement)) console.log('Mute response updated with button');

// 2. Update /warn with button and new format
const warnRegex = /keyboard\.buttons\.push\(\[\{ action: \{ type: "callback", label: "Исключить из беседы", payload: JSON\.stringify\(\{ cmd: "mod_kick_btn", targetId: parsed\.targetId, reason: reason \}\) \}, color: "secondary" \}\]\);[\s\S]*?let msg = \`\[id\${parsed\.targetId}\|пользователю\] выдано предупреждение \(\${newWarns}\/3\) по причине: \${reason}\\n\\n\| Модератор - \[id\${userId}\|\${fullName}\]\`;/;
const warnReplacement = `const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
          ]
        };
        let msg = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;`;

if (replaceCode(warnRegex, warnReplacement)) console.log('Warn response updated with button');

// 3. Update /ban format
const banRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] заблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] в текущей беседе\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}`, \{ keyboard: JSON\.stringify\(keyboard\) \}\);/;
const banReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка скором на \${termStr} по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;

if (replaceCode(banRegex, banReplacement)) console.log('Ban response updated');

// 4. Update /unban format
const unbanRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] разблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] в текущей беседе`, \{ noReply: true \}\);/;
const unbanReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(unbanRegex, unbanReplacement)) console.log('Unban response updated');

// 5. Update /kick format
const kickRegex = /const targetU = await getOrCreateUser\(parsed\.targetId\);[\s\S]*?return await sendResponse\(`\[id\${parsed\.targetId}\|\${targetFullName}\] был\(-а\) исключён из беседы по причине: \${reason}\\n\\n\| Модератор - \[id\${userId}\|\${fullName}\]`, \{ noReply: true \}\);/;
const kickReplacement = `const targetU = await getOrCreateUser(parsed.targetId);
        const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
        return await sendResponse(\`[id\${parsed.targetId}|\${targetFullName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(kickRegex, kickReplacement)) console.log('Kick response updated');

// 6. Update /gban format
const gbanRegex = /return await sendResponse\(`\[id\${userId}\|\${fullName}\] заблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] во всех беседах\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}`, \{ noReply: true, keyboard: JSON\.stringify\(\{inline: true, buttons: \[\[\{action: \{type: "callback", label: "Снять блокировку", payload: JSON\.stringify\(\{cmd: "mod_ungban", targetId: parsed\.targetId\}\)\}, color: "positive"\}\]\]\}\) \}\);/;
const gbanReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] занесён(-на) в глобальную блокировку во всех беседах по причине: \${reason}\\n\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true });`;

if (replaceCode(gbanRegex, gbanReplacement)) console.log('GBan response updated');

// 7. Update /addblack format
const addblackRegex = /return await sendResponse\(`\[id\${userId}\|\${fullName}\] добавил\(-а\) \[id\${parsed\.targetId}\|пользователя\] в черный список сообщества\.\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}`, \{ noReply: true \}\);/;
const addblackReplacement = `
        const targetU = await getOrCreateUser(parsed.targetId);
        const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
        return await sendResponse(\`[id\${parsed.targetId}|\${targetFullName}] занесён в чёрный список чат-менеджера по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true });`;

if (replaceCode(addblackRegex, addblackReplacement)) console.log('AddBlack response updated');

// 8. Update /getban format
const getbanRegex = /const out = \`Информация о блокировках \[id\${parsed\.targetId}\|пользователя\]\\n\\n\` \+[\s\S]*?\| Информация о блокировках в беседах:\\n\${chatBansText}\`;\s*return await sendResponse\(out\);/;
const getbanReplacement = `
        const getBannedFullName = async (id) => {
            const u = await getOrCreateUser(id);
            return u.fullName || u.nick || \`User\${id}\`;
        };
        const getBanModStr = async (mId) => {
            if (!mId) return "Отсутствует.";
            const modU = await getOrCreateUser(mId);
            const mName = modU.fullName || modU.nick || \`User\${mId}\`;
            return \`[id\${mId}|\${mName}]\`;
        };
        const gbanDateStr = tUser.gban ? fmtD(tUser.gbanDate) : "Отсутствует.";
        const gbanExpiresStr = tUser.gban ? (tUser.gbanExpiresAt ? fmtD(tUser.gbanExpiresAt) : "Никогда") : "Отсутствует.";
        const gbanMod = tUser.gban ? await getBanModStr(tUser.gbanBy) : "Отсутствует.";
        
        const blackDateStr = tUser.blacklisted ? fmtD(tUser.blackDate) : "Отсутствует.";
        const blackExpiresStr = tUser.blacklisted ? (tUser.blackExpiresAt ? fmtD(tUser.blackExpiresAt) : "Никогда") : "Отсутствует.";
        const blackMod = tUser.blacklisted ? await getBanModStr(tUser.blackBy) : "Отсутствует.";

        let chatBansList = "";
        const cBKeys = Object.keys(tUser.chatBans || {});
        for (let i = 0; i < Math.min(cBKeys.length, 10); i++) {
            const cId = cBKeys[i];
            const bInfo = tUser.chatBans[cId];
            const cData = await getOrCreateChat(Number(cId));
            let cTitle = cData.title || \`Беседа №\${cId}\`;
            const forbiddenWords = ["запрет", "плохоеслово"]; // Filter example
            for (const word of forbiddenWords) {
                if (cTitle.toLowerCase().includes(word)) cTitle = "####";
            }
            const bMod = await getBanModStr(bInfo.by);
            const bExpires = bInfo.expiresAt ? fmtD(bInfo.expiresAt) : "Никогда";
            chatBansList += \`\\n\${i + 1}) \${cTitle}\\n| Модератор - \${bMod}\\n| Дата выдачи: \${fmtD(bInfo.date)}\\n| Дата окончания: \${bExpires}\\n| Причина: \${bInfo.reason || "без причины"}\\n\`;
        }

        const out = \`Информация о блокировках [id\${parsed.targetId}|пользователя]\\n\\n\` +
          \`| Информация о глобальной блокировке во всех беседах:\\n\` +
          (tUser.gban ? \`| Модератор - \${gbanMod}\\n| Дата выдачи: \${gbanDateStr}\\n| Дата окончания: \${gbanExpiresStr}\\n| Причина: \${tUser.gbanReason || "без причины"}\` : \"Отсутствует.\") +
          \`\\n\\n| Информация о нахождении в чёрном списке чат-менеджера:\\n\` +
          (tUser.blacklisted ? \`| Модератор - \${blackMod}\\n| Дата выдачи: \${blackDateStr}\\n| Дата окончания: \${blackExpiresStr}\\n| Причина: \${tUser.blackReason || "без причины"}\` : \"Отсутствует.\") +
          \`\\n\\n| Информация о блокировках в беседах:\\n\\n| Кол-во блокировок в беседах: \${Object.keys(tUser.chatBans || {}).length}\` +
          chatBansList;
        return await sendResponse(out);`;

if (replaceCode(getbanRegex, getbanReplacement)) console.log('GetBan response updated');

fs.writeFileSync('server.ts', content, 'utf8');
