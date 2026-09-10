const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const searchRegex = /const getStatsMainPage = async [\s\S]*?return \{ text: statsStr, keyboard \};\n\};\n/m;

const replacement = `function formatAmPmDate(ms: number) {
  const d = new Date(ms);
  d.setHours(d.getUTCHours() + 3);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  let hr = d.getUTCHours();
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  if (hr === 0) hr = 12;
  const hh = String(hr).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const sec = String(d.getUTCSeconds()).padStart(2, '0');
  return \`\${hh}:\${min}:\${sec} \${ampm} | \${dd}.\${mm}.\${yyyy}\`;
}

const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || \`id\${targetId}\`;
  
  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};
  const todayMsgs = (chatLastMsgDateMap[currentPeerId] === currentMskStr)
    ? (chatTodayMsgsMap[currentPeerId] || 0)
    : 0;
    
  const chatNicks = targetUser.chatNicks || {};
  const nickStr = chatNicks[currentPeerId] || "отсутствует";
  const dispRole = await getRole(currentPeerId, targetId);
  const roleStr = getRoleDisplayName(dispRole);
  
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  const chatBansCount = targetUser.chatBans ? Object.keys(targetUser.chatBans).length : 0;
  
  let statsStr = \`Статистика [id\${targetId}|\${targetName}]\\n\`;
  statsStr += \`| VK ID — \${targetId}\\n\`;
  statsStr += \`| Дата Регистрации в ВК: [https://vk.com/foaf.php?id=\${targetId}|Узнать дату]\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += \`| Статус: \${userStatus}\\n\`;
  }
  
  statsStr += \`| Nick_Name — \${nickStr}\\n\`;
  statsStr += \`| Блокировки в беседах: \${hasChatBans ? "да" : "нет"} (\${chatBansCount})\\n\`;
  
  const isMuted = targetUser.muteUntil && targetUser.muteUntil > Date.now();
  if (isMuted) {
    const timeLeft = formatTimeRemaining(targetUser.muteUntil - Date.now());
    statsStr += \`| Активная блокировка чата: да (\${timeLeft})\\n\`;
  } else {
    statsStr += \`| Активная блокировка чата: нет\\n\`;
  }
  
  const warnsCount = targetUser.warnings || 0;
  statsStr += \`| Активные предупреждения: \${warnsCount > 0 ? "да" : "нет"}\\n\`;
  statsStr += \`| Кол-во предупреждений: \${warnsCount}\\n\`;
  
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += \`| Сообщений за сегодня: \${todayMsgs}\\n\`;
  statsStr += \`| Сообщений за всё время: \${totalMsgs}\\n\`;
  
  const rawAct = getValidLastMessageTimestamp(targetUser, currentPeerId);
  if (rawAct > 0) {
    statsStr += \`| Последнее сообщение в беседе: \${formatAmPmDate(rawAct)}\\n\`;
  } else {
    statsStr += \`| Последнее сообщение в беседе: отсутствует\\n\`;
  }

  const buttons: any[] = [
    [
      { action: { type: "callback", label: "Информация о блокировке чата", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" }
    ],
    [
      { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
      { action: { type: "callback", label: "Все блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
    ],
    [
      { action: { type: "callback", label: "Игровой Профиль", payload: JSON.stringify({ cmd: "stats_game", targetId }) }, color: "positive" }
    ]
  ];
  
  const keyboard = {
    inline: true,
    buttons
  };
  return { text: statsStr, keyboard, todayMsgs, totalMsgs };
};
`;

if (searchRegex.test(code)) {
  code = code.replace(searchRegex, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched getStatsMainPage successfully!");
} else {
  console.log("Could not find getStatsMainPage!");
}
