import re

def aggressive_clean():
    with open("server.ts", "r", encoding="utf-8") as f:
        content = f.read()

    # Replace literal \n that are preceded by common statement enders or followed by common statement starters
    # but NOT part of an escaped sequence inside a string (though it's hard to tell perfectly).
    
    # 1. Statements starters
    starters = ["const", "let", "var", "if", "for", "while", "return", "await", "async", "try", "catch", "export", "function", "class", "switch", "case", "default"]
    for s in starters:
        content = content.replace(f"\\n{s} ", f"\n{s} ")
        content = content.replace(f"\\n{s}(", f"\n{s}(")
    
    # 2. Block/Statement enders
    content = content.replace(";\\n", ";\n")
    content = content.replace("}\\n", "}\n")
    content = content.replace("{\\n", "{\n")
    content = content.replace(",\\n", ",\n")
    content = content.replace("]\\n", "]\n")
    content = content.replace(")\\n", ")\n")

    # 3. Double \n mangles
    content = content.replace("\\n\\n", "\n\n")

    # 4. Specific ones seen in errors
    content = content.replace("];\\n", "];\n")
    content = content.replace("();\\n", "();\n")

    with open("server.ts", "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    aggressive_clean()
 aggression_count = 0
 while aggression_count < 5:
    aggressive_clean()
    aggression_count += 1
