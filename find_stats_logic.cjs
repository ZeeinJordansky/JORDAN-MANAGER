const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

// I will just search for `Статистика [id` in the code, which I know exists!
const regex = /Статистика \[id/g;
let m;
while((m = regex.exec(orig)) !== null) {
  console.log("Found at:", m.index);
  const start = orig.lastIndexOf('if (', m.index);
  console.log("Nearest IF:", orig.substring(start, m.index).replace(/\n/g, ' '));
}
