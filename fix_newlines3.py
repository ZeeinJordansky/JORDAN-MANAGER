with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# Fix patch 2 strings
text = text.replace('запустил(-а) дуэль на ${formatNum(bet)}$!\n\n| Что бы', 'запустил(-а) дуэль на ${formatNum(bet)}$!\\n\\n| Что бы')
text = text.replace('запустил(-а) дуэль на ${bet} ${suf}!\n\n| Что бы', 'запустил(-а) дуэль на ${bet} ${suf}!\\n\\n| Что бы')
text = text.replace('минуточку внимания!\n\n[id', 'минуточку внимания!\\n\\n[id')
text = text.replace('сделать вам предложение!\n\nПринять', 'сделать вам предложение!\\n\\nПринять')
text = text.replace('второй половинкой [id${pId}|${pName}]\n\nДля подтверждения', 'второй половинкой [id${pId}|${pName}]\\n\\nДля подтверждения')
text = text.replace('Инфорамция о вашем браке\n\n| Женат', 'Информация о вашем браке\\n\\n| Женат')
text = text.replace('Информация о вашем браке\n\n| Женат', 'Информация о вашем браке\\n\\n| Женат')
text = text.replace('Партнере\"]\n\n| В браке', 'Партнере\"]\\n\\n| В браке')

# Fix patch 3 strings
text = text.replace('пользователю [id${parsed.targetId}|${tName}]\n\n| Для', 'пользователю [id${parsed.targetId}|${tName}]\\n\\n| Для')
text = text.replace('Список всех бизнесов в боте:\n\n"', 'Список всех бизнесов в боте:\\n\\n"')
text = text.replace('Список всех бизнесов в боте:\n\n', 'Список всех бизнесов в боте:\\n\\n')
text = text.replace('Список всех бизнесов в боте:\n', 'Список всех бизнесов в боте:\\n')
text = text.replace('bizList.join("\n', 'bizList.join("\\n')

text = text.replace('...:: Топ ::...\n";', '...:: Топ ::...\\n";')
text = text.replace('...:: Топ ::...\n', '...:: Топ ::...\\n')

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)
