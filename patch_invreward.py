import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Replace block starting with `if (["/наградаинв"` until the next `if (["/реакции"`
pattern = r"if \(\[\"/наградаинв\"[\s\S]*?\} else if \(\[\"/реакции\""
text = re.sub(pattern, "} else if ([\"/реакции\"", text)

# Also remove reward injection in chat_invite_user
# Search for reward distribution logic when user joins
pattern2 = r"if \(chatData\.invRewardMode(?:[\s\S]*?)\}(?=\s*// Защита от ботов)"
text = re.sub(pattern2, "", text)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Removed invite reward logic")
