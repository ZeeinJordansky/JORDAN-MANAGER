const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetLine = 'export const getMskDate';
const index = content.indexOf(targetLine);
if (index !== -1) {
    const before = content.substring(0, index);
    const after = content.substring(index);
    
    let balance = 0;
    const lines = before.split('\n');
    for (const line of lines) {
        balance += (line.match(/\{/g) || []).length;
        balance -= (line.match(/\}/g) || []).length;
    }
    
    console.log("Closing with balance:", balance);
    if (balance > 0) {
        const closures = '\n' + '}'.repeat(balance) + '\n\n';
        content = before + closures + after;
    }
}

fs.writeFileSync('server.ts', content);
console.log("Braces balanced before exports!");
