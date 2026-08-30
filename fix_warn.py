with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i >= 8954 and i <= 8964:
        # these are the duplicated lines 8955 - 8965
        continue
    new_lines.append(line)

with open("server.ts", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
