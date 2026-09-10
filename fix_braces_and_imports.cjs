const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Move imports to top
const importRegex = /import [\s\S]*?;/g;
const imports = content.match(importRegex) || [];
content = content.replace(importRegex, '');
content = imports.join('\n') + '\n' + content;

// 2. Fix the unclosed CP block
// Find the end of the CP economy tab and add the missing closing brace for the outer if
const brokenEnd = /return;\s*\}\s*function formatMessageWord/;
if (content.match(brokenEnd)) {
    content = content.replace(brokenEnd, 'return;\n      }\n    }\n    function formatMessageWord');
}

// 3. Remove any potential double imports or duplicates
// (Optional but good)

fs.writeFileSync('server.ts', content);
console.log("Braces fixed and imports moved!");
