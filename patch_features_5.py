import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

injection_point = r"\} else if \(\[\"/wake\", \"/wakeup\""

new_cmds = """} else if (["/мафия", "/mafia"].includes(rawCmd) && isGame) {
          const kb = { inline: true, buttons: [
              [{ action: { type: "callback", label: "Присоединиться", payload: JSON.stringify({ cmd: "mafia_proxy_join", creatorId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Отсоединиться", payload: JSON.stringify({ cmd: "mafia_proxy_leave", creatorId: userId }) }, color: "negative" }],
              [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "mafia_proxy_start", creatorId: userId }) }, color: "primary" }]
          ]};
          const txt = `Игра "Мафия"\n\n| Создатель - [id${userId}|${fullName}]\n\n| Участники игры -\n[id${userId}|${fullName}]`;
          return await sendResponse(txt, { keyboard: JSON.stringify(kb) });
      } else if (["/wake\", \"/wakeup\""""

text = re.sub(injection_point, new_cmds, text)

cb_injection = r"if \(cmd === \"unban_alert_action\"\) \{"
new_cbs = """if (cmd === "mafia_proxy_join" || cmd === "mafia_proxy_leave") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await sendVkMessage(VK_TOKEN, peerId, cmd === "mafia_proxy_join" ? `[id${userId}|${u.fullName || "Игрок"}] присоединился к мафии` : `[id${userId}|${u.fullName || "Игрок"}] отсоединился от мафии`);
          return;
      }
      if (cmd === "mafia_proxy_start") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${u.fullName || "Игрок"}] запускает игру мафия!\n\nИгра мафия была начата.\n\n| Участники игры:\n[id${userId}|${u.fullName || "Игрок"}]`);
          
          setTimeout(async () => {
              await sendVkMessage(VK_TOKEN, peerId, `Наступает ночь в городе\n\n| Доступные действия высланы в ЛС всем участникам.`);
              
              const pKb = { inline: true, buttons: [
                  [{ action: { type: "callback", label: "Убить Имя Фамилия", payload: JSON.stringify({ cmd: "mafia_proxy_act", t: "убить" }) }, color: "negative" }],
                  [{ action: { type: "callback", label: "Ничего не делать", payload: JSON.stringify({ cmd: "mafia_proxy_skip" }) }, color: "secondary" }]
              ]};
              if (userId > 0 && userId < 2000000000) {
                 sendVkMessage(VK_TOKEN, userId, `Игра мафия запущена. Ваша роль: Мафия\n\nНаступила ночь, время совершить действие`, { keyboard: JSON.stringify(pKb) }).catch(()=>{});
              }
              
          }, 3000);
          return;
      }
      if (cmd === "mafia_proxy_act") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Вы убили игрока Имя Фамилия`);
          setTimeout(() => {
              sendVkMessage(VK_TOKEN, peerId > 2000000000 ? peerId : userId, `Ночь прошла настало утро\n\n| Мафия попыталась убить участника, но доктор его возродил\n\n| Участники игры:\n[id${userId}|${u.fullName || "Игрок"}]`).catch(()=>{});
          }, 2000);
          return;
      }
      if (cmd === "mafia_proxy_skip") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Вы воздержались от убийства.`);
          setTimeout(() => {
              sendVkMessage(VK_TOKEN, peerId > 2000000000 ? peerId : userId, `Ночь прошла настало утро\n\n| Мафия попыталась убить участника, но доктор его возродил\n\n| Участники игры:\n[id${userId}|${u.fullName || "Игрок"}]`).catch(()=>{});
          }, 2000);
          return;
      }
      if (cmd === "unban_alert_action") {"""

text = re.sub(cb_injection, new_cbs, text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 5 done")
