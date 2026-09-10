
const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('try {')) {
        stack.push(i + 1);
    }
    if (line.includes('catch (') || line.includes('catch {') || line.includes('finally {')) {
        stack.pop();
    }
}
console.log('Unclosed try blocks at lines:', stack);
