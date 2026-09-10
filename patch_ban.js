import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// For /gban
code = code.replace(
    /\[id\$\{parsed\.targetId\}\|Имя Фамилия\] был исключён\(-а\) так как он\(-а\) занесён в глобальную блокировку во всех беседах\.\\n\\n\| Дата блокировки: \$\{formatAmPmDate\(Date\.now\(\)\)\}\\n\| Дата разблокировки: \$\{formatAmPmDate\(expiresAt\)\}/,
    `\${formatUserMention(parsed.targetId, String(parsed.targetName), "nom")} был исключён(-а) так как он(-а) занесён в глобальную блокировку во всех беседах.\\n\\n| Дата блокировки: \${formatAmPmDate(Date.now())}\\n| Дата разблокировки: \${formatAmPmDate(expiresAt)}\\n| Модератор - \${formatUserMention(userId, String(fullName), "nom")}`
);

// For /ban
code = code.replace(
    /\[id\$\{parsed\.targetId\}\|Имя Фамилия\] был исключён\(-а\) так как он\(-а\) занесён в блокировку в этой беседе\.\\n\\n\| Дата блокировки: \$\{formatAmPmDate\(Date\.now\(\)\)\}\\n\| Дата разблокировки: \$\{formatAmPmDate\(expiresAt\)\}/,
    `\${formatUserMention(parsed.targetId, String(parsed.targetName), "nom")} был исключён(-а) так как он(-а) занесён в блокировку в этой беседе.\\n\\n| Дата блокировки: \${formatAmPmDate(Date.now())}\\n| Дата разблокировки: \${formatAmPmDate(expiresAt)}\\n| Модератор - \${formatUserMention(userId, String(fullName), "nom")}`
);

// Wait, the "Все блокировки" button doesn't remove all buttons. Wait, the user said: "При нажатии, убирает клавиатуру из сообщения, и присылает новое ответом на то ну в общем если кнопка: Все блокировки то там ток эта убирается, если "Снять блокировку" нажата то убирает все кнопки"
// Let's implement that in mod_all_bans and mod_unban_chat/mod_ungban logic.

fs.writeFileSync('server.ts', code);
