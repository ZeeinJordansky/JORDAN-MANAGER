const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if\s*\(\s*\["\/help", "\/помощь"/g;
let m = regex.exec(clean);
if(m) {
  const start = m.index;
  const end = clean.indexOf('if (["/warn", "/варн",', start);
  console.log("HELP:\n" + clean.substring(start, end));
}

const regex2 = /if\s*\(\s*\["\/warn", "\/варн"/g;
let m2 = regex2.exec(clean);
if(m2) {
  const start2 = m2.index;
  const end2 = clean.indexOf('if (["/unwarn", "/разварн"', start2);
  console.log("WARN:\n" + clean.substring(start2, end2));
}
