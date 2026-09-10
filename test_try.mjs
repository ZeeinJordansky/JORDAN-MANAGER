
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
const tryStmt = s11.thenStatement.statements[23];
console.log("Try block statement count:", tryStmt.tryBlock.statements.length);
for (let i = 0; i < tryStmt.tryBlock.statements.length; i++) {
  const child = tryStmt.tryBlock.statements[i];
  const start = sf.getLineAndCharacterOfPosition(child.getStart(sf));
  const end = sf.getLineAndCharacterOfPosition(child.getEnd());
  console.log(`    try child ${i}: ${ts.SyntaxKind[child.kind]} lines ${start.line+1}-${end.line+1}`);
}
console.log("Catch clause:", tryStmt.catchClause ? "present" : "none");
