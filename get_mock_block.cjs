const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('// /help & /gamehelp');
console.log(code.substring(startIdx, startIdx + 2000));
