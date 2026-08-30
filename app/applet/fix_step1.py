import sys
import re

with open("server.ts", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# =========================================================================
# 1. FIX THE SYNTAX BREAKAGE AROUND LOGGER AND COMMANDS
# =========================================================================

# Let's inspect the logger block around /заявка and line 8555-8713
misplaced_pattern = re.compile(
    r'(\} else if \(\["/help", "/помощь", "/хелп", "/команды", "/меню", "/gamehelp"\]\.includes\(rawCmd\)\) \{\s*actionStr = "Посмотрел\(-а\) список команд";\s*\}) else \s*(if \(rawCmd === "/заявка"\) \{[\s\S]*?return await sendResponse\(`\[id\$\{parsed\.targetId\}\|Пользователю\] выдан уровень прав «\$\{roleName\}»\\n\\n\| Модератор, который выдал уровень прав - \[id\$\{userId\}\|\$\{fullName\}\]`, \{ noReply: true \}\);\s*\})\s*else if \(\["/stats"',
    re.MULTILINE
)

m = misplaced_pattern.search(text)
if m:
    print("Found misplaced commands in logger!")
    extracted_cmds = m.group(2)
    # We will replace in logger with proper actionStr assignments
    logger_clean = """} else if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/gamehelp"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список команд";
        } else if (["/заявка"].includes(rawCmd)) {
          actionStr = "Подал(-а) заявку";
        } else if (["/listfrozen"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список замороженных";
        } else if (["/kickfrozen"].includes(rawCmd)) {
          actionStr = "Исключил(-а) замороженных";
        } else if (["/alt", "/алиясы", "/альт"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) алиасы команд";
        } else if (["/addaccesslevel", "/роль", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/выдатьроль"].includes(rawCmd)) {
          actionStr = "Выдал(-а) уровень прав";
        } else if (["/stats" """
    
    text = text[:m.start()] + logger_clean + text[m.end() - len('else if (["/stats"'):]
    
    # Now place extracted_cmds right after the logger block ends (before if (["/mute"...]))
    mute_idx = text.find('if (["/mute", "/мут", "/m"].includes(rawCmd)) {')
    if mute_idx != -1:
        text = text[:mute_idx] + extracted_cmds + "\n\n       " + text[mute_idx:]
        print("Placed extracted commands before /mute!")
else:
    print("Pattern for misplaced commands not matched directly, checking alternative matching...")
    # Alternative matching if formatting differs
    target_snippet = '} else \n       if (rawCmd === "/заявка") {'
    if target_snippet not in text:
        target_snippet = '} else \n      if (rawCmd === "/заявка") {'
    if target_snippet not in text:
        # regex find
        match2 = re.search(r'\} else\s+if \(rawCmd === "/заявка"\)', text)
        if match2:
            print("Found with regex:", match2.group(0))

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Step 1 done.")
