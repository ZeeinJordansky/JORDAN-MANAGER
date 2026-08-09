import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Укажите пользователя для передачи денег!/g, "Укажите пользователя!");
code = code.replace(/Укажите пользователя для предложения!/g, "Укажите пользователя!");
code = code.replace(/Укажите пользователя и литры!/g, "Укажите пользователя!");
code = code.replace(/Укажите пользователя и количество!/g, "Укажите пользователя!");

fs.writeFileSync('server.ts', code);
