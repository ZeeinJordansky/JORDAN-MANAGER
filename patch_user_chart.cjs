const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update userInfo type
code = code.replace(
  `    globalMsgs?: number;`,
  `    globalMsgs?: number;\n    lastMsgStr?: string;`
);

// Replace the right column drawing
const oldRightCol = `  // Right column (Activity)
  drawStatItem(col2X, currentY, "Сообщений за сегодня:", todayCount.toLocaleString(), "#38bdf8");
  drawStatItem(col2X, currentY + 50, "Сообщений в беседе:", chatCount.toLocaleString(), "#a855f7");
  drawStatItem(col2X, currentY + 100, "Сообщений глобально:", globalCount.toLocaleString(), "#c084fc");`;

const newRightCol = `  // Right column (Activity)
  drawStatItem(col2X, currentY, "Сообщений за сегодня:", todayCount.toLocaleString(), "#38bdf8");
  drawStatItem(col2X, currentY + 50, "Сообщений в беседе:", chatCount.toLocaleString(), "#a855f7");
  drawStatItem(col2X, currentY + 100, "Последнее сообщение:", userInfo?.lastMsgStr || "—", "#c084fc");`;

if (code.includes(oldRightCol)) {
  code = code.replace(oldRightCol, newRightCol);
  fs.writeFileSync('server.ts', code);
  console.log("Patched user chart right column");
} else {
  console.error("Could not find oldRightCol in server.ts");
}
