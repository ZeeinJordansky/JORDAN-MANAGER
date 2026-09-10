const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

let pos = 0;
while(true) {
  const i = orig.indexOf('"/stats"', pos);
  if (i === -1) break;
  const start = Math.max(0, i - 150);
  console.log("Found:", orig.substring(start, i + 50).replace(/\n/g, ' '));
  pos = i + 1;
}
