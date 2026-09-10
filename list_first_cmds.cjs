const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if\s*\((?:\[[^\]]*\].includes\(rawCmd\)|rawCmd\s*===[^)\n]*)/g;
let m;
const list = [];
while ((m = regex.exec(clean)) !== null) {
  const line = clean.substring(0, m.index).split('\n').length;
  list.push({ line, pos: m.index, snippet: clean.substring(m.index, m.index + 120).replace(/\n/g, ' ') });
}
list.slice(0, 115).forEach((item, idx) => console.log(`${idx + 1}. Pos ${item.pos} Line ${item.line}: ${item.snippet}`));
