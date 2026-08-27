const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let depth = 0;
for (let i = 4320; i < 14560; i++) {
  const line = lines[i];
  if (!line) continue;
  if (line.includes('async function handleVkEvent')) {
     console.log('Start function at line ' + (i+1));
  }
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
  }
  if (i > 14550) {
    console.log(`Line ${i+1}: Depth ${depth} | ${line}`);
  }
}
