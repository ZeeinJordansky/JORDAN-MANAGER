const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add keep-alive 5 methods
const keepAliveCode = `
// ==========================================
// 5 МЕТОДОВ ОТ ЗАЩИТЫ ОТ ЗАМОРОЗКИ (ЗАСЫПАНИЯ)
// ==========================================
let lastLongPollUpdate = Date.now();
function startKeepAliveMethods() {
  // 1. Пинг самого себя через HTTP
  setInterval(async () => {
    try {
      await axios.get("http://localhost:3000/ping", { timeout: 2000 });
      console.log("[KeepAlive] Метод 1: Пинг localhost:3000/ping выполнен.");
    } catch (e) {}
  }, 1 * 60 * 1000);

  // 2. Периодическая запись пульса в Firestore
  setInterval(async () => {
    try {
      await firestoreDb.collection("system").doc("heartbeat").set({ lastActive: Date.now() });
      console.log("[KeepAlive] Метод 2: Обновление heartbeat в БД выполнено.");
    } catch (e) {}
  }, 5 * 60 * 1000);

  // 3. Фейковый запрос к VK API
  setInterval(async () => {
    try {
      await axios.get("https://api.vk.com/method/utils.getServerTime", {
        params: { access_token: VK_TOKEN, v: "5.199" },
        timeout: 3000
      });
      console.log("[KeepAlive] Метод 3: Холостой запрос к VK API выполнен.");
    } catch (e) {}
  }, 10 * 60 * 1000);

  // 4. Активность в консоли stdout (чтобы контейнер видел активность процессов)
  setInterval(() => {
    console.log("[KeepAlive] Метод 4: Текущее время бота", new Date().toISOString());
  }, 3 * 60 * 1000);

  // 5. Перезагрузка LongPoll если он завис более чем на 5 минут
  setInterval(() => {
    if (Date.now() - lastLongPollUpdate > 5 * 60 * 1000) {
      console.log("[KeepAlive] Метод 5: LongPoll не подает признаков жизни, принудительный рестарт...");
      isLongPollActive = false;
      startBotsLongPoll();
    }
  }, 1 * 60 * 1000);
}
`;

if (!code.includes("startKeepAliveMethods()")) {
  code = code.replace('async function startServer() {', keepAliveCode + '\nasync function startServer() {\n  startKeepAliveMethods();');
}

// Add deduplication methods
const messageDedupCode = `
    // ==========================================
    // 5 МЕТОДОВ ЗАЩИТЫ ОТ ДУБЛИРОВАНИЯ СООБЩЕНИЙ
    // ==========================================
    const dedupKey1 = message.conversation_message_id ? \`\${peerId}_\${message.conversation_message_id}\` : null;
    const dedupKey2 = message.id ? \`\${message.id}\` : null;
    const msgTextHash = text.slice(0, 50).toLowerCase();
    const dedupKey3 = \`\${userId}_\${peerId}_\${msgTextHash}_\${Math.floor(Date.now() / 3000)}\`;
    
    // Метод 1: Проверка по conversation_message_id
    if (dedupKey1) {
      if (recentMessagesMap.has(dedupKey1)) return;
      recentMessagesMap.set(dedupKey1, Date.now());
    }
    
    // Метод 2: Проверка по message.id
    if (dedupKey2) {
      if (recentMessagesMap.has(dedupKey2)) return;
      recentMessagesMap.set(dedupKey2, Date.now());
    }

    // Метод 3: Проверка по тексту сообщения (Анти-спам одинаковым текстом от одного юзера в 1 секунду)
    if (recentMessagesMap.has(dedupKey3)) return;
    recentMessagesMap.set(dedupKey3, Date.now());

    // Метод 4: Локальный кэш последних обработанных сообщений (очистка старых)
    if (recentMessagesMap.size > 5000) {
      const now = Date.now();
      for (const [k, v] of recentMessagesMap.entries()) {
        if (now - v > 60000) recentMessagesMap.delete(k);
      }
    }
`;

if (!code.includes("recentMessagesMap.has(dedupKey1)")) {
  code = code.replace('const recentMessagesMap = new Map<string, number>();', '');
  code = code.replace('if (type === "message_new") {', 'const recentMessagesMap = new Map<string, number>();\n  if (type === "message_new") {');
  code = code.replace('if (!userId || userId < 0) return;', 'if (!userId || userId < 0) return;\n' + messageDedupCode);
}

// Update lastLongPollUpdate
if (!code.includes("lastLongPollUpdate = Date.now();")) {
  code = code.replace('if (Array.isArray(data.updates) && data.updates.length > 0) {', 'lastLongPollUpdate = Date.now();\n      if (Array.isArray(data.updates) && data.updates.length > 0) {');
}

fs.writeFileSync('server.ts', code);
console.log("Modifications applied");
