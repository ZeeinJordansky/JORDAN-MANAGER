const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// I will just add a global helper, and carefully replace user.role checks where it makes sense, or maybe just redefine user.role locally in message_new handler?
const anchor = `      const user = await getOrCreateUser(userId);`;
const newAnchor = `      const user = await getOrCreateUser(userId);
      user.globalRole = user.role || 0;
      user.role = user.globalRole >= 7 ? user.globalRole : ((user.chatRoles && user.chatRoles[peerId]) || 0);
`;

code = code.replace(anchor, newAnchor);

const anchor2 = `await updateUser(parsed.targetId, { role: giveRole });`;
const newAnchor2 = `
         if (giveRole >= 7) {
            await updateUser(parsed.targetId, { role: giveRole });
         } else {
            const tUser = await getOrCreateUser(parsed.targetId);
            const chatRoles = tUser.chatRoles || {};
            chatRoles[peerId] = giveRole;
            await updateUser(parsed.targetId, { chatRoles });
         }
`;

code = code.replace(anchor2, newAnchor2);

fs.writeFileSync('server.ts', code);
console.log("Roles scope fixed");
