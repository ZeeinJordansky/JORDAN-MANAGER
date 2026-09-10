const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\["\/help"/g;
let m = regex.exec(code);
if (m) {
  const start = m.index;
  const end = code.indexOf('// /warn', start);
  console.log(code.substring(start, end));
} else {
  console.log("Not found");
}
