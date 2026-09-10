const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const targetLine = 5964 - 1; // 0-indexed
lines[targetLine] = '}\n}\n}\n' + lines[targetLine];

fs.writeFileSync('server.ts', lines.join('\n'));
console.log("Braces balanced before line 5964!");
