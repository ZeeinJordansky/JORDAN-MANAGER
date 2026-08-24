const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLimit = `      // Rate Limit: 5 commands per 5 seconds
      const now = Date.now();
      let history = commandHistory.get(userId);
      if (!history) {
        history = { timestamps: [] };
        commandHistory.set(userId, history);
      }
      const isCooldownBypass = (user.role || 0) >= 12 || userId === 778382713 || userId === 1115715881 || userId === 1;
      history.timestamps = history.timestamps.filter(t => now - t < 5000);
      if (history.timestamps.length >= 5 && !isCooldownBypass) {
         const timeLeft = 5 - Math.floor((now - history.timestamps[0]) / 1000);
         const secStr = ["секунду", "секунды", "секунд"];
         const secEnd = (timeLeft % 10 === 1 && timeLeft % 100 !== 11) ? secStr[0] : (timeLeft % 10 >= 2 && timeLeft % 10 <= 4 && (timeLeft % 100 < 10 || timeLeft % 100 >= 20)) ? secStr[1] : secStr[2];
         return await sendVkMessage(VK_TOKEN, peerId, \`Пожалуйста подождите \${timeLeft} \${secEnd}, перед повторным использованием команд.\`, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
         });
      }
      history.timestamps.push(now);`;

const newLimit = `      // Rate Limit & Captcha: 10 commands per 20 seconds, and 5 per 5 seconds
      const now = Date.now();
      let history = commandHistory.get(userId);
      if (!history) {
        history = { timestamps: [] };
        commandHistory.set(userId, history);
      }
      const isCooldownBypass = (user.role || 0) >= 12 || userId === 778382713 || userId === 1115715881 || userId === 1;
      
      if (!isCooldownBypass) {
        history.timestamps = history.timestamps.filter(t => now - t < 20000);
        if (history.timestamps.length >= 10) {
          await triggerCaptcha(userId, peerId, message);
          return;
        }
        const burstTimestamps = history.timestamps.filter(t => now - t < 5000);
        if (burstTimestamps.length >= 5) {
          const timeLeft = 5 - Math.floor((now - burstTimestamps[0]) / 1000);
          const secStr = ["секунду", "секунды", "секунд"];
          const secEnd = (timeLeft % 10 === 1 && timeLeft % 100 !== 11) ? secStr[0] : (timeLeft % 10 >= 2 && timeLeft % 10 <= 4 && (timeLeft % 100 < 10 || timeLeft % 100 >= 20)) ? secStr[1] : secStr[2];
          return await sendVkMessage(VK_TOKEN, peerId, \`Пожалуйста подождите \${timeLeft} \${secEnd}, перед повторным использованием команд.\`, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }
      history.timestamps.push(now);`;

code = code.replace(oldLimit, newLimit);
fs.writeFileSync('server.ts', code);
