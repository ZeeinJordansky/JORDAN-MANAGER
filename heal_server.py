import sys

def extract_function(name, lines):
    start = -1
    balance = 0
    found_start = False
    for i, line in enumerate(lines):
        if f'function {name}' in line:
            start = i
            # count braces in the first line
            balance += line.count('{')
            balance -= line.count('}')
            found_start = True
            if balance == 0: return lines[start:start+1]
            continue
        if found_start:
            balance += line.count('{')
            balance -= line.count('}')
            if balance == 0:
                return lines[start:i+1]
    return []

def heal():
    with open('server.ts.clean', 'r', encoding='utf-8', errors='ignore') as f:
        backup_lines = f.readlines()
    
    with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
        current_lines = f.readlines()

    missing_funcs = [
        'updateChat', 'deleteChatNetwork', 'getChatNetwork', 'saveChatNetwork',
        'formatDurationBanTerm', 'checkFlood', 'containsTagAll', 'processSliv',
        'findChatNetworkByPeerId', 'startTechReports'
    ]
    
    restored_code = []
    for func in missing_funcs:
        code = extract_function(func, backup_lines)
        if code:
            restored_code.extend(code)
            restored_code.append('\n')
        else:
            print(f"Could not find {func} in backup")

    # Also restore caches
    caches = [
        'const chatMembersCache =', 'const adminCache =', 'const lastPickedInChat =',
        'const chatRecentMessages =', 'const buttonCooldowns =', 'const waitingForWelcome =',
        'const commandHistory =', 'const pingFloodCache =', 'const containsTagAll ='
    ]
    restored_caches = []
    for cache in caches:
        for line in backup_lines:
            if line.startswith(cache):
                restored_caches.append(line)
                break
    
    # Insert restored code after getOrCreateUser (line 1834)
    current_lines[1835:1835] = restored_code
    
    # Insert restored caches after chatCache (around 1450)
    for i, line in enumerate(current_lines):
        if 'const chatCache =' in line:
            current_lines[i+1:i+1] = restored_caches
            break

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.writelines(current_lines)
    print("Healed successfully")

if __name__ == '__main__':
    heal()
