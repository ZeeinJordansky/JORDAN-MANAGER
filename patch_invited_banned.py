import re

with open("server.ts", "r", encoding="utf-8") as f:
    code = f.read()

kick_banned = r'''
            const cbDate = (bData.until && bData.until > 0) ? formatMskDateAmPm(bData.until) : "Навсегда";
            const bReason = bData.reason || "без причины";
            const adminUser = await getOrCreateUser(bData.by || 0);
            const adminName = adminUser.fullName || "Модератор";
            const msg = `[id${memberId}|${memberName}] заблокирован(-а) в этой беседе [id${bData.by || 0}|${adminName}] по причине: ${bReason}\n| Блокировка до: ${cbDate}`;
            await sendVkMessage(VK_TOKEN, peerId, msg);
'''
code = re.sub(r'const msg = `\[id\$\{memberId\}\|\$\{memberName\}\] заблокирован\(-а\) в этой беседе.*?;', kick_banned.strip(), code, flags=re.DOTALL)

kick_gban = r'''
            const msg = `[id${memberId}|${memberName}] занесён(-на) в глобальную блокировку во всех беседах по причине: ${gbanReason}\n| Блокировка до: ${cbDate}`;
            await sendVkMessage(VK_TOKEN, peerId, msg);
'''
code = re.sub(r'const msg = `\[id\$\{memberId\}\|\$\{memberName\}\] находится в глобальном ЧС.*?;', kick_gban.strip(), code, flags=re.DOTALL)

with open("server.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Invited banned patched")
