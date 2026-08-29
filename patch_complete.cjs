const fs = require("fs");

let code = fs.readFileSync("server.ts", "utf8");

console.log("Applying patch_complete.js...");

// 1. Ensure Management Chat restriction function / check is in place
if (!code.includes("MANAGEMENT_ONLY_CMDS")) {
  const mgmtDef = `
const MANAGEMENT_ONLY_CMDS = new Set([
  "/gban", "/ungban", "/gbanlist", "/blacklist", "/rstats", "/grrole", "/banid", "/unbanid",
  "/infochat", "/infoid", "/addblack", "/unblack", "/gsnick", "/grnick", "/zunban", "/addzsr",
  "/addozsr", "/rebuke", "/unrebuke", "/addruk", "/addgr"
]);
const dmApplicationStates = new Map<number, { step: number; answers: string[] }>();
`;
  code = code.replace("const eventAnsweredMap = new Map<string, boolean>();", mgmtDef + "\nconst eventAnsweredMap = new Map<string, boolean>();");
}

// 2. Add /alt handler if missing
if (!code.includes("rawCmd === \"/alt\"")) {
  const altHandler = `
      if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы") {
        const altText = "...::Альтернативные команды бота::...\\n\\n" +
          "/help - /помощь, /хелп, /команды, /меню\\n" +
          "/mute - /мутит, /заткнуть, /тишина, /смют\\n" +
          "/warn - /варн, /предупреждение\\n" +
          "/ban - /бан, /забанить\\n" +
          "/kick - /кик, /кикнуть, /выгнать\\n" +
          "/unmute - /анмут, /размут, /снятьмут\\n" +
          "/unwarn - /анварн, /разварн, /снятьварн\\n" +
          "/unban - /разбан, /анбан, /снятьбан\\n" +
          "/gban - /гбан, /глобальныйбан\\n" +
          "/addblack - /аддблэк, /чсбота\\n" +
          "/stats - /стата, /я, /статс\\n" +
          "/olist - /онлайн, /ктоонлайн, /онлайнлист\\n" +
          "/offlinelist - /оффлайн, /оффлайнлист\\n" +
          "/giveowner - /передатьвладельца\\n" +
          "/addaccesslevel - /роль, /addlevel, /setlevel, /setaccesslevel, /addaccess, /выдатьроль\\n" +
          "/заместитель - /addzsr\\n" +
          "/озаместитель - /addozsr\\n" +
          "/addruk - /руководитель\\n" +
          "/renameroles - /изменитьроли\\n" +
          "/frozenlist - /замороженные\\n" +
          "/kickfrozen - /кикзамороженных\\n" +
          "/заявка - /податьзаявку";
        return await sendResponse(altText);
      }
`;
  code = code.replace(`if (rawCmd === "/help" || rawCmd === "/помощь"`, altHandler + `\n      if (rawCmd === "/help" || rawCmd === "/помощь"`);
}

// Save
fs.writeFileSync("server.ts", code);
console.log("Patch applied.");
