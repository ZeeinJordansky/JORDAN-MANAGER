const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const slivHelper = `
    const slivCounter = new Map<string, number[]>();
    const processSliv = async (peerId: number, userId: number, chatData: any) => {
      if (!chatData.antisliv) return false;
      const key = \`\${peerId}_\${userId}\`;
      const now = Date.now();
      let times = slivCounter.get(key) || [];
      times = times.filter(t => now - t < 60000); // 1 minute
      times.push(now);
      slivCounter.set(key, times);
      if (times.length > 5) {
        // Demote the user
        const u = await getOrCreateUser(userId);
        if ((u.role || 0) < 7) {
           const chatRoles = u.chatRoles || {};
           chatRoles[peerId] = 0;
           await updateUser(userId, { chatRoles });
           await sendVkMessage(VK_TOKEN, peerId, \`Должность [id\${userId}|пользователя] была снята из-за подозрений в сливе беседы. (#ANTI-SLIV)\\n\\nЕсли вы считаете, что это ошибка, напишите владельцу беседы - [id\${peerId}|Владельцу]\`);
        }
        return true;
      }
      return false;
    };
`;

code = code.replace(/const checkFlood = \(peerId, userId, chatData\)/, slivHelper + "\nconst checkFlood = (peerId, userId, chatData)");

const muteCheck = `if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;`;

code = code.replace(/if \(user\.role < 1 && !isAdmin\) return await sendResponse\("У вас недостаточно прав!"\);/g, muteCheck);

fs.writeFileSync('server.ts', code);
console.log("Antisliv added");
