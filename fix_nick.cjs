const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const target = `        const nick = remainingArgs.join(" ").trim();
        if (!nick) return await sendResponse("Укажите ник!");`;

const replacement = `        const nick = remainingArgs.join(" ").trim();
        if (!nick) return await sendResponse("Укажите ник!");
        if (nick.length > 35) return await sendResponse("Максимальная длина ника — 35 символов.");`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Updated Nick successfully.");
} else {
    console.log("Target not found!");
}
