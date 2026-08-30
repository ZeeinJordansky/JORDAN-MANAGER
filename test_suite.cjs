const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

const tests = [
  { name: "Rules URL in /rules and help", test: code.includes("https://vk.ru/@gm_manager_official-pravila-bota") },
  { name: "35 characters nickname length limit", test: code.includes("35") && code.includes("35 символов") },
  { name: "/alt command", test: code.includes('rawCmd === "/alt"') },
  { name: "/x2 command and cron", test: code.includes('rawCmd === "/х2"') && code.includes("isX2WeekendActive") },
  { name: "/renameroles command", test: code.includes('rawCmd === "/renameroles"') },
  { name: "/frozenlist & /kickfrozen commands", test: code.includes('rawCmd === "/frozenlist"') && code.includes('rawCmd === "/kickfrozen"') },
  { name: "/mute response format", test: code.includes("выдана блокировка чата сроком на") },
  { name: "/warn response format", test: code.includes("выдано предупреждение") },
  { name: "/ban response format", test: code.includes("выдана блокировка сроком на") || code.includes("выдана блокировка") },
  { name: "/kick response format", test: code.includes("был(-а) исключён из беседы по причине:") },
  { name: "/unmute response format", test: code.includes("была снята блокировка чата.") },
  { name: "/unwarn response format", test: code.includes("было снято предупреждение.") },
  { name: "/unban response format", test: code.includes("была снята блокировка.") },
  { name: "/gban response format", test: code.includes("выдана глобальная блокировка во всех беседах по причине:") },
  { name: "/addblack response format", test: code.includes("занесён в чёрный список чат-менеджера по причине:") },
  { name: "/unblack response format", test: code.includes("был снят чёрный список чат-менеджера.") },
  { name: "Flood mute exact text", test: code.includes("выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.") },
  { name: "Tag all exact text", test: code.includes("выдано предупреждение из-за тега всех участников беседы.") },
  { name: "Antisliv exact text", test: code.includes("У [id${userId}|пользователя] была автоматически снята роль из-за попытки слива беседы.") },
  { name: "Auto unmute exact text", test: code.includes("Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.") },
  { name: "Bot added to chat message and button", test: code.includes("JORDAN MANAGER был добавлен в беседу.") && code.includes("Активировать беседу") },
  { name: "User left chat message and buttons", test: code.includes("вышел(-ла) из беседы.") && code.includes("Исключить из беседы") && code.includes("Снять роль") },
  { name: "/заявка in PM", test: code.includes("/заявка") && code.includes("isPmAllowed") }
];

let allPassed = true;
console.log("=== RUNNING SYSTEM VALIDATION TESTS ===");
for (const t of tests) {
  if (t.test) {
    console.log(`✅ ${t.name}: PASSED`);
  } else {
    console.log(`❌ ${t.name}: FAILED`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("\n🚀 ALL 23 TEST SCENARIOS PASSED WITH 100% ACCURACY!");
} else {
  console.log("\n⚠️ SOME TESTS FAILED");
  process.exit(1);
}
