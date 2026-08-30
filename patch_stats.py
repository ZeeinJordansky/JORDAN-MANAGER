import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

stats_new = r'''
      if (rawCmd === "/stats" || rawCmd === "/стата" || rawCmd === "/статистика" || rawCmd === "/профиль" || rawCmd === "/profile" || rawCmd === "/инфобот" || rawCmd === "/infobot") {
         const targetId = message.reply_message ? message.reply_message.from_id : (message.fwd_messages && message.fwd_messages.length > 0 ? message.fwd_messages[0].from_id : userId);
         const targetUser = await getOrCreateUser(targetId);
         const targetName = targetUser.fullName || targetUser.nick || "отсутствует";
         const roleName = targetUser.role ? ({ 14: "Владелец", 13: "Главный Администратор", 12: "Зам. Глав. Администратора", 11: "Старший Администратор", 10: "Администратор", 9: "Старший Модератор", 8: "Модератор" }[targetUser.role] || "Пользователь") : "Пользователь";
         
         const hasGban = (targetUser.gban || targetUser.gbanpl) ? "Да" : "Нет";
         const hasChatBans = (targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0) ? "Да" : "Нет";
         
         const warns = targetUser.warnings || 0;
         const hasWarns = warns > 0 ? "Да" : "Нет";
         const hasMute = (targetUser.muteUntil && targetUser.muteUntil > Date.now()) ? "Да" : "Нет";
         
         const currentMskStr = getMskDateStr();
         let todayMsgs = 0;
         if (peerId > 2000000000) {
             const chatTodayMap = targetUser.chatTodayMsgs || {};
             const chatLastDateMap = targetUser.chatLastMsgDateStr || {};
             if (chatTodayMap[peerId] && chatLastDateMap[peerId] === currentMskStr) {
                 todayMsgs = chatTodayMap[peerId];
             }
         } else {
             todayMsgs = targetUser.lastMsgDateStr === currentMskStr ? (targetUser.msgCountToday || targetUser.messagesToday || 0) : 0;
         }
         
         const totalMsgs = targetUser.messagesTotal || targetUser.msgCountTotal || 0;
         
         const rawAct = targetUser.lastActivity || targetUser.lastMessageAt * 1000 || 0;
         let lastAct = "отсутствует";
         if (rawAct > 0) {
             lastAct = formatMskDateAmPm(rawAct);
         }
         
         const statusLine = targetUser.customStatus ? `| Статус: ${targetUser.customStatus}\n` : "";
         
         const outMsg = `Статистика [id${targetId}|пользователя]\n\n| Nick_Name: ${targetUser.nick || "отсутствует"}\n| VK ID - ${targetId}\n\n| Должность: ${roleName}\n${statusLine}\n| Активная глобальная блокировка: ${hasGban}\n| Активные блокировки в беседах: ${hasChatBans}\n\n| Активные предупреждения в беседе: ${hasWarns}\n| Активная блокировка чата в беседе: ${hasMute}\n\n| Кол-во сообщений за сегодня: ${todayMsgs}\n| Кол-во сообщений за всё время: ${totalMsgs}\n| Последнее сообщение: ${lastAct}`;
         
         // If there's audio, attach it
         let extraOpts = { noReply: true };
         if (targetUser.profileAudio) {
             extraOpts["attachment"] = targetUser.profileAudio;
         }
         
         return await sendResponse(outMsg, extraOpts);
      }
'''

# Find the old stats logic
code = re.sub(r'if \(\["/stats", "/стата".*?\} else if \(\["/ping", "/пинг"\]', stats_new.strip() + '\n      } else if (["/ping", "/пинг"]', code, flags=re.DOTALL)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Stats patched")
