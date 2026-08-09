import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldGiveBusiness = `      if (rawCmd === "/givebusiness") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const count = parseInt(args.find(a => /^\\d+$/.test(a)) || "0");
        if (!parsed.targetId || count <= 0) return await sendResponse("Используйте: /givebusiness [кол-во] [Ссылка|Имя Фамилия]");
        return await promptAdminConfirm("givebusiness", parsed.targetId, parsed.targetName, \`Вы собираетесь выдать бизнесы пользователю [id\${parsed.targetId}|\${parsed.targetName}]\`, count);
      }`;

const newGiveBusiness = `      if (rawCmd === "/givebusiness") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        // Expect /givebusiness @user typeId count
        const nums = args.filter(a => /^\\d+$/.test(a)).map(Number);
        // Sometimes the user tag might contain digits (like [id123|name]), but parseTargetUser handles it.
        // We can just rely on args. The first pure number is typeId, the second is count.
        // But parseTargetUser removes the mention.
        const typeId = nums[0];
        const count = nums[1] || 1;
        
        if (!parsed.targetId || !typeId || typeId < 1 || typeId > 10 || count <= 0) {
           return await sendResponse("Используйте: /givebusiness [Ссылка|Имя Фамилия] [Тип бизнеса 1-10] [Кол-во]");
        }
        
        return await promptAdminConfirm("givebusiness", parsed.targetId, parsed.targetName, \`Вы собираетесь выдать \${count} бизнес-(ов) типа \${typeId} пользователю [id\${parsed.targetId}|\${parsed.targetName}]\`, { typeId, count });
      }`;

code = code.replace(oldGiveBusiness, newGiveBusiness);

const oldAdminApply = `      } else if (conf.type === "givebusiness") {
        await updateUser(conf.targetId, { businesses: (targetUser.businesses || 0) + conf.value, bizProducts: (targetUser.bizProducts || 0) + (conf.value * 24) });
        successText = \`[id\${userId}|\${conf.adminName}] выдал(-а) \${conf.value} бизнес-(ов) пользователю [id\${conf.targetId}|\${conf.targetName}]\`;
      } else if (conf.type === "resetbusiness") {`;

const newAdminApply = `      } else if (conf.type === "givebusiness") {
        const typeId = conf.value?.typeId || 1;
        const count = conf.value?.count || conf.value || 1;
        
        const extra: any = { 
           businesses: (targetUser.businesses || 0) + count, 
           bizProducts: (targetUser.bizProducts || 0) + (count * 24),
           bizType: typeId
        };
        if ((targetUser.businesses || 0) === 0) {
           extra.bizExpireAt = Date.now() + 5 * 3600 * 1000;
           extra.lastBizCollectTime = Math.floor(Date.now() / 1000);
        }

        await updateUser(conf.targetId, extra);
        successText = \`[id\${userId}|\${conf.adminName}] выдал(-а) \${count} бизнес-(ов) типа \${typeId} пользователю [id\${conf.targetId}|\${conf.targetName}]\`;
      } else if (conf.type === "resetbusiness") {`;

code = code.replace(oldAdminApply, newAdminApply);

fs.writeFileSync('server.ts', code);
