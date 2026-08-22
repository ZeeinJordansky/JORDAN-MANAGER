import sys
import re

with open('server.ts', 'r') as f:
    lines = f.readlines()

stack = []
for i in range(7251, 14801):
    line = lines[i]
    # super basic comment removal
    line = re.sub(r'//.*', '', line)
    line = re.sub(r'".*?"', '', line) # remove strings
    line = re.sub(r'\`.*?\`', '', line) # remove template literals (might fail on multiline, but good enough)
    line = re.sub(r"'.*?'", '', line) # remove single quotes
    
    for c in line:
        if c == '{':
            stack.append(i + 1)
        elif c == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra }} at line {i+1}")

print(f"Number of unclosed braces: {len(stack)}")
for l in stack:
    print(f"Line {l}: {lines[l-1].strip()}")
