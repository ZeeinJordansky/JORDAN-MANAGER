import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldCalc = `      // Passive income accumulator for businesses (Products must NOT auto-replenish, only consume)
      const nowSec = Math.floor(Date.now() / 1000);
      const hoursPassed = Math.floor((nowSec - (user.lastBizCollectTime || nowSec)) / 3600);
      if (hoursPassed > 0 && (user.businesses || 0) > 0 && (user.bizProducts || 0) > 0) {
        const consumedProducts = Math.min(user.bizProducts, hoursPassed * user.businesses);
        const actualHours = Math.floor(consumedProducts / user.businesses);
        const addedIncome = actualHours * user.businesses * 1000;
        await updateUser(userId, {
          bizProducts: user.bizProducts - consumedProducts,
          bizIncomeAcc: (user.bizIncomeAcc || 0) + addedIncome,
          lastBizCollectTime: nowSec
        });
      }`;

const newCalc = `      // Passive income accumulator for businesses
      if ((user.businesses || 0) > 0 && user.bizType) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (!user.lastBizCollectTime) {
          user.lastBizCollectTime = nowSec;
          await updateUser(userId, { lastBizCollectTime: nowSec });
        }
        
        const hoursPassed = Math.floor((nowSec - user.lastBizCollectTime) / 3600);
        if (hoursPassed > 0) {
          const bizInfo = BIZ_TYPES[user.bizType as keyof typeof BIZ_TYPES];
          if (bizInfo) {
             let validHours = 0;
             let newProducts = user.bizProducts || 0;
             let bizExpireAt = user.bizExpireAt || 0;

             for (let i = 0; i < hoursPassed; i++) {
                const currentHourStart = (user.lastBizCollectTime + (i * 3600)) * 1000;
                if (currentHourStart >= bizExpireAt) {
                  continue; 
                }
                
                if (newProducts >= user.businesses) {
                  newProducts -= user.businesses;
                  validHours++;
                }
             }

             if (validHours > 0 || hoursPassed > 0) {
                await updateUser(userId, {
                  bizProducts: newProducts,
                  bizIncomeAcc: (user.bizIncomeAcc || 0) + (validHours * user.businesses * bizInfo.profit),
                  lastBizCollectTime: user.lastBizCollectTime + (hoursPassed * 3600)
                });
                user.bizProducts = newProducts;
                user.bizIncomeAcc = (user.bizIncomeAcc || 0) + (validHours * user.businesses * bizInfo.profit);
                user.lastBizCollectTime = user.lastBizCollectTime + (hoursPassed * 3600);
             }
          }
        }
      }`;

code = code.replace(oldCalc, newCalc);
fs.writeFileSync('server.ts', code);
