const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');
const sourceFile = ts.createSourceFile('server.ts', code, ts.ScriptTarget.Latest, true);

function visit(node) {
    // try to find the node containing line 8837
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    if (start.line <= 8837 && end.line >= 8837) {
        if (ts.isTryStatement(node)) {
            console.log(`Found a try statement covering 8837! From ${start.line} to ${end.line}`);
        }
    }
    ts.forEachChild(node, visit);
}

visit(sourceFile);
