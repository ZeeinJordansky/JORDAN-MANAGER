const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let i = 0;
for(let line of lines) {
  if (line.includes('Статистика [id${targetId}|${targetName}]')) {
    console.log("Found at line:", i);
    console.log(lines.slice(i-5, i+50).join('\n'));
    break;
  }
  i++;
}
