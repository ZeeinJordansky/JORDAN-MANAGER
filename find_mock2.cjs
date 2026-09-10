const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// /help & /gamehelp');
const endIdx = code.indexOf('// End of basic moderation commands', startIdx);
console.log('startIdx:', startIdx);
console.log('endIdx:', endIdx);
if (endIdx !== -1) {
    console.log('Mock block length:', endIdx + 35 - startIdx);
}

