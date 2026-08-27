const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
c = c.replace(/\{ keyboard: JSON\.stringify\(kb\) \}\);\s*\}/, '{ keyboard: JSON.stringify(kb) });');
fs.writeFileSync('server.ts', c, 'utf8');
