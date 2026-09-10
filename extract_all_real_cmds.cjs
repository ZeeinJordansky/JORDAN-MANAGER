const fs = require('fs');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

const findCmd = (str, nextStr) => {
  const startIdx = clean.indexOf(str);
  if (startIdx === -1) {
    console.log('Not found:', str);
    return;
  }
  let endIdx = -1;
  if (nextStr) {
     endIdx = clean.indexOf(nextStr, startIdx);
  } else {
     endIdx = startIdx + 2000; // rough
  }
  console.log(`\n=== ${str.substring(0, 30)} ===\n`);
  console.log(clean.substring(startIdx, endIdx));
}

findCmd('if (["/help", "/помощь", "/хелп",', 'if (["/warn", "/варн", "/предупреждение",');
findCmd('if (["/warn", "/варн", "/предупреждение",', 'if (["/unwarn", "/разварн",');
findCmd('if (["/unwarn", "/разварн",', 'if (["/warns", "/варны", "/преды", "/предупреждения", "/списокварнов"].includes(rawCmd)) {');
findCmd('if (["/warns", "/варны", "/преды", "/предупреждения", "/списокварнов"].includes(rawCmd)) {', 'if (["/kick", "/кик", "/исключить",');
findCmd('if (["/kick", "/кик", "/исключить",', 'if (rawCmd === "/цитата") {');

