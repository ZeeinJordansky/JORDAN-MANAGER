const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/(params:\s*\{[^}]+\})\s*\n\s*\}\s*catch/g, '$1\n                 });\n                } catch');

fs.writeFileSync('server.ts', content, 'utf8');
