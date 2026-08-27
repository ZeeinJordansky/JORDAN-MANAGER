const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/(\n\s*params:\s*\{[^}]+\}\s*\n\s*\}[^;]*\);)\s*\n\s*\}\s*\)\s*;/g, '$1');

fs.writeFileSync('server.ts', content, 'utf8');
