import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix message_new missing try
const target = 'if (type === "message_new") {';
const index = code.indexOf(target);
if (index !== -1 && !code.includes('if (type === "message_new") {\n      try {')) {
    code = code.replace(target, 'if (type === "message_new") {\n      try {');
    console.log('Added try to message_new');
}

// 2. Fix the 10681 error (if it's still there)
// The catch is at line 10681 (approx)
// I'll ensure there are enough closing braces at the end of message_new

// Let's count try/catch in the whole file
const tries = (code.match(/try\s*\{/g) || []).length;
const catches = (code.match(/catch\s*\(/g) || []).length;

console.log('Final Tries:', tries, 'Catches:', catches);

fs.writeFileSync('server.ts', code, 'utf8');
