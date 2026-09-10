const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');
const search = 'if (["/stats", "/стата", "/статистика", "/профиль", "/profile", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd)) {';

const idx = orig.indexOf(search);
console.log("Found logging stats block at:", idx);

const search2 = 'if (["/stats", "/стата", "/статистика", "/профиль", "/profile", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd))';

let i = 0;
while(true) {
  const next = orig.indexOf(search2, i);
  if (next === -1) break;
  console.log("MATCH:", next);
  console.log(orig.substring(next, next + 100));
  i = next + 1;
}

