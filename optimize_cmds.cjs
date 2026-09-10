const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const knownCmds = \[([\s\S]*?)\];/g, 'const knownCmds = new Set([$1]);');
code = code.replace(/knownCmds\.includes\(/g, 'knownCmds.has(');

fs.writeFileSync('server.ts', code);
