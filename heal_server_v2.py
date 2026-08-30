import sys

def extract_block(pattern, lines):
    start = -1
    balance = 0
    found_start = False
    for i, line in enumerate(lines):
        if pattern in line:
            start = i
            balance += line.count('{')
            balance -= line.count('}')
            found_start = True
            if found_start and balance == 0: return lines[start:start+1]
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

    blocks_to_restore = [
        'interface ChatNetwork {',
        'const formatDurationBanTerm =',
        'const checkFlood =',
        'const processSliv =',
        'const networkCache ='
    ]
    
    restored_code = []
    for pattern in blocks_to_restore:
        code = extract_block(pattern, backup_lines)
        if code:
            restored_code.extend(code)
            restored_code.append('\n')
        else:
            print(f"Could not find {pattern} in backup")

    # Insert restored code after userCache/chatCache area (around 1450)
    for i, line in enumerate(current_lines):
        if 'const chatCache =' in line:
            current_lines[i+1:i+1] = restored_code
            break

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.writelines(current_lines)
    print("Healed successfully")

if __name__ == '__main__':
    heal()
