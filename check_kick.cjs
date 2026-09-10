const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(\["\/kick"/g;
let m;
while((m = regex.exec(code)) !== null) {
   console.log("MATCH:", m.index);
}
