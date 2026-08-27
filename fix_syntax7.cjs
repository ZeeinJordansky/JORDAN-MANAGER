const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/(params:\s*\{[^}]+\})\s*\n\s*const (members|conv) = /g, '$1\n                  });\n                  const $2 = ');

fs.writeFileSync('server.ts', content, 'utf8');
