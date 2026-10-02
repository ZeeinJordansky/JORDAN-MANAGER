import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Let's inspect where message text is handled in server.ts
pos = text.find('if (type === "message_new")')
if pos != -1:
    msg_block = text[pos:pos+150000]
    print("Found message_new block of length:", len(msg_block))
    
    # Find all regex or string matches for commands
    # e.g., if (lower.startsWith("..."))
    lines = msg_block.splitlines()
    found = []
    for line in lines:
        if any(k in line for k in ["startsWith", "===", "hear", "cmd", "lowerText", "cleanText", "command"]):
            found.append(line.strip())
            
    print(f"Total interesting lines in message_new block: {len(found)}")
    for l in found[:60]:
        print(l[:110])

# Also check for regexes in server.ts that look like command patterns /^[!/]([a-zа-я]+)/i
regex_cmds = re.findall(r"/(\^?[!/][a-zA-Zа-яА-ЯёЁ0-9_|]+)/", text)
print("Regex commands found:", set(regex_cmds[:40]))
