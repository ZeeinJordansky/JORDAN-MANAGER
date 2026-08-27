const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const t1 = '`[VK API ${res.data.error.error_code}: ${res.data.error.error_msg}]`';
const r1 = '`${res.data.error.error_msg} (код ${res.data.error.error_code})`';

const t2 = '`[Ошибка VK API ${res.data.error.error_code}: ${res.data.error.error_msg}]`';
const r2 = '`${res.data.error.error_msg} (код ${res.data.error.error_code})`';

code = code.replace(t1, r1);
code = code.replace(t1, r1); // In case there are multiple
code = code.replace(t2, r2);

fs.writeFileSync('server.ts', code);
console.log("Replaced VK API error templates.");
