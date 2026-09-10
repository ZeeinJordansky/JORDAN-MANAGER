const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
let i = 0;
for(let line of lines) {
  if (line.includes('let statsStr = `Статистика')) {
    console.log("CURRENT:", lines.slice(i-2, i+15).join('\n'));
    break;
  }
  i++;
}

const origCode = fs.readFileSync('server.ts.clean_real', 'utf8');
const origLines = origCode.split('\n');
let j = 0;
for(let line of origLines) {
  if (line.includes('let statsStr = `Статистика')) {
    console.log("ORIGINAL:", origLines.slice(j-2, j+15).join('\n'));
    break;
  }
  j++;
}
