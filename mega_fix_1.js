import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add globals
if (!code.includes('const applyStates =')) {
    code = code.replace('const botStartTime = Date.now();', 'const botStartTime = Date.now();\nconst applyStates = new Map<number, { step: number; answers: string[]; lastCmId?: number }>();');
}

// 2. Add /addowner command logic
const addOwnerCmd = `
      if (rawCmd === "/addowner" || rawCmd === "/аддвладелец") {
         if (user.role < 13 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 12 });
         return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] назначен на пост Второстепенного владельца!\`);
      }
`;

// Insert it before /staff
const staffIndex = code.indexOf('if (["/staff", "/состав", "/стафф"');
if (staffIndex !== -1) {
    code = code.slice(0, staffIndex) + addOwnerCmd + "\n      " + code.slice(staffIndex);
}

// 3. Update /staff logic to include owners
const oldStaffLoop = `         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.gban || u.gbanpl || u.blacklisted || (u.chatBans && u.chatBans[peerId])) continue;
             const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0; 
             const gRole = (u.role && u.role <= 7) ? u.role : 0; 
             const effRole = Math.max(gRole, cRole); 
             const r = (effRole >= 1 && effRole <= 7) ? Math.floor(effRole) : 0;
             if (r >= 1 && r <= 7) {
               const name = p.first_name && p.last_name ? \`\${p.first_name} \${p.last_name}\` : (u.fullName || u.nick || \`User\${p.id}\`);
               byRole[r].push(\`- [id\${p.id}|\${name}]\`);
             }
           }
         }`;

const newStaffLoop = `         const byRole: Record<number, string[]> = {
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
         }`;

// Replace the staff loop and the output formatting
// (This is a bit tricky, I'll use a more targeted replacement)

// 4. Implement /заявка
const applyCmd = `
      if (["/заявка", "/податьзаявку", "/заявки", "/apply", "/заявканапост", "/анкета"].includes(rawCmd)) {
         if (peerId > 2000000000) return await sendResponse("Данная команда доступна только в ЛС бота!");
         
         const keyboard = {
           inline: true,
           buttons: [
             [
               { action: { type: "callback", label: "Да, хочу", payload: JSON.stringify({ cmd: "apply_start", authorId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Нет, не хочу", payload: JSON.stringify({ cmd: "apply_cancel", authorId: userId }) }, color: "negative" }
             ]
           ]
         };

         return await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName.split(' ')[0]}], приветствуем!\\n\\nВы хотите подать заявку на пост заместителя руководителя?\`, {
           keyboard: JSON.stringify(keyboard)
         });
      }
`;

// Insert applyCmd at the end of command list or somewhere appropriate
const helpIndex = code.indexOf('if (["/help", "/помощь"');
if (helpIndex !== -1) {
    code = code.slice(0, helpIndex) + applyCmd + "\n      " + code.slice(helpIndex);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Applied Mega Fix Part 1');
