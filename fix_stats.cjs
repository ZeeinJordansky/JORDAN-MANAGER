const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  const hasChatMute = targetUser.muteUntil && targetUser.muteUntil > Date.now();
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  const hasWarns = (targetUser.warnings || 0) > 0;
  
  let statsStr = \`Статистика [id\${targetId}|пользователя]\\n\\n\`;
  statsStr += \`| Nick_Name: \${nickStr}\\n\`;
  statsStr += \`| VK ID - \${targetId}\\n\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += \`| Статус: \${userStatus}\\n\`;
  }
  statsStr += \`\\n| Активная глобальная блокировка: \${hasGban ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активные блокировки в беседах: \${hasChatBans ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Активные предупреждения в беседе: \${hasWarns ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Активная блокировка чата в беседе: \${hasChatMute ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений за сегодня: \${todayMsgs}\\n\`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || targetUser.messagesTotal || 0;
  statsStr += \`| Кол-во сообщений за всё время: \${totalMsgs}\\n\`;`;

const replacement = `  const hasChatMute = targetUser.muteUntil && targetUser.muteUntil > Date.now();
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  
  let statsStr = \`Статистика [id\${targetId}|\${targetName}]\\n\\n\`;
  statsStr += \`| Nick -- \${nickStr}\\n\`;
  statsStr += \`| VK ID -- \${targetId}\\n\\n\`;
  statsStr += \`| Должность: \${roleStr}\\n\`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += \`| Статус: \${userStatus}\\n\`;
  }
  statsStr += \`\\n| Глобальные блокировки: \${hasGban ? "Да" : "Нет"}\\n\`;
  statsStr += \`| Блокировки в беседах: \${hasChatBans ? "Да" : "Нет"}\\n\\n\`;
  statsStr += \`| Предупреждений: \${targetUser.warnings || 0}\\n\`;
  statsStr += \`| Активная блокировка чата: \${targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "да" : "нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений сегодня: \${todayMsgs}\\n\`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += \`| Кол-во сообщений за всё время: \${totalMsgs}\\n\`;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Stats Replaced");
} else {
  console.log("Stats Target not found");
}
