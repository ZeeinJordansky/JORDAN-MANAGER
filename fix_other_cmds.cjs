const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const waitingStateStr = `
const waitingForWelcome = new Map<string, boolean>();
`;

const anchor = `      if (rawCmd === "/setowner") {`;
const cmdsStr = `
      if (rawCmd === "/welcometext") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const isEnabled = chatData.welcometext_enabled;
         const currentText = chatData.welcometext || "Не задан";
         
         const text = \`Здесь вы можете задать текст приветствия который будет отправляться при каждом приглашении участника.\\n\\n| Статус текста приветствия - \${isEnabled ? 'Включён' : 'Отключён'}\\n\\n| Текст приветствия:\\n\${currentText}\\n\\n| «%u» - заменяется на @id пользователя\\n| «%n» - заменяется на тег с именем пользователя\\n| «%i» - заменяется на @id пригласившего\\n| «%p» - заменяется на тег с именем пригласившего\`;
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: isEnabled ? "Выключить приветствие" : "Включить приветствие", payload: JSON.stringify({ cmd: isEnabled ? "welcome_off" : "welcome_on" }) }, color: isEnabled ? "negative" : "positive" }],
             [{ action: { type: "callback", label: "Задать текст", payload: JSON.stringify({ cmd: "welcome_set" }) }, color: "positive" }]
           ]
         };
         
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/restart") {
         if (user.role < 12 && userId !== 778382713) return await sendResponse("Недостаточно прав!");
         let progress = 10;
         const resp = await axios.post(\`https://api.vk.com/method/messages.send\`, new URLSearchParams({
           access_token: VK_TOKEN,
           v: "5.199",
           peer_id: peerId.toString(),
           random_id: Math.floor(Math.random() * 1000000).toString(),
           message: \`Начинается перезапуск бота...\\n⬜ | 10/100%\`
         }).toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
         
         const cmId = resp.data?.response;
         if (!cmId) return;

         const simulateRestart = async () => {
           for (let i = 20; i <= 100; i+=10) {
              await new Promise(r => setTimeout(r, 700));
              const squares = "⬜".repeat(i/10);
              let msg = \`Начинается перезапуск бота...\\n\${squares} | \${i}/100%\`;
              if (i === 100) msg = \`Перезапуск бота успешно закончен.\\n\${squares} | \${i}/100%\`;
              await axios.post(\`https://api.vk.com/method/messages.edit\`, new URLSearchParams({
                 access_token: VK_TOKEN,
                 v: "5.199",
                 peer_id: peerId.toString(),
                 message_id: cmId.toString(),
                 message: msg
              }).toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
           }
         };
         simulateRestart();
         return;
      }

      if (rawCmd === "/zov") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const zovList = profiles.filter((p: any) => p.id > 0).map((p: any) => \`[id\${p.id}|&#8203;]\`).join("");
         return await sendResponse(\`@all Внимание, участники! \` + zovList, { disable_mentions: 0 });
      }
      
      if (rawCmd === "/online") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = profiles.filter((p: any) => p.id > 0 && p.online).map((p: any) => \`[id\${p.id}|&#8203;]\`).join("");
         return await sendResponse(\`@online Внимание, участники в сети! \` + onlineList, { disable_mentions: 0 });
      }
      
      if (rawCmd === "/onlinelist") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineUsers = profiles.filter((p: any) => p.id > 0 && p.online);
         const lines = onlineUsers.map((p: any, idx: number) => \`\${idx+1}. [id\${p.id}|\${p.first_name} \${p.last_name}]\`);
         return await sendResponse(\`Пользователи онлайн:\\n\\n\` + lines.join("\\n"));
      }

` + anchor;

code = code.replace(/const userAntiFlood = new Map<string, number\[\]>\(\);/, waitingStateStr + "\nconst userAntiFlood = new Map<string, number[]>();");
code = code.replace(anchor, cmdsStr);

const stateCheckStr = `
      const waitKey = \`\${peerId}_\${userId}\`;
      if (waitingForWelcome.get(waitKey)) {
         waitingForWelcome.delete(waitKey);
         const chatData = await getOrCreateChat(peerId);
         await updateChat(peerId, { welcometext: message.text });
         return await sendResponse(\`Текст приветствия успешно установлен!\`);
      }

      if (checkFlood(peerId, userId, chatData)) {
`;

code = code.replace(/if \(checkFlood\(peerId, userId, chatData\)\) {/, stateCheckStr);

const welcomeBtnsStr = `
      if (cmd === "welcome_on" || cmd === "welcome_off") {
         const isEn = cmd === "welcome_on";
         await updateChat(peerId, { welcometext_enabled: isEn });
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: isEn ? "Выключить приветствие" : "Включить приветствие", payload: JSON.stringify({ cmd: isEn ? "welcome_off" : "welcome_on" }) }, color: isEn ? "negative" : "positive" }],
             [{ action: { type: "callback", label: "Задать текст", payload: JSON.stringify({ cmd: "welcome_set" }) }, color: "positive" }]
           ]
         };
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
         await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Пользователь] \${isEn ? 'включил(-а)' : 'выключил(-а)'} приветствие\`, { keyboard: JSON.stringify(keyboard) });
         return;
      }
      if (cmd === "welcome_set") {
         waitingForWelcome.set(\`\${peerId}_\${userId}\`, true);
         const text = \`Задайте текст для приветствия!\\n\\n| «%u» - заменяется на @id пользователя\\n| «%n» - заменяется на тег с именем пользователя\\n| «%i» - заменяется на @id пригласившего\\n| «%p» - заменяется на тег с именем пригласившего\\n\\n| Следующее сообщение которое вы напишите будет применено в качестве приветствия.\`;
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
         await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({inline: true, buttons: []}) });
         return;
      }
`;

code = code.replace(/const modPayloads = \["mod_unmute"/, welcomeBtnsStr + "\nconst modPayloads = [\"mod_unmute\"");
fs.writeFileSync('server.ts', code);
console.log("Other cmds added");
