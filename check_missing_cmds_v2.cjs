const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const allCmds = fs.readFileSync('valid_cmds.txt', 'utf8').split('\n').map(c => c.trim()).filter(c => c.length > 0);

const missing = [];
for (const cmd of allCmds) {
    const pattern1 = `rawCmd === "${cmd}"`;
    const pattern2 = `rawCmd === '${cmd}'`;
    const pattern3 = `"${cmd}"`;
    const pattern4 = `'${cmd}'`;
    
    if (!content.includes(pattern1) && !content.includes(pattern2) && !content.includes(pattern3) && !content.includes(pattern4)) {
        missing.push(cmd);
    }
}

console.log('Missing commands count:', missing.length);
console.log('Missing commands:', missing.join(', '));
