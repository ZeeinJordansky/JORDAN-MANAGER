const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/label: "Зам\. Спец\. Адм\."/g, 'label: "Зам. Глав. Администратора"');

fs.writeFileSync('server.ts', code);
