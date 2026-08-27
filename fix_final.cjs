const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Find the long line containing activate_chat
const idx = content.indexOf('if (cmd === "activate_chat") {\\n');
if (idx !== -1) {
    // Let's replace ALL literal \\n in this block with real \n
    // First, let's locate the block end. It ends with 'аннулировал(-а) роли вышедшего пользователя.");\\n    }'
    const blockEndStr = 'аннулировал(-а) роли вышедшего пользователя.");\\n    }';
    const endIdx = content.indexOf(blockEndStr, idx);
    if (endIdx !== -1) {
        const fullBlockEnd = endIdx + blockEndStr.length;
        const block = content.slice(idx, fullBlockEnd);
        const fixedBlock = block.replace(/\\n/g, '\n');
        content = content.slice(0, idx) + fixedBlock + content.slice(fullBlockEnd);
        console.log('Fixed \\n in activate_chat block');
    } else {
        console.log('Could not find block end');
    }
} else {
    console.log('Could not find activate_chat');
}

fs.writeFileSync('server.ts', content, 'utf8');
