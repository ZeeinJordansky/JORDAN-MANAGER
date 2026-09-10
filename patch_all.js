import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix "Имя Фамилия" in rep command
code = code.replace(
  /Используйте: \/rep \+ \[Ссылка\|Имя Фамилия\] или \/rep - \[Ссылка\|Имя Фамилия\]/g,
  'Используйте: /rep + [Ссылка|Пользователя] или /rep - [Ссылка|Пользователя]'
);

// 2. Fix the `/snick` (search nick) vs `/setnick` (set nick) collision.
// At line 12529, I have `if (["/searchnick", "/сник", "/snick", "/поискника", "/поискник"].includes(rawCmd))`
code = code.replace(
  /if \(\["\/searchnick", "\/сник", "\/snick", "\/поискника", "\/поискник"\]\.includes\(rawCmd\)\) \{/,
  'if (["/searchnick", "/поискника", "/поискник"].includes(rawCmd)) {'
);

fs.writeFileSync('server.ts', code);
