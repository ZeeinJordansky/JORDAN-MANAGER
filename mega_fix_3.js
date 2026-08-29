import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldStaffStart = 'if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {';
const startIndex = code.indexOf(oldStaffStart);

if (startIndex !== -1) {
    const endSearch = 'return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });';
    const endOfBlock = code.indexOf(endSearch, startIndex) + endSearch.length + 8; // account for closing braces
    
    const newStaffBlock = `if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const byRole: Record<number, string[]> = {
           13: [], 12: [], 11: [], 10: [], 9: [], 8: [], 7: [], 6: [], 5: [], 4: [], 3: [], 2: [], 1: []
         };
         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.gban || u.gbanpl || u.blacklisted || (u.chatBans && u.chatBans[peerId])) continue;
             const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0; 
             const gRole = u.role || 0; 
             const effRole = Math.max(gRole, cRole); 
             const r = Math.floor(effRole);
             if (r >= 1 && r <= 13) {
               const name = p.first_name && p.last_name ? \`\${p.first_name} \${p.last_name}\` : (u.fullName || u.nick || \`User\${p.id}\`);
               if (!byRole[r]) byRole[r] = [];
               byRole[r].push(\`- [id\${p.id}|\${name}]\`);
             }
           }
         }
         const fmtList = (arr: string[]) => arr.length > 0 ? arr.join("\\n") : " - Отсутствует";
         const text = \`Список руководства беседы\\n\\n\` +
           \`| Создатель чат-менеджера:\\n\${fmtList(byRole[13])}\\n\` +
           \`| Второстепенный владелец:\\n\${fmtList(byRole[12])}\\n\` +
           \`| Основной Зам. Руководителя:\\n\${fmtList(byRole[11] || byRole[9])}\\n\` +
           \`| Зам. Руководителя:\\n\${fmtList(byRole[10] || byRole[8])}\\n\` +
           \`| Гл. Модератор:\\n\${fmtList(byRole[7])}\\n\` +
           \`| Пом. Гл. Модератора:\\n\${fmtList(byRole[6])}\\n\` +
           \`| Старший Администратор:\\n\${fmtList(byRole[5] || byRole[4])}\\n\` +
           \`| Администратор:\\n\${fmtList(byRole[3])}\\n\` +
           \`| Старший Модератор:\\n\${fmtList(byRole[2])}\\n\` +
           \`| Модератор:\\n\${fmtList(byRole[1])}\`;
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Ники", payload: JSON.stringify({ cmd: "staff_nicks" }) }, color: "primary" }]
           ]
         };
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }`;
    
    code = code.slice(0, startIndex) + newStaffBlock + code.slice(endOfBlock);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Applied Mega Fix Part 3 Correctly');
