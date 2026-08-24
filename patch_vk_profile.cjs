const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const profanityFunction = `
function maskProfanity(text: string): string {
  if (!text) return text;
  const profanities = [
    /ху[йяеёи]/gi, /пизд/gi, /еба/gi, /ёба/gi, /ебу/gi, /блуд/gi, /бляд/gi, /блят/gi, /залуп/gi, /муда/gi, /пидор/gi, /педик/gi, /шлюх/gi, /гондон/gi, /гандон/gi, /сука/gi, /суки/gi
  ];
  let masked = text;
  profanities.forEach(regex => {
    masked = masked.replace(regex, "#####");
  });
  return masked;
}
`;

const vkProfilePageCode = `
const getVkProfileInfoPage = async (targetId: number) => {
  try {
    const res = await vkApi.get("users.get", {
      params: {
        access_token: VK_TOKEN,
        v: "5.199",
        user_ids: targetId,
        fields: "bdate,sex,status,last_seen,is_closed,counters,city,home_town,schools,occupation,interests,music,movies,tv,books,games,quotes"
      }
    });

    if (!res.data || !res.data.response || res.data.response.length === 0) {
      return { text: "Ошибка: не удалось получить данные пользователя.", keyboard: { inline: true, buttons: [] } };
    }

    const u = res.data.response[0];
    const sexStr = u.sex === 1 ? "Женский" : (u.sex === 2 ? "Мужской" : "Не указан");
    const isClosedStr = u.is_closed ? "Закрытый" : "Открытый";
    
    let lastSeenStr = "Скрыто";
    if (u.last_seen && u.last_seen.time) {
      lastSeenStr = fmtD(u.last_seen.time * 1000);
    }
    
    const counters = u.counters || {};
    const friendsCount = counters.friends ?? "Скрыто";
    const followersCount = counters.followers ?? "Скрыто";

    let text = \`Информация о VK профиле [id\${targetId}|\${u.first_name} \${u.last_name}]\\n\\n\`;
    text += \`| Имя Фамилия: \${u.first_name} \${u.last_name}\\n\`;
    text += \`| VK ID пользователя: \${targetId}\\n\\n\`;
    text += \`| Дата регистрации: Недоступно\\n\`; // API doesnt support
    text += \`| Дата рождения: \${u.bdate || "Скрыто"}\\n\\n\`;
    text += \`| Пол пользователя: \${sexStr}\\n\\n\`;
    
    if (u.status) {
      text += \`| Статус: \${maskProfanity(u.status)}\\n\\n\`;
    } else {
      text += \`| Статус: Не установлен\\n\\n\`;
    }
    
    text += \`| В сети: \${lastSeenStr}\\n\\n\`;
    text += \`| Тип профиля: \${isClosedStr}\\n\\n\`;
    text += \`| Кол-во друзей: \${friendsCount}\\n\`;
    text += \`| Кол-во подписчиков: \${followersCount}\\n\\n\`;
    
    if (u.city && u.city.title) {
      text += \`| Город: \${maskProfanity(u.city.title)}\\n\`;
    }
    if (u.home_town) {
      text += \`| Родной город: \${maskProfanity(u.home_town)}\\n\`;
    }
    
    if (u.schools && u.schools.length > 0) {
      const schools = u.schools.map((s: any) => s.name).filter(Boolean).join(", ");
      if (schools) text += \`| Школа: \${maskProfanity(schools)}\\n\`;
    }
    
    if (u.occupation && u.occupation.name) {
      text += \`| Работа: \${maskProfanity(u.occupation.name)}\\n\`;
    }
    
    if (u.interests) text += \`\\n| Интересы: \${maskProfanity(u.interests)}\\n\`;
    if (u.music) text += \`| Любимая музыка: \${maskProfanity(u.music)}\\n\`;
    if (u.movies) text += \`| Любимые фильмы: \${maskProfanity(u.movies)}\\n\`;
    if (u.tv) text += \`| Любимые телешоу: \${maskProfanity(u.tv)}\\n\`;
    if (u.books) text += \`| Любимые книги: \${maskProfanity(u.books)}\\n\`;
    if (u.games) text += \`| Любимые игры: \${maskProfanity(u.games)}\\n\`;
    if (u.quotes) text += \`| Любимые цитаты: \${maskProfanity(u.quotes)}\\n\`;

    return { text, keyboard: { inline: true, buttons: [[{ action: { type: "callback", label: "Назад в статистику", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" }]] } };
  } catch (e) {
    return { text: "Ошибка: не удалось получить данные пользователя.", keyboard: { inline: true, buttons: [] } };
  }
};
`;

code = code.replace(
  'const getStatsWarnsPage = async (targetId: number) => {',
  profanityFunction + '\n' + vkProfilePageCode + '\nconst getStatsWarnsPage = async (targetId: number) => {'
);

const buttonInjection = `  buttons.push([
    { action: { type: "callback", label: "Информация о VK профиле", payload: JSON.stringify({ cmd: "vk_profile_info", targetId }) }, color: "secondary" }
  ]);
  const keyboard = {`;

code = code.replace(
  '  const keyboard = {',
  buttonInjection
);

const eventInjection = `    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans" || cmd === "vk_profile_info") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
      } else if (cmd === "vk_profile_info") {
         resData = await getVkProfileInfoPage(payloadTargetId);
      } else if (cmd === "stats_warns") {`;

code = code.replace(
  `    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
      } else if (cmd === "stats_warns") {`,
  eventInjection
);

fs.writeFileSync('server.ts', code);
