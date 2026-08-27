const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

let inLiteral = false;
let literalStartLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let pos = 0;
    while ((pos = line.indexOf('`', pos)) !== -1) {
        if (pos === 0 || line[pos-1] !== '\\') {
            inLiteral = !inLiteral;
            if (inLiteral) literalStartLine = i + 1;
            else literalStartLine = -1;
        }
        pos++;
    }
}

if (inLiteral) {
    console.log('Unterminated template literal starts at line:', literalStartLine);
    const start = Math.max(0, literalStartLine - 5);
    const end = Math.min(lines.length, literalStartLine + 20);
    for (let j = start; j < end; j++) {
        console.log((j + 1) + ": " + lines[j]);
    }
} else {
    console.log('No unterminated template literal found.');
}
