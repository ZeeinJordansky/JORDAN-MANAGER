const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const snickStr = `
        const targetU = await getOrCreateUser(parsed.targetId);
        if (containsBadWord(nick)) return await sendResponse("Ник содержит запрещенные слова!");
        const chatNicks = targetU.chatNicks || {};
        chatNicks[peerId] = nick;
        await updateUser(parsed.targetId, { chatNicks });
`;

const rnickStr = `
        const targetU = await getOrCreateUser(parsed.targetId);
        const chatNicks = targetU.chatNicks || {};
        delete chatNicks[peerId];
        await updateUser(parsed.targetId, { chatNicks });
`;

code = code.replace(/await updateUser\(parsed\.targetId, { nickname: nick }\);/, snickStr.trim());
code = code.replace(/await updateUser\(parsed\.targetId, { nickname: null }\);/, rnickStr.trim());
code = code.replace(/const nick = targetU\.nickname \|\| "отсутствует";/g, `const chatNicks = targetU.chatNicks || {};
        const nick = chatNicks[peerId] || "отсутствует";`);
code = code.replace(/let nickStr = targetUser\.nickname \|\| "отсутствует";/g, `const chatNicks = targetUser.chatNicks || {};
        let nickStr = chatNicks[peerId] || "отсутствует";`);

const helperStr = `
const badWordsList = ["бля", "хуй", "пизд", "ебан", "ебуч", "пидор", "сука", "суч", "гондон", "гандон", "залуп", "шлюх", "мраз", "гей", "gey", "pidor", "hui", "xyi", "xui", "blya", "ebat", "eblan", "еблан"];
const containsBadWord = (text: string) => {
  const t = text.toLowerCase().replace(/[^а-яa-zё]/g, '');
  return badWordsList.some(w => t.includes(w));
};
`;

code = code.replace(/const app = express\(\);/, helperStr + "\nconst app = express();");
fs.writeFileSync('server.ts', code);
console.log("Nickname logic fixed");
