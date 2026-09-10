const fs = require('fs');
let code = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/help", "\/помощь", "\/хелп", "\/команды", "\/меню", "\/gamehelp"\]\.includes\(rawCmd\)\) \{/g;
let m = regex.exec(code);
if (m) {
  const start = m.index;
  // find the end of this if block. It's followed by another `} else if (["/games", "/игры"]` probably?
  const end = code.indexOf('} else if (["/games", "/игры"]', start);
  console.log(code.substring(start, end));
} else {
  console.log("Not found");
}
