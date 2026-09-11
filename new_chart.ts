async function generateUserDailyStatsChartBuffer(
  dayLabels: string[], 
  dayCounts: number[], 
  extraStats?: { todayMsgs?: number; totalMsgs?: number },
  userInfo?: {
    id?: number;
    name?: string;
    photoUrl?: string;
    roleStr?: string;
    isManagement?: boolean;
    warns?: number;
    rep?: number;
    dispRole?: number;
    nickStr?: string;
    customStatus?: string;
    chatMsgs?: number;
    globalMsgs?: number;
    isMuted?: boolean;
  }
): Promise<Buffer> {
  if (!createCanvas) {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }
  const width = 960;
  const height = 540;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1. Solid Pure Black Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient neon glows
  const ambientCyan = ctx.createRadialGradient(220, 160, 0, 220, 160, 360);
  ambientCyan.addColorStop(0, "rgba(56, 189, 248, 0.09)");
  ambientCyan.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = ambientCyan;
  ctx.fillRect(0, 0, width, height);

  const ambientPurple = ctx.createRadialGradient(width - 200, 200, 0, width - 200, 200, 380);
  ambientPurple.addColorStop(0, "rgba(168, 85, 247, 0.08)");
  ambientPurple.addColorStop(1, "rgba(168, 85, 247, 0)");
  ctx.fillStyle = ambientPurple;
  ctx.fillRect(0, 0, width, height);

  // Global Padding/Layout
  const leftX = 45;
  let currentY = 50;

  // Title: ...::Статистика Пользователя::...
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 16px NotoSans, sans-serif";
  ctx.fillText("...::Статистика Пользователя::...", leftX, currentY);
  
  currentY += 45;

  // Avatar
  if (userInfo?.photoUrl && typeof loadImage === "function") {
    try {
      const avatarImg = await loadImage(userInfo.photoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(leftX + 45, currentY + 45, 45, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, leftX, currentY, 90, 90);
      ctx.restore();
      
      // Avatar border
      ctx.beginPath();
      ctx.arc(leftX + 45, currentY + 45, 45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } catch (e) {}
  } else {
    // Placeholder avatar
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(leftX + 45, currentY + 45, 45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px NotoSans, sans-serif";
  ctx.textAlign = "left";
  const safeName = userInfo?.name || "Пользователь";
  ctx.fillText(safeName.length > 30 ? safeName.substring(0, 27) + "..." : safeName, leftX + 110, currentY + 32);

  // VK ID
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Slightly transparent
  ctx.font = "15px NotoSans, sans-serif";
  ctx.fillText(`ID: ${userInfo?.id || "Неизвестно"}`, leftX + 110, currentY + 55);

  // Role Badge (Solid background)
  const roleText = userInfo?.roleStr || "Участник";
  ctx.font = "bold 13px NotoSans, sans-serif";
  const roleTw = ctx.measureText(roleText).width;
  ctx.fillStyle = "#38bdf8"; // Solid light blue
  drawRoundedRect(ctx, leftX + 110, currentY + 70, roleTw + 26, 26, 6);
  ctx.fill();
  ctx.fillStyle = "#000000"; // Black text for readability on light blue
  ctx.fillText(roleText, leftX + 123, currentY + 88);

  // Management Badge (if dispRole >= 8)
  if (userInfo?.isManagement || (userInfo?.dispRole && userInfo.dispRole >= 8)) {
    const mngText = "Руководство Чат-менеджера";
    const mngTw = ctx.measureText(mngText).width;
    const mngX = leftX + 110 + roleTw + 26 + 10;
    ctx.fillStyle = "#fbbf24"; // Solid yellow
    drawRoundedRect(ctx, mngX, currentY + 70, mngTw + 26, 26, 6);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.fillText(mngText, mngX + 13, currentY + 88);
  }

  currentY += 135;

  // Let's create two columns for stats
  const col1X = leftX;
  const col2X = leftX + 440;
  
  const drawStatItem = (x: number, y: number, label: string, value: string, valColor: string = "#ffffff") => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    drawRoundedRect(ctx, x, y, 420, 38, 8);
    ctx.fill();
    
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px NotoSans, sans-serif";
    ctx.fillText(label, x + 16, y + 24);
    
    ctx.fillStyle = valColor;
    ctx.font = "bold 15px NotoSans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, x + 404, y + 25);
    ctx.textAlign = "left";
  };

  const todayCount = typeof extraStats?.todayMsgs === "number" ? extraStats.todayMsgs : (dayCounts[dayCounts.length - 1] || 0);
  const chatCount = userInfo?.chatMsgs || todayCount;
  const globalCount = userInfo?.globalMsgs || 0;

  // Left column (General Info)
  drawStatItem(col1X, currentY, "Никнейм:", userInfo?.nickStr || "Отсутствует", "#38bdf8");
  
  let safeStatus = userInfo?.customStatus || "—";
  if (safeStatus.length > 30) safeStatus = safeStatus.substring(0, 27) + "...";
  drawStatItem(col1X, currentY + 50, "Статус:", safeStatus, "#e2e8f0");
  drawStatItem(col1X, currentY + 100, "Репутация:", (userInfo?.rep || 0).toLocaleString(), "#34d399");
  
  const isMuted = userInfo?.isMuted ? "Активна" : "Нет";
  const mutedColor = userInfo?.isMuted ? "#ef4444" : "#e2e8f0";
  drawStatItem(col1X, currentY + 150, "Блокировка чата:", isMuted, mutedColor);
  
  const warnsCount = userInfo?.warns || 0;
  drawStatItem(col1X, currentY + 200, "Предупреждения:", warnsCount.toString(), warnsCount > 0 ? "#fbbf24" : "#e2e8f0");

  // Right column (Activity)
  drawStatItem(col2X, currentY, "Сообщений за сегодня:", todayCount.toLocaleString(), "#38bdf8");
  drawStatItem(col2X, currentY + 50, "Сообщений в беседе:", chatCount.toLocaleString(), "#a855f7");
  drawStatItem(col2X, currentY + 100, "Сообщений глобально:", globalCount.toLocaleString(), "#c084fc");
  
  // Footer Section
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, height - 38);
  ctx.lineTo(width - leftX, height - 38);
  ctx.stroke();

  // Bottom Left text ONLY: By. Orion | Чат-менеджер (@orion_manager)
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px NotoSans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("By. Orion | Чат-менеджер (@orion_manager)", leftX, height - 16);

  return canvas.toBuffer("image/jpeg", { quality: 0.88 });
}
