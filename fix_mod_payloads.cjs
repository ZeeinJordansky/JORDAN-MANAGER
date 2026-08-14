const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `      if (cmd === "stats_warns" || cmd === "stats_bans") {`;
const modPayloadsStr = `
      const modPayloads = ["mod_unmute", "mod_clearmute", "mod_unwarn", "mod_clearwarn", "mod_giveowner_yes", "mod_giveowner_no"];
      if (modPayloads.includes(cmd)) {
         const tId = payloadObj.targetId;
         if (!tId) return;
         if (cmd === "mod_unmute") {
            await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Блокировка чата с пользователя снята." });
            await updateUser(tId, { muteUntil: 0 });
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Модератор] снял(-а) блокировку чата с [id\${tId}|пользователя]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
         if (cmd === "mod_clearmute" || cmd === "mod_clearwarn") {
            const mId = payloadObj.msgId;
            // Best effort delete
            try {
              if (mId) await axios.get(\`https://api.vk.com/method/messages.delete\`, { params: { access_token: VK_TOKEN, v: "5.199", message_ids: mId, delete_for_all: 1 } });
              const hist = await axios.get(\`https://api.vk.com/method/messages.getHistory\`, { params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, count: 50 } });
              const msgs = hist.data.response.items.filter(m => m.from_id === tId).slice(0, 5);
              if (msgs.length > 0) {
                 await axios.get(\`https://api.vk.com/method/messages.delete\`, { params: { access_token: VK_TOKEN, v: "5.199", message_ids: msgs.map(m => m.id).join(","), delete_for_all: 1 } });
              }
            } catch (e) {}
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Модератор] очистил(-а) сообщения от [id\${tId}|пользователя]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
         if (cmd === "mod_unwarn") {
            await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Предупреждение с пользователя снято." });
            const targetU = await getOrCreateUser(tId);
            const newW = Math.max(0, (targetU.warnings || 0) - 1);
            await updateUser(tId, { warnings: newW });
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Модератор] снял(-а) предупреждение с [id\${tId}|пользователя]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
         if (cmd === "mod_giveowner_yes") {
            await updateUser(tId, { role: 6 });
            await updateUser(userId, { role: 5 }); // downgrade self to SAdmin
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Пользователь] передал(-а) свои права «Владелец Беседы» [id\${tId}|пользователю]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
         if (cmd === "mod_giveowner_no") {
            await editVkMessage(VK_TOKEN, peerId, cmId, \`[id\${userId}|Пользователь] отменил(-а) передачу своих прав «Владелец Беседы» [id\${tId}|пользователю]\`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
            return;
         }
      }
      
` + anchor;

code = code.replace(anchor, modPayloadsStr);
fs.writeFileSync('server.ts', code);
console.log("Mod payloads added");
