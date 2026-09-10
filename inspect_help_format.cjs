const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// Check help command in clean_real
const idx = clean.indexOf('...::Помощь по командам бота::...');
console.log('idx:', idx);
if (idx !== -1) {
  console.log(clean.substring(idx - 100, idx + 1500));
}
