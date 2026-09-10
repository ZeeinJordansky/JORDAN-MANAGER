import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/editVkMessage\(VK_TOKEN, peerId, cmId, undefined, { keyboard/g, 
  "editVkMessage(VK_TOKEN, peerId, cmId, undefined, { preserveAttachment: true, keyboard");

code = code.replace(/editVkMessage\(VK_TOKEN, peerId, cmId, undefined, \{inline/g, 
  "editVkMessage(VK_TOKEN, peerId, cmId, undefined, { preserveAttachment: true, inline");

fs.writeFileSync('server.ts', code);
