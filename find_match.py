with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            stack.append(i + 1)
        elif char == '}':
            if stack:
                start_line = stack.pop()
                if start_line == 8304:
                    print(f"Brace starting at 8304 ends at line {i+1}")
            else:
                pass
