
const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '(') depth++;
        if (char === ')') depth--;
    }
    if (depth < 0) {
         console.log(`FIRST IMBALANCE at line ${i+1}: depth=${depth} | ${line}`);
         process.exit(0);
    }
}
