const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /\["\/stats", "\/стата"/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("Found:", orig.substring(m.index - 50, m.index + 200).replace(/\n/g, ' '));
}
