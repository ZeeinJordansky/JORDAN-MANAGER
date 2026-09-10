with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_cache_check = """  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");
  const cached = chatCache.get(peerId);
  if (cached && cached.title && !isPlaceholderTitle(cached.title)) return cached;"""

new_cache_check = """  const cached = chatCache.get(peerId);
  if (cached) return cached;"""

text = text.replace(old_cache_check, new_cache_check)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Chat cache check patched")
