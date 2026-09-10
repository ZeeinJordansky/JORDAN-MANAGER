const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

// I want to see if the original code was removed or commented out.
const kickOriginal = code.indexOf('["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)');
const warnOriginal = code.indexOf('["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)');

console.log('Kick indices:');
let pos = 0;
while(true) {
  const i = code.indexOf('["/kick"', pos);
  if (i === -1) break;
  console.log(i, code.substring(i - 50, i + 100).replace(/\n/g, ' '));
  pos = i + 1;
}

console.log('Warn indices:');
pos = 0;
while(true) {
  const i = code.indexOf('["/warn"', pos);
  if (i === -1) break;
  console.log(i, code.substring(i - 50, i + 100).replace(/\n/g, ' '));
  pos = i + 1;
}
