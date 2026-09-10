const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /return await sendResponse\(`\[id\$\{userId\}\|Модератор\](.*?)\`,\s*\{ noReply: true \}\);/g;
let m;
while((m = regex.exec(code)) !== null) {
   console.log("MATCH:", m[0]);
}
