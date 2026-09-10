const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// Find a block that looks like the warn command response.
// Let's search for "предупреждение"
let pos = 0;
while(true) {
  const i = clean.indexOf('предупреждение', pos);
  if (i === -1) break;
  const snippet = clean.substring(i - 100, i + 200).replace(/\n/g, ' ');
  if (snippet.includes('sendResponse')) {
     console.log(snippet);
  }
  pos = i + 1;
}
