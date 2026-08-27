const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const target = `        const options = [
          { label: "+3 репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 3, lastFortuneAt: now }) },
          { label: "100.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 100000, lastFortuneAt: now }) },
          { label: "4 литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 4, lastFortuneAt: now }) },
          { label: "50.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 50000, lastFortuneAt: now }) },
          { label: "3 литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 3, lastFortuneAt: now }) },
          { label: "+2 репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 2, lastFortuneAt: now }) },
          { label: "+1 репутацию", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 1, lastFortuneAt: now }) },
          { label: "2 литра пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 2, lastFortuneAt: now }) },
          { label: "150.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 150000, lastFortuneAt: now }) }
        ];

        const item = options[Math.floor(Math.random() * options.length)];
        await item.apply();

        return await sendResponse(\`Вы прокрутили колесо фортуны, и вам выпало: \${item.label}\`);`;

const replacement = `        // X2 Mode multiplier check
        const x2Multiplier = isX2ModeActive() ? 2 : 1;

        const options = [
          { label: "+" + (3 * x2Multiplier) + " репутации", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: (100000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (100000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (4 * x2Multiplier) + " литров пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (4 * x2Multiplier), lastFortuneAt: now }) },
          { label: (50000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (50000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (3 * x2Multiplier) + " литров пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (2 * x2Multiplier) + " репутации", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (1 * x2Multiplier) + " репутацию", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (1 * x2Multiplier), lastFortuneAt: now }) },
          { label: (2 * x2Multiplier) + " литра пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: (150000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (150000 * x2Multiplier), lastFortuneAt: now }) }
        ];

        const item = options[Math.floor(Math.random() * options.length)];
        await item.apply();

        const extraOpts: any = {};
        if (item.img) {
          const upRes = await uploadPhoto(peerId, item.img);
          if (upRes.attachment) extraOpts.attachment = upRes.attachment;
        }

        let txt = \`Вы прокрутили колесо фортуны, и вам выпало: \${item.label}\`;
        if (x2Multiplier === 2) txt += "\\n🎁 (Умножено на 2 благодаря режиму X2!)";

        return await sendResponse(txt, extraOpts);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Updated Fortuna successfully.");
} else {
    console.log("Target not found!");
}
