const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const searchStr = `let keyboard = { inline: true, buttons: [] as any[] };`;
const idx = code.indexOf(searchStr, code.indexOf('cmd_help_main'));
if (idx !== -1) {
  console.log(code.substring(idx, idx + 1000));
}
