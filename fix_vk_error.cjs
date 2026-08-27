const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `(vkErrMsg ? "\\n| Предупреждение VK API: " + vkErrMsg : "")`;
const replacement1 = `(vkErrMsg ? "\\n\\n⚠️ Произошла ошибка\\n\\nVK говорит: " + vkErrMsg : "")`;

const target2 = `"\\n| Предупреждение VK API: " + vkErrMsg`;
const replacement2 = `"\\n\\n⚠️ Произошла ошибка\\n\\nVK говорит: " + vkErrMsg`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('server.ts', code);
console.log("Updated VK error warnings.");
