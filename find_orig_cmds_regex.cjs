const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/help", "\/помощь"/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("MATCH HELP:", m.index);
  console.log(orig.substring(m.index, m.index + 200).replace(/\n/g, ' '));
}

const statsRegex = /if \(\["\/stats", "\/стата"/g;
while((m = statsRegex.exec(orig)) !== null) {
  console.log("MATCH STATS:", m.index);
  console.log(orig.substring(m.index, m.index + 200).replace(/\n/g, ' '));
}

