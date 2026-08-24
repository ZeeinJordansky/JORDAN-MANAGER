const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Специальный Администратор/g, 'Главный Администратор');
code = code.replace(/Специальный администратор/g, 'Главный администратор');
code = code.replace(/Специального Администратора/g, 'Главного Администратора');
code = code.replace(/Специального администратора/g, 'Главного администратора');
code = code.replace(/Спец\. Администратора/g, 'Главного Администратора'); // Handles "Зам. Спец. Администратора" -> "Зам. Главного Администратора"
code = code.replace(/Зам\. Главного Администратора/g, 'Зам. Главного Администратора'); // Just in case
code = code.replace(/Спец\. Администратор/g, 'Главный Администратор');

fs.writeFileSync('server.ts', code);
console.log("Roles patched");
