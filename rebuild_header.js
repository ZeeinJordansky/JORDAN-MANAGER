import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Find message_new start
const msgNewStart = 'if (type === "message_new") {';
const startIndex = code.indexOf(msgNewStart);

// 2. Identify the block from message_new start until the first command (e.g. /приз or /заявка)
// Actually, I'll just find all declarations and group them.

const declarations = [
  'const message = object.message || object;',
  'const userId = message.from_id;',
  'const peerId = message.peer_id;',
  'const text = message.text ? message.text.trim() : "";',
  'let cmdText = text.trim();',
  'if (/^[+!\\./]?поженит\\s+ь/i.test(cmdText))', // start of cleanup
  'cmdText = cmdText.replace(/^[\\(club|id)\\d+\\|[^\\]]+\\]\\s*/gi, "").trim();', // Simplified match
  'const chatData = await getOrCreateChat(peerId);',
  'const user = await getOrCreateUser(userId);',
  'const fullName = user.fullName || (await fetchVkFullName(userId)) || `User${userId}`;',
  'const sendResponse = async (responseText: string, extraParams: any = {}) => {',
  'const args = cmdText.split(/\\s+/);',
  'const rawCmd = args[0].toLowerCase();'
];

// This is too complex to do with simple replace.
// I'll use a more robust "extract and rebuild" approach for the top of message_new.

const msgNewHeader = `    if (type === "message_new") {
      const message = object.message || object;
      const userId = message.from_id;
      const peerId = message.peer_id;
      const text = message.text ? message.text.trim() : "";
      
      if (!userId || userId < 0) return;

      // Ignore old/historical messages (older than 60 seconds)
      if (message.date) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec - message.date > 60) return;
      }

      let cmdText = text.trim();
      if (/^[+!\\./]?поженит\\s+ь/i.test(cmdText)) {
        cmdText = cmdText.replace(/поженит\\s+ь/i, "поженить");
      }
      // Clean leading VK tags / mentions
      cmdText = cmdText.replace(/^\\[(?:club|id)\\d+\\|[^\\]]+\\]\\s*/gi, "").trim();
      cmdText = cmdText.replace(/^@\\S+\\s*/gi, "").trim();

      const chatData = await getOrCreateChat(peerId);
      const user = await getOrCreateUser(userId);
      const fullName = user.fullName || (await fetchVkFullName(userId)) || \`User\${userId}\`;
      const isAdmin = await checkIsAdmin(userId, peerId, user.role);

      const args = cmdText.split(/\\s+/);
      const rawCmd = args[0].toLowerCase();

      const sendResponse = async (responseText: string, extraParams: any = {}) => {
        responseSeq++;
        const msgDedupKey = message.conversation_message_id
          ? \`\${peerId}_\${message.conversation_message_id}_\${responseSeq}\`
          : \`\${peerId}_\${message.id || message.date}_\${responseSeq}\`;
        const { noReply, ...rest } = extraParams;
        let replyParams: any = { dedup_key: msgDedupKey };
        if (!noReply && rest.forward === undefined) {
          replyParams.forward = JSON.stringify({
            peer_id: peerId,
            conversation_message_ids: [message.conversation_message_id],
            is_reply: true
          });
        }
        const res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });
        if (chatData?.deleteCommand && isModerationCmd(rawCmd)) {
          autoDeleteCmdMessage(peerId, message, chatData);
        }
        return res;
      };
`;

// Now find the old header area (until the first command logic) and replace it.
// I'll search for 'if (type === "message_new") {' and then find where the commands start.
// Usually the commands start with something like 'if (["/заявка", ...].includes(rawCmd))' or similar.

// Let's just find the first command in the file after message_new start.
const firstCmdIndex = code.indexOf('if (["/заявка"', startIndex);

if (startIndex !== -1 && firstCmdIndex !== -1) {
    code = code.slice(0, startIndex) + msgNewHeader + "\n\n      " + code.slice(firstCmdIndex);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Rebuilt message_new header');
