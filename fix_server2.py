with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove line 8873 if it's an extra closing brace
if "return await sendResponse(outMsg" in lines[8871]:
    if lines[8872].strip() == "}":
        print(f"Removing line {8873}")
        del lines[8872]

with open("server.ts", "w", encoding="utf-8") as f:
    f.writelines(lines)
