const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Fix the broken concatenation
const brokenPart = /\$\{bizIncome\.toLocaleString\(\)\}(\s*)function formatMessageWord/;
if (content.match(brokenPart)) {
    content = content.replace(brokenPart, (match, space) => {
        return `\${bizIncome.toLocaleString()}$\`;\n              \n              const kb = { ...mainKb };\n              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_tab_economy") === -1);\n              \n              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});\n              await sendVkMessage(VK_TOKEN, peerId, economyText, { keyboard: JSON.stringify(kb), attachment });\n              return;\n          }\n          ` + space + "function formatMessageWord";
    });
}

fs.writeFileSync('server.ts', content);
console.log("Syntax error fixed!");
