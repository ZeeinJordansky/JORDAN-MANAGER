const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}

// 1. Update /mute response and add Exclude button
const muteRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] выдал\(-а\) блокировку чата \[id\${parsed\.targetId}\|пользователю\] на \${timeMin} мин\\n\\n\| Причина: \${reason}\\n\| Блокировка чата до: \${fmtD\(muteUntil\)\}(?:\${systemMuteSuccess \? "" : \(vkErrMsg \? "\\n\| Предупреждение VK API: " \+ vkErrMsg : ""\)\})?`, \{ noReply: true, keyboard: JSON\.stringify\(keyboard\) \}\);/;
const muteReplacement = `
        const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
        keyboard.buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]);
        return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;

if (replaceCode(muteRegex, muteReplacement)) console.log('Mute response updated');

// 2. Update /unmute response
const unmuteRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] снял\(-а\) блокировку чата у \[id\${parsed\.targetId}\|пользователя\]`, \{ noReply: true \}\);/;
const unmuteReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка чата.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(unmuteRegex, unmuteReplacement)) console.log('Unmute response updated');

// 3. Update /warn response and add Exclude button
const warnRegex = /let msg = \`\[id\${userId}\|Модератор\] выдал\(-а\) предупреждение \[id\${parsed\.targetId}\|пользователю\]\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}\\n\| Предупреждений: \${newWarns}\/3\`;/;
const warnReplacement = `
        keyboard.buttons.push([{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]);
        let msg = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;`;

if (replaceCode(warnRegex, warnReplacement)) console.log('Warn response updated');

// 4. Update /unwarn response
const unwarnRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] снял\(-а\) предупреждение у \[id\${parsed\.targetId}\|пользователя\] \(\${newWarns}\/3\)`, \{ noReply: true \}\);/;
const unwarnReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снято предупреждение.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(unwarnRegex, unwarnReplacement)) console.log('Unwarn response updated');

// 5. Update /ban response
const banRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] заблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] в беседе\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}\\n\| Блокировка до: \${fmtD\(expiresAt\)\}`, \{ noReply: true, keyboard: JSON\.stringify\(keyboard\) \}\);/;
const banReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка скором на \${termStr} по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;

if (replaceCode(banRegex, banReplacement)) console.log('Ban response updated');

// 6. Update /unban response
const unbanRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] разблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] в беседе`, \{ noReply: true \}\);/;
const unbanReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] было снята блокировка.\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(unbanRegex, unbanReplacement)) console.log('Unban response updated');

// 7. Update /kick response
const kickRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] исключил\(-а\) \[id\${parsed\.targetId}\|пользователя\] из беседы\. Причина: \${reason}`, \{ noReply: true \}\);/;
const kickReplacement = `
        const targetU = await getOrCreateUser(parsed.targetId);
        const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
        return await sendResponse(\`[id\${parsed.targetId}|\${targetFullName}] был(-а) исключён из беседы по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;

if (replaceCode(kickRegex, kickReplacement)) console.log('Kick response updated');

// 8. Update /gban response
const gbanRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] заблокировал\(-а\) \[id\${parsed\.targetId}\|пользователя\] во всех беседах!\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}`, \{ noReply: true \}\);/;
const gbanReplacement = `return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана глобальная блокировка во всех беседах по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true });`;

if (replaceCode(gbanRegex, gbanReplacement)) console.log('GBan response updated');

// 9. Update /addblack response
const addblackRegex = /return await sendResponse\(`\[id\${userId}\|Модератор\] занес в ЧС бота \[id\${parsed\.targetId}\|пользователя\]!\\n\\n\| Причина: \${reason}\\n\| Срок: \${termStr}`, \{ noReply: true \}\);/;
const addblackReplacement = `
        const targetU = await getOrCreateUser(parsed.targetId);
        const targetFullName = targetU.fullName || targetU.nick || \`User\${parsed.targetId}\`;
        return await sendResponse(\`[id\${parsed.targetId}|\${targetFullName}] занесён в чёрный список чат-менеджера по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка до: \${fmtD(expiresAt)}\`, { noReply: true });`;

if (replaceCode(addblackRegex, addblackReplacement)) console.log('AddBlack response updated');

fs.writeFileSync('server.ts', content, 'utf8');
