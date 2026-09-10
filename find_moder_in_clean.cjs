const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const targets = ["/ban", "/unban", "/warn", "/unwarn", "/kick", "/help", "/mute", "/unmute", "/staff", "/stats", "/правила"];

targets.forEach(t => {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = clean.indexOf(t, pos);
    if (idx === -1) break;
    const line = clean.substring(0, idx).split('\n').length;
    console.log(`[${t}] at line ${line}, pos ${idx}: ${clean.substring(idx - 20, idx + 80).replace(/\n/g, ' ')}`);
    pos = idx + t.length;
    count++;
    if (count > 10) break;
  }
});
