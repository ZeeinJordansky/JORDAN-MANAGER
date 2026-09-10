const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// Search for warn / unwarn / kick / help in clean_real
const idxs = [];
let pos = 0;
while (true) {
  const match = clean.indexOf('sendResponse', pos);
  if (match === -1) break;
  const chunk = clean.substring(match - 100, match + 200);
  if (chunk.includes('/warn') || chunk.includes('/unwarn') || chunk.includes('/kick') || chunk.includes('/help') || chunk.includes('warns') || chunk.includes('предупрежд') || chunk.includes('исключил')) {
    idxs.push(match);
  }
  pos = match + 12;
}

console.log('Found matches:', idxs.length);
idxs.slice(0, 15).forEach(idx => {
  console.log('--- AT POS', idx, '---');
  console.log(clean.substring(idx - 100, idx + 300));
});
