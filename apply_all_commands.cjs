const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. ADD /alt COMMAND
const altCommandCode = `
      if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы" || rawCmd === "/aliases") {
        const altText = \`...:: Альтернативные команды (Алиасы) ::...

📋 Основные & Инфо:
/help — /помощь, /хелп, /команды, /меню, /cmd, /cmds
/stats — /стата, /статистика
/profile — /профиль, /проф
/rules — /правила, /правилабота
/status — /статус
/sync — /синхронизация, /синк
/type — /тип, /типбеседы
/staff — /стафф, /состав, /админы
/alt — /альт, /алиасы, /aliases

🛡️ Модерация:
/mute — /мут, /m
/unmute — /размут, /анмут, /снятьмут, /разглушить, /unm
/smute — /смут
/warn — /варн, /предупреждение, /пред, /w
/unwarn — /разварн, /анварн, /снятьварн, /снятьпред, /unw
/swarn — /сварн
/ban — /бан, /забанить, /б, /b
/unban — /разбан, /анбан, /снятьбан, /unb
/sban — /сбан
/kick — /кик, /кикнуть, /исключить, /k
/skick — /скик
/clear — /очистить, /cl
/sclear — /сочистить, /склир
/mutelist — /муты, /списокмутов
/warnlist — /варны, /списокварнов
/banlist — /баны, /списокбанов
/frozenlist — /замороженные
/kickfrozen — /кикзамороженных, /киксобак

👑 Уровни прав:
/addaccesslevel — /роль, /addlevel, /setlevel, /setaccesslevel, /addaccess, /выдатьроль
/removerole — /delrole, /снятьроль
/giveowner — /передатьвладельца
/renameroles — /переименоватьроли, /ролиназвания
/заместитель — /замруководителя
/озаместитель — /оснзамруководителя
/addruk — /руководитель

🌐 Глобальные & Беседа руководства:
/gban — /гбан, /глобалбан
/ungban — /юнгбан, /унгбан, /анgban
/addblack — /чс, /чсб, /вчс, /добавитьвчс, /аддблэк
/unblack — /анблэк, /анчс, /изчс, /удалитьизчс, /унчсб
/gbanlist — /гбанлист
/blacklist — /чслист, /списокчс
/getban — /чекбан, /проверитьбан
/addantiteg — /антитег
/unantiteg — /снятьантитег
/addawstats — /австатс
/unawstats — /снятавстатс
/gaddawstats — /гавстатс
/gunawstats — /снятьгавстатс
/аудио — /audio, /музыка, /music, /setaudio, /установитьаудио

📝 Заявки:
/заявка — /zayavka, /податьзаявку (в ЛС бота)\`;
        return await sendResponse(altText);
      }
`;

// 2. ADD /x2 TOGGLE COMMAND FOR BOT OWNER
const x2CommandCode = `
      if (rawCmd === "/х2" || rawCmd === "/x2") {
        const isBotOwner = user.role >= 12 || userId === 778382713 || (appState && appState.botOwnerId === userId);
        if (!isBotOwner) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
        
        globalThis.isX2ManualActive = !globalThis.isX2ManualActive;
        if (appState) appState.isX2Active = globalThis.isX2ManualActive;
        
        if (globalThis.isX2ManualActive) {
          return await sendResponse("Х2 режим был включён до понедельника!");
        } else {
          return await sendResponse("Х2 режим был отключён до пятницы.");
        }
      }
`;

// 3. /renameroles COMMAND
const renameRolesCommandCode = `
      if (rawCmd === "/renameroles" || rawCmd === "/переименоватьроли" || rawCmd === "/ролиназвания") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
        }
        
        const chatData = await getOrCreateChat(peerId);
        const customRoles = chatData.customRoleNames || {};
        const isConfigured = !!(customRoles.owner || customRoles.ga || customRoles.zga || customRoles.sadmin || customRoles.admin || customRoles.smoder || customRoles.moder);
        
        const rawText = getRawArgText(cmdText).trim();
        if (!rawText) {
          if (!isConfigured) {
            const helpText = \`Укажите аргументы команды!\\n\\n| Пример:\\n\\n| Владелец беседы:\\n- {owner}\\n\\n| Главный Администратор:\\n- {ga}\\n\\n| Зам. Глав. Администратора:\\n- {zga}\\n\\n| Старший Администратор:\\n- {sadmin}\\n\\n| Администратор:\\n- {admin}\\n\\n| Старший Модератор:\\n- {smoder}\\n\\n| Модератор:\\n- {moder}\`;
            return await sendResponse(helpText);
          } else {
            const kb = {
              inline: true,
              buttons: [
                [{ action: { type: "callback", label: "Установить новое название", payload: JSON.stringify({ cmd: "renameroles_set" }) }, color: "positive" }],
                [{ action: { type: "callback", label: "Удалить название ролей", payload: JSON.stringify({ cmd: "renameroles_del" }) }, color: "negative" }]
              ]
            };
            const statusText = \`...::Изменение названия ролей::...\\n\\n| Установленное название ролей: \${isConfigured ? "Да" : "Нет"}\`;
            return await sendResponse(statusText, { keyboard: JSON.stringify(kb) });
          }
        }
        
        // Parse custom roles from input
        const newRoles: any = { ...customRoles };
        const lines = rawText.split("\\n");
        let currentKey = "";
        for (const line of lines) {
          const l = line.trim();
          if (l.toLowerCase().includes("владелец") || l.toLowerCase().includes("{owner}")) currentKey = "owner";
          else if (l.toLowerCase().includes("главный админ") || l.toLowerCase().includes("{ga}")) currentKey = "ga";
          else if (l.toLowerCase().includes("зам. глав") || l.toLowerCase().includes("{zga}")) currentKey = "zga";
          else if (l.toLowerCase().includes("старший админ") || l.toLowerCase().includes("{sadmin}")) currentKey = "sadmin";
          else if (l.toLowerCase().includes("администратор") || l.toLowerCase().includes("{admin}")) currentKey = "admin";
          else if (l.toLowerCase().includes("старший модер") || l.toLowerCase().includes("{smoder}")) currentKey = "smoder";
          else if (l.toLowerCase().includes("модератор") || l.toLowerCase().includes("{moder}")) currentKey = "moder";
          else if (l.startsWith("-") && currentKey) {
            newRoles[currentKey] = l.replace(/^[-\s]+/, "").trim();
          }
        }
        
        await updateChat(peerId, { customRoleNames: newRoles });
        return await sendResponse("Названия ролей для беседы успешно обновлены!");
      }
`;

// 4. /frozenlist and /kickfrozen COMMANDS
const frozenCommandsCode = `
      if (rawCmd === "/frozenlist" || rawCmd === "/замороженные" || rawCmd === "/собаки") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
        }
        
        try {
          const memRes = await vkApi.get("messages.getConversationMembers", {
            params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.199" }
          });
          const profiles = memRes.data?.response?.profiles || [];
          const deactivated = profiles.filter((p: any) => p.deactivated);
          
          if (deactivated.length === 0) {
            return await sendResponse("В беседе нет удалённых или замороженных пользователей.");
          }
          
          let out = \`Список удалённых/замороженных пользователей (\${deactivated.length}):\\n\\n\`;
          deactivated.slice(0, 15).forEach((p: any, idx: number) => {
            const statusStr = p.deactivated === "banned" ? "Заблокирован" : "Удалён";
            out += \`\${idx + 1}) [id\${p.id}|\${p.first_name} \${p.last_name}] — \${statusStr}\\n\`;
          });
          
          const kbButtons: any[] = [];
          if (deactivated.length > 15) {
            kbButtons.push([
              { action: { type: "callback", label: "Вперёд ⏩", payload: JSON.stringify({ cmd: "frozen_page", page: 2 }) }, color: "primary" }
            ]);
          }
          
          return await sendResponse(out, kbButtons.length ? { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }) } : {});
        } catch (e) {
          return await sendResponse("Не удалось получить список участников беседы.");
        }
      }

      if (rawCmd === "/kickfrozen" || rawCmd === "/кикзамороженных" || rawCmd === "/киксобак") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
        }
        
        const kb = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Да, исключить", payload: JSON.stringify({ cmd: "kick_frozen_confirm", initiatorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Нет, не исключать", payload: JSON.stringify({ cmd: "kick_frozen_cancel", initiatorId: userId }) }, color: "negative" }
            ]
          ]
        };
        
        return await sendResponse("Вы действительно хотите исключить всех удалённых/замороженных пользователей из беседы?", { keyboard: JSON.stringify(kb) });
      }
`;

// Insert the new commands right before the end of the commands block
code = code.replace(
  '// Check Ban-words in command arguments',
  `${altCommandCode}\n${x2CommandCode}\n${renameRolesCommandCode}\n${frozenCommandsCode}\n      // Check Ban-words in command arguments`
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Successfully inserted /alt, /x2, /renameroles, /frozenlist, /kickfrozen');
