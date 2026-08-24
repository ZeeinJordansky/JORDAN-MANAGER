const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldGstaff = `      if (["/gstaff", "/гстафф", "/гсостав", "/gstaffs"].includes(rawCmd)) {
         if ((user.role || 0) < 9 && !isAdmin) {
            return await sendResponse("У вас недостаточно прав!");
         }
         const chatData = await getOrCreateChat(peerId);
         const isAdminChat = chatData.isAdminChat;
         if (peerId !== userId && !isAdminChat) {
           return await sendResponse("Данная команда доступна только в личных сообщениях сообщества или в админ-чате!");
         }

         const usersSnap = await firestoreDb.collection("users").get();`;

const newGstaff = `      if (["/gstaff", "/гстафф", "/гсостав", "/gstaffs"].includes(rawCmd)) {
         if ((user.role || 0) < 8 && !isAdmin) {
            return await sendResponse("У вас недостаточно прав!");
         }

         const usersSnap = await firestoreDb.collection("users").get();`;

code = code.replace(oldGstaff, newGstaff);
fs.writeFileSync('server.ts', code);
