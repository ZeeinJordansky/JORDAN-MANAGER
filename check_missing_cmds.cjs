const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const allCmds = fs.readFileSync('valid_cmds.txt', 'utf8').split('\n').map(c => c.trim()).filter(c => c.length > 0);

const missing = [];
for (const cmd of allCmds) {
    if (!content.includes(`"${cmd}"`) && !content.includes(`'${cmd}'`)) {
        missing.push(cmd);
    }
}

console.log('Missing commands count:', missing.length);
console.log('Missing commands:', missing.join(', '));
