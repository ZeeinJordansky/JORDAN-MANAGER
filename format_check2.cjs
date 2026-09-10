const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

// find sendVkMessage or editVkMessage
let pos = 0;
while(true) {
  const i = clean.indexOf('предупреждение', pos);
  if (i === -1) break;
  const snippet = clean.substring(i - 100, i + 200).replace(/\n/g, ' ');
  if (snippet.includes('send') || snippet.includes('message')) {
     console.log('---', i);
     console.log(snippet);
  }
  pos = i + 1;
}
