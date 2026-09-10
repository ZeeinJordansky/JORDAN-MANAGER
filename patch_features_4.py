import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

injection_point = r"\} else if \(\[\"/wake\", \"/wakeup\""

new_cmds = """} else if (["/топ"].includes(rawCmd)) {
          const type = args[1];
          let txt = "...:: Топ ::...\\n";
          if (type === "браки") {
              const all = Array.from(userCache.values()).filter(u => u.marriage && u.marriage.partnerId).sort((a, b) => a.marriage.date - b.marriage.date).slice(0, 10);
              all.forEach((u, i) => {
                  const days = Math.floor((Date.now() - u.marriage.date) / (24 * 3600 * 1000));
                  txt += `${i+1}. [id${u.userId}|${u.fullName || "Игрок"}] и [id${u.marriage.partnerId}|${u.marriage.partnerName || "Игрок"}] - ${days} дней\\n`;
              });
          } else if (type === "кланы") {
              const all = Array.from(clanCache.values()).sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, 10);
              all.forEach((c, i) => {
                  txt += `${i+1}. Клану "${c.name}" - ${c.wins || 0} побед\\n`;
              });
          } else {
              const all = Array.from(userCache.values()).sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 10);
              all.forEach((u, i) => {
                  txt += `${i+1}. [id${u.userId}|${u.fullName || "Игрок"}] - ${formatNum(u.balance || 0)}$\\n`;
              });
          }
          
          const kb = { inline: true, buttons: [
              [{ action: { type: "text", label: "/топ браки" }, color: "primary" }],
              [{ action: { type: "text", label: "/топ кланы" }, color: "primary" }]
          ]};
          return await sendResponse(txt, { keyboard: JSON.stringify(kb) });
          
      } else if (["/правила", "/правилабота"].includes(rawCmd)) {
          return await sendResponse("Правила бота находятся тут - [vk.ru/@gm_manager_official-pravila-bota|Правила]");
          
      } else if (["/клан"].includes(rawCmd)) {
          const sub = args[1];
          const userClanId = user.clanId;
          
          if (!sub) {
              if (!userClanId) return await sendResponse("Вы не состоите в клане!");
              const c = clanCache.get(userClanId);
              if (!c) return await sendResponse("Клан не найден.");
              
              const power = (c.soldiers || 0) + (c.helis || 0) * 10 + (c.tanks || 0) * 50;
              let txt = `Информация о клане, в котором вы состоите\\n\\n| Название клана: ${c.name}\\n| Тип клана: ${c.type || "Открытый"}\\n\\n| Участников: ${c.members ? c.members.length : 1}\\n| Лидер клана: [id${c.leaderId}|${c.leaderName || "Игрок"}]\\n`;
              
              if (c.zams && c.zams.length) {
                  c.zams.forEach((z:any) => txt += `| Зам. Лидера: [id${z.id}|${z.name || "Игрок"}]\\n`);
              }
              if (c.pom && c.pom.length) {
                  c.pom.forEach((z:any) => txt += `| Помощник зам. лидера: [id${z.id}|${z.name || "Игрок"}]\\n`);
              }
              
              txt += `\\n| Денег в казне: ${formatNum(c.balance || 0)}$\\n| Общая сила клана: ${formatNum(power)}\\n`;
              const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Список всех участников чата", payload: JSON.stringify({ cmd: "clan_members", clanId: userClanId }) }, color: "secondary" }]] };
              
              return await sendResponse(txt, { keyboard: JSON.stringify(kb) });
          }
          
          if (sub === "создать") {
              if (userClanId) return await sendResponse("Вы уже в клане!");
              const name = args.slice(2).join(" ");
              if (!name) return await sendResponse("Укажите название.");
              if (user.balance < 1000000) return await sendResponse("Недостаточно средств (Нужно 1.000.000$).");
              
              const newClanId = "clan_" + Date.now();
              const cData = { id: newClanId, name, leaderId: userId, leaderName: fullName, members: [userId], balance: 0, type: "Открытый" };
              await updateClan(newClanId, cData);
              await updateUser(userId, { balance: user.balance - 1000000, clanId: newClanId, clanRole: "leader" });
              return await sendResponse(`Вы создали клан ${name}, поздравляем!`);
          }
          
          if (!userClanId) return await sendResponse("Вы не состоите в клане!");
          const c = clanCache.get(userClanId);
          if (!c) return await sendResponse("Ваш клан не найден.");
          
          if (sub === "пригласить") {
              const parsed = await parseTargetUser(message, args.slice(2));
              if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
              const tUser = await getOrCreateUser(parsed.targetId);
              if (tUser.clanId) return await sendResponse("Пользователь уже в клане.");
              
              const kb = { inline: true, buttons: [
                  [{ action: { type: "callback", label: "Присоединиться", payload: JSON.stringify({ cmd: "clan_join_accept", clanId: userClanId }) }, color: "positive" }],
                  [{ action: { type: "callback", label: "Отказаться", payload: JSON.stringify({ cmd: "clan_join_deny", clanId: userClanId }) }, color: "negative" }]
              ]};
              if (parsed.targetId > 0 && parsed.targetId < 2000000000) {
                  sendVkMessage(VK_TOKEN, parsed.targetId, `[id${userId}|${fullName}] хочет пригласить вас в клан!`, { keyboard: JSON.stringify(kb) }).catch(()=>{});
              }
              return await sendResponse(`Вы отправили предложение вступить в клан пользователю [id${parsed.targetId}|${tUser.fullName || "Пользователю"}]`);
          }
          
          if (sub === "кикнуть") {
              if (user.clanRole !== "leader" && user.clanRole !== "zam") return await sendResponse("Нет прав.");
              const parsed = await parseTargetUser(message, args.slice(2));
              if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
              const tUser = await getOrCreateUser(parsed.targetId);
              if (tUser.clanId !== userClanId) return await sendResponse("Пользователь не в вашем клане.");
              if (parsed.targetId === c.leaderId) return await sendResponse("Нельзя кикнуть лидера.");
              
              c.members = c.members.filter((m:any) => m !== parsed.targetId);
              await updateClan(userClanId, { members: c.members });
              await updateUser(parsed.targetId, { clanId: null, clanRole: null });
              
              if (parsed.targetId > 0 && parsed.targetId < 2000000000) {
                  sendVkMessage(VK_TOKEN, parsed.targetId, `Вы были кикнуты из клана ${c.name}\\n| Причина: Исключен лидером/замом\\n| Вас кикнул: [id${userId}|${fullName}]`).catch(()=>{});
              }
              return await sendResponse(`Вы исключили пользователя [id${parsed.targetId}|${tUser.fullName || "Пользователю"}] из клана`);
          }
          
          if (sub === "казна") {
              const sum = parseNumber(args[2]);
              if (isNaN(sum) || sum <= 0) return await sendResponse("Неверная сумма.");
              if (user.balance < sum) return await sendResponse("Недостаточно средств.");
              
              await updateClan(userClanId, { balance: (c.balance || 0) + sum });
              await updateUser(userId, { balance: user.balance - sum });
              
              c.members.forEach((m:any) => {
                  if (m > 0 && m < 2000000000 && m !== userId) {
                      sendVkMessage(VK_TOKEN, m, `[id${userId}|${fullName}] вложил(-а) ${formatNum(sum)}$ в казну клана`).catch(()=>{});
                  }
              });
              return await sendResponse(`Вы вложили ${formatNum(sum)}$ в казну клана`);
          }
          
          if (sub === "вывод") {
              if (user.clanRole !== "leader") return await sendResponse("Только лидер может выводить средства.");
              const sum = parseNumber(args[2]);
              if (isNaN(sum) || sum <= 0) return await sendResponse("Неверная сумма.");
              if ((c.balance || 0) < sum) return await sendResponse("В казне недостаточно средств.");
              
              await updateClan(userClanId, { balance: c.balance - sum });
              await updateUser(userId, { balance: user.balance + sum });
              
              c.members.forEach((m:any) => {
                  if (m > 0 && m < 2000000000 && m !== userId) {
                      sendVkMessage(VK_TOKEN, m, `[id${userId}|${fullName}] вывел ${formatNum(sum)}$ с казны клана`).catch(()=>{});
                  }
              });
              return await sendResponse(`Вы вывели ${formatNum(sum)}$ с казны клана`);
          }
          
          if (sub === "сила") {
              return await sendResponse(`Сила клана ${c.name}\\n\\n| Солдатов: ${formatNum(c.soldiers || 0)}\\n| Вертолётов: ${formatNum(c.helis || 0)}\\n| Танки: ${formatNum(c.tanks || 0)}`);
          }
          
          if (sub === "состав") {
              let txt = `Состав клана ${c.name}\\n\\n`;
              for (const m of (c.members || [])) {
                  const u = await getOrCreateUser(m);
                  txt += `[id${m}|${u.fullName || "Игрок"}] | Должность: ${u.clanRole === "leader" ? "Лидер" : u.clanRole === "zam" ? "Зам." : "Участник"}\\n`;
              }
              return await sendResponse(txt);
          }
          
          if (sub === "выйти") {
              if (user.clanRole === "leader") return await sendResponse("Лидер не может выйти из клана, только передать его.");
              c.members = c.members.filter((m:any) => m !== userId);
              await updateClan(userClanId, { members: c.members });
              await updateUser(userId, { clanId: null, clanRole: null });
              return await sendResponse(`Вы вышли из клана ${c.name}`);
          }
          
      } else if (["/wake", "/wakeup\""""

text = re.sub(injection_point, new_cmds, text)

# Add callback for clan join
cb_injection = r"if \(cmd === \"unban_alert_action\"\) \{"
new_cbs = """if (cmd === "clan_join_accept" || cmd === "clan_join_deny") {
          const clanId = payloadObj.clanId;
          const c = clanCache.get(clanId);
          if (cmd === "clan_join_deny") {
              await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
              await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отказались присоединяться к клану ${c ? c.name : ""}`);
              return;
          }
          
          if (u.clanId) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже в клане.");
          if (!c) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Клан не найден.");
          
          c.members = c.members || [];
          c.members.push(userId);
          await updateClan(clanId, { members: c.members });
          await updateUser(userId, { clanId: clanId, clanRole: "member" });
          
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Вы присоедились к клану ${c.name}`);
          return;
      }
      if (cmd === "unban_alert_action") {"""

text = re.sub(cb_injection, new_cbs, text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 4 done")
