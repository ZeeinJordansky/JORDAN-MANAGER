const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');
const curr = fs.readFileSync('server.ts', 'utf8');

console.log("Original length:", orig.length);
console.log("Current length:", curr.length);

