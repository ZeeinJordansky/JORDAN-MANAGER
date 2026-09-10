
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const sf = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);

let handleFn = sf.statements.find(s => s.kind === ts.SyntaxKind.FunctionDeclaration && s.name?.text === "handleVkEvent");
let s11 = handleFn.body.statements[11];
let tryStmt = s11.thenStatement.statements[23];
let ifChain = tryStmt.tryBlock.statements[75];

console.log("IfChain kind:", ts.SyntaxKind[ifChain.kind]);

// Traverse the if-else-if chain
let current = ifChain;
let depth = 0;
while (current) {
  const start = sf.getLineAndCharacterOfPosition(current.getStart(sf));
  const end = sf.getLineAndCharacterOfPosition(current.getEnd());
  console.log(`Branch ${depth}: lines ${start.line+1}-${end.line+1}`);
  if (current.elseStatement && current.elseStatement.kind === ts.SyntaxKind.IfStatement) {
    current = current.elseStatement;
    depth++;
  } else {
    if (current.elseStatement) {
      const eStart = sf.getLineAndCharacterOfPosition(current.elseStatement.getStart(sf));
      const eEnd = sf.getLineAndCharacterOfPosition(current.elseStatement.getEnd());
      console.log(`Final else: lines ${eStart.line+1}-${eEnd.line+1}`);
    }
    break;
  }
}
