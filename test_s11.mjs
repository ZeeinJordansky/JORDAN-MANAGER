
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const sf = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);

let handleFn = null;
for (const stmt of sf.statements) {
  if (stmt.kind === ts.SyntaxKind.FunctionDeclaration && stmt.name?.text === "handleVkEvent") {
    handleFn = stmt;
    break;
  }
}

const s11 = handleFn.body.statements[11];
console.log("s11 kind:", ts.SyntaxKind[s11.kind]);
if (s11.thenStatement && s11.thenStatement.statements) {
  for (let i = 0; i < s11.thenStatement.statements.length; i++) {
    const child = s11.thenStatement.statements[i];
    const start = sf.getLineAndCharacterOfPosition(child.getStart(sf));
    const end = sf.getLineAndCharacterOfPosition(child.getEnd());
    console.log(`  s11 child ${i}: ${ts.SyntaxKind[child.kind]} lines ${start.line+1}-${end.line+1}`);
  }
}
