const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Role Badge (Solid background)
  const roleText = userInfo?.roleStr || "Участник";
  ctx.font = "bold 13px NotoSans, sans-serif";
  const roleTw = ctx.measureText(roleText).width;
  ctx.fillStyle = "#38bdf8"; // Solid light blue
  drawRoundedRect(ctx, leftX + 110, currentY + 70, roleTw + 26, 26, 6);
  ctx.fill();
  ctx.fillStyle = "#000000"; // Black text for readability on light blue
  ctx.fillText(roleText, leftX + 123, currentY + 88);`;

const replacementStr = `  // Custom Role Colors
  let roleBg = "#94a3b8"; // Default (Участник)
  let roleTextCol = "#000000";
  const rDisp = userInfo?.dispRole || 0;
  
  if (rDisp >= 12) {
    roleBg = "#c084fc"; // Владелец Чат-менеджера (Светло-фиолетовый)
  } else if (rDisp >= 10) {
    roleBg = "#ef4444"; // Руководители (Красный)
    roleTextCol = "#ffffff";
  } else if (rDisp === 9) {
    roleBg = "#f97316"; // Осн. Зам. Руководителя (Оранжевый)
  } else if (rDisp === 8) {
    roleBg = "#fbbf24"; // Зам. Руководителя (Желтый)
  } else if (rDisp >= 7.4) {
    roleBg = "#38bdf8"; // Агенты поддержки (Голубой)
  } else if (rDisp >= 7.1) {
    roleBg = "#34d399"; // Тех. специалисты (Зеленый)
  } else if (rDisp === 7) {
    roleBg = "#a855f7"; // Владелец беседы (Фиолетовый)
    roleTextCol = "#ffffff";
  } else if (rDisp >= 4) {
    roleBg = "#60a5fa"; // Админы (Синий)
  } else if (rDisp >= 1) {
    roleBg = "#4ade80"; // Модераторы (Зеленый)
  }

  // Role Badge (Solid background)
  const roleText = userInfo?.roleStr || "Участник";
  ctx.font = "bold 13px NotoSans, sans-serif";
  const roleTw = ctx.measureText(roleText).width;
  ctx.fillStyle = roleBg;
  drawRoundedRect(ctx, leftX + 110, currentY + 70, roleTw + 26, 26, 6);
  ctx.fill();
  ctx.fillStyle = roleTextCol; 
  ctx.fillText(roleText, leftX + 123, currentY + 88);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('server.ts', code);
  console.log("Patched role colors successfully!");
} else {
  console.error("Target string not found for role colors!");
}
