import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// I will insert answerVkEvent for mod_unban_chat
code = code.replace(
    /if \(cmd === "mod_unban_chat"\) \{([\s\S]+?delete chatBans\[String\(peerId\)\];)/,
    'if (cmd === "mod_unban_chat") {$1\n             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Блокировка снята." });'
);

fs.writeFileSync('server.ts', code);
