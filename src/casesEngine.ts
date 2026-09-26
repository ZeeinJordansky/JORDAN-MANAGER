export const CASE_BIZ_INFO: Record<number, { name: string; price: number }> = {
  1: { name: "Шиномонтажка", price: 250000 },
  2: { name: "Ларёк-кафе", price: 500000 },
  3: { name: "Парикмахерская", price: 750000 },
  4: { name: "Кафе", price: 1000000 },
  5: { name: "Ресторан", price: 2500000 },
  6: { name: "Ночной клуб", price: 5000000 },
  7: { name: "Автосалон", price: 12000000 },
  8: { name: "Отель 5*", price: 25000000 },
  9: { name: "Торговый центр", price: 60000000 },
  10: { name: "Аэропорт", price: 120000000 }
};

export interface CaseRewardItem {
  type: "money" | "beer" | "products" | "business" | "vip";
  weight: number;
  min?: number;
  max?: number;
  amount?: number;
  days?: number;
  bizTypes?: number[];
  isJackpot?: boolean;
}

export interface CaseDefinition {
  id: number;
  name: string;
  fullName: string;
  icon: string;
  price: number;
  aliases: string[];
  description: string;
  rewards: CaseRewardItem[];
}

export const CASES_LIST: CaseDefinition[] = [
  {
    id: 1,
    name: "Деревянный",
    fullName: "🪵 Деревянный кейс",
    icon: "🪵",
    price: 25000,
    aliases: ["деревянный", "дерево", "1", "wood"],
    description: "Деньги (8к-60к$), пиво (1-3 л), шанс на VIP на 1 день",
    rewards: [
      { type: "money", min: 8000, max: 15000, weight: 55 },
      { type: "money", min: 20000, max: 30000, weight: 30 },
      { type: "beer", min: 1, max: 3, weight: 10 },
      { type: "money", min: 45000, max: 60000, weight: 4.5 },
      { type: "vip", days: 1, weight: 0.5 }
    ]
  },
  {
    id: 2,
    name: "Пивной",
    fullName: "🍺 Пивной кейс",
    icon: "🍺",
    price: 50000,
    aliases: ["пивной", "пиво", "2", "beer"],
    description: "Литры пива (2-25 л), деньги (40к-60к$), VIP на 1 день",
    rewards: [
      { type: "beer", min: 2, max: 4, weight: 50 },
      { type: "beer", min: 5, max: 8, weight: 32 },
      { type: "money", min: 40000, max: 60000, weight: 10 },
      { type: "beer", min: 15, max: 25, weight: 7 },
      { type: "vip", days: 1, weight: 1.0 }
    ]
  },
  {
    id: 3,
    name: "Бронзовый",
    fullName: "📦 Бронзовый кейс",
    icon: "📦",
    price: 100000,
    aliases: ["бронзовый", "бронза", "3", "bronze"],
    description: "Деньги (35к-250к$), пиво (5-10 л), VIP на 1 день",
    rewards: [
      { type: "money", min: 35000, max: 60000, weight: 52 },
      { type: "money", min: 90000, max: 120000, weight: 30 },
      { type: "beer", min: 5, max: 10, weight: 10 },
      { type: "money", min: 18000, max: 250000, weight: 6.5 },
      { type: "vip", days: 1, weight: 1.5 }
    ]
  },
  {
    id: 4,
    name: "Железный",
    fullName: "⚙️ Железный кейс",
    icon: "⚙️",
    price: 250000,
    aliases: ["железный", "железо", "4", "iron"],
    description: "Деньги (90к-600к$), продукты (200-500), бизнес «Ларёк-кафе», VIP на 2 дня",
    rewards: [
      { type: "money", min: 90000, max: 150000, weight: 50 },
      { type: "money", min: 220000, max: 280000, weight: 31 },
      { type: "products", min: 200, max: 500, weight: 11 },
      { type: "money", min: 450000, max: 600000, weight: 6.5 },
      { type: "business", bizTypes: [2], weight: 1.0 }, // 1 бизнес «Ларёк-кафе»
      { type: "vip", days: 2, weight: 0.5 }
    ]
  },
  {
    id: 5,
    name: "Серебряный",
    fullName: "🥈 Серебряный кейс",
    icon: "🥈",
    price: 500000,
    aliases: ["серебряный", "серебро", "5", "silver"],
    description: "Деньги (180к-1.2кк$), продукты (600-1200), бизнес «Ларёк-кафе», VIP на 3 дня",
    rewards: [
      { type: "money", min: 180000, max: 320000, weight: 50 },
      { type: "money", min: 450000, max: 550000, weight: 30 },
      { type: "products", min: 600, max: 1200, weight: 11 },
      { type: "money", min: 900000, max: 1200000, weight: 6.5 },
      { type: "business", bizTypes: [2], weight: 1.5 }, // 1 бизнес «Ларёк-кафе»
      { type: "vip", days: 3, weight: 1.0 }
    ]
  },
  {
    id: 6,
    name: "Золотой",
    fullName: "🥇 Золотой кейс",
    icon: "🥇",
    price: 1000000,
    aliases: ["золотой", "золото", "6", "gold"],
    description: "Деньги (350к-2.3кк$), продукты (1500-2500), бизнес «Парикмахерская»/«Кафе», VIP на 5 дней",
    rewards: [
      { type: "money", min: 350000, max: 600000, weight: 52 },
      { type: "money", min: 900000, max: 1150000, weight: 30 },
      { type: "products", min: 1500, max: 2500, weight: 9 },
      { type: "money", min: 1800000, max: 2300000, weight: 6 },
      { type: "business", bizTypes: [3, 4], weight: 2.0 }, // Парикмахерская или Кафе
      { type: "vip", days: 5, weight: 1.0 }
    ]
  },
  {
    id: 7,
    name: "Бизнес",
    fullName: "🏢 Бизнес-кейс",
    icon: "🏢",
    price: 2500000,
    aliases: ["бизнес", "бизнесы", "7", "biz", "business"],
    description: "Продукты (1500-3000), бизнесы «Парикмахерская», «Кафе», «Ресторан», ДЖЕКПОТ: «Ночной клуб»",
    rewards: [
      { type: "products", min: 1500, max: 3000, weight: 45 },
      { type: "business", bizTypes: [3], weight: 30 }, // 1 бизнес Парикмахерская
      { type: "business", bizTypes: [4], weight: 15 }, // 1 бизнес Кафе
      { type: "business", bizTypes: [5], weight: 7 },  // 1 бизнес Ресторан
      { type: "business", bizTypes: [6], weight: 3, isJackpot: true } // ДЖЕКПОТ: Ночной клуб
    ]
  },
  {
    id: 8,
    name: "Фортуна",
    fullName: "⚡ Кейс Фортуна",
    icon: "⚡",
    price: 5000000,
    aliases: ["фортуна", "фортуну", "8", "fortune"],
    description: "Чистый риск: от 250к$ до СУПЕР-КУША 25,000,000$!",
    rewards: [
      { type: "money", min: 250000, max: 250000, weight: 67 },
      { type: "money", min: 3000000, max: 4200000, weight: 21 },
      { type: "money", min: 7500000, max: 7500000, weight: 7.5 },
      { type: "money", min: 13000000, max: 13000000, weight: 4.0 },
      { type: "money", min: 25000000, max: 25000000, weight: 0.5, isJackpot: true }
    ]
  },
  {
    id: 9,
    name: "Алмазный",
    fullName: "💎 Алмазный кейс",
    icon: "💎",
    price: 10000000,
    aliases: ["алмазный", "алмаз", "9", "diamond"],
    description: "Деньги (3.5кк-22кк$), бизнес «Ночной клуб» или «Автосалон», VIP на 14 дней, ДЖЕКПОТ: 30,000,000$",
    rewards: [
      { type: "money", min: 3500000, max: 6500000, weight: 53 },
      { type: "money", min: 9000000, max: 11000000, weight: 29 },
      { type: "business", bizTypes: [6, 7], weight: 9.5 }, // Ночной клуб или Автосалон
      { type: "money", min: 16000000, max: 22000000, weight: 6.0 },
      { type: "vip", days: 14, weight: 2.0 },
      { type: "money", min: 30000000, max: 30000000, weight: 0.5, isJackpot: true }
    ]
  },
  {
    id: 10,
    name: "Олигарх",
    fullName: "👑 Кейс Олигарха",
    icon: "👑",
    price: 25000000,
    aliases: ["олигарх", "олигарха", "10", "oligarch"],
    description: "Деньги (8кк-45кк$), продукты (15к-30к), VIP на 45 дней, СУПЕР-ДЖЕКПОТ: «Отель 5*» или «Торговый центр»",
    rewards: [
      { type: "money", min: 8000000, max: 14000000, weight: 55 },
      { type: "money", min: 22000000, max: 27000000, weight: 28 },
      { type: "products", min: 15000, max: 30000, weight: 8 },
      { type: "money", min: 38000000, max: 45000000, weight: 6 },
      { type: "vip", days: 45, weight: 2.5 }, // VIP на 45 дней
      { type: "business", bizTypes: [8, 9], weight: 0.5, isJackpot: true } // Отель 5* или Торговый центр
    ]
  }
];

export function findCaseByInput(input: string): CaseDefinition | null {
  const clean = input.trim().toLowerCase();
  for (const c of CASES_LIST) {
    if (String(c.id) === clean) return c;
    for (const a of c.aliases) {
      if (a === clean || clean.includes(a)) return c;
    }
  }
  return null;
}

export function buildCasesMenuPage(page: number, authorId: number): { text: string; keyboard: any } {
  const curPage = page === 2 ? 2 : 1;
  const pageCases = curPage === 1 ? CASES_LIST.slice(0, 5) : CASES_LIST.slice(5, 10);

  let text = `...::Кейсы в чат-менеджере (Стр. ${curPage}/2)::...\n\n`;
  for (const c of pageCases) {
    text += `${c.id}. ${c.fullName} — ${c.price.toLocaleString("ru-RU")}$\n`;
  }
  text += `\n| Открыть кейс: /открыть [номер или название] [кол-во]`;
  text += `\n| Пример: /открыть ${curPage === 1 ? "1" : "6"} или /открыть ${curPage === 1 ? "5 3" : "10 2"}`;
  text += `\n| (Максимум за один раз можно открыть до 10 кейсов)`;

  const buttons: any[] = [];
  // Каждая кнопка кейса строго на своей строке (1 строка - 1 кнопка)
  for (const c of pageCases) {
    buttons.push([
      { action: { type: "callback", label: `${c.icon} ${c.name}`, payload: JSON.stringify({ cmd: "case_view", caseId: c.id, authorId }) }, color: "secondary" }
    ]);
  }

  // Строка навигации
  if (curPage === 1) {
    buttons.push([
      { action: { type: "callback", label: "➡️ Следующая страница (6-10)", payload: JSON.stringify({ cmd: "cases_page", page: 2, authorId }) }, color: "primary" }
    ]);
  } else {
    buttons.push([
      { action: { type: "callback", label: "⬅️ Предыдущая страница (1-5)", payload: JSON.stringify({ cmd: "cases_page", page: 1, authorId }) }, color: "primary" }
    ]);
  }

  return { text, keyboard: { inline: true, buttons } };
}

export function buildCaseViewMenu(caseId: number, authorId: number): { text: string; keyboard: any } {
  const c = CASES_LIST.find(x => x.id === caseId) || CASES_LIST[0];

  let text = `...::${c.fullName}::...\n\n`;
  text += `| Стоимость: ${c.price.toLocaleString("ru-RU")}$\n\n`;
  text += `Нажмите «Содержимое», чтобы узнать список всех наград, или выберите количество для быстрого открытия:`;

  const pageBack = c.id <= 5 ? 1 : 2;
  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "📦 Содержимое", payload: JSON.stringify({ cmd: "case_contents", caseId: c.id, authorId }) }, color: "primary" }
      ],
      [
        { action: { type: "callback", label: "Открыть 1 шт.", payload: JSON.stringify({ cmd: "case_open", caseId: c.id, count: 1, authorId }) }, color: "positive" }
      ],
      [
        { action: { type: "callback", label: "Открыть 5 шт.", payload: JSON.stringify({ cmd: "case_open", caseId: c.id, count: 5, authorId }) }, color: "positive" }
      ],
      [
        { action: { type: "callback", label: "Открыть 10 шт.", payload: JSON.stringify({ cmd: "case_open", caseId: c.id, count: 10, authorId }) }, color: "positive" }
      ],
      [
        { action: { type: "callback", label: "🔙 Назад к списку кейсов", payload: JSON.stringify({ cmd: "cases_page", page: pageBack, authorId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
}

export function buildCaseContentsMenu(caseId: number, authorId: number): { text: string; keyboard: any } {
  const c = CASES_LIST.find(x => x.id === caseId) || CASES_LIST[0];

  let text = `...::Содержимое: ${c.fullName}::...\n\n`;
  text += `| Стоимость открытия: ${c.price.toLocaleString("ru-RU")}$\n\n`;
  text += `📋 Список наград и шансы дропа:\n`;

  for (const r of c.rewards) {
    let rewardDesc = "";
    if (r.type === "money") {
      if (r.min === r.max) {
        rewardDesc = `💵 Деньги: ${r.min?.toLocaleString("ru-RU")}$`;
      } else {
        rewardDesc = `💵 Деньги: от ${r.min?.toLocaleString("ru-RU")}$ до ${r.max?.toLocaleString("ru-RU")}$`;
      }
    } else if (r.type === "beer") {
      rewardDesc = `🍺 Пиво: от ${r.min} до ${r.max} л`;
    } else if (r.type === "products") {
      rewardDesc = `📦 Продукты: от ${r.min?.toLocaleString("ru-RU")} до ${r.max?.toLocaleString("ru-RU")} шт.`;
    } else if (r.type === "vip") {
      const daysText = r.days === 1 ? "1 день" : (r.days && r.days < 5 ? `${r.days} дня` : `${r.days} дней`);
      rewardDesc = `👑 VIP-статус на ${daysText}`;
    } else if (r.type === "business") {
      const bizNames = (r.bizTypes || []).map(bt => `«${CASE_BIZ_INFO[bt]?.name || "Бизнес"}»`).join(" или ");
      rewardDesc = `🏢 Бизнес: ${bizNames}`;
    }

    if (r.isJackpot) {
      rewardDesc += ` 🔥 (СУПЕР-КУШ!)`;
    }
    text += `• ${rewardDesc} — шанс: ${r.weight}%\n`;
  }

  const pageBack = c.id <= 5 ? 1 : 2;
  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "🔙 Назад к кейсу", payload: JSON.stringify({ cmd: "case_view", caseId: c.id, authorId }) }, color: "primary" }
      ],
      [
        { action: { type: "callback", label: "📋 К списку кейсов", payload: JSON.stringify({ cmd: "cases_page", page: pageBack, authorId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
}

export interface SingleDropResult {
  text: string;
  isJackpot: boolean;
  moneyWon: number;
  beerWon: number;
  productsWon: number;
  vipDaysWon: number;
  businessWon?: { name: string; price: number; type: number; count: number; asCash?: boolean };
}

export function rollCaseReward(caseDef: CaseDefinition, user: any): SingleDropResult {
  const totalWeight = caseDef.rewards.reduce((acc, r) => acc + r.weight, 0);
  let rand = Math.random() * totalWeight;
  let chosen: CaseRewardItem = caseDef.rewards[0];

  for (const r of caseDef.rewards) {
    if (rand <= r.weight) {
      chosen = r;
      break;
    }
    rand -= r.weight;
  }

  const res: SingleDropResult = {
    text: "",
    isJackpot: !!chosen.isJackpot,
    moneyWon: 0,
    beerWon: 0,
    productsWon: 0,
    vipDaysWon: 0
  };

  if (chosen.type === "money") {
    const min = chosen.min || 1000;
    const max = chosen.max || min;
    const amount = Math.floor(min + Math.random() * (max - min + 1));
    res.moneyWon = amount;
    res.text = `💵 ${amount.toLocaleString("ru-RU")}$`;
  } else if (chosen.type === "beer") {
    const min = chosen.min || 1;
    const max = chosen.max || min;
    const amount = Math.floor(min + Math.random() * (max - min + 1));
    res.beerWon = amount;
    res.text = `🍺 ${amount} л пива`;
  } else if (chosen.type === "products") {
    const min = chosen.min || 100;
    const max = chosen.max || min;
    const amount = Math.floor(min + Math.random() * (max - min + 1));
    res.productsWon = amount;
    res.text = `📦 ${amount.toLocaleString("ru-RU")} продуктов для бизнеса`;
  } else if (chosen.type === "vip") {
    const days = chosen.days || 1;
    res.vipDaysWon = days;
    res.text = `👑 VIP-статус на ${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
  } else if (chosen.type === "business") {
    const bizTypes = chosen.bizTypes && chosen.bizTypes.length > 0 ? chosen.bizTypes : [1];
    const pickedType = bizTypes[Math.floor(Math.random() * bizTypes.length)];
    const bizInfo = CASE_BIZ_INFO[pickedType] || { name: "Бизнес", price: 500000 };

    // Проверяем, есть ли у пользователя уже бизнес другого типа
    const userBizCount = user.businesses || 0;
    const userBizType = user.bizType || 0;

    if (userBizCount > 0 && userBizType !== pickedType) {
      // Конвертируем в гос. стоимость, чтобы не стирать существующий бизнес
      res.moneyWon = bizInfo.price;
      res.businessWon = { name: bizInfo.name, price: bizInfo.price, type: pickedType, count: 1, asCash: true };
      res.text = `🏢 1 шт. бизнеса «${bizInfo.name}» (начислена гос. стоимость +${bizInfo.price.toLocaleString("ru-RU")}$, т.к. у вас уже есть бизнес другого типа)`;
    } else {
      res.businessWon = { name: bizInfo.name, price: bizInfo.price, type: pickedType, count: 1, asCash: false };
      res.text = `🏢 1 шт. бизнеса «${bizInfo.name}»`;
    }
  }

  return res;
}
