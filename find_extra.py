import sys
import re

with open('server.ts', 'r') as f:
    lines = f.readlines()

depth = 0
for i in range(7463, 7720):
    line = lines[i]
    line = re.sub(r'//.*', '', line)
    line = re.sub(r'".*?"', '', line) 
    line = re.sub(r'\`.*?\`', '', line) 
    line = re.sub(r"'.*?'", '', line)
    
    for c in line:
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
    print(f"Line {i+1} depth {depth}")

