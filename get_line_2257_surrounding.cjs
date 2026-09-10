const fs = require('fs');
const lines = fs.readFileSync('server.ts.clean_real', 'utf8').split('\n');
console.log("Lines 2240-2300 of clean_real:");
console.log(lines.slice(2240, 2300).join('\n'));
