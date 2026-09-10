
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const lines = source.split("\n");
const snippet = lines.slice(4603, 13951).join("\n");

const sf = ts.createSourceFile("snippet.ts", snippet, ts.ScriptTarget.Latest, true);
console.log("Snippet diagnostics count:", sf.parseDiagnostics.length);
for (const diag of sf.parseDiagnostics) {
  const { line, character } = sf.getLineAndCharacterOfPosition(diag.start);
  console.log(`Diag line ${line+4604}:${character+1} - ${diag.messageText}`);
}
