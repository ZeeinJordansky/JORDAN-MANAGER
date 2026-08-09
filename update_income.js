import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldIncomeLogic = `      // Passive income accumulator for businesses (Products must NOT auto-replenish, only consume)
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

const newIncomeLogic = `      // Passive income accumulator for businesses (Products must NOT auto-replenish, only consume)
      const nowSec = Math.floor(Date.now() / 1000);
      const bizExpireAt = user.bizExpireAt || 0;
      // Only accumulate if the business hasn't expired yet
      if (bizExpireAt > Date.now()) {
        const hoursPassed = Math.floor((nowSec - (user.lastBizCollectTime || nowSec)) / 3600);
        if (hoursPassed > 0 && (user.businesses || 0) > 0 && (user.bizProducts || 0) > 0) {
          const bType = user.bizType || 1;
          const bizInfo = BIZ_TYPES[bType as keyof typeof BIZ_TYPES] || BIZ_TYPES[1];
          const consumedProducts = Math.min(user.bizProducts, hoursPassed * user.businesses);
          const actualHours = Math.floor(consumedProducts / user.businesses);
          const addedIncome = actualHours * user.businesses * bizInfo.profit;

          await updateUser(userId, {
            bizProducts: user.bizProducts - consumedProducts,
            bizIncomeAcc: (user.bizIncomeAcc || 0) + addedIncome,
            lastBizCollectTime: nowSec
          });
        }
      }`;

code = code.replace(oldIncomeLogic, newIncomeLogic);
fs.writeFileSync('server.ts', code);
