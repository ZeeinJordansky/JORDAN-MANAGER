const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const matches = [];
let pos = 0;
while (true) {
  const idx = clean.indexOf('help_games', pos);
  if (idx === -1) break;
  matches.push(idx);
  pos = idx + 10;
}
console.log('Matches for help_games:', matches);
matches.forEach(m => console.log(clean.substring(m - 100, m + 300)));
