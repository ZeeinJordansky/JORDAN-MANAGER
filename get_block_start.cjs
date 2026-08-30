const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

let braces = 0;
// start from the catch block at 12574 and go backwards
for(let i=12573; i>=0; i--) {
  const open = (lines[i].match(/\{/g) || []).length;
  const close = (lines[i].match(/\}/g) || []).length;
  braces += close - open;
  if (braces > 0) {
      if (lines[i].includes("try {") || lines[i].includes("try")) {
          console.log(`Matching try found at line ${i+1}: ${lines[i]}`);
          if (braces === 1) {
              console.log("This try should be the one!");
              break;
          }
      }
  }
}
