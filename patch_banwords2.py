with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("let dynamicBanWords: string[] = [];", "let dynamicBanWords: string[] = [];\nlet dynamicBanWordsFetched = false;")
text = text.replace("if (!global.dynamicBanWordsFetched) {\n        global.dynamicBanWordsFetched = true;", "if (!dynamicBanWordsFetched) {\n        dynamicBanWordsFetched = true;")

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("dynamicBanWords local var patched")
