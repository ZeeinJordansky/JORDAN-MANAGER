const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helpStartCurrent = code.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');

// The original help code had `if (["/mute"` at the end, but wait, the string I inserted was `origHelpCode`.
// Let's find the second `/warn & /swarn` if the first one was part of the insertion?
// Actually, let's just find `// /warn & /swarn` AFTER helpStartCurrent.
let searchIdx = helpStartCurrent + 100;
let helpEndCurrent = code.indexOf('// /warn & /swarn', searchIdx);

// If it's a huge block, helpEndCurrent will be far away. Let's see how far.
console.log("Help start:", helpStartCurrent);
console.log("Help end:", helpEndCurrent);
console.log("Diff:", helpEndCurrent - helpStartCurrent);
