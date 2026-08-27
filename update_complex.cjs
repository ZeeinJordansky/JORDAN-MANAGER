const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

function replaceCode(searchRegex, replacement) {
    if (searchRegex.test(content)) {
        content = content.replace(searchRegex, replacement);
        return true;
    }
    return false;
}

// 1. Update /stats (getStatsMainPage)
const statsRegex = /const getStatsMainPage = async \(targetId: number, currentPeerId: number, viewerUserId\?: number\) => \{[\s\S]*?return \{ text: statsStr, keyboard \};\};/;
const statsReplacement = `const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || \`id\${targetId}\`;
  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};
  const todayMsgs = (chatLastMsgDateMap[currentPeerId] === currentMskStr) ? (chatTodayMsgsMap[currentPeerId] || 0) : 0;
  const chatNicks = targetUser.chatNicks || {};
  let nickStr = chatNicks[currentPeerId] || "отсутствует";
  let dispRole = await getRole(currentPeerId, targetId);
  let roleStr = getRoleDisplayName(dispRole);
  const hasGban = !!(targetUser.gban || targetUser.gbanpl);
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  const hasWarns = !!(targetUser.warnings && targetUser.warnings > 0);
  const isMuted = !!(targetUser.muteUntil && targetUser.muteUntil > Date.now());

  let statsStr = \`Статистика [id\${targetId}|пользователя]\\n\\n\`;
  statsStr += \`| Nick_Name: \${nickStr}\\n\`;
  statsStr += \`| VK ID - \${targetId}\\n\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) statsStr += \`| Статус: \${userStatus}\\n\`;
  statsStr += \`\\n| Активная глобальная блокировка: \${hasGban ? "Да" : "нет"}\\n\`;
  statsStr += \`| Активные блокировки в беседах: \${hasChatBans ? "Да" : "нет"}\\n\\n\`;
  statsStr += \`| Активные предупреждения в беседе: \${hasWarns ? "Да" : "нет"}\\n\`;
  statsStr += \`| Активная блокировка чата в беседе: \${isMuted ? "Да" : "нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений за сегодня: \${todayMsgs}\\n\`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += \`| Кол-во сообщений за всё время: \${totalMsgs}\\n\`;
  let lastActivityStr = "отсутствует";
  const rawAct = targetUser.lastActivity || (targetUser.lastMessageAt && (targetUser.messagesTotal > 0 || (targetUser.chatTotalMsgs && Object.values(targetUser.chatTotalMsgs).some((v: any) => v > 0))) ? targetUser.lastMessageAt * 1000 : 0);
  if (rawAct && rawAct > 0) lastActivityStr = fmtD(rawAct);
  statsStr += \`| Последнее сообщение: \${lastActivityStr}\`;

  const buttons: any[] = [];
  if (viewerUserId) {
    const viewerUser = await getOrCreateUser(viewerUserId);
    const viewerRole = await getRole(currentPeerId, viewerUserId);
    const isVkAdmin = await checkIsAdmin(viewerUserId, currentPeerId, viewerUser.role);
    if (viewerRole >= 1 || viewerUser.role >= 1 || isVkAdmin) {
      buttons.push([
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]);
    }
  }
  const keyboard = { inline: true, buttons };
  return { text: statsStr, keyboard };
};`;

if (replaceCode(statsRegex, statsReplacement)) console.log('Stats (getStatsMainPage) updated');

// 2. Update Anti-flood notification
const afRegex = /await sendVkMessage\(VK_TOKEN, peerId, \`\[id\${userId}\|Пользователь\] замучен на 30 мин из-за флуда сообщениями\.\`\);/;
const afReplacement = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.\`);`;

if (replaceCode(afRegex, afReplacement)) console.log('Anti-flood notification updated');

// 3. Update Anti-tagall notification
const tegallRegex = /await sendVkMessage\(VK_TOKEN, peerId, \`\[id\${userId}\|Пользователь\] получил предупреждение из-за тега всех участников\.\`\);/;
const tegallReplacement = `await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.\`);`;

if (replaceCode(tegallRegex, tegallReplacement)) console.log('Anti-tagall notification updated');

// 4. Update Anti-sliv notification
const antislivRegex = /await sendVkMessage\(VK_TOKEN, peerId, \`У \[id\${userId}\|пользователя\] была автоматически снята роль из-за попытки слива беседы\.\`\);/;
const antislivReplacement = `await sendVkMessage(VK_TOKEN, peerId, \`У [id\${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.\`);`;

if (replaceCode(antislivRegex, antislivReplacement)) console.log('Anti-sliv notification updated');

fs.writeFileSync('server.ts', content, 'utf8');
