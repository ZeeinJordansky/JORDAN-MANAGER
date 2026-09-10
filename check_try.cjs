const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
let tryBalance = 0;
for (let i = 0; i < 9100; i++) {
    const line = lines[i];
    if (line.includes('try {')) tryBalance++;
    if (line.includes('catch (e) {') || line.includes('catch(e){')) tryBalance--;
    if (line.includes('finally {')) tryBalance--; // simple check
    
    if (tryBalance < 0) {
        console.log(`Potential issue at line ${i+1}: too many catches/finallys`);
        tryBalance = 0;
    }
}
console.log(`Final try balance: ${tryBalance}`);
