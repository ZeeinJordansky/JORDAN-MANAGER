const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/help", "\/помощь"/g;
let m = regex.exec(orig);
if (m) {
  const start = m.index;
  console.log(orig.substring(start, start + 2000));
}
