const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const filterAnchor = `      if (chatData.silence && (!user.role || user.role < 3) && !isAdmin) {`;
const newBlock = `
      // Global blocks check
      if (user.gban || (chatData.type === "PL" && user.gbanpl) || user.blacklisted) {
         return; // User is blocked from using the bot
      }

      if (chatData.silence && (!user.role || user.role < 3) && !isAdmin) {`;

code = code.replace(filterAnchor, newBlock);
fs.writeFileSync('server.ts', code);
console.log("Block check added");
