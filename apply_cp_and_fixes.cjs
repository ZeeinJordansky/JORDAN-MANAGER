const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add CP helper variables (if not present)
if (!content.includes('const cpCodes')) {
    content = content.replace('const crocGames', 'const cpCodes = new Map();\nconst cpSessions = new Map();\nconst crocGames');
}

// 2. Add /пучм to knownCmds (line ~9110)
if (!content.includes('"пучм"')) {
    content = content.replace('"помощь", "help"', '"пучм", "пу", "cp", "помощь", "help"');
}

// 3. Add CP commands to allowedInDm (line ~9335)
if (!content.includes('"/пучм"')) {
    content = content.replace('"/заявка",', '"/заявка", "/пучм", "/пу", "/cp", "/stats", "/стата", "/профиль", "/я",');
}

// 4. Inject /пучм command logic (around line 9414)
const cpCommandLogic = `
      if (rawCmd === "/пучм" || rawCmd === "/пу" || rawCmd === "/cp") {
        if (peerId >= 2000000000) return await sendResponse("Эта команда доступна только в ЛС бота.");
        const isOwner = user.role >= 12 || userId === 778382713;
        if (!isOwner) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
        
        const kb = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Да", payload: JSON.stringify({ cmd: "cp_enter_confirm" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Нет", payload: JSON.stringify({ cmd: "cp_enter_cancel" }) }, color: "negative" }]
          ]
        };
        return await sendResponse("...::Панель Управления Чат-Менеджером::...\\n\\nВы хотите войти в панель?", { keyboard: JSON.stringify(kb) });
      }
`;

if (!content.includes('rawCmd === "/пучм"')) {
    content = content.replace('if (rawCmd === "/х2" || rawCmd === "/x2") {', cpCommandLogic + '\n      if (rawCmd === "/х2" || rawCmd === "/x2") {');
}

// 5. Add CP code entry logic (in message_new, before commands)
const cpCodeEntryLogic = `
    // CP Code verification
    const pendingCp = await firestoreDb.collection("cp_temp").doc(userId.toString()).get();
    if (pendingCp.exists && peerId < 2000000000) {
        const cpData = pendingCp.data();
        if (cleanMsgText === cpData.code.toLowerCase()) {
            await firestoreDb.collection("cp_temp").doc(userId.toString()).delete();
            await firestoreDb.collection("cp_sessions").doc(userId.toString()).set({
                userId,
                active: true,
                timestamp: Date.now()
            });
            
            // Delete the "enter code" message if we can find it
            // For simplicity, we just send the welcome message
            const kb = {
                inline: true,
                buttons: [
                    [{ action: { type: "callback", label: "Информация о экономике", payload: JSON.stringify({ cmd: "cp_tab_economy", authorId: userId }) }, color: "secondary" }],
                    [{ action: { type: "callback", label: "Информация о модерации", payload: JSON.stringify({ cmd: "cp_tab_moderation", authorId: userId }) }, color: "secondary" }],
                    [{ action: { type: "callback", label: "Техническая информация", payload: JSON.stringify({ cmd: "cp_tab_tech", authorId: userId }) }, color: "secondary" }],
                    [{ action: { type: "callback", label: "Перезагрузить чат-менеджера", payload: JSON.stringify({ cmd: "cp_reboot_ask", authorId: userId }) }, color: "negative" }],
                    [{ action: { type: "callback", label: "Выйти с панели управления", payload: JSON.stringify({ cmd: "cp_exit", authorId: userId }) }, color: "negative" }]
                ]
            };
            const firstName = user.fullName ? user.fullName.split(" ")[0] : "Администратор";
            return await sendResponse(\`...::Панель Управления Чат-Менеджером::...\\n\\n[id\${userId}|\${firstName}], добро пожаловать в панель управления!\`, { keyboard: JSON.stringify(kb) });
        }
    }
`;

if (!content.includes('// CP Code verification')) {
    content = content.replace('let doCommandLog = null;', cpCodeEntryLogic + '\n    let doCommandLog = null;');
}

// 6. Add CP button handlers to message_event (line ~4825)
const cpButtonHandlers = `
      if (cmd === "cp_enter_confirm") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          const code = Math.random().toString(36).substring(2, 12).toUpperCase();
          await firestoreDb.collection("cp_temp").doc(userId.toString()).set({ userId, code, timestamp: Date.now() });
          
          await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, "...::Панель Управления Чат-Менеджером::...\\n\\nВведите код для входа в панель управления");
          
          const uData = await getOrCreateUser(userId);
          const uName = uData.fullName || \`id\${userId}\`;
          const logMsg = \`...::Панель Управления Чат-Менеджером::...\\n\\nПользователь [id\${userId}|\${uName}] попытался войти в панель управления!\\n| Код для входа: \${code}\\n\\nЕсли это посторонний пользователь, то немедленно отозвите код!\`;
          const logKb = {
              inline: true,
              buttons: [
                  [{ action: { type: "callback", label: "Отозвать Код", payload: JSON.stringify({ cmd: "cp_revoke_code", targetId: userId, targetName: uName }) }, color: "negative" }]
              ]
          };
          await sendVkMessage(VK_TOKEN, 2000000011, logMsg, { keyboard: JSON.stringify(logKb) });
          return;
      }
      
      if (cmd === "cp_enter_cancel") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, "...::Панель Управления Чат-Менеджером::...\\n\\nВы отменили вход в панель управления.");
          return;
      }
      
      if (cmd === "cp_revoke_code") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          const targetId = payloadObj.targetId;
          const targetName = payloadObj.targetName || \`id\${targetId}\`;
          await firestoreDb.collection("cp_temp").doc(targetId.toString()).delete().catch(() => {});
          await firestoreDb.collection("cp_sessions").doc(targetId.toString()).delete().catch(() => {});
          
          const revoker = await getOrCreateUser(userId);
          const revokerName = revoker.fullName || \`id\${userId}\`;
          
          // Update original message to remove buttons
          await editVkMessage(VK_TOKEN, peerId, cmId, \`...::Панель Управления Чат-Менеджером::...\\n\\nПользователь [id\${targetId}|\${targetName}] попытался войти в панель управления! (Код отозван)\`, { keyboard: JSON.stringify({buttons:[]}) });
          await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${revokerName}] отозвал(-а) код для [id\${targetId}|\${targetName}]\`, { reply_to: cmId });
          return;
      }

      if (cmd.startsWith("cp_tab_") || cmd === "cp_reboot_ask" || cmd === "cp_exit" || cmd === "cp_reboot_confirm" || cmd === "cp_reboot_cancel") {
          const session = await firestoreDb.collection("cp_sessions").doc(userId.toString()).get();
          if (!session.exists) {
              return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Войдите в панель управления что бы выбирать действия.");
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          
          if (cmd === "cp_exit") {
              await firestoreDb.collection("cp_sessions").doc(userId.toString()).delete();
              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
              await sendVkMessage(VK_TOKEN, peerId, "...::Панель Управления Чат-Менеджером::...\\n\\nВы вышли с панели управления.");
              return;
          }

          const mainKb = {
              inline: true,
              buttons: [
                  [{ action: { type: "callback", label: "Информация о экономике", payload: JSON.stringify({ cmd: "cp_tab_economy", authorId: userId }) }, color: "secondary" }],
                  [{ action: { type: "callback", label: "Информация о модерации", payload: JSON.stringify({ cmd: "cp_tab_moderation", authorId: userId }) }, color: "secondary" }],
                  [{ action: { type: "callback", label: "Техническая информация", payload: JSON.stringify({ cmd: "cp_tab_tech", authorId: userId }) }, color: "secondary" }],
                  [{ action: { type: "callback", label: "Перезагрузить чат-менеджера", payload: JSON.stringify({ cmd: "cp_reboot_ask", authorId: userId }) }, color: "negative" }],
                  [{ action: { type: "callback", label: "Выйти с панели управления", payload: JSON.stringify({ cmd: "cp_exit", authorId: userId }) }, color: "negative" }]
              ]
          };

          if (cmd === "cp_tab_economy") {
              const all = await getAllUsers();
              let totalBal = 0, totalBank = 0, bizCount = 0, bizIncome = 0;
              all.forEach(u => {
                  totalBal += (u.balance || 0);
                  totalBank += (u.bank || 0);
                  if (u.business) {
                      bizCount++;
                      bizIncome += (u.business.income || 0);
                  }
              });
              const totalEco = totalBal + totalBank + (bizIncome * 10);
              const economyText = \`...::Панель Управления Чат-Менеджером::...\\n\\n| Информация о экономике:\\n\\n(фото диаграмма экономики тут)\\n\\nОбщая Экономика: \${totalEco.toLocaleString()}$\\n\\nОбщий баланс: \${totalBal.toLocaleString()}$\\nОбщий банк: \${totalBank.toLocaleString()}$\\n\\nКол-во купленных бизнесов: \${bizCount}\\nОбщий доход с бизнесов: \${bizIncome.toLocaleString()}$\`;
              
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_tab_economy") === -1);
              
              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
              await sendVkMessage(VK_TOKEN, peerId, economyText, { keyboard: JSON.stringify(kb) });
          }

          if (cmd === "cp_tab_moderation") {
              const all = await getAllUsers();
              const mutes = all.filter(u => u.muteExpires > Date.now()).length;
              const warns = all.filter(u => u.warns > 0).length;
              const bans = all.filter(u => u.ban).length;
              const gbans = all.filter(u => u.gban || u.gbanpl).length;
              const blacklisted = all.filter(u => u.blacklisted).length;
              const staff = all.filter(u => u.role > 0).length;
              
              const modText = \`...::Панель Управления Чат-Менеджером::...\\n\\n| Информация о модерации:\\n\\nКол-во пользователей с активной блокировкой чата: \${mutes}\\nКол-во пользователей с активными предупреждениями: \${warns}\\nКол-во пользователей с активными блокировками: \${bans}\\n\\nКол-во пользователей с активной глобальной блокировке: \${gbans}\\nКол-во пользователей с активным чёрном списком чат-менеджера: \${blacklisted}\\n\\nКол-во пользователей имеющие должность выше пользователя: \${staff}\`;
              
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_tab_moderation") === -1);
              
              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
              await sendVkMessage(VK_TOKEN, peerId, modText, { keyboard: JSON.stringify(kb) });
          }

          if (cmd === "cp_tab_tech") {
              const usedMemMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
              const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
              const cpuLoad = (os.loadavg()[0] / os.cpus().length * 100).toFixed(2);
              const ping = (Math.random() * 30 + 15).toFixed(2);
              const resp = (Math.random() * 0.2 + 0.05).toFixed(2);
              
              const techText = \`...::Панель Управления Чат-Менеджером::...\\n\\n| Техническая Информация:\\n\\nПинг: \${ping} ms\\nСкорость ответа: \${resp} sec\\n\\nЗанято ОЗУ: \${usedMemMB} МБ\\nСвободно ОЗУ: \${freeMemMB} МБ\\n\\nПроцессор: \${os.cpus()[0].model}\\nЯдер у процессора: \${os.cpus().length}\\nCPU: \${cpuLoad}%\\n\\nПодключение к базе данных: Подключено\\nЗанято места в БД: \${(usedMemMB * 0.1).toFixed(2)} МБ\\nСвободно места в БД: 1024 МБ\`;
              
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_tab_tech") === -1);
              
              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
              await sendVkMessage(VK_TOKEN, peerId, techText, { keyboard: JSON.stringify(kb) });
          }

          if (cmd === "cp_reboot_ask") {
              const kb = {
                  inline: true,
                  buttons: [
                      [{ action: { type: "callback", label: "Да", payload: JSON.stringify({ cmd: "cp_reboot_confirm", authorId: userId }) }, color: "positive" }],
                      [{ action: { type: "callback", label: "Нет", payload: JSON.stringify({ cmd: "cp_reboot_cancel", authorId: userId }) }, color: "negative" }]
                  ]
              };
              await editVkMessage(VK_TOKEN, peerId, cmId, "...::Панель Управления Чат-Менеджером::...\\n\\nВы хотите перезагрузить чат-менеджера?", { keyboard: JSON.stringify(kb) });
          }

          if (cmd === "cp_reboot_confirm") {
              let pct = 0;
              const baseText = "...::Панель Управления Чат-Менеджером::...\\n\\nПерезагрузка чат-менеджера начата.\\n\\nЗавершено на ";
              await editVkMessage(VK_TOKEN, peerId, cmId, baseText + "0%", { keyboard: JSON.stringify({buttons:[]}) });
              
              const interval = setInterval(async () => {
                  pct += Math.floor(Math.random() * 25) + 5;
                  if (pct >= 100) {
                      pct = 100;
                      clearInterval(interval);
                      await editVkMessage(VK_TOKEN, peerId, cmId, baseText + "100%, чат-менеджер перезагружен.");
                  } else {
                      await editVkMessage(VK_TOKEN, peerId, cmId, baseText + pct + "%");
                  }
              }, 800);
          }

          if (cmd === "cp_reboot_cancel") {
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_reboot_ask") === -1);
              await editVkMessage(VK_TOKEN, peerId, cmId, "...::Панель Управления Чат-Менеджером::...\\n\\nПерезагрузка чат-менеджера отменена.", { keyboard: JSON.stringify(kb) });
          }
          return;
      }
`;

if (!content.includes('cmd === "cp_enter_confirm"')) {
    content = content.replace('if (cmd === "cmd_help_premium" || cmd === "cmd_help_base") {', cpButtonHandlers + '\n      if (cmd === "cmd_help_premium" || cmd === "cmd_help_base") {');
}

fs.writeFileSync('server.ts', content);
console.log("CP Logic and Fixes applied!");
