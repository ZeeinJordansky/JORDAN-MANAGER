import sys

with open('server.ts') as f:
    text = f.read()

aplist_func = '''
  async function getChatAplistText(peerId: number): Promise<string> {
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

    const chatData = await getOrCreateChat(peerId);
    const apMap = (chatData.antiPunishment || {}) as Record<string, any>;
    const uIds = Object.keys(apMap).map(k => Number(k)).filter(id => id > 0);
    const count = uIds.length;
    const userPlural = pluralizeUsers(count);

    let out = `...::Список пользователей с функцией «Анти Наказание»::...\\n\\nВ этой беседе ${count} ${userPlural} имеют функцию «Анти Наказание».\\n\\n| Информация о пользователях с функцией «Анти Наказание»:\\n`;
    if (count === 0) {
      out += "\\nВ этой беседе отсутствуют пользователи с функцией «Анти Наказание»";
    } else {
      let idx = 1;
      for (const uId of uIds) {
        const item = apMap[String(uId)] || apMap[uId];
        const modId = item?.setBy || 0;
        let modName = "";
        if (modId > 0) {
          modName = vkNameCache.get(modId)?.name || userCache.get(modId)?.fullName || `id${modId}`;
          if (!vkNameCache.has(modId)) fetchVkFullName(modId).catch(() => {});
        }
        const pName = profMap.get(uId) || userCache.get(uId)?.fullName || `id${uId}`;
        const modPart = modId > 0 ? ` | Модератор - [id${modId}|${modName}]` : "";
        out += `\\n${idx}) [id${uId}|${pName}]${modPart}`;
        idx++;
      }
    }
    return out;
  }
'''

target_str = '  async function getChatNlistText(peerId: number): Promise<string> {'
if target_str in text:
    text = text.replace(target_str, aplist_func + '\n' + target_str, 1)
    print('Added getChatAplistText successfully.')
else:
    print('WARNING: target_str not found')

with open('server.ts', 'w') as f:
    f.write(text)
