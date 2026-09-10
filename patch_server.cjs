const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const searchStr = `  if (type === "message_new") {
    const message = object.message || object;
    const userId = message.from_id;
    const peerId = message.peer_id;
    const text = message.text ? message.text.trim() : "";
    
    if (!userId || userId < 0) return;

    let responseSeq = 0;`;

const replaceStr = `  if (type === "message_new") {
    const message = object.message || object;
    const userId = message.from_id;
    const peerId = message.peer_id;
    const text = message.text ? message.text.trim() : "";
    
    if (!userId || userId < 0) return;

    return requestContext.run({ msgId: message.conversation_message_id || message.id || Date.now(), seq: 1 }, async () => {

    let responseSeq = 0;`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, replaceStr);
  
  // also need to close the parenthesis where `message_new` ends.
  // Wait, I can find the end by looking for:
  // } // close if (type === "message_new")
  const endSearch = `  } // close if (type === "message_new")`;
  const endReplace = `    });\n  } // close if (type === "message_new")`;
  code = code.replace(endSearch, endReplace);
  
  fs.writeFileSync('server.ts', code);
  console.log("Patched successfully!");
} else {
  console.log("Could not find search string.");
}
