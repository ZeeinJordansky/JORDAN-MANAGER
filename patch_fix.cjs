const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove the broken button logic from triggerCaptcha
const brokenCaptcha = `  buttons.push([
    { action: { type: "callback", label: "Информация о VK профиле", payload: JSON.stringify({ cmd: "vk_profile_info", targetId }) }, color: "secondary" }
  ]);
  const keyboard = {
    inline: true,
    buttons: [`;

const fixedCaptcha = `  const keyboard = {
    inline: true,
    buttons: [`;

code = code.replace(brokenCaptcha, fixedCaptcha);

// 2. Add the button to getStatsMainPage
const statsButtons = `  if (isModViewer) {
    buttons.push([
      { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
      { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
    ]);
  }

  const keyboard = {`;

const newStatsButtons = `  if (isModViewer) {
    buttons.push([
      { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
      { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
    ]);
  }

  buttons.push([
    { action: { type: "callback", label: "Информация о VK профиле", payload: JSON.stringify({ cmd: "vk_profile_info", targetId }) }, color: "secondary" }
  ]);

  const keyboard = {`;

code = code.replace(statsButtons, newStatsButtons);
fs.writeFileSync('server.ts', code);
