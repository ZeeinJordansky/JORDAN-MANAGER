const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `let roleStr = "Пользователь";
        if (targetUser.role === 1) roleStr = "Модератор";`;

const newAnchor = `const tGlobalRole = targetUser.role || 0;
        const tChatRole = (targetUser.chatRoles && targetUser.chatRoles[peerId]) || 0;
        const dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
        let roleStr = "Пользователь";
        if (dispRole === 1) roleStr = "Модератор";
        else if (dispRole === 2) roleStr = "Ст. Модератор";
        else if (dispRole === 3) roleStr = "Администратор";
        else if (dispRole === 4) roleStr = "Ст. Администратор";
        else if (dispRole === 5) roleStr = "Спец. Администратор";
        else if (dispRole === 6) roleStr = "Владелец беседы";
        else if (dispRole === 7) roleStr = "Зам. Руководителя";
        else if (dispRole === 8) roleStr = "Осн. Зам. Руководителя";
        else if (dispRole === 9) roleStr = "Руководитель чат-менеджера";
        else if (dispRole === 10) roleStr = "Главный Руководитель чат-менеджера";
        else if (dispRole === 11) roleStr = "Зам. Владельца чат-менеджера";
        else if (dispRole >= 12) roleStr = "Владелец чат-менеджера";
`;

code = code.replace(/let roleStr = "Пользователь";\n\s*if \(targetUser\.role === 1\) roleStr = "Модератор";/, newAnchor);

// Remove the subsequent lines up to `let statsStr`
const removeRegex = /else if \(targetUser\.role[\s\S]*?else if \(targetUser\.role >= 12\) roleStr = "Владелец чат-менеджера";/g;
code = code.replace(removeRegex, "");

fs.writeFileSync('server.ts', code);
console.log("Stats role fixed");
