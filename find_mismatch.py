with open("server.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    line_idx = i + 1
    # Very basic: just count '{' and '}' on each line and keep track of types if we can.
    # To be precise, we need a lexer. Let's just use typescript to get AST.
