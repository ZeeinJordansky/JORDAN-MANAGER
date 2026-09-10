const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const kickIdx = clean.indexOf('if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {');
console.log('Original kick idx:', kickIdx);
if (kickIdx !== -1) {
    const end = clean.indexOf('}', kickIdx + 100);
    console.log(clean.substring(kickIdx, end + 100));
}
