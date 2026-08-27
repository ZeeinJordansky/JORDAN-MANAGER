const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/params: \{ access_token: VK_TOKEN, v: "5\.199", peer_id: peerId \}\s*\n\s*\}\);\s*\}\);/g, 'params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId } });');

fs.writeFileSync('server.ts', content, 'utf8');
