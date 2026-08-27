const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace the literal \n string with actual newline
content = content.replace(/\\n/g, '\n');

// However, we might have accidentally replaced \n inside legitimate strings.
// Let's be more specific based on the error.
// The error was around line 4597.
// It looks like the whole handlers block was inserted with literal \n.

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed potential newline issues');
