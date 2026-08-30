const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');
const sourceFile = ts.createSourceFile('server.ts', code, ts.ScriptTarget.Latest, true);

const diagnostics = sourceFile.parseDiagnostics;
for (const diag of diagnostics) {
    if (diag.file) {
        const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
        const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
        console.log(`Line ${line + 1}: ${msg}`);
    }
}
