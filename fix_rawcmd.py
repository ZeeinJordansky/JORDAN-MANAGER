with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "if (MANAGER_CMDS_SET.has(rawCmd)" in line:
        new_lines.append("      const args = cmdText.split(/\\s+/);\n")
        new_lines.append("      const rawCmd = args[0].toLowerCase();\n")
        new_lines.append(line)
    elif "const args = cmdText.split(/\\s+/);" in line and "const rawCmd =" in lines[lines.index(line)+1]:
        # skip here since moved up
        continue
    elif "const rawCmd = args[0].toLowerCase();" in line:
        continue
    else:
        new_lines.append(line)

with open("server.ts", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

