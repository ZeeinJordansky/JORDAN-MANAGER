const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexGetMute = /      if \(rawCmd === "\/getmute" \|\| rawCmd === "\/инфомут"\) \{[\s\S]*?      \}/;
const replaceGetMute = `      if (rawCmd === "/getmute" || rawCmd === "/инфомут") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const { text } = await getStatsMutePage(targetId);
         return await sendResponse(text);
      }`;

if (regexGetMute.test(code)) {
  code = code.replace(regexGetMute, replaceGetMute);
  console.log("Patched getmute successfully!");
}

const regexGetWarn = /      if \(rawCmd === "\/getwarn" \|\| rawCmd === "\/getwarns" \|\| rawCmd === "\/инфоварн"\) \{[\s\S]*?      \}/;
const replaceGetWarn = `      if (rawCmd === "/getwarn" || rawCmd === "/getwarns" || rawCmd === "/инфоварн") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const { text } = await getStatsWarnsPage(targetId);
         return await sendResponse(text);
      }`;

if (regexGetWarn.test(code)) {
  code = code.replace(regexGetWarn, replaceGetWarn);
  console.log("Patched getwarn successfully!");
}

fs.writeFileSync('server.ts', code);
