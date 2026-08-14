const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const floodStr = `
    const userAntiFlood = new Map<string, number[]>();
    const checkFlood = (peerId, userId, chatData) => {
      if (!chatData.af) return false;
      const key = \`\${peerId}_\${userId}\`;
      const now = Date.now();
      let times = userAntiFlood.get(key) || [];
      times = times.filter(t => now - t < 5000); // 5 messages in 5 seconds
      times.push(now);
      userAntiFlood.set(key, times);
      return times.length > 5;
    };
`;

const anchor = `    try {
      let fullName = \`User\${userId}\`;`;

const newAnchor = `    try {
      let fullName = \`User\${userId}\`;
      const chatData = await getOrCreateChat(peerId);
      if (checkFlood(peerId, userId, chatData)) {
         const uData = await getOrCreateUser(userId);
         if (!uData.muteUntil || uData.muteUntil < Date.now()) {
            await updateUser(userId, { muteUntil: Date.now() + 30 * 60 * 1000 });
            await sendVkMessage(VK_TOKEN, peerId, \`[id\${userId}|\${fullName}] была выдана блокировка чата на 30 минут по причине флуда сообщениями. (#FLOOD)\`);
         }
         return; // Ignore flooded message
      }
`;

code = code.replace(/const userCache = new Map<number, any>\(\);/, floodStr + "\nconst userCache = new Map<number, any>();");
code = code.replace(anchor, newAnchor);
fs.writeFileSync('server.ts', code);
console.log("Antiflood added");
