const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if\s*\(\s*(?:\[[^\]]*help[^\]]*\]|rawCmd\s*===[^)\n]*help)/gi;
let m;
while ((m = regex.exec(clean)) !== null) {
  console.log('Match at', m.index);
  console.log(clean.substring(m.index, m.index + 500));
}
