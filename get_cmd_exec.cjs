const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/stats", "\/стата"/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("MATCH:", m.index);
  const start = Math.max(0, m.index - 50);
  console.log(orig.substring(start, m.index + 200).replace(/\n/g, ' '));
}

const regex2 = /if \(\["\/help", "\/помощь"/g;
while((m = regex2.exec(orig)) !== null) {
  console.log("MATCH2:", m.index);
  const start = Math.max(0, m.index - 50);
  console.log(orig.substring(start, m.index + 200).replace(/\n/g, ' '));
}

