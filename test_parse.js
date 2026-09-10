
const fs = require("fs");
const ts = require("typescript");

const source = fs.readFileSync("server.ts", "utf8");
const sf = ts.createSourceFile("server.ts", source, ts.ScriptTarget.Latest, true);

const diagnostics = sf.parseDiagnostics;
console.log("Found", diagnostics.length, "parse diagnostics");
for (const diag of diagnostics.slice(0, 10)) {
  const { line, character } = sf.getLineAndCharacterOfPosition(diag.start);
  console.log(`Line ${line+1}:${character+1} - ${diag.messageText}`);
}
