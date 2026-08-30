import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

cb_yes = r'''       if (cmd === "mod_giveowner_yes") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Права переданы." });
          const tUser1 = await getOrCreateUser(tId);
          const chatRoles1 = tUser1.chatRoles || {};
          chatRoles1[peerId] = 7;
          await updateUser(tId, { chatRoles: chatRoles1 });
          
          const tUser2 = await getOrCreateUser(userId);
          const chatRoles2 = tUser2.chatRoles || {};
          delete chatRoles2[peerId];
          await updateUser(userId, { chatRoles: chatRoles2 });
          
          const tName = tUser1.fullName || "Пользователю";
          const aName = tUser2.fullName || "Владелец";
          
          let chatName = "беседе";
          try {
             const cInfo = await getOrCreateChat(peerId);
             if (cInfo && cInfo.title) chatName = cInfo.title;
          } catch(e){}

          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${tId}|${tName}] становится новым владельцем беседы.\n\n| Бывший владелец беседы - [id${userId}|${aName}]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          try {
             await sendVkMessage(VK_TOKEN, tId, `Вам были передан уровень прав «Владелец Беседы» в беседе ${chatName} [id${userId}|пользователем]`);
          } catch (e) {}
          return;
       }'''

cb_no = r'''       if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Передача отменена." });
          const cUser = await getOrCreateUser(userId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Имя Фамилия"}] отменил(-а) передачу уровня прав «Владелец Беседы» [id${tId}|пользователю]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }'''

code = re.sub(r'if \(cmd === "mod_giveowner_yes"\) \{.*?return;\n\s*\}', cb_yes, code, flags=re.DOTALL)
code = re.sub(r'if \(cmd === "mod_giveowner_no"\) \{.*?return;\n\s*\}', cb_no, code, flags=re.DOTALL)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("giveowner patched")
