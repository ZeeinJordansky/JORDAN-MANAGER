import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

mgrBlock = """      const MANAGER_CMDS_SET = new Set([
        "/gban", "/гбан", "/ungban", "/юнгбан", "/унгбан", "/ангбан", "/гунгбан",
        "/gbanlist", "/гбанлист", "/списокгбан",
        "/blacklist", "/чслист", "/списокчс",
        "/rstats", "/рстата",
        "/grrole", "/гснятьроль",
        "/banid", "/банид", "/забанитьбеседу",
        "/unbanid", "/анбанид", "/разбанитьбеседу",
        "/infochat", "/инфочат", "/чатинфо", "/chatinfo",
        "/infoid", "/инфоид", "/ид", "/id", "/айди",
        "/addblack", "/чс", "/чсб", "/вчс", "/добавитьвчс", "/аддблэк",
        "/unblack", "/анблэк", "/анчс", "/изчс", "/удалитьизчс", "/унчсб",
        "/gsnick", "/гник", "/гсник",
        "/grnick", "/грудалитьник",
        "/zunban", "/зунбан",
        "/addzsr", "/замруководителя", "/заместитель",
        "/addozsr", "/оснзамруководителя", "/озаместитель",
        "/rebuke", "/выговор",
        "/unrebuke", "/снятьвыговор",
        "/addruk", "/руководитель",
        "/addgr", "/главныйруководитель", "/грук",
        "/renameroles", "/переименоватьроли", "/аудио",
        "/kickfrozen", "/frozenlist"
      ]);
      
      if (MANAGER_CMDS_SET.has(rawCmd) && !chatData.isManagerChat && peerId > 2000000000) {
          return await sendResponse("Данная команда доступна только в беседе руководства!");
      }"""

code = code.replace("if (user.gban || user.gbanpl) {", mgrBlock + "\n      if (user.gban || user.gbanpl) {")

# Add audio command
audioCmd = """
      if (rawCmd === "/аудио" || rawCmd === "/audio" || rawCmd === "/setaudio") {
         const isManagerOwner = userId === 778382713 || userId === 1; // Assuming 778382713 is the manager owner
         if (!isManagerOwner) {
             return await sendResponse("Данная команда доступна только владельцу чат-менеджера!");
         }
         let audioAttach = null;
         if (message.attachments) {
            audioAttach = message.attachments.find((a: any) => a.type === "audio");
         }
         if (!audioAttach && message.reply_message && message.reply_message.attachments) {
            audioAttach = message.reply_message.attachments.find((a: any) => a.type === "audio");
         }
         if (audioAttach) {
            const ownerIdStr = userId.toString();
            const uRef = firestoreDb.collection("users").doc(ownerIdStr);
            const audioData = `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`;
            await uRef.set({ profileAudio: audioData }, { merge: true }).catch(()=>{});
            return await sendResponse("Музыка успешно установлена в профиль и статистику!");
         } else {
            return await sendResponse("Пожалуйста, прикрепите аудиозапись к сообщению или ответьте на сообщение с аудиозаписью.");
         }
      }
"""
code = code.replace('if (["/stats", "/стата"', audioCmd + '\n      if (["/stats", "/стата"')

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Manager and audio done")
