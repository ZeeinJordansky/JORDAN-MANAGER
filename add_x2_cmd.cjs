const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      if (rawCmd === "/tegall") return await handleToggle(rawCmd, "antiTegAll", "включил(-а) систему Анти-тег всех участников", "выключил(-а) систему Анти-тег всех участников");`;

const replacement = `      if (rawCmd === "/tegall") return await handleToggle(rawCmd, "antiTegAll", "включил(-а) систему Анти-тег всех участников", "выключил(-а) систему Анти-тег всех участников");

      if (rawCmd === "/х2" || rawCmd === "/x2") {
        if (!isAdmin && user.role < 12) return await sendResponse("У вас недостаточно прав!");
        x2ModeActive = !x2ModeActive;
        x2ManualOverride = true;
        
        const extraOpts: any = {};
        try {
          const imgUrl = x2ModeActive 
            ? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600" 
            : "https://images.unsplash.com/photo-1616719125272-3591461ffea0?w=600";
          const upRes = await uploadPhoto(peerId, imgUrl);
          if (upRes.attachment) extraOpts.attachment = upRes.attachment;
        } catch(e) {}
        
        const txt = x2ModeActive ? "🎉 Х2 режим был включён!" : "🛑 Х2 режим был отключён!";
        return await sendResponse(txt, extraOpts);
      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("X2 Command added!");
} else {
    console.log("Target not found!");
}
