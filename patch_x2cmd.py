import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

x2_code = r'''
      if (rawCmd === "/x2" || rawCmd === "/х2") {
          const isManagerOwner = userId === 778382713 || userId === 1;
          if (!isManagerOwner) return await sendResponse("Данная команда доступна только владельцу чат-менеджера!");
          
          if (!globalThis.appState) globalThis.appState = {};
          const current = globalThis.appState.isX2Active || false;
          globalThis.appState.isX2Active = !current;
          
          return await sendResponse(current ? "Х2 режим был принудительно отключён." : "Х2 режим был принудительно включён.");
      }
'''
code = re.sub(r'if \(\["/stats", "/стата".*?\{', x2_code.strip() + '\n      if (["/stats", "/стата"', code, count=1)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("X2 cmd patched")
