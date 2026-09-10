
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const sf = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);

for (const stmt of sf.statements) {
  const start = sf.getLineAndCharacterOfPosition(stmt.getStart(sf));
  const end = sf.getLineAndCharacterOfPosition(stmt.getEnd());
  console.log(`Stmt: ${ts.SyntaxKind[stmt.kind]} lines ${start.line+1}-${end.line+1}`);
}
