const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

let depth = 0;
for (let i = 0; i < code.length; i++) {
  // simple ignore inside quotes/comments?
  // Let's just do a naive check, if it goes < 0 it's an error
  // But wait, there are strings containing { and }.
  // Better yet, just use esbuild to format or find the syntax error.
}
