const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace { quality: 0.86 } or { quality: 0.88 } with { quality: 0.65 } to speed up generation and upload size
code = code.replace(/\{ quality: 0\.8[0-9] \}/g, "{ quality: 0.65 }");

fs.writeFileSync('server.ts', code);
console.log("Patched JPEG quality");
