const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Fix extra }); after params: { ... }
content = content.replace(/params:\s*\{([^}]+)\}\s*\n\s*\}\);\s*\n\s*\}\);/g, 'params: {$1}\n              });');

fs.writeFileSync('server.ts', content, 'utf8');
