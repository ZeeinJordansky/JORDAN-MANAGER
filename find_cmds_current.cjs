const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const statsIdx = code.indexOf('if (["/stats"');
console.log("Stats current code:");
console.log(code.substring(statsIdx, code.indexOf('if (["/balance"', statsIdx)));

const helpIdx = code.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands", "/gamehelp"].includes(rawCmd)) {');
console.log("Help current code:");
if (helpIdx !== -1) {
    console.log(code.substring(helpIdx, code.indexOf('if (["/mute", "/мут"', helpIdx)));
} else {
    console.log("Help not found");
}

