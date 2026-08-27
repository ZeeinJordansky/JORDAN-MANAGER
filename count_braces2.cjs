const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let depth = 0;
let inFunc = false;
for (let i = 4320; i < 14560; i++) {
  const line = lines[i];
  if (!line) continue;
  if (line.includes('async function handleVkEvent')) {
     inFunc = true;
  }
  if (!inFunc) continue;
  
  for (let j = 0; j < line.length; j++) {
    // Ignore { and } inside strings or regexes... this is tricky without a real parser,
    // but let's just see where it goes to 0 or negative.
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
  }
  if (depth <= 0) {
    console.log(`Depth hit ${depth} at line ${i+1}: ${line}`);
    if (depth < 0) break;
  }
}
