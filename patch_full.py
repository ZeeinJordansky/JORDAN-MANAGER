import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Fix /mute output
code = re.sub(
    r'const outMsg = `\[id\$\{parsed\.targetId\}\|Пользователю\] выдана блокировка чата сроком на \$\{timeMin\} мин по причине: \$\{reason\}\\n\\n\| Модератор - \[id\$\{userId\}\|\$\{fullName\}\]\\n\| Блокировка чата выдана до: \$\{expDate\}`;',
    r'const outMsg = `[id${parsed.targetId}|Пользователю] выдана блокировка чата сроком на ${timeMin} мин по причине: ${reason}\\n\\n| Модератор - [id${userId}|${fullName}]\\n| Блокировка чата выдана до: ${expDate}`;',
    code
)

# Actually, the user wants `[Ссылка|Пользователю]` - we already have `[id${parsed.targetId}|Пользователю]`.
# We need to make sure PM/AM is correct in formatMskDateAmPm.

# Let's fix formatMskDateAmPm directly:
pmAmCode = """const formatMskDateAmPm = (timestamp: number) => {
  const d = new Date(timestamp + 3 * 3600 * 1000);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const secs = String(d.getUTCSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${day}.${month}.${year} ${hoursStr}:${mins}:${secs} ${ampm}`;
};"""
code = re.sub(r'const formatMskDateAmPm = \(timestamp: number\) => formatMskDate\(timestamp\);', pmAmCode, code)

# Let's fix bot invite message:
joinMsgOld = r'const msg = `\[id\$\{memberId\}\|\$\{memberName\}\] присоединился\(-ась\) к беседе\.`;'
joinBotOld = r'if \(memberId === botMemberId\) \{\n\s*return await sendVkMessage\(VK_TOKEN, peerId, "Всем привет! Я чат-менеджер JORDAN MANAGER\.\\nДля полноценной работы выдайте мне права администратора\."\);\n\s*\}'
joinBotNew = r'''if (memberId === botMemberId) {
            const botJoinMsg = "JORDAN MANAGER был добавлен в беседу.\n\nДля начала работы с чат-менеджером, выдайте ему права администратора.\nДалее активируйте беседу с помощью команды - /start или нажав на кнопку.";
            const botJoinKb = {
              inline: true,
              buttons: [
                [{ action: { type: "callback", label: "Активировать беседу", payload: JSON.stringify({ cmd: "start_chat" }) }, color: "positive" }]
              ]
            };
            return await sendVkMessage(VK_TOKEN, peerId, botJoinMsg, { keyboard: JSON.stringify(botJoinKb) });
          }'''
code = re.sub(r'if\s*\(memberId\s*===\s*botMemberId\)\s*\{\s*return await sendVkMessage\(VK_TOKEN,\s*peerId,\s*"Всем привет[^"]+"\);\s*\}', joinBotNew, code)

# Add start_chat callback
startChatCb = r'''if (cmd === "start_chat") {
          const cUser = await getOrCreateUser(userId);
          const adminName = cUser.fullName || cUser.nick || "Пользователь";
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${adminName}] активировал(-а) чат-менеджера в беседе.\n\nТеперь выберите тип беседы по команде - /type.\nТакже синхронизируйте беседу с помощью команды - /sync.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
      }'''
# Insert before "if (cmd === "kick_left_user")"
code = code.replace('if (cmd === "kick_left_user") {', startChatCb + '\n      if (cmd === "kick_left_user") {')

# Fix /giveowner confirmation logic
giveOwnerRegex = r'if \(\["/giveowner", "/передатьвладельца"\].includes\(rawCmd\)\) \{.*?\n\s*\}'
# We will inject the code for giveowner via node later.

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Stage 1 Python patch done")
