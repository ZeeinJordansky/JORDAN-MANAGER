const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetRegex = /const hasChatMute = !!\(targetUser\.muteUntil.*?\| Кол-во сообщений за всё время: \$\{totalMsgs\}\\n\`;/s;

const replacement = `const hasChatMute = !!(targetUser.muteUntil && targetUser.muteUntil > Date.now());
  const hasWarns = (targetUser.warnings || 0) > 0;
  
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
  statsStr += \`| Активная блокировка чата: \${hasChatMute ? "да" : "нет"}\\n\\n\`;
  statsStr += \`| Кол-во сообщений сегодня: \${todayMsgs}\\n\`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += \`| Кол-во сообщений за всё время: \${totalMsgs}\\n\`;`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Stats Replaced OK");
} else {
  console.log("Stats Target not found with regex");
}
