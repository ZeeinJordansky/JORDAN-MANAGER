const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /if\s*\((?:\[[^\]]*\].includes\(rawCmd\)|rawCmd\s*===[^)\n]*)/g;
let m;
const list = [];
while ((m = regex.exec(code)) !== null) {
  const line = code.substring(0, m.index).split('\n').length;
  list.push({ line, pos: m.index, snippet: code.substring(m.index, m.index + 120).replace(/\n/g, ' ') });
}
list.slice(0, 85).forEach((item, idx) => console.log(`${idx + 1}. Pos ${item.pos} Line ${item.line}: ${item.snippet}`));
