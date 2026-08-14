const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldProm = `const handlePromotion = async (reqRole, giveRole, roleName) => {
         if (user.role < reqRole && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));`;

const newProm = `const handlePromotion = async (reqRole: number, giveRole: number, roleName: string) => {
         if (user.role < reqRole && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (giveRole >= user.role && !isAdmin) return await sendResponse("У вас недостаточно прав для выдачи этой роли!");
         const parsed = await parseTargetUser(message, args.slice(1));`;

code = code.replace(oldProm, newProm);
fs.writeFileSync('server.ts', code);
console.log("Promotion fixed");
