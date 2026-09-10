import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Remove the handlers I just added (they contain "Все ники пользователей в этой беседе были успешно удалены.")
// And the second one that contains "Удаление уровней прав отменено."
code = code.replace(/       if \(cmd === "confirm_deletenicks"\) \{[\s\S]+?       if \(cmd === "cancel_deleteroles"\) \{[\s\S]+?return;\n       \}\n/g, "");

// Update the commands to use the correct existing payloads
code = code.replace(/\{ cmd: "confirm_deletenicks", authorId: userId \}/g, '{ cmd: "confirm_delnicks", authorId: userId }');
code = code.replace(/\{ cmd: "cancel_deletenicks", authorId: userId \}/g, '{ cmd: "cancel_delnicks", authorId: userId }');
code = code.replace(/\{ cmd: "confirm_deleteroles", authorId: userId \}/g, '{ cmd: "confirm_delaccesslevel", authorId: userId }');
code = code.replace(/\{ cmd: "cancel_deleteroles", authorId: userId \}/g, '{ cmd: "cancel_delaccesslevel", authorId: userId }');

fs.writeFileSync('server.ts', code);
