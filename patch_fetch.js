import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const newFunc = `async function fetchVkFullName(userId: number): Promise<string | null> {
  if (userId === 0) return null;
  const cached = vkNameCache.get(userId);
  if (cached && cached.exp > Date.now()) return cached.name;
  
  if (userId < 0) {
    try {
      const res = await fastVkCall("groups.getById", { group_id: String(-userId) }, true);
      if (res?.response?.[0]) {
        const name = res.response[0].name;
        vkNameCache.set(userId, { name, exp: Date.now() + 6 * 3600 * 1000 });
        return name;
      }
    } catch (e) {}
    return "Сообщество";
  }

  try {
    const res = await fastVkCall("users.get", { user_ids: String(userId) }, true);
    if (res?.response?.[0]) {
      const u = res.response[0];
      const name = \`\${u.first_name} \${u.last_name}\`;
      vkNameCache.set(userId, { name, exp: Date.now() + 6 * 3600 * 1000 });
      return name;
    }
  } catch (e) {}
  return null;
}`;

code = code.replace(/async function fetchVkFullName\([\s\S]+?return null;\n\}/, newFunc);
fs.writeFileSync('server.ts', code);
