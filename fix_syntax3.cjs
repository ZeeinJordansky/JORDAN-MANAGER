const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/ \}\);\s*,\s*\n\s*disable_mentions: 1/g, ' },\n            disable_mentions: 1');

fs.writeFileSync('server.ts', content, 'utf8');
