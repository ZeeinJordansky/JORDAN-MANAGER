const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /\["\/stats", ".*?\]\.includes\(rawCmd\)/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("MATCH STATS in clean_real:", m.index);
  console.log(orig.substring(m.index - 20, m.index + 500).replace(/\n/g, ' '));
}

const regex2 = /\["\/help", ".*?\]\.includes\(rawCmd\)/g;
while((m = regex2.exec(orig)) !== null) {
  console.log("MATCH HELP in clean_real:", m.index);
  console.log(orig.substring(m.index - 20, m.index + 500).replace(/\n/g, ' '));
}
