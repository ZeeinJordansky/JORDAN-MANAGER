async function generateBalanceChartBuffer(targetName: string, balance: number, bank: number, avatarUrl?: string): Promise<Buffer> {
  if (!createCanvas) {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }

  const width = 800;
  const height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Solid Pure Black Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient neon glows
  const ambientGreen = ctx.createRadialGradient(200, 100, 0, 200, 100, 300);
  ambientGreen.addColorStop(0, "rgba(52, 211, 153, 0.08)");
  ambientGreen.addColorStop(1, "rgba(52, 211, 153, 0)");
  ctx.fillStyle = ambientGreen;
  ctx.fillRect(0, 0, width, height);

  const ambientGold = ctx.createRadialGradient(width - 150, 180, 0, width - 150, 180, 300);
  ambientGold.addColorStop(0, "rgba(251, 191, 36, 0.07)");
  ambientGold.addColorStop(1, "rgba(251, 191, 36, 0)");
  ctx.fillStyle = ambientGold;
  ctx.fillRect(0, 0, width, height);

  const leftX = 40;
  let currentY = 40;

  // Title
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 15px NotoSans, sans-serif";
  ctx.fillText("...::Финансовый Счёт::...", leftX, currentY);

  currentY += 40;

  // Avatar
  if (avatarUrl && typeof loadImage === "function") {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(leftX + 35, currentY + 35, 35, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, leftX, currentY, 70, 70);
      ctx.restore();
      
      ctx.beginPath();
      ctx.arc(leftX + 35, currentY + 35, 35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } catch (e) {}
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(leftX + 35, currentY + 35, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px NotoSans, sans-serif";
  ctx.textAlign = "left";
  const safeName = targetName || "Пользователь";
  ctx.fillText(safeName.length > 30 ? safeName.substring(0, 27) + "..." : safeName, leftX + 85, currentY + 28);

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "14px NotoSans, sans-serif";
  ctx.fillText("Информация о балансе", leftX + 85, currentY + 52);

  currentY += 105;

  const drawStatItem = (x: number, y: number, label: string, value: string, valColor: string = "#ffffff", w: number = 340) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    drawRoundedRect(ctx, x, y, w, 44, 8);
    ctx.fill();
    
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px NotoSans, sans-serif";
    ctx.fillText(label, x + 16, y + 28);
    
    ctx.fillStyle = valColor;
    ctx.font = "bold 17px NotoSans, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, x + w - 16, y + 29);
    ctx.textAlign = "left";
  };

  const totalBal = balance + bank;

  // We have enough width for 2 columns if we want, or just a big block. Let's do 2 columns.
  drawStatItem(leftX, currentY, "На руках:", balance.toLocaleString() + " $", "#34d399", 340);
  drawStatItem(leftX + 360, currentY, "В банке:", bank.toLocaleString() + " $", "#f87171", 340);
  
  drawStatItem(leftX, currentY + 60, "Общий капитал:", totalBal.toLocaleString() + " $", "#fbbf24", 700);

  // Footer Section
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, height - 32);
  ctx.lineTo(width - leftX, height - 32);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px NotoSans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("By. Orion | Чат-менеджер (@orion_manager)", leftX, height - 12);

  return canvas.toBuffer("image/jpeg", { quality: 0.65 });
}
