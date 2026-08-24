const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldText = `    text += \`| Дата регистрации: Недоступно\\n\`; // API doesnt support`;
const newText = `    const regDate = await getVkRegDate(targetId);
    text += \`| Дата регистрации: \${regDate || "Скрыто"}\\n\`;`;

code = code.replace(oldText, newText);
fs.writeFileSync('server.ts', code);
