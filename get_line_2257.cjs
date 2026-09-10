const fs = require('fs');
const lines = fs.readFileSync('server.ts.clean_real', 'utf8').split('\n');
console.log(lines.slice(2250, 2300).join('\n'));
