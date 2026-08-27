const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The line was: const match = trimmed.match(/^([\/+!\.,]?[\S]+)[\s
// and then a newline
// It should probably be: const match = trimmed.match(/^([\/+!\.,]?[\S]+)[\s\n]*([\s\S]*)$/);

content = content.replace(/const match = trimmed\.match\(\/\^\(\[\\\/ \+!\\\.,\]\?\[\\S\]\+\)\[\\s\n/g, 'const match = trimmed.match(/^([\\/\\+!\\.,]?[\\S]+)[\\s\\n]*([\\s\\S]*)$/); //');

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed regex');
