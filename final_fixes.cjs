const fs = require('fs');
const os = require('os');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Update allowedInDm to include EVERYTHING common
const moreAllowed = [
    "/stats", "/стата", "/статистика", "/профиль", "/проф", "/profile", "/я",
    "/баланс", "/balance", "/бал", "/баланс", "/банк", "/бал", "/б",
    "/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands",
    "/gamehelp", "/ghelp", "/игровые", "/игры", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот",
    "/пучм", "/пу", "/cp", "/id", "/ид", "/айди", "/я", "/правила", "/rules",
    "/бизнес", "/бизнесы", "/биз", "/бизнесс", "/машины", "/машина", "/дом", "/дома",
    "/брак", "/браки", "/свадьба", "/развод", "/топ", "/top", "/реп", "/репутация",
    "/магазин", "/шоп", "/shop", "/донат", "/donate"
];

// Find the allowedInDm definition and replace the set content
const allowedInDmRegex = /const allowedInDm = new Set\(\[([\s\S]*?)\]\);/;
const match = content.match(allowedInDmRegex);
if (match) {
    const existing = match[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(s => s);
    const combined = Array.from(new Set([...existing, ...moreAllowed]));
    const newSetContent = combined.map(s => `"${s}"`).join(', ');
    content = content.replace(allowedInDmRegex, `const allowedInDm = new Set([${newSetContent}]);`);
}

// 2. Fix CP Economy Chart
const economyTabHandler = `
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
              const chartUrl = \`https://quickchart.io/chart?c={type:'pie',data:{labels:['На руках','В банке','Бизнесы'],datasets:[{data:[\${totalBal},\${totalBank},\${bizIncome * 10}]}]}}\`;
              
              let attachment = "";
              try {
                  const uploadRes = await uploadPhoto(peerId, chartUrl);
                  if (uploadRes.attachment) attachment = uploadRes.attachment;
              } catch (e) {}

              const economyText = \`...::Панель Управления Чат-Менеджером::...\\n\\n| Информация о экономике:\\n\\nОбщая Экономика: \${totalEco.toLocaleString()}$\\n\\nОбщий баланс: \${totalBal.toLocaleString()}$\\nОбщий банк: \${totalBank.toLocaleString()}$\\n\\nКол-во купленных бизнесов: \${bizCount}\\nОбщий доход с бизнесов: \${bizIncome.toLocaleString()}$\`;
              
              const kb = { ...mainKb };
              kb.buttons = kb.buttons.filter(row => row[0].action.payload.indexOf("cp_tab_economy") === -1);
              
              await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(() => {});
              await sendVkMessage(VK_TOKEN, peerId, economyText, { keyboard: JSON.stringify(kb), attachment });
              return;
          }
`;

// Replace the old economy tab handler
const oldEcoHandler = /if \(cmd === "cp_tab_economy"\) \{[\s\S]*?await sendVkMessage\(VK_TOKEN, peerId, economyText, \{ keyboard: JSON.stringify\(kb\) \}\);\s*\}/;
if (content.match(oldEcoHandler)) {
    content = content.replace(oldEcoHandler, economyTabHandler);
}

// 3. Ensure CP buttons have authorId check to avoid others clicking (though it's DM)
// But the session check already does this.

fs.writeFileSync('server.ts', content);
console.log("Final fixes and Economy Chart applied!");
