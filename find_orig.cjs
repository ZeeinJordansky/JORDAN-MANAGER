const fs = require('fs');
const code = fs.readFileSync('server.ts.clean_real', 'utf8');
const kickIdx = code.indexOf('if (["/kick"');
console.log('kickIdx', kickIdx);
const warnIdx = code.indexOf('if (["/warn"');
console.log('warnIdx', warnIdx);
