with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_code = """      if (dynamicBanWords.length === 0) {
        try {
          const doc = await firestoreDb.collection("bot_settings").doc("global").get();
          if (doc.exists && Array.isArray(doc.data()?.banWords)) {
            dynamicBanWords = doc.data()?.banWords;
          }
        } catch (e) {}
      }"""

new_code = """      if (!global.dynamicBanWordsFetched) {
        global.dynamicBanWordsFetched = true;
        try {
          const doc = await firestoreDb.collection("bot_settings").doc("global").get();
          if (doc.exists && Array.isArray(doc.data()?.banWords)) {
            dynamicBanWords = doc.data()?.banWords;
          }
        } catch (e) {}
      }"""

text = text.replace(old_code, new_code)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("dynamicBanWords patched")
