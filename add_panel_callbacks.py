import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

handler = """
    if (cmd === "p_revoke_attempt") {
      const { login, ip } = payloadObj;
      const failData = panelFailedLogins.get(ip);
      if (failData) {
        failData.lockUntil = Date.now() + 3 * 3600 * 1000;
        panelFailedLogins.set(ip, failData);
      }
      fastVkCall("messages.edit", {
         peer_id: peerId,
         conversation_message_id: cmId,
         message: `[id${userId}|Пользователь] завершил(-а) сессию (попытку) пользователя ${login}`
      });
      eventAnsweredMap.set(eventId, true);
      return await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
    }
    
    if (cmd === "p_revoke_session") {
      const { login, token } = payloadObj;
      panelSessions.delete(token);
      fastVkCall("messages.edit", {
         peer_id: peerId,
         conversation_message_id: cmId,
         message: `[id${userId}|Пользователь] завершил(-а) сессию пользователя ${login}`
      });
      eventAnsweredMap.set(eventId, true);
      return await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
    }

    if (cmd === "p_del_user_prompt") {
      const { login } = payloadObj;
      const keyboard = {
        inline: true,
        buttons: [
          [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_del_user_yes", login }), label: "Да, удалить" }, color: "positive" } ],
          [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_del_user_no", login }), label: "Нет, не удалять" }, color: "negative" } ]
        ]
      };
      
      fastVkCall("messages.edit", {
         peer_id: peerId,
         conversation_message_id: cmId,
         message: `[id${userId}|Пользователь], вы действительно хотите удалить пользователя ${login}?`,
         keyboard: JSON.stringify(keyboard)
      });
      eventAnsweredMap.set(eventId, true);
      return await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
    }

    if (cmd === "p_del_user_yes") {
      const { login } = payloadObj;
      if (login === PANEL_ROOT_LOGIN) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "Root нельзя удалить!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      await firestoreDb.collection("panel_users").doc(login).delete();
      fastVkCall("messages.edit", {
         peer_id: peerId,
         conversation_message_id: cmId,
         message: `[id${userId}|Пользователь] удалил пользователя ${login}`
      });
      eventAnsweredMap.set(eventId, true);
      return await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
    }

    if (cmd === "p_del_user_no") {
      fastVkCall("messages.edit", {
         peer_id: peerId,
         conversation_message_id: cmId,
         message: `[id${userId}|Пользователь] отменил удаление`
      });
      eventAnsweredMap.set(eventId, true);
      return await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
    }
"""

search_str = 'if (cmd === "botstats_tech"'
idx = code.find(search_str)
if idx != -1:
    new_code = code[:idx] + handler + '\n    ' + code[idx:]
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Added panel callback handlers")
else:
    print("Could not find search str")

