import re

with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_gbanpl_block = False

for line in lines:
    # We are in a block that should be skipped completely
    if line.strip().startswith('if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {'):
        in_gbanpl_block = True
        continue
    if line.strip().startswith('if (rawCmd === "/ungbanpl" || rawCmd === "/gungbanp"'):
        in_gbanpl_block = True
        continue
    if line.strip().startswith('if (cmd === "mod_ungbanpl") {'):
        in_gbanpl_block = True
        continue
        
    if in_gbanpl_block:
        if line.strip() == '}':
            in_gbanpl_block = False
        continue

    # Remove inline assignments/references
    line = re.sub(r',\s*gbanpl:\s*true', '', line)
    line = re.sub(r',\s*gbanpl:\s*false', '', line)
    line = re.sub(r',\s*gbanplReason:\s*[^,}]+', '', line)
    line = re.sub(r',\s*gbanplBy:\s*[^,}]+', '', line)
    line = re.sub(r',\s*gbanplDate:\s*[^,}]+', '', line)
    line = re.sub(r',\s*gbanplExpiresAt:\s*[^,}]+', '', line)
    
    line = re.sub(r'\s*\|\|\s*targetUser\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*u\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*user\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*uData\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*tUser\.gbanpl', '', line)

    line = re.sub(r'"\/gbanpl"\s*,\s*', '', line)
    line = re.sub(r'"\/ungbanpl"\s*,\s*', '', line)
    line = re.sub(r'"gbanpl"\s*,\s*', '', line)
    line = re.sub(r'"ungbanpl"\s*,\s*', '', line)
    line = re.sub(r'"mod_ungbanpl"\s*,\s*', '', line)

    line = re.sub(r'cmd === "mod_ungbanpl"\s*\|\|\s*', '', line)

    # Some blocks we skip appending entirely via line match
    if "gbanplText =" in line:
        continue
    if "| Информация о глобальной блокировке в беседах игроков:" in line:
        continue
    if "${gbanplText}" in line:
        continue
    if "let gbanplCount =" in line:
        continue
    if "if (u.gbanpl) gbanplCount++;" in line:
        continue
    if "Всего глобальных блокировок во всех беседах игроков" in line:
        continue
    if "const gbanplList" in line:
        continue
    if "if (u.gbanpl) gbanplList.push" in line:
        continue
    if "if (gbanplList.length" in line:
        continue
    if "for (let i = 0; i < gbanplList.length" in line:
        continue
    if "const u = gbanplList[i]" in line:
        continue
    if "const mStr = await getModStr(u.gbanplBy)" in line:
        continue
    if "out += `${i + 1}) [id${u.userId}|${name}] | ${mStr} | ${u.gbanplReason" in line:
        continue
    
    if "text = `...::Помощь по командам руководства::...\\n\\nКоманды Зам. Руководителя:\\n/gban" in line:
        line = line.replace("\\n/gbanpl -- Выдать глобальную блокировку в беседах игроков.", "")
        line = line.replace("\\n/ungbanpl -- Снять глобальную блокировку игроков.", "")

    if "if (user.gbanpl && chatData.type === \"PL\") {" in line or "if (uData.gbanpl && chatData.type === \"PL\") {" in line:
        in_gbanpl_block = True
        continue
        
    if "} else if (actionType === \"gbanpl\") {" in line:
        in_gbanpl_block = True
        continue

    new_lines.append(line)

with open('server.ts.tmp2', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

