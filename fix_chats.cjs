const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helpersStr = `
// Chat caching
const chatCache = new Map<number, any>();
async function getOrCreateChat(peerId: number) {
  const cached = chatCache.get(peerId);
  if (cached) return cached;

  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  const chatDoc = await chatRef.get();
  if (chatDoc.exists) {
    const data = chatDoc.data();
    chatCache.set(peerId, data);
    return data;
  } else {
    const newChat = {
      id: peerId,
      type: "PL",
      af: false,
      antisliv: false,
      raid: false,
      group: false,
      welcometext: null,
      welcometext_enabled: false
    };
    await chatRef.set(newChat);
    chatCache.set(peerId, newChat);
    return newChat;
  }
}

async function updateChat(peerId: number, data: any) {
  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  await chatRef.set(data, { merge: true });
  const cached = chatCache.get(peerId);
  if (cached) {
    chatCache.set(peerId, { ...cached, ...data });
  }
}
`;

// Insert it somewhere around line 200
code = code.replace(/const userCache = new Map<number, any>\(\);/, helpersStr + "\nconst userCache = new Map<number, any>();");
fs.writeFileSync('server.ts', code);
console.log("Chat helpers added");
