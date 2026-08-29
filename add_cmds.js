import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const insertionPoint = 'if (["/start", "/старт", "/активировать", "/активация", "/включитьбота", "/activate", "/начать"].includes(rawCmd)) {';
const index = code.indexOf(insertionPoint);

if (index !== -1) {
    const newCmds = `
      if (rawCmd === "/addowner" || rawCmd === "/аддвладелец") {
         if (user.role < 13 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 12 });
         return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] назначен на пост Второстепенного владельца!\`);
      }

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
    code = code.slice(0, index) + newCmds + code.slice(index);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Added commands /addowner and /заявка');
