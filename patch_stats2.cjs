const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `const getStatsMutePage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || \`id\${targetId}\`;
  
  const isMuted = targetUser.muteUntil && targetUser.muteUntil > Date.now();
  let text = "Информация о блокировке чата:\\n\\n";
  
  if (isMuted) {
    text += \`| У пользователя [id\${targetId}|\${targetName}] активная блокировка чата.\\n\\n\`;
    text += \`| Информация о активной блокировке чата:\\n\`;
    
    let mStr = "[id1|Модератор]";
    if (targetUser.mutedBy) {
      const muter = await getOrCreateUser(targetUser.mutedBy);
      const muterName = muter.fullName || muter.nick || \`id\${targetUser.mutedBy}\`;
      mStr = \`[id\${targetUser.mutedBy}|\${muterName}]\`;
    }
    
    const reason = targetUser.muteReason || "Нарушение правил";
    const untilDate = formatAmPmDate(targetUser.muteUntil);
    text += \`| Выдал: \${mStr}\\n| До: \${untilDate}\\n| Причина: \${reason}\`;
  } else {
    text += \`| У пользователя [id\${targetId}|\${targetName}] отсутствует активная блокировка чата.\`;
  }

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Общая Информация", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: "Все блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };
  return { text, keyboard };
};

const getStatsWarnsPage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || \`id\${targetId}\`;
  const warnsCount = targetUser.warnings || 0;
  
  let text = "Информация о предупреждениях:\\n\\n";
  
  if (warnsCount > 0) {
    text += \`| У пользователя [id\${targetId}|\${targetName}] \${warnsCount} предупреждение(ия).\\n\\n\`;
    text += \`| Информация о активных предупреждениях:\\n\`;
    
    const activeWarnsList = targetUser.activeWarningsList || [];
    if (activeWarnsList && activeWarnsList.length > 0) {
      let idx = 1;
      for (const w of activeWarnsList) {
        let mStr = "[id1|Модератор]";
        if (w.by) {
           const muter = await getOrCreateUser(w.by);
           const muterName = muter.fullName || muter.nick || \`id\${w.by}\`;
           mStr = \`[id\${w.by}|\${muterName}]\`;
        }
        text += \`\${idx}) Выдал: \${mStr}, Причина: \${w.reason || 'без причины'}, Дата: \${formatAmPmDate(w.date)}\\n\`;
        idx++;
      }
    } else {
      let mStr = "[id1|Модератор]";
      if (targetUser.warnedBy) {
         const muter = await getOrCreateUser(targetUser.warnedBy);
         const muterName = muter.fullName || muter.nick || \`id\${targetUser.warnedBy}\`;
         mStr = \`[id\${targetUser.warnedBy}|\${muterName}]\`;
      }
      text += \`1) Выдал: \${mStr}, Причина: \${targetUser.warnReason || 'Нарушение правил'}, Дата: \${formatAmPmDate(targetUser.warnDate || Date.now())}\\n\`;
    }
  } else {
    text += \`| У пользователя [id\${targetId}|\${targetName}] отсутствуют предупреждения.\`;
  }

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Общая Информация", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Информация о блокировке чата", payload: JSON.stringify({ cmd: "stats_mute", targetId }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: "Все блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };
  return { text, keyboard };
};`;

const warnsSearchRegex = /const getStatsWarnsPage = async [\s\S]*?return \{ text, keyboard \};\n\};/m;

if (warnsSearchRegex.test(code)) {
  code = code.replace(warnsSearchRegex, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched getStatsWarnsPage successfully!");
} else {
  console.log("Could not find getStatsWarnsPage!");
}
