const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// Let's find where help command is processed when user sends /help or /помощь
let pos = 0;
while (true) {
  const match = clean.indexOf('cmd_help_main', pos);
  if (match === -1) break;
  console.log('--- Found cmd_help_main at pos', match, '---');
  console.log(clean.substring(match - 200, match + 400));
  pos = match + 14;
}
