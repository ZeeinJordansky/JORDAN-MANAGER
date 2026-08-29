import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix modName at line 6337 (approx)
code = code.replace(/Модератор, который снял блокировку - \[id\${userId}\|\${modName}\]/g, 'Модератор, который снял блокировку - [id${userId}|${fullName}]');

// 2. Re-organize message_new declarations
const msgNewStart = 'if (type === "message_new") {';
const msgNewStartIndex = code.indexOf(msgNewStart);

if (msgNewStartIndex !== -1) {
    // Find where sendResponse is defined
    const srDef = 'const sendResponse = async (responseText: string, extraParams: any = {}) => {';
    const srIndex = code.indexOf(srDef);
    
    // Find where sendResponse ends (it's a long block)
    // Actually, I'll just find the first few declarations and move them up
    
    // Let's find the first few lines of message_new
    const insertionPointText = 'const text = message.text ? message.text.trim() : "";';
    const insertionIndex = code.indexOf(insertionPointText, msgNewStartIndex) + insertionPointText.length;
    
    if (insertionIndex !== -1 && srIndex !== -1) {
        // Find the whole sendResponse block
        // It usually ends with `    };`
        let srEndIndex = code.indexOf('    };', srIndex) + 6;
        
        const srBlock = code.slice(srIndex, srEndIndex);
        
        // Remove it from old place
        code = code.slice(0, srIndex) + code.slice(srEndIndex);
        
        // Insert at top
        code = code.slice(0, insertionIndex) + "\n\n      " + srBlock + "\n" + code.slice(insertionIndex);
    }
}

// 3. Move rawCmd and args up too
const rawCmdDef = 'const args = cmdText.split(/\\s+/);';
const rcIndex = code.indexOf(rawCmdDef);
if (rcIndex !== -1) {
    const rcEndIndex = code.indexOf('const rawCmd = args[0].toLowerCase();', rcIndex) + 'const rawCmd = args[0].toLowerCase();'.length;
    const rcBlock = code.slice(rcIndex, rcEndIndex);
    
    // Remove it
    code = code.slice(0, rcIndex) + code.slice(rcEndIndex);
    
    // Insert after sendResponse (find it again since index changed)
    const insertionPoint = code.indexOf('const sendResponse =');
    const nextLineIndex = code.indexOf('\n', insertionPoint);
    // Actually, find the end of the sendResponse block
    const srEnd = code.indexOf('      };', insertionPoint) + 8;
    
    code = code.slice(0, srEnd) + "\n      " + rcBlock + "\n" + code.slice(srEnd);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Fixed declarations and modName');
