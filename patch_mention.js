import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Replace [id${ID}|пользователю] -> ${formatUserMention(ID, "Пользователю", "dat")}
code = code.replace(/\[id\$\{([^}]+)\}\|([Пп]ользователю)\]/g, (match, p1, p2) => {
    return `\${formatUserMention(${p1}, "${p2}", "dat")}`;
});

code = code.replace(/\[id\$\{([^}]+)\}\|([Пп]ользователь)\]/g, (match, p1, p2) => {
    return `\${formatUserMention(${p1}, "${p2}", "nom")}`;
});

code = code.replace(/\[id\$\{([^}]+)\}\|([Пп]ользователя)\]/g, (match, p1, p2) => {
    return `\${formatUserMention(${p1}, "${p2}", "gen")}`;
});

code = code.replace(/\[id\$\{([^}]+)\}\|([Пп]ользователем)\]/g, (match, p1, p2) => {
    return `\${formatUserMention(${p1}, "${p2}", "ins")}`;
});

// For variables: [id${userId}|${fullName}]
code = code.replace(/\[id\$\{([^}]+)\}\|\$\{([^}]+)\}\]/g, (match, p1, p2) => {
    return `\${formatUserMention(${p1}, String(${p2}), "nom")}`;
});

fs.writeFileSync('server.ts', code);
