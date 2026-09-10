const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/stats", "\/стата"/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("Found at:", m.index);
  const end = orig.indexOf('if (', m.index + 20);
  console.log(orig.substring(m.index - 50, end).replace(/\n/g, ' '));
}
