const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8').split('\n');

let depth = 1;
for (let i = 7464; i < 14801; i++) {
  const line = code[i];
  
  let cleanLine = line.replace(/\/\/.*/, '');
  cleanLine = cleanLine.replace(/`([^`]*?)`/g, '');
  cleanLine = cleanLine.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '');
  cleanLine = cleanLine.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '');

  for (let j = 0; j < cleanLine.length; j++) {
    const c = cleanLine[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
}
console.log("Final depth:", depth);
