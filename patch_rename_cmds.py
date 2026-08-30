import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace('"/addzsa"', '"/addzga"').replace('"/addsa"', '"/addga"')
code = code.replace("Спец. Администратор", "Главный Администратор").replace("Зам. Спец. Администратора", "Зам. Глав. Администратора")
code = code.replace("Спец. администратор", "Главный администратор")
code = code.replace("выдать права", "выдать уровень прав")

# Also the /alt command for command aliases
alt_cmd = r'''      if (rawCmd === "/alt" || rawCmd === "/алиясы" || rawCmd === "/альт") {
         const altText = `...::Альтернативные команды::...\n\n/help - /помощь, /хелп, /команды, /меню\n/stats - /стата, /статистика\n/kick - /кик, /исключить, /выгнать, /к, /k\n/ban - /бан, /забанить, /б, /b\n/mute - /мут, /m\n/warn - /варн, /предупреждение, /w\n/unban - /разбан, /разбанить, /unb\n/unmute - /размут, /снятьмут, /unm\n/unwarn - /разварн, /снятьварн, /unw\n/gban - /гбан, /глобалбан\n/addblack - /чс, /вчс, /чсб`;
         return await sendResponse(altText, { noReply: true });
      }'''

code = code.replace('if (["/stats", "/стата"', alt_cmd + '\n      if (["/stats", "/стата"')

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("rename cmds patched")
