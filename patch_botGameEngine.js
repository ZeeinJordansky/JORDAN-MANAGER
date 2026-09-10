const fs = require('fs');
let code = fs.readFileSync('src/botGameEngine.ts', 'utf8');

// Insert AsyncLocalStorage import
if (!code.includes("import { AsyncLocalStorage }")) {
  code = code.replace('import axios from "axios";', 'import axios from "axios";\nimport { AsyncLocalStorage } from "async_hooks";');
}

// Insert requestContext
if (!code.includes("export const requestContext")) {
  code = code.replace('export function sendVkMessage', 'export const requestContext = new AsyncLocalStorage<any>();\n\nexport function sendVkMessage');
}

// Modify sendVkMessage to use requestContext
const searchStr = `  let randomId = extraParams.random_id;
  if (!randomId && extraParams.dedup_key) {`;

const replaceStr = `  let randomId = extraParams.random_id;
  if (!randomId && !extraParams.dedup_key) {
    const ctx = requestContext.getStore();
    if (ctx && ctx.msgId) {
      extraParams.dedup_key = \`\${ctx.msgId}_\${ctx.seq++}\`;
    }
  }
  if (!randomId && extraParams.dedup_key) {`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, replaceStr);
}

fs.writeFileSync('src/botGameEngine.ts', code);
