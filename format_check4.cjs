const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

let pos = 0;
while(true) {
  const i = clean.indexOf('warnings', pos);
  if (i === -1) break;
  console.log('---', i);
  console.log(clean.substring(i - 100, i + 100).replace(/\n/g, ' '));
  pos = i + 1;
}
