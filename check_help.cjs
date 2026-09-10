const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\["\/help", "\/помощь"/g;
let m;
while((m = regex.exec(code)) !== null) {
  console.log("Found at:", m.index);
  console.log(code.substring(m.index, m.index + 500).replace(/\n/g, ' '));
}
