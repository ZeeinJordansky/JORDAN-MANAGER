const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const getSnippet = (startStr, endStr) => {
  const startIdx = clean.indexOf(startStr);
  const endIdx = clean.indexOf(endStr, startIdx);
  return clean.substring(startIdx, endIdx);
};

// Help might not be in message_new like this, it's probably handled inside botHelpCmds, or in isHelpCmd ?
// Wait, the agent found isHelpCmd logic:
const helpIdx = clean.indexOf('if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/gamehelp"].includes(rawCmd)) {');
console.log("helpIdx in clean:", helpIdx);
