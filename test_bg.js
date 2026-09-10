const { createCanvas } = require('canvas');
const fs = require('fs');
const width = 800;
const height = 440;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

ctx.fillStyle = "#000000";
ctx.fillRect(0, 0, width, height);

const cx = width / 2;
const cy = height / 2 - 20;
const radius = Math.min(width, height) * 0.35;

ctx.save();
ctx.beginPath();
ctx.arc(cx, cy, radius, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(168, 85, 247, 0.9)";
ctx.lineWidth = 3;
ctx.shadowColor = "rgba(168, 85, 247, 1)";
ctx.shadowBlur = 25;
ctx.stroke();
ctx.stroke();

ctx.shadowBlur = 80;
ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
ctx.lineWidth = 10;
ctx.stroke();
ctx.restore();

const angle = -Math.PI / 5;
const starX = cx + Math.cos(angle) * radius;
const starY = cy + Math.sin(angle) * radius;

ctx.save();
ctx.shadowColor = "rgba(216, 180, 254, 1)";
ctx.shadowBlur = 30;
ctx.fillStyle = "#ffffff";
ctx.beginPath();
ctx.arc(starX, starY, 3, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = "rgba(216, 180, 254, 0.9)";
ctx.beginPath();
ctx.moveTo(starX - 60, starY);
ctx.lineTo(starX, starY - 2);
ctx.lineTo(starX + 60, starY);
ctx.lineTo(starX, starY + 2);
ctx.fill();

ctx.beginPath();
ctx.moveTo(starX, starY - 60);
ctx.lineTo(starX - 2, starY);
ctx.lineTo(starX, starY + 60);
ctx.lineTo(starX + 2, starY);
ctx.fill();
ctx.restore();

ctx.save();
ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
ctx.font = "300 28px sans-serif";
ctx.textAlign = "center";
ctx.shadowColor = "rgba(168, 85, 247, 0.8)";
ctx.shadowBlur = 15;
ctx.fillText("O  R  I  O  N", cx, height - 30);
ctx.restore();

fs.writeFileSync('test.png', canvas.toBuffer());
