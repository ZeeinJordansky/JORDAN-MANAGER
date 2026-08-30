import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

lines = code.split('\n')
try_stack = []

for i, line in enumerate(lines):
    if re.search(r'\btry\s*\{', line):
        try_stack.append(i + 1)
    if re.search(r'\}\s*catch', line):
        if len(try_stack) > 0:
            try_stack.pop()
        else:
            print(f"Orphan catch at {i + 1}: {line.strip()}")

print("Unclosed trys:", try_stack)
