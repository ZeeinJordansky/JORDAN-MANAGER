const fs = require('fs');
const content = fs.readFileSync('server.ts.clean_real', 'utf8');

// Use a simple regex to find the start of the function and everything after it
const startIdx = content.indexOf('async function startBotsLongPoll');
if (startIdx !== -1) {
    const rest = content.substring(startIdx);
    // Find the end of startServer or something
    fs.writeFileSync('restored_parts.txt', rest);
    console.log("Restored parts to restored_parts.txt");
} else {
    console.log("startBotsLongPoll not found in clean_real");
}
