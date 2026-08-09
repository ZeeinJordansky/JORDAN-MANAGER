import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Math.max\(0, Math.floor\(\(Date.now\(\) - \(m.marriedAt \|\| Date.now\(\)\)\) \/ \(86400 \* 1000\)\)\)/g, 'Math.max(1, Math.floor((Date.now() - (m.marriedAt || Date.now())) / (86400 * 1000)) + 1)');
code = code.replace(/Math.max\(0, Math.floor\(\(Date.now\(\) - \(user.marriage.marriedAt \|\| Date.now\(\)\)\) \/ \(86400 \* 1000\)\)\)/g, 'Math.max(1, Math.floor((Date.now() - (user.marriage.marriedAt || Date.now())) / (86400 * 1000)) + 1)');

fs.writeFileSync('server.ts', code);
