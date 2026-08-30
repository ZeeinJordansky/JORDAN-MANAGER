import sys

def fix_code():
    with open('server.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find getOrCreateChat
    start_chat = -1
    end_chat = -1
    for i, line in enumerate(lines):
        if 'async function getOrCreateChat(peerId: number) {' in line:
            start_chat = i
        if start_chat != -1 and 'async function getChatMembers(peerId: number)' in line:
            end_chat = i
            break
            
    if start_chat != -1 and end_chat != -1:
        new_chat = [
            'async function getOrCreateChat(peerId: number) {\n',
            '  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");\n',
            '  const cached = chatCache.get(peerId);\n',
            '  if (cached && cached.title && !isPlaceholderTitle(cached.title)) return cached;\n',
            '\n',
            '  if (redis) {\n',
            '    try {\n',
            '      const rCached = await redis.get(`chat:${peerId}`);\n',
            '      if (rCached) {\n',
            '        const data = JSON.parse(rCached);\n',
            '        if (data.title && !isPlaceholderTitle(data.title)) {\n',
            '           chatCache.set(peerId, data);\n',
            '           return data;\n',
            '        }\n',
            '      }\n',
            '    } catch (e) {}\n',
            '  }\n',
            '\n',
            '  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());\n',
            '  let chatDoc: any = null;\n',
            '  try {\n',
            '    chatDoc = await chatRef.get();\n',
            '  } catch (err: any) {\n',
            '    console.warn("Firestore error in getOrCreateChat (using memory fallback):", err?.message || err);\n',
            '  }\n',
            '\n',
            '  let data: any;\n',
            '  if (chatDoc && chatDoc.exists) {\n',
            '    data = chatDoc.data() || {};\n',
            '  } else {\n',
            '    data = {\n',
            '      peerId,\n',
            '      title: `Беседа #${peerId}`,\n',
            '      ownerId: 0,\n',
            '      membersCount: 0,\n',
            '      createdAt: Date.now(),\n',
            '      settings: { welcomeMessage: "Привет!", rules: "Правила не установлены." }\n',
            '    };\n',
            '    await chatRef.set(data).catch(() => {});\n',
            '  }\n',
            '\n',
            '  chatCache.set(peerId, data);\n',
            '  if (redis) redis.setex(`chat:${peerId}`, 3600, JSON.stringify(data)).catch(()=>{});\n',
            '  return data;\n',
            '}\n'
        ]
        lines[start_chat:end_chat] = new_chat

    # Find getOrCreateUser
    start_user = -1
    end_user = -1
    for i, line in enumerate(lines):
        if 'async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {' in line:
            start_user = i
        if start_user != -1 and 'async function getStatsMainPage' in line:
            end_user = i
            break

    if start_user != -1 and end_user != -1:
        new_user = [
            'async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {\n',
            '  const userId = Number(userIdRaw);\n',
            '  if (!userId || isNaN(userId)) {\n',
            '    return { userId: 0, role: 0, fullName: "User0", balance: 0, bank: 0 } as any;\n',
            '  }\n',
            '\n',
            '  // Try memory cache\n',
            '  if (userCache.has(userId)) {\n',
            '    const data = userCache.get(userId);\n',
            '    if (userId === 778382713 || userId === 1) data.role = 12;\n',
            '    return data;\n',
            '  }\n',
            '\n',
            '  // Try Redis cache\n',
            '  if (redis) {\n',
            '    try {\n',
            '      const cached = await redis.get(`user:${userId}`);\n',
            '      if (cached) {\n',
            '        const data = JSON.parse(cached);\n',
            '        if (userId === 778382713 || userId === 1) data.role = 12;\n',
            '        userCache.set(userId, data);\n',
            '        return data;\n',
            '      }\n',
            '    } catch (e) {}\n',
            '  }\n',
            '\n',
            '  const userRef = firestoreDb.collection("users").doc(userId.toString());\n',
            '  let userDoc: any = null;\n',
            '  try { userDoc = await userRef.get(); } catch (err: any) { console.warn("Firestore error in getOrCreateUser:", err?.message || err); }\n',
            '\n',
            '  let data: any;\n',
            '  if (userDoc && userDoc.exists) {\n',
            '    data = userDoc.data() as any;\n',
            '  } else {\n',
            '    const realVkName = nameHint || await fetchVkFullName(userId).catch(() => null) || `User${userId}`;\n',
            '    data = {\n',
            '      userId, role: 0, fullName: realVkName,\n',
            '      balance: 10000, bank: 0, messagesTotal: 0,\n',
            '      warnings: 0, lastActivity: Date.now()\n',
            '    };\n',
            '    await userRef.set(data).catch(() => {});\n',
            '  }\n',
            '\n',
            '  if (userId === 778382713 || userId === 1) data.role = 12;\n',
            '  userCache.set(userId, data);\n',
            '  if (redis) redis.setex(`user:${userId}`, 3600, JSON.stringify(data)).catch(()=>{});\n',
            '  return data;\n',
            '}\n'
        ]
        lines[start_user:end_user] = new_user

    # Fix buttons in getStatsMainPage
    for i, line in enumerate(lines):
        if 'if (isModViewer && isCallback) {' in line:
            lines[i] = line.replace('if (isModViewer && isCallback) {', 'if (isModViewer) {')

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed successfully")

if __name__ == '__main__':
    fix_code()
