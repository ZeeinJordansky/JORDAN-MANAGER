const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceExact(search, replacement) {
    if (content.includes(search)) {
        content = content.replace(search, replacement);
        return true;
    }
    return false;
}

// 1. /addantiteg
replaceExact('return await sendResponse(`[id${userId}|Модератор] добавил(-а) слово/тег в анти-тег.`, { noReply: true });', 
             'return await sendResponse(`[id${parsed.targetId}|пользователю] было выдано право тегать всех участников беседы.\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });');

// 2. /unantiteg
replaceExact('return await sendResponse(`[id${userId}|Модератор] удалил(-а) слово/тег из анти-тега.`, { noReply: true });', 
             'return await sendResponse(`[id${parsed.targetId}|пользователю] было снято право тегать всех участников беседы.\\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });');

// 3. /addaccesslevel (search for standard response)
const accessLevelRegex = /await updateUser\(parsed\.targetId, \{ role: level \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] выдал\(-а\) уровень доступа \${level} \[id\${parsed\.targetId}\|пользователю\]\`, \{ noReply: true \}\);/;
const accessLevelRepl = `await updateUser(parsed.targetId, { role: level });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] был выдан уровень доступа \${level}.\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
if (accessLevelRegex.test(content)) content = content.replace(accessLevelRegex, accessLevelRepl);

// 4. /заместитель (addsa or similar)
const zamsRegex = /await updateUser\(parsed\.targetId, \{ role: 6 \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] назначил\(-а\) \[id\${parsed\.targetId}\|пользователя\] на должность: Зам\. Глав\. Администратора\`, \{ noReply: true \}\);/;
const zamsRepl = `await updateUser(parsed.targetId, { role: 6 });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] был назначен на должность: Зам. Глав. Администратора\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
if (zamsRegex.test(content)) content = content.replace(zamsRegex, zamsRepl);

// 5. /озаместитель (unsa or similar)
const unzamsRegex = /await updateUser\(parsed\.targetId, \{ role: 0 \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] снял\(-а\) \[id\${parsed\.targetId}\|пользователя\] с должности: Зам\. Глав\. Администратора\`, \{ noReply: true \}\);/;
const unzamsRepl = `await updateUser(parsed.targetId, { role: 0 });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] был снят с должности: Зам. Глав. Администратора\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
if (unzamsRegex.test(content)) content = content.replace(unzamsRegex, unzamsRepl);

// 6. /addruk
const rukRegex = /await updateUser\(parsed\.targetId, \{ role: 10 \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] назначил\(-а\) \[id\${parsed\.targetId}\|пользователя\] на должность: Руководитель\`, \{ noReply: true \}\);/;
const rukRepl = `await updateUser(parsed.targetId, { role: 10 });
         return await sendResponse(\`[id\${parsed.targetId}|пользователю] был назначен на должность: Руководитель\\n| Модератор - [id\${userId}|\${fullName}]\`, { noReply: true });`;
if (rukRegex.test(content)) content = content.replace(rukRegex, rukRepl);

fs.writeFileSync('server.ts', content, 'utf8');
