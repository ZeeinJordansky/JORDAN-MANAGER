const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(/params:\s*\{([^}]*)\}\s*\n\s*\}\);\s*\n\s*\}\);/g, 'params: {$1}\n              });');
c = c.replace(/ \}\);\s*,\s*\n\s*disable_mentions: 1/g, ' },\n            disable_mentions: 1');
c = c.replace(/forward:\s*JSON\.stringify\(\{[^}]+\}\)\s*\n\s*\}\,\s*\n\s*disable_mentions:/g, 'forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true }),\n            disable_mentions:');
c = c.replace(/(forward:\s*JSON\.stringify\(\{\s*peer_id:[^}]+\}\))\s*\n\s*\}\);\s*\n\s*\}\);/g, '$1\n        });');
c = c.replace(/(params:\s*\{[^}]+\})\s*\n\s*\}\s*catch/g, '$1\n                 });\n                } catch');
c = c.replace(/(params:\s*\{[^}]+\})\s*\n\s*const (members|conv) = /g, '$1\n                  });\n                  const $2 = ');
c = c.replace(/params: \{ access_token: VK_TOKEN, v: "5\.199", peer_id: peerId \}\s*\n\s*\}\);\s*\}\);/g, 'params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId } });');

fs.writeFileSync('server.ts', c, 'utf8');
