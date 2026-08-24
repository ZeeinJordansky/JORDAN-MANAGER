const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");
code = code.replace("if (!chatData || !user || (!user.fullName || user.fullName.startsWith(\"User\")))", "if (!chatData || !user)");
fs.writeFileSync("server.ts", code);
