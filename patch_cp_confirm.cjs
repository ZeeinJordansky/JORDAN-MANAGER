const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /       if \(cmd === "cp_enter_confirm"\) \{[\s\S]*?          const askRes = await sendVkMessageLocal\(VK_TOKEN, peerId, \`\.\.\.::Панель Управления Чат-Менеджером::\.\.\.\\n\\nВведите код для входа в панель управления\`\);/;

const replace = `       if (cmd === "cp_enter_confirm") {
          if (payloadObj.authorId && userId !== payloadObj.authorId) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          try { if (cmId) await deleteVkMessage(VK_TOKEN, peerId, cmId); } catch(e) {}
          const genCode = Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
          
          const cu = await getOrCreateUser(userId);
          const cuName = cu.fullName || cu.nick || \`User\${userId}\`;
          await sendVkMessageLocal(VK_TOKEN, 2000000011, \`...::Панель Управления Чат-Менеджером::...\\n\\nПользователь [id\${userId}|\${cuName}] запросил вход в панель управления.\\n\\nКод для входа: \${genCode}\`);

          const askRes = await sendVkMessageLocal(VK_TOKEN, peerId, \`...::Панель Управления Чат-Менеджером::...\\n\\nВведите код для входа в панель управления\`);`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched cp_enter_confirm successfully!");
} else {
  console.log("Could not find cp_enter_confirm logic!");
}

