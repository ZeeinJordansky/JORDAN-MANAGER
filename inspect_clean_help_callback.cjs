const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const idx = clean.indexOf('const botHelpCmds =');
console.log(clean.substring(idx - 100, idx + 3500));
