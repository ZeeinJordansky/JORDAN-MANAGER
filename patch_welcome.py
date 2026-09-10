with open("server.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_code = """      if (!user.wroteInDm) {
        updateUser(userId, { wroteInDm: true }).catch(() => {});
        user.wroteInDm = true;
      }"""

new_code = """      if (!user.wroteInDm) {
        updateUser(userId, { wroteInDm: true }).catch(() => {});
        user.wroteInDm = true;
        if (peerId < 2000000000) {
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], добро пожаловать!\n\nВы попали в чат-менеджера Orion\n\nOrion - Ваш помощник для ваших бесед, в нём есть игровая система, модерационные команды!`);
        } else {
          const dmKb = { inline: true, buttons: [[{ action: { type: "open_link", link: "https://vk.ru/write-239281784?ref=", label: "Написать в лс бота" } }]] };
          await sendVkMessage(VK_TOKEN, peerId, `Для начала работы с чат-менеджером напишите ему в личные сообщения!`, { keyboard: JSON.stringify(dmKb) });
          return;
        }
      }"""

text = text.replace(old_code, new_code)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("Welcome logic patched")
