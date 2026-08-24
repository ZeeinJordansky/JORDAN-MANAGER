const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replyLogic = `
    if (activeCaptchas.has(userId)) {
      const cState = activeCaptchas.get(userId)!;
      if (message.reply_message && (message.reply_message.conversation_message_id === cState.cmid || message.reply_message.id === cState.cmid)) {
        if (text.trim().toLowerCase() === cState.code.toLowerCase()) {
          clearTimeout(cState.timeout);
          activeCaptchas.delete(userId);
          await sendVkMessage(VK_TOKEN, peerId, "Мы смогли убедиться, что вы человек, можете продолжать пользоваться ботом.", {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }
      return;
    }
`;
code = code.replace('let responseSeq = 0;', 'let responseSeq = 0;' + replyLogic);

fs.writeFileSync('server.ts', code);
