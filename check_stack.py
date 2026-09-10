with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            stack.append(i + 1)
        elif char == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra closing brace at line {i+1}")

print(f"Final stack: {stack}")
