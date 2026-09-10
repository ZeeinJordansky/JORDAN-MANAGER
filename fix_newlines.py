with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

# I will replace the broken strings by locating them and escaping the newline
text = text.replace('получилось :(\n| Что бы', 'получилось :(\\n| Что бы')
text = text.replace('популярного блогера.\n| Что бы', 'популярного блогера.\\n| Что бы')

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)
