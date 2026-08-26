import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add zrApplicationStateMap and fetchVkFirstName
if 'zrApplicationStateMap' not in code:
    code = code.replace(
        'const userCache = new Map<number, any>();',
        'const userCache = new Map<number, any>();\nconst zrApplicationStateMap = new Map<number, { step: number; answers: Record<number, string>; lastMsgId?: number }>();'
    )

if 'async function fetchVkFirstName' not in code:
    fn_code = '''async function fetchVkFirstName(userId: number): Promise<string> {
  const fullName = await fetchVkFullName(userId);
  if (fullName) {
    return fullName.split(" ")[0] || fullName;
  }
  return "Пользователь";
}

async function fetchVkFullName'''
    code = code.replace('async function fetchVkFullName', fn_code)

# 2. Update getmute and getwarn responses
old_getmute_getwarn_pattern = re.compile(r'if \(rawCmd === "/getmute".*?if \(rawCmd === "/getwarn".*?return await sendResponse\(`У пользователя \[id\$\{targetId\}\|\$\{targetName\}\] нет активных предупреждений\.\`\);.*?\}', re.DOTALL)

new_getmute_getwarn = '''if (rawCmd === "/getmute" || rawCmd === "/инфомут" || rawCmd === "/гетмут" || rawCmd === "/чекмут" || rawCmd === "/чекмуты" || rawCmd === "/проверитьмут") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const tUser = await getOrCreateUser(targetId);
         const targetName = tUser.fullName || tUser.nick || (await fetchVkFullName(targetId)) || "пользователя";
         if (tUser.muteUntil && tUser.muteUntil > Date.now()) {
            const mUser = tUser.muteBy ? await getOrCreateUser(tUser.muteBy) : null;
            const mName = mUser ? (mUser.fullName || mUser.nick || (await fetchVkFullName(tUser.muteBy)) || "Модератор") : "Модератор";
            const modStr = tUser.muteBy ? `[id${tUser.muteBy}|${mName}]` : "[id1|Система]";
            const reasonStr = tUser.muteReason || "без причины";
            const dateStr = fmtD(tUser.muteDate || Date.now());
            return await sendResponse(`Информация о активной блокировке чата [id${targetId}|${targetName}]\n\n${modStr} | ${reasonStr} | ${dateStr}`);
         } else {
            return await sendResponse("У пользователя отсутствует активная блокировка чата.");
         }
      }

      if (rawCmd === "/getwarn" || rawCmd === "/getwarns" || rawCmd === "/инфоварн" || rawCmd === "/гетварн" || rawCmd === "/чекварн" || rawCmd === "/чекварны" || rawCmd === "/проверитьварн") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const tUser = await getOrCreateUser(targetId);
         const targetName = tUser.fullName || tUser.nick || (await fetchVkFullName(targetId)) || "пользователя";
         const warnsCount = tUser.warnings || 0;
         if (warnsCount > 0) {
            const mUser = tUser.warnBy ? await getOrCreateUser(tUser.warnBy) : null;
            const mName = mUser ? (mUser.fullName || mUser.nick || (await fetchVkFullName(tUser.warnBy)) || "Модератор") : "Модератор";
            const modStr = tUser.warnBy ? `[id${tUser.warnBy}|${mName}]` : "[id1|Система]";
            const reasonStr = tUser.warnReason || "без причины";
            const dateStr = fmtD(tUser.warnDate || Date.now());
            return await sendResponse(`Информация о активной блокировке чата [id${targetId}|${targetName}]\n\n${modStr} | ${reasonStr} | ${dateStr}`);
         } else {
            return await sendResponse("У пользователя отсутствует активная блокировка чата.");
         }
      }'''

code, count = old_getmute_getwarn_pattern.subn(new_getmute_getwarn, code)
print(f"Replaced getmute/getwarn: {count}")

# 3. Add checkHierarchy to /snick and /rnick
old_snick = 'if (["/snick", "/сник", "/ник"].includes(rawCmd)) {\n        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");\n        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;\n        const parsed = await parseTargetUser(message, args.slice(1));\n        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");'
new_snick = 'if (["/snick", "/сник", "/ник"].includes(rawCmd)) {\n        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");\n        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;\n        const parsed = await parseTargetUser(message, args.slice(1));\n        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");\n        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");'

if old_snick in code:
    code = code.replace(old_snick, new_snick)
    print("Added checkHierarchy to /snick")

old_rnick = 'if (rawCmd === "/rnick" || rawCmd === "/рник") {\n        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");\n        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;\n        const parsed = await parseTargetUser(message, args.slice(1));\n        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");'
new_rnick = 'if (rawCmd === "/rnick" || rawCmd === "/рник") {\n        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");\n        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;\n        const parsed = await parseTargetUser(message, args.slice(1));\n        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");\n        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");'

if old_rnick in code:
    code = code.replace(old_rnick, new_rnick)
    print("Added checkHierarchy to /rnick")

# 4. Remove /quote handler
quote_handler_pattern = re.compile(r'// 1\. /цитата\n\s*if \(rawCmd === "/цитата"\) \{.*?\n\s*\}', re.DOTALL)
code, q_count = quote_handler_pattern.subn('', code)
print(f"Removed /quote handler: {q_count}")

# 5. Update /help text and cmd_help_main
old_help_user_cmds = '**/q** - Покинуть беседу.\\n**/обнять** - Обнять пользователя.\\n**/поцеловать** - Поцеловать пользователя.\\n**/пнуть** - Пнуть пользователя.\\n**/цитата** - Создать цитату из сообщения.\\n**/bitcoin** - График курса биткоина.'
new_help_user_cmds = '**/q** - Покинуть беседу.'

code = code.replace(old_help_user_cmds, new_help_user_cmds)

# 6. Update /gamehelp text
old_gamehelp_target = '`/клан - Информация о клане и клановые команды.\\n` +'
new_gamehelp_target = '`/клан - Информация о клане и клановые команды.\\n` +\n          `/обнять - Обнять пользователя.\\n` +\n          `/поцеловать - Поцеловать пользователя.\\n` +\n          `/пнуть - Пнуть пользователя.\\n` +\n          `/bitcoin - График курса биткоина.\\n` +'

if old_gamehelp_target in code:
    code = code.replace(old_gamehelp_target, new_gamehelp_target)
    print("Updated /gamehelp text")

# 7. Update /alt and cmd_alt_main text
old_alt_cmds = '**/q** -> /leave, /выйти, /лив, /ливать, /покинуть\\n**/hug** -> /обнять, /обнимашки, /обнять_пользователя\\n**/kiss** -> /поцелуй, /поцеловать, /чмок\\n**/kick_fun** -> /пнуть, /удар, /ударить\\n**/quote** -> /цит, /цитата\\n**/bitcoin** -> /btc, /бтк, /биткоин'
new_alt_cmds = '**/q** -> /leave, /выйти, /лив, /ливать, /покинуть\\n**/hug** -> /hug, /обнять, /обнимашки, /обнять_пользователя\\n**/kiss** -> /kiss, /чмок, /поцелуй, /поцеловать\\n**/kick_fun** -> /kick_fun, /пнуть, /удар, /ударить\\n**/bitcoin** -> /btc, /bitcoin, /биткоин, /бтк'

code = code.replace(old_alt_cmds, new_alt_cmds)

old_alt_cmds_2 = '**/q** -> /лив, /ливать, /выйти, /покинуть\\n**/hug** -> /обнять, /обнимашки, /обнять_пользователя\\n**/kiss** -> /поцеловать, /чмок, /поцелуй\\n**/kick_fun** -> /пнуть, /удар, /ударить\\n**/quote** -> /цитата, /цит\\n**/bitcoin** -> /btc, /биткоин, /бтк'
new_alt_cmds_2 = '**/q** -> /leave, /выйти, /лив, /ливать, /покинуть\\n**/hug** -> /hug, /обнять, /обнимашки, /обнять_пользователя\\n**/kiss** -> /kiss, /чмок, /поцелуй, /поцеловать\\n**/kick_fun** -> /kick_fun, /пнуть, /удар, /ударить\\n**/bitcoin** -> /btc, /bitcoin, /биткоин, /бтк'

code = code.replace(old_alt_cmds_2, new_alt_cmds_2)

# 8. Add "/заявка", "/зр", "/заявказр" to allowedInDm
old_allowed_dm = 'allowedInDm = new Set([\n          ...ALL_GAME_CMDS,'
new_allowed_dm = 'allowedInDm = new Set([\n          ...ALL_GAME_CMDS,\n          "/заявка", "/зр", "/заявказр",'
if old_allowed_dm in code:
    code = code.replace(old_allowed_dm, new_allowed_dm)
    print("Added /заявка to allowedInDm")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied initial script changes successfully!")
