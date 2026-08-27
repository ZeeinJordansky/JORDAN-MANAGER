const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
const search = `    } catch (error) {\n      console.error("Error processing message:", error); fs.appendFileSync("error.log", (error.stack || error) + "\\n"); \n    }\n  }\n}`;
// Wait, I will just see what happens if I remove one } at the end.
