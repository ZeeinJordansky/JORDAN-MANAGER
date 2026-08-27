const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const target = `const botStartTime = Date.now();`;

const replacement = `const botStartTime = Date.now();

// X2 Mode Global State
let x2ModeActive = false;
let x2ManualOverride = false;
function isX2ModeActive() { return x2ModeActive; }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Updated globals successfully.");
} else {
    console.log("Target not found!");
}
