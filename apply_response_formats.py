import re

def apply_all():
    with open("server.ts", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Replace permission denied text
    content = content.replace(
        '"Ваш уровень прав недостаточен для использования этой команды."',
        '"❌ Ваш уровень прав недостаточен для этой команды."'
    )
    content = content.replace(
        '"Ваш уровень прав недостаточен для этой команды."',
        '"❌ Ваш уровень прав недостаточен для этой команды."'
    )

    # 2. Add formatting helper functions: formatMuteEndDate, formatStatsJoinedDate, formatStatsLastActivity
    date_helpers = '''function formatMuteEndDate(ms: number): string {
  if (!ms || ms <= 0) return "Навсегда";
  const d = new Date(ms + 3 * 3600000); // Moscow time UTC+3
  let hours = d.getUTCHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${hh}:${mm}:${ss} ${ampm} | ${day}.${month}.${year}`;
}

function formatStatsJoinedDate(ms?: number | null): string {
  if (!ms || ms <= 0) return "Неизвестно";
  const d = new Date(ms + 3 * 3600000);
  const monthsGen = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  return `${d.getUTCDate()} ${monthsGen[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatStatsLastActivity(ms?: number | null): string {
  if (!ms || ms <= 0) return "Отсутствует";
  const d = new Date(ms + 3 * 3600000);
  const daysOfWeek = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const monthsGen = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayName = daysOfWeek[d.getUTCDay()] || "понедельник";
  const dd = pad(d.getUTCDate());
  const monthName = monthsGen[d.getUTCMonth()] || "января";
  const year = d.getUTCFullYear();
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${hh} ч. ${mm} м. ${ss} с. (МСК) | ${dayName}, ${dd} ${monthName}, ${year} год`;
}

'''
    if "function formatMuteEndDate" not in content:
        content = content.replace("function formatNumberDots", date_helpers + "function formatNumberDots", 1)

    # 3. Update getChatStaffText function
    old_staff_pattern = r'async function getChatStaffText\(peerId: number\): Promise<string> \{[\s\S]*?return `\.\.\.::Руководство беседы::\.\.\.[\s\S]*?\);?\s*\}'
    new_staff_func = '''async function getChatStaffText(peerId: number): Promise<string> {
    const { profiles } = await getChatMembers(peerId);
    const chatData = await getOrCreateChat(peerId);
    const roleUsers: { [role: number]: { id: number; name: string }[] } = {
      6: [], 5: [], 4: [], 3: [], 2: [], 1: []
    };

    for (const p of (profiles || [])) {
      if (p.id > 0) {
        const u = await getOrCreateUser(p.id);
        if (u.gban || u.blacklisted || (u.chatBans && u.chatBans[peerId])) continue;
        if (u.role && u.role >= 8) continue;

        const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
        const gRole = u.role && u.role < 8 ? u.role : 0;
        const effRole = Math.max(gRole, cRole);
        const r = effRole >= 1 && effRole <= 6 ? Math.floor(effRole) : 0;

        if (r >= 1 && r <= 6) {
          const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (u.fullName || u.nick || `User${p.id}`);
          roleUsers[r].push({ id: p.id, name });
        }
      }
    }

    if (chatData?.ownerId && !roleUsers[6].some(u => u.id === chatData.ownerId)) {
      const ownerProfile = (profiles || []).find((p: any) => p.id === chatData.ownerId);
      const u = await getOrCreateUser(chatData.ownerId);
      const name = ownerProfile?.first_name && ownerProfile?.last_name 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : (u.fullName || u.nick || (await fetchVkFullName(chatData.ownerId)) || `User${chatData.ownerId}`);
      roleUsers[6].push({ id: chatData.ownerId, name });
    }

    let out = `🛡️ Список модерации беседы\\n\\n`;

    if (roleUsers[6].length > 0) {
      const title = roleUsers[6].length > 1 ? "Владельцы беседы" : "Владелец беседы";
      out += `${title}\\n${roleUsers[6].map(u => `— [id${u.id}|${u.name}]`).join("\\n")}\\n\\n`;
    }

    if (roleUsers[5].length > 0) {
      const title = roleUsers[5].length > 1 ? "Руководители беседы" : "Руководитель беседы";
      out += `${title}\\n${roleUsers[5].map(u => `— [id${u.id}|${u.name}]`).join("\\n")}\\n\\n`;
    }

    const hasAdmins = roleUsers[4].length > 0 || roleUsers[3].length > 0;
    if (hasAdmins) {
      out += `Администрация\\n`;
      if (roleUsers[4].length > 0) {
        const title = roleUsers[4].length > 1 ? "Главные Администраторы" : "Главный Администратор";
        out += `• ${title} — ${roleUsers[4].map(u => `[id${u.id}|${u.name}]`).join(", ")}\\n`;
      }
      if (roleUsers[3].length > 0) {
        const title = roleUsers[3].length > 1 ? "Администраторы" : "Администратор";
        out += `• ${title} — ${roleUsers[3].map(u => `[id${u.id}|${u.name}]`).join(", ")}\\n`;
      }
      out += `\\n`;
    }

    const hasModers = roleUsers[2].length > 0 || roleUsers[1].length > 0;
    if (hasModers) {
      out += `Модерация\\n`;
      if (roleUsers[2].length > 0) {
        const title = roleUsers[2].length > 1 ? "Старшие Модераторы" : "Старший Модератор";
        out += `• ${title} — ${roleUsers[2].map(u => `[id${u.id}|${u.name}]`).join(", ")}\\n`;
      }
      if (roleUsers[1].length > 0) {
        const title = roleUsers[1].length > 1 ? "Модераторы" : "Модератор";
        out += `• ${title} — ${roleUsers[1].map(u => `[id${u.id}|${u.name}]`).join(", ")}\\n`;
      }
    }

    return out.trim();
  }'''
    content = re.sub(old_staff_pattern, new_staff_func, content, count=1)

    # 4. Update getChatNlistText function
    old_nlist_pattern = r'async function getChatNlistText\(peerId: number\): Promise<string> \{[\s\S]*?return out;\s*\}'
    new_nlist_func = '''async function getChatNlistText(peerId: number, page: number = 1): Promise<{ text: string, keyboard?: any }> {
    let profiles: any[] = [];
    try {
      if (peerId > 2000000000) {
        const res = await getChatMembers(peerId);
        profiles = res.profiles || [];
      }
    } catch (e) {}

    const profMap = new Map<number, string>();
    for (const p of profiles) {
      if (p.id > 0) {
        profMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim());
      }
    }

    const allUsers = await getAllUsers().catch(() => []);
    const foundMap = new Map<number, { name: string; nick: string; setBy?: number }>();

    for (const u of (allUsers || [])) {
      const uId = Number(u.userId);
      if (!uId || uId <= 0) continue;
      const nick = u.chatNicks?.[peerId] || u.chatNicks?.[String(peerId)];
      if (nick) {
        const pName = profMap.get(uId) || u.fullName || u.nick || `id${uId}`;
        const setBy = u.chatNickSetBy?.[peerId] || u.chatNickSetBy?.[String(peerId)];
        foundMap.set(uId, { name: pName, nick, setBy });
      }
    }

    userCache.forEach((u, id) => {
      const uId = Number(id);
      if (uId > 0 && !foundMap.has(uId)) {
        const nick = u.chatNicks?.[peerId] || u.chatNicks?.[String(peerId)];
        if (nick) {
          const pName = profMap.get(uId) || u.fullName || u.nick || `id${uId}`;
          const setBy = u.chatNickSetBy?.[peerId] || u.chatNickSetBy?.[String(peerId)];
          foundMap.set(uId, { name: pName, nick, setBy });
        }
      }
    });

    const count = foundMap.size;
    let out = `👥 Пользователи с установленным Nick_Name\\n\\n`;

    if (count === 0) {
      out += "В этой беседе отсутствуют пользователи с установленным Nick_Name.";
      return { text: out };
    }

    const items = Array.from(foundMap.entries());
    const perPage = 15;
    const totalPages = Math.ceil(items.length / perPage);
    const currentPage = Math.max(1, Math.min(totalPages, page));
    const startIdx = (currentPage - 1) * perPage;
    const pageItems = items.slice(startIdx, startIdx + perPage);

    for (const [uId, item] of pageItems) {
      const modId = item.setBy || 0;
      let modMention = "[id1|Администратор]";
      if (modId > 0) {
        const modName = vkNameCache.get(modId)?.name || userCache.get(modId)?.fullName || (await fetchVkFullName(modId)) || `id${modId}`;
        modMention = `[id${modId}|${modName}]`;
      }
      out += `[id${uId}|${item.name}] — ${item.nick}\\n└ Установлен модератором ${modMention}\\n\\n`;
    }

    out += `Всего: ${count}`;

    let keyboard: any = undefined;
    if (totalPages > 1) {
      const navButtons: any[] = [];
      if (currentPage > 1) {
        navButtons.push({ action: { type: "callback", label: "« Назад", payload: JSON.stringify({ cmd: "nlist_page", p: currentPage - 1 }) }, color: "primary" });
      }
      if (currentPage < totalPages) {
        navButtons.push({ action: { type: "callback", label: "Вперёд »", payload: JSON.stringify({ cmd: "nlist_page", p: currentPage + 1 }) }, color: "primary" });
      }
      keyboard = { inline: true, buttons: [navButtons] };
    }

    return { text: out, keyboard };
  }'''
    content = re.sub(old_nlist_pattern, new_nlist_func, content, count=1)

    # 5. Update /nlist command handler to handle { text, keyboard }
    old_nlist_cmd = '''if (["/nlist", "/никлист", "/списокников", "/списокникнеймов", "/nicks", "/ники"].includes(rawCmd)) {
const effRole = calculateEffectiveRole(user, peerId);
const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
if (effRole < 1 && !isVkAdmin && !isAdmin && userId !== 778382713) {
return await sendResponse("Ваш уровень прав недостаточен для использования этой команды.");
}
const list = await getChatNlistText(peerId);
return await sendResponse(list);
}'''
    new_nlist_cmd = '''if (["/nlist", "/никлист", "/списокников", "/списокникнеймов", "/nicks", "/ники"].includes(rawCmd)) {
const effRole = calculateEffectiveRole(user, peerId);
const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
if (effRole < 1 && !isVkAdmin && !isAdmin && userId !== 778382713) {
return await sendResponse("❌ Ваш уровень прав недостаточен для этой команды.");
}
const { text: listText, keyboard } = await getChatNlistText(peerId, 1);
return await sendResponse(listText, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined });
}'''
    content = content.replace(old_nlist_cmd, new_nlist_cmd)

    # 6. Update /stats response in getStatsMainPage
    old_stats_str_pattern = r'let statsStr = `\.\.\.::Информация о \$\{formatUserMention\(targetId, "пользователе", "abl"\)\} в этой беседе::\.\.\.[\s\S]*?statsStr \+= `\| В беседу пригласил:\s*\$\{invitedByStr\}`;'

    new_stats_str = '''let joinedDateStr = formatStatsJoinedDate(joinedTs);
    let lastActStr = formatStatsLastActivity(rawAct);

    let statsStr = `📊 Информация о пользователе ${formatUserMention(targetId, targetName, "nom")} в этой беседе\\n\\n` +
      `🆔 VK ID: ${targetId}\\n` +
      `✏️ Nick_Name: ${nickStr === "отсутствует" ? "нету" : nickStr}\\n\\n` +
      `🛡️ Уровень прав: ${roleStr}\\n\\n` +
      `⚠️ Предупреждений: ${warnsCount}\\n` +
      `🔇 Блокировка чата: ${isMuted ? "да" : "нет"}\\n\\n` +
      `💬 Сообщений в беседе (С/В): ${todayMsgs}/${totalMsgs}\\n\\n` +
      `📅 В беседе с: ${joinedDateStr}\\n` +
      `🕐 Последняя активность: ${lastActStr}`;'''

    content = re.sub(old_stats_str_pattern, new_stats_str, content, count=1)

    # 7. Update /баланс response
    old_bal_pattern = r'const balText = `💳 Финансовый счёт[^\`]+`;'
    new_bal_str = '''const balText = `💳 Финансовый счёт пользователя ${formatUserMention(targetId, String(targetName), "nom")}\\n\\n` +
  `💵 Наличные: ${(targetUser.balance || 0).toLocaleString()}$\\n` +
  `🏦 Банк: ${(targetUser.bank || 0).toLocaleString()}$\\n` +
  `₿ Bitcoin: ${btcCount} BTC (~${btcValue.toLocaleString()}$)\\n\\n` +
  `💰 Общий баланс: ${totalBal.toLocaleString()}$`;'''
    content = re.sub(old_bal_pattern, new_bal_str, content, count=1)

    # 8. Update /chatid response
    old_chatid = '''if (["/chatid", "/чатайди", "/idchat", "/айдичат", "/чатид", "/идчат"].includes(rawCmd)) {
const chatId = peerId > 2000000000 ? peerId - 2000000000 : peerId;
return await sendResponse(`Peer_id беседы: ${peerId}
Id беседы: ${chatId}`);
}'''
    new_chatid = '''if (["/chatid", "/чатайди", "/idchat", "/айдичат", "/чатид", "/идчат"].includes(rawCmd)) {
const chatId = peerId > 2000000000 ? peerId - 2000000000 : peerId;
return await sendResponse(`💬 ID этой беседы: ${chatId}`);
}'''
    content = content.replace(old_chatid, new_chatid)

    # 9. Update /mute response
    old_mute_send = r'return await sendResponse\(`\$\{targetMentionDat\} выдана блокировка чата[\s\S]*?\| Блокировка чата действует до:[^\`]*`,\s*\{\s*noReply:\s*true,\s*keyboard:\s*JSON\.stringify\(keyboard\)\s*\}\);'
    new_mute_send = '''const endMuteStr = formatMuteEndDate(muteUntil);
const muteMsg = `🔇 Пользователю ${formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat")} выдана блокировка чата сроком на ${durationText} модератором ${formatUserMention(userId, String(fullName), "ins")} по причине: ${reason}\\n\\n` +
  `| Блокировка чата действует до: ${endMuteStr}\\n` +
  `| Префиксы для быстрого поиска: #MUTE #id${userId} #${parsed.targetId}`;

return await sendResponse(muteMsg, { noReply: true, keyboard: JSON.stringify(keyboard) });'''
    content = re.sub(old_mute_send, new_mute_send, content, count=1)

    # 10. Update /unmute response
    old_unmute_send = r'return await sendResponse\(`\$\{formatUserMention\(parsed\.targetId, "Пользователю", "dat"\)\} была снята блокировка чата \$\{formatModeratorMention\(userId\)\}\.`,\s*\{\s*noReply:\s*true\s*\}\);'
    new_unmute_send = '''return await sendResponse(`🔊 Пользователю ${formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat")} была снята блокировка чата модератором ${formatUserMention(userId, String(fullName), "ins")}.`, { noReply: true });'''
    content = re.sub(old_unmute_send, new_unmute_send, content, count=1)

    # 11. Update /warn response
    old_warn_send = r'let msg = `\$\{formatUserMention\(parsed\.targetId, "Пользователю", "dat"\)\} выдано предупреждение \$\{formatModeratorMention\(userId\)\} по причине: \$\{reason\}[\s\S]*?\| Кол-во предупреждений: \$\{newWarns\}`;'
    new_warn_send = '''let msg = `⚠️ Пользователю ${formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat")} выдано предупреждение (${newWarns}/3) модератором ${formatUserMention(userId, String(fullName), "ins")} по причине: ${reason}\\n\\n` +
  `| Префиксы для быстрого поиска: #WARN #id${userId} #${parsed.targetId}`;'''
    content = re.sub(old_warn_send, new_warn_send, content, count=1)

    # 12. Update /ban response
    old_ban_send = r'const banMsg = `\$\{targetMentionNom\} заблокирован\(-а\) в этой беседе[\s\S]*?\| Блокировка действует до:[^\`]*`;'
    new_ban_send = '''const banMsg = `🔒 Пользователю ${formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat")} выдана блокировка в этой беседе модератором ${formatUserMention(userId, String(fullName), "ins")} по причине: ${reason || "Не указана"}\\n\\n` +
  `| Префиксы для быстрого поиска: #BAN #id${userId} #${parsed.targetId}`;'''
    content = re.sub(old_ban_send, new_ban_send, content, count=1)

    # 13. Update /kick response
    old_kick_send = r'return await sendResponse\(`\$\{targetMentionNom\} был\(-а\) исключён\(-а\) из этой беседы \$\{formatModeratorMention\(userId\)\} по причине: \$\{reason\}`,\s*\{\s*noReply:\s*true,\s*keyboard:\s*keyboard \? JSON\.stringify\(keyboard\) : undefined\s*\}\);'
    new_kick_send = '''const kickMsg = `🚪 Пользователь ${formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "nom")} был(-а) исключён(-а) из этой беседы  модератором ${formatUserMention(userId, String(fullName), "ins")} по причине: ${reason}\\n\\n` +
  `| Префиксы для быстрого поиска: #KICK #id${userId} #${parsed.targetId}`;

return await sendResponse(kickMsg, { noReply: true, keyboard: keyboard ? JSON.stringify(keyboard) : undefined });'''
    content = re.sub(old_kick_send, new_kick_send, content, count=1)

    # 14. Update /clear response
    old_clear_send = r'if \(targetId\) \{\s*return await sendResponse\(`Было удалено \$\{countDeleted\} \$\{countWord\} от \$\{formatUserMention\(targetId, "пользователя", "gen"\)\} \$\{formatModeratorMention\(userId\)\}\.\n#clear \| #\$\{userId\} \| #\$\{targetId\}`,\s*\{ noReply: true \}\);\s*\} else \{\s*return await sendResponse\(`Было удалено \$\{countDeleted\} \$\{countWord\} \$\{formatModeratorMention\(userId\)\}\.\n#clear \| #\$\{userId\}`,\s*\{ noReply: true \}\);\s*\}'
    new_clear_send = '''if (targetId) {
  const targetU = await getOrCreateUser(targetId);
  const targetName = targetU.fullName || targetU.nick || `id${targetId}`;
  return await sendResponse(`🧹 ${countDeleted} ${countWord} было удалено от пользователя ${formatUserMention(targetId, targetName, "gen")} модератором ${formatUserMention(userId, String(fullName), "ins")}.`, { noReply: true });
} else {
  return await sendResponse(`🧹 ${countDeleted} ${countWord} было удалено модератором ${formatUserMention(userId, String(fullName), "ins")}.`, { noReply: true });
}'''
    content = re.sub(old_clear_send, new_clear_send, content, count=1)

    # 15. Update /snick & /rnick response
    old_snick_send = r'const chatNicks = targetU\.chatNicks \|\| \{\};\s*chatNicks\[peerId\] = nick;[\s\S]*?return await sendResponse\(`✏️ \$\{formatUserMention\(parsed\.targetId, "Пользователю", "dat"\)\} был установлен новый Nick_Name[^\`]*`,\s*\{\s*noReply:\s*true,\s*keyboard:\s*JSON\.stringify\(keyboard\)\s*\}\);'
    new_snick_send = '''const chatNicks = targetU.chatNicks || {};
const oldNick = chatNicks[peerId];
chatNicks[peerId] = nick;
const chatNickSetBy = targetU.chatNickSetBy || {};
chatNickSetBy[peerId] = userId;
const chatNickSetAt = targetU.chatNickSetAt || {};
chatNickSetAt[peerId] = Date.now();
await updateUser(parsed.targetId, { chatNicks, chatNickSetBy, chatNickSetAt });
const buttons: any[][] = [
[{ action: { type: "callback", label: "Удалить Nick_Name", payload: JSON.stringify({ cmd: "mod_rnick_callback", targetId: parsed.targetId, s: "rnick,nlist" }) }, color: "negative" }],
[{ action: { type: "callback", label: "Список пользователей с Nick_Name", payload: JSON.stringify({ cmd: "mod_nlist", targetId: parsed.targetId, s: "rnick,nlist" }) }, color: "secondary" }]
];
const keyboard = { inline: true, buttons };

const targetMention = formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat");
const modMention = formatUserMention(userId, String(fullName), "ins");

let snickMsg = "";
if (oldNick) {
  snickMsg = `✏️ Пользователю ${targetMention} изменён Nick_Name модератором ${modMention}\\n\\n` +
    `| Старый Nick_Name: ${oldNick}\\n` +
    `| Новый Nick_Name: ${nick}`;
} else {
  snickMsg = `✏️ Пользователю ${targetMention} установлен новый Nick_Name модератором ${modMention}\\n\\n` +
    `| Nick_Name: ${nick}`;
}

return await sendResponse(snickMsg, { noReply: true, keyboard: JSON.stringify(keyboard) });'''
    content = re.sub(old_snick_send, new_snick_send, content, count=1)

    old_rnick_send = r'return await sendResponse\(`\$\{formatUserMention\(parsed\.targetId, "Пользователю", "dat"\)\} удалён Nick_Name \$\{formatModeratorMention\(userId\)\}\.`,\s*\{\s*noReply:\s*true,\s*keyboard:\s*JSON\.stringify\(keyboard\)\s*\}\);'
    new_rnick_send = '''const targetMention = formatUserMention(parsed.targetId, targetU.fullName || targetU.nick || `User${parsed.targetId}`, "dat");
const modMention = formatUserMention(userId, String(fullName), "ins");
return await sendResponse(`✏️ Пользователю ${targetMention} снят Nick_Name модератором ${modMention}`, { noReply: true, keyboard: JSON.stringify(keyboard) });'''
    content = re.sub(old_rnick_send, new_rnick_send, content, count=1)

    # 16. Update argument error messages format across commands
    content = re.sub(
        r'Для использования этой команды вам нужно указать аргументы для неё\.\n\n\| Формат заполнения команды с аргументами:\s*([^\`\n]+)',
        r'👉🏻 Для того что бы использовать эту команду вам нужно заполнить аргументы в таком формате: \1',
        content
    )
    # Fix placeholders like @user -> [ссылка/упоминание], etc.
    content = content.replace('${rawCmd} @user срок причина', '${rawCmd} [ссылка/упоминание] [срок] [причина]')
    content = content.replace('${rawCmd} @user причина', '${rawCmd} [ссылка/упоминание] [причина]')
    content = content.replace('${rawCmd} @user ник', '${rawCmd} [ссылка/упоминание] [Ник]')
    content = content.replace('${rawCmd} @user', '${rawCmd} [ссылка/упоминание]')

    with open("server.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("Part 3 applied successfully!")

if __name__ == "__main__":
    apply_all()
