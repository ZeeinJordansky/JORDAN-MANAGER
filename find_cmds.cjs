const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const statsIdx = orig.indexOf('if (["/stats"');
console.log("Stats original code:");
console.log(orig.substring(statsIdx, orig.indexOf('if (["/balance"', statsIdx)));

const helpIdx = orig.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');
console.log("Help original code:");
if (helpIdx !== -1) {
    console.log(orig.substring(helpIdx, orig.indexOf('if (["/mute", "/мут"', helpIdx)));
} else {
    console.log("Help not found");
}

