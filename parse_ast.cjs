const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');
const sourceFile = ts.createSourceFile('server.ts', code, ts.ScriptTarget.Latest, true);

function visit(node) {
    if (ts.isTryStatement(node)) {
        if (!node.catchClause && !node.finallyBlock) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            console.log(`Unclosed try at line ${start.line + 1}`);
        }
    }
    ts.forEachChild(node, visit);
}

visit(sourceFile);
