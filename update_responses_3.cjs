const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}

// 1. Update /olist with devices and button
const olistRegex = /if \(\["\/olist", "\/олист", "\/онлайнлист"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(\`Список участников онлайн в беседе \(\${onlineList\.length}\):\\n\\n\${list}\`, \{ disable_mentions: 1 \}\);      \}/;
const olistReplacement = `if (["/olist", "/олист", "/онлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = (profiles || []).filter((p: any) => p.id > 0 && (p.online === 1 || p.online_mobile === 1));
         if (onlineList.length === 0) return await sendResponse("Список участников онлайн в беседе пуст.");
         
         const list = onlineList.map((p: any) => {
             let device = "PC";
             if (p.online_mobile) device = "Mobile";
             if (p.online_app) device = "App";
             return \`[id\${p.id}|\${p.first_name} \${p.last_name}] - \${device}\`;
         }).join("\\n");
         
         const keyboard = {
             inline: true,
             buttons: [
                 [{ action: { type: "text", label: "Оффлайн", payload: JSON.stringify({ cmd: "help_offlinelist" }) }, color: "secondary" }]
             ]
         };
         // Note: middle button "Оффлайн" was requested.
         return await sendResponse(\`Список пользователей которые в сети:\\n\\n\${list}\`, { disable_mentions: 1, keyboard: JSON.stringify(keyboard) });
      }`;

if (replaceCode(olistRegex, olistReplacement)) console.log('Olist response updated');

// 2. Update /offlinelist with time format and button
const offlinelistRegex = /if \(\["\/offlinelist", "\/оффлайнлист", "\/офлайнлист"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(\`Список участников оффлайн в беседе \(\${offlineList\.length}\):\\n\\n\${list}\`, \{ disable_mentions: 1 \}\);      \}/;
const offlinelistReplacement = `if (["/offlinelist", "/оффлайнлист", "/офлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const offlineList = (profiles || []).filter((p: any) => p.id > 0 && !p.online && !p.online_mobile);
         if (offlineList.length === 0) return await sendResponse("Список участников оффлайн в беседе пуст.");
         
         const formatLastSeen = (lastSeenTime) => {
             if (!lastSeenTime) return "неизвестно";
             const diff = Math.floor((Date.now() - lastSeenTime * 1000) / 1000);
             if (diff < 60) return \`\${diff} сек. назад\`;
             const mins = Math.floor(diff / 60);
             const secs = diff % 60;
             if (mins < 60) return \`\${mins} мин. \${secs} сек. назад\`;
             const hours = Math.floor(mins / 60);
             const minsRem = mins % 60;
             if (hours < 24) return \`\${hours} ч. \${minsRem} мин. \${secs} сек. назад\`;
             const days = Math.floor(hours / 24);
             const hoursRem = hours % 24;
             return \`\${days} д. \${hoursRem} ч. \${minsRem} мин. \${secs} сек. назад\`;
         };

         const list = offlineList.map((p: any) => {
             const timeStr = formatLastSeen(p.last_seen ? p.last_seen.time : null);
             return \`[id\${p.id}|\${p.first_name} \${p.last_name}] - Был в сети: \${timeStr}\`;
         }).join("\\n");
         
         const keyboard = {
             inline: true,
             buttons: [
                 [{ action: { type: "text", label: "Онлайн", payload: JSON.stringify({ cmd: "help_olist" }) }, color: "secondary" }]
             ]
         };
         return await sendResponse(\`Список пользователей которые не в сети:\\n\\n\${list}\`, { disable_mentions: 1, keyboard: JSON.stringify(keyboard) });
      }`;

if (replaceCode(offlinelistRegex, offlinelistReplacement)) console.log('Offlinelist response updated');

// 3. Update /giveowner confirmation
const giveownerRegex = /if \(rawCmd === \"\/giveowner\"\) \{[\s\S]*?await updateUser\(parsed\.targetId, \{ role: 8 \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] передал\(-а\) права владельца беседы \[id\${parsed\.targetId}\|пользователю\]\`, \{ noReply: true \}\);      \}/;
const giveownerReplacement = `if (rawCmd === "/giveowner") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         const keyboard = {
             inline: true,
             buttons: [
                 [{ action: { type: "callback", label: "Да, передать", payload: JSON.stringify({ cmd: "confirm_giveowner", targetId: parsed.targetId }) }, color: "positive" }],
                 [{ action: { type: "callback", label: "Нет, не передавать", payload: JSON.stringify({ cmd: "cancel_giveowner", targetId: parsed.targetId }) }, color: "negative" }]
             ]
         };
         return await sendResponse(\`Вы действительно хотите передать уровень прав «Владелец Беседы» [id\${parsed.targetId}|пользователю]?\`, { keyboard: JSON.stringify(keyboard) });
      }`;

if (replaceCode(giveownerRegex, giveownerReplacement)) console.log('Giveowner response updated');

fs.writeFileSync('server.ts', content, 'utf8');
