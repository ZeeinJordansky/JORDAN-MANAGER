
import re

def replace_block(content, start_marker, new_code):
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print(f"Marker not found: {start_marker[:50]}...")
        return content
    
    brace_count = 0
    found_start = False
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            found_start = True
        elif content[i] == '}':
            brace_count -= 1
            if found_start and brace_count == 0:
                end_idx = i + 1
                print(f"Replaced block starting with: {start_marker[:50]}...")
                return content[:start_idx] + new_code + content[end_idx:]
    return content

with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

new_gban = r'''      if (rawCmd === "/gban" || rawCmd === "/гбан") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
          });
          await sendBanAlert(peerId, parsed.targetId, "gban", reason, Date.now(), expiresAt);
          return;
       }'''

new_gbanpl = r'''      if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          await updateUser(parsed.targetId, {
            gbanpl: true,
            gbanplReason: reason,
            gbanplBy: userId,
            gbanplDate: Date.now(),
            gbanplExpiresAt: expiresAt
          });
          await sendBanAlert(peerId, parsed.targetId, "gbanpl", reason, Date.now(), expiresAt);
          return;
       }'''

new_ban = r'''      if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
         if (effRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна Старшему модератору.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
                  const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
         await updateUser(parsed.targetId, { chatBans });
         try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
         } catch (e) {}
         await sendBanAlert(peerId, parsed.targetId, "ban", reason, Date.now(), expiresAt);
         return;
      }'''

content = replace_block(content, 'if (rawCmd === "/gban" || rawCmd === "/гбан")', new_gban)
content = replace_block(content, 'if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл")', new_gbanpl)
content = replace_block(content, 'if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd))', new_ban)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
