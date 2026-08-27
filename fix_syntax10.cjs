const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/    \} catch \(error\) \{\n      console\.error\("Error processing message:", error\); fs\.appendFileSync\("error\.log", \(error\.stack \|\| error\) \+ "\\n"\); \n    \}\n  \}\n\}/g, '    } catch (error) {\n      console.error("Error processing message:", error); fs.appendFileSync("error.log", (error.stack || error) + "\\n"); \n    }\n  }');
fs.writeFileSync('server.ts', content, 'utf8');
