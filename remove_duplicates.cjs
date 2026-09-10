const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const seen = new Set();
const result = [];

let inDuplicateBlock = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Simple check for duplicate exports/functions
    const match = line.match(/(?:export const|async function|function|const|let) (\w+)/);
    if (match) {
        const name = match[1];
        if (seen.has(name) && !['if', 'for', 'while', 'switch'].includes(name)) {
            // This is a duplicate declaration
            // But be careful: handleVkEvent IS a duplicate I want to remove if it's the second one
            if (name === 'handleVkEvent' || i > 5000) {
                 console.log(`Removing duplicate: ${name} at line ${i+1}`);
                 continue; 
            }
        }
        seen.add(name);
    }
    result.push(line);
}

fs.writeFileSync('server.ts', result.join('\n'));
console.log("Duplicates removed!");
