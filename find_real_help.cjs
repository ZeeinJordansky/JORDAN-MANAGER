const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

let pos = 0;
let c = 0;
while(true) {
  const i = orig.indexOf('"/help"', pos);
  if (i === -1) break;
  if(c++ < 20) console.log(i, orig.substring(i - 30, i + 80).replace(/\n/g, ' '));
  pos = i + 1;
}

