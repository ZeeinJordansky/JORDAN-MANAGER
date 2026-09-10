import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/return \`\\\$\\{formatUserMention\\(id, String\\(name\\), "nom"\\)\\}\\`;/g, 'return `[id${id}|${name}]`;');

fs.writeFileSync('server.ts', code);
