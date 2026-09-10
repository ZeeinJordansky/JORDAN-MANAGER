
import ts from "typescript";
import fs from "fs";

const source = fs.readFileSync("server.ts", "utf8");
const lines = source.split("\n");

for (let i = 4604; i <= 13951; i += 200) {
  const sub = lines.slice(4603, i).join("\n") + "\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}\n}";
  const sf = ts.createSourceFile("sub.ts", sub, ts.ScriptTarget.Latest, true);
  // find first error not about trailing extra braces
  const syntaxErrors = sf.parseDiagnostics.filter(d => !d.messageText.includes("Declaration or statement expected"));
  if (syntaxErrors.length > 0) {
    console.log(`Errors appear around line ${i}:`, syntaxErrors.map(e => e.messageText));
    break;
  }
}
