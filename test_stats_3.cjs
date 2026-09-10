const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /"\/stats"/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("MATCH:", m.index);
  const start = Math.max(0, m.index - 50);
  console.log(orig.substring(start, m.index + 100).replace(/\n/g, ' '));
}
