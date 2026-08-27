const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `        const options = [
          { label: "+" + (3 * x2Multiplier) + " репутации", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: (100000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (100000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (4 * x2Multiplier) + " литров пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (4 * x2Multiplier), lastFortuneAt: now }) },
          { label: (50000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (50000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (3 * x2Multiplier) + " литров пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (2 * x2Multiplier) + " репутации", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (1 * x2Multiplier) + " репутацию", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (1 * x2Multiplier), lastFortuneAt: now }) },
          { label: (2 * x2Multiplier) + " литра пива", img: "https://images.unsplash.com/photo-1575037614876-c38db50ba0d0?w=400", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: (150000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (150000 * x2Multiplier), lastFortuneAt: now }) }
        ];`;

const replacement1 = `        const options = [
          { label: "+" + (3 * x2Multiplier) + " репутации", img: fs.readFileSync("./src/assets/images/fortune_rep.jpg"), apply: async () => updateUser(userId, { rep: (user.rep || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: (100000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: fs.readFileSync("./src/assets/images/fortune_money.jpg"), apply: async () => updateUser(userId, { balance: (user.balance || 0) + (100000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (4 * x2Multiplier) + " литров пива", img: fs.readFileSync("./src/assets/images/fortune_beer.jpg"), apply: async () => updateUser(userId, { beer: (user.beer || 0) + (4 * x2Multiplier), lastFortuneAt: now }) },
          { label: (50000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: fs.readFileSync("./src/assets/images/fortune_money.jpg"), apply: async () => updateUser(userId, { balance: (user.balance || 0) + (50000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (3 * x2Multiplier) + " литров пива", img: fs.readFileSync("./src/assets/images/fortune_beer.jpg"), apply: async () => updateUser(userId, { beer: (user.beer || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (2 * x2Multiplier) + " репутации", img: fs.readFileSync("./src/assets/images/fortune_rep.jpg"), apply: async () => updateUser(userId, { rep: (user.rep || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (1 * x2Multiplier) + " репутацию", img: fs.readFileSync("./src/assets/images/fortune_rep.jpg"), apply: async () => updateUser(userId, { rep: (user.rep || 0) + (1 * x2Multiplier), lastFortuneAt: now }) },
          { label: (2 * x2Multiplier) + " литра пива", img: fs.readFileSync("./src/assets/images/fortune_beer.jpg"), apply: async () => updateUser(userId, { beer: (user.beer || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: (150000 * x2Multiplier).toLocaleString("ru-RU") + "$", img: fs.readFileSync("./src/assets/images/fortune_money.jpg"), apply: async () => updateUser(userId, { balance: (user.balance || 0) + (150000 * x2Multiplier), lastFortuneAt: now }) }
        ];`;

const target2 = `          const imgUrl = x2ModeActive 
            ? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600" 
            : "https://images.unsplash.com/photo-1616719125272-3591461ffea0?w=600";
          const upRes = await uploadPhoto(peerId, imgUrl);`;

const replacement2 = `          const imgBuf = x2ModeActive 
            ? fs.readFileSync("./src/assets/images/x2_enabled.jpg") 
            : fs.readFileSync("./src/assets/images/x2_disabled.jpg");
          const upRes = await uploadPhoto(peerId, imgBuf);`;

const target3 = `      const imgUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
      const upRes = await uploadPhoto(2000000015, imgUrl);`;

const replacement3 = `      const imgBuf = fs.readFileSync("./src/assets/images/x2_enabled.jpg");
      const upRes = await uploadPhoto(2000000015, imgBuf);`;

const target4 = `      const imgUrl = "https://images.unsplash.com/photo-1616719125272-3591461ffea0?w=600";
      const upRes = await uploadPhoto(2000000015, imgUrl);`;

const replacement4 = `      const imgBuf = fs.readFileSync("./src/assets/images/x2_disabled.jpg");
      const upRes = await uploadPhoto(2000000015, imgBuf);`;

if (code.includes(target1)) code = code.replace(target1, replacement1);
if (code.includes(target2)) code = code.replace(target2, replacement2);
if (code.includes(target3)) code = code.replace(target3, replacement3);
if (code.includes(target4)) code = code.replace(target4, replacement4);

fs.writeFileSync('server.ts', code);
console.log("Replaced image URLs with generated local buffers.");
