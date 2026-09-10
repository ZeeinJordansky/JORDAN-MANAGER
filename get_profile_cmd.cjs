const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\["\/профиль", "\/profile".*?\{/g;
const m = regex.exec(code);
if (m) {
  console.log(code.substring(m.index, m.index + 800));
}
