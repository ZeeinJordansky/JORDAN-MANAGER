const fs = require("fs");

let code = fs.readFileSync("server.ts", "utf8");

console.log("Applying patch_commands_and_buttons.cjs...");

// 1. Add /renameroles, /frozenlist, /kickfrozen handlers
const newCmds = `
      // /renameroles
      if (rawCmd === "/renameroles" || rawCmd === "/изменитьроли") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && !isAdmin) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
        }
        const chatData = await getOrCreateChat(peerId);
        const textArgs = getRawArgText(cmdText);

        if (!textArgs) {
          if (chatData.customRoles) {
            const keyboard = JSON.stringify({
              inline: true,
              buttons: [
                [
                  { action: { type: "callback", label: "Установить новое название", payload: JSON.stringify({ cmd: "renameroles_prompt" }) }, color: "positive" },
                  { action: { type: "callback", label: "Удалить название ролей", payload: JSON.stringify({ cmd: "renameroles_delete_confirm" }) }, color: "negative" }
                ]
              ]
            });
            return await sendResponse(\`...::Изменение названия ролей::...\\n\\n| Установленное название ролей: Да\`, { keyboard });
          } else {
            return await sendResponse(
              \`Укажите аргументы команды!\\n\\n\` +
              \`| Пример:\\n\\n\` +
              \`| Владелец беседы:\\n- {owner}\\n\\n\` +
              \`| Главный Администратор:\\n- {ga}\\n\\n\` +
              \`| Зам. Глав. Администратора:\\n- {zga}\\n\\n\` +
              \`| Старший Администратор:\\n- {sadmin}\\n\\n\` +
              \`| Администратор:\\n- {admin}\\n\\n\` +
              \`| Старший Модератор:\\n- {smoder}\\n\\n\` +
              \`| Модератор:\\n- {moder}\`
            );
          }
        }

        const customRoles = {};
        const lines = textArgs.split("\\n");
        lines.forEach(line => {
          if (line.includes("{owner}")) customRoles.owner = line.replace(/\\{owner\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{ga}")) customRoles.ga = line.replace(/\\{ga\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{zga}")) customRoles.zga = line.replace(/\\{zga\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{sadmin}")) customRoles.sadmin = line.replace(/\\{sadmin\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{admin}")) customRoles.admin = line.replace(/\\{admin\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{smoder}")) customRoles.smoder = line.replace(/\\{smoder\\}/gi, "").replace(/^-\\s*/, "").trim();
          if (line.includes("{moder}")) customRoles.moder = line.replace(/\\{moder\\}/gi, "").replace(/^-\\s*/, "").trim();
        });

        await updateChat(peerId, { customRoles });
        return await sendResponse(\`...::Изменение названия ролей::...\\n\\n| Установленное название ролей: Да\`);
      }

      // /frozenlist
      if (rawCmd === "/frozenlist" || rawCmd === "/замороженные") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточно прав! Команда доступна только Владельцу беседы.");
        
        const { profiles } = await getChatMembers(peerId);
        const frozen = profiles.filter((p) => p.deactivated);
        
        if (frozen.length === 0) return await sendResponse("Замороженные или удалённые пользователи в беседе отсутствуют.");
        
        let out = \`Список удалённых/замороженных пользователей (\${frozen.length}):\\n\\n\`;
        frozen.slice(0, 15).forEach((p, idx) => {
          out += \`\${idx + 1}) [id\${p.id}|\${p.first_name} \${p.last_name}] - \${p.deactivated === "banned" ? "Заблокирован" : "Удалён"}\\n\`;
        });
        return await sendResponse(out);
      }

      // /kickfrozen
      if (rawCmd === "/kickfrozen" || rawCmd === "/кикзамороженных") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточно прав! Команда доступна только Владельцу беседы.");

        const keyboard = JSON.stringify({
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Да, исключить", payload: JSON.stringify({ cmd: "kickfrozen_confirm", authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Нет, не исключать", payload: JSON.stringify({ cmd: "kickfrozen_cancel", authorId: userId }) }, color: "negative" }
            ]
          ]
        });

        return await sendResponse("Вы действительно хотите исключить всех удалённых/замороженных пользователей из беседы?", { keyboard, isReply: true });
      }

      // /addaccesslevel (/роль, /addlevel, /setlevel, /setaccesslevel, /addaccess, /выдатьроль)
      if (["/addaccesslevel", "/роль", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/выдатьроль"].includes(rawCmd)) {
        const cRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
        const authorEffRole = Math.max(user.role || 0, cRole);
        if (authorEffRole < 2 && !isAdmin && !isVkAdmin && !isOwner) return await sendResponse("У вас недостаточно прав!");

        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

        const levelArg = parseInt(args.slice(2)[0] || args.slice(1)[1] || "1");
        const levelNames = {
          1: "Модератор",
          2: "Старший Модератор",
          3: "Администратор",
          4: "Старший Администратор",
          5: "Зам. Глав. Администратора",
          6: "Главный Администратор"
        };

        let targetLevel = levelArg;
        if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > 6) {
          const rawLevelStr = args.slice(2).join(" ").toLowerCase();
          if (rawLevelStr.includes("главный админ") || rawLevelStr.includes("га")) targetLevel = 6;
          else if (rawLevelStr.includes("зам") || rawLevelStr.includes("зга")) targetLevel = 5;
          else if (rawLevelStr.includes("старший админ") || rawLevelStr.includes("садмин")) targetLevel = 4;
          else if (rawLevelStr.includes("админ")) targetLevel = 3;
          else if (rawLevelStr.includes("старший модер") || rawLevelStr.includes("смодер")) targetLevel = 2;
          else targetLevel = 1;
        }

        let maxIssueLevel = 0;
        if (authorEffRole === 2) maxIssueLevel = 1;
        else if (authorEffRole === 3) maxIssueLevel = 2;
        else if (authorEffRole === 4) maxIssueLevel = 3;
        else if (authorEffRole === 5) maxIssueLevel = 4;
        else if (authorEffRole >= 6 || isAdmin || isOwner) maxIssueLevel = 6;

        if (targetLevel > maxIssueLevel) {
           return await sendResponse(\`Вы не можете выдать уровень прав выше \${maxIssueLevel}!\`);
        }

        const targetU = await getOrCreateUser(parsed.targetId);
        const chatRoles = { ...(targetU.chatRoles || {}) };
        chatRoles[peerId] = targetLevel;
        await updateUser(parsed.targetId, { chatRoles });

        const roleName = levelNames[targetLevel] || "Модератор";
        return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] выдан уровень прав «\${roleName}»\\n\\n| Модератор, который выдал уровень прав - [id\${userId}|\${fullName}]\`, { noReply: true });
      }
`;

if (!code.includes("rawCmd === \"/renameroles\"")) {
  code = code.replace(`if (rawCmd === "/alt" || rawCmd === "/альт"`, newCmds + `\n      if (rawCmd === "/alt" || rawCmd === "/альт"`);
}

fs.writeFileSync("server.ts", code);
console.log("patch_commands_and_buttons.cjs applied successfully.");
