const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

console.log("Original server.ts size:", code.length);

// 1. Update formatCheckBansText
const oldFormatCheckBans = `  out += \`| Информация о глобальной блокировке во всех беседах:\\n\`;
  if (targetUser.gban || targetUser.gbanpl) {
    const gBy = targetUser.gbanBy || targetUser.gbanplBy || 1;
    const modStr = await getModStr(gBy);
    const gDate = fmt12h(targetUser.gbanDate || targetUser.gbanplDate || Date.now());
    const gExp = targetUser.gbanExpiresAt || targetUser.gbanplExpiresAt;
    const expStr = (!gExp || gExp === 0) ? "Никогда" : fmt12h(gExp);
    const reason = targetUser.gbanReason || targetUser.gbanplReason || "Нарушение правил";
    out += \`| Модератор - \${modStr}\\n\`;
    out += \`| Дата выдачи: \${gDate}\\n\`;
    out += \`| Дата окончания: \${expStr}\\n\`;
    out += \`| Причина: \${reason}\\n\\n\`;
  } else {
    out += \`отсутствует\\n\\n\`;
  }

  // 2. Информация о нахождении в чёрном списке чат-менеджера
  out += \`| Информация о нахождении в чёрном списке чат-менеджера:\\n\`;
  if (targetUser.blacklisted) {
    const bBy = targetUser.blacklistedBy || targetUser.blackBy || 1;
    const modStr = await getModStr(bBy);
    const bDate = fmt12h(targetUser.blacklistedDate || targetUser.blackDate || Date.now());
    const bExp = targetUser.blacklistedExpiresAt || targetUser.blackExpiresAt;
    const expStr = (!bExp || bExp === 0) ? "Никогда" : fmt12h(bExp);
    const reason = targetUser.blacklistedReason || targetUser.blackReason || "Чёрный список";
    out += \`| Модератор - \${modStr}\\n\`;
    out += \`| Дата выдачи: \${bDate}\\n\`;
    out += \`| Дата окончания: \${expStr}\\n\`;
    out += \`| Причина: \${reason}\\n\\n\`;
  } else {
    out += \`отсутствует\\n\\n\`;
  }

  // 3. Информация о блокировках в беседах
  const chatBans = targetUser.chatBans || {};
  const entries = Object.entries(chatBans).filter(([_, v]: any) => {
    if (!v) return false;
    if (v.until && v.until < Date.now()) return false;
    if (v.expiresAt && v.expiresAt < Date.now()) return false;
    return true;
  });

  out += \`| Информация о блокировках в беседах:\\n\\n\`;
  out += \`| Кол-во блокировок в беседах: \${entries.length}\\n\\n\`;

  if (entries.length > 0) {
    let idx = 1;
    for (const [cPeerId, banInfo] of entries as any) {
      const cData = await getOrCreateChat(Number(cPeerId));
      let title = cData.title || \`Беседа №\${cPeerId}\`;
      if (typeof containsBadWord === "function" && containsBadWord(title)) {
        title = "####";
      }
      const modStr = await getModStr(banInfo.by);
      const bDate = fmt12h(banInfo.date || Date.now());
      const bExp = banInfo.until || banInfo.expiresAt;
      const expStr = (!bExp || bExp === 0) ? "Никогда" : fmt12h(bExp);
      const reason = banInfo.reason || "Нарушение правил";

      out += \`\${idx}) \${title}\\n\`;
      out += \`| Модератор - \${modStr}\\n\`;
      out += \`| Дата выдачи: \${bDate}\\n\`;
      out += \`| Дата окончания: \${expStr}\\n\`;
      out += \`| Причина: \${reason}\\n\\n\`;
      idx++;
    }
  }`;

const newFormatCheckBans = `  out += \`| Информация о глобальной блокировке во всех беседах:\\n\`;
  if (targetUser.gban || targetUser.gbanpl) {
    const gBy = targetUser.gbanBy || targetUser.gbanplBy || 1;
    const modStr = await getModStr(gBy);
    const gDate = fmt12h(targetUser.gbanDate || targetUser.gbanplDate || Date.now());
    const gExp = targetUser.gbanExpiresAt || targetUser.gbanplExpiresAt;
    const expStr = (!gExp || gExp === 0) ? "Никогда" : fmt12h(gExp);
    const reason = targetUser.gbanReason || targetUser.gbanplReason || "Нарушение правил";
    out += \`| Модератор - \${modStr}\\n\`;
    out += \`| Дата выдачи: \${gDate}\\n\`;
    out += \`| Дата окончания: \${expStr}\\n\`;
    out += \`| Причина: \${reason}\\n\\n\`;
  } else {
    out += \`отсутствует.\\n\\n\`;
  }

  // 2. Информация о нахождении в чёрном списке чат-менеджера
  out += \`| Информация о нахождении в чёрном списке чат-менеджера:\\n\`;
  if (targetUser.blacklisted) {
    const bBy = targetUser.blacklistedBy || targetUser.blackBy || 1;
    const modStr = await getModStr(bBy);
    const bDate = fmt12h(targetUser.blacklistedDate || targetUser.blackDate || Date.now());
    const bExp = targetUser.blacklistedExpiresAt || targetUser.blackExpiresAt;
    const expStr = (!bExp || bExp === 0) ? "Никогда" : fmt12h(bExp);
    const reason = targetUser.blacklistedReason || targetUser.blackReason || "Чёрный список";
    out += \`| Модератор - \${modStr}\\n\`;
    out += \`| Дата выдачи: \${bDate}\\n\`;
    out += \`| Дата окончания: \${expStr}\\n\`;
    out += \`| Причина: \${reason}\\n\\n\`;
  } else {
    out += \`отсутствует.\\n\\n\`;
  }

  // 3. Информация о блокировках в беседах
  const chatBans = targetUser.chatBans || {};
  const entries = Object.entries(chatBans).filter(([_, v]: any) => {
    if (!v) return false;
    if (v.until && v.until < Date.now()) return false;
    if (v.expiresAt && v.expiresAt < Date.now()) return false;
    return true;
  });

  out += \`| Информация о блокировках в беседах:\\n\`;
  if (entries.length > 0) {
    out += \`\\n| Кол-во блокировок в беседах: \${entries.length}\\n\\n\`;
    let idx = 1;
    for (const [cPeerId, banInfo] of entries as any) {
      const cData = await getOrCreateChat(Number(cPeerId));
      let title = cData.title || \`Беседа №\${cPeerId}\`;
      if (typeof containsBadWord === "function" && containsBadWord(title)) {
        title = "####";
      }
      const modStr = await getModStr(banInfo.by);
      const bDate = fmt12h(banInfo.date || Date.now());
      const bExp = banInfo.until || banInfo.expiresAt;
      const expStr = (!bExp || bExp === 0) ? "Никогда" : fmt12h(bExp);
      const reason = banInfo.reason || "Нарушение правил";

      out += \`\${idx}) \${title}\\n\`;
      out += \`| Модератор - \${modStr}\\n\`;
      out += \`| Дата выдачи: \${bDate}\\n\`;
      out += \`| Дата окончания: \${expStr}\\n\`;
      out += \`| Причина: \${reason}\\n\\n\`;
      idx++;
    }
  } else {
    out += \`Блокировки в беседах отсутствуют.\\n\\n\`;
  }`;

if (code.includes(oldFormatCheckBans)) {
  code = code.replace(oldFormatCheckBans, newFormatCheckBans);
  console.log("SUCCESS: Replaced formatCheckBansText");
} else {
  console.log("WARNING: Could not find exact oldFormatCheckBans");
}

// 2. Update getEventDeduplicationKeys
const oldGetKeys = `function getEventDeduplicationKeys(payload: any): string[] {
  if (!payload) return [];
  const keys = new Set<string>();

  const type = payload.type;
  if (type === "message_new" || type === "message_reply") {
    const msg = payload.object?.message || payload.object;
    if (msg) {
      if (msg.peer_id && msg.conversation_message_id) {
        keys.add(\`msg_peer_\${msg.peer_id}_cmid_\${msg.conversation_message_id}\`);
      }
      if (msg.id && msg.id > 0) {
        keys.add(\`msg_id_\${msg.id}\`);
      }
      if (msg.peer_id && msg.from_id && msg.date) {
        const txtSnippet = (msg.text || "").slice(0, 30);
        keys.add(\`msg_raw_\${msg.peer_id}_\${msg.from_id}_\${msg.date}_\${txtSnippet}\`);
      }
    }
  }`;

const newGetKeys = `function getEventDeduplicationKeys(payload: any): string[] {
  if (!payload) return [];
  const keys = new Set<string>();

  const type = payload.type;
  if (type === "message_new" || type === "message_reply") {
    const msg = payload.object?.message || payload.object;
    if (msg) {
      if (msg.peer_id && msg.conversation_message_id) {
        keys.add(\`msg_peer_\${msg.peer_id}_cmid_\${msg.conversation_message_id}\`);
      }
      if (msg.id && msg.id > 0) {
        keys.add(\`msg_id_\${msg.id}\`);
      }
      if (msg.peer_id && msg.from_id) {
        const txtSnippet = (msg.text || "").slice(0, 30);
        const timeBucket = msg.date ? Math.floor(msg.date / 5) : 0;
        keys.add(\`msg_raw_\${msg.peer_id}_\${msg.from_id}_\${timeBucket}_\${txtSnippet}\`);
      }
    }
  }`;

if (code.includes(oldGetKeys)) {
  code = code.replace(oldGetKeys, newGetKeys);
  console.log("SUCCESS: Replaced getEventDeduplicationKeys");
} else {
  console.log("WARNING: Could not find exact oldGetKeys");
}

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Updated server.ts successfully!");
