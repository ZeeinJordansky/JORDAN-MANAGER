with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i >= 7415 and i <= 7425:
        print(f"{i+1}: {line}", end="")
