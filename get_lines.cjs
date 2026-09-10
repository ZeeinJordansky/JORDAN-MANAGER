const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const warnIdx = code.indexOf('if (["/warn", "/варн"');
console.log(code.substring(Math.max(0, warnIdx - 100), warnIdx + 4000));
