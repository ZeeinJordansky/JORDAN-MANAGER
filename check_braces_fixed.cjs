const fs = require('fs');
try {
  const content = fs.readFileSync('server_test.ts', 'utf8');
  let line = 1;
  let col = 1;
  let stack = [];
  let inString = null;
  let inComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];

    if (!inString && !inComment) {
      if (char === '/' && nextChar === '/') {
        inComment = 'line';
      } else if (char === '/' && nextChar === '*') {
        inComment = 'block';
      } else if (char === '"' || char === "'" || char === '`') {
        inString = char;
      } else if (char === '{') {
        stack.push({line, col});
      } else if (char === '}') {
        if (stack.length === 0) {
          console.log(`Unmatched } at line ${line}, col ${col}`);
        } else {
          stack.pop();
        }
      }
    } else if (inComment === 'line' && char === '\n') {
      inComment = false;
    } else if (inComment === 'block' && char === '*' && nextChar === '/') {
      inComment = false;
      i++;
    } else if (inString && char === inString && content[i-1] !== '\\') {
      inString = null;
    }

    if (char === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  console.log(`Final stack depth: ${stack.length}`);
  if (stack.length > 0) {
    console.log(`Unclosed { at line ${stack[stack.length-1].line}, col ${stack[stack.length-1].col}`);
  }
} catch (e) {
  console.error(e);
}
