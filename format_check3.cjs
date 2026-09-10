const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// How is /warn handled?
let pos = 0;
while(true) {
  const i = clean.indexOf('"/warn"', pos);
  if (i === -1) break;
  console.log('---', i);
  console.log(clean.substring(i - 100, i + 300).replace(/\n/g, ' '));
  pos = i + 1;
}
