const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/forward:\s*JSON\.stringify\(\{[^}]+\}\)\s*\n\s*\}\,\s*\n\s*disable_mentions:/g, 'forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true }),\n            disable_mentions:');

fs.writeFileSync('server.ts', content, 'utf8');
