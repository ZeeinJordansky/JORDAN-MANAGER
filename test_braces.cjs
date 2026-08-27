const fs = require('fs');
let c = fs.readFileSync('server.ts.bak', 'utf8');

const m = c.match(/params:\s*\{([^}]*)\}\s*\n\s*\}\);\s*\n\s*\}\);/g);
console.log(m ? m.length : 0);
