const fs = require("fs");
let lines = fs.readFileSync("server.ts", "utf8").split("\n");

// Fix 1: line 7656 extra });
if (lines[7655].includes("});") && lines[7654].includes("});")) {
  lines.splice(7655, 1);
  console.log("Fixed 7656");
}

// Fix 2: double closing in forward: JSON.stringify
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("forward:") && lines[i+1] && lines[i+1].trim() === "});" && lines[i+2] && lines[i+2].trim() === "});") {
    console.log(`Fixing double closing at line ${i+1}`);
    lines.splice(i+1, 1);
  }
}

fs.writeFileSync("server.ts", lines.join("\n"));
