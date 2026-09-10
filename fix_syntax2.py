with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("      }\n      } else if ([\"/передать\", \"/pay\", \"/transfer\"].includes(rawCmd)) {", "      } else if ([\"/передать\", \"/pay\", \"/transfer\"].includes(rawCmd)) {")
text = text.replace("      }\n      } else if ([\"/топ\"].includes(rawCmd)) {", "      } else if ([\"/топ\"].includes(rawCmd)) {")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)
