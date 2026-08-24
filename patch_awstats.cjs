const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For /statsimg
const oldImg = `        const isImmune = uRealRole >= 9 || isAdmin;
        
        if (!isSelf && !isImmune) {
           if (targetUser.gawstats || (targetUser.awstats && targetUser.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }`;
const newImg = `        if (!isSelf) {
           if (targetUser.gawstats || (targetUser.awstats && targetUser.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }`;
code = code.replace(oldImg, newImg);

// For /stats
const oldMain = `        const isImmune = uRealRole >= 9 || isAdmin;
        
        if (!isSelf && !isImmune) {
           if (targetU.gawstats || (targetU.awstats && targetU.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }`;
const newMain = `        if (!isSelf) {
           if (targetU.gawstats || (targetU.awstats && targetU.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }`;
code = code.replace(oldMain, newMain);

fs.writeFileSync('server.ts', code);
