const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /\["\/help"/g;
let m;
while((m = regex.exec(code)) !== null) {
  console.log("Found at:", m.index);
  console.log(code.substring(m.index - 50, m.index + 200).replace(/\n/g, ' '));
}
