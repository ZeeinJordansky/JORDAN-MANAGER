with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('Вы не в браке.\nИспользуйте', 'Вы не в браке.\\nИспользуйте')
text = text.replace('Минуточку внимания!\n\nСегодня', 'Минуточку внимания!\\n\\nСегодня')
text = text.replace('пользователя!\n\nПоздравляем', 'пользователя!\\n\\nПоздравляем')

import re
text = re.sub(r'([^\\])\n', r'\1\n', text) 
# Wait, just fixing the ones I know is safer.

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)
