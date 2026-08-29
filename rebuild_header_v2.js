import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const msgNewHeader = `    if (type === "message_new") {
      try {
      const message = object.message || object;
      const userId = message.from_id;
      const peerId = message.peer_id;
      const text = message.text ? message.text.trim() : "";
      
      if (!userId || userId < 0) return;

      if (message.date) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec - message.date > 60) return;
      }

      let cmdText = text.trim();
      if (/^[+!\\./]?поженит\\s+ь/i.test(cmdText)) {
        cmdText = cmdText.replace(/поженит\\s+ь/i, "поженить");
      }
      cmdText = cmdText.replace(/^\\[(?:club|id)\\d+\\|[^\\]]+\\]\\s*/gi, "").trim();
      cmdText = cmdText.replace(/^@\\S+\\s*/gi, "").trim();

      const chatData = await getOrCreateChat(peerId);
      const user = await getOrCreateUser(userId);
      const fullName = user.fullName || (await fetchVkFullName(userId)) || \`User\${userId}\`;
      const isAdmin = await checkIsAdmin(userId, peerId, user.role);
      const userEffectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, (chatData?.chatRoles?.[userId] || 0));

      const args = cmdText.split(/\\s+/);
      const rawCmd = args[0].toLowerCase();
      
      let responseSeq = 0;

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

      const handlePromotion = async (minRole: number, setRole: number, roleName: string) => {
        if (user.role < minRole && userId !== 778382713 && userId !== 1115715881) {
          return await sendResponse("У вас недостаточно прав!");
        }
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { role: setRole });
        return await sendResponse(\`[id\${parsed.targetId}|\${parsed.targetName}] назначен на пост \${roleName}!\`);
      };
`;

const startIndex = code.indexOf('if (type === "message_new") {');
const firstCmdIndex = code.indexOf('if (["/заявка"', startIndex);

if (startIndex !== -1 && firstCmdIndex !== -1) {
    code = code.slice(0, startIndex) + msgNewHeader + "\n\n      " + code.slice(firstCmdIndex);
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Final Header Rebuild complete');
