with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("      }\n      } else if ([\"/взлом\"].includes(rawCmd) && isGame) {", "      } else if ([\"/взлом\"].includes(rawCmd) && isGame) {")
text = text.replace("      } else if ([\"/wake\", \"/wakeup\"].includes(rawCmd)) {", "} else if ([\"/wake\", \"/wakeup\"].includes(rawCmd)) {")
text = text.replace("      } else if ([\"/мафия\", \"/mafia\"].includes(rawCmd) && isGame) {", "} else if ([\"/мафия\", \"/mafia\"].includes(rawCmd) && isGame) {")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)
