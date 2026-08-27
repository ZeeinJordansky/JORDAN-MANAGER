const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const targetObj = `const DAILY_BONUSES: { [day: number]: { label: string, apply: (u: any, id: number) => Promise<void> } } = {
  1: { label: "25.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 25000 }); } },
  2: { label: "2 репутации", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 2 }); } },
  3: { label: "3 литра пива", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 3 }); } },
  4: { label: "75.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 75000 }); } },
  5: { label: "4 репутации", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 4 }); } },
  6: { label: "7 литров пива", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 7 }); } },
  7: { label: "300.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 300000 }); } }
};`;

const replacementObj = `const DAILY_BONUSES: { [day: number]: { label: (x2: number) => string, apply: (u: any, id: number, x2: number) => Promise<void> } } = {
  1: { label: (x2) => (25000 * x2).toLocaleString("ru-RU") + "$", apply: async (u, id, x2) => { await updateUser(id, { balance: (u.balance || 0) + (25000 * x2) }); } },
  2: { label: (x2) => (2 * x2) + " репутации", apply: async (u, id, x2) => { await updateUser(id, { rep: (u.rep || 0) + (2 * x2) }); } },
  3: { label: (x2) => (3 * x2) + " литра пива", apply: async (u, id, x2) => { await updateUser(id, { beer: (u.beer || 0) + (3 * x2) }); } },
  4: { label: (x2) => (75000 * x2).toLocaleString("ru-RU") + "$", apply: async (u, id, x2) => { await updateUser(id, { balance: (u.balance || 0) + (75000 * x2) }); } },
  5: { label: (x2) => (4 * x2) + " репутации", apply: async (u, id, x2) => { await updateUser(id, { rep: (u.rep || 0) + (4 * x2) }); } },
  6: { label: (x2) => (7 * x2) + " литров пива", apply: async (u, id, x2) => { await updateUser(id, { beer: (u.beer || 0) + (7 * x2) }); } },
  7: { label: (x2) => (300000 * x2).toLocaleString("ru-RU") + "$", apply: async (u, id, x2) => { await updateUser(id, { balance: (u.balance || 0) + (300000 * x2) }); } }
};`;

const targetResp = `        const textResp = \`Ваш ежедневный бонус: \${statusStr}\\n| Бонус сегодня: \${dayData.label}\`;`;
const replacementResp = `        const x2M = isX2ModeActive() ? 2 : 1;
        let textResp = \`Ваш ежедневный бонус: \${statusStr}\\n| Бонус сегодня: \${dayData.label(x2M)}\`;
        if (x2M === 2) textResp += "\\n🎁 (Умножено на 2 благодаря режиму X2!)";`;

const targetApply = `      await dayData.apply(user, userId);

      const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
      await updateUser(userId, { lastDailyAt: now, dailyDay: nextDay });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const claimedText = \`[id\${userId}|\${user.nick || 'Игрок'}] забрал(-а) свой ежедневный бонус "\${dayData.label}"\`;`;
      
const replacementApply = `      const x2M = isX2ModeActive() ? 2 : 1;
      await dayData.apply(user, userId, x2M);

      const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
      await updateUser(userId, { lastDailyAt: now, dailyDay: nextDay });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const claimedText = \`[id\${userId}|\${user.nick || 'Игрок'}] забрал(-а) свой ежедневный бонус "\${dayData.label(x2M)}"\${x2M === 2 ? ' (X2 Бонус!)' : ''}\`;`;

if (code.includes(targetObj) && code.includes(targetResp) && code.includes(targetApply)) {
    code = code.replace(targetObj, replacementObj);
    code = code.replace(targetResp, replacementResp);
    code = code.replace(targetApply, replacementApply);
    fs.writeFileSync('server.ts', code);
    console.log("Updated daily bonus successfully.");
} else {
    console.log("Target not found!");
}
