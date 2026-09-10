const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// /help & /gamehelp');
console.log(code.substring(startIdx + 2000, startIdx + 5000));
