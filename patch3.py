import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update kick_left_user response
code = re.sub(
    r'editVkMessage\(VK_TOKEN,\s*peerId,\s*cmId,\s*`\[id\$\{targetId\}\|\$\{targetName\}\] исключен\(-а\) из беседы`',
    r'editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|${targetName}] был исключён из беседы.\\n\\n| Модератор, который исключил - [id${userId}|${adminName}]`',
    code
)

# 2. Update remove_role_left_user response
code = re.sub(
    r'editVkMessage\(VK_TOKEN,\s*peerId,\s*cmId,\s*`у \[id\$\{targetId\}\|\$\{targetName\}\] снята роль`',
    r'editVkMessage(VK_TOKEN, peerId, cmId, `у [id${targetId}|пользователя] была снята роль.\\n\\n| Модератор, который снял роль - [id${userId}|${adminName}]`',
    code
)
# Note: in my previous thought I wrote it differently, let's just replace the exact text if it exists.
# We will use string.replace for safer multiline stuff if needed.

