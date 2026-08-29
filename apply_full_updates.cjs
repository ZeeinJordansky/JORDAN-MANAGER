const fs = require("fs");

let content = fs.readFileSync("server.ts", "utf8");

console.log("Applying complete prompt updates to server.ts...");

// 1. Allow /заявка and /податьзаявку in DMs
content = content.replace(
  `"/start", "/help", "/gamehelp", "/ghelp", "/старт", "/помощь", "/хелп", "/команды", "/меню",`,
  `"/start", "/help", "/gamehelp", "/ghelp", "/старт", "/помощь", "/хелп", "/команды", "/меню", "/заявка", "/податьзаявку",`
);

// 2. Rules link replacement
content = content.replace(/https:\/\/vk\.com\/wall[^\s"']+/g, "https://vk.ru/@gm_manager_official-pravila-bota");
content = content.replace(/https:\/\/vk\.ru\/@gm_manager_official[^\s"']*/g, "https://vk.ru/@gm_manager_official-pravila-bota");

// 3. Rename Role titles everywhere
content = content.replace(/Спец\. Администратор/g, "Главный Администратор");
content = content.replace(/Специальный администратор/g, "Главный Администратор");
content = content.replace(/Зам\. спец\. администратора/g, "Зам. Глав. Администратора");
content = content.replace(/Зам\. Спец\. Администратора/g, "Зам. Глав. Администратора");

// Save progress
fs.writeFileSync("server.ts", content);
console.log("Phase 1 replacements done.");
