import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

olist_new = r'''
      if (rawCmd === "/olist" || rawCmd === "/онлайн" || rawCmd === "/online") {
         if (peerId < 2000000000) return;
         const { profiles } = await getChatMembers(peerId);
         const list = profiles.filter((p: any) => p.online);
         if (list.length === 0) return await sendResponse("Никого нет в сети.");
         let msg = "Список пользователей которые в сети:\n\n";
         for (const p of list) {
             let device = "Неизвестно";
             if (p.online_info && p.online_info.app_id) device = "Мобильное приложение";
             else if (p.online_mobile) device = "Мобильное устройство";
             else device = "ПК";
             msg += `[id${p.id}|${p.first_name} ${p.last_name}] - ${device}\n`;
         }
         return await sendResponse(msg, { disable_mentions: 1 });
      }

      if (rawCmd === "/offlinelist" || rawCmd === "/оффлайн" || rawCmd === "/offline") {
         if (peerId < 2000000000) return;
         const { profiles } = await getChatMembers(peerId);
         const list = profiles.filter((p: any) => !p.online && p.id > 0);
         if (list.length === 0) return await sendResponse("Все в сети.");
         let msg = "Список пользователей которые не в сети:\n\n";
         const now = Math.floor(Date.now() / 1000);
         for (const p of list) {
             let diff = p.last_seen && p.last_seen.time ? now - p.last_seen.time : 0;
             let timeStr = "Неизвестно";
             if (diff > 0) {
                 const d = Math.floor(diff / 86400);
                 diff %= 86400;
                 const h = Math.floor(diff / 3600);
                 diff %= 3600;
                 const m = Math.floor(diff / 60);
                 const s = diff % 60;
                 timeStr = "";
                 if (d > 0) timeStr += `${d} д. `;
                 if (h > 0) timeStr += `${h} ч. `;
                 if (m > 0) timeStr += `${m} мин. `;
                 if (s > 0) timeStr += `${s} сек. `;
                 timeStr += "назад";
             }
             msg += `[id${p.id}|${p.first_name} ${p.last_name}] - Был в сети: ${timeStr}\n`;
         }
         if (msg.length > 4000) msg = msg.substring(0, 4000) + "...";
         return await sendResponse(msg, { disable_mentions: 1 });
      }
'''

code = re.sub(r'if \(rawCmd === "/olist" .*?return await sendResponse\(msg, \{ disable_mentions: 1 \}\);\n\s*\}', olist_new.strip(), code, flags=re.DOTALL)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)
print("Olist done")
