
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const sf = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);

// Find the handleVkEvent function declaration
let handleFn = null;
for (const stmt of sf.statements) {
  if (stmt.kind === ts.SyntaxKind.FunctionDeclaration) {
    const name = stmt.name ? stmt.name.text : "";
    if (name === "handleVkEvent") {
      handleFn = stmt;
      break;
    }
  }
}

if (handleFn) {
  console.log("Found handleVkEvent!");
  // Check its body statements
  const body = handleFn.body;
  if (body) {
    console.log("Body statement count:", body.statements.length);
    for (let i = 0; i < body.statements.length; i++) {
      const s = body.statements[i];
      const start = sf.getLineAndCharacterOfPosition(s.getStart(sf));
      const end = sf.getLineAndCharacterOfPosition(s.getEnd());
      console.log(`Stmt ${i}: ${ts.SyntaxKind[s.kind]} lines ${start.line+1}-${end.line+1}`);
    }
  }
}
