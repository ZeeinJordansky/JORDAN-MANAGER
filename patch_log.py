import re

with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

start_idx = text.find("if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {")
if start_idx == -1:
    print("Not found start")
    exit(1)

end_idx = text.find("if (rawCmd === \"/заявка\") {", start_idx)
if end_idx == -1:
    print("Not found end")
    exit(1)

# Find the closing brace of the if block
end_idx = text.rfind("}", start_idx, end_idx) + 1

original_block = text[start_idx:end_idx]

# We will just replace `if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {`
# with `if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) { setTimeout(async () => { try {`
# and the closing `}` with `} catch(e) { console.error("Log error", e); } }, 500); }`

new_block = original_block.replace(
    "if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {",
    "if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {\n        setTimeout(async () => {\n          try {"
)

# Replace the last brace
new_block = new_block[:-1] + "} catch (e) { console.error(\"Async log error:\", e); }\n        }, 500);\n      }"

text = text[:start_idx] + new_block + text[end_idx:]

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch applied successfully")
