const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Ст\. Модератор/g, 'Старший Модератор');
code = code.replace(/Ст\. Администратор/g, 'Старший Администратор');
code = code.replace(/Ст\. модератор/g, 'Старший модератор');
code = code.replace(/Ст\. администратор/g, 'Старший администратор');
code = code.replace(/ст\. модератор/g, 'старший модератор');
code = code.replace(/ст\. администратор/g, 'старший администратор');

fs.writeFileSync('server.ts', code);
console.log("Patched senior roles successfully");
