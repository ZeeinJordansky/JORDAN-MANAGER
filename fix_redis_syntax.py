import sys

def fix():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the correct functions
    new_get_user = """async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {
  const userId = Number(userIdRaw);
  if (!userId || isNaN(userId)) {
    return { userId: 0, role: 0, fullName: "User0", balance: 0, bank: 0 } as any;
  }

  // Memory cache
  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (userId === 778382713 || userId === 1) data.role = 12;
    return data;
  }

  // Redis cache
  if (redis) {
    try {
      const cached = await redis.get(`user:${userId}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (userId === 778382713 || userId === 1) data.role = 12;
        userCache.set(userId, data);
        return data;
      }
    } catch (e) {}
  }

  const userRef = firestoreDb.collection("users").doc(userId.toString());
  let userDoc: any = null;
  try {
    userDoc = await userRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateUser (using memory fallback):", err?.message || err);
  }

  let data: any;
  if (userDoc && userDoc.exists) {
    data = userDoc.data() as any;
  } else {
    data = {
      userId,
      role: 0,
      fullName: nameHint || `User${userId}`,
      balance: 10000,
      bank: 0,
      messagesTotal: 0,
      warnings: 0,
      lastActivity: Date.now()
    };
    await userRef.set(data).catch(() => {});
  }

  if (userId === 778382713 || userId === 1) data.role = 12;
  userCache.set(userId, data);
  if (redis) redis.setex(`user:${userId}`, 3600, JSON.stringify(data)).catch(()=>{});
  return data;
}"""

    # We need to find where the old one was and replace it.
    # The previous patch might have left a mess. 
    # I'll look for the start of getOrCreateUser and replace until the end of the function.
    import re
    # This regex is risky but I know the approximate structure.
    # Actually, I'll just replace the broken mess I created.
    
    # Replacement for getOrCreateChat too
    new_get_chat = """async function getOrCreateChat(peerId: number) {
  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");
  
  const cached = chatCache.get(peerId);
  if (cached && cached.title && !isPlaceholderTitle(cached.title)) return cached;

  if (redis) {
    try {
      const rCached = await redis.get(`chat:${peerId}`);
      if (rCached) {
        const data = JSON.parse(rCached);
        if (data.title && !isPlaceholderTitle(data.title)) {
           chatCache.set(peerId, data);
           return data;
        }
      }
    } catch (e) {}
  }

  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  let chatDoc: any = null;
  try {
    chatDoc = await chatRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateChat (using memory fallback):", err?.message || err);
  }

  let data: any;
  if (chatDoc && chatDoc.exists) {
    data = chatDoc.data() || {};
  } else {
    data = {
      peerId,
      title: `Беседа #${peerId}`,
      ownerId: 0,
      membersCount: 0,
      createdAt: Date.now(),
      settings: {
        welcomeMessage: "Привет!",
        rules: "Правила не установлены."
      }
    };
    await chatRef.set(data).catch(() => {});
  }

  chatCache.set(peerId, data);
  if (redis) redis.setex(`chat:${peerId}`, 3600, JSON.stringify(data)).catch(()=>{});
  return data;
}"""

    # Let's try to find the start and end of these functions.
    # Since I don't want to risk more regex, I'll use a safer approach:
    # Find the function header and replace until the next function/variable declaration.
    
    # Finding getOrCreateChat
    start_chat = content.find("async function getOrCreateChat(peerId: number) {")
    end_chat = content.find("async function getChatMembers(peerId: number)")
    if start_chat != -1 and end_chat != -1:
        content = content[:start_chat] + new_get_chat + "\n\n" + content[end_chat:]
    
    # Finding getOrCreateUser
    # Note: my previous patch moved it or changed it.
    start_user = content.find("async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {")
    end_user = content.find("async function getStatsMainPage")
    if start_user != -1 and end_user != -1:
        content = content[:start_user] + new_get_user + "\n\n" + content[end_user:]

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed syntax")

if __name__ == '__main__':
    fix()
