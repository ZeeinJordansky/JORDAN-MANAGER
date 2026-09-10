const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const seen = new Set();
const result = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Only match top-level declarations (starts with export, async function, etc. at index 0)
    const topLevelMatch = line.match(/^(?:export |async function |function |const |let |var )(\w+)/);
    if (topLevelMatch) {
        const name = topLevelMatch[1];
        if (seen.has(name)) {
            console.log(`Removing top-level duplicate: ${name} at line ${i+1}`);
            continue;
        }
        seen.add(name);
    }
    result.push(line);
}

fs.writeFileSync('server.ts', result.join('\n'));
console.log("Top-level duplicates removed!");
