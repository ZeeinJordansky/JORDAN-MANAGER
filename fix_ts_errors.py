with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix rawCmd usage before declaration (around line 8093)
# Let's inspect where rawCmd is used vs declared in processMessageNew
rawcmd_decl = "      const args = cmdText.split(/\\s+/);\n      const rawCmd = args[0].toLowerCase();"

# Replace return res.json({ response: 1 }); with answerVkEvent in callback handlers
code = code.replace("return res.json({ response: 1 });", "await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;")

# Fix mod_unblack block
mod_unblack_old = """      if (cmd === "mod_unblack") {
          const cUser = await getOrCreateUser(userId);
          const userChatRole = (cUser.chatRoles && cUser.chatRoles[peerId]) || 0;
          const effRole = cUser.role >= 12 || userId === 778382713 ? 12 : Math.max(cUser.role || 0, userChatRole);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          
          await updateUser(targetId, {
             blacklisted: false,
             blackReason: "",
             blackBy: 0,
             blackDate: 0,
             blackExpiresAt: 0
          });
          const adminName = cUser.fullName || cUser.nick || "Модератор";
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|Пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор, который снял чёрный список - [id${userId}|${adminName}]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
      }"""

mod_unblack_new = """      if (cmd === "mod_unblack") {
          const targetId = payloadObj.targetId || payloadObj.tId || (typeof tId !== "undefined" ? tId : 0);
          const cUser = await getOrCreateUser(userId);
          const userChatRole = (cUser.chatRoles && cUser.chatRoles[peerId]) || 0;
          const effRole = cUser.role >= 12 || userId === 778382713 ? 12 : Math.max(cUser.role || 0, userChatRole);
          if (effRole < 8) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
          
          await updateUser(targetId, {
             blacklisted: false,
             blackReason: "",
             blackBy: 0,
             blackDate: 0,
             blackExpiresAt: 0
          });
          const adminName = cUser.fullName || cUser.nick || "Модератор";
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Чёрный список снят." });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|Пользователю] был снят чёрный список чат-менеджера.\\n\\n| Модератор, который снял чёрный список - [id${userId}|${adminName}]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
      }"""

code = code.replace(mod_unblack_old, mod_unblack_new)

# Fix z_approve and z_deny targetId
z_approve_old = """      if (cmd === "z_approve") {
         const tUser = await getOrCreateUser(targetId);"""
z_approve_new = """      if (cmd === "z_approve") {
         const targetId = payloadObj.targetId || payloadObj.tId;
         const tUser = await getOrCreateUser(targetId);"""

z_deny_old = """      if (cmd === "z_deny") {
         const tUser = await getOrCreateUser(targetId);"""
z_deny_new = """      if (cmd === "z_deny") {
         const targetId = payloadObj.targetId || payloadObj.tId;
         const tUser = await getOrCreateUser(targetId);"""

code = code.replace(z_approve_old, z_approve_new)
code = code.replace(z_deny_old, z_deny_new)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

