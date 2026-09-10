const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const badStart = code.indexOf('      import express from "express";');
const badEndStr = '      // /warn & /swarn';
const badEnd = code.indexOf(badEndStr, badStart);

if (badStart !== -1 && badEnd !== -1) {
   const before = code.substring(0, badStart);
   const after = code.substring(badEnd);
   code = before + after;
   fs.writeFileSync('server.ts', code, 'utf8');
   console.log("Removed bad block! Size:", code.length);
} else {
   console.log("Not found.");
}
