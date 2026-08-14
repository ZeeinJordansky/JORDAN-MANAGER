const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/await updateUser\(parsed\.targetId, { role: 6 }\);/, `const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         chatRoles[peerId] = 6;
         await updateUser(parsed.targetId, { chatRoles });`);

fs.writeFileSync('server.ts', code);
console.log("Setowner fixed");
