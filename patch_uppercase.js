import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Replace "пользователю" with "Пользователю" in specific patterns:
code = code.replace(/🔰 \$\{formatUserMention\([^,]+, "пользователю"/g, (match) => match.replace('"пользователю"', '"Пользователю"'));
code = code.replace(/✅ \$\{formatUserMention\([^,]+, "пользователю"/g, (match) => match.replace('"пользователю"', '"Пользователю"'));

fs.writeFileSync('server.ts', code);
