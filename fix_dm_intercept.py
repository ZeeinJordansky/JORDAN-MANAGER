with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove the misplaced block from line 9363
misplaced_start = 'if (peerId < 2000000000 && zrApplicationStateMap.has(userId) && !rawCmd.startsWith("/")) {'
misplaced_end = 'if (peerId < 2000000000) {'

idx_start = code.find(misplaced_start)
idx_end = code.find(misplaced_end, idx_start)

if idx_start != -1 and idx_end != -1:
    block_to_move = code[idx_start:idx_end].replace('sendVkMessageLocal', 'sendVkMessage')
    code = code[:idx_start] + code[idx_end:]

    # Place block_to_move right after const rawCmd = args[0].toLowerCase();
    target_place = 'const rawCmd = args[0].toLowerCase();'
    idx_target = code.find(target_place)
    if idx_target != -1:
        insert_pos = idx_target + len(target_place)
        code = code[:insert_pos] + '\n\n      ' + block_to_move.strip() + '\n' + code[insert_pos:]
        print('Successfully moved DM intercept block to after rawCmd definition!')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)
