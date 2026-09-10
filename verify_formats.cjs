const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexes = [
  /\[id\$\{parsed\.targetId\}\|пользователю\] выдано предупреждение/,
  /\[id\$\{parsed\.targetId\}\|пользователю\] было снято предупреждение/,
  /был\(-а\) исключён из беседы по причине:/
];

for (const r of regexes) {
  if (r.test(code)) {
    console.log("Found:", r);
  } else {
    console.log("NOT FOUND:", r);
  }
}
