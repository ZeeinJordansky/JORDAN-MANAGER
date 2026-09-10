import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Replace VIP with Premium
text = text.replace("/купитьвип", "/купитьпрем")
text = text.replace("/givevip", "/givepremium")
text = text.replace("/takevip", "/takepremium")
text = text.replace("/resetvip", "/resetpremium")

# Fix profile command
profile_old = r"\} else if \(\[\"/profile\", \"/профиль\", \"/проф\"\].includes\(rawCmd\)\) \{([\s\S]*?)const userClanId = tUser\.clanId;"
profile_new = """} else if (["/profile", "/профиль", "/проф"].includes(rawCmd)) {
        const parsed = await parseTargetUser(message, args.slice(1));
        const finalId = parsed.targetId || userId;
        const tUser = await getOrCreateUser(finalId);
        const tName = tUser.fullName || tUser.nick || "Игрок";
        
        if (tUser.hideProfile && finalId !== userId && user.role < 12) {
            return await sendResponse("Профиль скрыт.");
        }
        
        const balance = tUser.hideBalance && finalId !== userId && user.role < 12 ? "Скрыто" : formatNum(tUser.balance || 0);
        const bank = tUser.hideBalance && finalId !== userId && user.role < 12 ? "Скрыто" : formatNum(tUser.bank || 0);
        
        let profileText = `👤 Профиль игрока [id${finalId}|${tName}]\n\n`;
        profileText += `| На балансе: ${balance}$\n`;
        profileText += `| В банке: ${bank}$\n\n`;
        if (tUser.marriage && tUser.marriage.partnerId) {
            profileText += `| Женат на: [id${tUser.marriage.partnerId}|${tUser.marriage.partnerName || "Партнером"}]\n\n`;
        }
        const bizCount = tUser.businesses ? tUser.businesses.count || 0 : 0;
        profileText += `| Бизнесов: ${bizCount}\n\n`;
        profileText += `| Кол-во репутации: ${formatNum(tUser.reputation || 0)}\n\n`;
        profileText += `| Выпито всего пива: ${formatNum(tUser.beer || 0)} л\n`;
        if (tUser.premium) {
            profileText += `| Premium Игрок\n`;
        }
        
        const userClanId = tUser.clanId;"""

text = re.sub(profile_old, profile_new, text)

# Inject commands before /wake
injection_point = r"\} else if \(\[\"/wake\", \"/wakeup\""

new_cmds = """} else if (["/премпрофиль"].includes(rawCmd)) {
        if (!user.premium) return await sendResponse("Эта команда доступна только Premium игрокам!");
        const hide = args[1] === "+" ? false : args[1] === "-" ? true : !user.hideProfile;
        await updateUser(userId, { hideProfile: hide });
        return await sendResponse(hide ? "Вы скрыли свой профиль для публичного просмотра" : "Вы открыли свой профиль для публичного просмотра");
        
      } else if (["/прембаланс"].includes(rawCmd)) {
        if (!user.premium) return await sendResponse("Эта команда доступна только Premium игрокам!");
        const hide = args[1] === "+" ? false : args[1] === "-" ? true : !user.hideBalance;
        await updateUser(userId, { hideBalance: hide });
        return await sendResponse(hide ? "Вы закрыли свой баланс для публичного просмотра" : "Вы открыли свой баланс для публичного просмотра");
        
      } else if (["/открытьдепозит"].includes(rawCmd)) {
        if (!user.premium) return await sendResponse("Эта команда доступна только Premium игрокам!");
        const days = parseInt(args[1]);
        const sum = parseNumber(args[2]);
        if (![4, 8, 10].includes(days)) return await sendResponse("Доступные сроки депозита: 4, 8 или 10 дней.");
        if (isNaN(sum) || sum <= 0) return await sendResponse("Укажите корректную сумму.");
        if (user.balance < sum) return await sendResponse("Недостаточно средств на балансе.");
        
        let deps = user.deposits || [];
        if (deps.length >= 2) return await sendResponse("У вас уже открыто максимальное количество депозитов (2).");
        
        let percent = days === 4 ? 10 : days === 8 ? 25 : 35;
        deps.push({ sum, days, percent, openedAt: Date.now() });
        
        await updateUser(userId, { balance: user.balance - sum, deposits: deps });
        return await sendResponse(`Вы открыли депозит на сумму ${formatNum(sum)}$ на ${days} дней`);
        
      } else if (["/депозиты"].includes(rawCmd)) {
        if (!user.premium) return await sendResponse("Эта команда доступна только Premium игрокам!");
        let deps = user.deposits || [];
        
        let text = `...::Управление депозитами::...\n\n`;
        text += `| Кол-во открытых депозитов у вас: ${deps.length}\n`;
        
        let readyCount = 0;
        let infoText = `| Информация о открытых депозитах:\n\n`;
        let kb = { inline: true, buttons: [] };
        
        deps.forEach((d: any, idx: number) => {
            const elapsed = Date.now() - d.openedAt;
            const targetMs = d.days * 24 * 3600 * 1000;
            const leftMs = targetMs - elapsed;
            const ready = leftMs <= 0;
            if (ready) readyCount++;
            
            const leftDays = ready ? 0 : Math.ceil(leftMs / (24 * 3600 * 1000));
            const total = Math.floor(d.sum + (d.sum * d.percent / 100));
            
            infoText += `${idx + 1}) Депозит №${idx + 1} | Сумма: ${formatNum(d.sum)}$ | Процент: ${d.percent}% | На: ${d.days} д | До вывода: ${leftDays} д | Итог: ${formatNum(total)}$\n`;
            
            if (ready) {
                kb.buttons.push([{ action: { type: "callback", label: `Закрыть депозит №${idx + 1}`, payload: JSON.stringify({ cmd: "close_dep", idx: idx }) }, color: "positive" }]);
            }
        });
        text += `| Кол-во депозитов, которые можно забрать: ${readyCount}\n\n` + infoText;
        
        return await sendResponse(text, kb.buttons.length > 0 ? { keyboard: JSON.stringify(kb) } : {});
        
      } else if (["/rep", "/реп"].includes(rawCmd)) {
         const isPlus = args[1] === "+";
         const isMinus = args[1] === "-";
         if (!isPlus && !isMinus) return await sendResponse("Укажите + или -");
         
         const parsed = await parseTargetUser(message, args.slice(2));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Нельзя изменить репутацию самому себе.");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const newRep = (tUser.reputation || 0) + (isPlus ? 1 : -1);
         await updateUser(parsed.targetId, { reputation: newRep });
         
         const msg = isPlus ? `[id${parsed.targetId}|Пользователю] повышена репутация! Теперь у него: ${formatNum(newRep)} репутации\n\n| Повысил - [id${userId}|${fullName}]` :
                              `[id${parsed.targetId}|Пользователю] понижена репутация! Теперь у него: ${formatNum(newRep)} репутации\n\n| Понизил - [id${userId}|${fullName}]`;
         return await sendResponse(msg);
         
      } else if (["/казино", "/casino", "/к"].includes(rawCmd) && isGame) {
          if (args.length < 2) return await sendResponse("Укажите сумму ставки.");
          const bet = parseNumber(args[1]);
          if (bet <= 0 || isNaN(bet)) return await sendResponse("Неверная сумма ставки.");
          if (user.balance < bet) return await sendResponse("Недостаточно средств на балансе.");
          
          const win = Math.random() > 0.55;
          if (win) {
              const winAmount = bet;
              await updateUser(userId, { balance: user.balance + winAmount });
              return await sendResponse(`Вы выиграли в казино ${formatNum(winAmount)}$!\nВаш баланс: ${formatNum(user.balance + winAmount)}$`);
          } else {
              await updateUser(userId, { balance: user.balance - bet });
              return await sendResponse(`Вы проиграли в казино ${formatNum(bet)}$!\nВаш баланс: ${formatNum(user.balance - bet)}$`);
          }
      } else if (["/рулетка", "/roulette", "/р"].includes(rawCmd) && isGame) {
          if (args.length < 2) return await sendResponse("Укажите сумму ставки.");
          const bet = parseNumber(args[1]);
          if (bet <= 0 || isNaN(bet)) return await sendResponse("Неверная сумма ставки.");
          if (user.balance < bet) return await sendResponse("Недостаточно средств на балансе.");
          
          const win = Math.random() > 0.6;
          if (win) {
              const winAmount = bet * 2;
              await updateUser(userId, { balance: user.balance + winAmount });
              return await sendResponse(`Рулетка остановилась на победном числе! Вы выиграли ${formatNum(winAmount)}$!\nВаш баланс: ${formatNum(user.balance + winAmount)}$`);
          } else {
              await updateUser(userId, { balance: user.balance - bet });
              return await sendResponse(`Рулетка остановилась не в вашу пользу. Вы проиграли ${formatNum(bet)}$!\nВаш баланс: ${formatNum(user.balance - bet)}$`);
          }
      } else if (["/ежедневный", "/ежедневныйбонус", "/бонус"].includes(rawCmd) && (args[1] === "бонус" || !args[1])) {
          const nowMs = Date.now();
          const lastBonus = user.lastDailyBonus || 0;
          
          const msInDay = 24 * 3600 * 1000;
          const isReady = nowMs - lastBonus > msInDay;
          
          let streak = user.dailyBonusStreak || 0;
          if (nowMs - lastBonus > msInDay * 2) streak = 0; // reset if missed a day
          
          if (streak >= 7) streak = 0; // 7 days cycle
          
          const bonuses = [
            { text: "25.000$", reward: { balance: 25000 } },
            { text: "2 репутации", reward: { reputation: 2 } },
            { text: "3 литра пива", reward: { beer: 3 } },
            { text: "75.000$", reward: { balance: 75000 } },
            { text: "4 репутации", reward: { reputation: 4 } },
            { text: "7 литров пива", reward: { beer: 7 } },
            { text: "300.000$", reward: { balance: 300000 } }
          ];
          
          const todayBonus = bonuses[streak];
          
          let txt = `Ваш ежедневный бонус: ${isReady ? "готов" : "не готов"}\n| Бонус сегодня: ${todayBonus.text}`;
          
          if (isReady) {
              const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Забрать бонус", payload: JSON.stringify({ cmd: "daily_bonus", streak }) }, color: "positive" }]] };
              return await sendResponse(txt, { keyboard: JSON.stringify(kb) });
          } else {
              return await sendResponse(txt);
          }
      } else if (["/подписка"].includes(rawCmd)) {
          if (user.subBonusReceived) return await sendResponse("Вы уже получали бонус за подписку на сообщество!");
          
          try {
             const check = await vkApi.get("groups.isMember", { params: { group_id: 239281784, user_id: userId, access_token: VK_TOKEN, v: "5.131" } });
             if (check.data?.response === 1) {
                 await updateUser(userId, { balance: user.balance + 200000, subBonusReceived: true });
                 return await sendResponse(`Вы получили бонус за подписку на сообщество!\n| Размер бонуса: 200.000$`);
             } else {
                 return await sendResponse(`Вы ещё не подписались на сообщество, что бы получить бонус.\n| Если вы желаете получить бонус за подписку, то подпишитесь на это сообщество: https://vk.com/club239281784`);
             }
          } catch(e) {
             return await sendResponse("Ошибка при проверке подписки.");
          }
      } else if (["/купитьпрем", "/купитьпремиум"].includes(rawCmd)) {
          if (user.premium) return await sendResponse("У вас уже есть Premium-статус!");
          const price = 15000000;
          if (user.balance < price) return await sendResponse(`Для покупки Premium необходимо ${formatNum(price)}$, у вас ${formatNum(user.balance)}$`);
          
          await updateUser(userId, { balance: user.balance - price, premium: true });
          return await sendResponse("Вы успешно приобрели Premium-статус!");
      } else if (["/ии", "/ai"].includes(rawCmd)) {
          if (!user.premium) return await sendResponse("Эта команда доступна только Premium игрокам!");
          const query = args.slice(1).join(" ");
          if (!query) return await sendResponse("Введите запрос для ИИ.");
          
          const waitMsg = await sendVkMessage(VK_TOKEN, peerId, "Пожалуйста подождите, ваш запрос обрабатывается...");
          try {
              const { GoogleGenAI } = require("@google/genai");
              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: query
              });
              const aiText = response.text;
              if (waitMsg && waitMsg.data && waitMsg.data.response) {
                  await editVkMessage(VK_TOKEN, peerId, waitMsg.data.response, aiText);
              } else {
                  await sendVkMessage(VK_TOKEN, peerId, aiText);
              }
          } catch(e) {
              if (waitMsg && waitMsg.data && waitMsg.data.response) {
                  await editVkMessage(VK_TOKEN, peerId, waitMsg.data.response, "Ошибка при обращении к ИИ.");
              }
          }
          return;
      }
      } else if (["/wake", "/wakeup\""""

text = re.sub(injection_point, new_cmds, text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 1 done")
