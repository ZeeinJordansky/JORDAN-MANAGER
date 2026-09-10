const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const profileIdx = orig.indexOf('profile');
console.log(orig.substring(Math.max(0, profileIdx - 100), profileIdx + 100));
