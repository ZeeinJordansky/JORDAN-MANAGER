const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/await updateUser\(tId, { role: 6 }\);\n\s*await updateUser\(userId, { role: 5 }\);/, `const tUser1 = await getOrCreateUser(tId);
            const chatRoles1 = tUser1.chatRoles || {};
            chatRoles1[peerId] = 6;
            await updateUser(tId, { chatRoles: chatRoles1 });
            
            const tUser2 = await getOrCreateUser(userId);
            const chatRoles2 = tUser2.chatRoles || {};
            chatRoles2[peerId] = 5;
            await updateUser(userId, { chatRoles: chatRoles2 });`);

fs.writeFileSync('server.ts', code);
console.log("Giveowner payload fixed");
