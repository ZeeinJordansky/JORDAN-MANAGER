import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import https from "https";
import admin from "firebase-admin";

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  httpsAgent: new https.Agent({ keepAlive: true }),
});
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import { createCanvas, loadImage, registerFont } from "canvas";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { CROCODILE_WORDS, sendVkMessage, editVkMessage, sendVkToast, answerVkEvent, formatTimeRemaining } from "./src/botGameEngine";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const firestoreDb = firebaseConfig.firestoreDatabaseId ? getFirestore(firebaseConfig.firestoreDatabaseId) : getFirestore();

// VK Config
const VK_TOKEN = process.env.VK_TOKEN || "vk1.a.0h8Yg41irrcMeHXWaKh_ukUXO8FfbVAu0DKZStvExHFXGiPQDEGd8CkYvlgCE6qG-BWVAUkvFV36N1GaAJaD4JG-WKcNBqjEwpBapyf5YIdLseKRon_aRiAQpfAbWtWI0NrYJohlWr4c34WPZjQ6PGgbK2G6xtwvlFALERy9pLfO7n8Ah_cr1Oyszl7vF7IFfQUHc4s8g7GFc7gWGmxZPQ";
const VK_GROUP_ID = process.env.VK_GROUP_ID || "239281784";
const CONFIRMATION_CODE = "29c9c74e";

const ROLES: Record<number, string> = {
  0: "ПОЛЬЗОВАТЕЛЬ",
  1: "МЛАДШИЙ МОДЕРАТОР",
  2: "МОДЕРАТОР",
  3: "СТАРШИЙ МОДЕРАТОР",
  4: "КУРАТОР",
  5: "ЗАМ. ГЛАВНОГО МОДЕРАТОРА",
  6: "ГЛАВНЫЙ МОДЕРАТОР",
  7: "ЗАМ. РУКОВОДИТЕЛЯ МОДЕРАЦИИ",
  8: "РУКОВОДИТЕЛЬ МОДЕРАЦИИ",
  9: "СПЕЦ. МОДЕРАТОР",
  10: "ЗАМ. СПЕЦИАЛЬНОГО РУКОВОДИТЕЛЯ",
  11: "ОСН. ЗАМ. СПЕЦИАЛЬНОГО РУКОВОДИТЕЛЯ",
  12: "СПЕЦИАЛЬНЫЙ РУКОВОДИТЕЛЬ",
};

// Global Economic Settings
let globalSettings = {
  jcRate: 95000000,
  duelMultiplier: 2,
  rouletteMultiplier: 3,
  prizeMultiplier: 1,
  inviteRewardEnabled: true
};

// Sync global settings from Firestore
async function loadGlobalSettings() {
  try {
    const doc = await firestoreDb.collection("settings").doc("global").get();
    if (doc.exists) {
      globalSettings = { ...globalSettings, ...doc.data() };
    } else {
      await firestoreDb.collection("settings").doc("global").set(globalSettings);
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}
loadGlobalSettings();

async function updateGlobalSettings(newSettings: Partial<typeof globalSettings>) {
  globalSettings = { ...globalSettings, ...newSettings };
  await firestoreDb.collection("settings").doc("global").set(globalSettings, { merge: true });
}

const userCache = new Map<number, any>();
const commandHistory = new Map<number, { timestamps: number[] }>();
const chatMembersCache = new Map<number, { members: any[], profiles: any[], expiry: number }>();
const adminCache = new Map<string, { isAdmin: boolean, expiry: number }>();
const lastPickedInChat = new Map<number, number>();

async function getChatMembers(peerId: number) {
  const cached = chatMembersCache.get(peerId);
  if (cached && cached.expiry > Date.now()) {
    return { items: cached.members, profiles: cached.profiles };
  }
  try {
    const res = await vkApi.get("messages.getConversationMembers", {
      params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.131" }
    });
    const items = res.data?.response?.items || [];
    const profiles = res.data?.response?.profiles || [];
    chatMembersCache.set(peerId, { members: items, profiles, expiry: Date.now() + 30000 }); // 30 sec cache
    return { items, profiles };
  } catch (e) {
    return { items: [], profiles: [] };
  }
}

async function preloadUsers() {
  try {
    const snap = await firestoreDb.collection("users").get();
    snap.forEach(doc => {
      const u = doc.data();
      if (u && u.userId) {
        userCache.set(u.userId, u);
      }
    });
    console.log(`>>> Preloaded ${userCache.size} users into in-memory cache.`);
  } catch (err) {
    console.error("Error preloading users:", err);
  }
}
preloadUsers();

// Helper to parse numbers with suffixes like k, kk, kkk, etc.
function parseNumber(input: string | number): number {
  if (typeof input === "number") return input;
  if (!input) return 0;
  let str = input.toString().toLowerCase().trim().replace(/,/g, ".");
  let multiplier = 1;
  
  if (str.endsWith("ккк") || str.endsWith("kkk")) {
    multiplier = 1000000000;
    str = str.replace(/[кk]{3}$/, "");
  } else if (str.endsWith("кк") || str.endsWith("kk")) {
    multiplier = 1000000;
    str = str.replace(/[кk]{2}$/, "");
  } else if (str.endsWith("к") || str.endsWith("k")) {
    multiplier = 1000;
    str = str.replace(/[кk]$/, "");
  }
  
  const val = parseFloat(str);
  return isNaN(val) ? 0 : Math.floor(val * multiplier);
}

async function getOrCreateUser(userId: number, nameHint?: string) {
  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (nameHint && (!data.nick || data.nick.startsWith("User"))) {
      data.nick = nameHint;
      const userRef = firestoreDb.collection("users").doc(userId.toString());
      userRef.update({ nick: nameHint }).catch(e => console.error("Error updating user nick:", e));
    }
    return data;
  }

  const userRef = firestoreDb.collection("users").doc(userId.toString());
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    const newUser = {
      userId,
      role: userId === 778382713 || userId === 607598858 || userId === 1 ? 12 : 0, // Special Leader for admin
      nick: nameHint || `User${userId}`,
      balance: 1000,
      bank: 0,
      beer: 0,
      lastBeerTime: 0,
      beerResetMonth: Math.floor(Date.now() / (90 * 86400 * 1000)),
      jc: 0,
      businesses: 0,
      bizProducts: 0,
      bizIncomeAcc: 0,
      lastBizCollectTime: Math.floor(Date.now() / 1000),
      vipExpires: 0,
      rep: 0,
      lastRepGiven: {},
      isGameBanned: false,
      gameBanReason: "",
      hideTop: false,
      hideBalance: false,
      lastPrizeTime: 0,
      mpoints: 0,
      warnings: 0,
      messagesToday: 0,
      messagesTotal: 0,
      lastMessageAt: Math.floor(Date.now() / 1000),
      status: "Активный",
      premiumProfileHidden: false,
      premiumBalanceHidden: false,
      deposits: [],
      lastHackAt: 0,
      lastFortuneAt: 0,
      dailyDay: 1,
      lastDailyAt: 0,
      hasSubBonus: false
    };
    await userRef.set(newUser);
    userCache.set(userId, newUser);
    return { ...newUser, _isNew: true };
  }
  const data = userDoc.data() as any;
  if (!data.deposits) data.deposits = [];
  if (data.premiumProfileHidden === undefined) data.premiumProfileHidden = false;
  if (data.premiumBalanceHidden === undefined) data.premiumBalanceHidden = false;
  if (nameHint && (!data.nick || data.nick.startsWith("User"))) {
    await userRef.update({ nick: nameHint });
    data.nick = nameHint;
  }
  userCache.set(userId, data);
  return data;
}

async function updateUser(userId: number, fields: Record<string, any>) {
  if (userCache.has(userId)) {
    const cached = userCache.get(userId);
    Object.assign(cached, fields);
  } else {
    userCache.set(userId, fields);
  }
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  // Non-blocking update to speed up bot response
  userRef.set(fields, { merge: true }).catch(() => {});
}

async function updateUserStats(userId: number) {
  if (userCache.has(userId)) {
    const cached = userCache.get(userId);
    cached.messagesTotal = (cached.messagesTotal || 0) + 1;
    cached.messagesToday = (cached.messagesToday || 0) + 1;
    cached.lastMessageAt = Math.floor(Date.now() / 1000);
  }
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  // Non-blocking update to speed up bot response
  userRef.update({
    messagesTotal: FieldValue.increment(1),
    messagesToday: FieldValue.increment(1),
    lastMessageAt: Math.floor(Date.now() / 1000)
  }).catch(() => {});
}

app.use(express.json());

// Global VK Callback Confirmation Middleware (catches any route where VK requests confirmation)
app.use((req, res, next) => {
  const type = req.body?.type || req.query?.type;
  if (type === "confirmation") {
    console.log(">>> VK Confirmation string requested on path:", req.path, "-> Returning:", CONFIRMATION_CODE);
    return res.status(200).send(CONFIRMATION_CODE);
  }
  next();
});

const cooldowns = new Map<number, number>();

export const BIZ_TYPES = {
  1: { name: "Шиномонтажка", price: 250000, profit: 500, img: "https://images.unsplash.com/photo-1599256621730-5351f1e564d6?w=600" },
  2: { name: "Ларёк-кафе", price: 500000, profit: 1000, img: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600" },
  3: { name: "Парикмахерская", price: 750000, profit: 1500, img: "https://images.unsplash.com/photo-1521590832167-7bfcbaa6362d?w=600" },
  4: { name: "Кафе", price: 1000000, profit: 1850, img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600" },
  5: { name: "Ресторан быстрого питания", price: 1250000, profit: 2050, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600" },
  6: { name: "Сеть магазинов", price: 1800000, profit: 3000, img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600" },
  7: { name: "IT кампания", price: 5000000, profit: 5000, img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600" },
  8: { name: "Банк", price: 12000000, profit: 7000, img: "https://images.unsplash.com/photo-1501167733088-49fb79ac8bb8?w=600" },
  9: { name: "Ювелирный магазин", price: 25000000, profit: 12000, img: "https://images.unsplash.com/photo-1515562141207-7a48fb3ce270?w=600" },
  10: { name: "Казино", price: 50000000, profit: 20000, img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600" }
};


const DAILY_BONUSES: { [day: number]: { label: string, apply: (u: any, id: number) => Promise<void> } } = {
  1: { label: "25.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 25000 }); } },
  2: { label: "2 репутации", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 2 }); } },
  3: { label: "3 литра пива", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 3 }); } },
  4: { label: "75.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 75000 }); } },
  5: { label: "4 репутации", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 4 }); } },
  6: { label: "7 литров пива", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 7 }); } },
  7: { label: "300.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 300000 }); } }
};

// In-Memory Games Lobbies
interface CrocLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  participants: Array<{ id: number; name: string }>;
  status: "lobby" | "playing";
  word?: string;
  presenterId?: number;
  presenterName?: string;
  timeoutTimer?: NodeJS.Timeout;
}
const crocGames = new Map<number, CrocLobby>(); // peerId -> CrocLobby

interface DuelLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  amount: number;
}
const duelGames = new Map<number, DuelLobby>(); // peerId -> DuelLobby

interface DuelBizLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  count: number;
}
const duelBizGames = new Map<number, DuelBizLobby>(); // peerId -> DuelBizLobby

interface RpsLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  amount: number;
  p2Id?: number;
  p2Name?: string;
  p1Choice?: string;
  p2Choice?: string;
  status: "waiting_p2" | "waiting_choices";
}
const rpsGames = new Map<number, RpsLobby>(); // peerId -> RpsLobby

interface GiveawayLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  amount: number;
  timeStr: string;
  expiresAt: number;
  participants: Array<{ id: number; name: string }>;
  timer: NodeJS.Timeout;
}
const giveaways = new Map<number, GiveawayLobby>(); // peerId -> GiveawayLobby

interface MafiaPlayer {
  id: number;
  name: string;
  role?: "Мафия" | "Шериф" | "Доктор" | "Мирный житель";
  isAlive: boolean;
  choice?: number | string | null;
  vote?: number | string | null;
}

interface MafiaLobby {
  peerId: number;
  cmId: number;
  creatorId: number;
  creatorName: string;
  players: MafiaPlayer[];
  status: "lobby" | "playing";
  phase?: "lobby" | "night" | "morning_voting";
  lobbyTimer?: NodeJS.Timeout;
  phaseTimer?: NodeJS.Timeout;
  cycleNumber?: number;
  dayPhoto?: string;
  nightPhoto?: string;
}
const mafiaGames = new Map<number, MafiaLobby>();
const pendingNews = new Map<number, { text: string, attachmentsStr: string, forwardObjStr: string | null, peerId: number }>();

async function getWeatherForecast(city: string, type: "today" | "day" | "week" | "month"): Promise<{ text: string, keyboard: any } | null> {
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ru`, {
      timeout: 10000,
      headers: {
        "User-Agent": "curl/7.64.1"
      }
    });
    
    const data = res.data;
    if (!data || !data.current_condition || data.current_condition.length === 0 || !data.weather || data.weather.length === 0) {
      return null;
    }

    // Capitalize user city name properly
    const resolvedCity = city.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    const formatTemp = (val: string | number) => {
      const num = Math.round(Number(val));
      if (num > 0) return `+${num}°`;
      return `${num}°`;
    };

    const getWindType = (speedMs: number) => {
      if (speedMs < 0.2) return "Штиль";
      if (speedMs <= 1.5) return "Тихий";
      if (speedMs <= 3.3) return "Легкий";
      if (speedMs <= 5.4) return "Слабый";
      if (speedMs <= 7.9) return "Умеренный";
      if (speedMs <= 10.7) return "Свежий";
      if (speedMs <= 13.8) return "Сильный";
      if (speedMs <= 17.1) return "Крепкий";
      if (speedMs <= 20.7) return "Очень крепкий";
      if (speedMs <= 24.4) return "Шторм";
      if (speedMs <= 28.4) return "Сильный шторм";
      if (speedMs <= 32.6) return "Жестокий шторм";
      return "Ураган";
    };

    const windDirFull: Record<string, string> = {
      "N": "Северный", "NNE": "Северо-Северо-Восточный", "NE": "Северо-Восточный", "ENE": "Восток-Северо-Восточный",
      "E": "Восточный", "ESE": "Восток-Юго-Восточный", "SE": "Юго-Восточный", "SSE": "Юг-Юго-Восточный",
      "S": "Южный", "SSW": "Юг-Юго-Западный", "SW": "Юго-Западный", "WSW": "Запад-Юг-Юго-Западный",
      "W": "Западный", "WNW": "Запад-Северо-Западный", "NW": "Северо-Западный", "NNW": "Северо-Северо-Западный"
    };

    const windDirShort: Record<string, string> = {
      "N": "С", "NNE": "ССВ", "NE": "СВ", "ENE": "ВСВ",
      "E": "В", "ESE": "ВЮВ", "SE": "ЮВ", "SSE": "ЮЮВ",
      "S": "Ю", "SSW": "ЮЮЗ", "SW": "ЮЗ", "WSW": "ЗЮЗ",
      "W": "З", "WNW": "ЗСЗ", "NW": "СЗ", "NNW": "ССЗ"
    };

    const getWindDirFull = (point: string, degree: number) => {
      if (point && windDirFull[point.toUpperCase()]) return windDirFull[point.toUpperCase()];
      const deg = (degree + 11.25) % 360;
      const index = Math.floor(deg / 22.5);
      const dirs = ["Северный", "Северо-Северо-Восточный", "Северо-Восточный", "Восток-Северо-Восточный", "Восточный", "Восток-Юго-Восточный", "Юго-Восточный", "Юг-Юго-Восточный", "Южный", "Юг-Юго-Западный", "Юго-Западный", "Запад-Юг-Юго-Западный", "Западный", "Запад-Северо-Западный", "Северо-Западный", "Северо-Северо-Западный"];
      return dirs[index] || "Северный";
    };

    const getWindDirShort = (point: string, degree: number) => {
      if (point && windDirShort[point.toUpperCase()]) return windDirShort[point.toUpperCase()];
      const deg = (degree + 11.25) % 360;
      const index = Math.floor(deg / 22.5);
      const dirs = ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"];
      return dirs[index] || "С";
    };

    const formatTime12to24 = (timeStr: string) => {
      if (!timeStr) return "00:00";
      const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return timeStr;
      let h = parseInt(match[1]);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${m}`;
    };

    const getSeededRandom = (seedStr: string) => {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      return () => {
        hash = (hash * 1664525 + 1013904223) % 4294967296;
        return hash / 4294967296;
      };
    };

    const getDateStr = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      return `${day}.${month}`;
    };

    // Keyboard configuration
    const buttons: any[] = [];
    if (type === "today") {
      buttons.push([
        { action: { type: "callback", label: "Прогноз на день", payload: JSON.stringify({ cmd: "weather_day", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "Прогноз на неделю", payload: JSON.stringify({ cmd: "weather_week", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "Прогноз на месяц", payload: JSON.stringify({ cmd: "weather_month", city }) }, color: "primary" }
      ]);
    } else {
      // For other views, add "Прогноз на сегодня" as well
      buttons.push([
        { action: { type: "callback", label: "Прогноз на сегодня", payload: JSON.stringify({ cmd: "weather_today", city }) }, color: "secondary" },
        { action: { type: "callback", label: "Прогноз на день", payload: JSON.stringify({ cmd: "weather_day", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "Прогноз на неделю", payload: JSON.stringify({ cmd: "weather_week", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "Прогноз на месяц", payload: JSON.stringify({ cmd: "weather_month", city }) }, color: "primary" }
      ]);
    }
    const keyboard = { inline: true, buttons };

    if (type === "today" || type === "day") {
      const isToday = type === "today";
      let current, weatherDay, astronomy;
      
      if (isToday) {
        current = data.current_condition[0];
        weatherDay = data.weather[0];
        astronomy = weatherDay?.astronomy?.[0];
      } else {
        // tomorrow (day 1)
        weatherDay = data.weather[1] || data.weather[0];
        current = weatherDay.hourly?.[4] || weatherDay.hourly?.[0] || {};
        astronomy = weatherDay?.astronomy?.[0];
      }

      let desc = "Ясно";
      if (current.lang_ru?.[0]?.value) {
        desc = current.lang_ru[0].value;
      } else if (current.weatherDesc?.[0]?.value) {
        desc = current.weatherDesc[0].value;
      }

      const tempVal = isToday ? (current.temp_C || "0") : (weatherDay.avgtempC || current.tempC || "0");
      const feelsVal = isToday ? (current.FeelsLikeC || tempVal) : (current.FeelsLikeC || tempVal);

      const temp = formatTemp(tempVal);
      const feels = formatTemp(feelsVal);
      const humidity = current.humidity || "0";
      
      const hpa = parseFloat(current.pressure || "1013");
      const mmHg = Math.round(hpa * 0.750063755);

      const windKmph = parseFloat(current.windspeedKmph || "0");
      const windMs = (windKmph / 3.6).toFixed(2);
      const windDegree = parseFloat(current.winddirDegree || "0");
      const windPoint = current.winddir16Point || "N";

      const windType = getWindType(parseFloat(windMs));
      const windDir = getWindDirFull(windPoint, windDegree);

      const sunrise = astronomy ? formatTime12to24(astronomy.sunrise) : "04:45";
      const sunset = astronomy ? formatTime12to24(astronomy.sunset) : "20:25";

      const titleSuffix = isToday ? "сегодня" : "завтра";

      const text = `...::Прогноз погоды в городе ${resolvedCity} на ${titleSuffix}::...\n\n` +
                   `| Сейчас: ${temp}\n` +
                   `| Ощущается как: ${feels}\n` +
                   `| Состояние неба: ${desc}\n\n` +
                   `| Тип ветра: ${windType}\n` +
                   `| Скорость ветра: ${windMs} м/с\n` +
                   `| Направление ветра: ${windDir}\n\n` +
                   `| Влажность: ${humidity}%\n` +
                   `| Давление: ${mmHg}мм\n\n` +
                   `| Закат: ${sunset}\n` +
                   `| Рассвет: ${sunrise}`;

      return { text, keyboard };

    } else if (type === "week" || type === "month") {
      const daysCount = type === "week" ? 7 : 30;
      const lines: string[] = [];

      for (let i = 0; i < daysCount; i++) {
        const dateStr = getDateStr(i);
        let minT: number, maxT: number, windMs: string, windPt: string, windDeg: number, cond: string;

        if (i < data.weather.length) {
          const wDay = data.weather[i];
          minT = Math.round(parseFloat(wDay.mintempC || "0"));
          maxT = Math.round(parseFloat(wDay.maxtempC || "0"));
          const hourlyMid = wDay.hourly?.[4] || wDay.hourly?.[0] || {};
          const windKmph = parseFloat(hourlyMid.windspeedKmph || "0");
          windMs = (windKmph / 3.6).toFixed(2);
          windPt = hourlyMid.winddir16Point || "N";
          windDeg = parseFloat(hourlyMid.winddirDegree || "0");
          cond = hourlyMid.lang_ru?.[0]?.value || hourlyMid.weatherDesc?.[0]?.value || "Ясно";
        } else {
          // deterministic generate
          const seed = `${resolvedCity}_${dateStr}`;
          const rand = getSeededRandom(seed);
          const lastWeather = data.weather[data.weather.length - 1];
          const baseMin = parseFloat(lastWeather?.mintempC || "15");
          const baseMax = parseFloat(lastWeather?.maxtempC || "25");

          const tempVarMin = Math.round((rand() - 0.5) * 8);
          const tempVarMax = Math.round((rand() - 0.5) * 8);

          minT = Math.round(baseMin + tempVarMin);
          maxT = Math.round(baseMax + tempVarMax);
          if (minT > maxT) {
            const tmp = minT;
            minT = maxT;
            maxT = tmp;
          }

          windMs = (1 + rand() * 7).toFixed(2);
          const windDirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
          windPt = windDirs[Math.floor(rand() * windDirs.length)];
          windDeg = Math.floor(rand() * 360);

          const conditions = ["Ясно", "Малооблачно", "Переменная облачность", "Облачно с прояснениями", "Пасмурно", "Небольшой дождь", "Дождь", "Гроза"];
          cond = conditions[Math.floor(rand() * conditions.length)];
        }

        const minStr = formatTemp(minT);
        const maxStr = formatTemp(maxT);
        const shortDir = getWindDirShort(windPt, windDeg);

        lines.push(`| ${dateStr} | Температура: ${minStr}/${maxStr} | Ветер: ${windMs} м/с, ${shortDir} | Состояние неба: ${cond}`);
      }

      const text = `...::Прогноз погоды в городе ${resolvedCity} на ${type === "week" ? "неделю" : "месяц"}::...\n\n` + lines.join("\n");
      return { text, keyboard };
    }

    return null;
  } catch (err: any) {
    console.error("Error getting weather forecast:", err);
    return null;
  }
}

async function checkDmAllowed(userId: number): Promise<boolean> {
  try {
    const res = await axios.get("https://api.vk.com/method/messages.isMessagesFromGroupAllowed", {
      params: {
        access_token: VK_TOKEN,
        v: "5.131",
        group_id: VK_GROUP_ID,
        user_id: userId
      }
    });
    if (res.data && res.data.response && res.data.response.is_allowed === 1) {
      return true;
    }
  } catch (e) {
    console.error("Error in checkDmAllowed:", e);
  }
  return false;
}

async function startMafiaGame(peerId: number) {
  const mg = mafiaGames.get(peerId);
  if (!mg) return;

  if (mg.lobbyTimer) {
    clearTimeout(mg.lobbyTimer);
    mg.lobbyTimer = undefined;
  }

  mg.status = "playing";
  mg.phase = "night";
  mg.cycleNumber = 1;

  // Upload day and night photos
  const dayUpload = await uploadPhoto(peerId, "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1200&q=80");
  const nightUpload = await uploadPhoto(peerId, "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80");
  mg.dayPhoto = dayUpload.attachment || "";
  mg.nightPhoto = nightUpload.attachment || "";

  // Assign roles: 1 Mafia, 1 Sheriff, 1 Doctor, others Civilians
  const shuffled = [...mg.players].sort(() => Math.random() - 0.5);
  shuffled[0].role = "Мафия";
  shuffled[1].role = "Шериф";
  shuffled[2].role = "Доктор";
  for (let i = 3; i < shuffled.length; i++) {
    shuffled[i].role = "Мирный житель";
  }

  // Send roles in private messages
  for (const p of mg.players) {
    p.isAlive = true;
    p.choice = null;
    p.vote = null;
    await sendVkMessage(VK_TOKEN, p.id, `Игра мафия запущена. Ваша роль: ${p.role}`);
  }

  // Announcement in chat
  const playerMentions = mg.players.map(p => `[id${p.id}|${p.name}]`).join("\n");
  const startMsg = `Игра мафия была начата.\n\n| Участники игры:\n${playerMentions}`;
  await sendVkMessage(VK_TOKEN, peerId, startMsg, mg.dayPhoto ? { attachment: mg.dayPhoto } : {});

  await startNightPhase(peerId);
}

async function startNightPhase(peerId: number) {
  const mg = mafiaGames.get(peerId);
  if (!mg) return;

  mg.phase = "night";
  if (mg.phaseTimer) {
    clearTimeout(mg.phaseTimer);
  }

  for (const p of mg.players) {
    p.choice = null;
  }

  await sendVkMessage(VK_TOKEN, peerId, `Ночь наступила, засыпает город...`, mg.nightPhoto ? { attachment: mg.nightPhoto } : {});

  for (const p of mg.players) {
    if (!p.isAlive) continue;

    if (p.role === "Мафия") {
      const alivePlayers = mg.players.filter(x => x.isAlive && x.id !== p.id);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `Убить ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "mafia_act", targetId: x.id, peerId })
          },
          color: "negative"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "Ничего не делать",
            payload: JSON.stringify({ cmd: "mafia_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `Наступила ночь, время совершить действие...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else if (p.role === "Шериф") {
      const alivePlayers = mg.players.filter(x => x.isAlive && x.id !== p.id);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `Застрелить ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "sheriff_act", targetId: x.id, peerId })
          },
          color: "negative"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "Ничего не делать",
            payload: JSON.stringify({ cmd: "sheriff_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `Наступила ночь, время совершить действие...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else if (p.role === "Доктор") {
      const alivePlayers = mg.players.filter(x => x.isAlive);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `Вылечить ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "doctor_act", targetId: x.id, peerId })
          },
          color: "positive"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "Ничего не делать",
            payload: JSON.stringify({ cmd: "doctor_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `Наступила ночь, время совершить действие...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else {
      await sendVkMessage(VK_TOKEN, p.id, `Наступила ночь, засыпайте... Вы - мирный житель, ждите наступления утра.`);
    }
  }

  mg.phaseTimer = setTimeout(async () => {
    await endNightPhase(peerId);
  }, 60000);
}

async function endNightPhase(peerId: number) {
  const mg = mafiaGames.get(peerId);
  if (!mg) return;

  if (mg.phaseTimer) {
    clearTimeout(mg.phaseTimer);
    mg.phaseTimer = undefined;
  }

  mg.phase = "morning_voting";

  const mafiaPlayer = mg.players.find(p => p.role === "Мафия");
  const sheriffPlayer = mg.players.find(p => p.role === "Шериф");
  const doctorPlayer = mg.players.find(p => p.role === "Доктор");

  const mafiaChoice = mafiaPlayer?.choice;
  const sheriffChoice = sheriffPlayer?.choice;
  const doctorChoice = doctorPlayer?.choice;

  const deaths: string[] = [];
  let saveMessage = "";

  if (mafiaChoice && mafiaChoice !== "skip" && typeof mafiaChoice === "number") {
    if (doctorChoice && doctorChoice === mafiaChoice) {
      const savedUser = mg.players.find(x => x.id === mafiaChoice);
      saveMessage = `Мафия выстрелила в [id${savedUser?.id}|${savedUser?.name}], но доктор его спас.`;
    } else {
      const killedUser = mg.players.find(x => x.id === mafiaChoice);
      if (killedUser) {
        killedUser.isAlive = false;
        deaths.push(`[id${killedUser.id}|${killedUser.name}] (убит мафией)`);
      }
    }
  }

  if (sheriffChoice && sheriffChoice !== "skip" && typeof sheriffChoice === "number") {
    const shotUser = mg.players.find(x => x.id === sheriffChoice);
    if (shotUser) {
      shotUser.isAlive = false;
      deaths.push(`[id${shotUser.id}|${shotUser.name}] (застрелен шерифом)`);
    }
  }

  const alivePlayers = mg.players.filter(x => x.isAlive);
  const aliveList = alivePlayers.map(p => `[id${p.id}|${p.name}]`).join("\n");

  let consequences = "";
  if (saveMessage) {
    consequences += saveMessage + "\n";
  }
  if (deaths.length > 0) {
    consequences += `Этой ночью погибли: ${deaths.join(", ")}`;
  } else if (!saveMessage) {
    consequences += `Этой ночью никто не пострадал.`;
  }

  const morningMsg = `Ночь прошла настало утро\n\n` +
    `| Участники игры:\n${aliveList}\n\n` +
    `| Последствия ночи:\n${consequences}`;

  await sendVkMessage(VK_TOKEN, peerId, morningMsg, mg.dayPhoto ? { attachment: mg.dayPhoto } : {});

  if (await checkMafiaGameEnd(peerId)) {
    return;
  }

  await startVotingPhase(peerId);
}

async function startVotingPhase(peerId: number) {
  const mg = mafiaGames.get(peerId);
  if (!mg) return;

  for (const p of mg.players) {
    p.vote = null;
  }

  const alivePlayers = mg.players.filter(p => p.isAlive);

  for (const p of alivePlayers) {
    const targets = alivePlayers.filter(x => x.id !== p.id);
    const buttons = targets.map(x => [
      {
        action: {
          type: "callback",
          label: `${x.name}`.substring(0, 40),
          payload: JSON.stringify({ cmd: "mafia_vote_act", targetId: x.id, peerId })
        },
        color: "primary"
      }
    ]);
    buttons.push([
      {
        action: {
          type: "callback",
          label: "Ничего не делать",
          payload: JSON.stringify({ cmd: "mafia_vote_act", targetId: "skip", peerId })
        },
        color: "secondary"
      }
    ]);

    await sendVkMessage(VK_TOKEN, p.id, `Началось дневное голосование! Выберите против кого вы голосуете:`, {
      keyboard: JSON.stringify({ inline: true, buttons })
    });
  }

  mg.phaseTimer = setTimeout(async () => {
    await endVotingPhase(peerId);
  }, 60000);
}

async function endVotingPhase(peerId: number) {
  const mg = mafiaGames.get(peerId);
  if (!mg) return;

  if (mg.phaseTimer) {
    clearTimeout(mg.phaseTimer);
    mg.phaseTimer = undefined;
  }

  const alivePlayers = mg.players.filter(p => p.isAlive);
  const voteCounts = new Map<number, number>();
  let skipVotes = 0;

  for (const p of alivePlayers) {
    if (p.vote === "skip" || !p.vote) {
      skipVotes++;
    } else if (typeof p.vote === "number") {
      voteCounts.set(p.vote, (voteCounts.get(p.vote) || 0) + 1);
    }
  }

  let maxVotes = 0;
  let targetId: number | null = null;
  let isTie = false;

  for (const [id, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      targetId = id;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  if (targetId && !isTie && maxVotes > skipVotes) {
    const lynched = mg.players.find(x => x.id === targetId);
    if (lynched) {
      lynched.isAlive = false;
      await sendVkMessage(VK_TOKEN, peerId, `По результатам голосования, жители города выгнали: [id${lynched.id}|${lynched.name}] (роль: ${lynched.role})`);
    }
  } else {
    await sendVkMessage(VK_TOKEN, peerId, `По результатам голосования, никто не покинул город (голоса разделились или большинство воздержалось).`);
  }

  if (await checkMafiaGameEnd(peerId)) {
    return;
  }

  if (mg.cycleNumber) {
    mg.cycleNumber++;
  }
  await startNightPhase(peerId);
}

async function checkMafiaGameEnd(peerId: number): Promise<boolean> {
  const mg = mafiaGames.get(peerId);
  if (!mg) return false;

  const alivePlayers = mg.players.filter(p => p.isAlive);
  const mafiaAlive = alivePlayers.filter(p => p.role === "Мафия");
  const civiliansAlive = alivePlayers.filter(p => p.role !== "Мафия");

  if (mafiaAlive.length >= civiliansAlive.length) {
    const mafiaMembers = mg.players.filter(p => p.role === "Мафия");
    const mentions = mafiaMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");
    
    await sendVkMessage(VK_TOKEN, peerId, `Игра окончена! Победили: Мафия\n\n${mentions} - за победу получают по 50 000$!`);

    for (const p of mafiaMembers) {
      const u = await getOrCreateUser(p.id);
      await updateUser(p.id, { balance: (u.balance || 0) + 50000 });
    }

    mafiaGames.delete(peerId);
    return true;
  }

  if (mafiaAlive.length === 0) {
    const civilianMembers = mg.players.filter(p => p.role !== "Мафия");
    const mentions = civilianMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");

    await sendVkMessage(VK_TOKEN, peerId, `Игра окончена! Победили: Мирные жители\n\n${mentions} - за победу получают по 50 000$!`);

    for (const p of civilianMembers) {
      const u = await getOrCreateUser(p.id);
      await updateUser(p.id, { balance: (u.balance || 0) + 50000 });
    }

    mafiaGames.delete(peerId);
    return true;
  }

  return false;
}

interface AdminConfirmAction {
  adminId: number;
  adminName: string;
  type: string;
  targetId: number;
  targetName: string;
  value?: any;
  extra?: any;
}
const adminConfirmations = new Map<string, AdminConfirmAction>(); // confirmKey -> action

function formatMskDate(timestamp: number): string {
  const d = new Date(timestamp + 3 * 3600 * 1000);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const secs = String(d.getUTCSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}:${secs} МСК (UTC +3)`;
}

// Security & Sessions Maps
export const pendingLogins = new Map<string, { ordinaryCode: string; specialCode: string; fullName: string; role: number; expires: number }>();
export const activeSessions = new Map<string, { token: string; vkId: number; fullName: string; role: number; isSpecial: boolean; loginTime: number; lastActive: number }>();

function parseDuration(str: string): { ms: number; text: string } | null {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhdwy])$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  let unitText = "";
  switch (unit) {
    case "s": ms = val * 1000; unitText = "сек."; break;
    case "m": ms = val * 60 * 1000; unitText = "мин."; break;
    case "h": ms = val * 3600 * 1000; unitText = "час."; break;
    case "d": ms = val * 24 * 3600 * 1000; unitText = "дн."; break;
    case "w": ms = val * 7 * 24 * 3600 * 1000; unitText = "нед."; break;
    case "y": ms = val * 365 * 24 * 3600 * 1000; unitText = "лет"; break;
  }
  return { ms, text: `${val} ${unitText}` };
}

async function checkAndApplyGameUnban(userId: number, userObj: any): Promise<boolean> {
  if (userObj.isGameBanned) {
    if (userObj.gameBanUntil && Date.now() > userObj.gameBanUntil) {
      await updateUser(userId, { isGameBanned: false, gameBanUntil: null, gameBanReason: "" });
      userObj.isGameBanned = false;
      userObj.gameBanUntil = null;
      userObj.gameBanReason = "";
      try {
        await axios.get("https://api.vk.com/method/groups.unban", {
          params: { group_id: VK_GROUP_ID, owner_id: userId, access_token: VK_TOKEN, v: "5.131" }
        });
      } catch (e) {}
      try {
        await sendVkMessage(VK_TOKEN, userId, "Ваша блокировка в боте была окончена.\nТеперь вы снова можете играть в бота.");
      } catch (e) {}
      return true;
    }
    return false;
  }
  return true;
}

async function getRandomChatMember(peerId: number, excludeId?: number): Promise<{ id: number; name: string } | null> {
  if (peerId < 2000000000) return null;
  const { items, profiles } = await getChatMembers(peerId);
  
  // Filter out bots (member_id < 0) and optional excludeId
  let members = items.filter((m: any) => m.member_id > 0);
  if (excludeId) {
    const filtered = members.filter((m: any) => m.member_id !== excludeId);
    if (filtered.length > 0) members = filtered;
  }
  
  if (members.length === 0) return null;

  // Shuffle pool for better randomness
  let pool = [...members];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Avoid immediate repetition if possible
  const lastId = lastPickedInChat.get(peerId);
  if (pool.length > 1 && lastId) {
    const nonRepeated = pool.filter(m => m.member_id !== lastId);
    if (nonRepeated.length > 0) pool = nonRepeated;
  }

  const randomItem = pool[Math.floor(Math.random() * pool.length)];
  const targetId = randomItem.member_id;
  lastPickedInChat.set(peerId, targetId);
  const profile = profiles.find((p: any) => p.id === targetId);
  const targetName = profile ? `${profile.first_name} ${profile.last_name}` : `Участник ${targetId}`;
  
  return { id: targetId, name: targetName };
}

async function checkIsAdmin(userId: number, peerId: number, userRole: number = 0): Promise<boolean> {
  if (userRole >= 12 || userId === 778382713 || userId === 607598858 || userId === 1) return true;
  
  const cacheKey = `${userId}:${peerId}`;
  const cached = adminCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.isAdmin;

  let isAdmin = false;
  if (peerId > 2000000000) {
    const { items } = await getChatMembers(peerId);
    const member = items.find((m: any) => m.member_id === userId);
    if (member && (member.is_admin || member.is_owner)) {
      isAdmin = true;
    }
  }
  
  adminCache.set(cacheKey, { isAdmin, expiry: Date.now() + 10000 }); // 10 sec cache
  return isAdmin;
}

// Helper for photo upload with retry
async function uploadPhoto(peerId: number, source: string | Buffer, retries = 2): Promise<{ attachment: string | null; error: string | null }> {
  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const serverRes = await axios.get("https://api.vk.com/method/photos.getMessagesUploadServer", {
        params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId }
      });
      if (serverRes.data.error) {
        lastError = `VK Server Error: ${serverRes.data.error.error_msg}`;
        continue;
      }
      const uploadUrl = serverRes.data.response.upload_url;
      let buffer: Buffer = typeof source === "string" ? Buffer.from((await axios.get(source, { responseType: "arraybuffer" })).data) : source;
      
      const form = new FormData();
      form.append("photo", buffer, { filename: "quote.jpg", contentType: "image/jpeg" });
      
      const uploadRes = await axios.post(uploadUrl, form, { headers: { ...form.getHeaders() } });
      if (!uploadRes.data.photo || uploadRes.data.photo === "[]" || uploadRes.data.photo === "") {
        lastError = `VK Upload empty data`;
        continue;
      }

      const saveRes = await axios.get("https://api.vk.com/method/photos.saveMessagesPhoto", {
        params: {
          access_token: VK_TOKEN,
          v: "5.131",
          photo: uploadRes.data.photo,
          server: uploadRes.data.server,
          hash: uploadRes.data.hash
        }
      });
      if (saveRes.data.error) {
        lastError = `VK Save Error: ${saveRes.data.error.error_msg}`;
        continue;
      }
      const photo = saveRes.data.response[0];
      return { attachment: `photo${photo.owner_id}_${photo.id}`, error: null };
    } catch (error: any) {
      lastError = error.message;
    }
  }
  return { attachment: null, error: lastError || "Unknown upload error" };
}

async function downloadFont() {
  const fonts = [
    { url: "https://github.com/googlefonts/noto-fonts/raw/master/hinted/ttf/NotoSans/NotoSans-Regular.ttf", file: "NotoSans-Regular.ttf", family: "NotoSans", weight: "normal", style: "normal" },
    { url: "https://github.com/googlefonts/noto-fonts/raw/master/hinted/ttf/NotoSans/NotoSans-Bold.ttf", file: "NotoSans-Bold.ttf", family: "NotoSans", weight: "bold", style: "normal" }
  ];
  for (const f of fonts) {
    const fontPath = path.resolve(process.cwd(), f.file);
    try {
      if (!fs.existsSync(fontPath)) {
        const res = await axios.get(f.url, { responseType: "arraybuffer" });
        fs.writeFileSync(fontPath, Buffer.from(res.data));
      }
      registerFont(fontPath, { family: f.family, weight: f.weight, style: f.style });
    } catch (e) {
      console.error(`Font error ${f.file}:`, e);
    }
  }
}

const QUOTE_BG = "https://sun9-65.vkuserphoto.ru/s/v1/ig2/yfGeUF-mW9XAtyEG1xu-oBBigudVlAc9MDjPsc7kE9coceNO20TLi6EY3GOMIYggG0mUoRc84WDZAwFGW7YPmw3z.jpg?quality=95&as=32x15,48x23,72x35,108x52,160x77,240x115,360x173,480x230,540x259,640x307,720x345,738x354&from=bu&u=p1F45DicS7BR81vlRwI10-lNZa5eTxowjFUGNFPF60A&cs=738x0";

async function generateQuote(text: string, avatarUrl: string, name: string): Promise<Buffer> {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  try {
    const bg = await loadImage(QUOTE_BG);
    ctx.drawImage(bg, 0, 0, width, height);
  } catch (e) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, width, height);

  const avatarSize = 220;
  const avatarX = 180;
  const avatarY = (height - avatarSize) / 2 - 30;

  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {}

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "34px NotoSans";
  ctx.fillText(name, avatarX + avatarSize / 2, avatarY + avatarSize + 70);

  const maxWidth = 500;
  const startX = 480;
  let fontSize = 42;
  let lineHeight = 54;
  
  const wrapText = (txt: string, fSize: number) => {
    ctx.font = `bold ${fSize}px NotoSans`;
    const words = txt.split(/\s+/);
    let currentLine = "";
    const resultLines: string[] = [];
    const charLimit = 13; 

    for (let n = 0; n < words.length; n++) {
      const word = words[n];
      const testLine = currentLine + word + " ";
      const metrics = ctx.measureText(testLine);
      
      if ((currentLine.length + word.length > charLimit || metrics.width > maxWidth) && n > 0) {
        resultLines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine = testLine;
      }
    }
    resultLines.push(currentLine.trim());
    return resultLines;
  };

  let lines = wrapText(text, fontSize);
  const maxBlockHeight = 580;
  if (lines.length * lineHeight > maxBlockHeight) {
    fontSize = 36; lineHeight = 44; lines = wrapText(text, fontSize);
  }
  if (lines.length * lineHeight > maxBlockHeight) {
    fontSize = 28; lineHeight = 36; lines = wrapText(text, fontSize);
  }
  if (lines.length * lineHeight > maxBlockHeight) {
    fontSize = 22; lineHeight = 28; lines = wrapText(text, fontSize);
  }

  const totalTextHeight = lines.length * lineHeight;
  const blockTop = (height - totalTextHeight) / 2;
  let currentY = blockTop + lineHeight / 2;

  ctx.font = "bold 110px NotoSans";
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.textAlign = "center";
  ctx.fillText('"', startX - 45, blockTop + 15);
  ctx.fillText('"', startX + maxWidth + 15, blockTop + totalTextHeight + 15);

  ctx.font = `bold ${fontSize}px NotoSans`;
  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  for (const l of lines) {
    ctx.fillText(l, startX, currentY);
    currentY += lineHeight;
  }

  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const now = new Date();
  const mskTime = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  const dateStr = `${mskTime.getDate()} ${months[mskTime.getMonth()]} ${mskTime.getFullYear()} в ${String(mskTime.getHours()).padStart(2, "0")}:${String(mskTime.getMinutes()).padStart(2, "0")}`;

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "28px NotoSans";
  ctx.textAlign = "left";
  ctx.fillText(dateStr, 60, height - 60);

  return canvas.toBuffer("image/jpeg");
}

// Helper to extract target user from reply or mention
function getBizDeclension(n: number): string {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "бизнесов";
  if (lastDigit === 1) return "бизнес";
  if (lastDigit >= 2 && lastDigit <= 4) return "бизнеса";
  return "бизнесов";
}

async function parseTargetUser(message: any, textArgs: string[]): Promise<{ targetId: number | null; targetName: string }> {
  if (message.reply_message) {
    const tid = message.reply_message.from_id;
    const cached = userCache.get(tid);
    if (cached && cached.nick && !cached.nick.startsWith("User")) {
      return { targetId: tid, targetName: cached.nick };
    }
    try {
      const res = await vkApi.get("users.get", {
        params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
      });
      if (res.data.response?.[0]) {
        const u = res.data.response[0];
        const name = `${u.first_name} ${u.last_name}`;
        if (cached) cached.nick = name;
        return { targetId: tid, targetName: name };
      }
    } catch (e) {}
    return { targetId: tid, targetName: `Игрок ${tid}` };
  }

  for (const arg of textArgs) {
    const match = arg.match(/\[id(\d+)\|([^\]]+)\]/) || arg.match(/@id(\d+)/) || arg.match(/^(\d+)$/);
    if (match) {
      const tid = parseInt(match[1]);
      const cached = userCache.get(tid);
      if (cached && cached.nick && !cached.nick.startsWith("User")) {
        return { targetId: tid, targetName: cached.nick };
      }
      try {
        const res = await vkApi.get("users.get", {
          params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
        });
        if (res.data.response?.[0]) {
          const u = res.data.response[0];
          const name = `${u.first_name} ${u.last_name}`;
          if (cached) cached.nick = name;
          return { targetId: tid, targetName: name };
        }
      } catch (e) {}
      return { targetId: tid, targetName: match[2] || `Игрок ${tid}` };
    }
  }
  return { targetId: null, targetName: "" };
}

// VK Webhook Callback Handler
app.post("/api-vk-callback/verificatoin/E1y7AP8589tyihbt7ig58fu659ft34fv8hn73ff23/jordan-manager/yyywwifkvhegvjbej38bk3nwjvkvkvkv38r834isdfsdaljhewkrjhssdakjfhsdkjhxzkvjhzxckjasdhfkhjasdf/brawl-stars/www39g", async (req, res) => {
  const { type, object } = req.body;

  if (type === "confirmation") {
    return res.send(CONFIRMATION_CODE);
  }

  res.send("ok");

  // VK Member Joined Event
  if (type === "user_block" || type === "group_leave") {
    return;
  }

  if (type === "group_join") {
    if (globalSettings.inviteRewardEnabled && object.user_id) {
      try {
        const userId = object.user_id;
        const uRes = await axios.get("https://api.vk.com/method/users.get", {
          params: { user_ids: userId, access_token: VK_TOKEN, v: "5.131" }
        });
        const name = uRes.data.response?.[0] ? `${uRes.data.response[0].first_name} ${uRes.data.response[0].last_name}` : `Участник`;
        const user = await getOrCreateUser(userId, name);
        await updateUser(userId, { balance: (user.balance || 0) + 25000 });

        // Broadcast or send message
        sendVkMessage(VK_TOKEN, userId, `🌟 [id${userId}|${name}] получил(-а) награду за приглашение участника в беседу!\n\n| Сумма награды: 25.000$\n\n| Добро пожаловать, [id${userId}|${name}]!`);
      } catch (e) {}
    }
    return;
  }

  async function getTopMarriagesText(): Promise<string> {
    const userMap = new Map<number, any>();

    userCache.forEach(u => {
      if (u && u.userId) userMap.set(Number(u.userId), u);
    });

    try {
      const snap = await firestoreDb.collection("users").get();
      snap.forEach(doc => {
        const u = doc.data();
        const id = u.userId || Number(doc.id);
        if (id && !isNaN(id)) {
          userMap.set(Number(id), { ...u, userId: Number(id) });
        }
      });
    } catch (e) {}

    const marriages: any[] = [];
    const seen = new Set<string>();

    userMap.forEach((u, uid) => {
      if (u && u.marriage && u.marriage.partnerId) {
        const pid = Number(u.marriage.partnerId);
        if (!pid) return;
        const pair = [uid, pid].sort((a, b) => a - b).join("-");
        if (!seen.has(pair)) {
          seen.add(pair);
          const partnerObj = userMap.get(pid);
          marriages.push({
            id1: uid,
            name1: u.nick || u.name || `User${uid}`,
            id2: pid,
            name2: partnerObj?.nick || partnerObj?.name || u.marriage.partnerName || `User${pid}`,
            marriedAt: u.marriage.marriedAt || Date.now()
          });
        }
      }
    });

    marriages.sort((a, b) => a.marriedAt - b.marriedAt);
    const top = marriages.slice(0, 10);

    if (top.length === 0) {
      return "🏆 Топ по бракам:\n\nБраков пока нет!";
    }

    let text = "🏆 Топ по бракам (самые долгие):\n\n";
    top.forEach((m, i) => {
      const days = Math.max(1, Math.floor((Date.now() - (m.marriedAt || Date.now())) / (86400 * 1000)) + 1);
      text += `${i + 1}. [id${m.id1}|${m.name1}] ❤️ [id${m.id2}|${m.name2}] — ${days} дн.\n`;
    });

    return text;
  }

  // VK Button Events (message_event)
  if (type === "message_event") {
    const { user_id: userId, peer_id: peerId, event_id: eventId, payload, conversation_message_id: cmId } = object;
    let payloadObj: any = {};
    try {
      payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch (e) {}

    const cmd = payloadObj.cmd;

    if (cmd === "claim_daily_bonus") {
      const user = await getOrCreateUser(userId);
      if (payloadObj.authorId && Number(payloadObj.authorId) !== Number(userId)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только вызвавший команду может забрать бонус!");
      }
      const now = Date.now();
      const isReady = !user.lastDailyAt || (now - user.lastDailyAt >= 86400000);
      if (!isReady) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бонус еще не готов!");
      }

      const currentDay = user.dailyDay || 1;
      const dayData = DAILY_BONUSES[currentDay] || DAILY_BONUSES[1];

      await dayData.apply(user, userId);

      const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
      await updateUser(userId, { lastDailyAt: now, dailyDay: nextDay });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const claimedText = `[id${userId}|${user.nick || 'Игрок'}] забрал(-а) свой ежедневный бонус "${dayData.label}"`;
      return await editVkMessage(VK_TOKEN, peerId, cmId, claimedText);
    }

    if (cmd === "help_basic" || cmd === "help_premium" || cmd === "help_admin") {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      let text = "";
      let buttons: any[] = [];
      const user = await getOrCreateUser(userId);
      const isAdmin = user.role >= 12 || userId === 1115715881;

      if (cmd === "help_basic") {
        text = `Игровые команды бота:\n\n` +
          `/мафия - Начать игру "Мафия".\n` +
          `/пиво - Выпить пиво.\n` +
          `/пивозавры - Топ по пиву.\n` +
          `/крокодил - Мини-игра "Крокодил".\n` +
          `/баланс - Показать баланс.\n` +
          `/приз - Получить приз.\n` +
          `/передать - Передать деньги пользователю.\n` +
          `/банк - Положить деньги в банк.\n` +
          `/снятьбанк - Снять деньги с банка.\n` +
          `/профиль - Профиль игрока.\n` +
          `/топ - Топ пользователей.\n` +
          `/рулетка - Сыграть в рулетку.\n` +
          `/казино - Сыграть в казино.\n` +
          `/бизнес - Статистика бизнесов.\n` +
          `/купитьбиз - Купить бизнесы.\n` +
          `/продатьбиз - Продать бизнесы.\n` +
          `/дуэль - Создать дуэль на деньги.\n` +
          `/дуэльбиз - Создать дуэль на бизнесы.\n` +
          `/кнб - Создать игру "Камень, ножницы, бумага".\n` +
          `/курс - Курс JORDAN'S COIN.\n` +
          `/купитькоин - Купить JORDAN'S COIN.\n` +
          `/продатькоин - Продать JORDAN'S COIN.\n` +
          `/передатькоин - Передать JORDAN'S COIN.\n` +
          `/брак - Посмотреть информацию о браке.\n` +
          `/брак запрос - Отправить запрос на брак пользователю.\n` +
          `/брак развод - Развестись со второй половинкой.\n` +
          `/rep + - Повысить репутацию.\n` +
          `/rep - - Понизить репутацию.\n` +
          `/промо - Активировать промокод.\n` +
          `/кто - Выбрать случайного игрока.\n` +
          `/инфа - Вероятность события.\n` +
          `/погода - Узнать текущую погоду в городе.\n` +
          `/взлом - Заработать деньги взломом.\n` +
          `/фортуна - Прокрутить колесо фортуны.\n` +
          `/ежедневный бонус - Забрать ежедневный бонус.\n` +
          `/подписка - Получить бонус за подписку.\n` +
          `/купитьпрем - Купить Premium-статус.`;
          
        buttons.push([{ action: { type: "callback", label: "Команды Premium", payload: JSON.stringify({ cmd: "help_premium" }) }, color: "positive" }]);
      } else if (cmd === "help_premium") {
        text = `Команды Premium:\n\n` +
          `/премпрофиль -/+ - Скрыть/открыть профиль от публичного просмотра.\n` +
          `/прембаланс -/+ - Скрыть/открыть баланс от публичного просмотра.\n` +
          `/открытьдепозит - Открыть депозит.\n` +
          `/депозиты - Информация о депозитах.\n` +
          `/ии - Задать вопрос к ИИ.\n` +
          `/установитьфото - Установить фото в профиль.\n` +
          `/удалитьфото - Удалить фото из профиля.\n` +
          `/прем - Информация о Premium-статусе.`;
        buttons.push([{ action: { type: "callback", label: "Базовые команды", payload: JSON.stringify({ cmd: "help_basic" }) }, color: "primary" }]);
      } else if (cmd === "help_admin" && isAdmin) {
        text = `👑 Админ-команды бота:\n\n` +
          `/поженить - Поженить пару принудительно.\n` +
          `/развести - Развести пару принудительно.\n` +
          `/deletephotoprofile - Удалить фото профиля.\n` +
          `/setrole - Установить роль.\n` +
          `/createpromo - Создать промокод.\n` +
          `/изменитькурс - Изменить курс JORDAN'S COIN.\n` +
          `/установитьмножитель - Установить множитель.\n` +
          `/установитьмножительдуэлэй - Установить множитель дуэлей.\n` +
          `/установитьмножительрулетки - Установить множитель рулетки.\n` +
          `/givemoney - Выдать деньги.\n` +
          `/resetmoney - Обнулить баланс и банк.\n` +
          `/givebusiness - Выдать бизнесы.\n` +
          `/resetbusiness - Обнулить бизнесы.\n` +
          `/givevip - Выдать VIP.\n` +
          `/resetvip - Снять VIP.\n` +
          `/givebeer - Выдать пиво.\n` +
          `/resetbeer - Обнулить пиво.\n` +
          `/giverep - Выдать репутацию.\n` +
          `/resetrep - Обнулить репутацию.\n` +
          `/giveprod - Выдать продукты.\n` +
          `/resetprod - Обнулить продукты.\n` +
          `/reset - Полностью сбросить профиль.\n` +
          `/очиститьдуэли - Сбросить активные лобби.\n` +
          `/чсигр - Добавить в ЧС игр.\n` +
          `/снятьчсигр - Убрать из ЧС игр.\n` +
          `/чслист - Список игроков в ЧС игр.`;
        buttons.push([{ action: { type: "callback", label: "Базовые команды", payload: JSON.stringify({ cmd: "help_basic" }) }, color: "primary" }]);
        buttons.push([{ action: { type: "callback", label: "Команды Premium", payload: JSON.stringify({ cmd: "help_premium" }) }, color: "positive" }]);
      }

      if (text) {
        await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({ inline: true, buttons }) });
      }
      return;
    }

    // Weather button clicks
    if (cmd === "weather_today" || cmd === "weather_day" || cmd === "weather_week" || cmd === "weather_month") {
      // Silently answer the click to clear the loader spinner on the button
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

      const city = payloadObj.city;
      const type = cmd === "weather_today" ? "today" : cmd === "weather_day" ? "day" : cmd === "weather_week" ? "week" : "month";
      const forecast = await getWeatherForecast(city, type);
      if (forecast) {
        await editVkMessage(VK_TOKEN, peerId, cmId, forecast.text, { keyboard: JSON.stringify(forecast.keyboard) });
      }
      return;
    }

    const user = await getOrCreateUser(userId);
    await checkAndApplyGameUnban(userId, user);
    const uRes = await vkApi.get("users.get", {
      params: { user_ids: userId, access_token: VK_TOKEN, v: "5.131" }
    });
    const fullName = uRes.data.response?.[0] ? `${uRes.data.response[0].first_name} ${uRes.data.response[0].last_name}` : `User${userId}`;

    // Crocodile buttons
    if (cmd === "croc_join") {
      if (user.isGameBanned) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы находитесь в чёрном списке игр.");
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Лобби игры не найдено!");
      if (lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра уже началась!");
      if (userId === lobby.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Создатель уже в игре!");
      if (lobby.participants.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже в игре!");

      lobby.participants.push({ id: userId, name: fullName });
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы успешно вступили в игру!");
      sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вступил(-а) в игру!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `🎮 Игра "Крокодил"\n\n| Создатель: [id${lobby.creatorId}|${lobby.creatorName}]\n| Участников: ${lobby.participants.length}`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
      return;
    }

    if (cmd === "croc_leave") {
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby || lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра не идет!");
      if (!lobby.participants.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в игре!");

      lobby.participants = lobby.participants.filter(p => p.id !== userId);
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из игры!");
      sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вышел(-а) из игры!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `🎮 Игра "Крокодил"\n\n| Создатель: [id${lobby.creatorId}|${lobby.creatorName}]\n| Участников: ${lobby.participants.length}`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
      return;
    }

    if (cmd === "croc_start") {
      if (user.isGameBanned) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы находитесь в чёрном списке игр.");
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby || lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Лобби не найдено!");
      if (userId !== lobby.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Начать игру может только создатель!");
      if (lobby.participants.length < 2) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Нужно минимум 2 игрока!");

      lobby.status = "playing";
      const randomWord = CROCODILE_WORDS[Math.floor(Math.random() * CROCODILE_WORDS.length)];
      const presenter = lobby.participants[Math.floor(Math.random() * lobby.participants.length)];
      lobby.word = randomWord;
      lobby.presenterId = presenter.id;
      lobby.presenterName = presenter.name;

      // Countdown effect or immediate message
      sendVkMessage(VK_TOKEN, peerId, `🎮 Игра "Крокодил" началась!\n\n| Ведущий: [id${presenter.id}|${presenter.name}]`);
      sendVkToast(VK_TOKEN, eventId, presenter.id, peerId, `Игра началась, слово: ${randomWord}, участники игры должны его угадать.`);
      sendVkMessage(VK_TOKEN, presenter.id, `🐊 Ваше слово для игры "Крокодил": ${randomWord}\nОбъясните его участникам в беседе!`);

      // 10 minute timeout
      lobby.timeoutTimer = setTimeout(() => {
        if (crocGames.has(peerId) || crocGames.has(Number(peerId))) {
          sendVkMessage(VK_TOKEN, peerId, `Время вышло! Никто не угадал слово.\n\n| Слово было: ${randomWord}\n\n| Игра завершена!`);
          crocGames.delete(peerId);
          crocGames.delete(Number(peerId));
        }
      }, 600000);
      return;
    }

    // Top categories buttons
    if (cmd && cmd.startsWith("top_")) {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Переключать категории может только автор!");
      }
      const category = cmd.replace("top_", "");
      let usersList: any[] = [];
      for (const d of userCache.values()) {
        if (!d.hideTop || user.role >= 12) {
          usersList.push(d);
        }
      }
      if (usersList.length === 0) {
        const usersSnap = await firestoreDb.collection("users").get();
        usersSnap.forEach(doc => {
          const d = doc.data();
          if (!d.hideTop || user.role >= 12) {
            usersList.push(d);
          }
        });
      }

      let topTitle = "";
      let lines: string[] = [];

      const now = Date.now();
      const getPremiumTag = (u: any) => (u.vipExpires && u.vipExpires > now) ? " ⭐" : "";

      if (category === "money") {
        topTitle = "💰 Топ пользователей по деньгам:";
        usersList.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        lines = usersList.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | На руках: ${(u.balance || 0).toLocaleString()}$`);
      } else if (category === "bank") {
        topTitle = "🏦 Топ пользователей по деньгам в банке:";
        usersList.sort((a, b) => (b.bank || 0) - (a.bank || 0));
        lines = usersList.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | В банке: ${(u.bank || 0).toLocaleString()}$`);
      } else if (category === "beer") {
        topTitle = "🍺 Топ по пиву за последние 3 месяца:";
        usersList.sort((a, b) => (b.beer || 0) - (a.beer || 0));
        lines = usersList.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Выпито - ${(u.beer || 0).toFixed(1)} л.`);
      } else if (category === "jc") {
        topTitle = "💎 Топ пользователей по JORDAN'S COIN:";
        usersList.sort((a, b) => (b.jc || 0) - (a.jc || 0));
        lines = usersList.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Коинов: ${(u.jc || 0).toLocaleString()}`);
      } else if (category === "biz") {
        topTitle = "🏦 Топ пользователей по бизнесам:";
        usersList.sort((a, b) => (b.businesses || 0) - (a.businesses || 0));
        lines = usersList.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | бизнесов: ${u.businesses || 0} | Баланс бизнесов: ${((u.businesses || 0) * 1000).toLocaleString()}$`);
      } else if (category === "rep") {
        topTitle = "🌟 Топ пользователей по репутации:";
        usersList.sort((a, b) => (b.rep || 0) - (a.rep || 0));
        lines = usersList.slice(0, 10).map((u, i) => {
          const r = u.rep || 0;
          const sign = r >= 0 ? "+" : "";
          return `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Репутация: ${sign}${r}`;
        });
      }

      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "Топ по деньгам", payload: JSON.stringify({ cmd: "top_money", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "Топ по деньгам в банке", payload: JSON.stringify({ cmd: "top_bank", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "Топ по пиву", payload: JSON.stringify({ cmd: "top_beer", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "Топ по JC", payload: JSON.stringify({ cmd: "top_jc", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "Топ по бизнесам", payload: JSON.stringify({ cmd: "top_biz", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "Топ по репутации", payload: JSON.stringify({ cmd: "top_rep", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "Топ по бракам", payload: JSON.stringify({ cmd: "top_marriages", authorId: userId }) }, color: "secondary" }
          ]
        ]
      };

      if (category === "marriages") {
        const text = await getTopMarriagesText();
        editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
        return;
      }

      editVkMessage(VK_TOKEN, peerId, cmId, `${topTitle}\n\n${lines.join("\n")}`, { keyboard: JSON.stringify(keyboard) });
      return;
    }

    // Business callbacks
    if (cmd === "biz_collect_new" || cmd === "biz_renew" || cmd === "biz_my_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }

      if (cmd === "biz_collect_new") {
        const incomeAcc = user.bizIncomeAcc || 0;
        if (incomeAcc <= 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Нет дохода для снятия!");
        
        await updateUser(userId, { balance: (user.balance || 0) + incomeAcc, bizIncomeAcc: 0 });
        sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) деньги с баланса бизнесов`);
        return;
      }

      if (cmd === "biz_renew") {
        const now = Date.now();
        const expireAt = user.bizExpireAt || 0;
        if (expireAt > now) {
           return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бизнесы еще работают!");
        }
        await updateUser(userId, { bizExpireAt: now + 5 * 3600 * 1000, lastBizCollectTime: Math.floor(now / 1000) });
        sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] продлил(-а) работу бизнесов`);
        return;
      }

      if (cmd === "biz_my_list") {
         const bCount = user.businesses || 0;
         const bType = user.bizType || 0;
         if (bCount === 0 || bType === 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас нет бизнесов!");

         const bizInfo = BIZ_TYPES[bType as keyof typeof BIZ_TYPES];
         
         const txt = `Список бизнесов пользователя [id${userId}|${fullName}]\n\n${bizInfo.name} | Кол-во: ${bCount}`;
         if (bizInfo.img) {
            const uploadRes = await uploadPhoto(peerId, bizInfo.img);
            if (uploadRes.attachment) {
               sendVkMessage(VK_TOKEN, peerId, txt, { attachment: uploadRes.attachment });
            } else {
               sendVkMessage(VK_TOKEN, peerId, txt);
            }
         } else {
            sendVkMessage(VK_TOKEN, peerId, txt);
         }
         return;
      }
    }
    // Duel join button
    if (cmd === "duel_join") {
      let duel = duelGames.get(peerId);
      if (!duel && payloadObj.creatorId && payloadObj.stake) {
        duel = { peerId, cmId: 0, creatorId: payloadObj.creatorId, creatorName: payloadObj.creatorName || "Игрок", amount: payloadObj.stake };
      }
      if (!duel) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Дуэль не найдена!");
      if (userId === duel.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете играть с самим собой!");
      if ((user.balance || 0) < duel.amount) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств!");

      const creator = await getOrCreateUser(duel.creatorId);
      if ((creator.balance || 0) < duel.amount) {
        duelGames.delete(peerId);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У создателя дуэли не хватает средств!");
      }

      await updateUser(userId, { balance: user.balance - duel.amount });
      await updateUser(duel.creatorId, { balance: creator.balance - duel.amount });

      const winnerId = Math.random() < 0.5 ? userId : duel.creatorId;
      const winnerName = winnerId === userId ? fullName : duel.creatorName;
      const loserId = winnerId === userId ? duel.creatorId : userId;
      const loserName = winnerId === userId ? duel.creatorName : fullName;
      const prize = duel.amount * globalSettings.duelMultiplier;

      const winnerUser = await getOrCreateUser(winnerId);
      await updateUser(winnerId, { balance: (winnerUser.balance || 0) + prize });
      duelGames.delete(peerId);

      editVkMessage(VK_TOKEN, peerId, cmId, `Дуэль между [id${loserId}|${loserName}] и [id${winnerId}|${winnerName}] была завершена!\n\n| Победителем дуэли становится - [id${winnerId}|${winnerName}]\n\n| Победитель дуэли забирает: ${prize.toLocaleString()}$`);
      return;
    }

    if (cmd === "duel_biz_join") {
      let duel = duelBizGames.get(peerId);
      if (!duel && payloadObj.creatorId && payloadObj.count) {
        duel = { peerId, cmId: 0, creatorId: payloadObj.creatorId, creatorName: payloadObj.creatorName || "Игрок", count: payloadObj.count };
      }
      if (!duel) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Дуэль на бизнесы не найдена!");
      if (userId === duel.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете играть с самим собой!");
      if ((user.businesses || 0) < duel.count) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно бизнесов!");

      const creator = await getOrCreateUser(duel.creatorId);
      if ((creator.businesses || 0) < duel.count) {
        duelBizGames.delete(peerId);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У создателя дуэли не хватает бизнесов!");
      }

      const winnerId = Math.random() < 0.5 ? userId : duel.creatorId;
      const winnerName = winnerId === userId ? fullName : duel.creatorName;
      const loserId = winnerId === userId ? duel.creatorId : userId;
      const loserName = winnerId === userId ? duel.creatorName : fullName;
      
      const count = duel.count;

      const winnerUser = await getOrCreateUser(winnerId);
      const loserUser = await getOrCreateUser(loserId);
      
      await updateUser(winnerId, { businesses: (winnerUser.businesses || 0) + count });
      await updateUser(loserId, { businesses: (loserUser.businesses || 0) - count });
      
      duelBizGames.delete(peerId);

      editVkMessage(VK_TOKEN, peerId, cmId, `Дуэль между [id${loserId}|${loserName}] и [id${winnerId}|${winnerName}] была завершена!\n\n| Победителем дуэли становится - [id${winnerId}|${winnerName}]\n\n| Победитель дуэли забирает: ${count} ${getBizDeclension(count)}`);
      return;
    }

    if (cmd === "deposit_close") {
      const depId = payloadObj.id;
      const num = payloadObj.num;
      const user = await getOrCreateUser(userId);
      const deposits = user.deposits || [];
      const depIdx = deposits.findIndex((d: any) => d.id === depId);
      
      if (depIdx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Депозит не найден!");
      const d = deposits[depIdx];
      
      if (Date.now() < d.expiresAt) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Этот депозит еще не готов к выводу!");

      const prize = Math.floor(d.amount * (1 + d.percent / 100));
      const updatedDeposits = deposits.filter((dep: any) => dep.id !== depId);
      
      await updateUser(userId, { balance: (user.balance || 0) + prize, deposits: updatedDeposits });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      await sendVkMessage(VK_TOKEN, peerId, `Вы закрыли депозит №${num}, вы получили: ${prize.toLocaleString()}$`);
      
      // Update original message to remove buttons or show updated list
      // For simplicity, we just send a new message as requested.
      // But we should also clear the buttons from the old message.
      await editVkMessage(VK_TOKEN, peerId, cmId, `...::Управление депозитами::...\n\n| Депозит №${num} успешно закрыт!`);
      return;
    }

    // Rock-Paper-Scissors (кнб)
    if (cmd === "rps_join") {
      const rps = rpsGames.get(peerId);
      if (!rps) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра КНБ не найдена!");
      if (userId === rps.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете присоединиться к своей игре!");
      if ((user.balance || 0) < rps.amount) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств для ставки!");

      rps.p2Id = userId;
      rps.p2Name = fullName;
      rps.status = "waiting_choices";

      const creator = await getOrCreateUser(rps.creatorId);
      await updateUser(userId, { balance: user.balance - rps.amount });
      await updateUser(rps.creatorId, { balance: creator.balance - rps.amount });

      const keyboard = {
        inline: true,
        buttons: [[
          { action: { type: "callback", label: "Камень", payload: JSON.stringify({ cmd: "rps_pick", choice: "камень" }) }, color: "primary" },
          { action: { type: "callback", label: "Ножницы", payload: JSON.stringify({ cmd: "rps_pick", choice: "ножницы" }) }, color: "primary" },
          { action: { type: "callback", label: "Бумага", payload: JSON.stringify({ cmd: "rps_pick", choice: "бумага" }) }, color: "primary" }
        ]]
      };

      editVkMessage(VK_TOKEN, peerId, cmId, `🪨📄✂️ Камень-Ножницы-Бумага\n\n| Игра между [id${rps.creatorId}|${rps.creatorName}] и [id${userId}|${fullName}] началась!\n\n| Ставка: ${rps.amount.toLocaleString()}$\n\n| Выберите:`, {
        keyboard: JSON.stringify(keyboard)
      });
      return;
    }

    if (cmd === "rps_pick") {
      const rps = rpsGames.get(peerId);
      if (!rps || rps.status !== "waiting_choices") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра не идет!");
      if (userId !== rps.creatorId && userId !== rps.p2Id) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не являетесь участником этой игры!");

      const choice = payloadObj.choice;
      if (userId === rps.creatorId) rps.p1Choice = choice;
      if (userId === rps.p2Id) rps.p2Choice = choice;

      sendVkToast(VK_TOKEN, eventId, userId, peerId, `Вы выбрали: ${choice}`);

      if (rps.p1Choice && rps.p2Choice) {
        const c1 = rps.p1Choice;
        const c2 = rps.p2Choice;
        let winnerId: number | null = null;

        if (c1 === c2) {
          winnerId = null;
        } else if (
          (c1 === "камень" && c2 === "ножницы") ||
          (c1 === "ножницы" && c2 === "бумага") ||
          (c1 === "бумага" && c2 === "камень")
        ) {
          winnerId = rps.creatorId;
        } else {
          winnerId = rps.p2Id!;
        }

        if (winnerId === null) {
          const u1 = await getOrCreateUser(rps.creatorId);
          const u2 = await getOrCreateUser(rps.p2Id!);
          await updateUser(rps.creatorId, { balance: (u1.balance || 0) + rps.amount });
          await updateUser(rps.p2Id!, { balance: (u2.balance || 0) + rps.amount });

          editVkMessage(VK_TOKEN, peerId, cmId, `🪨📄✂️ Камень-Ножницы-Бумага\n\n| [id${rps.creatorId}|${rps.creatorName}] выбрал: ${c1}\n| [id${rps.p2Id}|${rps.p2Name}] выбрал: ${c2}\n\n| Ничья!\n\n| Ставка возвращается игрокам.`);
        } else {
          const wName = winnerId === rps.creatorId ? rps.creatorName : rps.p2Name;
          const totalPrize = rps.amount * 2;
          const winUser = await getOrCreateUser(winnerId);
          await updateUser(winnerId, { balance: (winUser.balance || 0) + totalPrize });

          editVkMessage(VK_TOKEN, peerId, cmId, `🪨📄✂️ Камень-Ножницы-Бумага\n\n| [id${rps.creatorId}|${rps.creatorName}] выбрал: ${c1}\n| [id${rps.p2Id}|${rps.p2Name}] выбрал: ${c2}\n\n| Победитель: [id${winnerId}|${wName}]!\n\n| Он забирает ${totalPrize.toLocaleString()}$`);
        }
        rpsGames.delete(peerId);
      }
      return;
    }

    // Giveaway button
    if (cmd === "giveaway_join") {
      const g = giveaways.get(peerId);
      if (!g) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Раздача завершена!");
      if (g.participants.some(p => p.id === userId)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже приняли участие в раздаче!");
      }
      g.participants.push({ id: userId, name: fullName });
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы приняли участие в раздаче, ожидайте итогов.");
      return;
    }

    // Roulette / Casino replay buttons
    if (cmd === "roulette_again" || cmd === "roulette_allin") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только игрок может повторить ставку!");
      }
      let stake = payloadObj.stake || 0;
      if (cmd === "roulette_allin") stake = user.balance || 0;
      if (stake <= 0 || (user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств!");
      }

      await updateUser(userId, { balance: user.balance - stake });
      const win = Math.random() < 0.15;
      if (win) {
        const winAmount = stake * globalSettings.rouletteMultiplier;
        await updateUser(userId, { balance: (user.balance || 0) - stake + winAmount });
        sendVkMessage(VK_TOKEN, peerId, `🎰 Поздравляем вас, вы выиграли ${winAmount.toLocaleString()}$`, {
          keyboard: JSON.stringify({
            inline: true,
            buttons: [[
              { action: { type: "callback", label: "Повторно сыграть", payload: JSON.stringify({ cmd: "roulette_again", stake, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Сыграть на весь баланс", payload: JSON.stringify({ cmd: "roulette_allin", authorId: userId }) }, color: "negative" }
            ]]
          })
        });
      } else {
        sendVkMessage(VK_TOKEN, peerId, `К сожалению, но вы проиграли ставку ${stake.toLocaleString()}$`, {
          keyboard: JSON.stringify({
            inline: true,
            buttons: [[
              { action: { type: "callback", label: "Повторно сыграть", payload: JSON.stringify({ cmd: "roulette_again", stake, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Сыграть на весь баланс", payload: JSON.stringify({ cmd: "roulette_allin", authorId: userId }) }, color: "negative" }
            ]]
          })
        });
      }
      return;
    }

    if (cmd === "casino_again" || cmd === "casino_allin" || cmd === "casino_retry" || cmd === "casino_all_in") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только игрок может повторить ставку!");
      }
      const isAllIn = cmd === "casino_allin" || cmd === "casino_all_in";
      let stake = isAllIn ? (user.balance || 0) : parseNumber(payloadObj.stake || payloadObj.amount || 0);

      if (stake <= 0) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Укажите корректную сумму ставки!");
      }

      if ((user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств!");
      }

      const emojis = ["💎", "🍒", "🍀", "🪙", "🔔", "🍋", "💰", "⭐", "🔥", "🎲"];
      const e1 = emojis[Math.floor(Math.random() * emojis.length)];
      const e2 = emojis[Math.floor(Math.random() * emojis.length)];
      const e3 = emojis[Math.floor(Math.random() * emojis.length)];

      let bonusPercent = 0;
      [e1, e2, e3].forEach(e => {
        if (e === "💎") bonusPercent += 30;
        if (e === "🪙") bonusPercent += 10;
        if (e === "🔔") bonusPercent += 50;
      });

      const isJackpot = (e1 === e2 && e2 === e3);
      let winAmount = 0;
      let isWin = false;

      if (bonusPercent > 0 || isJackpot) {
        isWin = true;
        winAmount = Math.floor(stake * (1 + bonusPercent / 100));
        if (isJackpot) winAmount *= 3;
      }

      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "Повторно сыграть", payload: JSON.stringify({ cmd: "casino_again", stake, authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "Сыграть на весь баланс", payload: JSON.stringify({ cmd: "casino_allin", authorId: userId }) }, color: "positive" }
          ]
        ]
      };

      if (isWin) {
        const profit = winAmount - stake;
        await updateUser(userId, { balance: (user.balance || 0) + profit });
        let resText = `🎰 Вы поставили ${stake.toLocaleString()}$\n\n` +
          `| Выпало: (${e1} ${e2} ${e3})\n` +
          `| Бонус: +${bonusPercent}%\n\n`;
        
        if (isJackpot) {
          resText += `!!! JACKPOT! 3 одинаковых (${e1})!!!\n\n`;
        }
        
        resText += `| Вы выиграли ${winAmount.toLocaleString()}$ (прибыль: ${profit.toLocaleString()}$)`;
        
        return await sendVkMessage(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
      } else {
        await updateUser(userId, { balance: (user.balance || 0) - stake });
        const resText = `🎰 Вы поставили ${stake.toLocaleString()}$\n\n` +
          `| Выпало: (${e1} ${e2} ${e3})\n` +
          `| Бонус: 0%\n\n` +
          `| Вы проиграли ${stake.toLocaleString()}$`;
        
        return await sendVkMessage(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
      }
    }

    if (cmd === "marriage_accept" || cmd === "marriage_decline") {
      const { proposerId, proposerName, targetId } = payloadObj;
      if (userId !== targetId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Это предложение не вам!");

      if (cmd === "marriage_decline") {
        editVkMessage(VK_TOKEN, peerId, cmId, `К сожалению, но [id${targetId}|${fullName}] отказался от предложения пользователя [id${proposerId}|${proposerName}]`);
        return;
      }

      const proposerUser = await getOrCreateUser(proposerId);
      const targetUser = await getOrCreateUser(targetId);
      if (proposerUser.marriage?.partnerId || targetUser.marriage?.partnerId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кто-то из вас уже состоит в браке!");
      }

      // Fetch fresh names to avoid @User or stale data
      const namesRes = await vkApi.get("users.get", {
        params: { user_ids: `${proposerId},${targetId}`, access_token: VK_TOKEN, v: "5.131" }
      });
      const proposerProfile = namesRes.data.response?.find((p: any) => p.id === proposerId);
      const targetProfile = namesRes.data.response?.find((p: any) => p.id === targetId);
      
      const realProposerName = proposerProfile ? `${proposerProfile.first_name} ${proposerProfile.last_name}` : proposerName;
      const realTargetName = targetProfile ? `${targetProfile.first_name} ${targetProfile.last_name}` : fullName;

      const now = Date.now();
      await updateUser(proposerId, { marriage: { partnerId: targetId, partnerName: realTargetName, marriedAt: now } });
      await updateUser(targetId, { marriage: { partnerId: proposerId, partnerName: realProposerName, marriedAt: now } });

      editVkMessage(VK_TOKEN, peerId, cmId, `Минуточку внимания!\n\nСегодня [id${targetId}|${realTargetName}] принял(-а) предложение от пользователя [id${proposerId}|${realProposerName}]!\n\nПоздравляем новую парочку!`);
      return;
    }

    if (cmd === "divorce_accept" || cmd === "divorce_cancel") {
      const { userId: reqUserId, fullName: reqUserName, partnerId, partnerName } = payloadObj;
      if (userId !== reqUserId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только инициатор развода может подтвердить!");

      if (cmd === "divorce_cancel") {
        editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${reqUserName}] отменил(-а) развод с своей второй половинкой [id${partnerId}|${partnerName}]`);
        return;
      }

      await updateUser(userId, { marriage: null });
      await updateUser(partnerId, { marriage: null });

      editVkMessage(VK_TOKEN, peerId, cmId, `Сегодня, пара [id${userId}|${reqUserName}] и [id${partnerId}|${partnerName}] разводятся!`);
      return;
    }

    if (cmd === "set_mult") {
      const isUserAdmin = await checkIsAdmin(userId, peerId, user.role);
      if (!isUserAdmin) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "❌ Данное действие доступно только Специальному Руководителю и выше!");
      }

      const target = payloadObj.target;
      const val = parseFloat(payloadObj.val);

      if (isNaN(val) || val <= 0) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Некорректное значение множителя!");
      }

      let targetLabel = "";
      if (target === "duel") {
        await updateGlobalSettings({ duelMultiplier: val });
        targetLabel = "дуэлей";
      } else if (target === "prize") {
        await updateGlobalSettings({ prizeMultiplier: val });
        targetLabel = "призов";
      } else if (target === "roulette") {
        await updateGlobalSettings({ rouletteMultiplier: val });
        targetLabel = "рулетки";
      } else {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Неизвестный тип множителя!");
      }

      const successText = `[id${userId}|${fullName}] установил(-а) множитель для ${targetLabel} на: x${val}`;
      await editVkMessage(VK_TOKEN, peerId, cmId, successText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Множитель успешно изменен!");
      return;
    }

    // Mafia game active role actions from DM
    if (cmd === "mafia_act" || cmd === "sheriff_act" || cmd === "doctor_act") {
      const targetGamePeerId = payloadObj.peerId;
      const mg = mafiaGames.get(targetGamePeerId);
      if (!mg || mg.status !== "playing" || mg.phase !== "night") {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта игра завершена или наступил день!");
      }

      const player = mg.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не участвуете в игре или вы мертвы!");
      }

      if (player.choice !== null) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже сделали выбор этой ночью!");
      }

      const targetId = payloadObj.targetId;
      player.choice = targetId;

      let actText = "";
      if (targetId === "skip") {
        actText = "Вы воздержались от действия этой ночью.";
      } else {
        const targetPlayer = mg.players.find(x => x.id === targetId);
        const targetName = targetPlayer ? targetPlayer.name : `Игрок ${targetId}`;
        
        if (cmd === "mafia_act") {
          actText = `Вы убили игрока [id${targetId}|${targetName}]`;
        } else if (cmd === "sheriff_act") {
          actText = `Вы застрелили игрока [id${targetId}|${targetName}]`;
        } else if (cmd === "doctor_act") {
          actText = `Вы вылечили игрока [id${targetId}|${targetName}]`;
        }
      }

      await editVkMessage(VK_TOKEN, userId, cmId, actText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Выбор принят!");

      // Check if all active roles made choices
      const mafiaAlive = mg.players.some(p => p.role === "Мафия" && p.isAlive && p.choice === null);
      const sheriffAlive = mg.players.some(p => p.role === "Шериф" && p.isAlive && p.choice === null);
      const doctorAlive = mg.players.some(p => p.role === "Доктор" && p.isAlive && p.choice === null);

      if (!mafiaAlive && !sheriffAlive && !doctorAlive) {
        await endNightPhase(targetGamePeerId);
      }
      return;
    }

    // Mafia game voting actions from DM
    if (cmd === "mafia_vote_act") {
      const targetGamePeerId = payloadObj.peerId;
      const mg = mafiaGames.get(targetGamePeerId);
      if (!mg || mg.status !== "playing" || mg.phase !== "morning_voting") {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта игра завершена или фаза голосования прошла!");
      }

      const player = mg.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не участвуете в игре или вы мертвы!");
      }

      if (player.vote !== null) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже проголосовали!");
      }

      const targetId = payloadObj.targetId;
      player.vote = targetId;

      let voteText = "";
      if (targetId === "skip") {
        voteText = "Вы воздержались от голосования.";
      } else {
        const targetPlayer = mg.players.find(x => x.id === targetId);
        const targetName = targetPlayer ? targetPlayer.name : `Игрок ${targetId}`;
        voteText = `Вы проголосовали против: [id${targetId}|${targetName}]`;
      }

      await editVkMessage(VK_TOKEN, userId, cmId, voteText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Голос принят!");

      const alivePlayers = mg.players.filter(p => p.isAlive);
      const allVoted = alivePlayers.every(p => p.vote !== null);

      if (allVoted) {
        await endVotingPhase(targetGamePeerId);
      }
      return;
    }

    if (cmd === "news_chats" || cmd === "news_dms") {
      const newsData = pendingNews.get(userId);
      if (!newsData) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Рассылка не найдена или уже отправлена.");

      await editVkMessage(VK_TOKEN, peerId, cmId, "Рассылка была запущена.");
      pendingNews.delete(userId);
      
      const { text, attachmentsStr, forwardObjStr } = newsData;

      (async () => {
        try {
          if (cmd === "news_chats") {
            const chatsSnap = await firestoreDb.collection("chats").get();
            const promises: Promise<any>[] = [];
            chatsSnap.forEach((doc) => {
              const c = doc.data();
              if (c && c.id) {
                const req: any = { message: text };
                if (attachmentsStr) req.attachment = attachmentsStr;
                if (forwardObjStr) req.forward = forwardObjStr;
                promises.push(sendVkMessage(VK_TOKEN, c.id, "", req).catch(() => {}));
              }
            });
            await Promise.all(promises);
          } else {
            const usersSnap = await firestoreDb.collection("users").get();
            const promises: Promise<any>[] = [];
            usersSnap.forEach((doc) => {
              const u = doc.data();
              const uId = parseInt(doc.id);
              if (!isNaN(uId)) {
                const req: any = { message: text };
                if (attachmentsStr) req.attachment = attachmentsStr;
                if (forwardObjStr) req.forward = forwardObjStr;
                promises.push(sendVkMessage(VK_TOKEN, uId, "", req).catch(() => {}));
              }
            });
            await Promise.all(promises);
          }
          await editVkMessage(VK_TOKEN, peerId, cmId, "Рассылка была завершена.");
        } catch (e) {
          console.error("Broadcast error:", e);
          await editVkMessage(VK_TOKEN, peerId, cmId, "Произошла ошибка при рассылке.");
        }
      })();
      return;
    }

    if (cmd === "mafia_join" || cmd === "mafia_leave" || cmd === "mafia_start") {
      const mg = mafiaGames.get(peerId);
      if (!mg || mg.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра Мафия не найдена или уже началась!");

      if (cmd === "mafia_join") {
        if (mg.players.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже в игре!");
        
        const dmAllowed = await checkDmAllowed(userId);
        if (!dmAllowed) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Разрешите боту писать вам сообщения (напишите боту в ЛС)!");
        }

        mg.players.push({ id: userId, name: fullName, isAlive: true });
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вступили в игру Мафия!");
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] присоединился к мафии`);
      } else if (cmd === "mafia_leave") {
        const idx = mg.players.findIndex(p => p.id === userId);
        if (idx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в игре!");
        mg.players.splice(idx, 1);
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из игры Мафия!");
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] отсоединился от мафии`);
      } else if (cmd === "mafia_start") {
        if (user.role < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только руководитель может запустить игру!");
        if (mg.players.length < 4) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Минимум 4 игрока для старта!");

        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] запускает игру мафия!`);
        await startMafiaGame(peerId);
        return;
      }

      const playersStr = mg.players.map(p => `[id${p.id}|${p.name}]`).join(", ");
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "Присоединиться", payload: JSON.stringify({ cmd: "mafia_join" }) }, color: "positive" },
            { action: { type: "callback", label: "Отсоединиться", payload: JSON.stringify({ cmd: "mafia_leave" }) }, color: "negative" }
          ],
          [
            { action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "mafia_start" }) }, color: "secondary" }
          ]
        ]
      };

      await editVkMessage(VK_TOKEN, peerId, mg.cmId, `Игра "Мафия"\n\n| Создатель - [id${mg.creatorId}|${mg.creatorName}]\n\n| Участники игры - ${playersStr}`, {
        keyboard: JSON.stringify(keyboard)
      });
      return;
    }

    // Admin Confirmation Buttons (Confirm / Cancel)
    if (cmd === "admin_confirm" || cmd === "admin_cancel") {
      const key = payloadObj.key;
      const conf = adminConfirmations.get(key);
      if (!conf) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Подтверждение устарело!");
      if (userId !== conf.adminId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только автор команды может подтвердить!");

      if (cmd === "admin_cancel") {
        adminConfirmations.delete(key);
        let cancelText = "";
        if (conf.type === "givemoney") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу денег пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetmoney") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление баланса у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebusiness") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу бизнес-(ов) пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbusiness") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление бизнесов у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givevip") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу VIP-статуса пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetvip") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление VIP-статуса у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "reset") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление игровых данных пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebeer") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу пива пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbeer") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление пива у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giverep") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу репутации пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetrep") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление репутации у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giveprod") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу продуктов пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetprod") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление продуктов у пользователя [id${conf.targetId}|${conf.targetName}]`;

        editVkMessage(VK_TOKEN, peerId, cmId, cancelText || "Действие отменено.");
        return;
      }

      // Execute confirmed admin action
      const targetUser = await getOrCreateUser(conf.targetId);
      let successText = "";

      if (conf.type === "givemoney") {
        await updateUser(conf.targetId, { balance: (targetUser.balance || 0) + conf.value });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value.toLocaleString()}$ пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetmoney") {
        await updateUser(conf.targetId, { balance: 0, bank: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) баланс у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givebusiness") {
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
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${count} бизнес-(ов) типа ${typeId} пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetbusiness") {
        await updateUser(conf.targetId, { businesses: 0, bizProducts: 0, bizIncomeAcc: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все бизнесы у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givevip") {
        const daysMs = conf.value * 86400 * 1000;
        const currentExp = targetUser.vipExpires > Date.now() ? targetUser.vipExpires : Date.now();
        await updateUser(conf.targetId, { vipExpires: currentExp + daysMs });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) VIP-статус на ${conf.value} дней пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetvip") {
        await updateUser(conf.targetId, { vipExpires: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) VIP-статус у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "reset") {
        await updateUser(conf.targetId, { balance: 0, bank: 0, businesses: 0, bizProducts: 0, bizIncomeAcc: 0, vipExpires: 0, jc: 0, beer: 0, rep: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все игровые данные пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givebeer") {
        await updateUser(conf.targetId, { beer: (targetUser.beer || 0) + conf.value });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} литр-(ов) пива пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetbeer") {
        await updateUser(conf.targetId, { beer: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все литры пива у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "giverep") {
        const newRep = (targetUser.rep || 0) + conf.value;
        await updateUser(conf.targetId, { rep: newRep });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} репутации пользователю [id${conf.targetId}|${conf.targetName}]\n\n| Теперь у него репутации: ${newRep}`;
      } else if (conf.type === "resetrep") {
        await updateUser(conf.targetId, { rep: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) всю репутацию у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Теперь у него репутации: 0`;
      } else if (conf.type === "giveprod") {
        const newProds = (targetUser.bizProducts || 0) + conf.value;
        await updateUser(conf.targetId, { bizProducts: newProds });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} продуктов для бизнеса пользователю [id${conf.targetId}|${conf.targetName}]\n\n| Всего продуктов: ${newProds}`;
      } else if (conf.type === "resetprod") {
        await updateUser(conf.targetId, { bizProducts: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все продукты для бизнеса у пользователя [id${conf.targetId}|${conf.targetName}]`;
      }

      adminConfirmations.delete(key);
      editVkMessage(VK_TOKEN, peerId, cmId, successText || "Действие выполнено!");
      return;
    }

    return;
  }

  // VK Message Events (message_new)
  if (type === "message_new") {
    const message = object.message;
    const userId = message.from_id;
    const peerId = message.peer_id;
    const text = message.text ? message.text.trim() : "";
    
    if (userId < 0) return;

    // Check if bot was added to the conversation
    if (message.action) {
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
          const greeting = `GAMES MANAGER был добавлен в беседу.\n\n` +
            `Если вы желаете, что бы бот отвечал на команды без префикса, выдайте ему права администратора.\n\n` +
            `Если вы желаете, что бы бот отвечал на команды которые только начинаются с префиксов, не выдавайте ему права администратора.`;
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          await sendVkMessage(VK_TOKEN, 2000000010, `🔧 Бот добавлен в беседу!\n\n| Peer_id: ${peerId}\n| Пользователь: [id${userId}|${userId}]`);
          return;
        }
      }
    }

    try {
      let fullName = `User${userId}`;
      const cached = userCache.get(userId);
      if (cached && cached.nick && !cached.nick.startsWith("User")) {
        fullName = cached.nick;
      } else {
        try {
          const uRes = await vkApi.get("users.get", {
            params: { user_ids: userId, access_token: VK_TOKEN, v: "5.131" }
          });
          if (uRes.data.response?.[0]) {
            fullName = `${uRes.data.response[0].first_name} ${uRes.data.response[0].last_name}`;
            if (cached) cached.nick = fullName;
          }
        } catch (e) {}
      }

      const user = await getOrCreateUser(userId, fullName);
      const isAdmin = await checkIsAdmin(userId, peerId, user.role);

      // Handle Premium Expiration
      if (user.vipExpires > 0 && user.vipExpires < Date.now()) {
        await updateUser(userId, {
          vipExpires: 0,
          premiumProfileHidden: false,
          premiumBalanceHidden: false,
          profilePhoto: null
        });
        user.vipExpires = 0;
        user.premiumProfileHidden = false;
        user.premiumBalanceHidden = false;
        user.profilePhoto = null;
      }

      const isStart = text.toLowerCase() === "начать" || (message.payload && JSON.parse(message.payload).command === "start");
      if ((user._isNew || isStart)) {
        if (peerId < 2000000000) {
          user._isNew = false;
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], добро пожаловать в мир GAMES MANAGER!\n\nЗдесь вы можете играть, соревноваться с другими участниками, сражаться за топ 1, и многое другое!\n\nИграя с ботом, вы автоматически соглашаетесь со всеми правилами бота.`);
        }
      }
      checkAndApplyGameUnban(userId, user).catch(() => {});
      updateUserStats(userId).catch(() => {});

      // Passive income accumulator for businesses (Products must NOT auto-replenish, only consume)
      const bizExpireAt = user.bizExpireAt || 0;
      // Effective end time is either now, or when the business expired
      const effectiveEndMs = Math.min(Date.now(), bizExpireAt);
      const effectiveEndSec = Math.floor(effectiveEndMs / 1000);
      
      const lastCollectSec = user.lastBizCollectTime || Math.floor(Date.now() / 1000);
      const hoursPassed = Math.floor((effectiveEndSec - lastCollectSec) / 3600);
      
      if (hoursPassed > 0 && (user.businesses || 0) > 0 && (user.bizProducts || 0) > 0) {
        const bType = user.bizType || 1;
        const bizInfo = BIZ_TYPES[bType as keyof typeof BIZ_TYPES] || BIZ_TYPES[1];
        const consumedProducts = Math.min(user.bizProducts, hoursPassed * user.businesses);
        const actualHours = Math.floor(consumedProducts / user.businesses);
        const addedIncome = actualHours * user.businesses * bizInfo.profit;

        await updateUser(userId, {
          bizProducts: user.bizProducts - consumedProducts,
          bizIncomeAcc: (user.bizIncomeAcc || 0) + addedIncome,
          // Advance the last collect time by the collected hours so no time is lost
          lastBizCollectTime: lastCollectSec + (hoursPassed * 3600)
        });
      }

      // Check if text is exact answer to active Crocodile game
      const croc = crocGames.get(peerId) || crocGames.get(Number(peerId)) || crocGames.get(String(peerId));
      if (croc && croc.status === "playing" && croc.word) {
        const isPresenter = Number(userId) === Number(croc.presenterId);
        if (!isPresenter) {
          const strippedText = (text || "")
            .replace(/\[(?:club|id)\d+\|[^\]]+\]/g, "")
            .replace(/@\S+/g, "")
            .replace(/^[!\./+]+/, "")
            .trim()
            .toLowerCase()
            .replace(/ё/g, "е");

          const target = (croc.word || "").trim().toLowerCase().replace(/ё/g, "е");
          const cleanPunct = (s: string) => s.replace(/[.,!?;:\-–—"'\(\)]/gi, "");
          const cleanGuess = cleanPunct(strippedText);
          const cleanTarget = cleanPunct(target);

          const guessNoSpace = cleanGuess.replace(/\s+/g, "");
          const targetNoSpace = cleanTarget.replace(/\s+/g, "");

          const wordsInGuess = cleanGuess.split(/\s+/);

          const isMatch = cleanGuess === cleanTarget || 
                          guessNoSpace === targetNoSpace || 
                          wordsInGuess.includes(cleanTarget) ||
                          wordsInGuess.some(w => w === cleanTarget || (cleanTarget.length >= 2 && w.includes(cleanTarget))) ||
                          (targetNoSpace.length >= 2 && guessNoSpace.includes(targetNoSpace));

          if (isMatch) {
            if (croc.timeoutTimer) clearTimeout(croc.timeoutTimer);
            crocGames.delete(peerId);
            crocGames.delete(Number(peerId));
            crocGames.delete(String(peerId));
            await updateUser(userId, { balance: (user.balance || 0) + 30000 });

            await sendVkMessage(VK_TOKEN, peerId, `🎉 Поздравляем! [id${userId}|${fullName}] угадал(-а) слово!\n\n| Слово было: ${croc.word}\n| Награда: 30.000$\n\n| Игра завершена!`, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
            });
            return;
          }
        }
      }

      let cmdText = text.trim();

      if (/^[+!\./]?поженит\s+ь/i.test(cmdText)) {
        cmdText = cmdText.replace(/поженит\s+ь/i, "поженить");
      }

      const prefixes = ["/", "+", "!", "."];
      const hasPrefix = prefixes.some(p => cmdText.startsWith(p));
      
      if (hasPrefix) {
        if (!cmdText.startsWith("/")) {
          cmdText = "/" + cmdText.slice(1);
        }
      } else {
        const firstWord = cmdText.split(/\s+/)[0].toLowerCase();
        const knownCommandsWithoutSlash = [
          "цитата", "пиво", "крокодил", "баланс", "приз", "передать", "топ", "пивозавры",
          "рулетка", "казино", "бизнес", "купитьбиз", "ппрод", "купитьпрод", "налог",
          "продатьбиз", "дуэль", "погода", "курс", "купитькоин", "продатькоин", "передатькоин",
          "банк", "снятьбанк", "купитьвип", "вип", "купитьпрем", "купитьпремиум", "прем", "премиум", "взлом", "фортуна", "ежедневный", "бонус", "подписка", "профиль", "брак", "мафия", "установитьфото",
          "удалитьфото", "кнб", "rep", "deletephotoprofile", "поженить", "развести", "кто",
          "инфа", "gamehelp", "игровые", "other", "help", "команды", "промо", "setrole",
          "giverole", "createpromo", "изменитькурс", "установитьмножитель", "установитьмножительдуэлэй",
          "установитьмножительрулетки", "наградаинв", "банигр", "чсигр", "addblackgame", "снятьбанигр",
          "снятьчсигр", "unblackgames", "hidetop", "unhidetop", "hidebalance", "unhidebalance", "раздача",
          "givemoney", "resetmoney", "givebusiness", "resetbusiness", "givevip", "resetvip",
          "givebeer", "resetbeer", "giverep", "resetrep", "giveprod", "resetprod", "reset",
          "deleteduals", "deleteduel", "очиститьдуэли", "пример", "пинг"
        ];
        if (knownCommandsWithoutSlash.includes(firstWord)) {
          cmdText = "/" + cmdText;
        }
      }

      if (!cmdText.startsWith("/")) return;

      // Rate Limit: 2 commands per 5 seconds
      const now = Date.now();
      let history = commandHistory.get(userId);
      if (!history) {
        history = { timestamps: [] };
        commandHistory.set(userId, history);
      }
      history.timestamps = history.timestamps.filter(t => now - t < 5000);
      if (history.timestamps.length >= 2 && !isAdmin) {
         return await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], не флудите! Максимум 2 команды в 5 секунд.`);
      }
      history.timestamps.push(now);

      const args = cmdText.split(/\s+/);
      const rawCmd = args[0].toLowerCase();

      // Ensure user allowed messages from bot
      if (peerId > 2000000000) {
        if (!user.wroteInDm) {
          try {
            const groupIdNum = parseInt(String(VK_GROUP_ID).replace("-", ""));
            const allowRes = await vkApi.get("messages.isMessagesFromGroupAllowed", {
              params: { group_id: groupIdNum, user_id: userId, access_token: VK_TOKEN, v: "5.131" }
            });
            if (allowRes.data?.response?.is_allowed) {
              await updateUser(userId, { wroteInDm: true });
              user.wroteInDm = true;
            } else {
              return await sendVkMessage(VK_TOKEN, peerId, "Для начала игры с ботом, напишите ему в ЛС!", {
                forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true }),
                keyboard: JSON.stringify({
                  inline: true,
                  buttons: [[{ action: { type: "open_link", label: "Написать в лс бота", link: `https://vk.ru/write-${groupIdNum}?ref=` } }]]
                })
              });
            }
          } catch (e) { console.error(e); }
        }
      } else {
        if (!user.wroteInDm) {
          await updateUser(userId, { wroteInDm: true });
          user.wroteInDm = true;
        }
      }

      // Log the command
      const logText = `📝 ЛОГ КОМАНДЫ\n\n| Игрок: [id${userId}|${fullName}]\n| Команда: ${cmdText}\n| Где: ${peerId > 2000000000 ? "Беседа" : "ЛС"}\n| Время: ${formatMskDate(Date.now())}`;
      sendVkMessage(VK_TOKEN, 2000000010, logText).catch(() => {});

      // Check Game Blacklist for ALL commands
      if (user.isGameBanned && user.role < 12) {
        const durationText = user.gameBanUntil ? formatMskDate(user.gameBanUntil) : "Навсегда";
        const reasonText = user.gameBanReason || "Нарушение правил";
        return await sendVkMessage(VK_TOKEN, peerId, `Вы заблокированы в боте!\n\n| Причина: ${reasonText}\n| Блокировка до: ${durationText}`, {
          forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
        });
      }

      const sendResponse = async (responseText: string, extraParams: any = {}) => {
        const replyParams = {
          forward: JSON.stringify({
            peer_id: peerId,
            conversation_message_ids: [message.conversation_message_id],
            is_reply: true
          })
        };
        return await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...extraParams });
      };

      // 1. /цитата
      if (rawCmd === "/цитата") {
        const now = Date.now();
        const lastUsed = cooldowns.get(userId) || 0;
        const remaining = 10 - Math.floor((now - lastUsed) / 1000);
        if (remaining > 0) return await sendResponse(`Подождите ${remaining} сек. перед созданием следующей цитаты!`);

        cooldowns.set(userId, now);
        let quoteText = args.slice(1).join(" ");
        let targetId = userId;
        if (message.reply_message) {
          quoteText = message.reply_message.text;
          targetId = message.reply_message.from_id;
        }
        if (!quoteText || quoteText.trim().length === 0) return await sendResponse("Укажите текст цитаты!");

        let initialMessageId: any = null;
        try {
          const loadingRes = await sendVkMessage(VK_TOKEN, peerId, "Пожалуйста подождите, загружаю вашу цитату...");
          if (loadingRes?.response) {
            initialMessageId = Array.isArray(loadingRes.response) ? loadingRes.response[0]?.message_id || loadingRes.response[0] : (loadingRes.response.message_id || loadingRes.response);
          }
        } catch (e) {}

        try {
          const uData = await vkApi.get("users.get", {
            params: { user_ids: targetId, fields: "photo_200", access_token: VK_TOKEN, v: "5.131" }
          });
          const userData = uData.data.response[0];
          const avatarUrl = userData.photo_200;
          const authorName = `${userData.first_name} ${userData.last_name}`;

          const quoteBuffer = await generateQuote(quoteText, avatarUrl, authorName);
          const uploadResult = await uploadPhoto(peerId, quoteBuffer);

          if (initialMessageId) {
            setTimeout(async () => {
              try {
                await vkApi.get("messages.delete", {
                  params: { peer_id: peerId, message_ids: String(initialMessageId), delete_for_all: 1, access_token: VK_TOKEN, v: "5.131" }
                });
              } catch (e) {}
            }, 1000);
          }

          if (uploadResult.attachment) {
            await sendResponse(`Цитата от пользователя [id${targetId}|${authorName}]`, { attachment: uploadResult.attachment });
          } else {
            await sendResponse(`Ошибка создания цитаты: ${uploadResult.error}`);
          }
        } catch (e: any) {
          await sendResponse("Произошла ошибка при создании цитаты.");
        }
        return;
      }

      // 2. /пиво
      if (rawCmd === "/пиво") {
        const nowSec = Math.floor(Date.now() / 1000);
        const lastBeer = user.lastBeerTime || 0;
        const cooldownMs = 3600 - (nowSec - lastBeer);

        if (cooldownMs > 0) {
          const remMin = Math.ceil(cooldownMs / 60);
          return await sendResponse(`Следующая попытка выпить пиво будет через ${remMin} мин.`);
        }

        // 5% chance fail
        if (Math.random() < 0.05) {
          await updateUser(userId, { lastBeerTime: nowSec });
          return await sendResponse(`😭 Попытка выпить пива оказалась неудачной!\nПопробуйте снова через 1 час.`);
        }

        const drunkLiters = parseFloat((Math.random() * (5.0 - 0.1) + 0.1).toFixed(1));
        const newTotalBeer = parseFloat(((user.beer || 0) + drunkLiters).toFixed(1));

        await updateUser(userId, { beer: newTotalBeer, lastBeerTime: nowSec });

        return await sendResponse(`Ты выпил(-а) ${drunkLiters} литров пива! 🍺\n\nВыпито пива за месяц - ${newTotalBeer}\nСледующая попытка выпить пиво будет через 1 час.`);
      }

      // 3. /крокодил
      if (rawCmd === "/крокодил") {
        if (crocGames.has(peerId)) {
          return await sendResponse("В этой беседе уже идет или набирается игра Крокодил!");
        }

        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
          ]
        };

        const res = await sendResponse(`🎮 Игра "Крокодил"\n\n| Создатель: [id${userId}|${fullName}]`, {
          keyboard: JSON.stringify(keyboard)
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        const crocData: CrocLobby = {
          peerId,
          cmId: cmId || 0,
          creatorId: userId,
          creatorName: fullName,
          participants: [{ id: userId, name: fullName }],
          status: "lobby"
        };
        crocGames.set(peerId, crocData);
        crocGames.set(Number(peerId), crocData);
        return;
      }

      // 4. /баланс
      if (rawCmd === "/баланс") {
        let targetId = userId;
        let targetName = fullName;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (parsed.targetId) {
          targetId = parsed.targetId;
          targetName = parsed.targetName;
        }

        const targetUser = await getOrCreateUser(targetId);
        const isMe = targetId === userId;
        if (!isMe && targetUser.premiumBalanceHidden && !isAdmin) {
          return await sendResponse(`Пользователь [id${targetId}|${targetName}] скрыл свой баланс.`);
        }
        if (targetUser.hideBalance && !isMe && !isAdmin) {
          return await sendResponse(`Пользователь [id${targetId}|${targetName}] скрыл свой баланс.`);
        }

        return await sendResponse(`Баланс пользователя [id${targetId}|${targetName}]\n\n| На руках: ${(targetUser.balance || 0).toLocaleString()}$\n| В банке: ${(targetUser.bank || 0).toLocaleString()}$\n\n| JORDAN'S COIN: ${(targetUser.jc || 0).toLocaleString()} шт`);
      }

      if (rawCmd === "/ии") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) {
          return await sendResponse("Данная команда доступна только с премиумом статусом.");
        }
        const prompt = args.slice(1).join(" ");
        if (!prompt) return await sendResponse("/ии - Задать вопрос к ИИ.");
        
        let waitMsgId: any = null;
        try {
          const waitRes = await sendResponse("Пожалуйста подождите, ваш запрос обрабатывается...");
          if (waitRes?.response) {
            if (Array.isArray(waitRes.response)) {
              waitMsgId = typeof waitRes.response[0] === "object" ? waitRes.response[0].message_id : waitRes.response[0];
            } else if (typeof waitRes.response === "object") {
              waitMsgId = waitRes.response.message_id;
            } else {
              waitMsgId = waitRes.response;
            }
          }
        } catch (e) {}

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          const text = response.text || "Нет ответа";
          
          if (waitMsgId) {
            try {
              // Try to delete. If it fails, it's not critical but we log it.
              await vkApi.get("messages.delete", {
                params: { 
                  peer_id: peerId, 
                  message_ids: String(waitMsgId), 
                  delete_for_all: 1, 
                  access_token: VK_TOKEN, 
                  v: "5.131" 
                }
              });
            } catch (e) {}
          }

          return await sendResponse(text);
        } catch (error) {
          console.error("Gemini Error:", error);
          if (waitMsgId) {
            try {
              await vkApi.get("messages.delete", {
                params: { 
                  peer_id: peerId, 
                  message_ids: String(waitMsgId), 
                  delete_for_all: 1, 
                  access_token: VK_TOKEN, 
                  v: "5.131" 
                }
              });
            } catch (e) {}
          }
          return await sendResponse("Произошла ошибка при запросе к нейросети.");
        }
      }

      // 5. /приз
      if (rawCmd === "/приз") {
        const nowSec = Math.floor(Date.now() / 1000);
        const lastPrize = user.lastPrizeTime || 0;
        const cd = 7200 - (nowSec - lastPrize);
        if (cd > 0) {
          const remH = Math.floor(cd / 3600);
          const remM = Math.floor((cd % 3600) / 60);
          return await sendResponse(`Следующий приз будет через ${remH} ч. ${remM} мин.`);
        }

        const baseAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
        const mult = globalSettings.prizeMultiplier || 1;
        const prizeAmount = Math.floor(baseAmount * mult);
        await updateUser(userId, { balance: (user.balance || 0) + prizeAmount, lastPrizeTime: nowSec });

        return await sendVkMessage(VK_TOKEN, peerId, `🎉 [id${userId}|${fullName}] получает приз в размере ${prizeAmount.toLocaleString()}$!\n\n| Следующий приз будет через 2 часа.`);
      }

      // 6. /передать
      if (rawCmd === "/передать") {
        const parsed = await parseTargetUser(message, args.slice(1));
        const amount = parseNumber(args.find(a => /^\d+[kк]?$/.test(a.toLowerCase())) || "0");

        if (!parsed.targetId || parsed.targetId === userId) return await sendResponse("Укажите пользователя!");
        if (isNaN(amount) || amount <= 0) return await sendResponse("Укажите корректную сумму для передачи!");
        if ((user.balance || 0) < amount) return await sendResponse("У вас недостаточно средств на руках!");

        const targetUser = await getOrCreateUser(parsed.targetId);
        await updateUser(userId, { balance: user.balance - amount });
        await updateUser(parsed.targetId, { balance: (targetUser.balance || 0) + amount });

        return await sendResponse(`Вы передали ${amount.toLocaleString()}$ пользователю [id${parsed.targetId}|${parsed.targetName}]`);
      }

      // 7. /топ
      if (rawCmd === "/топ" || rawCmd === "/пивозавры") {
        if (args[1]?.toLowerCase() === "браки" || args[1]?.toLowerCase() === "брак" || args[1]?.toLowerCase() === "браков") {
          const text = await getTopMarriagesText();
          return await sendResponse(text);
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Топ по деньгам", payload: JSON.stringify({ cmd: "top_money", authorId: userId }) }, color: "primary" },
              { action: { type: "callback", label: "Топ по деньгам в банке", payload: JSON.stringify({ cmd: "top_bank", authorId: userId }) }, color: "primary" }
            ],
            [
              { action: { type: "callback", label: "Топ по пиву", payload: JSON.stringify({ cmd: "top_beer", authorId: userId }) }, color: "primary" },
              { action: { type: "callback", label: "Топ по JC", payload: JSON.stringify({ cmd: "top_jc", authorId: userId }) }, color: "primary" }
            ],
            [
              { action: { type: "callback", label: "Топ по бизнесам", payload: JSON.stringify({ cmd: "top_biz", authorId: userId }) }, color: "primary" },
              { action: { type: "callback", label: "Топ по репутации", payload: JSON.stringify({ cmd: "top_rep", authorId: userId }) }, color: "primary" }
            ],
            [
              { action: { type: "callback", label: "Топ по бракам", payload: JSON.stringify({ cmd: "top_marriages", authorId: userId }) }, color: "secondary" }
            ]
          ]
        };

        return await sendResponse(`Выберите категорию топа:`, { keyboard: JSON.stringify(keyboard) });
      }

      // 8. /рулетка
      if (rawCmd === "/рулетка") {
        let stake = parseNumber(args[1]);
        if (args[1]?.toLowerCase() === "все" || args[1]?.toLowerCase() === "вабанк") stake = user.balance || 0;
        if (isNaN(stake) || stake <= 0) return await sendResponse("Укажите сумму ставки!");
        if ((user.balance || 0) < stake) return await sendResponse("У вас недостаточно средств!");

        const win = Math.random() < 0.35; // 35% win rate
        if (win) {
          const winAmount = Math.floor(stake * (globalSettings.rouletteMultiplier || 3));
          await updateUser(userId, { balance: user.balance + winAmount });
          return await sendResponse(`🎰 [id${userId}|${fullName}], вы выиграли ${winAmount.toLocaleString()}$ в рулетке!`);
        } else {
          await updateUser(userId, { balance: user.balance - stake });
          return await sendResponse(`🎰 [id${userId}|${fullName}], вы проиграли ${stake.toLocaleString()}$ в рулетке.`);
        }
      }

// 10. Business system
      if (rawCmd === "/бизнес") {
        const bCount = user.businesses || 0;
        const bType = user.bizType || 0;
        const bizInfo = bType > 0 ? BIZ_TYPES[bType as keyof typeof BIZ_TYPES] : null;

        const bIncome = bizInfo ? bCount * bizInfo.profit : 0;
        const bProds = user.bizProducts || 0;

        const totalHoursLeft = bCount > 0 ? Math.floor(bProds / bCount) : 0;
        const days = Math.floor(totalHoursLeft / 24);
        const hours = totalHoursLeft % 24;
        const mins = 0;

        const pluralize = (num: number, forms: string[]) => {
          const MathAbs = Math.abs(num);
          const n = MathAbs % 100;
          const n1 = n % 10;
          if (n > 10 && n < 20) return forms[2];
          if (n1 > 1 && n1 < 5) return forms[1];
          if (n1 === 1) return forms[0];
          return forms[2];
        };

        const now = Date.now();
        const bizExpireAt = user.bizExpireAt || 0;
        let workMsLeft = bizExpireAt - now;
        if (workMsLeft < 0) workMsLeft = 0;

        const workHoursLeft = Math.floor(workMsLeft / 3600000);
        const workMinsLeft = Math.floor((workMsLeft % 3600000) / 60000);

        const incomeAcc = user.bizIncomeAcc || 0;

        let txt = `Статистика бизнесов [id${userId}|${fullName}]\n\n` +
                  `| Кол-во бизнесов: ${bCount}\n` +
                  `| Прибыль с бизнесов за 1 час: ${bIncome.toLocaleString()}$\n\n` +
                  `| Кол-во продуктов: ${bProds.toLocaleString()}\n` +
                  `| Продуктов хватит на: ${days} ${pluralize(days, ['день', 'дня', 'дней'])} ${hours} ${pluralize(hours, ['час', 'часа', 'часов'])} ${mins} ${pluralize(mins, ['минуту', 'минуты', 'минут'])}\n\n` +
                  `| До конца работы бизнесов: ${workHoursLeft} ${pluralize(workHoursLeft, ['час', 'часа', 'часов'])} ${workMinsLeft} ${pluralize(workMinsLeft, ['минуту', 'минуты', 'минут'])}\n\n` +
                  `| Общий баланс бизнесов: ${incomeAcc.toLocaleString()}$`;

        const keyboard: any = { inline: true, buttons: [] };

        if (incomeAcc > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Снять деньги с баланса бизнесов", payload: JSON.stringify({ cmd: "biz_collect_new", authorId: userId }) }, color: "positive" }]);
        }
        if (workMsLeft <= 0 && bCount > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Продлить работу бизнесов", payload: JSON.stringify({ cmd: "biz_renew", authorId: userId }) }, color: "negative" }]);
        }
        if (bCount > 0) {
          keyboard.buttons.push([{ action: { type: "callback", label: "Список всех ваших бизнесов", payload: JSON.stringify({ cmd: "biz_my_list", authorId: userId, page: 1 }) }, color: "secondary" }]);
        }

        let photoAttachment: string | null = null;
        if (bizInfo && bizInfo.img) {
           try {
             const uploadRes = await uploadPhoto(peerId, bizInfo.img, 1);
             if (uploadRes && uploadRes.attachment) photoAttachment = uploadRes.attachment;
           } catch (e) {
             console.error("Error attaching biz photo:", e);
           }
        }

        const options: any = {};
        if (keyboard.buttons.length > 0) options.keyboard = JSON.stringify(keyboard);
        if (photoAttachment) options.attachment = photoAttachment;

        return await sendResponse(txt, Object.keys(options).length > 0 ? options : undefined);
      }

      if (rawCmd === "/бизнесы") {
        let txt = `Список всех бизнесов в боте:\n\n`;
        Object.entries(BIZ_TYPES).forEach(([id, b]) => {
           txt += `${id}) ${b.name} | Цена: ${b.price.toLocaleString()}$ | Прибыль в час: ${b.profit.toLocaleString()}$\n`;
        });
        return await sendResponse(txt);
      }

      if (rawCmd === "/купитьбиз") {
        const typeId = parseNumber(args[1]);
        const count = parseNumber(args[2]) || 1;

        if (!typeId || !BIZ_TYPES[typeId as keyof typeof BIZ_TYPES]) {
           return await sendResponse("Используйте: /купитьбиз [номер бизнеса (1-10)] [кол-во]");
        }
        if (count <= 0 || count > 100) return await sendResponse("Вы можете купить от 1 до 100 бизнесов за раз!");

        const bType = user.bizType || 0;
        if (bType !== 0 && bType !== typeId && (user.businesses || 0) > 0) {
           return await sendResponse(`Вы можете покупать только бизнесы того же типа, который у вас уже есть (${BIZ_TYPES[bType as keyof typeof BIZ_TYPES].name})!`);
        }

        const bizInfo = BIZ_TYPES[typeId as keyof typeof BIZ_TYPES];
        const cost = count * bizInfo.price;

        if ((user.balance || 0) < cost) return await sendResponse(`Для покупки ${count} бизнес-(ов) требуется ${cost.toLocaleString()}$`);

        const newBiz = (user.businesses || 0) + count;
        const extraUpdates: any = { balance: user.balance - cost, businesses: newBiz, bizType: typeId };
        if ((user.businesses || 0) === 0) {
           extraUpdates.bizExpireAt = Date.now() + 5 * 3600 * 1000;
           extraUpdates.lastBizCollectTime = Math.floor(Date.now() / 1000);
        }

        await updateUser(userId, extraUpdates);
        return await sendResponse(`Вы купили ${count} бизнес-(ов)\n| Теперь у вас бизнесов: ${newBiz}\n| Не забудьте закупить продукты командой /ппрод!`);
      }

      if (rawCmd === "/продатьбиз") {
        const currentBiz = user.businesses || 0;
        if (currentBiz === 0) return await sendResponse("У вас нет бизнесов для продажи!");
        const count = parseNumber(args[1]) || currentBiz;
        if (count <= 0 || count > currentBiz) return await sendResponse("Укажите корректное количество бизнесов для продажи!");

        const bType = user.bizType || 0;
        const bizInfo = bType > 0 ? BIZ_TYPES[bType as keyof typeof BIZ_TYPES] : null;
        if (!bizInfo) return await sendResponse("У вас нет бизнесов для продажи!");

        const sellPrice = count * (bizInfo.price * 0.5); // Sell for 50% price
        const newBiz = currentBiz - count;

        let extra: any = { balance: (user.balance || 0) + sellPrice, businesses: newBiz };
        if (newBiz === 0) {
           extra.bizType = 0;
        }

        await updateUser(userId, extra);
        return await sendResponse(`Вы продали ${count} бизнес-(ов) за ${sellPrice.toLocaleString()}$\n| У вас осталось: ${newBiz} бизнес-(ов)`);
      }

      if (rawCmd === "/ппрод" || rawCmd === "/купитьпрод") {
        const bCount = user.businesses || 0;
        if (bCount === 0) return await sendResponse("У вас нет бизнесов для закупки продуктов!");
        const count = parseNumber(args[1]) || (bCount * 24);
        if (count <= 0) return await sendResponse("Укажите корректное количество продуктов!");
        const cost = count * 250;
        if ((user.balance || 0) < cost) return await sendResponse(`У вас недостаточно средств! (Необходимо: ${cost.toLocaleString()}$ за ${count} продуктов)`);
        const newProds = (user.bizProducts || 0) + count;
        await updateUser(userId, { balance: user.balance - cost, bizProducts: newProds });
        return await sendResponse(`Вы успешно закупили ${count} продуктов для бизнеса за ${cost.toLocaleString()}$!\n| Всего продуктов: ${newProds}`);
      }

      if (rawCmd === "/премпрофиль") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) return await sendResponse("Данная команда доступна только с премиумом статусом.");
        const mode = args[1];
        if (mode === "+") {
          await updateUser(userId, { premiumProfileHidden: false });
          return await sendResponse("Вы открыли свой профиль для публичного просмотра");
        } else if (mode === "-") {
          await updateUser(userId, { premiumProfileHidden: true });
          return await sendResponse("Вы закрыли свой профиль для публичного просмотра");
        } else {
          return await sendResponse("Данная команда позволяет скрыть профиль, или открыть его, для публичного просмотра, форма ответа к команде: /премпрофиль -/+");
        }
      }

      if (rawCmd === "/прембаланс") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) return await sendResponse("Данная команда доступна только с премиумом статусом.");
        const mode = args[1];
        if (mode === "+") {
          await updateUser(userId, { premiumBalanceHidden: false });
          return await sendResponse("Вы открыли свой баланс для публичного просмотра");
        } else if (mode === "-") {
          await updateUser(userId, { premiumBalanceHidden: true });
          return await sendResponse("Вы закрыли свой баланс для публичного просмотра");
        } else {
          return await sendResponse("Данная команда позволяет скрыть баланс, или открыть его, для публичного просмотра, форма ответа к команде: /прембаланс -/+");
        }
      }

      if (rawCmd === "/открытьдепозит") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) return await sendResponse("Данная команда доступна только с премиумом статусом.");
        
        const days = parseInt(args[1]);
        const amountStr = args[2] || "";
        let amount = parseNumber(amountStr);

        if (user.deposits && user.deposits.length >= 2) {
          return await sendResponse("У вас уже открыто максимум 2 депозита!");
        }

        const validDays = [4, 8, 10];
        if (!validDays.includes(days)) return await sendResponse("Доступные сроки депозитов: 4 дня (10%), 8 дней (25%), 10 дней (35%)");
        if (isNaN(amount) || amount <= 0 || amount === Infinity) return await sendResponse("Укажите корректную сумму для депозита!");
        if (user.balance < amount) return await sendResponse("У вас недостаточно средств на руках!");

        const percentMap: Record<number, number> = { 4: 10, 8: 25, 10: 35 };
        const percent = percentMap[days];
        const expiresAt = Date.now() + days * 86400 * 1000;
        
        const newDeposit = {
          id: Date.now(),
          amount: Math.floor(amount),
          percent,
          days,
          expiresAt,
          openedAt: Date.now()
        };

        const updatedDeposits = [...(user.deposits || []), newDeposit];
        await updateUser(userId, { balance: user.balance - Math.floor(amount), deposits: updatedDeposits });
        
        return await sendResponse(`Вы открыли депозит на сумму «${Math.floor(amount).toLocaleString()}$» на кол-во дней ${days}`);
      }

      if (rawCmd === "/депозиты") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) return await sendResponse("Данная команда доступна только с премиумом статусом.");

        const deposits = user.deposits || [];
        const readyCount = deposits.filter((d: any) => Date.now() >= d.expiresAt).length;

        let text = `...::Управление депозитами::...\n\n` +
          `| Кол-во открытых депозитов у вас: ${deposits.length}\n` +
          `| Кол-во депозитов, которые можно забрать: ${readyCount}\n\n` +
          `| Информация о открытых депозитах:\n\n`;

        const buttons: any[] = [];
        deposits.forEach((d: any, idx: number) => {
          const daysLeft = Math.max(0, Math.ceil((d.expiresAt - Date.now()) / (86400 * 1000)));
          const finalAmount = Math.floor(d.amount * (1 + d.percent / 100));
          text += `${idx + 1}) Депозит №${idx + 1} | Сумма: ${d.amount.toLocaleString()}$ | Процент: ${d.percent}% | На: ${d.days} д | До вывода: ${daysLeft} д | Итог: ${finalAmount.toLocaleString()}$\n`;
          
          if (Date.now() >= d.expiresAt) {
            buttons.push([{ action: { type: "callback", label: `Закрыть депозит №${idx + 1}`, payload: JSON.stringify({ cmd: "deposit_close", id: d.id, num: idx + 1 }) }, color: "positive" }]);
          }
        });

        if (deposits.length === 0) text += "У вас нет активных депозитов.";

        return await sendResponse(text, { keyboard: JSON.stringify({ inline: true, buttons }) });
      }

      if (rawCmd === "/дуэль") {
        let stake = parseNumber(args[1]);
        if (args[1]?.toLowerCase() === "все" || args[1]?.toLowerCase() === "вабанк") stake = user.balance || 0;
        if (isNaN(stake) || stake <= 0) return await sendResponse("Укажите сумму ставки!");
        if ((user.balance || 0) < stake) return await sendResponse("У вас недостаточно средств!");

        const keyboard = {
          inline: true,
          buttons: [[{ action: { type: "callback", label: "Сразиться", payload: JSON.stringify({ cmd: "duel_join", creatorId: userId, creatorName: fullName, stake }) }, color: "positive" }]]
        };

        duelGames.set(peerId, { peerId, cmId: 0, creatorId: userId, creatorName: fullName, amount: stake });
        return await sendResponse(`[id${userId}|${fullName}] запустил(-а) дуэль на ${stake.toLocaleString()}$!\n\n| Что бы сразиться в дуэли, нажмите на кнопку`, {
          keyboard: JSON.stringify(keyboard)
        });
      }

      if (rawCmd === "/дуэльбиз") {
        const count = parseNumber(args[1]);
        if (isNaN(count) || count <= 0) return await sendResponse("Укажите количество бизнесов!");
        if ((user.businesses || 0) < count) return await sendResponse("У вас недостаточно бизнесов!");

        const keyboard = {
          inline: true,
          buttons: [[{ action: { type: "callback", label: "Сразиться", payload: JSON.stringify({ cmd: "duel_biz_join", creatorId: userId, creatorName: fullName, count }) }, color: "positive" }]]
        };

        duelBizGames.set(peerId, { peerId, cmId: 0, creatorId: userId, creatorName: fullName, count });
        return await sendResponse(`[id${userId}|${fullName}] запустил(-а) дуэль на ${count} ${getBizDeclension(count)}!\n\n| Что бы сразиться в дуэли, нажмите на кнопку`, {
          keyboard: JSON.stringify(keyboard)
        });
      }

      if (rawCmd === "/погода") {
        const city = args.slice(1).join(" ").trim();
        if (!city) {
          return await sendResponse("Используйте: /погода (например, /погода Москва)");
        }
        const forecast = await getWeatherForecast(city, "today");
        if (!forecast) {
          return await sendResponse("Город не найден.");
        }
        return await sendResponse(forecast.text, { keyboard: JSON.stringify(forecast.keyboard) });
      }

      // 12. JORDAN'S COIN: /курс, /купитькоин, /продатькоин, /передатькоин
      if (rawCmd === "/курс") {
        return await sendResponse(`Курс JORDAN'S COIN\n\n| Стоимость одного JORDAN'S COIN: ${globalSettings.jcRate.toLocaleString()}$`);
      }

      if (rawCmd === "/купитькоин") {
        const count = parseNumber(args[1]) || 1;
        if (count <= 0) return await sendResponse("Укажите количество!");
        const totalCost = count * globalSettings.jcRate;
        if ((user.balance || 0) < totalCost) return await sendResponse(`У вас недостаточно средств! (Нужно: ${totalCost.toLocaleString()}$)`);

        await updateUser(userId, { balance: user.balance - totalCost, jc: (user.jc || 0) + count });
        return await sendResponse(`Вы купили ${count} JORDAN'S COIN за ${totalCost.toLocaleString()}$`);
      }

      if (rawCmd === "/продатькоин") {
        const count = parseNumber(args[1]) || 1;
        if (count <= 0 || (user.jc || 0) < count) return await sendResponse(`У вас недостаточно коинов! (Имеется: ${user.jc || 0})`);
        const totalRefund = count * globalSettings.jcRate;

        await updateUser(userId, { balance: (user.balance || 0) + totalRefund, jc: user.jc - count });
        return await sendResponse(`Вы продали ${count} JORDAN'S COIN за ${totalRefund.toLocaleString()}$`);
      }

      if (rawCmd === "/передатькоин") {
        const parsed = await parseTargetUser(message, args.slice(1));
        const count = parseNumber(args.find(a => /^\d+[kк]?$/.test(a.toLowerCase())) || "0");

        if (!parsed.targetId || parsed.targetId === userId) return await sendResponse("Укажите пользователя!");
        if (count <= 0 || (user.jc || 0) < count) return await sendResponse("У вас недостаточно коинов!");

        const targetUser = await getOrCreateUser(parsed.targetId);
        await updateUser(userId, { jc: user.jc - count });
        await updateUser(parsed.targetId, { jc: (targetUser.jc || 0) + count });

        return await sendResponse(`Вы передали ${count} JORDAN'S COIN пользователю [id${parsed.targetId}|${parsed.targetName}]`);
      }

      // 13. Bank: /банк, /снятьбанк
      if (rawCmd === "/банк") {
        let amount = parseNumber(args[1]);
        if (args[1]?.toLowerCase() === "все") amount = user.balance || 0;
        if (isNaN(amount) || amount <= 0) return await sendResponse("Укажите сумму!");
        if ((user.balance || 0) < amount) return await sendResponse("У вас недостаточно средств!");

        await updateUser(userId, { balance: user.balance - amount, bank: (user.bank || 0) + amount });
        return await sendResponse(`Вы положили ${amount.toLocaleString()}$ в банк`);
      }

      if (rawCmd === "/снятьбанк") {
        let amount = parseNumber(args[1]);
        if (args[1]?.toLowerCase() === "все") amount = user.bank || 0;
        if (isNaN(amount) || amount <= 0) return await sendResponse("Укажите сумму!");
        if ((user.bank || 0) < amount) return await sendResponse("У вас недостаточно средств в банке!");

        await updateUser(userId, { balance: (user.balance || 0) + amount, bank: user.bank - amount });
        return await sendResponse(`Вы сняли ${amount.toLocaleString()}$ с банка`);
      }

      // 14. Premium System: /купитьпрем, /купитьпремиум, /купитьвип, /прем, /премиум, /вип
      if (rawCmd === "/купитьпрем" || rawCmd === "/купитьпремиум" || rawCmd === "/купитьвип") {
        const cost = 15000000;
        if ((user.balance || 0) < cost) return await sendResponse(`Стоимость Premium-статуса: 15.000.000$ на 30 дней!`);

        const now = Date.now();
        const currentExp = user.vipExpires > now ? user.vipExpires : now;
        const newExp = currentExp + (30 * 86400 * 1000);

        await updateUser(userId, { balance: user.balance - cost, vipExpires: newExp });
        return await sendResponse(`Вы успешно приобрели Premium-статус на 30 дней!`);
      }

      if (rawCmd === "/прем" || rawCmd === "/премиум" || rawCmd === "/вип") {
        const hasPremium = user.vipExpires > Date.now();
        const statusText = hasPremium ? "есть" : "нет према.";
        let expStr = "";
        if (hasPremium) {
          const d = new Date(user.vipExpires);
          const dateFormatted = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
          expStr = `\n\n| До конца према - ${dateFormatted}`;
        }
        return await sendResponse(`Информация о Premium Статусе:\n\n| Статус - ${statusText}${expStr}`);
      }

      // /взлом
      if (rawCmd === "/взлом") {
        const now = Date.now();
        const cooldownMs = 3 * 3600 * 1000; // 3 hours
        if (user.lastHackAt && now - user.lastHackAt < cooldownMs) {
          const rem = cooldownMs - (now - user.lastHackAt);
          const hours = Math.floor(rem / 3600000);
          const minutes = Math.floor((rem % 3600000) / 60000);
          const seconds = Math.floor((rem % 60000) / 1000);
          return await sendResponse(`⏳ Вы сможете взломать снова через ${hours} ч. ${minutes} мин. ${seconds} сек.`);
        }

        const hackPhotos = [
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",
          "https://images.unsplash.com/photo-1614064641913-a520faff82b1?w=600",
          "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600",
          "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600"
        ];

        const formType = Math.floor(Math.random() * 7) + 1; // 1 to 7
        let textResp = "";
        let needsPhoto = false;

        if (formType === 1) {
          const gain = Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000;
          await updateUser(userId, { balance: (user.balance || 0) + gain, lastHackAt: now });
          textResp = `Вы попытались взломать сервер Minecraft, и у вас получилось!\n| Вы заработали: ${gain.toLocaleString()}$`;
          needsPhoto = true;
        } else if (formType === 2) {
          const loss = 20000;
          await updateUser(userId, { balance: Math.max(0, (user.balance || 0) - loss), lastHackAt: now });
          textResp = `Вы попытались взломать сервер Minecraft, и у вас не получилось :(\n| Что бы владелец сервера Minecraft не писал на вас заявление за взлом, вам пришлось ему отдать 20.000$`;
        } else if (formType === 3) {
          const gain = Math.floor(Math.random() * (100000 - 10000 + 1)) + 10000;
          await updateUser(userId, { balance: (user.balance || 0) + gain, lastHackAt: now });
          textResp = `Вы попытались взломать системы безопасности крупной компании, и у вас получилось!\n| Вы заработали: ${gain.toLocaleString()}$`;
          needsPhoto = true;
        } else if (formType === 4) {
          await updateUser(userId, { lastHackAt: now });
          textResp = `Вы попытались взломать системы безопасности крупной компании, но вас отвлёк телефонный звонок, и у вас ничего не получилось :(`;
        } else if (formType === 5) {
          const gain = Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000;
          await updateUser(userId, { balance: (user.balance || 0) + gain, lastHackAt: now });
          textResp = `Вы попытались взломать запороленный телефон, и у вас получилось!\n| Вы заработали: ${gain.toLocaleString()}$`;
          needsPhoto = true;
        } else if (formType === 6) {
          await updateUser(userId, { lastHackAt: now });
          textResp = `Вы попытались взломать запороленный телефон, и у вас ничего не получилось :(`;
        } else {
          const loss = 30000;
          await updateUser(userId, { balance: Math.max(0, (user.balance || 0) - loss), lastHackAt: now });
          textResp = `Вас посадили в тюрьму, за то что вы пытались взломать youtube канал популярного блогера.\n| Что бы вас оттуда выпустили, вам пришлось заплатить 30.000$`;
        }

        const extra: any = {};
        if (needsPhoto) {
          const randImg = hackPhotos[Math.floor(Math.random() * hackPhotos.length)];
          const uploadRes = await uploadPhoto(peerId, randImg);
          if (uploadRes.attachment) extra.attachment = uploadRes.attachment;
        }

        return await sendResponse(textResp, extra);
      }

      // /фортуна
      if (rawCmd === "/фортуна") {
        const now = Date.now();
        const cooldownMs = 86400000; // 1 day
        if (user.lastFortuneAt && now - user.lastFortuneAt < cooldownMs) {
          const rem = cooldownMs - (now - user.lastFortuneAt);
          const hours = Math.floor(rem / 3600000);
          const minutes = Math.floor((rem % 3600000) / 60000);
          const seconds = Math.floor((rem % 60000) / 1000);
          return await sendResponse(`⏳ Вы сможете прокрутить колесо фортуны снова через ${hours} ч. ${minutes} мин. ${seconds} сек.`);
        }

        const options = [
          { label: "+3 репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 3, lastFortuneAt: now }) },
          { label: "100.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 100000, lastFortuneAt: now }) },
          { label: "4 литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 4, lastFortuneAt: now }) },
          { label: "50.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 50000, lastFortuneAt: now }) },
          { label: "3 литров пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 3, lastFortuneAt: now }) },
          { label: "+2 репутации", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 2, lastFortuneAt: now }) },
          { label: "+1 репутацию", apply: async () => updateUser(userId, { rep: (user.rep || 0) + 1, lastFortuneAt: now }) },
          { label: "2 литра пива", apply: async () => updateUser(userId, { beer: (user.beer || 0) + 2, lastFortuneAt: now }) },
          { label: "150.000$", apply: async () => updateUser(userId, { balance: (user.balance || 0) + 150000, lastFortuneAt: now }) }
        ];

        const item = options[Math.floor(Math.random() * options.length)];
        await item.apply();

        return await sendResponse(`Вы прокрутили колесо фортуны, и вам выпало: ${item.label}`);
      }

      // /ежедневный бонус
      if (rawCmd === "/ежедневный" || rawCmd === "/ежедневный_бонус" || rawCmd === "/бонус") {
        const now = Date.now();
        const currentDay = user.dailyDay || 1;
        const dayData = DAILY_BONUSES[currentDay] || DAILY_BONUSES[1];
        const isReady = !user.lastDailyAt || (now - user.lastDailyAt >= 86400000);
        const statusStr = isReady ? "готов" : "не готов";

        const textResp = `Ваш ежедневный бонус: ${statusStr}\n| Бонус сегодня: ${dayData.label}`;

        if (isReady) {
          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Забрать бонус", payload: JSON.stringify({ cmd: "claim_daily_bonus", authorId: userId }) }, color: "positive" }
              ]
            ]
          };
          return await sendResponse(textResp, { keyboard: JSON.stringify(keyboard) });
        } else {
          return await sendResponse(textResp);
        }
      }

      // /подписка
      if (rawCmd === "/подписка") {
        if (user.hasSubBonus) {
          return await sendResponse("Вы уже получали бонус за подписку на сообщество!");
        }

        try {
          const memberRes = await axios.get("https://api.vk.com/method/groups.isMember", {
            params: {
              access_token: VK_TOKEN,
              v: "5.131",
              group_id: "239281784",
              user_id: userId
            }
          });
          const isMember = memberRes.data?.response === 1 || memberRes.data?.response?.member === 1;

          if (!isMember) {
            return await sendResponse(`Вы ещё не подписались на сообщество, что бы получить бонус.\n| Если вы желаете получить бонус за подписку, то подпишитесь на это сообщество: [https://vk.ru/gm_manager_official|GAMES MANAGER]`);
          }

          await updateUser(userId, { balance: (user.balance || 0) + 200000, hasSubBonus: true });
          return await sendResponse(`Вы получили бонус за подписку на сообщество!\n| Размер бонуса: 200.000$`);
        } catch (e) {
          return await sendResponse(`Вы ещё не подписались на сообщество, что бы получить бонус.\n| Если вы желаете получить бонус за подписку, то подпишитесь на это сообщество: [https://vk.ru/gm_manager_official|GAMES MANAGER]`);
        }
      }

      if (rawCmd === "/профиль") {
        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const targetName = parsed.targetName || fullName;
        const targetUser = await getOrCreateUser(targetId, targetName);

        const isMe = targetId === userId;
        const hasPremium = targetUser.vipExpires > Date.now();

        if (!isMe && targetUser.premiumProfileHidden && !isAdmin) {
          return await sendResponse(`Профиль пользователя [id${targetId}|${targetName}] скрыт настройками приватности.`);
        }

        let balanceStr = targetUser.premiumBalanceHidden && !isMe && !isAdmin ? "Скрыт" : `${(targetUser.balance || 0).toLocaleString()}$`;
        let bankStr = targetUser.premiumBalanceHidden && !isMe && !isAdmin ? "Скрыт" : `${(targetUser.bank || 0).toLocaleString()}$`;

        let profileText = `👤 Профиль игрока [id${targetId}|${targetName}]\n\n` +
          `| На балансе: ${balanceStr}\n` +
          `| В банке: ${bankStr}`;
        
        if (targetUser.marriage && targetUser.marriage.partnerId) {
          const pId = targetUser.marriage.partnerId;
          let pName = targetUser.marriage.partnerName || `Участник ${pId}`;
          if (pName.includes("@") || pName.toLowerCase().includes("user")) {
             // If name is @User or similar, try to fetch fresh name
             try {
               const pRes = await vkApi.get("users.get", { params: { user_ids: pId, access_token: VK_TOKEN, v: "5.131" } });
               if (pRes.data.response?.[0]) {
                 pName = `${pRes.data.response[0].first_name} ${pRes.data.response[0].last_name}`;
                 // Update it in DB for next time
                 await updateUser(pId, { name: pName }); // Update the partner themselves
                 await updateUser(targetId, { "marriage.partnerName": pName }); // Update current user's reference
               }
             } catch (e) {}
          }
          profileText += `\n\n| Женат на: [id${pId}|${pName}]`;
        }
        
        profileText += `\n\n| Бизнесов: ${targetUser.businesses || 0}\n` +
          `| Кол-во репутации: ${targetUser.rep || 0}\n` +
          `| Выпито всего пива: ${(targetUser.beer || 0).toFixed(1)} л`;

        if (hasPremium) {
          profileText += `\n| Premium Игрок`;
        }

        const extraParams: any = {};
        if (targetUser.profilePhoto) {
          extraParams.attachment = targetUser.profilePhoto;
        }
        return await sendResponse(profileText, extraParams);
      }

      if (rawCmd === "/казино") {
        let stake = 0;
        if (args[1]?.toLowerCase() === "всё" || args[1]?.toLowerCase() === "все" || args[1]?.toLowerCase() === "вабанк") {
          stake = user.balance || 0;
        } else {
          stake = parseNumber(args[1] || "0");
        }

        if (isNaN(stake) || stake <= 0) {
          return await sendResponse("Укажите корректную сумму ставки!");
        }

        if ((user.balance || 0) < stake) {
          return await sendResponse("У вас недостаточно средств!");
        }

        const emojis = ["💎", "🍒", "🍀", "🪙", "🔔", "🍋", "💰", "⭐", "🔥", "🎲"];
        const e1 = emojis[Math.floor(Math.random() * emojis.length)];
        const e2 = emojis[Math.floor(Math.random() * emojis.length)];
        const e3 = emojis[Math.floor(Math.random() * emojis.length)];

        let bonusPercent = 0;
        [e1, e2, e3].forEach(e => {
          if (e === "💎") bonusPercent += 30;
          if (e === "🪙") bonusPercent += 10;
          if (e === "🔔") bonusPercent += 50;
        });

        const isJackpot = (e1 === e2 && e2 === e3);
        let winAmount = 0;
        let isWin = false;

        if (bonusPercent > 0 || isJackpot) {
          isWin = true;
          winAmount = Math.floor(stake * (1 + bonusPercent / 100));
          if (isJackpot) winAmount *= 3;
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Повторно сыграть", payload: JSON.stringify({ cmd: "casino_again", stake, authorId: userId }) }, color: "primary" },
              { action: { type: "callback", label: "Сыграть на весь баланс", payload: JSON.stringify({ cmd: "casino_allin", authorId: userId }) }, color: "positive" }
            ]
          ]
        };

        if (isWin) {
          const profit = winAmount - stake;
          await updateUser(userId, { balance: (user.balance || 0) + profit });
          let resText = `🎰 Вы поставили ${stake.toLocaleString()}$\n\n` +
            `| Выпало: (${e1} ${e2} ${e3})\n` +
            `| Бонус: +${bonusPercent}%\n\n`;
          
          if (isJackpot) {
            resText += `!!! JACKPOT! 3 одинаковых (${e1})!!!\n\n`;
          }
          
          resText += `| Вы выиграли ${winAmount.toLocaleString()}$ (прибыль: ${profit.toLocaleString()}$)`;
          
          return await sendResponse(resText, { keyboard: JSON.stringify(keyboard) });
        } else {
          await updateUser(userId, { balance: (user.balance || 0) - stake });
          const resText = `🎰 Вы поставили ${stake.toLocaleString()}$\n\n` +
            `| Выпало: (${e1} ${e2} ${e3})\n` +
            `| Бонус: 0%\n\n` +
            `| Вы проиграли ${stake.toLocaleString()}$`;
          
          return await sendResponse(resText, { keyboard: JSON.stringify(keyboard) });
        }
      }

      if (rawCmd === "/брак" && args[1]?.toLowerCase() === "запрос") {
        if (user.marriage && user.marriage.partnerId) return await sendResponse("Вы уже состоите в браке!");
        const parsed = await parseTargetUser(message, args.slice(2));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (parsed.targetId === userId) return await sendResponse("Нельзя жениться на самом себе!");

        const targetUser = await getOrCreateUser(parsed.targetId);
        if (targetUser.marriage && targetUser.marriage.partnerId) return await sendResponse("Этот пользователь уже состоит в браке!");

        const keyboard = {
          inline: true,
          buttons: [[
            { action: { type: "callback", label: "Согласиться", payload: JSON.stringify({ cmd: "marriage_accept", proposerId: userId, proposerName: fullName, targetId: parsed.targetId, targetName: parsed.targetName }) }, color: "positive" },
            { action: { type: "callback", label: "Отказаться", payload: JSON.stringify({ cmd: "marriage_decline", proposerId: userId, proposerName: fullName, targetId: parsed.targetId, targetName: parsed.targetName }) }, color: "negative" }
          ]]
        };

        return await sendResponse(`[id${parsed.targetId}|${parsed.targetName}], минуточку внимания!\n\n[id${userId}|${fullName}] хочет сделать вам предложение!\n\nПринять решение можно нажав на кнопки:`, {
          keyboard: JSON.stringify(keyboard)
        });
      }

      if (rawCmd === "/брак" && args[1]?.toLowerCase() === "развод") {
        if (!user.marriage || !user.marriage.partnerId) return await sendResponse("Вы не состоите в браке!");
        const partnerId = user.marriage.partnerId;
        const partnerName = user.marriage.partnerName;

        const keyboard = {
          inline: true,
          buttons: [[
            { action: { type: "callback", label: "Развестись", payload: JSON.stringify({ cmd: "divorce_accept", userId, fullName, partnerId, partnerName }) }, color: "positive" },
            { action: { type: "callback", label: "Не разводиться", payload: JSON.stringify({ cmd: "divorce_cancel", userId, fullName, partnerId, partnerName }) }, color: "negative" }
          ]]
        };

        return await sendResponse(`Вы хотите развестись со своей второй половинкой [id${partnerId}|${partnerName}]\n\nДля подтверждения нажмите на кнопку:`, {
          keyboard: JSON.stringify(keyboard)
        });
      }

      if (rawCmd === "/брак") {
        if (!user.marriage || !user.marriage.partnerId) return await sendResponse("Вы не состоите в браке.");
        const partnerId = user.marriage.partnerId;
        const partnerName = user.marriage.partnerName;
        const dateFormatted = formatMskDate(user.marriage.marriedAt || Date.now());

        return await sendResponse(`Информация о вашем браке\n\n| Женат на - [id${partnerId}|${partnerName}]\n| В браке с: ${dateFormatted} (${Math.max(1, Math.floor((Date.now() - (user.marriage.marriedAt || Date.now())) / (86400 * 1000)) + 1)} дней)`);
      }

      if (rawCmd === "/мафия") {
        const dmAllowed = await checkDmAllowed(userId);
        if (!dmAllowed) {
          return await sendResponse(`[id${userId}|${fullName}], для начала игры с ботом вам нужно написать ему в ЛС (или разрешить сообщения в настройках группы)!`);
        }

        const existing = mafiaGames.get(peerId);
        if (existing) {
          if (existing.status === "playing") {
            return await sendResponse(`Игра "Мафия" уже запущена в этой беседе!`);
          } else {
            return await sendResponse(`Лобби игры "Мафия" уже создано! Присоединяйтесь по кнопке ниже.`);
          }
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Присоединиться", payload: JSON.stringify({ cmd: "mafia_join" }) }, color: "positive" },
              { action: { type: "callback", label: "Отсоединиться", payload: JSON.stringify({ cmd: "mafia_leave" }) }, color: "negative" }
            ],
            [
              { action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "mafia_start" }) }, color: "secondary" }
            ]
          ]
        };

        const res = await sendResponse(`Игра "Мафия"\n\n| Создатель - [id${userId}|${fullName}]\n\n| Участники игры - [id${userId}|${fullName}]`, {
          keyboard: JSON.stringify(keyboard)
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        const lobbyTimer = setTimeout(async () => {
          const g = mafiaGames.get(peerId);
          if (g && g.status === "lobby") {
            if (g.players.length >= 4) {
              await sendVkMessage(VK_TOKEN, peerId, `⏳ Время ожидания (2 минуты) истекло! Начинаем игру...`);
              await startMafiaGame(peerId);
            } else {
              await sendVkMessage(VK_TOKEN, peerId, `Недостаточно участников для мафии.`);
              mafiaGames.delete(peerId);
            }
          }
        }, 120000);

        mafiaGames.set(peerId, {
          peerId,
          cmId: cmId || 0,
          creatorId: userId,
          creatorName: fullName,
          players: [{ id: userId, name: fullName, isAlive: true }],
          status: "lobby",
          lobbyTimer
        });
        return;
      }

      if (rawCmd === "/установитьфото") {
        const hasPremium = user.vipExpires > Date.now();
        if (!hasPremium) {
          return await sendResponse("Ошибка! Устанавливать фотографию профиля могут только пользователи с Premium-статусом (VIP)! Приобрести его можно командой /купитьвип");
        }

        let photoAttachment = "";
        if (message.attachments && message.attachments.length > 0) {
          for (const att of message.attachments) {
            if (att.type === "photo" && att.photo) {
              const p = att.photo;
              photoAttachment = `photo${p.owner_id}_${p.id}` + (p.access_key ? `_${p.access_key}` : ``);
              break;
            }
          }
        }
        if (!photoAttachment && message.reply_message?.attachments) {
          for (const att of message.reply_message.attachments) {
            if (att.type === "photo" && att.photo) {
              const p = att.photo;
              photoAttachment = `photo${p.owner_id}_${p.id}` + (p.access_key ? `_${p.access_key}` : ``);
              break;
            }
          }
        }
        if (!photoAttachment && args[1]) {
          if (args[1].startsWith("photo") || args[1].startsWith("http")) {
            photoAttachment = args[1];
          } else {
            const uploadRes = await uploadPhoto(peerId, args[1]);
            if (uploadRes.attachment) {
              photoAttachment = uploadRes.attachment;
            }
          }
        }

        if (!photoAttachment) {
          return await sendResponse("Прикрепите фото к сообщению, ответьте на сообщение с фото или укажите ссылку на изображение!");
        }

        await updateUser(userId, { profilePhoto: photoAttachment });
        return await sendResponse("Вы успешно установили новую фотографию профиля!", { attachment: photoAttachment });
      }

      if (rawCmd === "/удалитьфото") {
        await updateUser(userId, { profilePhoto: null });
        return await sendResponse("Вы успешно удалили фотографию профиля!");
      }

      // 15. /кнб
      if (rawCmd === "/кнб") {
        const stake = parseInt(args[1]);
        if (isNaN(stake) || stake < 10) return await sendResponse("Минимальная ставка в КНБ: 10$!");
        if ((user.balance || 0) < stake) return await sendResponse("У вас недостаточно средств на руках!");

        const keyboard = {
          inline: true,
          buttons: [[
            { action: { type: "callback", label: "Сыграть", payload: JSON.stringify({ cmd: "rps_join" }) }, color: "positive" }
          ]]
        };

        const res = await sendResponse(`🪨📄✂️ Камень-Ножницы-Бумага\n\n| Создатель: [id${userId}|${fullName}]\n| Ставка: ${stake.toLocaleString()}$`, {
          keyboard: JSON.stringify(keyboard)
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;
        rpsGames.set(peerId, {
          peerId,
          cmId: cmId || 0,
          creatorId: userId,
          creatorName: fullName,
          amount: stake,
          status: "waiting_p2"
        });
        return;
      }

      // 16. Reputation System: /rep +, /rep -
      if (rawCmd === "/rep") {
        const type = args[1];
        if (type !== "+" && type !== "-") return await sendResponse("Используйте: /rep + [Ссылка|Имя Фамилия] или /rep - [Ссылка|Имя Фамилия]");

        const parsed = await parseTargetUser(message, args.slice(2));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (parsed.targetId === userId) return await sendResponse("Нельзя изменять репутацию самому себе!");

        const lastGiven = user.lastRepGiven || {};
        const lastTime = lastGiven[parsed.targetId] || 0;
        const nowSec = Math.floor(Date.now() / 1000);
        const cd = 86400 - (nowSec - lastTime);

        if (cd > 0) {
          const remH = Math.floor(cd / 3600);
          const remM = Math.floor((cd % 3600) / 60);
          return await sendResponse(`Вы уже изменяли репутацию этого пользователя. Попробуйте снова через ${remH} час-(ов) ${remM} мин`);
        }

        const targetUser = await getOrCreateUser(parsed.targetId);
        const diff = type === "+" ? 1 : -1;
        const newRep = (targetUser.rep || 0) + diff;

        lastGiven[parsed.targetId] = nowSec;
        await updateUser(userId, { lastRepGiven: lastGiven });
        await updateUser(parsed.targetId, { rep: newRep });

        const sign = newRep >= 0 ? "+" : "";
        if (type === "+") {
          return await sendResponse(`👍 [id${userId}|${fullName}] повысил(-а) репутацию у пользователя [id${parsed.targetId}|${parsed.targetName}]\n| Теперь у него репутации: ${sign}${newRep}`);
        } else {
          return await sendResponse(`👎 [id${userId}|${fullName}] понизил(-а) репутацию у пользователя [id${parsed.targetId}|${parsed.targetName}]\n| Теперь у него репутации: ${sign}${newRep}`);
        }
      }

      // ==========================================
      // ADMIN COMMANDS (Role >= 12 Special Leader)
      // ==========================================
      const denyAdmin = async () => sendResponse("Недостаточно прав!");

      if (rawCmd === "/deletephotoprofile") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { profilePhoto: null });
        return await sendResponse(`[id${userId}|${fullName}] удалил(-а) фотографию профиля пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/поженить") {
        if (!isAdmin) return await denyAdmin();
        const mentions = message.text.match(/\[id(\d+)\|([^\]]+)\]/g);
        if (!mentions || mentions.length < 2) return await sendResponse("Используйте: /поженить [Ссылка1|Имя Фамилия] [Ссылка2|Имя Фамилия]");
        
        const m1 = mentions[0].match(/\[id(\d+)\|([^\]]+)\]/);
        const m2 = mentions[1].match(/\[id(\d+)\|([^\]]+)\]/);
        if (!m1 || !m2) return await sendResponse("Укажите двух пользователей!");

        const id1 = parseInt(m1[1]);
        const name1 = m1[2];
        const id2 = parseInt(m2[1]);
        const name2 = m2[2];

        if (id1 === id2) return await sendResponse("Нельзя поженить одного и того же пользователя!");

        const now = Date.now();
        await updateUser(id1, { marriage: { partnerId: id2, partnerName: name2, marriedAt: now } });
        await updateUser(id2, { marriage: { partnerId: id1, partnerName: name1, marriedAt: now } });

        return await sendResponse(`[id${userId}|${fullName}] принудительно поженил(-а) пару [id${id1}|${name1}] и [id${id2}|${name2}]!`);
      }

      if (rawCmd === "/развести") {
        if (!isAdmin) return await denyAdmin();
        const mentions = message.text.match(/\[id(\d+)\|([^\]]+)\]/g);
        if (!mentions || mentions.length === 0) {
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Используйте: /развести [Ссылка1|Имя Фамилия] [Ссылка2|Имя Фамилия] или /развести [Ссылка|Имя Фамилия]");
          const targetUser = await getOrCreateUser(parsed.targetId);
          if (!targetUser.marriage || !targetUser.marriage.partnerId) return await sendResponse("Этот пользователь не состоит в браке!");
          const partnerId = targetUser.marriage.partnerId;
          const partnerName = targetUser.marriage.partnerName;
          await updateUser(parsed.targetId, { marriage: null });
          await updateUser(partnerId, { marriage: null });
          return await sendResponse(`[id${userId}|${fullName}] принудительно развел(-а) пару [id${parsed.targetId}|${parsed.targetName}] и [id${partnerId}|${partnerName}]!`);
        }

        if (mentions.length === 1) {
          const m1 = mentions[0].match(/\[id(\d+)\|([^\]]+)\]/);
          if (!m1) return await sendResponse("Укажите пользователя!");
          const id1 = parseInt(m1[1]);
          const u1 = await getOrCreateUser(id1);
          if (!u1.marriage || !u1.marriage.partnerId) return await sendResponse("Этот пользователь не состоит в браке!");
          const pId = u1.marriage.partnerId;
          const pName = u1.marriage.partnerName;
          await updateUser(id1, { marriage: null });
          await updateUser(pId, { marriage: null });
          return await sendResponse(`[id${userId}|${fullName}] принудительно развел(-а) пару [id${id1}|${m1[2]}] и [id${pId}|${pName}]!`);
        }

        const m1 = mentions[0].match(/\[id(\d+)\|([^\]]+)\]/);
        const m2 = mentions[1].match(/\[id(\d+)\|([^\]]+)\]/);
        if (!m1 || !m2) return await sendResponse("Укажите двух пользователей!");
        const id1 = parseInt(m1[1]);
        const id2 = parseInt(m2[1]);
        await updateUser(id1, { marriage: null });
        await updateUser(id2, { marriage: null });
        return await sendResponse(`[id${userId}|${fullName}] принудительно развел(-а) пару [id${id1}|${m1[2]}] и [id${id2}|${m2[2]}]!`);
      }

      // 17. User Fun Commands: /кто, /инфа
      if (rawCmd === "/кто") {
        let targetId = userId;
        let targetName = fullName;

        if (peerId > 2000000000) {
          const members = await getChatMembers(peerId);
          const validMembers = members.items.filter((m: any) => m.member_id > 0 && m.member_id !== userId);
          
          if (validMembers.length > 0) {
            const lastId = lastPickedInChat.get(peerId);
            let pool = validMembers;
            if (pool.length > 1 && lastId) {
              pool = pool.filter((m: any) => m.member_id !== lastId);
            }
            
            const randomMember = pool[Math.floor(Math.random() * pool.length)];
            targetId = randomMember.member_id;
            lastPickedInChat.set(peerId, targetId);
            
            const profile = members.profiles.find((p: any) => p.id === targetId);
            targetName = profile ? `${profile.first_name} ${profile.last_name}` : `Участник ${targetId}`;
          }
        } else {
          const parsed = await parseTargetUser(message, args.slice(1));
          targetId = parsed.targetId || userId;
          targetName = parsed.targetName || fullName;
        }

        const phrasing = Math.random() < 0.5 ? `Хм, я думаю это [id${targetId}|${targetName}]` : `Это [id${targetId}|${targetName}] 100%!!`;
        return await sendResponse(phrasing);
      }

      if (rawCmd === "/инфа") {
        const pct = Math.floor(Math.random() * 100) + 1;
        let suffix = "";
        if (peerId > 2000000000 && Math.random() < 0.3) {
           const randomMember = await getRandomChatMember(peerId, userId);
           if (randomMember) {
             suffix = ` у [id${randomMember.id}|${randomMember.name}]`;
           }
        }
        return await sendResponse(`Я думаю что вероятность этого составляет ${pct}%${suffix}`);
      }

      // 18. Help Command: /gamehelp (/игровые, /other, /help, /команды)
      if (rawCmd === "/gamehelp" || rawCmd === "/игровые" || rawCmd === "/other" || rawCmd === "/help" || rawCmd === "/команды") {
        let helpText = `Игровые команды бота:\n\n` +
          `/мафия - Начать игру "Мафия".\n` +
          `/пиво - Выпить пиво.\n` +
          `/пивозавры - Топ по пиву.\n` +
          `/крокодил - Мини-игра "Крокодил".\n` +
          `/баланс - Показать баланс.\n` +
          `/приз - Получить приз.\n` +
          `/передать - Передать деньги пользователю.\n` +
          `/банк - Положить деньги в банк.\n` +
          `/снятьбанк - Снять деньги с банка.\n` +
          `/профиль - Профиль игрока.\n` +
          `/топ - Топ пользователей.\n` +
          `/рулетка - Сыграть в рулетку.\n` +
          `/казино - Сыграть в казино.\n` +
          `/бизнес - Статистика бизнесов.\n` +
          `/купитьбиз - Купить бизнесы.\n` +
          `/продатьбиз - Продать бизнесы.\n` +
          `/дуэль - Создать дуэль на деньги.\n` +
          `/дуэльбиз - Создать дуэль на бизнесы.\n` +
          `/кнб - Создать игру "Камень, ножницы, бумага".\n` +
          `/курс - Курс JORDAN'S COIN.\n` +
          `/купитькоин - Купить JORDAN'S COIN.\n` +
          `/продатькоин - Продать JORDAN'S COIN.\n` +
          `/передатькоин - Передать JORDAN'S COIN.\n` +
          `/брак - Посмотреть информацию о браке.\n` +
          `/брак запрос - Отправить запрос на брак пользователю.\n` +
          `/брак развод - Развестись со второй половинкой.\n` +
          `/rep + - Повысить репутацию.\n` +
          `/rep - - Понизить репутацию.\n` +
          `/промо - Активировать промокод.\n` +
          `/кто - Выбрать случайного игрока.\n` +
          `/инфа - Вероятность события.\n` +
          `/погода - Узнать текущую погоду в городе.\n` +
          `/взлом - Заработать деньги взломом.\n` +
          `/фортуна - Прокрутить колесо фортуны.\n` +
          `/ежедневный бонус - Забрать ежедневный бонус.\n` +
          `/подписка - Получить бонус за подписку.\n` +
          `/купитьпрем - Купить Premium-статус.`;

        const keyboard: any = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Команды Premium", payload: JSON.stringify({ cmd: "help_premium" }) }, color: "positive" }]
          ]
        };
        
        return await sendResponse(helpText, { keyboard: JSON.stringify(keyboard) });
      }

      // 19. Promocodes: /промо, /createpromo
      if (rawCmd === "/промо") {
        const code = args[1]?.toLowerCase();
        if (!code) return await sendResponse("Укажите промокод!");

        const promoRef = firestoreDb.collection("promocodes").doc(code);
        const promoDoc = await promoRef.get();
        if (!promoDoc.exists) return await sendResponse("Промокод не найден!");

        const pData = promoDoc.data() as any;
        if (pData.usedCount >= pData.maxActivations) return await sendResponse("Промокод больше не действителен!");
        if (pData.usedUsers?.includes(userId)) return await sendResponse("Вы уже активировали этот промокод!");

        let rewardText = "";
        if (pData.type === "деньги") {
          await updateUser(userId, { balance: (user.balance || 0) + pData.value });
          rewardText = `${pData.value.toLocaleString()}$`;
        } else if (pData.type === "вип" || pData.type === "прем") {
          const currentExp = user.vipExpires > Date.now() ? user.vipExpires : Date.now();
          await updateUser(userId, { vipExpires: currentExp + (pData.value * 86400 * 1000) });
          rewardText = `Premium-статус на ${pData.value} дней`;
        } else if (pData.type === "бизнесы") {
          await updateUser(userId, { businesses: (user.businesses || 0) + pData.value });
          rewardText = `${pData.value} бизнес-(ов)`;
        } else if (pData.type === "пиво") {
          await updateUser(userId, { beer: (user.beer || 0) + pData.value });
          rewardText = `${pData.value} л. пива`;
        }

        const usedUsers = [...(pData.usedUsers || []), userId];
        await promoRef.update({ usedCount: FieldValue.increment(1), usedUsers });

        return await sendResponse(`Вы активировали промокод "${code}" и получаете ${rewardText}!`);
      }

      // ==========================================
      // ADMIN COMMANDS (Role >= 12 Special Leader)
      // ==========================================
      // (isAdmin and denyAdmin already declared above)

      if (rawCmd === "/setrole" || rawCmd === "/giverole") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const roleVal = parseInt(args.find(a => /^\d+$/.test(a)) || "12");
        if (!parsed.targetId) return await sendResponse("Используйте: /setrole [Ссылка|Имя Фамилия] [номер роли (12)]");
        await updateUser(parsed.targetId, { role: roleVal });
        return await sendResponse(`[id${userId}|${fullName}] установил(-а) роль ${roleVal} пользователю [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/createpromo") {
        if (!isAdmin) return await denyAdmin();
        const code = args[1]?.toLowerCase();
        const type = args[2]?.toLowerCase(); // деньги, вип, бизнесы, пиво
        const value = parseInt(args[3] || "0");
        const maxActivations = parseInt(args[4] || "10");

        if (!code || !type || !value) return await sendResponse("Используйте: /createpromo [Название] [деньги/вип/бизнесы/пиво] [кол-во] [активаций]");
        await firestoreDb.collection("promocodes").doc(code).set({
          code, type, value, maxActivations, usedCount: 0, usedUsers: []
        });
        return await sendResponse(`Промокод "${code}" на ${value} (${type}) создан для ${maxActivations} человек!`);
      }

      if (rawCmd === "/изменитькурс") {
        if (!isAdmin) return await denyAdmin();
        const newRate = parseInt(args[1]);
        if (isNaN(newRate) || newRate <= 0) return await sendResponse("Укажите новый курс!");
        await updateGlobalSettings({ jcRate: newRate });
        return await sendResponse(`[id${userId}|${fullName}] изменил(-а) курс JORDAN'S COIN`);
      }

      if (rawCmd === "/установитьмножитель") {
        if (!isAdmin) return await denyAdmin();
        const mult = parseFloat(args[1]);
        if (isNaN(mult) || mult <= 0) {
          return await sendResponse("Используйте: /установитьмножитель [число] (например, /установитьмножитель 2.5)");
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Дуэль", payload: JSON.stringify({ cmd: "set_mult", target: "duel", val: mult }) }, color: "primary" },
              { action: { type: "callback", label: "Приз", payload: JSON.stringify({ cmd: "set_mult", target: "prize", val: mult }) }, color: "positive" },
              { action: { type: "callback", label: "Рулетка", payload: JSON.stringify({ cmd: "set_mult", target: "roulette", val: mult }) }, color: "negative" }
            ]
          ]
        };

        return await sendResponse("Укажите куда вы хотите установить множитель:", {
          keyboard: JSON.stringify(keyboard)
        });
      }

      if (rawCmd === "/установитьмножительдуэлэй") {
        if (!isAdmin) return await denyAdmin();
        const mult = parseFloat(args[1]);
        if (isNaN(mult) || mult <= 0) return await sendResponse("Укажите множитель!");
        await updateGlobalSettings({ duelMultiplier: mult });
        return await sendResponse(`Множитель дуэлей установлен на: x${mult}`);
      }

      if (rawCmd === "/установитьмножительрулетки") {
        if (!isAdmin) return await denyAdmin();
        const mult = parseFloat(args[1]);
        if (isNaN(mult) || mult <= 0) return await sendResponse("Укажите множитель!");
        await updateGlobalSettings({ rouletteMultiplier: mult });
        return await sendResponse(`Множитель рулетки установлен на: x${mult}`);
      }

      if (rawCmd === "/наградаинв") {
        if (!isAdmin) return await denyAdmin();
        const state = !globalSettings.inviteRewardEnabled;
        await updateGlobalSettings({ inviteRewardEnabled: state });
        if (state) {
          return await sendResponse(`[id${userId}|${fullName}] включил(-а) систему наград за приглашения участников в беседу`);
        } else {
          return await sendResponse(`[id${userId}|${fullName}] выключил(-а) систему наград за приглашения участников в беседу`);
        }
      }

      if (rawCmd === "/чслист") {
        if (!isAdmin) return await denyAdmin();
        const usersSnap = await firestoreDb.collection("users").where("isGameBanned", "==", true).get();
        if (usersSnap.empty) {
          return await sendResponse("Список ЧС игр пуст.");
        }
        let listStr = "Список пользователей в ЧС игр:\n\n";
        usersSnap.forEach(doc => {
          const u = doc.data();
          listStr += `[id${u.userId}|${u.nick}] - ${u.gameBanReason || "Нарушение правил"}\n`;
        });
        return await sendResponse(listStr);
      }

      if (rawCmd === "/банигр" || rawCmd === "/чсигр" || rawCmd === "/addblackgame") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

        // Parse duration if present as the last argument
        let reasonStr = "";
        let gameBanUntil: number | null = null;
        let durationText = "Навсегда";

        const remainingArgs = args.slice(2);
        if (remainingArgs.length > 0) {
          const lastArg = remainingArgs[remainingArgs.length - 1];
          const dur = parseDuration(lastArg);
          if (dur) {
            gameBanUntil = Date.now() + dur.ms;
            durationText = formatMskDate(gameBanUntil);
            reasonStr = remainingArgs.slice(0, -1).join(" ") || "Нарушение правил";
          } else {
            reasonStr = remainingArgs.join(" ") || "Нарушение правил";
          }
        } else {
          reasonStr = "Нарушение правил";
        }

        await updateUser(parsed.targetId, {
          isGameBanned: true,
          gameBanReason: reasonStr,
          gameBanUntil
        });

        // Try group ban if possible
        try {
          const groupIdNum = parseInt(String(VK_GROUP_ID).replace("-", ""));
          const params: any = {
            group_id: groupIdNum,
            owner_id: parsed.targetId,
            comment: reasonStr,
            reason: 0,
            comment_visible: 1,
            access_token: VK_TOKEN,
            v: "5.131"
          };
          if (gameBanUntil) {
            params.end_date = Math.floor(gameBanUntil / 1000);
          }
          await axios.post("https://api.vk.com/method/groups.ban", new URLSearchParams(params).toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
          });
        } catch (e) { console.error("Ban error:", e); }

        // Send direct message notification to the user
        try {
          const dmText = `Вы были заблокированы в боте!\n\n| Причина: ${reasonStr}\n| Блокировка до: ${durationText}`;
          await sendVkMessage(VK_TOKEN, parsed.targetId, dmText);
        } catch (e) {}

        const resText = `[id${userId}|${fullName}] занёс-(ла) пользователя [id${parsed.targetId}|${parsed.targetName}] в ЧС игр\n\n` +
          `| Причина: ${reasonStr}\n` +
          `| Срок: ${durationText}`;
        return await sendResponse(resText);
      }

      if (rawCmd === "/снятьбанигр" || rawCmd === "/снятьчсигр" || rawCmd === "/unblackgames") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

        await updateUser(parsed.targetId, {
          isGameBanned: false,
          gameBanReason: "",
          gameBanUntil: null
        });

        try {
          const groupIdNum = parseInt(String(VK_GROUP_ID).replace("-", ""));
          await axios.post("https://api.vk.com/method/groups.unban", new URLSearchParams({
            group_id: String(groupIdNum),
            owner_id: String(parsed.targetId),
            access_token: VK_TOKEN,
            v: "5.131"
          }).toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
          });
        } catch (e) { console.error("Unban error:", e); }

        // Send direct message notification to the user
        try {
          const dmText = "Ваша блокировка в боте была окончена.\nТеперь вы снова можете играть в бота.";
          await sendVkMessage(VK_TOKEN, parsed.targetId, dmText);
        } catch (e) {}

        return await sendResponse(`[id${userId}|${fullName}] убрал пользователя [id${parsed.targetId}|${parsed.targetName}] из ЧС игр`);
      }

      if (rawCmd === "/hidetop") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { hideTop: true });
        return await sendResponse(`[id${userId}|${fullName}] выдал(-а) функцию "анти-отображение в топах" пользователю [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/unhidetop") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { hideTop: false });
        return await sendResponse(`[id${userId}|${fullName}] забрал(-а) функцию "анти-отображение в топах" у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/hidebalance") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { hideBalance: true });
        return await sendResponse(`[id${userId}|${fullName}] выдал(-а) функцию "анти-просмотр баланса" пользователю [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/unhidebalance") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        await updateUser(parsed.targetId, { hideBalance: false });
        return await sendResponse(`[id${userId}|${fullName}] забрал(-а) функцию "анти-просмотр баланса" у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/chatid") {
        return await sendResponse(`/chatid =\n\nPeer_id чата: ${peerId}`);
      }

      if (rawCmd === "/news") {
        if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await denyAdmin();
        const newsText = args.slice(1).join(" ").trim();
        
        let attachmentsStr = "";
        if (message.attachments && message.attachments.length > 0) {
          attachmentsStr = message.attachments.map((a: any) => {
            if (a.photo) return `photo${a.photo.owner_id}_${a.photo.id}_${a.photo.access_key || ''}`;
            if (a.video) return `video${a.video.owner_id}_${a.video.id}_${a.video.access_key || ''}`;
            if (a.audio) return `audio${a.audio.owner_id}_${a.audio.id}`;
            if (a.doc) return `doc${a.doc.owner_id}_${a.doc.id}_${a.doc.access_key || ''}`;
            return "";
          }).filter((x: string) => x).join(",");
        }
        
        const forwardIds = [];
        if (message.reply_message && message.reply_message.conversation_message_id) {
           forwardIds.push(message.reply_message.conversation_message_id);
        }
        if (message.fwd_messages && message.fwd_messages.length > 0) {
           message.fwd_messages.forEach((m: any) => {
               if (m.conversation_message_id) forwardIds.push(m.conversation_message_id);
           });
        }
        
        let forwardObjStr: string | null = null;
        if (forwardIds.length > 0) {
           forwardObjStr = JSON.stringify({
              peer_id: peerId,
              conversation_message_ids: forwardIds,
              is_reply: false
           });
        }
        
        if (!newsText && !attachmentsStr && !forwardObjStr) {
           return await sendResponse("Введите текст рассылки или прикрепите вложения.");
        }
        
        pendingNews.set(userId, { text: newsText, attachmentsStr, forwardObjStr, peerId });
        
        return await sendVkMessage(VK_TOKEN, peerId, "Укажите тип рассылки, перед её отправкой!\n\n| Нажмите на кнопку для выбора:", {
           keyboard: JSON.stringify({
              inline: true,
              buttons: [
                 [{ action: { type: "callback", label: "В все беседы", payload: JSON.stringify({ cmd: "news_chats" }) }, color: "primary" }],
                 [{ action: { type: "callback", label: "Во все ЛС с пользователями", payload: JSON.stringify({ cmd: "news_dms" }) }, color: "primary" }]
              ]
           })
        });
      }

      // Giveaway command: /раздача
      if (rawCmd === "/раздача") {
        if (!isAdmin) return await denyAdmin();
        const timeArg = args[1];
        const amount = parseInt(args[2]);

        if (!timeArg || isNaN(amount) || amount <= 0) {
          return await sendResponse(`С помощью этой команды вы можете раздать всем участникам деньги\n\nДля использования команды используйте:\nS - Секунды\nH - Часы\nD - День\n\nПример команды: /раздача 50s 10000`);
        }

        let durationMs = 0;
        const unit = timeArg.slice(-1).toLowerCase();
        const val = parseInt(timeArg.slice(0, -1));
        if (unit === "s") durationMs = val * 1000;
        else if (unit === "h") durationMs = val * 3600 * 1000;
        else if (unit === "d") durationMs = val * 86400 * 1000;

        if (durationMs <= 0) return await sendResponse("Укажите корректное время!");

        const keyboard = {
          inline: true,
          buttons: [[
            { action: { type: "callback", label: "Принять участие", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
          ]]
        };

        const res = await sendResponse(`@all, раздача на сумму ${amount.toLocaleString()}$ была создана!\n\nВремя на принятие участия - ${timeArg}\n\nЕсли вы хотите принять участие в раздаче нажмите на кнопку ниже`, {
          keyboard: JSON.stringify(keyboard),
          disable_mentions: 0
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        const timer = setTimeout(async () => {
          const g = giveaways.get(peerId);
          if (g) {
            if (g.participants.length === 0) {
              editVkMessage(VK_TOKEN, peerId, g.cmId, `@all, раздача на ${amount.toLocaleString()}$ завершена!\n\nНикто не принял участие.`, { disable_mentions: 0 });
            } else {
              const share = Math.floor(amount / g.participants.length);
              const partLines = [];
              for (const p of g.participants) {
                const pu = await getOrCreateUser(p.id);
                await updateUser(p.id, { balance: (pu.balance || 0) + share });
                partLines.push(`[id${p.id}|${p.name}]`);
              }
              editVkMessage(VK_TOKEN, peerId, g.cmId, `@all, раздача на ${amount.toLocaleString()}$ была завершена!\n\nУчастники раздачи:\n${partLines.join("\n")}\n\n=======\n\nОни получают ${share.toLocaleString()}$`, { disable_mentions: 0 });
            }
            giveaways.delete(peerId);
          }
        }, durationMs);

        giveaways.set(peerId, {
          peerId, cmId: cmId || 0, creatorId: userId, creatorName: fullName, amount, timeStr: timeArg, expiresAt: Date.now() + durationMs, participants: [], timer
        });
        return;
      }

      // Admin Confirmation Commands Helper
      const promptAdminConfirm = async (actionType: string, targetId: number, targetName: string, promptTitle: string, value?: any) => {
        const key = `${userId}_${actionType}_${Date.now()}`;
        adminConfirmations.set(key, { adminId: userId, adminName: fullName, type: actionType, targetId, targetName, value });

        let confirmBtnLabel = "Выдать";
        let cancelBtnLabel = "Не выдавать";
        if (actionType.startsWith("reset")) {
          confirmBtnLabel = actionType === "reset" ? "Обнулить всё" : "Обнулить";
          cancelBtnLabel = "Не обнулять";
        }

        const keyboard = {
          inline: true,
          buttons: [[
            { action: { type: "callback", label: confirmBtnLabel, payload: JSON.stringify({ cmd: "admin_confirm", key }) }, color: "positive" },
            { action: { type: "callback", label: cancelBtnLabel, payload: JSON.stringify({ cmd: "admin_cancel", key }) }, color: "negative" }
          ]]
        };

        return await sendResponse(`${promptTitle}\n\n| Для подтверждения нажмите на кнопку:`, {
          keyboard: JSON.stringify(keyboard)
        });
      };

      if (rawCmd === "/givemoney") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const amount = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!parsed.targetId || amount <= 0) return await sendResponse("Используйте: /givemoney [сумма] [Ссылка|Имя Фамилия]");
        return await promptAdminConfirm("givemoney", parsed.targetId, parsed.targetName, `Вы собираетесь выдать деньги пользователю [id${parsed.targetId}|${parsed.targetName}]`, amount);
      }

      if (rawCmd === "/resetmoney") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetmoney", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить баланс и банк у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/givebusiness") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        // Expect /givebusiness @user typeId count
        const nums = args.filter(a => /^\d+$/.test(a)).map(Number);
        // Sometimes the user tag might contain digits (like [id123|name]), but parseTargetUser handles it.
        // We can just rely on args. The first pure number is typeId, the second is count.
        // But parseTargetUser removes the mention.
        const typeId = nums[0];
        const count = nums[1] || 1;
        
        if (!parsed.targetId || !typeId || typeId < 1 || typeId > 10 || count <= 0) {
           return await sendResponse("Используйте: /givebusiness [Ссылка|Имя Фамилия] [Тип бизнеса 1-10] [Кол-во]");
        }
        
        return await promptAdminConfirm("givebusiness", parsed.targetId, parsed.targetName, `Вы собираетесь выдать ${count} бизнес-(ов) типа ${typeId} пользователю [id${parsed.targetId}|${parsed.targetName}]`, { typeId, count });
      }

      if (rawCmd === "/resetbusiness") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetbusiness", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить все бизнесы, продукты и доход у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/givevip") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const days = parseInt(args.find(a => /^\d+$/.test(a)) || "30");
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("givevip", parsed.targetId, parsed.targetName, `Вы собираетесь выдать VIP-статус пользователю [id${parsed.targetId}|${parsed.targetName}] на ${days} дней`, days);
      }

      if (rawCmd === "/resetvip") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetvip", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить VIP-статус у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/givebeer") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const liters = parseFloat(args.find(a => /^\d+(\.\d+)?$/.test(a)) || "0");
        if (!parsed.targetId || liters <= 0) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("givebeer", parsed.targetId, parsed.targetName, `Вы собираетесь выдать ${liters} литр-(ов) пива пользователю [id${parsed.targetId}|${parsed.targetName}]`, liters);
      }

      if (rawCmd === "/resetbeer") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetbeer", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить все литры пива у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/giverep") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const repVal = parseInt(args.find(a => /^-?\d+$/.test(a)) || "0");
        if (!parsed.targetId || repVal === 0) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("giverep", parsed.targetId, parsed.targetName, `Вы собираетесь выдать ${repVal} репутации пользователю [id${parsed.targetId}|${parsed.targetName}]`, repVal);
      }

      if (rawCmd === "/resetrep") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetrep", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить всю репутацию у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/giveprod") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        const count = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!parsed.targetId || count <= 0) return await sendResponse("Используйте: /giveprod [кол-во] [Ссылка|Имя Фамилия]");
        return await promptAdminConfirm("giveprod", parsed.targetId, parsed.targetName, `Вы собираетесь выдать ${count} продуктов для бизнеса пользователю [id${parsed.targetId}|${parsed.targetName}]`, count);
      }

      if (rawCmd === "/resetprod") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("resetprod", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить все продукты для бизнеса у пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/reset") {
        if (!isAdmin) return await denyAdmin();
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        return await promptAdminConfirm("reset", parsed.targetId, parsed.targetName, `Вы собираетесь обнулить ВСЕ игровые данные пользователя [id${parsed.targetId}|${parsed.targetName}]`);
      }

      if (rawCmd === "/deleteduals" || rawCmd === "/deleteduel" || rawCmd === "/очиститьдуэли") {
        if (!isAdmin) return await denyAdmin();
        let deletedCount = 0;
        if (duelGames.has(peerId)) { duelGames.delete(peerId); deletedCount++; }
        if (crocGames.has(peerId)) {
          const c = crocGames.get(peerId);
          if (c?.timeoutTimer) clearTimeout(c.timeoutTimer);
          crocGames.delete(peerId);
          deletedCount++;
        }
        if (rpsGames.has(peerId)) { rpsGames.delete(peerId); deletedCount++; }

        if (args[1] === "all" || args[1] === "все") {
          deletedCount = duelGames.size + crocGames.size + rpsGames.size;
          duelGames.clear();
          for (const [, c] of crocGames) { if (c.timeoutTimer) clearTimeout(c.timeoutTimer); }
          crocGames.clear();
          rpsGames.clear();
          return await sendResponse(`[id${userId}|${fullName}] успешно удалил(-а) ВСЕ активные дуэли, Крокодил и КНБ во всех чатах! (${deletedCount} игр)`);
        }

        if (deletedCount === 0) {
          return await sendResponse(`⚠️ В данном чате нет активных дуэлей, игр Крокодил или КНБ.`);
        }

        return await sendResponse(`[id${userId}|${fullName}] успешно удалил(-а) все активные дуэли, Крокодил и КНБ в данном чате!`);
      }

      if (rawCmd === "/пример") {
        const exampleUrl = "https://sun1-91.vkuserphoto.ru/s/v1/ig2/ULFTPpBnjJsKDCSpAxHRDk4Yh5ihQDY3nWZS8GzqjegfTcsmdA0NPnClOSYXCFjevWqFkXxrEL7Y3uVCfWALAS1f.jpg?quality=96&as=32x18,48x27,72x40,108x61,160x90,240x135,360x202,480x270,540x304,640x360,720x405,1080x607,1280x720,1440x810,1600x900&from=bu&cs=1600x0";
        const uploadResult = await uploadPhoto(peerId, exampleUrl);
        if (uploadResult.attachment) {
          await sendResponse("Вот пример цитаты:", { attachment: uploadResult.attachment });
        } else {
          await sendResponse(`Ошибка загрузки примера: ${uploadResult.error}`);
        }
      } else if (rawCmd === "/пинг") {
        const latency = Date.now() - (message.date * 1000);
        await sendResponse(`Понг! Пинг: ${latency} мс`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }
});

// ==========================================
// Dashboard API Endpoints for Control Panel
// ==========================================

function getSessionFromRequest(req: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  const session = activeSessions.get(token);
  if (session) {
    session.lastActive = Math.floor(Date.now() / 1000);
  }
  return session;
}

function authorizeRequest(req: any, requireSpecial = false) {
  const session = getSessionFromRequest(req);
  if (session) {
    if (requireSpecial && !session.isSpecial) {
      return { authorized: false, error: "Для этого действия требуется Особый доступ!", status: 403 };
    }
    return { authorized: true, session };
  }
  
  const secret = req.body?.secret || req.query?.secret || req.headers["x-secret"];
  if (secret === "Jordanmanager") {
    return { authorized: true, session: { vkId: 1115715881, fullName: "Jordansky (Создатель)", role: 12, isSpecial: true } };
  }
  
  return { authorized: false, error: "Неавторизованный запрос! Пожалуйста, войдите в систему.", status: 401 };
}

// 1. VK ID Validation & Auth Code dispatch
app.post("/api/auth/send-code", async (req, res) => {
  const { vkId } = req.body;
  if (!vkId) return res.status(400).json({ error: "VK ID не указан" });
  
  const cleanedVkId = String(vkId).replace(/[^0-9]/g, "");
  if (!cleanedVkId) return res.status(400).json({ error: "Некорректный формат VK ID" });

  const vkIdNum = parseInt(cleanedVkId);
  if (vkIdNum >= 1 && vkIdNum <= 999999) {
    return res.status(403).json({ error: "Вход с такими данными недоступен" });
  }

  try {
    let allowed = false;
    let fullName = `Администратор #${vkIdNum}`;
    let role = 0;

    if (vkIdNum === 1115715881) {
      allowed = true;
      fullName = "Jordansky (Создатель)";
      role = 12;
    } else {
      const userSnap = await firestoreDb.collection("users").doc(String(vkIdNum)).get();
      if (userSnap.exists) {
        const u = userSnap.data();
        if (u && (u.role || 0) >= 1) {
          allowed = true;
          fullName = u.nick || u.userName || `Администратор #${vkIdNum}`;
          role = u.role || 0;
        }
      }
    }

    if (!allowed) {
      return res.status(403).json({ error: "Вход заблокирован: у вас нет прав администратора!" });
    }

    const ordinaryCode = Math.floor(100000 + Math.random() * 900000).toString();
    const specialCode = "SPECIAL_" + [...Array(56)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");

    pendingLogins.set(cleanedVkId, {
      ordinaryCode,
      specialCode,
      fullName,
      role,
      expires: Date.now() + 5 * 60 * 1000
    });

    const msg = `🔑 Вход в панель управления GAMES MANAGER\n\n` +
      `| Обычный код (ОК): ${ordinaryCode}\n` +
      `| Особый код (Особый доступ): ${specialCode}`;
      
    await sendVkMessage(VK_TOKEN, vkIdNum, msg);

    res.json({ success: true, message: "Коды авторизации отправлены вам в личные сообщения VK!" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Auth Code verification
app.post("/api/auth/verify-code", async (req, res) => {
  const { vkId, code } = req.body;
  if (!vkId || !code) return res.status(400).json({ error: "Укажите VK ID и код" });

  const cleanedVkId = String(vkId).replace(/[^0-9]/g, "");
  const pending = pendingLogins.get(cleanedVkId);

  if (!pending) {
    return res.status(400).json({ error: "Сессия авторизации не найдена или истекла. Запросите код заново." });
  }

  if (Date.now() > pending.expires) {
    pendingLogins.delete(cleanedVkId);
    return res.status(400).json({ error: "Срок действия кодов истек. Запросите код заново." });
  }

  const isOrdinary = code === pending.ordinaryCode;
  const isSpecial = code === pending.specialCode;

  if (!isOrdinary && !isSpecial) {
    return res.status(400).json({ error: "Неверный код авторизации!" });
  }

  const token = "sess_" + [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  
  activeSessions.set(token, {
    token,
    vkId: parseInt(cleanedVkId),
    fullName: pending.fullName,
    role: pending.role,
    isSpecial,
    loginTime: Math.floor(Date.now() / 1000),
    lastActive: Math.floor(Date.now() / 1000)
  });

  pendingLogins.delete(cleanedVkId);

  res.json({
    success: true,
    token,
    isSpecial,
    fullName: pending.fullName,
    role: pending.role
  });
});

// Sessions monitoring
app.get("/api/dashboard/sessions", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const list = Array.from(activeSessions.values()).map(s => ({
    vkId: s.vkId,
    fullName: s.fullName,
    role: s.role,
    isSpecial: s.isSpecial,
    loginTime: s.loginTime,
    lastActive: s.lastActive,
    isCurrent: s.token === getSessionFromRequest(req)?.token
  }));
  res.json(list);
});

app.post("/api/dashboard/sessions/revoke", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { vkId } = req.body;
  if (!vkId) return res.status(400).json({ error: "Укажите VK ID" });

  let revokedCount = 0;
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.vkId === parseInt(vkId)) {
      activeSessions.delete(token);
      revokedCount++;
    }
  }

  res.json({ success: true, revokedCount });
});

// Quick Actions & Tables Deployment
app.post("/api/dashboard/quick-actions/deploy-tables", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const collectionsToDeploy = ["bans", "mutes", "warns", "globalban", "gbanlist", "panel_logs"];
    for (const coll of collectionsToDeploy) {
      await firestoreDb.collection(coll).doc("_init").set({
        initialized: true,
        timestamp: Math.floor(Date.now() / 1000),
        by: auth.session.vkId
      }, { merge: true });
    }
    res.json({ success: true, message: "Все необходимые таблицы успешно развернуты в Firestore!" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GBAN / GBANPL global actions
app.post("/api/dashboard/quick-actions/global-action", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { targetVkId, actionType, reason } = req.body;
  if (!targetVkId || !actionType) return res.status(400).json({ error: "Недостаточно данных для действия" });

  const targetIdNum = parseInt(targetVkId);
  if (targetIdNum === 1115715881) {
    return res.status(403).json({ error: "Абсолютный иммунитет: Наказание владельца запрещено!" });
  }

  try {
    const actReason = reason || "Глобальная блокировка консоли";
    
    if (actionType === "gban") {
      await updateUser(targetIdNum, { isGameBanned: true, gameBanReason: actReason });
      
      // Log global action
      await firestoreDb.collection("panel_logs").add({
        action: "GBAN",
        target: targetIdNum,
        by: auth.session.vkId,
        reason: actReason,
        timestamp: Math.floor(Date.now() / 1000)
      });

      // Broadcast to all active chats (excluding type CH)
      const chatsSnap = await firestoreDb.collection("chats").get();
      const broadcastMsg = `📢 [ГЛОБАЛЬНАЯ БЛОКИРОВКА]\n\nАдминистратор [id${auth.session.vkId}|${auth.session.fullName}] выдал глобальный бан игроку [id${targetIdNum}|Пользователь]!\n\n| Причина: ${actReason}`;
      
      chatsSnap.forEach(async (doc) => {
        const chat = doc.data();
        if (chat && chat.id && (!chat.type || String(chat.type).toLowerCase() !== "ch")) {
          try {
            await sendVkMessage(VK_TOKEN, chat.id, broadcastMsg);
          } catch (e) {}
        }
      });
    } else if (actionType === "gbanpl") {
      // Global Mute
      await updateUser(targetIdNum, { isMuted: true, muteReason: actReason });

      await firestoreDb.collection("panel_logs").add({
        action: "GBANPL",
        target: targetIdNum,
        by: auth.session.vkId,
        reason: actReason,
        timestamp: Math.floor(Date.now() / 1000)
      });

      const chatsSnap = await firestoreDb.collection("chats").get();
      const broadcastMsg = `📢 [ГЛОБАЛЬНОЕ ОГРАНИЧЕНИЕ]\n\nАдминистратор [id${auth.session.vkId}|${auth.session.fullName}] выдал глобальный мут игроку [id${targetIdNum}|Пользователь]!\n\n| Причина: ${actReason}`;
      
      chatsSnap.forEach(async (doc) => {
        const chat = doc.data();
        if (chat && chat.id && (!chat.type || String(chat.type).toLowerCase() !== "ch")) {
          try {
            await sendVkMessage(VK_TOKEN, chat.id, broadcastMsg);
          } catch (e) {}
        }
      });
    }

    res.json({ success: true, message: `Глобальное действие "${actionType.toUpperCase()}" успешно выполнено!` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Immunity & Status check in real-time
app.get("/api/dashboard/user-immunity-status", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { vkId } = req.query;
  if (!vkId) return res.status(400).json({ error: "Укажите VK ID" });

  const targetVkId = parseInt(vkId as string);
  const hasImmunity = targetVkId === 1115715881;

  try {
    const userSnap = await firestoreDb.collection("users").doc(String(targetVkId)).get();
    let fullName = `Пользователь #${targetVkId}`;
    let role = 0;
    let isBanned = false;

    if (userSnap.exists) {
      const u = userSnap.data();
      if (u) {
        fullName = u.nick || u.userName || fullName;
        role = u.role || 0;
        isBanned = !!u.isGameBanned;
      }
    }

    const ROLES: Record<number, string> = {
      0: "ПОЛЬЗОВАТЕЛЬ",
      1: "МЛАДШИЙ МОДЕРАТОР",
      2: "МОДЕРАТОР",
      3: "СТАРШИЙ МОДЕРАТОР",
      4: "МЛАДШИЙ АДМИНИСТРАТОР",
      5: "АДМИНИСТРАТОР",
      6: "СТАРШИЙ АДМИНИСТРАТОР",
      7: "ГЛ. АДМИНИСТРАТОР",
      8: "КУРАТОР",
      9: "ЗАМ. СПЕЦ. АДМИНИСТРАТОРА",
      10: "СПЕЦ. АДМИНИСТРАТОР",
      11: "РУКОВОДИТЕЛЬ",
      12: "СПЕЦ. РУКОВОДИТЕЛЬ"
    };

    res.json({
      vkId: targetVkId,
      hasImmunity,
      fullName,
      role,
      roleName: ROLES[role] || "ПОЛЬЗОВАТЕЛЬ",
      isBanned
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Stats API
app.get("/api/dashboard/stats", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const usersSnap = await firestoreDb.collection("users").get();
    let totalUsers = 0;
    let totalCash = 0;
    let totalBank = 0;
    let totalBeer = 0;
    let totalBusinesses = 0;

    usersSnap.forEach(doc => {
      totalUsers++;
      const u = doc.data();
      totalCash += (u.balance || 0);
      totalBank += (u.bank || 0);
      totalBeer += (u.beer || 0);
      totalBusinesses += (u.businesses || 0);
    });

    res.json({
      totalUsers,
      totalCash,
      totalBank,
      totalBeer: totalBeer.toFixed(1),
      totalBusinesses,
      jcRate: globalSettings.jcRate,
      activeCrocodiles: crocGames.size,
      activeDuels: duelGames.size,
      activeRps: rpsGames.size
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/dashboard/users", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  try {
    const usersSnap = await firestoreDb.collection("users").get();
    const list: any[] = [];
    usersSnap.forEach(doc => list.push(doc.data()));
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dashboard/update-user", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { userId, updates } = req.body;
  try {
    await updateUser(userId, updates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/send-message", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { userId, text } = req.body;
  try {
    const response = await vkApi.get("messages.send", {
      params: {
        peer_id: userId,
        message: text,
        random_id: Math.floor(Math.random() * 1000000),
        access_token: VK_TOKEN,
        v: "5.131",
      },
    });

    if (response.data.error) return res.status(500).json({ error: response.data.error });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Database Management Endpoints
app.get("/api/dashboard/db/collections", async (req, res) => {
  const auth = authorizeRequest(req);
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });
  res.json({ collections: ["users", "messages", "promocodes", "global_settings", "chats", "bans", "mutes", "warns", "globalban", "gbanlist", "panel_logs"] });
});

app.get("/api/dashboard/db/documents", async (req, res) => {
  const auth = authorizeRequest(req, true); // Database actions STRICTLY require Special Access
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const collectionName = (req.query.collection as string) || "users";

  try {
    const snap = await firestoreDb.collection(collectionName).get();
    const list: any[] = [];
    snap.forEach(doc => {
      list.push({ _id: doc.id, ...doc.data() });
    });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dashboard/db/save-doc", async (req, res) => {
  const auth = authorizeRequest(req, true); // Database actions STRICTLY require Special Access
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { collectionName, docId, data } = req.body;
  if (!collectionName || !docId) return res.status(400).json({ error: "Collection name and document ID are required" });

  try {
    const payload = { ...data };
    delete payload._id;
    await firestoreDb.collection(collectionName).doc(docId.toString()).set(payload, { merge: true });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dashboard/db/delete-doc", async (req, res) => {
  const auth = authorizeRequest(req, true); // Database actions STRICTLY require Special Access
  if (!auth.authorized) return res.status(auth.status || 401).json({ error: auth.error });

  const { collectionName, docId } = req.body;
  if (!collectionName || !docId) return res.status(400).json({ error: "Collection name and document ID are required" });

  try {
    await firestoreDb.collection(collectionName).doc(docId.toString()).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function startServer() {
  await downloadFont();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
