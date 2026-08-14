const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\/\/ Ban in vk group/, `await updateUser(parsed.targetId, { blacklisted: true });\n         // Ban in vk group`);

fs.writeFileSync('server.ts', code);
console.log("Addblack fixed");
