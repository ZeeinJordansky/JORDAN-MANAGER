const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The main issue is that we replaced literal backslash-n with actual newlines
// across the whole file. We need to find patterns that look like they were
// part of a string but now have a newline.

// Specifically, look for the handlers we added
content = content.replace(/catch\(\(\) => \{\}\);\nif \(cmd === "activate_chat"\)/, 'catch(() => {});\nif (cmd === "activate_chat")');

// Try to restore strings that should have had \\n
// This is hard globally, but we can target the ones we likely broke
content = content.replace(/Беседа была успешно активирована\.\n\nТеперь вы можете/g, 'Беседа была успешно активирована.\\n\\nТеперь вы можете');
content = content.replace(/was added to chat\.\n\nTo start work/g, 'was added to chat.\\n\\nTo start work');
content = content.replace(/был добавлен в беседу\.\n\nДля начала/g, 'был добавлен в беседу.\\n\\nДля начала');
content = content.replace(/выдайте ему права администратора\.\n\nДалее/g, 'выдайте ему права администратора.\\n\\nДалее');
content = content.replace(/по причине: " \+ reason \+ "\n\n\| Модератор/g, 'по причине: " + reason + "\\n\\n| Модератор');
content = content.replace(/беседе №" \+ peerId \+ "\n\nТеперь вы являетесь/g, 'беседе №" + peerId + "\\n\\nТеперь вы являетесь');

// The linter said "Unterminated template literal" at the end.
// This probably happened because of a replacement that broke a string.

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Emergency fix applied');
