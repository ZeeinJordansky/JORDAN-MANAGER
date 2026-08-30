with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update getRole function to calculate max role properly
old_get_role = """async function getRole(peerId: number, userId: number) {
   if (userId === 1115715881 || userId === 778382713 || userId === 1) {
      const u = await getOrCreateUser(userId);
      if (u.roleDisabled) return 0;
      return 12;
   }
   const u = await getOrCreateUser(userId);
   if (u.roleDisabled) return 0;
   const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
   return Math.max(u.role || 0, chatRole);
}"""

new_get_role = """async function getRole(peerId: number, userId: number) {
   if (userId === 1115715881 || userId === 778382713 || userId === 1) {
      const u = await getOrCreateUser(userId);
      if (u.roleDisabled) return 0;
      return 12;
   }
   const u = await getOrCreateUser(userId);
   if (u.roleDisabled) return 0;
   const chatRoles = u.chatRoles || {};
   let maxChatRole = chatRoles[peerId] || 0;
   for (const r of Object.values(chatRoles)) {
      if (typeof r === "number" && r > maxChatRole) maxChatRole = r;
   }
   return Math.max(u.role || 0, maxChatRole);
}"""

code = code.replace(old_get_role, new_get_role)

# 2. Fix stray /stats block in actionStr mapping section (lines 8697-8756)
stray_stats_block = """ if (rawCmd === "/stats" || rawCmd === "/стата" || rawCmd === "/статистика" || rawCmd === "/профиль" || rawCmd === "/profile" || rawCmd === "/инфобот" || rawCmd === "/infobot") {
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
          
          const statusLine = targetUser.customStatus ? `| Статус: ${targetUser.customStatus}
` : "";
          
          const outMsg = `Статистика [id${targetId}|пользователя]
| Nick_Name: ${targetUser.nick || "отсутствует"}
| VK ID - ${targetId}
| Должность: ${roleName}
${statusLine}| Активная глобальная блокировка: ${hasGban}
| Активные блокировки в беседах: ${hasChatBans}
| Активные предупреждения в беседе: ${hasWarns}
| Активная блокировка чата в беседе: ${hasMute}
| Кол-во сообщений за сегодня: ${todayMsgs}
| Кол-во сообщений за всё время: ${totalMsgs}
| Последнее сообщение: ${lastAct}`;
          
          // If there me audio, attach it
          let extraOpts = { noReply: true };
          if (targetUser.profileAudio) {
              extraOpts["attachment"] = targetUser.profileAudio;
          }
          
          return await sendResponse(outMsg, extraOpts);
       } else"""

replacement_action_str = """      } else if (["/stats", "/стата", "/статистика", "/профиль", "/profile", "/инфобот", "/infobot"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) статистику";
       } else"""

if stray_stats_block in code:
    code = code.replace(stray_stats_block, replacement_action_str)
    print("Successfully replaced stray stats block")
else:
    print("Could not find exact stray stats block string, doing line search...")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

