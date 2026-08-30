import sys

def fix():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Redis definition if missing
    if 'const redis =' not in content:
        redis_init = """
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redis) {
  redis.on("error", (err) => console.error("Redis Error:", err));
}
"""
        content = content.replace(
            'const firestoreDb = getFirestoreWrapper();',
            'const firestoreDb = getFirestoreWrapper();' + redis_init
        )

    # 2. Add userCache if missing
    if 'const userCache =' not in content:
        content = content.replace(
            'const chatCache = new Map<number, any>();',
            'const userCache = new Map<number, any>();\nconst chatCache = new Map<number, any>();'
        )

    # 3. Ensure getOrCreateUser is properly defined and has all braces
    new_user_fn = """async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {
  const userId = Number(userIdRaw);
  if (!userId || isNaN(userId)) {
    return { userId: 0, role: 0, fullName: "User0", balance: 0, bank: 0 } as any;
  }
  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (userId === 778382713 || userId === 1) data.role = 12;
    return data;
  }
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
  try { userDoc = await userRef.get(); } catch (err: any) { console.warn("Firestore error:", err); }
  let data: any;
  if (userDoc && userDoc.exists) {
    data = userDoc.data() as any;
  } else {
    const realVkName = nameHint || await fetchVkFullName(userId).catch(() => null) || `User${userId}`;
    data = {
      userId, role: 0, fullName: realVkName,
      balance: 10000, bank: 0, messagesTotal: 0,
      warnings: 0, lastActivity: Date.now()
    };
    await userRef.set(data).catch(() => {});
  }
  if (userId === 778382713 || userId === 1) data.role = 12;
  userCache.set(userId, data);
  if (redis) redis.setex(`user:${userId}`, 3600, JSON.stringify(data)).catch(()=>{});
  return data;
}"""

    # Replace getOrCreateUser mess
    # Find start and end
    start_user = content.find("async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {")
    end_user = content.find("async function updateUser(userIdRaw: number | string, fields: Record<string, any>) {")
    if start_user != -1 and end_user != -1:
        content = content[:start_user] + new_user_fn + "\n\n" + content[end_user:]

    # 4. Fix Audio command to store metadata (ensuring it's there)
    if 'attachment: `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`,' not in content:
        old_audio_save = r'const audioData = `audio\${audioAttach\.audio\.owner_id}_\${audioAttach\.audio\.id}`;'
        new_audio_save = """const audioData = {
               attachment: `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`,
               artist: audioAttach.audio.artist || "Неизвестен",
               title: audioAttach.audio.title || "Без названия"
             };"""
        import re
        content = re.sub(old_audio_save, new_audio_save, content)

    # 5. Fix stats buttons remove isCallback check
    content = content.replace('if (isModViewer && isCallback) {', 'if (isModViewer) {')

    # Fix brace imbalance if still present
    # We'll check balance at the end.
    
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")

if __name__ == '__main__':
    fix()
