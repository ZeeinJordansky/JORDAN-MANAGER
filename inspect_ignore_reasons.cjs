const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

// Search for places where message processing might return early (ignoring commands)
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i > 8000 && i < 11800) {
    if (line.includes('return') && (line.includes('active') || line.includes('role') || line.includes('isAdmin') || line.includes('knownCmds') || line.includes('ALL_GAME') || line.includes('startsWith') || line.includes('banWords') || line.includes('MANAGER_CMDS') || line.includes('rights') || line.includes('noprefix'))) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  }
}
