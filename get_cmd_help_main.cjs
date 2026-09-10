const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(cmd === "cmd_help_main"\) \{/g;
const m = regex.exec(code);
if (m) {
  console.log(code.substring(m.index, m.index + 800));
}
