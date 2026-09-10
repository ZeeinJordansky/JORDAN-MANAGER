const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

let balance = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    balance += opens - closes;
    if (balance < 0) {
        console.log(`Unmatched closing brace at line ${i + 1}: ${line}`);
        // Reset balance to 0 to continue
        balance = 0;
    }
}
console.log(`Final balance: ${balance}`);
