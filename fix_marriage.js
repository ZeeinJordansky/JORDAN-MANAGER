import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  '| В браке с: ${dateFormatted}\`);',
  '| В браке с: ${dateFormatted} (${Math.max(0, Math.floor((Date.now() - (user.marriage.marriedAt || Date.now())) / (86400 * 1000)))} дней)\`);'
);
fs.writeFileSync('server.ts', code);
