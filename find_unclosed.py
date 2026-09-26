with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Let's do a proper tokenizer that handles strings, regex, and comments
i = 0
n = len(text)
stack = []
lines = text.split("\n")

def get_pos(offset):
    l = text.count("\n", 0, offset) + 1
    last_nl = text.rfind("\n", 0, offset)
    col = offset - last_nl if last_nl != -1 else offset + 1
    return l, col

while i < n:
    c = text[i]
    if c == "/" and i + 1 < n and text[i+1] == "/":
        i += 2
        while i < n and text[i] != "\n":
            i += 1
        continue
    if c == "/" and i + 1 < n and text[i+1] == "*":
        i += 2
        while i + 1 < n and not (text[i] == "*" and text[i+1] == "/"):
            i += 1
        i += 2
        continue
    if c in ("\"", "'"):
        q = c
        i += 1
        while i < n and text[i] != q:
            if text[i] == "\\":
                i += 2
                continue
            i += 1
        i += 1
        continue
    if c == "`":
        # template string
        i += 1
        while i < n and text[i] != "`":
            if text[i] == "\\":
                i += 2
                continue
            if text[i] == "$" and i + 1 < n and text[i+1] == "{":
                stack.append((i, "`${"))
                i += 2
                continue
            i += 1
        i += 1
        continue
    if c == "{":
        stack.append((i, "{"))
        i += 1
        continue
    if c == "}":
        if stack:
            top = stack.pop()
            # check if top was `${` and matching `}`
        else:
            l, col = get_pos(i)
            print(f"Extra closing }} at Line {l}:{col}")
        i += 1
        continue
    # regex heuristic
    if c == "/" and i + 1 < n and text[i+1] not in ("/", "*", " ", "\n", "\t"):
        # could be regex if preceded by punctuation
        prev_idx = i - 1
        while prev_idx >= 0 and text[prev_idx] in (" ", "\t", "\n"):
            prev_idx -= 1
        if prev_idx >= 0 and text[prev_idx] in ("(", "=", ":", ",", "[", "!", "&", "|", "?", ";", "return", "case"):
            i += 1
            while i < n and text[i] != "/":
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == "\n":
                    break
                i += 1
            i += 1
            continue
    i += 1

print("Unclosed braces count:", len(stack))
for offset, kind in stack:
    l, col = get_pos(offset)
    snippet = text[offset:min(n, offset+80)].replace("\n", " ")
    print(f"Unclosed {kind} at Line {l}:{col} -> {snippet}")
