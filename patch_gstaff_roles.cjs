const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldGstaff = `      if (["/gstaff", "/гстафф", "/гсостав", "/gstaffs"].includes(rawCmd)) {
         if ((user.role || 0) < 8 && !isAdmin) {
            return await sendResponse("У вас недостаточно прав!");
         }

         const usersSnap = await firestoreDb.collection("users").get();
         const staffByRole: Record<number, string[]> = {
           12: [],
           11: [],
           10: [],
           9: [],
           8: [],
           7: []
         };

         for (const doc of usersSnap.docs) {
           const u = doc.data();
           if (u.gban || u.blacklisted) continue;
           const uId = u.userId || parseInt(doc.id);
           if (!uId || isNaN(uId) || uId < 1) continue;

           let r = u.role || 0;
           if (uId === 778382713 || uId === 1) {
             r = 12;
           }
           if (r >= 7 && r <= 12) {
             const name = (u.globalNick && u.globalNick.trim()) || (u.nick && u.nick.trim()) || u.fullName || (await fetchVkFullName(uId)) || \`User\${uId}\`;
             if (!staffByRole[r].some(s => s.includes(\`id\${uId}|\`))) {
               staffByRole[r].push(\`- [id\${uId}|\${name}]\`);
             }
           }
         }

         if (!staffByRole[12].some(s => s.includes("id778382713|"))) {
           const ownerU = await getOrCreateUser(778382713);
           const ownerName = (ownerU.globalNick && ownerU.globalNick.trim()) || (ownerU.nick && ownerU.nick.trim()) || ownerU.fullName || (await fetchVkFullName(778382713)) || \`Владелец\`;
           staffByRole[12].unshift(\`- [id778382713|\${ownerName}]\`);
         }

         const fmtList = (arr: string[]) => arr.length > 0 ? arr.join("\\n") : " - Отсутствует";

         const text = \`Список руководства бота:

| Владелец чат-менеджера:
\${fmtList(staffByRole[12])}

| Зам. Владельца чат-менеджера:
\${fmtList(staffByRole[11])}

| Главный Руководитель:
\${fmtList(staffByRole[10])}

| Руководитель:
\${fmtList(staffByRole[9])}

| Осн. Зам. Руководителя:
\${fmtList(staffByRole[8])}

| Зам. Руководителя:
\${fmtList(staffByRole[7])}\`;`;

const newGstaff = `      if (["/gstaff", "/гстафф", "/гсостав", "/gstaffs"].includes(rawCmd)) {
         if ((user.role || 0) < 8 && !isAdmin) {
            return await sendResponse("У вас недостаточно прав!");
         }

         const usersSnap = await firestoreDb.collection("users").get();
         const staffByRole: Record<number, string[]> = {
           12: [], 11: [], 10.5: [], 10: [], 9: [], 8: [], 7.3: [], 7.2: [], 7.1: [], 7: []
         };

         for (const doc of usersSnap.docs) {
           const u = doc.data();
           if (u.gban || u.blacklisted) continue;
           const uId = u.userId || parseInt(doc.id);
           if (!uId || isNaN(uId) || uId < 1) continue;

           let r = u.role || 0;
           if (uId === 778382713 || uId === 1) {
             r = 12;
           }
           if (r >= 7 && r <= 12) {
             if (!staffByRole[r]) staffByRole[r] = [];
             const name = (u.globalNick && u.globalNick.trim()) || (u.nick && u.nick.trim()) || u.fullName || (await fetchVkFullName(uId)) || \`User\${uId}\`;
             if (!staffByRole[r].some(s => s.includes(\`id\${uId}|\`))) {
               staffByRole[r].push(\`- [id\${uId}|\${name}]\`);
             }
           }
         }

         if (!staffByRole[12].some(s => s.includes("id778382713|"))) {
           const ownerU = await getOrCreateUser(778382713);
           const ownerName = (ownerU.globalNick && ownerU.globalNick.trim()) || (ownerU.nick && ownerU.nick.trim()) || ownerU.fullName || (await fetchVkFullName(778382713)) || \`Владелец\`;
           staffByRole[12].unshift(\`- [id778382713|\${ownerName}]\`);
         }

         const fmtList = (arr: string[]) => (arr && arr.length > 0) ? arr.join("\\n") : " - Отсутствует";

         const text = \`Список руководства бота:

| Владелец чат-менеджера:
\${fmtList(staffByRole[12])}

| Зам. Владельца чат-менеджера:
\${fmtList(staffByRole[11])}

| Главный Руководитель:
\${fmtList(staffByRole[10.5])}

| Руководитель:
\${fmtList(staffByRole[10])}

| Осн. Зам. Руководителя:
\${fmtList(staffByRole[9])}

| Зам. Руководителя:
\${fmtList(staffByRole[8])}

| Главный тех. специалист:
\${fmtList(staffByRole[7.3])}

| Куратор тех. специалистов:
\${fmtList(staffByRole[7.2])}

| Тех. Специалист:
\${fmtList(staffByRole[7.1])}\`;`;

code = code.replace(oldGstaff, newGstaff);
fs.writeFileSync('server.ts', code);
