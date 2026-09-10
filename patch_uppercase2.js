import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Also for cases where it was [Ссылка|Пользователю] directly without formatUserMention if I have them:
// But wait, I used formatUserMention everywhere.
code = code.replace(/Блокировка чата у \$\{formatUserMention\([^,]+, "пользователя"/g, (match) => match.replace('"пользователя"', '"Пользователя"'));
code = code.replace(/выдана блокировка скором/g, "выдана блокировка сроком");

fs.writeFileSync('server.ts', code);
