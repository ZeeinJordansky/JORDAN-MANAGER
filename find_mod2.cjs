const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// I will look for where we send messages regarding mute
let pos = 0;
while(true) {
  const i = clean.indexOf('["/mute", "/мут"', pos);
  if (i === -1) break;
  const block = clean.substring(Math.max(0, i - 150), i + 250);
  console.log('---', i);
  console.log(block);
  pos = i + 1;
}
