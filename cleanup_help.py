
import re

with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Remove from knownCmds and help strings
content = content.replace('\"addmoder\", ', '')
content = content.replace('\"addsenmoder\", ', '')
content = content.replace('\"addadmin\", ', '')
content = content.replace('\"addsenadmin\", ', '')
content = content.replace('\"addzsa\", ', '')
content = content.replace('\"addsa\", ', '')
content = content.replace('\"removerole\", ', '')
content = content.replace('\"addzsr\", ', '')
content = content.replace('\"addozsr\", ', '')
content = content.replace('\"addruk\", ', '')
content = content.replace('\"addzamowner\", ', '')

# Remove from help text
content = content.replace('/addmoder - Выдать уровень прав модератора.\\n', '')
content = content.replace('/removerole - Снять права у пользователя.\\n', '')

# Remove from another help text (if any)
content = re.sub(r'/addmoder.*?\\n', '', content)
content = re.sub(r'/removerole.*?\\n', '', content)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
