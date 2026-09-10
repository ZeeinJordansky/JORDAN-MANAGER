const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /if\s*\((?:\[.*?\]\.includes\(rawCmd\)|rawCmd\s*===|isHelpCmd|isStartCmd)/gs;
let m;
const list = [];
while ((m = regex.exec(code)) !== null) {
  const line = code.substring(0, m.index).split('\n').length;
  list.push({ line, snippet: code.substring(m.index, m.index + 100).replace(/\n/g, ' ') });
}
console.log('Total cmd matches in server.ts:', list.length);
list.forEach((item, idx) => console.log(`${idx + 1}. Line ${item.line}: ${item.snippet}`));
