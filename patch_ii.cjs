const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetModelList = `const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash'];`;
const replacementModelList = `const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];`;

if (code.includes(targetModelList)) {
    code = code.replace(targetModelList, replacementModelList);
    fs.writeFileSync('server.ts', code);
    console.log('Patched /ии models successfully');
} else {
    console.log('Could not find candidateModels for /ии');
}
