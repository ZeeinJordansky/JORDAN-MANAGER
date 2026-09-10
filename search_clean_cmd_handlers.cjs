const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const searchTerms = [
  'cmd_help_main',
  'gamehelp',
  'Помощь по командам',
  'Помощь по игровым командам',
  'checkHierarchy',
  'warnReason',
  'muteReason',
  'banReason'
];

searchTerms.forEach(term => {
  let pos = 0;
  console.log(`=== SEARCH: ${term} ===`);
  while (true) {
    const idx = clean.indexOf(term, pos);
    if (idx === -1) break;
    const line = clean.substring(0, idx).split('\n').length;
    console.log(`Pos ${idx}, line ${line}: ${clean.substring(idx - 60, idx + 140).replace(/\n/g, ' ')}`);
    pos = idx + term.length;
  }
});
