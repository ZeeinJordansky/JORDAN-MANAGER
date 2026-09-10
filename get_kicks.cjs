const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
console.log(code.substring(467923, 467923 + 500));
