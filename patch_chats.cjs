const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");
const target = `async function getOrCreateChat(peerId: number) {
  const cached = chatCache.get(peerId);
  if (cached) return cached;

  if (chatInFlight.has(peerId)) {
    return await chatInFlight.get(peerId);
  }`;
const replace = `async function getOrCreateChat(peerId: number) {
  let cached = chatCache.get(peerId);
  if (cached) return cached;

  // ⚡ OPTIMISTIC INSTANT RETURN (ZERO FIRESTORE DELAY)
  cached = { id: peerId, title: \`Беседа №\${peerId}\`, autoReactionId: 0, type: "PL" };
  chatCache.set(peerId, cached);

  if (chatInFlight.has(peerId)) {
    return cached; // Already fetching
  }`;
code = code.replace(target, replace);
fs.writeFileSync("server.ts", code);
