async function generateChatStatsChartBuffer(metrics: { msgs: number; photos: number; videos: number; badwords: number; files: number }, pWord: string): Promise<Buffer> {
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

  // Title: ...::Статистика Беседы::...
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 16px NotoSans, sans-serif";
  ctx.fillText("...::Статистика Беседы::...", leftX, currentY);
  
  currentY += 45;

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px NotoSans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Активность ${pWord}`, leftX, currentY + 32);

  currentY += 80;

  // Let's create two columns for stats
  const col1X = leftX;
  const col2X = leftX + 440;
  
  const drawStatItem = (x: number, y: number, label: string, value: string, valColor: string = "#ffffff") => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    drawRoundedRect(ctx, x, y, 420, 48, 8);
    ctx.fill();
    
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px NotoSans, sans-serif";
    ctx.fillText(label, x + 20, y + 30);
    
    ctx.fillStyle = valColor;
    ctx.font = "bold 18px NotoSans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, x + 400, y + 31);
    ctx.textAlign = "left";
  };

  // Calculate percentages if we wanted, but let's just display numbers nicely
  const total = (metrics.msgs || 0) + (metrics.photos || 0) + (metrics.videos || 0) + (metrics.badwords || 0) + (metrics.files || 0);

  // Left column
  drawStatItem(col1X, currentY, "Отправлено сообщений:", (metrics.msgs || 0).toLocaleString(), "#38bdf8");
  drawStatItem(col1X, currentY + 65, "Отправлено фото:", (metrics.photos || 0).toLocaleString(), "#a855f7");
  drawStatItem(col1X, currentY + 130, "Отправлено видео:", (metrics.videos || 0).toLocaleString(), "#34d399");
  
  // Right column
  drawStatItem(col2X, currentY, "Отправлено файлов:", (metrics.files || 0).toLocaleString(), "#fbbf24");
  drawStatItem(col2X, currentY + 65, "Использовано матов:", (metrics.badwords || 0).toLocaleString(), "#ef4444");
  drawStatItem(col2X, currentY + 130, "Всего активности:", total.toLocaleString(), "#c084fc");

  // Footer Section
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, height - 38);
  ctx.lineTo(width - leftX, height - 38);
  ctx.stroke();

  // Bottom Left text ONLY: By. Mint | Чат-менеджер (@cm_mint)
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px NotoSans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("By. Mint | Чат-менеджер (@cm_mint)", leftX, height - 16);

  return canvas.toBuffer("image/jpeg", { quality: 0.88 });
}
