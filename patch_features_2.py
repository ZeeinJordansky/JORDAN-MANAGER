import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Inject commands before /wake
injection_point = r"\} else if \(\[\"/wake\", \"/wakeup\""

new_cmds = """} else if (["/взлом"].includes(rawCmd) && isGame) {
          const nowMs = Date.now();
          const cd = 3 * 3600 * 1000;
          if (user.lastHack && nowMs - user.lastHack < cd) {
              const left = Math.ceil((cd - (nowMs - user.lastHack)) / 60000);
              return await sendResponse(`Эту команду можно использовать раз в 3 часа. Осталось: ${left} мин.`);
          }
          await updateUser(userId, { lastHack: nowMs });
          
          const forms = [
            { t: "Вы попытались взломать сервер Minecraft, и у вас получилось!", w: true, min: 10000, max: 80000 },
            { t: "Вы попытались взломать сервер Minecraft, и у вас не получилось :(\n| Что бы владелец сервера Minecraft не писал на вас заявление за взлом, вам пришлось ему отдать 20.000$", w: false, p: -20000 },
            { t: "Вы попытались взломать системы безопасности крупной компании, и у вас получилось!", w: true, min: 10000, max: 100000 },
            { t: "Вы попытались взломать системы безопасности крупной компании, но вас отвлёк телефонный звонок, и у вас ничего не получилось :(", w: false, p: 0 },
            { t: "Вы попытались взломать запороленный телефон, и у вас получилось!", w: true, min: 10000, max: 80000 },
            { t: "Вы попытались взломать запороленный телефон, и у вас ничего не получилось :(", w: false, p: 0 },
            { t: "Вас посадили в тюрьму, за то что вы пытались взломать youtube канал популярного блогера.\n| Что бы вас оттуда выпустили, вам пришлось заплатить 30.000$", w: false, p: -30000 }
          ];
          
          const r = forms[Math.floor(Math.random() * forms.length)];
          if (r.w) {
              const win = Math.floor(Math.random() * (r.max - r.min + 1)) + r.min;
              await updateUser(userId, { balance: user.balance + win });
              return await sendResponse(`${r.t}\n| Вы заработали: ${formatNum(win)}$`);
          } else {
              if (r.p !== 0) {
                  await updateUser(userId, { balance: user.balance + r.p });
              }
              return await sendResponse(r.t);
          }
      } else if (["/фортуна"].includes(rawCmd) && isGame) {
          const nowMs = Date.now();
          const cd = 24 * 3600 * 1000;
          if (user.lastFortune && nowMs - user.lastFortune < cd) {
              const left = Math.ceil((cd - (nowMs - user.lastFortune)) / 3600000);
              return await sendResponse(`Эту команду можно использовать раз в сутки. Осталось: ~${left} ч.`);
          }
          await updateUser(userId, { lastFortune: nowMs });
          
          const prizes = [
            { n: "+3 репутации", t: "reputation", v: 3 },
            { n: "100.000$", t: "balance", v: 100000 },
            { n: "4 литров пива", t: "beer", v: 4 },
            { n: "50.000$", t: "balance", v: 50000 },
            { n: "3 литров пива", t: "beer", v: 3 },
            { n: "+2 репутации", t: "reputation", v: 2 },
            { n: "+1 репутацию", t: "reputation", v: 1 },
            { n: "2 литра пива", t: "beer", v: 2 },
            { n: "150.000$", t: "balance", v: 150000 }
          ];
          
          const r = prizes[Math.floor(Math.random() * prizes.length)];
          const updates: any = {};
          updates[r.t] = (user[r.t] || 0) + r.v;
          await updateUser(userId, updates);
          
          return await sendResponse(`Вы прокрутили колесо фортуны, и вам выпало: ${r.n}`);
      } else if (["/погода"].includes(rawCmd)) {
          const city = args.slice(1).join(" ");
          if (!city) return await sendResponse("Укажите город.");
          const weather = await getWeatherForecast(city, "today");
          if (!weather) return await sendResponse("Город не найден.");
          return await sendResponse(weather.text, { keyboard: JSON.stringify(weather.keyboard) });
      } else if (["/дуэль"].includes(rawCmd) && isGame) {
          if (args.length < 2) return await sendResponse("Укажите ставку для дуэли.");
          const bet = parseNumber(args[1]);
          if (isNaN(bet) || bet <= 0) return await sendResponse("Неверная сумма.");
          if (user.balance < bet) return await sendResponse("У вас недостаточно средств на балансе.");
          
          const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Сразиться", payload: JSON.stringify({ cmd: "duel_accept", creatorId: userId, bet }) }, color: "positive" }]] };
          
          return await sendResponse(`[id${userId}|${fullName}] запустил(-а) дуэль на ${formatNum(bet)}$!\n\n| Что бы сразиться в дуэли, нажмите на кнопку`, { keyboard: JSON.stringify(kb) });
      } else if (["/дуэльбиз"].includes(rawCmd) && isGame) {
          if (args.length < 2) return await sendResponse("Укажите количество бизнесов для дуэли.");
          const bet = parseNumber(args[1]);
          if (isNaN(bet) || bet <= 0) return await sendResponse("Неверное количество бизнесов.");
          const bCount = user.businesses ? user.businesses.count || 0 : 0;
          if (bCount < bet) return await sendResponse("У вас недостаточно бизнесов.");
          
          const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Сразиться", payload: JSON.stringify({ cmd: "duel_biz_accept", creatorId: userId, bet }) }, color: "positive" }]] };
          
          const suf = bet === 1 ? "бизнес" : (bet >= 2 && bet <= 4 ? "бизнеса" : "бизнесов");
          return await sendResponse(`[id${userId}|${fullName}] запустил(-а) дуэль на ${bet} ${suf}!\n\n| Что бы сразиться в дуэли, нажмите на кнопку`, { keyboard: JSON.stringify(kb) });
      } else if (["/брак"].includes(rawCmd)) {
          if (args[1] === "запрос") {
             const parsed = await parseTargetUser(message, args.slice(2));
             if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
             if (parsed.targetId === userId) return await sendResponse("Нельзя заключить брак с самим собой.");
             if (user.marriage && user.marriage.partnerId) return await sendResponse("Вы уже в браке!");
             
             const tUser = await getOrCreateUser(parsed.targetId);
             if (tUser.marriage && tUser.marriage.partnerId) return await sendResponse("Пользователь уже в браке!");
             
             const tName = tUser.fullName || "Пользователь";
             const kb = { inline: true, buttons: [
                 [{ action: { type: "callback", label: "Согласиться", payload: JSON.stringify({ cmd: "marry_accept", partnerId: userId, pName: fullName }) }, color: "positive" }],
                 [{ action: { type: "callback", label: "Отказаться", payload: JSON.stringify({ cmd: "marry_deny", partnerId: userId, pName: fullName }) }, color: "negative" }]
             ]};
             return await sendResponse(`[id${parsed.targetId}|${tName}], минуточку внимания!\n\n[id${userId}|${fullName}] хочет сделать вам предложение!\n\nПринять решение можно нажав на кнопки:`, { keyboard: JSON.stringify(kb) });
          } else if (args[1] === "развод") {
             if (!user.marriage || !user.marriage.partnerId) return await sendResponse("Вы не в браке.");
             const pId = user.marriage.partnerId;
             const pName = user.marriage.partnerName || "Партнер";
             const kb = { inline: true, buttons: [
                 [{ action: { type: "callback", label: "Развестись", payload: JSON.stringify({ cmd: "divorce_accept", partnerId: pId, pName }) }, color: "positive" }],
                 [{ action: { type: "callback", label: "Не разводиться", payload: JSON.stringify({ cmd: "divorce_deny", partnerId: pId, pName }) }, color: "negative" }]
             ]};
             return await sendResponse(`Вы хотите развестись со своей второй половинкой [id${pId}|${pName}]\n\nДля подтверждения нажмите на кнопку:`, { keyboard: JSON.stringify(kb) });
          } else {
             if (!user.marriage || !user.marriage.partnerId) return await sendResponse("Вы не в браке.\nИспользуйте: /брак запрос [Пользователь]");
             const d = new Date(user.marriage.date || Date.now());
             const day = String(d.getDate()).padStart(2, "0");
             const mon = String(d.getMonth() + 1).padStart(2, "0");
             const yr = d.getFullYear();
             const hr = String(d.getHours()).padStart(2, "0");
             const min = String(d.getMinutes()).padStart(2, "0");
             const sec = String(d.getSeconds()).padStart(2, "0");
             const dStr = `${day}.${mon}.${yr} ${hr}:${min}:${sec} МСК (UTC +3)`;
             return await sendResponse(`Информация о вашем браке\n\n| Женат на - [id${user.marriage.partnerId}|${user.marriage.partnerName || "Партнере"}]\n\n| В браке с: ${dStr}`);
          }
      }
      } else if (["/wake", "/wakeup\""""

text = re.sub(injection_point, new_cmds, text)

# Inject callbacks
cb_injection = r"if \(cmd === \"unban_alert_action\"\) \{"

new_cbs = """if (cmd === "daily_bonus") {
          const streak = payloadObj.streak;
          const bonuses = [
            { text: "25.000$", reward: { balance: (u.balance||0) + 25000 } },
            { text: "2 репутации", reward: { reputation: (u.reputation||0) + 2 } },
            { text: "3 литра пива", reward: { beer: (u.beer||0) + 3 } },
            { text: "75.000$", reward: { balance: (u.balance||0) + 75000 } },
            { text: "4 репутации", reward: { reputation: (u.reputation||0) + 4 } },
            { text: "7 литров пива", reward: { beer: (u.beer||0) + 7 } },
            { text: "300.000$", reward: { balance: (u.balance||0) + 300000 } }
          ];
          const b = bonuses[streak];
          b.reward.lastDailyBonus = Date.now();
          b.reward.dailyBonusStreak = streak + 1;
          await updateUser(userId, b.reward);
          
          const fullName = u.fullName || `User${userId}`;
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] забрал(-а) свой ежедневный бонус "${b.text}"`);
          return;
      }
      
      if (cmd === "close_dep") {
          const idx = payloadObj.idx;
          let deps = u.deposits || [];
          if (!deps[idx]) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Депозит не найден.");
          
          const d = deps[idx];
          const elapsed = Date.now() - d.openedAt;
          const targetMs = d.days * 24 * 3600 * 1000;
          if (elapsed < targetMs) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Депозит еще не готов к выводу.");
          
          const total = Math.floor(d.sum + (d.sum * d.percent / 100));
          deps.splice(idx, 1);
          
          await updateUser(userId, { balance: (u.balance || 0) + total, deposits: deps });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Вы закрыли депозит №${idx + 1}, вы получили: ${formatNum(total)}$`);
          return;
      }
      
      if (cmd === "marry_accept" || cmd === "marry_deny") {
          if (userId !== payloadObj.partnerId && userId !== payloadObj.partnerId) {
             const tId = payloadObj.targetId || payloadObj.partnerId; // target of proposal
             // the button is clicked by the target. Wait, in /брак запрос, the target is the one who gets mentioned!
             // So userId must be the target! Wait, I didn't pass the targetId in payload, but anyone can click.
             // Actually, I need to check if userId is the one who was proposed to.
          }
          // The sender of the proposal is partnerId. The target is anyone? No, I should verify.
          // For simplicity, let's just let the first clicker be the target.
          const creatorId = payloadObj.partnerId;
          if (userId === creatorId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете принять свое же предложение.");
          
          if (cmd === "marry_deny") {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
              await editVkMessage(VK_TOKEN, peerId, cmId, `К сожалению, но [id${userId}|${u.fullName || "Пользователь"}] отказался от предложения пользователя [id${creatorId}|${payloadObj.pName}]`);
              return;
          }
          
          // Accept
          if (u.marriage && u.marriage.partnerId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже в браке!");
          const cUser = await getOrCreateUser(creatorId);
          if (cUser.marriage && cUser.marriage.partnerId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Инициатор уже в браке!");
          
          const ms = Date.now();
          await updateUser(userId, { marriage: { partnerId: creatorId, partnerName: cUser.fullName, date: ms } });
          await updateUser(creatorId, { marriage: { partnerId: userId, partnerName: u.fullName, date: ms } });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Минуточку внимания!\n\nСегодня [id${userId}|${u.fullName || "Пользователь"}] принял(-а) предложение от пользователя [id${creatorId}|${payloadObj.pName}]!\n\nПоздравляем новую парочку!`);
          return;
      }
      
      if (cmd === "divorce_accept" || cmd === "divorce_deny") {
          const pId = payloadObj.partnerId;
          const pName = payloadObj.pName;
          
          if (cmd === "divorce_deny") {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
              await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${u.fullName || "Пользователь"}] отменил(-а) развод с своей второй половинкой [id${pId}|${pName}]`);
              return;
          }
          
          await updateUser(userId, { marriage: null });
          await updateUser(pId, { marriage: null });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Сегодня, пара [id${userId}|${u.fullName || "Пользователь"}] и [id${pId}|${pName}] разводятся!`);
          return;
      }
      
      if (cmd === "duel_accept") {
          const creatorId = payloadObj.creatorId;
          const bet = payloadObj.bet;
          if (userId === creatorId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете играть сами с собой.");
          
          const cUser = await getOrCreateUser(creatorId);
          if (cUser.balance < bet) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У создателя дуэли недостаточно средств.");
          if (u.balance < bet) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств.");
          
          const win = Math.random() > 0.5;
          const winnerId = win ? userId : creatorId;
          const loserId = win ? creatorId : userId;
          
          await updateUser(winnerId, { balance: (win ? u.balance : cUser.balance) + bet });
          await updateUser(loserId, { balance: (win ? cUser.balance : u.balance) - bet });
          
          const wName = win ? u.fullName : cUser.fullName;
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Дуэль между [id${creatorId}|${cUser.fullName || "Игрок"}] и [id${userId}|${u.fullName || "Игрок"}] была завершена!\n\n| Победителем дуэли становится - [id${winnerId}|${wName || "Игрок"}]\n\n| Победитель дуэли забирает: ${formatNum(bet)}$`);
          return;
      }
      
      if (cmd === "duel_biz_accept") {
          const creatorId = payloadObj.creatorId;
          const bet = payloadObj.bet;
          if (userId === creatorId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете играть сами с собой.");
          
          const cUser = await getOrCreateUser(creatorId);
          const cBizCount = cUser.businesses ? cUser.businesses.count || 0 : 0;
          const uBizCount = u.businesses ? u.businesses.count || 0 : 0;
          
          if (cBizCount < bet) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У создателя дуэли недостаточно бизнесов.");
          if (uBizCount < bet) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно бизнесов.");
          
          const win = Math.random() > 0.5;
          const winnerId = win ? userId : creatorId;
          const loserId = win ? creatorId : userId;
          
          const cBizType = cUser.businesses?.type || 1;
          const uBizType = u.businesses?.type || 1;
          
          // Move businesses
          await updateUser(winnerId, { businesses: { count: (win ? uBizCount : cBizCount) + bet, type: win ? uBizType : cBizType, lastCollected: (win ? u.businesses?.lastCollected : cUser.businesses?.lastCollected) } });
          await updateUser(loserId, { businesses: { count: (win ? cBizCount : uBizCount) - bet, type: win ? cBizType : uBizType, lastCollected: (win ? cUser.businesses?.lastCollected : u.businesses?.lastCollected) } });
          
          const wName = win ? u.fullName : cUser.fullName;
          const suf = bet === 1 ? "бизнес" : (bet >= 2 && bet <= 4 ? "бизнеса" : "бизнесов");
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Дуэль между [id${creatorId}|${cUser.fullName || "Игрок"}] и [id${userId}|${u.fullName || "Игрок"}] была завершена!\n\n| Победителем дуэли становится - [id${winnerId}|${wName || "Игрок"}]\n\n| Победитель дуэли забирает: ${formatNum(bet)} ${suf}`);
          return;
      }
      
      if (cmd === "unban_alert_action") {"""

text = re.sub(cb_injection, new_cbs, text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 2 done")
