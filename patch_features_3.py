import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Inject commands before /wake
injection_point = r"\} else if \(\[\"/wake\", \"/wakeup\""

new_cmds = """} else if (["/передать", "/pay", "/transfer"].includes(rawCmd)) {
          if (args.length < 2) return await sendResponse("Укажите сумму перевода.");
          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (parsed.targetId === userId) return await sendResponse("Нельзя перевести деньги самому себе.");
          
          const sum = parseNumber(args[1]);
          if (isNaN(sum) || sum <= 0) return await sendResponse("Укажите корректную сумму.");
          if (user.balance < sum) return await sendResponse("Недостаточно средств на балансе.");
          
          const nowDay = Math.floor(Date.now() / (24 * 3600 * 1000));
          const limit = user.premium ? 350000 : 100000;
          let todayTransfers = user.transfersDay === nowDay ? (user.transfersAmount || 0) : 0;
          if (todayTransfers + sum > limit) {
              return await sendResponse(`Превышен дневной лимит перевода. (Лимит: ${formatNum(limit)}$ в день. Уже переведено: ${formatNum(todayTransfers)}$)`);
          }
          
          const tUser = await getOrCreateUser(parsed.targetId);
          const tName = tUser.fullName || "Пользователю";
          
          const kb = { inline: true, buttons: [
              [{ action: { type: "callback", label: "Передать", payload: JSON.stringify({ cmd: "transfer_accept", targetId: parsed.targetId, sum }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Не передавать", payload: JSON.stringify({ cmd: "transfer_deny", targetId: parsed.targetId }) }, color: "negative" }]
          ]};
          
          return await sendResponse(`Вы собираетесь передать ${formatNum(sum)}$ пользователю [id${parsed.targetId}|${tName}]\n\n| Для подтверждения нажмите на кнопку:`, { keyboard: JSON.stringify(kb) });
          
      } else if (["/бизнесы"].includes(rawCmd)) {
          const bizList = [
              "1) Шиномонтажка | Цена: 250.000$ | Прибыль в час: 500$",
              "2) Ларёк-кафе | Цена: 500.000$ | Прибыль в час: 1.000$",
              "3) Парикмахерская | Цена: 750.000$ | Прибыль в час: 1.500$",
              "4) Кафе | Цена: 1.000.000$ | Прибыль в час: 1.850$",
              "5) Ресторан быстрого питания | Цена: 1.250.000$ | Прибыль в час: 2.050$",
              "6) Сеть магазинов | Цена: 1.800.000$ | Прибыль в час: 3.000$",
              "7) IT кампания | Цена: 5.000.000$ | Прибыль в час: 5.000$",
              "8) Банк | Цена: 12.000.000$ | Прибыль в час: 7.000$",
              "9) Ювелирный магазин | Цена: 25.000.000$ | Прибыль в час: 12.000$",
              "10) Казино | Цена: 50.000.000$ | Прибыль в час: 20.000$"
          ];
          return await sendResponse("Список всех бизнесов в боте:\n\n" + bizList.join("\n"));
          
      } else if (["/бизнес", "/business"].includes(rawCmd)) {
          const bData = user.businesses || { count: 0, type: 1, lastCollected: Date.now(), extendedUntil: Date.now() + 5 * 3600 * 1000, uncollected: 0 };
          const count = bData.count || 0;
          if (count === 0) return await sendResponse(`У вас нет бизнесов. Используйте /бизнесы для списка.`);
          
          const profits = [500, 1000, 1500, 1850, 2050, 3000, 5000, 7000, 12000, 20000];
          const profitPerHour = count * (profits[(bData.type || 1) - 1] || 500);
          
          let extendedUntil = bData.extendedUntil || Date.now();
          const nowMs = Date.now();
          let leftMs = extendedUntil - nowMs;
          if (leftMs < 0) leftMs = 0;
          
          const hrs = Math.floor(leftMs / 3600000);
          const mins = Math.floor((leftMs % 3600000) / 60000);
          
          const uncollected = (bData.uncollected || 0); // we should calculate this, but let's just do it on collect or refresh
          const lastCol = bData.lastCollected || nowMs;
          let newUncol = uncollected;
          if (lastCol < extendedUntil) {
              const activeMs = Math.min(nowMs, extendedUntil) - lastCol;
              const activeHrs = activeMs / 3600000;
              newUncol += Math.floor(activeHrs * profitPerHour);
          }
          await updateUser(userId, { businesses: { ...bData, uncollected: newUncol, lastCollected: Math.min(nowMs, extendedUntil) } });
          
          const kb = { inline: true, buttons: [] };
          if (newUncol > 0) {
              kb.buttons.push([{ action: { type: "callback", label: "Снять деньги с баланса бизнесов", payload: JSON.stringify({ cmd: "biz_collect" }) }, color: "positive" }]);
          }
          if (leftMs <= 0) {
              kb.buttons.push([{ action: { type: "callback", label: "Продлить работу бизнесов", payload: JSON.stringify({ cmd: "biz_extend" }) }, color: "negative" }]);
          }
          kb.buttons.push([{ action: { type: "callback", label: "Список всех ваших бизнесов", payload: JSON.stringify({ cmd: "biz_list" }) }, color: "secondary" }]);
          
          const txt = `Статистика бизнесов [id${userId}|${fullName}]\n\n| Кол-во бизнесов: ${count}\n| Прибыль с бизнесов за 1 час: ${formatNum(profitPerHour)}$\n\n| До конца работы бизнесов: ${hrs} часов ${mins} минут\n\n| Общий баланс бизнесов: ${formatNum(newUncol)}$`;
          return await sendResponse(txt, { keyboard: JSON.stringify(kb) });
          
      } else if (["/купитьбиз"].includes(rawCmd)) {
          if (args.length < 3) return await sendResponse("Используйте: /купитьбиз [Тип 1-10] [Количество]");
          const type = parseInt(args[1]);
          const count = parseNumber(args[2]);
          if (type < 1 || type > 10 || isNaN(type)) return await sendResponse("Неверный тип бизнеса (от 1 до 10).");
          if (count <= 0 || isNaN(count)) return await sendResponse("Неверное количество.");
          
          const prices = [250000, 500000, 750000, 1000000, 1250000, 1800000, 5000000, 12000000, 25000000, 50000000];
          const price = prices[type - 1] * count;
          if (user.balance < price) return await sendResponse(`Недостаточно средств. Нужно: ${formatNum(price)}$`);
          
          const bData = user.businesses || { count: 0, type: type, uncollected: 0, extendedUntil: Date.now() + 5 * 3600 * 1000, lastCollected: Date.now() };
          if (bData.count > 0 && bData.type !== type) return await sendResponse(`У вас уже есть бизнесы другого типа (Тип ${bData.type}). Вы можете покупать бизнесы только одного типа.`);
          
          bData.count = (bData.count || 0) + count;
          bData.type = type;
          
          await updateUser(userId, { balance: user.balance - price, businesses: bData });
          return await sendResponse(`Вы успешно приобрели ${count} бизнесов (Тип ${type}) за ${formatNum(price)}$!`);
          
      } else if (["/продатьбиз"].includes(rawCmd)) {
          if (args.length < 2) return await sendResponse("Укажите количество для продажи.");
          const count = parseNumber(args[1]);
          const bData = user.businesses || { count: 0 };
          if (bData.count < count || count <= 0 || isNaN(count)) return await sendResponse("У вас нет столько бизнесов.");
          
          const prices = [250000, 500000, 750000, 1000000, 1250000, 1800000, 5000000, 12000000, 25000000, 50000000];
          const returnSum = Math.floor((prices[bData.type - 1] || 0) * count * 0.5);
          
          bData.count -= count;
          if (bData.count === 0) bData.uncollected = 0;
          
          await updateUser(userId, { balance: user.balance + returnSum, businesses: bData });
          return await sendResponse(`Вы успешно продали ${count} бизнесов и получили ${formatNum(returnSum)}$ (50% стоимости).`);
          
      } else if (["/вики", "/wiki", "/википедия"].includes(rawCmd)) {
          const query = args.slice(1).join(" ");
          if (!query) return await sendResponse("Введите запрос для поиска.");
          try {
              const res = await axios.get(`https://ru.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&titles=${encodeURIComponent(query)}`);
              const pages = res.data.query.pages;
              const pageId = Object.keys(pages)[0];
              if (pageId === "-1") return await sendResponse("В Википедии ничего не найдено по этому запросу.");
              let extract = pages[pageId].extract;
              if (extract.length > 500) extract = extract.slice(0, 500) + "...";
              return await sendResponse(`📚 Википедия: ${pages[pageId].title}\n\n${extract}`);
          } catch(e) {
              return await sendResponse("Ошибка при обращении к Википедии.");
          }
      }
      } else if (["/wake", "/wakeup\""""

text = re.sub(injection_point, new_cmds, text)

# Inject callbacks for transfer and businesses
cb_injection = r"if \(cmd === \"unban_alert_action\"\) \{"

new_cbs = """if (cmd === "transfer_accept" || cmd === "transfer_deny") {
          const tId = payloadObj.targetId;
          const tUser = await getOrCreateUser(tId);
          if (cmd === "transfer_deny") {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
              await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили перевод денег пользователю [id${tId}|${tUser.fullName || "Пользователь"}]`);
              return;
          }
          
          const sum = payloadObj.sum;
          if (u.balance < sum) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств!");
          
          const nowDay = Math.floor(Date.now() / (24 * 3600 * 1000));
          await updateUser(userId, { 
             balance: u.balance - sum,
             transfersDay: nowDay,
             transfersAmount: (u.transfersDay === nowDay ? (u.transfersAmount || 0) : 0) + sum
          });
          await updateUser(tId, { balance: (tUser.balance || 0) + sum });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Вы передали ${formatNum(sum)}$ пользователю [id${tId}|${tUser.fullName || "Пользователь"}]`);
          
          if (tId > 0 && tId < 2000000000) {
              sendVkMessage(VK_TOKEN, tId, `[id${userId}|${u.fullName || "Пользователь"}] передал(-а) вам ${formatNum(sum)}$`).catch(()=>{});
          }
          return;
      }
      
      if (cmd === "biz_collect") {
          const bData = u.businesses;
          if (!bData || !bData.uncollected || bData.uncollected <= 0) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас нет денег на балансе бизнесов!");
          
          const sum = bData.uncollected;
          bData.uncollected = 0;
          bData.lastCollected = Date.now(); // reset collection time
          await updateUser(userId, { balance: (u.balance || 0) + sum, businesses: bData });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${u.fullName || "Пользователь"}] снял(-а) деньги с баланса бизнесов\nСумма: ${formatNum(sum)}$`);
          return;
      }
      
      if (cmd === "biz_extend") {
          const bData = u.businesses;
          if (!bData || !bData.count) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас нет бизнесов.");
          const extended = bData.extendedUntil || Date.now();
          if (extended > Date.now()) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бизнесы еще работают.");
          
          bData.extendedUntil = Date.now() + 5 * 3600 * 1000; // extend by 5 hours
          bData.lastCollected = Date.now();
          
          await updateUser(userId, { businesses: bData });
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${u.fullName || "Пользователь"}] продлил(-а) работу бизнесов на 5 часов`);
          return;
      }
      
      if (cmd === "biz_list") {
          const bData = u.businesses;
          if (!bData || !bData.count) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас нет бизнесов.");
          
          const names = ["Шиномонтажка", "Ларёк-кафе", "Парикмахерская", "Кафе", "Ресторан быстрого питания", "Сеть магазинов", "IT кампания", "Банк", "Ювелирный магазин", "Казино"];
          const typeName = names[(bData.type || 1) - 1] || "Бизнес";
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Список бизнесов пользователя [id${userId}|${u.fullName || "Пользователь"}]\n\n${typeName} | Кол-во: ${formatNum(bData.count)}`);
          return;
      }
      
      if (cmd === "unban_alert_action") {"""

text = re.sub(cb_injection, new_cbs, text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 3 done")
