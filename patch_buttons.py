import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. WARN
warn_repl = r'''
           const targetU = await getOrCreateUser(parsed.targetId);
           const targetName = targetU.fullName || targetU.nick || `User${parsed.targetId}`;
           const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
           const kbButtons: any[] = [
             [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick", targetId: parsed.targetId }) }, color: "primary" }]
           ];
           if (isReply) {
             kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
           }
           const outMsg = `[id${parsed.targetId}|Пользователю] выдано предупреждение ${newWarns}/3 по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]`;
           return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: true });
'''
code = re.sub(r'const outMsg = `\[id\$\{parsed\.targetId\}\|Пользователю\] выдано предупреждение.*?\n\s*return await sendResponse\(outMsg, \{ noReply: true \}\);', warn_repl.strip(), code, flags=re.DOTALL)


# 2. BAN
ban_repl = r'''
           const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
           const kbButtons: any[] = [
             [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }]
           ];
           if (isReply) {
             kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
           }
           const outMsg = `[id${parsed.targetId}|Пользователю] выдана блокировка скором на ${durationStr} по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка до: ${expDate}`;
           return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: true });
'''
code = re.sub(r'const outMsg = `\[id\$\{parsed\.targetId\}\|Пользователю\] выдана блокировка скором на.*?\n\s*return await sendResponse\(outMsg, \{ noReply: true \}\);', ban_repl.strip(), code, flags=re.DOTALL)


# 3. GBAN
gban_repl = r'''
           const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
           const kbButtons: any[] = [
             [{ action: { type: "callback", label: "Снять глобальную блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: parsed.targetId }) }, color: "positive" }]
           ];
           if (isReply) {
             kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
           }
           const outMsg = `[id${parsed.targetId}|Пользователю] выдана глобальная блокировка во всех беседах по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка до: ${expDate}`;
           return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: true });
'''
# We must find the return in GBAN
code = re.sub(r'return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{targetName\}\] заблокирован\(-а\) во всех беседах.*?\n\s*\| Блокировка до: \$\{expDate\}`,\s*\{ noReply: true \}\);', gban_repl.strip(), code, flags=re.DOTALL)


# 4. ADDBLACK
black_repl = r'''
           const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
           const kbButtons: any[] = [
             [{ action: { type: "callback", label: "Снять чёрный список", payload: JSON.stringify({ cmd: "mod_unblack", targetId: parsed.targetId }) }, color: "positive" }]
           ];
           if (isReply) {
             kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
           }
           const outMsg = `[id${parsed.targetId}|${targetName}] занесён в чёрный список чат-менеджера по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка до: ${expDate}`;
           return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: true });
'''
code = re.sub(r'return await sendResponse\(`\[id\$\{parsed\.targetId\}\|\$\{targetName\}\] занесён в чёрный список чат-менеджера по причине: \$\{reason\}.*?\n\s*\| Блокировка до: \$\{expDate\}`,\s*\{ noReply: true \}\);', black_repl.strip(), code, flags=re.DOTALL)


with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Buttons patched")
