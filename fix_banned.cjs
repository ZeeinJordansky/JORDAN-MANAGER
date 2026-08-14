const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const filterAnchor = `      // Global blocks check
      if (user.gban || (chatData.type === "PL" && user.gbanpl) || user.blacklisted) {
         return; // User is blocked from using the bot
      }`;

const newFilter = `      // Global blocks check
      if (user.gban || (chatData.type === "PL" && user.gbanpl) || user.blacklisted) {
         return; // User is blocked from using the bot
      }
      if (chatData.banned) return; // Chat is banned
`;

code = code.replace(filterAnchor, newFilter);
fs.writeFileSync('server.ts', code);
console.log("Chat ban check added");
