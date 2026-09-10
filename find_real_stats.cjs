const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

// I need to search for instances of "/stats" but skip the one in the log action.
let pos = 0;
while(true) {
  const i = orig.indexOf('"/stats"', pos);
  if (i === -1) break;
  console.log(i, orig.substring(i - 30, i + 100));
  pos = i + 1;
}

