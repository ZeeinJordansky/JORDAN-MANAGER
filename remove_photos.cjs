const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Fortuna options cleanup
const fortunaOptionsOld = `        const options = [
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

const fortunaOptionsNew = `        const options = [
          { label: "+" + (3 * x2Multiplier) + " репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: (100000 * x2Multiplier).toLocaleString("ru-RU") + "$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (100000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (4 * x2Multiplier) + " литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (4 * x2Multiplier), lastFortuneAt: now }) },
          { label: (50000 * x2Multiplier).toLocaleString("ru-RU") + "$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (50000 * x2Multiplier), lastFortuneAt: now }) },
          { label: (3 * x2Multiplier) + " литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (3 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (2 * x2Multiplier) + " репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: "+" + (1 * x2Multiplier) + " репутацию", apply: async () => updateUser(userId, { rep: (user.rep || 0) + (1 * x2Multiplier), lastFortuneAt: now }) },
          { label: (2 * x2Multiplier) + " литра пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + (2 * x2Multiplier), lastFortuneAt: now }) },
          { label: (150000 * x2Multiplier).toLocaleString("ru-RU") + "$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + (150000 * x2Multiplier), lastFortuneAt: now }) }
        ];`;

// 2. Fortuna upload cleanup
const fortunaUploadOld = `        const extraOpts: any = {};
        if (item.img) {
          const upRes = await uploadPhoto(peerId, item.img);
          if (upRes.attachment) extraOpts.attachment = upRes.attachment;
        }

        let txt = \`Вы прокрутили колесо фортуны, и вам выпало: \${item.label}\`;`;

const fortunaUploadNew = `        const extraOpts: any = {};
        let txt = \`Вы прокрутили колесо фортуны, и вам выпало: \${item.label}\`;`;

// 3. /x2 cmd cleanup
const x2CmdOld = `        const extraOpts: any = {};
        try {
          const imgBuf = x2ModeActive 
            ? fs.readFileSync("./src/assets/images/x2_enabled.jpg") 
            : fs.readFileSync("./src/assets/images/x2_disabled.jpg");
          const upRes = await uploadPhoto(peerId, imgBuf);
          if (upRes.attachment) extraOpts.attachment = upRes.attachment;
        } catch(e) {}`;

const x2CmdNew = `        const extraOpts: any = {};`;

// 4. X2 cron enable cleanup
const x2CronEnableOld = `    try {
      const extraOpts: any = {};
      const imgBuf = fs.readFileSync("./src/assets/images/x2_enabled.jpg");
      const upRes = await uploadPhoto(2000000015, imgBuf);
      if (upRes.attachment) extraOpts.attachment = upRes.attachment;
      await sendVkMessage(VK_TOKEN, 2000000015, "🎉 Х2 режим был включён до понедельника!", extraOpts);
    } catch(e) { console.error("X2 Enable Notify Error:", e); }`;

const x2CronEnableNew = `    try {
      await sendVkMessage(VK_TOKEN, 2000000015, "🎉 Х2 режим был включён до понедельника!");
    } catch(e) { console.error("X2 Enable Notify Error:", e); }`;

// 5. X2 cron disable cleanup
const x2CronDisableOld = `    try {
      const extraOpts: any = {};
      const imgBuf = fs.readFileSync("./src/assets/images/x2_disabled.jpg");
      const upRes = await uploadPhoto(2000000015, imgBuf);
      if (upRes.attachment) extraOpts.attachment = upRes.attachment;
      await sendVkMessage(VK_TOKEN, 2000000015, "🛑 Х2 режим был отключён до пятницы.", extraOpts);
    } catch(e) { console.error("X2 Disable Notify Error:", e); }`;

const x2CronDisableNew = `    try {
      await sendVkMessage(VK_TOKEN, 2000000015, "🛑 Х2 режим был отключён до пятницы.");
    } catch(e) { console.error("X2 Disable Notify Error:", e); }`;


code = code.replace(fortunaOptionsOld, fortunaOptionsNew);
code = code.replace(fortunaUploadOld, fortunaUploadNew);
code = code.replace(x2CmdOld, x2CmdNew);
code = code.replace(x2CronEnableOld, x2CronEnableNew);
code = code.replace(x2CronDisableOld, x2CronDisableNew);

fs.writeFileSync('server.ts', code);
console.log("Images removed from Fortuna and X2.");
