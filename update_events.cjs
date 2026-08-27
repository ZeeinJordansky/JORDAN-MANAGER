const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}
// 1. Update Invitation: Banned in chat
const inviteChatBanRegex = /const msgText = \`\[id\${memberId}\|\${targetName}\] имеет блокировку в этой беседе!\\n\\n\| Информация о блокировке:\\n\${modStr} \| \${reason} \| \${termStr} \| \${dateStr}\`;/;
const inviteChatBanReplacement = `const msgText = \`[id\${memberId}|\${targetName}] заблокирован(-а) в этой беседе \${modStr} по причине: \${reason}\\n\\n| Блокировка до: \${fmtD(bInfo.expiresAt)}\`;`;
if (replaceCode(inviteChatBanRegex, inviteChatBanReplacement)) console.log('Invite chat ban notification updated');

// 2. Update Invitation: Global Ban
const inviteGbanRegex = /const msgText = \`\[id\${memberId}\|\${targetName}\] имеет глобальную блокировку во всех беседах в которых есть JORDAN MANAGER!\\n\\n\| Информация о блокировке:\\n\${modStr} \| \${reason} \| \${termStr} \| \${dateStr}\`;/;
const inviteGbanReplacement = `const msgText = \`[id\${memberId}|\${targetName}] занесён(-на) в глобальную блокировку во всех беседах по причине: \${reason}\\n\\n| Блокировка до: \${fmtD(uData.gbanExpiresAt)}\`;`;
if (replaceCode(inviteGbanRegex, inviteGbanReplacement)) console.log('Invite gban notification updated');

// 3. Update User Leave notification with buttons
const leaveRegex = /if \(memberId === userId\) \{[\s\S]*?await sendVkMessage\(VK_TOKEN, peerId, \`\[id\${memberId}\|\${memberName}\] покинул\(-а\) беседу\`\);/;
const leaveReplacement = `if (memberId === userId) {
           const uData = await getOrCreateUser(memberId);
           const memberName = uData.fullName || uData.nick || \`User\${memberId}\`;
           const kb = {
               inline: true,
               buttons: [
                   [{ action: { type: "callback", label: "Исключить", payload: JSON.stringify({ cmd: "leave_kick", targetId: memberId }) }, color: "secondary" }],
                   [{ action: { type: "callback", label: "Забрать роль", payload: JSON.stringify({ cmd: "leave_removerole", targetId: memberId }) }, color: "secondary" }]
               ]
           };
           await sendVkMessage(VK_TOKEN, peerId, \`[id\${memberId}|\${memberName}] вышел(-ла) из беседы.\`, { keyboard: JSON.stringify(kb) });
}`;
if (replaceCode(leaveRegex, leaveReplacement)) console.log('User leave notification updated');

// 4. Update Bot Added notification
const botIdMatch = content.match(/const BOT_ID = (\d+);/);
const botId = botIdMatch ? botIdMatch[1] : null;
if (botId) {
    const botAddedRegex = new RegExp(`if \\(memberId === \${botId}\\) \\{[\\s\\S]*?await sendVkMessage\\(VK_TOKEN, peerId, \\".*\\"\\);`, "g");
    const botAddedReplacement = `if (memberId === ${botId}) {
          const kb = {
              inline: true,
              buttons: [
                  [{ action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "activate_chat" }) }, color: "positive" }]
              ]
          };
          await sendVkMessage(VK_TOKEN, peerId, "JORDAN MANAGER был добавлен в беседу.\\n\\nДля начала работы с чат-менеджером, выдайте ему права администратора.\\n\\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.", { keyboard: JSON.stringify(kb) });
    }`;
    if (replaceCode(botAddedRegex, botAddedReplacement)) console.log('Bot added notification updated');
}

fs.writeFileSync('server.ts', content, 'utf8');
