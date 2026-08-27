const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const x2Cron = `

// ==========================================
// X2 MODE AUTOMATIC CRON
// ==========================================
setInterval(async () => {
  if (x2ManualOverride) return; // Wait for manual reset or next boundary to reset? Actually let's just let the bot reset manual override if the real state matches.
  
  // Calculate MSK time
  const now = new Date();
  const mskTimeStr = now.toLocaleString("en-US", {timeZone: "Europe/Moscow"});
  const mskTime = new Date(mskTimeStr);
  
  const day = mskTime.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  // X2 is active from Friday 00:00 (day 5) to Sunday 23:59:59 (day 0) => meaning day is 5, 6, or 0.
  const isWeekend = day === 5 || day === 6 || day === 0;

  if (isWeekend && !x2ModeActive) {
    x2ModeActive = true;
    x2ManualOverride = false;
    // Send to Chat 15
    try {
      const extraOpts: any = {};
      const imgUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
      const upRes = await uploadPhoto(2000000015, imgUrl);
      if (upRes.attachment) extraOpts.attachment = upRes.attachment;
      await sendVkMessage(VK_TOKEN, 2000000015, "🎉 Х2 режим был включён до понедельника!", extraOpts);
    } catch(e) { console.error("X2 Enable Notify Error:", e); }
  } else if (!isWeekend && x2ModeActive) {
    x2ModeActive = false;
    x2ManualOverride = false;
    // Send to Chat 15
    try {
      const extraOpts: any = {};
      const imgUrl = "https://images.unsplash.com/photo-1616719125272-3591461ffea0?w=600";
      const upRes = await uploadPhoto(2000000015, imgUrl);
      if (upRes.attachment) extraOpts.attachment = upRes.attachment;
      await sendVkMessage(VK_TOKEN, 2000000015, "🛑 Х2 режим был отключён до пятницы.", extraOpts);
    } catch(e) { console.error("X2 Disable Notify Error:", e); }
  } else if (x2ManualOverride && isWeekend === x2ModeActive) {
    // If the manual override now matches the actual timeline, we can drop the override flag.
    x2ManualOverride = false;
  }
}, 60000);
`;

code += x2Cron;
fs.writeFileSync('server.ts', code);
console.log("X2 Cron added!");
