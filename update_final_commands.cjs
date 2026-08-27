const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}

// Fix /mute response and button again to be sure
const muteRegex = /return await sendResponse\(\`\[id\${parsed\.targetId}\|пользователю\] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n\| Модератор - \[id\${userId}\|\${fullName}\]\\n\| Блокировка чата выдана до: \${fmtD\(muteUntil\)\}\`, \{ noReply: true, keyboard: JSON\.stringify\(keyboard\) \}\);/;
const muteReplacement = `
        keyboard.buttons = [
             [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
        ];
        return await sendResponse(\`[id\${parsed.targetId}|пользователю] выдана блокировка чата сроком на \${timeMin} мин по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\\n| Блокировка чата выдана до: \${fmtD(muteUntil)}\`, { noReply: true, keyboard: JSON.stringify(keyboard) });`;
replaceCode(muteRegex, muteReplacement);

// Fix /warn response and button again to be sure
const warnRegex = /let msg = \`\[id\${parsed\.targetId}\|пользователю\] выдано предупреждение \(\${newWarns}\/3\) по причине: \${reason}\\n\\n\| Модератор - \[id\${userId}\|\${fullName}\]\`;/;
const warnReplacement = `
        keyboard.buttons = [
            [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick_btn", targetId: parsed.targetId, reason: reason }) }, color: "secondary" }]
        ];
        let msg = \`[id\${parsed.targetId}|пользователю] выдано предупреждение (\${newWarns}/3) по причине: \${reason}\\n\\n| Модератор - [id\${userId}|\${fullName}]\`;`;
replaceCode(warnRegex, warnReplacement);

// Update Invitation notifications
content = content.replace(/const msgText = \`\[id\${memberId}\|\${targetName}\] заблокирован\(-а\) в этой беседе \${modStr} по причине: \${reason}\\n\\n\| Блокировка до: \${fmtD\(bInfo\.expiresAt\)\}\`;/g, 
    'const msgText = `[id${memberId}|${targetName}] заблокирован(-а) в этой беседе ${modStr} по причине: ${reason}\\n\\n| Блокировка до: ${fmtD(bInfo.expiresAt)}`;');

content = content.replace(/const msgText = \`\[id\${memberId}\|\${targetName}\] занесён\(-на\) в глобальную блокировку во всех беседах по причине: \${reason}\\n\\n\| Блокировка до: \${fmtD\(uData\.gbanExpiresAt\)\}\`;/g, 
    'const msgText = `[id${memberId}|${targetName}] занесён(-на) в глобальную блокировку во всех беседах по причине: ${reason}\\n\\n| Блокировка до: ${fmtD(uData.gbanExpiresAt)}`;');

// Update /olist to the requested format
const olistFullRegex = /if \(\["\/olist", "\/олист", "\/онлайнлист"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(\`Список пользователей которые в сети:\\n\\n\${list}\`, \{ disable_mentions: 1, keyboard: JSON\.stringify\(keyboard\) \}\);      \}/;
if (!content.includes('Список пользователей которые в сети')) {
    // If previous update failed, try original
    const origOlist = /if \(\["\/olist", "\/олист", "\/онлайнлист"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(\`Список участников онлайн в беседе \(\${onlineList\.length}\):\\n\\n\${list}\`, \{ disable_mentions: 1 \}\);      \}/;
    const olistReplacement = `if (["/olist", "/олист", "/онлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = (profiles || []).filter((p: any) => p.id > 0 && (p.online === 1 || p.online_mobile === 1));
         if (onlineList.length === 0) return await sendResponse("Список участников онлайн в беседе пуст.");
         const list = onlineList.map((p: any, i: number) => {
             let device = "PC";
             if (p.online_mobile) device = "Mobile";
             if (p.online_app) device = "App";
             return \`\${i + 1}) [id\${p.id}|\${p.first_name} \${p.last_name}] - \${device}\`;
         }).join("\\n");
         const keyboard = {
             inline: true,
             buttons: [[{ action: { type: "text", label: "Оффлайн", payload: JSON.stringify({ cmd: "offlinelist" }) }, color: "secondary" }]]
         };
         return await sendResponse(\`Список пользователей которые в сети:\\n\\n\${list}\`, { disable_mentions: 1, keyboard: JSON.stringify(keyboard) });
      }`;
    replaceCode(origOlist, olistReplacement);
}

// Update /offlinelist to requested format
const origOfflist = /if \(\["\/offlinelist", "\/оффлайнлист", "\/офлайнлист"\]\.includes\(rawCmd\)\) \{[\s\S]*?return await sendResponse\(\`Список участников оффлайн в беседе \(\${offlineList\.length}\):\\n\\n\${list}\`, \{ disable_mentions: 1 \}\);      \}/;
const offlistReplacement = `if (["/offlinelist", "/оффлайнлист", "/офлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const offlineList = (profiles || []).filter((p: any) => p.id > 0 && !p.online && !p.online_mobile);
         if (offlineList.length === 0) return await sendResponse("Список участников оффлайн в беседе пуст.");
         
         const formatLastSeen = (ls) => {
             if (!ls) return "неизвестно";
             const diff = Math.floor((Date.now() - ls.time * 1000) / 1000);
             if (diff < 60) return \`\${diff} сек. назад\`;
             const mins = Math.floor(diff / 60);
             if (mins < 60) return \`\${mins} мин. \${diff % 60} сек. назад\`;
             const hrs = Math.floor(mins / 60);
             if (hrs < 24) return \`\${hrs} ч. \${mins % 60} мин. назад\`;
             const days = Math.floor(hrs / 24);
             return \`\${days} д. \${hrs % 24} ч. назад\`;
         };

         const list = offlineList.slice(0, 15).map((p: any, i: number) => {
             const timeStr = formatLastSeen(p.last_seen);
             return \`\${i+1}) [id\${p.id}|\${p.first_name} \${p.last_name}] - Был в сети: \${timeStr}\`;
         }).join("\\n");
         
         const keyboard = {
             inline: true,
             buttons: [[{ action: { type: "text", label: "Онлайн", payload: JSON.stringify({ cmd: "olist" }) }, color: "secondary" }]]
         };
         return await sendResponse(\`Список пользователей которые не в сети:\\n\\n\${list}\`, { disable_mentions: 1, keyboard: JSON.stringify(keyboard) });
      }`;
replaceCode(origOfflist, offlistReplacement);

// Update /giveowner logic
const giveownerOrig = /if \(rawCmd === \"\/giveowner\"\) \{[\s\S]*?await updateUser\(parsed\.targetId, \{ role: 8 \}\);[\s\S]*?return await sendResponse\(\`\[id\${userId}\|Модератор\] передал\(-а\) права владельца беседы \[id\${parsed\.targetId}\|пользователю\]\`, \{ noReply: true \}\);      \}/;
const giveownerRepl = `if (rawCmd === "/giveowner") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const kb = {
             inline: true,
             buttons: [
                 [{ action: { type: "callback", label: "Да, передать", payload: JSON.stringify({ cmd: "confirm_giveowner", targetId: parsed.targetId, fromId: userId }) }, color: "positive" }],
                 [{ action: { type: "callback", label: "Нет, не передавать", payload: JSON.stringify({ cmd: "cancel_giveowner" }) }, color: "negative" }]
             ]
         };
         return await sendResponse(\`Вы действительно хотите передать уровень прав «Владелец Беседы» [id\${parsed.targetId}|пользователю]?\`, { keyboard: JSON.stringify(kb) });
      }`;
replaceCode(giveownerOrig, giveownerRepl);

fs.writeFileSync('server.ts', content, 'utf8');
