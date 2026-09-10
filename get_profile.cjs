const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\[.*?\/profile/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("Found at:", m.index);
  console.log(orig.substring(m.index, m.index + 200).replace(/\n/g, ' '));
}
