import sys
import re

def patch():
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Redis import and initialization
    if 'import Redis from "ioredis";' not in content:
        content = content.replace(
            'import axios from "axios";',
            'import axios from "axios";\nimport Redis from "ioredis";'
        )
    
    redis_init = """
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redis) {
  redis.on("error", (err) => console.error("Redis Error:", err));
  console.log("Redis client initialized");
}
"""
    if 'const redis =' not in content:
        content = content.replace(
            'const firestoreDb = admin.firestore();',
            'const firestoreDb = admin.firestore();' + redis_init
        )

    # 2. Update getOrCreateUser to use Redis
    old_user_cache_check = """  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (!data.fullName || data.fullName.startsWith("User")) {"""
    
    new_user_cache_check = """  // Try memory cache
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }

  // Try Redis cache
  if (redis) {
    try {
      const cached = await redis.get(`user:${userId}`);
      if (cached) {
        const data = JSON.parse(cached);
        userCache.set(userId, data);
        return data;
      }
    } catch (e) {}
  }"""

    # We need to find the right place for new_user_cache_check. 
    # It should be right after userId is calculated.
    user_start_pattern = r'async function getOrCreateUser\(userIdRaw: number \| string, nameHint\?: string\) \{'
    content = re.sub(user_start_pattern, 'async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {\n  const userId = Number(userIdRaw);', content)
    # Remove the duplicate userId assignment if it exists (it likely does from my previous read)
    content = content.replace('const userId = Number(userIdRaw);\n  const userId = Number(userIdRaw);', 'const userId = Number(userIdRaw);')
    
    # Actually, let's just replace the whole cache block.
    content = re.sub(r'if \(userCache\.has\(userId\)\) \{.*?return data;\s+\}', new_user_cache_check, content, flags=re.DOTALL)

    # Add Redis saving in getOrCreateUser (after firestore fetch)
    redis_save_user = """    if (redis) {
      redis.setex(`user:${userId}`, 3600, JSON.stringify(data)).catch(()=>{});
    }"""
    content = content.replace('userCache.set(userId, data);', 'userCache.set(userId, data);\n' + redis_save_user)

    # 3. Update getOrCreateChat to use Redis
    old_chat_cache_check = """  const cached = chatCache.get(peerId);
  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");
  if (cached && cached.title && !isPlaceholderTitle(cached.title)) return cached;"""

    new_chat_cache_check = """  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");
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
  }"""
    content = content.replace(old_chat_cache_check, new_chat_cache_check)

    # Add Redis saving in getOrCreateChat
    redis_save_chat = """    if (redis) {
      redis.setex(`chat:${peerId}`, 3600, JSON.stringify(data)).catch(()=>{});
    }"""
    content = content.replace('chatCache.set(peerId, data);', 'chatCache.set(peerId, data);\n' + redis_save_chat)

    # 4. Fix Audio command to store metadata
    old_audio_save = """             const audioData = `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`;
             await uRef.set({ profileAudio: audioData }, { merge: true }).catch(()=>{});"""
    
    new_audio_save = """             const audioData = {
               attachment: `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`,
               artist: audioAttach.audio.artist || "Неизвестен",
               title: audioAttach.audio.title || "Без названия"
             };
             await uRef.set({ profileAudio: audioData }, { merge: true }).catch(()=>{});
             if (redis) redis.del(`user:${userId}`).catch(()=>{});"""
    content = content.replace(old_audio_save, new_audio_save)

    # 5. Fix getStatsMainPage audio display and buttons
    old_audio_display = """  if (targetUser.profileAudio?.artist && targetUser.profileAudio?.title) {
    statsStr += `| Музыка в профиле: ${targetUser.profileAudio.artist} - ${targetUser.profileAudio.title}\\n`;
  }"""
  
    new_audio_display = """  if (targetUser.profileAudio) {
    if (typeof targetUser.profileAudio === "string") {
      statsStr += `| Музыка в профиле: ${targetUser.profileAudio}\\n`;
    } else if (targetUser.profileAudio.artist && targetUser.profileAudio.title) {
      statsStr += `| Музыка в профиле: ${targetUser.profileAudio.artist} - ${targetUser.profileAudio.title}\\n`;
    }
  }"""
    content = content.replace(old_audio_display, new_audio_display)

    # Fix buttons: remove isCallback check
    content = content.replace('if (isModViewer && isCallback) {', 'if (isModViewer) {')

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched successfully")

if __name__ == '__main__':
    patch()
