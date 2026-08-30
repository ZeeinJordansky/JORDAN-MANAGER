with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("}\n      } else if ([\"/ping\", \"/пинг\"].includes(rawCmd)) {", "} else if ([\"/ping\", \"/пинг\"].includes(rawCmd)) {")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)
print("Brace fixed")
