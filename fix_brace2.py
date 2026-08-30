with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 8957 and "return await sendResponse(outMsg" in line:
        # The line after it should be the closing brace
        pass
    new_lines.append(line)
    if "return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: true });" in line:
        new_lines.append("           }\n")

with open("server.ts", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
