const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `         await updateUser(parsed.targetId, {
            muteUntil,
            muteReason: reason,
            mutePeerId: peerId
         });
         await executeVkMute(peerId, parsed.targetId, timeMin * 60);

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId }) }, color: "positive" }],`;

const replacementStr = `         await updateUser(parsed.targetId, {
            muteUntil,
            muteReason: reason,
            mutePeerId: peerId
         });
         targetU.muteUntil = muteUntil;
         targetU.muteReason = reason;
         targetU.mutePeerId = peerId;
         userCache.set(parsed.targetId, targetU);
         await executeVkMute(peerId, parsed.targetId, timeMin * 60);

         const keyboard = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("SUCCESS: Updated /mute targetU cache and button payload");
} else {
  console.log("ERROR: targetStr not found");
}
