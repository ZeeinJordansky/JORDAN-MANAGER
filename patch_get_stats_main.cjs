const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      customStatus: userStatus,
      chatMsgs: totalMsgs,
      globalMsgs: targetUser.totalMsgs || 0,
      isMuted`;

const replacement = `      customStatus: userStatus,
      chatMsgs: totalMsgs,
      globalMsgs: targetUser.totalMsgs || 0,
      isMuted,
      lastMsgStr: rawAct > 0 ? formatAmPmDate(rawAct) : "отсутствует"`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched getStatsMainPage");
} else {
  console.error("Could not find target in getStatsMainPage");
}

const targetStr2 = `      customStatus: targetUser.customStatus || targetUser.statusText,
      chatMsgs: chatTotalMsgs,
      globalMsgs: globalTotalMsgs,
      isMuted`;

const replacement2 = `      customStatus: targetUser.customStatus || targetUser.statusText,
      chatMsgs: chatTotalMsgs,
      globalMsgs: globalTotalMsgs,
      isMuted,
      lastMsgStr: "—"`;

if (code.includes(targetStr2)) {
  code = code.replace(targetStr2, replacement2);
  fs.writeFileSync('server.ts', code);
  console.log("Patched getStatsTestPage");
} else {
  console.error("Could not find target in getStatsTestPage");
}
