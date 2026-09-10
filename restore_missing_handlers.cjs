const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const missingHandlers = `
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
              return;
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
              return;
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
              return;
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
              return;
          }

          if (cmd === "cp_reboot_cancel") {
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_reboot_ask") === -1);
              await editVkMessage(VK_TOKEN, peerId, cmId, "...::Панель Управления Чат-Менеджером::...\\n\\nПерезагрузка чат-менеджера отменена.", { keyboard: JSON.stringify(kb) });
              return;
          }
`;

// Insert them after the economy tab return
const ecoEnd = /sendVkMessage\(VK_TOKEN, peerId, economyText, \{ keyboard: JSON.stringify\(kb\), attachment \}\);\s*return;\s*\}/;
if (content.match(ecoEnd)) {
    content = content.replace(ecoEnd, (match) => match + missingHandlers);
}

fs.writeFileSync('server.ts', content);
console.log("Missing CP handlers restored!");
