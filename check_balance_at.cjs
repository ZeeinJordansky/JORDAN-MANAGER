const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

let balance = 0;
const lines = content.split('\n');
for (let i = 0; i < 9100; i++) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    balance += opens - closes;
}
console.log(`Balance at line 5891: ${balance}`);
