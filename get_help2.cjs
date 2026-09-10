const fs = require('fs');
let code = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(isHelpCmd\)/g;
let m = regex.exec(code);
if (m) {
  const start = m.index;
  const end = code.indexOf('if (["/hidebalance"', start);
  console.log(code.substring(Math.max(0, start - 200), end));
} else {
  console.log("Not found");
}
