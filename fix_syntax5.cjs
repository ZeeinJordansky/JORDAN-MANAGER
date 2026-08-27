const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The issue is:
//             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
//                });
//         });

content = content.replace(/(forward:\s*JSON\.stringify\(\{\s*peer_id:[^}]+\}\))\s*\n\s*\}\);\s*\n\s*\}\);/g, '$1\n        });');

fs.writeFileSync('server.ts', content, 'utf8');
