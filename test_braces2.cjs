const fs = require('fs');
let c = fs.readFileSync('server.ts.bak', 'utf8');

let m;
const regex = /params:\s*\{([^}]*)\}\s*\n\s*\}\);\s*\n\s*\}\);/g;
while ((m = regex.exec(c)) !== null) {
  const lineNo = c.substring(0, m.index).split('\n').length;
  console.log(`Matched at line ${lineNo}:\n${m[0]}\n`);
}
