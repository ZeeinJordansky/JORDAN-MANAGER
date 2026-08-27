const fs = require('fs');
let c = fs.readFileSync('update_events.cjs', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('update_events.cjs', c, 'utf8');
