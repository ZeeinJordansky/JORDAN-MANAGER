const fs = require("fs");

let code = fs.readFileSync("server.ts", "utf8");

console.log("Applying complete script patch...");

// Replace /addzsa and /addsa usages
code = code.replace(/rawCmd === "\/addzsa"/g, 'rawCmd === "/addzga"');
code = code.replace(/rawCmd === "\/addsa"/g, 'rawCmd === "/addga"');

// Ensure MANAGEMENT_ONLY_CMDS set includes all requested commands
const mgmtBlock = `
const MANAGEMENT_ONLY_CMDS = new Set([
  "/gban", "/ungban", "/gbanlist", "/blacklist", "/rstats", "/grrole", "/banid", "/unbanid",
  "/infochat", "/infoid", "/addblack", "/unblack", "/gsnick", "/grnick", "/zunban", "/addzsr",
  "/addozsr", "/rebuke", "/unrebuke", "/addruk", "/addgr", "/addga", "/addzga"
]);
`;

if (code.includes("const MANAGEMENT_ONLY_CMDS")) {
  code = code.replace(/const MANAGEMENT_ONLY_CMDS = new Set\(\[[^\]]+\]\);/, mgmtBlock.trim());
}

fs.writeFileSync("server.ts", code);
console.log("build_full_patch.cjs step 1 finished.");
