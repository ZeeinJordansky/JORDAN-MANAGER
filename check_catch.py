import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

lines = code.split('\n')
for i, line in enumerate(lines):
    if "}" in line and not "catch" in line and not "finally" in line:
        # We need to find if this } closes a try.
        pass

# Actually it's easier to just regex search the whole code for `try\s*\{[^\}]*\}\s*(?!catch|finally)`
# But it could be multiline.
matches = re.finditer(r'try\s*\{.*?\}(?!\s*catch|\s*finally)', code, re.DOTALL)
for m in matches:
    # Just print the start and end of the match
    s = m.start()
    # To avoid printing all, let's just count line numbers
    line_no = code.count('\n', 0, s) + 1
    print("Match at line", line_no)
