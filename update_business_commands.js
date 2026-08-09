import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ 10\. \/бизнес, \/купитьбиз, \/продатьбиз[\s\S]*?(?=\/\/ 11\. \/дуэль, \/дуэльбиз, \/кнб)/;

const newBusinessLogic = `// 10. Business system
      if (rawCmd === "/бизнес") {
        const bCount = user.businesses || 0;
        const bType = user.bizType || 0;
        const bizInfo = bType > 0 ? BIZ_TYPES[bType as keyof typeof BIZ_TYPES] : null;

        const bIncome = bizInfo ? bCount * bizInfo.profit : 0;
        const bProds = user.bizProducts || 0;

        const totalHoursLeft = bCount > 0 ? Math.floor(bProds / bCount) : 0;
        const days = Math.floor(totalHoursLeft / 24);
        const hours = totalHoursLeft % 24;
        const mins = 0; // we don't track minutes for products easily, or we can just say 0

        const pluralize = (num: number, forms: string[]) => {
          const n = Math.abs(num) % 100;
          const n1 = n % 10;
          if (n > 10 && n < 20) return forms[2];
          if (n1 > 1 && n1 < 5) return forms[1];
          if (n1 === 1) return forms[0];
          return forms[2];
        };

        const now = Date.now();
        const bizExpireAt = user.bizExpireAt || 0;
        let workMsLeft = bizExpireAt - now;
        if (workMsLeft < 0) workMsLeft = 0;

        const workHoursLeft = Math.floor(workMsLeft / 3600000);
        const workMinsLeft = Math.floor((workMsLeft % 3600000) / 60000);

        const incomeAcc = user.bizIncomeAcc || 0;

        let txt = \`Статистика бизнесов [id\${userId}|\${fullName}]\\n\\n\` +
                  \`| Кол-во бизнесов: \${bCount}\\n\` +
                  \`| Прибыль с бизнесов за 1 час: \${bIncome.toLocaleString()}$\\n\\n\` +
                  \`| Кол-во продуктов: \${bProds.toLocaleString()}\\n\` +
                  \`| Продуктов хватит на: \${days} \${pluralize(days, ['день', 'дня', 'дней'])} \${hours} \${pluralize(hours, ['час', 'часа', 'часов'])} \${mins} \${pluralize(mins, ['минуту', 'минуты', 'минут'])}\\n\\n\` +
                  \`| До конца работы бизнесов: \${workHoursLeft} \${pluralize(workHoursLeft, ['час', 'часа', 'часов'])} \${workMinsLeft} \${pluralize(workMinsLeft, ['минуту', 'минуты', 'минут'])}\\n\\n\` +
                  \`| Общий баланс бизнесов: \${incomeAcc.toLocaleString()}$\`;

        const keyboard: any = { inline: true, buttons: [] };

        if (incomeAcc > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Снять деньги с баланса бизнесов", payload: JSON.stringify({ cmd: "biz_collect_new", authorId: userId }) }, color: "positive" }]);
        }
        if (workMsLeft <= 0 && bCount > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Продлить работу бизнесов", payload: JSON.stringify({ cmd: "biz_renew", authorId: userId }) }, color: "negative" }]);
        }
        if (bCount > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Список всех ваших бизнесов", payload: JSON.stringify({ cmd: "biz_my_list", authorId: userId, page: 1 }) }, color: "secondary" }]);
        }

        if (keyboard.buttons.length === 0) {
           return await sendResponse(txt);
        } else {
           return await sendResponse(txt, { keyboard: JSON.stringify(keyboard) });
        }
      }

      if (rawCmd === "/бизнесы") {
        let txt = \`Список всех бизнесов в боте:\\n\\n\`;
        Object.entries(BIZ_TYPES).forEach(([id, b]) => {
           txt += \`\${id}) \${b.name} | Цена: \${b.price.toLocaleString()}$ | Прибыль в час: \${b.profit.toLocaleString()}$\\n\`;
        });
        return await sendResponse(txt);
      }

      if (rawCmd === "/купитьбиз") {
        const typeId = parseNumber(args[1]);
        const count = parseNumber(args[2]) || 1;

        if (!typeId || !BIZ_TYPES[typeId as keyof typeof BIZ_TYPES]) {
           return await sendResponse("Используйте: /купитьбиз [номер бизнеса (1-10)] [кол-во]");
        }
        if (count <= 0 || count > 100) return await sendResponse("Вы можете купить от 1 до 100 бизнесов за раз!");

        const bType = user.bizType || 0;
        if (bType !== 0 && bType !== typeId && (user.businesses || 0) > 0) {
           return await sendResponse(\`Вы можете покупать только бизнесы того же типа, который у вас уже есть (\${BIZ_TYPES[bType as keyof typeof BIZ_TYPES].name})!\`);
        }

        const bizInfo = BIZ_TYPES[typeId as keyof typeof BIZ_TYPES];
        const cost = count * bizInfo.price;

        if ((user.balance || 0) < cost) return await sendResponse(\`Для покупки \${count} бизнес-(ов) требуется \${cost.toLocaleString()}$\`);

        const newBiz = (user.businesses || 0) + count;
        const extraUpdates: any = { balance: user.balance - cost, businesses: newBiz, bizType: typeId };
        if (newBiz === count) {
           extraUpdates.bizExpireAt = Date.now() + 5 * 3600 * 1000;
           extraUpdates.lastBizCollectTime = Math.floor(Date.now() / 1000);
        }

        await updateUser(userId, extraUpdates);
        return await sendResponse(\`Вы купили \${count} бизнес-(ов)\\n| Теперь у вас бизнесов: \${newBiz}\\n| Не забудьте закупить продукты командой /ппрод!\`);
      }

      if (rawCmd === "/продатьбиз") {
        const count = parseNumber(args[1]) || (user.businesses || 0);
        const currentBiz = user.businesses || 0;
        if (currentBiz === 0) return await sendResponse("У вас нет бизнесов для продажи!");
        if (count <= 0 || count > currentBiz) return await sendResponse("Укажите корректное количество бизнесов для продажи!");

        const bType = user.bizType || 0;
        const bizInfo = bType > 0 ? BIZ_TYPES[bType as keyof typeof BIZ_TYPES] : null;
        if (!bizInfo) return await sendResponse("У вас нет бизнесов для продажи!");

        const sellPrice = count * (bizInfo.price * 0.5); // Sell for 50% price
        const newBiz = currentBiz - count;

        let extra: any = { balance: (user.balance || 0) + sellPrice, businesses: newBiz };
        if (newBiz === 0) {
           extra.bizType = 0;
        }

        await updateUser(userId, extra);
        return await sendResponse(\`Вы продали \${count} бизнес-(ов) за \${sellPrice.toLocaleString()}$\\n| У вас осталось: \${newBiz} бизнес-(ов)\`);
      }

      if (rawCmd === "/ппрод" || rawCmd === "/купитьпрод") {
        const bCount = user.businesses || 0;
        if (bCount === 0) return await sendResponse("У вас нет бизнесов для закупки продуктов!");
        const count = parseNumber(args[1]) || (bCount * 24);
        if (count <= 0) return await sendResponse("Укажите корректное количество продуктов!");
        const cost = count * 250;
        if ((user.balance || 0) < cost) return await sendResponse(\`У вас недостаточно средств! (Необходимо: \${cost.toLocaleString()}$ за \${count} продуктов)\`);
        const newProds = (user.bizProducts || 0) + count;
        await updateUser(userId, { balance: user.balance - cost, bizProducts: newProds });
        return await sendResponse(\`Вы успешно закупили \${count} продуктов для бизнеса за \${cost.toLocaleString()}$!\\n| Всего продуктов: \${newProds}\`);
      }

      `;

code = code.replace(regex, newBusinessLogic);
fs.writeFileSync('server.ts', code);

