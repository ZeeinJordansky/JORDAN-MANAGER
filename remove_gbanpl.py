import re

with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i in range(len(lines)):
    line = lines[i]
    if skip:
        if 'if (rawCmd === "/gban" || rawCmd === "/гбан") {' in line or 'if (rawCmd === "/ungban" || rawCmd === "/юнгбан"' in line or 'if (rawCmd === "/aban" || rawCmd === "/абан") {' in line:
            skip = False
        else:
            continue
            
    # Remove gbanpl handlers
    if line.strip().startswith('if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {'):
        skip = True
        continue
    if line.strip().startswith('if (rawCmd === "/ungbanpl" || rawCmd === "/gungbanp"'):
        skip = True
        continue
        
    # Replace in code
    line = re.sub(r'\s*gbanpl:\s*true,?', '', line)
    line = re.sub(r'\s*gbanplReason:\s*[^,]+,?', '', line)
    line = re.sub(r'\s*gbanplBy:\s*[^,]+,?', '', line)
    line = re.sub(r'\s*gbanplDate:\s*[^,]+,?', '', line)
    line = re.sub(r'\s*gbanplExpiresAt:\s*[^,]+,?', '', line)
    line = re.sub(r'\s*\|\|\s*targetUser\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*u\.gbanpl', '', line)
    line = re.sub(r'\s*\|\|\s*user\.gbanpl', '', line)
    
    # Specific removals in stats, logs, help
    if "gbanplText" in line or "| Информация о глобальной блокировке в беседах игроков:" in line or "gbanplCount" in line or "gbanplList" in line or "Всего глобальных блокировок во всех беседах игроков" in line:
        continue
        
    if "mod_ungbanpl" in line:
        line = re.sub(r'"mod_ungbanpl"\s*,\s*', '', line)
        line = re.sub(r'cmd === "mod_ungbanpl"\s*\|\|\s*', '', line)
        if 'if (cmd === "mod_ungbanpl") {' in line:
            skip = True
            continue

    if "gbanpl" in line.lower() and "actionType" not in line and "GBANPL" not in line and "Команды Зам. Руководителя" not in line:
         if 'if (user.gbanpl && chatData.type === "PL") {' in line or 'if (uData.gbanpl && chatData.type === "PL") {' in line:
             skip = True
             continue

    # Fix help
    if 'text = `...::Помощь по командам руководства::' in line:
        line = re.sub(r'\\n/gbanpl[^\\]+\\n', '\\n', line)
        line = re.sub(r'\\n/ungbanpl[^\\]+\\n', '\\n', line)

    new_lines.append(line)

with open('server.ts.tmp', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
