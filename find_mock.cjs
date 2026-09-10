const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const helpIdx = code.indexOf('// /help & /gamehelp');
console.log('Help mock idx:', helpIdx);

if (helpIdx !== -1) {
  const endIdx = code.indexOf('// End of basic moderation commands');
  console.log('End mock idx:', endIdx);
  // I can replace this block with the original handlers from server.ts.clean_real.
}
