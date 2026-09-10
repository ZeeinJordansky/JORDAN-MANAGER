const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
let orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regexOrig = /if \(\["\/help", "\/помощь", "\/хелп", "[\s\S]*?\n      \}      \/\/ \/warn/g;
let mOrig = regexOrig.exec(orig);

// Actually, let's just find the exact block from server.ts.clean_real for help
const helpStart = orig.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');
const helpEnd = orig.indexOf('if (["/mute", "/мут"', helpStart);
const origHelpCode = orig.substring(helpStart, helpEnd).replace(/\/\/ \/warn \& \/swarn\s*$/, '');
console.log("Found orig help length:", origHelpCode.length);

const helpStartCurrent = code.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');
const helpEndCurrent = code.indexOf('// /warn & /swarn', helpStartCurrent);

if (helpStartCurrent !== -1 && helpEndCurrent !== -1 && origHelpCode.length > 50) {
   const before = code.substring(0, helpStartCurrent);
   const after = code.substring(helpEndCurrent);
   code = before + origHelpCode + "      " + after;
   fs.writeFileSync('server.ts', code, 'utf8');
   console.log("Help restored!");
} else {
   console.log("Failed to find boundaries in current code.");
}
