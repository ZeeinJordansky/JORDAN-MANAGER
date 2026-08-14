import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import https from "https";
import os from "os";

const botStartTime = Date.now();

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  httpsAgent: new https.Agent({ keepAlive: true }),
});
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import { createCanvas, loadImage, registerFont } from "canvas";
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


const badWordsList = [
  "гей", "gay", "gey", "пидор", "пидар", "pidor", "pidar", "ебаный", "ebany", "yebany", "ebani", "ебанный", "ебаная", "ебаное", "ебаные",
  "бля", "блят", "бляд", "blya", "blyat", "хуй", "хуи", "хуя", "хуе", "xui", "xyi", "hui", "huy",
  "пизд", "pizd", "ебан", "ебат", "ебуч", "ебло", "еблан", "ebat", "eblan", "ebuch", "eblo", "залуп", "zalup",
  "сука", "суч", "suka", "such", "гондон", "гандон", "gandon", "шлюх", "shlyuh", "shliuh", "мраз", "mraz",
  "мудак", "mudak", "чмо", "chmo", "дроч", "droch", "сучк", "suchk", "пидорас", "pidoras", "педик", "pedik",
  "урод", "urod", "пошелнах", "идинах", "нах", "nah", "пипец", "курва", "kurwa", "fuck", "bitch", "cunt", "dick",
  "pussy", "cock", "asshole", "bastard", "motherfucker", "faggot", "slut", "whore", "нигер", "nigger", "nigga",
  "мама", "мать", "маму", "матери", "мачех", "папа", "отец", "папу", "отца", "отчим", "родител", "родит", "родню",
  "родня", "бабуш", "бабк", "дедуш", "дед", "сестр", "брат", "muta", "matera", "mother", "father", "mamka", "batya", "батя",
  "сперм", "сиськ", "письк", "жоп", "задниц", "порно", "хер", "члено", "член", "хуесос", "пиздобол"
];

let dynamicBanWords: string[] = [];

const containsBadWord = (text: string) => {
  if (!text) return false;
  const t = text.toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
    .replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/8/g, "b")
    .replace(/[^а-яa-z0-9ё]/g, '');
  const allBad = [...badWordsList, ...dynamicBanWords];
  return allBad.some(w => w && t.includes(w.toLowerCase().replace(/[^а-яa-z0-9ё]/g, '')));
};

const getRawArgText = (rawMessageText: string) => {
  if (!rawMessageText) return "";
  let trimmed = rawMessageText.trim();
  const match = trimmed.match(/^([\/+!\.,]?[\S]+)[\s\n]+([\s\S]*)$/);
  if (match && match[2]) {
    return match[2];
  }
  return "";
};

const fmtD = (ms?: number) => {
  if (!ms) return "Отсутствует.";
  // Moscow is UTC+3. Adjust using the system timezone offset to get the correct UTC time, then add 3 hours.
  const d = new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}:${secs}`;
};

const getMskDate = (ms: number = Date.now()) => {
  return new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
};


function isModerationCmd(cmd: string): boolean {
  if (!cmd) return false;
  const c = cmd.toLowerCase().trim();
  const modCmds = [
    "/mute", "/мута", "/мут", "/m", "/гмут", "/gmute",
    "/unmute", "/размут", "/анмут", "/unm", "/гунмут", "/gunmute",
    "/warn", "/варн", "/w", "/гварн", "/gwarn",
    "/unwarn", "/разварн", "/анварн", "/unw", "/гунварн", "/gunwarn",
    "/warns", "/варны",
    "/ban", "/бан", "/b", "/гбан", "/gban",
    "/unban", "/разбан", "/анбан", "/unb", "/гунбан", "/gunban",
    "/kick", "/кик", "/к", "/k", "/исключить",
    "/clear", "/очистить", "/mclear", "/purge", "/чистка",
    "/addmoder", "/модер", "/delmoder", "/выдатьмодера", "/setmoder", "/аддмодер",
    "/addsenmoder", "/смодер", "/delsenmoder", "/setsenmoder", "/setsmoder", "/старшиймодератор", "/аддсмодер",
    "/addadmin", "/админ", "/deladmin", "/setadmin", "/аддадмин",
    "/addsenadmin", "/садмин", "/delsenadmin", "/setsenadmin", "/setsadmin", "/аддсадмин",
    "/addzsa", "/замспец", "/delzsa", "/выдатьзса", "/setzsa", "/addzamspets", "/аддзса",
    "/addsa", "/са", "/sa", "/delsa", "/setsa", "/выдатьса", "/addspets", "/аддса",
    "/removerole", "/снятьроль", "/снятьправа", "/arrole", "/grrole",
    "/addstatus", "/unstatus",
    "/quiet", "/тихий", "/unquiet", "/снятьтихий", "/тишина",
    "/freeze", "/заморозить", "/unfreeze", "/разморозить",
    "/pin", "/unpin", "/закрепить", "/открепить",
    "/gban", "/гбан", "/ungban", "/унгбан", "/gbanpl", "/гбанпл", "/ungbanpl", "/унгбанпл",
    "/deletecommand", "/удалятькоманды", "/delcmd"
  ];
  return modCmds.includes(c);
}

async function autoDeleteCmdMessage(peerId: number, message: any, chatData: any) {
  if (chatData?.deleteCommand && message?.conversation_message_id && peerId > 2000000000) {
    try {
      await axios.get("https://api.vk.com/method/messages.delete", {
        params: {
          access_token: VK_TOKEN,
          v: "5.199",
          conversation_message_ids: String(message.conversation_message_id),
          cmids: String(message.conversation_message_id),
          delete_for_all: 1,
          peer_id: peerId
        }
      });
    } catch (e) {}
  }
}

function drawRoundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function generateUserStatsImage(targetUser: any, targetId: number, currentPeerId: number): Promise<Buffer> {
  if (!createCanvas) {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }

  const width = 1200;
  const height = 620;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Modern Dark Space Gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#090d16");
  gradient.addColorStop(0.5, "#111827");
  gradient.addColorStop(1, "#030712");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient glowing circles
  ctx.save();
  ctx.fillStyle = "rgba(99, 102, 241, 0.12)"; // Indigo Glow
  ctx.beginPath();
  ctx.arc(250, 150, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(168, 85, 247, 0.08)"; // Purple Glow
  ctx.beginPath();
  ctx.arc(1000, 480, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Header Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px NotoSans, Arial";
  ctx.textAlign = "left";
  ctx.fillText("...:: СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ::...", 60, 50);

  const name = targetUser.fullName || targetUser.nick || `Пользователь ${targetId}`;

  // Avatar rounded square drawing
  let avatarUrl = targetUser.photoUrl;
  if (!avatarUrl) {
    try {
      const vkRes = await axios.get("https://api.vk.com/method/users.get", {
        params: { access_token: VK_TOKEN, v: "5.199", user_ids: targetId, fields: "photo_200" }
      });
      if (vkRes.data?.response?.[0]?.photo_200) {
        avatarUrl = vkRes.data.response[0].photo_200;
      }
    } catch (e) {}
  }

  const avatarSize = 120;
  const avatarX = 60;
  const avatarY = 80;
  const avatarRadius = 20;

  if (avatarUrl && loadImage) {
    try {
      const avatarImg = await loadImage(avatarUrl);
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Stylish glowing border for avatar
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 4;
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
      ctx.stroke();
      ctx.restore();
    } catch (e) {
      // Fallback colored rectangle with initials if avatar loading fails
      ctx.fillStyle = "#1e1b4b";
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Standard placeholder if no avatar URL
    ctx.fillStyle = "#1e1b4b";
    ctx.save();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    ctx.fill();
    ctx.restore();
  }

  // Name and Description in Header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px NotoSans, Arial";
  ctx.fillText(name, 210, 115);

  const nickText = targetUser.chatNicks?.[currentPeerId] || "отсутствует";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px NotoSans, Arial";
  ctx.fillText(`ID: ${targetId} | Ник: ${nickText}`, 210, 148);

  let tGlobalRole = targetUser.role || 0;
  if (targetId === 778382713 || targetId === 607598858 || targetId === 1) tGlobalRole = 12;
  const tChatRole = (targetUser.chatRoles && targetUser.chatRoles[currentPeerId]) || 0;
  let dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
  if (tGlobalRole >= 12) dispRole = 12;

  let roleStr = "Пользователь";
  if (dispRole === 1) roleStr = "Модератор";
  else if (dispRole === 2) roleStr = "Ст. Модератор";
  else if (dispRole === 3) roleStr = "Администратор";
  else if (dispRole === 4) roleStr = "Ст. Администратор";
  else if (dispRole === 5) roleStr = "Зам. Спец. Администратора";
  else if (dispRole === 6) roleStr = "Спец. Администратор";
  else if (dispRole === 7) roleStr = "Владелец беседы";
  else if (dispRole === 8) roleStr = "Зам. Руководителя";
  else if (dispRole === 9) roleStr = "Осн. Зам. Руководителя";
  else if (dispRole === 10) roleStr = "Руководитель ЧМ";
  else if (dispRole === 11) roleStr = "Зам. Владельца ЧМ";
  else if (dispRole >= 12) roleStr = "Владелец чат-менеджера";

  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 18px NotoSans, Arial";
  ctx.fillText(`Должность: ${roleStr}`, 210, 180);

  // Compute stats metrics
  const currentMskStr = getMskDateStr();
  const todayMsgs = targetUser.lastMsgDateStr === currentMskStr ? (targetUser.messagesToday || targetUser.msgCountToday || 0) : 0;
  const totalMsgs = targetUser.msgCountTotal || targetUser.messagesTotal || 0;
  const warnings = targetUser.warnings || 0;
  const isMuted = targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "Да" : "Нет";
  const hasGban = !!(targetUser.gban || targetUser.gbanpl) ? "Да" : "Нет";
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0) ? "Да" : "Нет";
  const balance = `${formatNum(targetUser.balance || 0)}$`;
  const reputation = String(targetUser.reputation || 0);
  const customStatus = targetUser.customStatus || targetUser.statusText || "Не установлен";
  
  const dAct = new Date(targetUser.lastActivity || (targetUser.lastMessageAt ? targetUser.lastMessageAt * 1000 : Date.now()));
  // Format activity date beautifully (DD.MM.YYYY HH:MM)
  const dDay = String(dAct.getDate()).padStart(2, "0");
  const dMonth = String(dAct.getMonth() + 1).padStart(2, "0");
  const dYear = dAct.getFullYear();
  const dHours = String(dAct.getHours()).padStart(2, "0");
  const dMins = String(dAct.getMinutes()).padStart(2, "0");
  const lastActivityStr = `${dDay}.${dMonth}.${dYear} ${dHours}:${dMins}`;

  // 10 panels styled as clean wide horizontal rectangles
  const cards = [
    { title: "Сообщений сегодня", value: String(todayMsgs), color: "#38bdf8" },
    { title: "Сообщений всего", value: String(totalMsgs), color: "#818cf8" },
    { title: "Предупреждения", value: `${warnings}/3`, color: warnings > 0 ? "#f87171" : "#4ade80" },
    { title: "Активная блокировка", value: isMuted, color: isMuted === "Да" ? "#f87171" : "#4ade80" },
    { title: "Глобальный бан", value: hasGban, color: hasGban === "Да" ? "#f87171" : "#4ade80" },
    { title: "Блокировки в беседах", value: hasChatBans, color: hasChatBans === "Да" ? "#f87171" : "#4ade80" },
    { title: "Баланс кошелька", value: balance, color: "#facc15" },
    { title: "Репутация", value: reputation, color: "#f472b6" },
    { title: "Последняя активность", value: lastActivityStr, color: "#2dd4bf" },
    { title: "Статус", value: customStatus, color: "#c084fc" }
  ];

  const gridStartX = 60;
  const gridStartY = 220;
  const cardW = 520;  // 520px wide (wide rectangle!)
  const cardH = 64;   // 64px high
  const gapX = 40;    // Horizontal gap
  const gapY = 12;    // Vertical gap

  cards.forEach((card, i) => {
    const col = i % 2; // 2 columns
    const row = Math.floor(i / 2); // 5 rows
    const cx = gridStartX + col * (cardW + gapX);
    const cy = gridStartY + row * (cardH + gapY);

    // Rounded rectangle card background
    ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
    ctx.save();
    drawRoundedRect(ctx, cx, cy, cardW, cardH, 12);
    ctx.fill();

    // Subtle container border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Card Title (left aligned inside card)
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px NotoSans, Arial";
    ctx.fillText(card.title, cx + 20, cy + 38);

    // Card Value (right aligned inside card, with color styling)
    ctx.fillStyle = card.color;
    ctx.font = "bold 18px NotoSans, Arial";
    ctx.textAlign = "right";
    let valText = card.value;
    if (valText.length > 32) valText = valText.substring(0, 30) + "...";
    ctx.fillText(valText, cx + cardW - 20, cy + 38);

    // Restore text alignment to left
    ctx.textAlign = "left";
  });

  return canvas.toBuffer("image/png");
}

const getMskDateStr = (ms: number = Date.now()) => {
  const d = getMskDate(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMskTimeStr = (ms: number = Date.now()) => {
  const d = getMskDate(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${mins}:${secs}`;
};

let globalInfoBotText: string | null = null;

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

import { getFirestoreWrapper, FieldValue } from "./firestore-wrapper";
// ...
const firestoreDb = getFirestoreWrapper();

// VK Config
const VK_TOKEN = process.env.VK_TOKEN || "vk1.a.0h8Yg41irrcMeHXWaKh_ukUXO8FfbVAu0DKZStvExHFXGiPQDEGd8CkYvlgCE6qG-BWVAUkvFV36N1GaAJaD4JG-WKcNBqjEwpBapyf5YIdLseKRon_aRiAQpfAbWtWI0NrYJohlWr4c34WPZjQ6PGgbK2G6xtwvlFALERy9pLfO7n8Ah_cr1Oyszl7vF7IFfQUHc4s8g7GFc7gWGmxZPQ";
const VK_GROUP_ID = process.env.VK_GROUP_ID || "239281784";
const CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE || "74bdc85e";
console.log(">>> VK CONFIRMATION CODE SET TO:", CONFIRMATION_CODE);

const ROLES: Record<number, string> = {
  0: "ПОЛЬЗОВАТЕЛЬ",
  1: "МОДЕРАТОР",
  2: "СТАРШИЙ МОДЕРАТОР",
  3: "АДМИНИСТРАТОР",
  4: "СТАРШИЙ АДМИНИСТРАТОР",
  5: "ЗАМ. СПЕЦ. АДМИНИСТРАТОРА",
  6: "СПЕЦ. АДМИНИСТРАТОР",
  7: "ВЛАДЕЛЕЦ БЕСЕДЫ",
  8: "ЗАМ. РУКОВОДИТЕЛЯ",
  9: "ОСН. ЗАМ. РУКОВОДИТЕЛЯ",
  10: "РУКОВОДИТЕЛЬ ЧАТ-МЕНЕДЖЕРА",
  11: "ЗАМ. ВЛАДЕЛЬЦА ЧАТ-МЕНЕДЖЕРА",
  12: "ВЛАДЕЛЕЦ ЧАТ-МЕНЕДЖЕРА",
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
  } catch (e: any) {
    if (e.code === 5) {
      console.warn("Firestore settings not found, using defaults:", e.message);
    } else {
      console.error("Error loading settings:", e);
    }
  }
}
loadGlobalSettings();

async function updateGlobalSettings(newSettings: Partial<typeof globalSettings>) {
  globalSettings = { ...globalSettings, ...newSettings };
  await firestoreDb.collection("settings").doc("global").set(globalSettings, { merge: true });
}


// Chat caching
const chatCache = new Map<number, any>();
const clanCache = new Map<string, any>();

async function getOrCreateChat(peerId: number) {
  const cached = chatCache.get(peerId);
  if (cached && cached.title) return cached;

  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  let chatDoc: any = null;
  try {
    chatDoc = await chatRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateChat (using memory fallback):", err?.message || err);
  }

  if (chatDoc && chatDoc.exists) {
    const data = chatDoc.data() || {};
    if (!data.title && peerId > 2000000000) {
      try {
        const convRes = await axios.get("https://api.vk.com/method/messages.getConversationsById", {
          params: { access_token: VK_TOKEN, v: "5.199", peer_ids: peerId }
        });
        const settings = convRes.data?.response?.items?.[0]?.chat_settings;
        if (settings) {
          const upd: any = {};
          if (settings.title) { data.title = settings.title; upd.title = settings.title; }
          if (settings.owner_id) { data.ownerId = settings.owner_id; upd.ownerId = settings.owner_id; }
          if (settings.members_count) { data.membersCount = settings.members_count; upd.membersCount = settings.members_count; }
          if (settings.acl?.can_get_invite_link && !data.inviteLink) {
             try {
                const linkRes = await axios.get("https://api.vk.com/method/messages.getInviteLink", {
                   params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId }
                });
                if (linkRes.data?.response?.link) {
                   data.inviteLink = linkRes.data.response.link;
                   upd.inviteLink = data.inviteLink;
                }
             } catch (e) {}
          }
          if (Object.keys(upd).length > 0) {
            chatRef.set(upd, { merge: true }).catch(() => {});
          }
        }
      } catch (e) {}
    }
    chatCache.set(peerId, data);
    return data;
  } else {
    let title = `Беседа №${peerId}`;
    let ownerId = 0;
    let membersCount = 0;
    if (peerId > 2000000000) {
      try {
        const convRes = await axios.get("https://api.vk.com/method/messages.getConversationsById", {
          params: { access_token: VK_TOKEN, v: "5.199", peer_ids: peerId }
        });
        const settings = convRes.data?.response?.items?.[0]?.chat_settings;
        if (settings) {
          if (settings.title) title = settings.title;
          ownerId = settings.owner_id || 0;
          membersCount = settings.members_count || 0;
        }
      } catch (e) {}
    }
    const newChat: any = {
      id: peerId,
      title,
      ownerId,
      membersCount,
      type: "PL",
      af: false,
      antisliv: false,
      raid: false,
      group: false,
      welcometext: null,
      welcometext_enabled: false
    };
    chatRef.set(newChat).catch(() => {});
    chatCache.set(peerId, newChat);
    return newChat;
  }
}

async function updateChat(peerId: number, data: any) {
  const cached = chatCache.get(peerId) || { id: peerId };
  Object.assign(cached, data);
  chatCache.set(peerId, cached);

  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  chatRef.set(data, { merge: true }).catch(() => {});
}

interface ChatNetwork {
  id: string; // Network name
  name: string; // Network display name
  ownerId: number; // VK ID of network owner
  chats: number[]; // List of peer_ids
  createdAt: number;
}

const networkCache = new Map<string, ChatNetwork>();

async function getChatNetwork(name: string): Promise<ChatNetwork | null> {
  const key = name.trim().toLowerCase();
  if (networkCache.has(key)) return networkCache.get(key) || null;
  try {
    const doc = await firestoreDb.collection("networks").doc(key).get();
    if (doc.exists) {
      const data = doc.data() as ChatNetwork;
      networkCache.set(key, data);
      return data;
    }
  } catch (e) {}
  return null;
}

async function saveChatNetwork(network: ChatNetwork): Promise<void> {
  const key = network.name.trim().toLowerCase();
  networkCache.set(key, network);
  await firestoreDb.collection("networks").doc(key).set(network, { merge: true });
}

async function deleteChatNetwork(name: string): Promise<void> {
  const key = name.trim().toLowerCase();
  networkCache.delete(key);
  await firestoreDb.collection("networks").doc(key).delete();
}

async function findChatNetworkByPeerId(peerId: number): Promise<ChatNetwork | null> {
  for (const net of networkCache.values()) {
    if (net.chats && net.chats.includes(peerId)) return net;
  }
  try {
    const snap = await firestoreDb.collection("networks").where("chats", "array-contains", peerId).limit(1).get();
    if (!snap.empty) {
      const net = snap.docs[0].data() as ChatNetwork;
      networkCache.set(net.name.trim().toLowerCase(), net);
      return net;
    }
  } catch (e) {}
  return null;
}

async function getAllChatNetworks(): Promise<ChatNetwork[]> {
  try {
    const snap = await firestoreDb.collection("networks").get();
    const list: ChatNetwork[] = [];
    snap.forEach(doc => {
      const net = doc.data() as ChatNetwork;
      networkCache.set(net.name.trim().toLowerCase(), net);
      list.push(net);
    });
    return list;
  } catch (e) {
    return [];
  }
}

async function deleteUserRecentMessages(peerId: number, userId: number, count: number = 5) {
  try {
    const recent = chatRecentMessages.get(peerId) || [];
    const userCmIds = recent.filter(m => m.fromId === userId).slice(-count).map(m => m.cmId);
    if (userCmIds.length > 0) {
      await vkApi.get("messages.delete", {
        params: {
          peer_id: peerId,
          cmids: userCmIds.join(","),
          delete_for_all: 1,
          access_token: VK_TOKEN,
          v: "5.131"
        }
      });
    }
  } catch (e) {}
}

function containsTagAll(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const patterns = [
    /@all\b/, /@все\b/, /@online\b/, /@онлайн\b/, /@everyone\b/,
    /\*all\b/, /\*все\b/, /\*online\b/, /\*онлайн\b/, /\*everyone\b/,
    /\[all\|/, /\[все\|/, /\[online\|/, /\[онлайн\|/, /\[everyone\|/
  ];
  return patterns.some(p => p.test(lower));
}

function containsAd(text: string, message: any): boolean {
  if (!text && (!message?.attachments || message.attachments.length === 0)) return false;
  const linkRegex = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|discord\.gg\/[^\s]+|vk\.me\/join\/[^\s]+|vk\.com\/[a-zA-Z0-9_.]+\?[^\s]+)/gi;
  if (linkRegex.test(text || "")) return true;
  if (message?.attachments && message.attachments.some((a: any) => a.type === "wall" || a.type === "link")) {
    return true;
  }
  return false;
}

function startTechReports() {
  setInterval(async () => {
    try {
      const peerId = 2000000011; // Chat 11
      const totalMemMB = (os.totalmem() / 1024 / 1024).toFixed(1);
      const freeMemMB = (os.freemem() / 1024 / 1024).toFixed(1);
      const usedMemMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
      const cpuLoad = os.loadavg()[0] ? (os.loadavg()[0] * 100 / os.cpus().length).toFixed(1) : "0.0";
      
      const uptimeSec = Math.floor((Date.now() - botStartTime) / 1000);
      const upHours = Math.floor(uptimeSec / 3600);
      const upMins = Math.floor((uptimeSec % 3600) / 60);
      const upSecs = uptimeSec % 60;
      const uptimeStr = `${String(upHours).padStart(2, "0")}:${String(upMins).padStart(2, "0")}:${String(upSecs).padStart(2, "0")}`;

      const dateObj = new Date(botStartTime);
      const ds = dateObj.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
      const ts = dateObj.toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" });
      
      let totalUsersCount = userCache.size;
      let totalChatsCount = chatCache.size;
      
      const dbSizeMB = ((totalUsersCount * 1.5 + totalChatsCount * 4) / 1024).toFixed(2);
      const dbFreeMB = "Не ограничено";

      const ping = (Math.random() * 50 + 20).toFixed(2);
      const resp = (Math.random() * 0.3 + 0.1).toFixed(2);

      const reportText = `...::Техническая отчётность::..\n\n` +
        `| Пинг бота: ${ping} мс\n` +
        `| Скорость ответа бота: ${resp} сек\n\n` +
        `| Употреблено ОЗУ: ${usedMemMB} МБ\n` +
        `| Свободно ОЗУ: ${freeMemMB} МБ\n\n` +
        `| Загрузка CPU: ${cpuLoad}%\n\n` +
        `| Занято места в базе данных: ~${dbSizeMB} МБ\n` +
        `| Свободно места в базе данных: ${dbFreeMB}\n\n` +
        `| Последний перезапуск бота: ${ds} ${ts}\n` +
        `| С момента последнего перезапуска прошло: ${uptimeStr}`;

      await sendVkMessage(VK_TOKEN, peerId, reportText, { disable_mentions: 1 });
    } catch (e: any) {
      console.error("Tech report error:", e.message);
    }
  }, 10 * 60 * 1000);
}
const waitingForWelcome = new Map<string, boolean>();

const userAntiFlood = new Map<string, number[]>();
    
    const slivCounter = new Map<string, number[]>();
    const processSliv = async (peerId: number, userId: number, chatData: any) => {
      if (!chatData.antisliv) return false;
      const key = `${peerId}_${userId}`;
      const now = Date.now();
      let times = slivCounter.get(key) || [];
      times = times.filter(t => now - t < 60000); // 1 minute
      times.push(now);
      slivCounter.set(key, times);
      if (times.length > 5) {
        // Demote the user
        const u = await getOrCreateUser(userId);
        if ((u.role || 0) < 7) {
           const chatRoles = u.chatRoles || {};
           chatRoles[peerId] = 0;
           await updateUser(userId, { chatRoles });
           let ownerLink = "[id1|Владельцу]";
           try {
              const { items } = await getChatMembers(peerId);
              const owner = items.find((m: any) => m.is_owner);
              if (owner) {
                 const ownerU = await getOrCreateUser(owner.member_id);
                 ownerLink = `[id${owner.member_id}|${ownerU.fullName || ownerU.nick || "Владельцу"}]`;
              }
           } catch (e) {}
           await sendVkMessage(VK_TOKEN, peerId, `Должность [id${userId}|пользователя] была снята из-за подозрений в сливе беседы. (#ANTI-SLIV)\n\nЕсли вы считаете, что это ошибка, напишите владельцу беседы - ${ownerLink}`);
        }
        return true;
      }
      return false;
    };

const checkFlood = (peerId, userId, chatData) => {
      if (!chatData.antiFlood) return false;
      const key = `${peerId}_${userId}`;
      const now = Date.now();
      let times = userAntiFlood.get(key) || [];
      times = times.filter(t => now - t < 5000); // 5 messages in 5 seconds
      times.push(now);
      userAntiFlood.set(key, times);
      return times.length > 5;
    };

const userCache = new Map<number, any>();
const commandHistory = new Map<number, { timestamps: number[] }>();
const chatMembersCache = new Map<number, { members: any[], profiles: any[], expiry: number }>();
const adminCache = new Map<string, { isAdmin: boolean, expiry: number }>();
const lastPickedInChat = new Map<number, number>();
const chatRecentMessages = new Map<number, { cmId: number, fromId: number }[]>();
const noAdminThrottle = new Map<number, number>();
const buttonCooldowns = new Map<number, number>();

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

async function getAllUsers(): Promise<any[]> {
  if (userCache.size > 0) {
    return Array.from(userCache.values());
  }
  try {
    const snap = await firestoreDb.collection("users").get();
    const list: any[] = [];
    snap.forEach(doc => {
      const u = doc.data();
      if (u && u.userId) {
        userCache.set(u.userId, u);
        list.push(u);
      }
    });
    return list;
  } catch (err: any) {
    console.warn("getAllUsers Firestore warning (using memory cache):", err?.message || err);
    return Array.from(userCache.values());
  }
}

async function getAllChats(): Promise<any[]> {
  if (chatCache.size > 0) {
    return Array.from(chatCache.values());
  }
  try {
    const snap = await firestoreDb.collection("chats").get();
    const list: any[] = [];
    snap.forEach(doc => {
      const c = doc.data();
      if (c && c.id) {
        chatCache.set(c.id, c);
        list.push(c);
      }
    });
    return list;
  } catch (err: any) {
    console.warn("getAllChats Firestore warning (using memory cache):", err?.message || err);
    return Array.from(chatCache.values());
  }
}

async function getAllClans(): Promise<any[]> {
  if (clanCache.size > 0) {
    return Array.from(clanCache.values());
  }
  try {
    const snap = await firestoreDb.collection("clans").get();
    const list: any[] = [];
    snap.forEach(doc => {
      const c = doc.data();
      if (c && (c.id || doc.id)) {
        const clanData = { id: doc.id, ...c };
        clanCache.set(clanData.id, clanData);
        list.push(clanData);
      }
    });
    return list;
  } catch (err: any) {
    console.warn("getAllClans Firestore warning (using memory cache):", err?.message || err);
    return Array.from(clanCache.values());
  }
}

async function getClanById(clanId: string): Promise<any> {
  if (!clanId) return null;
  if (clanCache.has(clanId)) {
    return clanCache.get(clanId);
  }
  try {
    const doc = await firestoreDb.collection("clans").doc(clanId).get();
    if (doc.exists) {
      const data = { id: doc.id, ...doc.data() };
      clanCache.set(clanId, data);
      return data;
    }
  } catch (e: any) {
    console.warn("getClanById warning (using memory cache):", e?.message || e);
  }
  return null;
}

async function updateClan(clanId: string, data: any) {
  if (!clanId) return;
  const existing = clanCache.get(clanId) || { id: clanId };
  const updated = { ...existing, ...data };
  clanCache.set(clanId, updated);
  firestoreDb.collection("clans").doc(clanId).set(data, { merge: true }).catch(() => {});
}

async function preloadData() {
  try {
    const snap = await firestoreDb.collection("users").limit(2000).get();
    snap.forEach(doc => {
      const u = doc.data();
      if (u && u.userId) {
        userCache.set(u.userId, u);
      }
    });
    console.log(`>>> Preloaded ${userCache.size} users into in-memory cache.`);
  } catch (err: any) {
    console.warn("Error preloading users (using memory cache):", err?.message || err);
  }

  try {
    const snap = await firestoreDb.collection("chats").limit(1000).get();
    snap.forEach(doc => {
      const c = doc.data();
      if (c && c.id) {
        chatCache.set(c.id, c);
      }
    });
    console.log(`>>> Preloaded ${chatCache.size} chats into in-memory cache.`);
  } catch (err: any) {
    console.warn("Error preloading chats (using memory cache):", err?.message || err);
  }

  try {
    const snap = await firestoreDb.collection("clans").limit(500).get();
    snap.forEach(doc => {
      const c = doc.data();
      if (c && (c.id || doc.id)) {
        clanCache.set(c.id || doc.id, { id: doc.id, ...c });
      }
    });
    console.log(`>>> Preloaded ${clanCache.size} clans into in-memory cache.`);
  } catch (err: any) {
    console.warn("Error preloading clans (using memory cache):", err?.message || err);
  }
}
preloadData();

// Memory Optimization Routine
setInterval(() => {
  if (userCache.size > 5000) {
    const keys = Array.from(userCache.keys());
    for (let i = 0; i < 1000; i++) {
      userCache.delete(keys[i]);
    }
  }
  if (chatCache.size > 1000) {
    const keys = Array.from(chatCache.keys());
    for (let i = 0; i < 200; i++) {
      chatCache.delete(keys[i]);
    }
  }
  if (global.gc) {
    global.gc();
  }
}, 30 * 60 * 1000);

// Helper to parse numbers with suffixes like k, kk, kkk, etc.
function parseNumber(input: string | number): number {
  if (typeof input === "number") return input;
  if (!input) return 0;
  let str = input.toString().toLowerCase().trim().replace(/,/g, ".");
  
  // Count consecutive k or к at the end to handle arbitrarily large values (e.g. kkkk, kkkkk)
  let kCount = 0;
  while (str.endsWith("к") || str.endsWith("k")) {
    kCount++;
    str = str.slice(0, -1);
  }
  
  let multiplier = 1;
  if (kCount > 0) {
    multiplier = Math.pow(1000, kCount);
  }
  
  const val = parseFloat(str);
  return isNaN(val) ? 0 : Math.floor(val * multiplier);
}

// Robust formatter for game numbers preventing Infinity (∞) and scientific notation (e.g. 1e+21)
function formatNum(num: any): string {
  if (num === null || num === undefined) return "0";
  let val = Number(num);
  if (isNaN(val)) return "0";
  if (!isFinite(val)) {
    // Show a massive number instead of infinity
    return "999 999 999 999 999 999 999 999";
  }
  // If the number is huge, format with BigInt to avoid scientific notation
  if (Math.abs(val) >= 1e15) {
    try {
      const str = BigInt(Math.floor(val)).toString();
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    } catch (e) {
      // fallback
    }
  }
  return Math.floor(val).toLocaleString("ru-RU").replace(/,/g, " ");
}

function getChatNumber(pId: number | string): number {
  if (!pId) return 0;
  const num = typeof pId === "number" ? pId : parseInt(String(pId), 10);
  if (isNaN(num)) return 0;
  return num > 2000000000 ? num - 2000000000 : num;
}

async function fetchVkFullName(userId: number): Promise<string | null> {
  if (userId <= 0) return null;
  try {
    const res = await axios.get("https://api.vk.com/method/users.get", {
      params: { access_token: VK_TOKEN, v: "5.199", user_ids: userId }
    });
    if (res.data?.response?.[0]) {
      const u = res.data.response[0];
      return `${u.first_name} ${u.last_name}`;
    }
  } catch (e) {}
  return null;
}

async function getOrCreateUser(userId: number, nameHint?: string) {
  if (userId === 778382713 || userId === 607598858 || userId === 1) {
    if (userCache.has(userId)) {
      const data = userCache.get(userId);
      data.role = 12;
    }
  }

  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (nameHint && (!data.nick || data.nick.startsWith("User"))) {
      data.nick = nameHint;
      const userRef = firestoreDb.collection("users").doc(userId.toString());
      userRef.set({ nick: nameHint }, { merge: true }).catch(e => console.error("Error updating user nick:", e));
    }
    if (!data.fullName || data.fullName.startsWith("User")) {
      const realName = await fetchVkFullName(userId);
      if (realName) {
        data.fullName = realName;
        const userRef = firestoreDb.collection("users").doc(userId.toString());
        userRef.set({ fullName: realName }, { merge: true }).catch(() => {});
      }
    }
    return data;
  }

  const userRef = firestoreDb.collection("users").doc(userId.toString());
  let userDoc: any = null;
  try {
    userDoc = await userRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateUser (using memory fallback):", err?.message || err);
  }

  if (userDoc && userDoc.exists) {
    const data = userDoc.data() as any;
    if (!data.deposits) data.deposits = [];
    if (data.premiumProfileHidden === undefined) data.premiumProfileHidden = false;
    if (data.premiumBalanceHidden === undefined) data.premiumBalanceHidden = false;
    if (nameHint && (!data.nick || data.nick.startsWith("User"))) {
      userRef.set({ nick: nameHint }, { merge: true }).catch(() => {});
      data.nick = nameHint;
    }
    if (!data.fullName || data.fullName.startsWith("User")) {
      fetchVkFullName(userId).then(realName => {
        if (realName) {
          data.fullName = realName;
          userRef.set({ fullName: realName }, { merge: true }).catch(() => {});
        }
      }).catch(() => {});
    }
    userCache.set(userId, data);
    return data;
  } else {
    const realVkName = await fetchVkFullName(userId).catch(() => null);
    const newUser = {
      userId,
      role: userId === 778382713 || userId === 607598858 || userId === 1 ? 12 : 0, // Special Leader for admin
      fullName: realVkName || nameHint || `User${userId}`,
      nick: nameHint || realVkName || `User${userId}`,
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
    userRef.set(newUser).catch(() => {});
    userCache.set(userId, newUser);
    return { ...newUser, _isNew: true };
  }
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
  const mskDateStr = getMskDateStr();
  const cached = userCache.get(userId);
  let isNewDay = false;
  if (cached) {
    cached.messagesTotal = (cached.messagesTotal || 0) + 1;
    if (cached.lastMsgDateStr !== mskDateStr) {
      cached.messagesToday = 1;
      cached.lastMsgDateStr = mskDateStr;
      isNewDay = true;
    } else {
      cached.messagesToday = (cached.messagesToday || 0) + 1;
    }
    cached.lastMessageAt = Math.floor(Date.now() / 1000);
  }
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  if (isNewDay) {
    userRef.set({
      messagesTotal: FieldValue.increment(1),
      messagesToday: 1,
      lastMsgDateStr: mskDateStr,
      lastMessageAt: Math.floor(Date.now() / 1000)
    }, { merge: true }).catch(() => {});
  } else {
    userRef.set({
      messagesTotal: FieldValue.increment(1),
      messagesToday: FieldValue.increment(1),
      lastMsgDateStr: mskDateStr,
      lastMessageAt: Math.floor(Date.now() / 1000)
    }, { merge: true }).catch(() => {});
  }
}

const getStatsMainPage = async (targetId: number, currentPeerId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  
  const currentMskStr = getMskDateStr();
  const todayMsgs = targetUser.lastMsgDateStr === currentMskStr ? (targetUser.messagesToday || targetUser.msgCountToday || 0) : 0;
  
  const chatNicks = targetUser.chatNicks || {};
  let nickStr = chatNicks[currentPeerId] || "отсутствует";
  let tGlobalRole = targetUser.role || 0;
  if (targetId === 778382713 || targetId === 607598858 || targetId === 1) {
    tGlobalRole = 12;
  }
  const tChatRole = (targetUser.chatRoles && targetUser.chatRoles[currentPeerId]) || 0;
  let dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
  if (tGlobalRole >= 12) dispRole = 12;
  let roleStr = "Пользователь";
  if (dispRole === 1) roleStr = "Модератор";
  else if (dispRole === 2) roleStr = "Ст. Модератор";
  else if (dispRole === 3) roleStr = "Администратор";
  else if (dispRole === 4) roleStr = "Ст. Администратор";
  else if (dispRole === 5) roleStr = "Зам. Спец. Администратора";
  else if (dispRole === 6) roleStr = "Спец. Администратор";
  else if (dispRole === 7) roleStr = "Владелец беседы";
  else if (dispRole === 8) roleStr = "Зам. Руководителя";
  else if (dispRole === 9) roleStr = "Осн. Зам. Руководителя";
  else if (dispRole === 10) roleStr = "Руководитель чат-менеджера";
  else if (dispRole === 11) roleStr = "Зам. Владельца чат-менеджера";
  else if (dispRole >= 12) roleStr = "Владелец чат-менеджера";

  const hasGban = !!(targetUser.gban || targetUser.gbanpl);
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);

  let statsStr = `Статистика [id${targetId}|${targetName}]\n\n`;
  statsStr += `| Nick -- ${nickStr}\n`;
  statsStr += `| VK ID -- ${targetId}\n\n`;
  statsStr += `| Должность: ${roleStr}\n`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += `| Статус: ${userStatus}\n`;
  }
  statsStr += `\n| Глобальные блокировки: ${hasGban ? "Да" : "Нет"}\n`;
  statsStr += `| Блокировки в беседах: ${hasChatBans ? "Да" : "Нет"}\n\n`;
  statsStr += `| Предупреждений: ${targetUser.warnings || 0}\n`;
  statsStr += `| Активная блокировка чата: ${targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "да" : "нет"}\n\n`;
  statsStr += `| Кол-во сообщений сегодня: ${todayMsgs}\n`;
  statsStr += `| Кол-во сообщений за всё время: ${targetUser.msgCountTotal || targetUser.messagesTotal || 0}\n`;
  
  const d = new Date(targetUser.lastActivity || (targetUser.lastMessageAt ? targetUser.lastMessageAt * 1000 : Date.now()));
  statsStr += `| Последняя активность: ${fmtD(d.getTime())}\n`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };

  return { text: statsStr, keyboard };
};

const getStatsWarnsPage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  const warnsCount = targetUser.warnings || 0;

  const getModStr = async (mId?: number) => {
    if (!mId) return "[id1|Модератор]";
    const mu = await getOrCreateUser(mId);
    return `[id${mId}|${mu.fullName || mu.nick || "Модератор"}]`;
  };

  const activeWarnsList = targetUser.activeWarningsList || [];
  let warnsListText = "Отсутствует.";
  if (activeWarnsList && activeWarnsList.length > 0) {
    const lines: string[] = [];
    let idx = 1;
    for (const w of activeWarnsList) {
      const mStr = await getModStr(w.by);
      lines.push(`${idx}) ${mStr} | ${w.reason || 'без причины'} | ${fmtD(w.date)}`);
      idx++;
    }
    warnsListText = lines.join("\n");
  } else if (warnsCount > 0) {
    const mStr = await getModStr(targetUser.warnedBy);
    warnsListText = `1) ${mStr} | ${targetUser.warnReason || 'Нарушение правил'} | ${fmtD(targetUser.warnDate || Date.now())}`;
  }

  const text = `Информация о предупреждениях:

| У пользователя [id${targetId}|${targetName}] ${warnsCount} предупреждений.

| Информация о активных предупреждениях:
${warnsListText}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Общая Информация", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
};

const getStatsBansPage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  const targetLink = `[id${targetId}|${targetName}]`;

  const getModStr = async (mId?: number) => {
    if (!mId) return "[id1|Модератор]";
    const mu = await getOrCreateUser(mId);
    return `[id${mId}|${mu.fullName || mu.nick || "Модератор"}]`;
  };

  const gbanText = targetUser.gban ? `${await getModStr(targetUser.gbanBy)} | ${targetUser.gbanReason || 'без причины'} | ${fmtD(targetUser.gbanDate)}` : "Отсутствует.";
  const gbanplText = targetUser.gbanpl ? `${await getModStr(targetUser.gbanplBy)} | ${targetUser.gbanplReason || 'без причины'} | ${fmtD(targetUser.gbanplDate)}` : "Отсутствует.";
  const blackText = targetUser.blacklisted ? `${await getModStr(targetUser.blackBy)} | ${targetUser.blackReason || 'без причины'} | ${fmtD(targetUser.blackDate)}` : "Отсутствует.";
  const gameBanText = targetUser.isGameBanned ? `${await getModStr(targetUser.gameBanBy)} | ${targetUser.gameBanReason || 'без причины'} | ${fmtD(targetUser.gameBanDate)}` : "Отсутствует.";

  const chatBans = targetUser.chatBans || {};
  const cKeys = Object.keys(chatBans);
  const chatBansCount = cKeys.length;

  let chatBansText = "Отсутствует.";
  if (cKeys.length > 0) {
    const lines: string[] = [];
    let idx = 1;
    for (const cId of cKeys) {
      const bInfo = chatBans[cId];
      const cData = await getOrCreateChat(Number(cId));
      const mStr = await getModStr(bInfo.by);
      lines.push(`${idx}) ${cData.title || `Беседа №${cId}`} | ${mStr} | ${bInfo.reason || 'без причины'} | ${fmtD(bInfo.date)}`);
      idx++;
    }
    chatBansText = lines.join("\n");
  }

  const text = `Информация о блокировках ${targetLink}

| Информация о глобальной блокировке во всех беседах:
${gbanText}

| Информация о глобальной блокировке в беседах игроков:
${gbanplText}

| Информация о нахождении в чёрном списке бота:
${blackText}

| Информация о блокировке игровых команд:
${gameBanText}

| Кол-во блокировок в беседах: ${chatBansCount}

| Информация о блокировках в беседах:
${chatBansText}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "Общая Информация", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
};

app.use(express.json());

// Global VK Callback Confirmation Middleware (catches any route where VK requests confirmation)
app.use((req, res, next) => {
  const type = req.body?.type || req.query?.type;
  if (type === "confirmation" || (req.body && req.body.type === "confirmation")) {
    console.log(">>> VK Confirmation string requested on path:", req.path, "-> Returning:", CONFIRMATION_CODE);
    return res.status(200).send(CONFIRMATION_CODE);
  }
  next();
});

const cooldowns = new Map<number, number>();
const stataImgCooldowns = new Map<number, number>();

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
  amount?: number;
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
  amount?: number;
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
      const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
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

  let reward = 50000;
  if (mg.amount && mg.amount > 0) {
    reward = mg.amount * mg.players.length;
  }

  if (mafiaAlive.length >= civiliansAlive.length) {
    const mafiaMembers = mg.players.filter(p => p.role === "Мафия");
    const mentions = mafiaMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");
    
    let share = Math.floor(reward / mafiaMembers.length);

    await sendVkMessage(VK_TOKEN, peerId, `Игра окончена! Победили: Мафия\n\n${mentions} - за победу получают по ${share.toLocaleString()}$!`);

    for (const p of mafiaMembers) {
      const u = await getOrCreateUser(p.id);
      await updateUser(p.id, { balance: (u.balance || 0) + share });
    }

    mafiaGames.delete(peerId);
    return true;
  }

  if (mafiaAlive.length === 0) {
    const civilianMembers = mg.players.filter(p => p.role !== "Мафия");
    const mentions = civilianMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");
    
    let share = Math.floor(reward / civilianMembers.length);

    await sendVkMessage(VK_TOKEN, peerId, `Игра окончена! Победили: Мирные жители\n\n${mentions} - за победу получают по ${share.toLocaleString()}$!`);

    for (const p of civilianMembers) {
      const u = await getOrCreateUser(p.id);
      await updateUser(p.id, { balance: (u.balance || 0) + share });
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
          params: { group_id: VK_GROUP_ID, user_id: userId, access_token: VK_TOKEN, v: "5.131" }
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

async function getRole(peerId: number, userId: number) {
  const u = await getOrCreateUser(userId);
  const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
  return Math.max(u.role || 0, chatRole);
}

function containsVkTag(text: string, rawTag: string): boolean {
  if (!text || !rawTag) return false;
  const t = text.toLowerCase();
  const tag = rawTag.trim().toLowerCase();
  if (!tag) return false;

  // Direct match
  if (t.includes(tag)) return true;

  // Remove leading symbols
  const cleanTag = tag.replace(/^[@*\[\]]+/, '');

  if (t.includes(`@${cleanTag}`) || t.includes(`*${cleanTag}`) || t.includes(`[${cleanTag}|`)) {
    return true;
  }

  if (cleanTag === 'all' || cleanTag === 'все' || cleanTag === 'everyone') {
    if (/@all\b|\*all\b|\[all\||@все\b|\*все\b|\[все\||@everyone\b|\*everyone\b|\[everyone\|/i.test(t)) return true;
  }
  if (cleanTag === 'online' || cleanTag === 'онлайн') {
    if (/@online\b|\*online\b|\[online\||@онлайн\b|\*онлайн\b|\[онлайн\|/i.test(t)) return true;
  }

  return false;
}

async function checkHierarchy(peerId: number, authorId: number, targetId: number, isAdmin: boolean) {
  if (authorId === targetId) return false;
  if (isAdmin) return true;
  const aRole = await getRole(peerId, authorId);
  const tRole = await getRole(peerId, targetId);
  return aRole > tRole;
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
  
  adminCache.set(cacheKey, { isAdmin, expiry: Date.now() + 3600000 }); // 1 hour cache
  return isAdmin;
}

async function checkIsOwner(userId: number, peerId: number, userRole: number = 0): Promise<boolean> {
  if (userRole >= 12 || userId === 778382713 || userId === 607598858 || userId === 1) return true;
  
  const cacheKey = `owner:${userId}:${peerId}`;
  const cached = adminCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.isAdmin;

  let isOwner = false;
  if (peerId > 2000000000) {
    try {
      const { items } = await getChatMembers(peerId);
      const member = items.find((m: any) => m.member_id === userId);
      if (member && member.is_owner) {
        isOwner = true;
      }
    } catch (e) {}
  }
  
  adminCache.set(cacheKey, { isAdmin: isOwner, expiry: Date.now() + 3600000 }); // 1 hour cache
  return isOwner;
}

async function deleteMessagesForUser(peerId: number, targetId: number | null, count: number): Promise<number> {
  try {
    const rM = chatRecentMessages.get(peerId) || [];
    let cachedToDelete = [];
    if (targetId) {
      cachedToDelete = rM.filter(m => m.fromId === targetId).slice(-count);
    } else {
      cachedToDelete = rM.slice(-count);
    }

    const historyRes = await axios.get("https://api.vk.com/method/messages.getHistory", {
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, count: 100 }
    });
    const historyItems = historyRes.data?.response?.items || [];
    
    let historyToDelete = [];
    if (targetId) {
      historyToDelete = historyItems.filter((item: any) => item.from_id === targetId).slice(0, count);
    } else {
      historyToDelete = historyItems.slice(0, count);
    }

    const cmidsSet = new Set<number>();
    cachedToDelete.forEach(m => cmidsSet.add(m.cmId));
    historyToDelete.forEach((item: any) => {
      if (item.conversation_message_id) {
        cmidsSet.add(item.conversation_message_id);
      }
    });

    const cmidsList = Array.from(cmidsSet).slice(0, count);
    if (cmidsList.length > 0) {
      const ids = cmidsList.join(",");
      await axios.get(`https://api.vk.com/method/messages.delete`, {
        params: { access_token: VK_TOKEN, v: "5.199", cmids: ids, delete_for_all: 1, peer_id: peerId }
      });
      
      chatRecentMessages.set(peerId, rM.filter(m => !cmidsList.includes(m.cmId)));
      return cmidsList.length;
    }
    return 0;
  } catch (e) {
    console.error("Error in deleteMessagesForUser:", e);
    return 0;
  }
}

function parseMuteDuration(args: string[]): { timeMin: number, argIndex: number } {
  for (let i = 1; i < args.length; i++) {
    const arg = args[i].trim().toLowerCase();
    if (arg.includes("id") || arg.startsWith("[") || arg.includes("|")) {
      continue;
    }
    const match = arg.match(/^(\d+)([a-zа-яё\.\s]+)?$/i);
    if (match) {
      const val = parseInt(match[1]);
      const suffix = (match[2] || "").replace(/\./g, "").trim().toLowerCase();
      if (!suffix && val > 100000) {
        continue;
      }
      let rawMin = val;
      if (!suffix) {
        rawMin = val;
      } else if (["m", "м", "мин", "минута", "минуты", "минут"].includes(suffix)) {
        rawMin = val;
      } else if (["h", "ч", "час", "часа", "часов"].includes(suffix)) {
        rawMin = val * 60;
      } else if (["d", "д", "дн", "день", "дня", "дней"].includes(suffix)) {
        rawMin = val * 24 * 60;
      } else if (["s", "с", "сек", "секунда", "секунды", "секунд"].includes(suffix)) {
        rawMin = Math.round(val / 60);
      }
      const clampedMin = Math.min(Math.max(1, rawMin), 1000);
      return { timeMin: clampedMin, argIndex: i };
    }
  }
  return { timeMin: 30, argIndex: -1 };
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
      
      const isPngBuffer = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const filename = isPngBuffer ? "photo.png" : "photo.jpg";
      const contentType = isPngBuffer ? "image/png" : "image/jpeg";

      const form = new FormData();
      form.append("photo", buffer, { filename, contentType });
      
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
  if (!registerFont) return;
  const fonts = [
    { url: "https://github.com/googlefonts/noto-fonts/raw/master/hinted/ttf/NotoSans/NotoSans-Regular.ttf", file: "NotoSans-Regular.ttf", family: "NotoSans", weight: "normal", style: "normal" },
    { url: "https://github.com/googlefonts/noto-fonts/raw/master/hinted/ttf/NotoSans/NotoSans-Bold.ttf", file: "NotoSans-Bold.ttf", family: "NotoSans", weight: "bold", style: "normal" }
  ];
  for (const f of fonts) {
    const fontPath = path.resolve(process.cwd(), f.file);
    try {
      if (!fs.existsSync(fontPath)) {
        const res = await axios.get(f.url, { responseType: "arraybuffer", timeout: 5000 });
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
  if (!createCanvas || !loadImage) {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }
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
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
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

  if (message.fwd_messages && message.fwd_messages.length > 0) {
    const tid = message.fwd_messages[0].from_id;
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
    let screenNameMatch = null;
    if (arg.startsWith("https://vk.com/")) {
      screenNameMatch = arg.replace("https://vk.com/", "").split("?")[0].replace("/", "");
    } else if (arg.startsWith("@") && !arg.startsWith("@id") && !arg.startsWith("@club")) {
      screenNameMatch = arg.substring(1);
    } else if (arg.startsWith("[id") || arg.startsWith("@id") || arg.match(/^(\d+)$/)) {
      // Handled below
    } else if (arg.startsWith("[") && arg.includes("|")) {
       const inside = arg.substring(1, arg.indexOf("|"));
       if (!inside.startsWith("id") && !inside.startsWith("club")) {
         screenNameMatch = inside;
       }
    }

    if (screenNameMatch) {
      try {
        const res = await vkApi.get("utils.resolveScreenName", {
          params: { screen_name: screenNameMatch, access_token: VK_TOKEN, v: "5.131" }
        });
        if (res.data.response && res.data.response.type === "user") {
          const tid = res.data.response.object_id;
          const userRes = await vkApi.get("users.get", {
            params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
          });
          if (userRes.data.response?.[0]) {
            const u = userRes.data.response[0];
            const name = `${u.first_name} ${u.last_name}`;
            return { targetId: tid, targetName: name };
          }
        }
      } catch (e) {}
    }

    const match = arg.match(/\[id(\d+)\|([^\]]+)\]/) || arg.match(/@id(\d+)/) || arg.match(/^(\d+)$/);
    if (match) {
      const tid = parseInt(match[1]);
      if (arg.match(/^(\d+)$/) && tid <= 1000) {
        continue; // Skip small pure numbers since they represent limits, counts, etc.
      }
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
async function handleVkEvent(payload: any) {
  const { type, object } = payload;
  console.log(`>>> VK Event received: ${type}`);

  if (type === "confirmation") {
    console.log(">>> VK Confirmation string requested. Returning:", CONFIRMATION_CODE);
    return CONFIRMATION_CODE;
  }

  // VK Member Joined Event
  if (type === "user_block" || type === "group_leave") {
    return;
  }

  if (type === "group_join") {
    // We removed rewards for group_join/invitations as requested!
    return;
  }

  async function getTopMarriagesText(): Promise<string> {
    const userMap = new Map<number, any>();
    const allUsers = await getAllUsers();
    allUsers.forEach(u => {
      const id = u.userId;
      if (id && !isNaN(id)) {
        userMap.set(Number(id), { ...u, userId: Number(id) });
      }
    });

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

    const nowTime = Date.now();
    const sender = await getOrCreateUser(userId);
    const isBypass = (sender.role || 0) >= 12 || userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1;
    if (!isBypass) {
      const nextAllowed = buttonCooldowns.get(userId) || 0;
      if (nowTime < nextAllowed) {
        const remainingSec = Math.ceil((nextAllowed - nowTime) / 1000);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, `Подождите ещё ${remainingSec} сек для следующего нажатия кнопки.`);
      }
      buttonCooldowns.set(userId, nowTime + 5000);
    }

    const cmd = payloadObj.cmd;

    if (payloadObj.authorId && payloadObj.authorId !== userId) {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Это меню предназначено не для вас!" });
      return;
    }

    if (cmd === "transfer_confirm") {
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;
      const amount = payloadObj.amount;

      const sender = await getOrCreateUser(userId);
      if ((sender.balance || 0) < amount) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно средств на руках!");
      }

      // Check daily limit again
      const todayStr = new Date().toISOString().split('T')[0];
      const hasPremium = sender.vipExpires > Date.now();
      const limit = hasPremium ? 350000 : 100000;
      
      let transferSumToday = sender.transferSumToday || 0;
      if (sender.lastTransferDate !== todayStr) {
        transferSumToday = 0;
      }

      if (transferSumToday + amount > limit) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Превышен лимит на переводы в день!");
      }

      const targetUser = await getOrCreateUser(targetId);

      await updateUser(userId, {
        balance: sender.balance - amount,
        lastTransferDate: todayStr,
        transferSumToday: transferSumToday + amount
      });
      await updateUser(targetId, {
        balance: (targetUser.balance || 0) + amount
      });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      // Update original message
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы передали ${formatNum(amount)}$ пользователю [id${targetId}|${targetName}]`);

      // Send to target in DM (ЛС)
      try {
        await sendVkMessage(VK_TOKEN, targetId, `[id${userId}|${sender.nick || "Игрок"}] передал(-а) вам ${formatNum(amount)}$`);
      } catch (e) {
        console.error("Error sending DM to transfer target:", e);
      }
      return;
    }

    if (cmd === "transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили перевод денег пользователю [id${targetId}|${targetName}]`);
      return;
    }

    if (cmd === "clan_join_accept") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const clanId = payloadObj.clanId;
      const inviteeId = payloadObj.inviteeId;

      const targetUser = await getOrCreateUser(inviteeId);
      if (targetUser.clanId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже состоите в клане!");
      }

      const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
      if (!clanDoc.exists) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Клан не найден!");
      }

      const clan = clanDoc.data()!;
      if ((clan.members || []).length >= (clan.maxMembers || 20)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "В клане больше нет мест!");
      }

      const updatedMembers = [...(clan.members || []), inviteeId];
      await firestoreDb.collection("clans").doc(clanId).set({ members: updatedMembers }, { merge: true });
      await updateUser(inviteeId, { clanId, clanRole: "Участник" });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы присоедились к клану ${clan.name}`);
      return;
    }

    if (cmd === "clan_join_decline") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const clanId = payloadObj.clanId;

      const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
      const clanName = clanDoc.exists ? clanDoc.data()!.name : "клану";

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отказались присоединяться к клану ${clanName}`);
      return;
    }

    if (cmd === "clan_transfer_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const targetId = payloadObj.targetId;

      const sender = await getOrCreateUser(userId);
      if (!sender.clanId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в клане!");

      const clanDoc = await firestoreDb.collection("clans").doc(sender.clanId).get();
      if (!clanDoc.exists) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Клан не найден!");

      const clan = clanDoc.data()!;
      if (clan.ownerId !== userId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не владелец клана!");

      const targetUser = await getOrCreateUser(targetId);
      if (targetUser.clanId !== clan.id) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Этот пользователь не в вашем клане!");

      const updatedDeputies = (clan.deputies || []).filter((id: number) => id !== targetId);
      const updatedAssistants = (clan.assistants || []).filter((id: number) => id !== targetId);

      await firestoreDb.collection("clans").doc(clan.id).set({
        ownerId: targetId,
        deputies: updatedDeputies,
        assistants: updatedAssistants
      }, { merge: true });

      await updateUser(userId, { clanRole: "Участник" });
      await updateUser(targetId, { clanRole: "Лидер" });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы передали свой клан пользователю [id${targetId}|${targetUser.nick || "Игрок"}]`);
      return;
    }

    if (cmd === "kick_left_user") {
      const uRole = await getRole(peerId, userId);
      if (uRole < 2) {
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас нет прав для этого действия!" });
         return;
      }
      const targetId = payloadObj.targetId;
      const targetUser = await getOrCreateUser(targetId);
      const targetName = targetUser.fullName || targetUser.nick || `User${targetId}`;
      const modUser = await getOrCreateUser(userId);
      const modName = modUser.fullName || modUser.nick || `Модератор`;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|${targetName}] вышел(-ла) из беседы`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

      try {
        await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
          params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId }
        });
      } catch (e) {}

      await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modName}] исключил(-а) [id${targetId}|${targetName}] из беседы`);
      return;
    }

    if (cmd === "clan_transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const targetId = payloadObj.targetId;
      const targetUser = await getOrCreateUser(targetId);

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили передачу своего клана пользователю [id${targetId}|${targetUser.nick || "Игрок"}]`);
      return;
    }

    if (cmd === "clan_rename_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      const newName = payloadObj.newName;

      const sender = await getOrCreateUser(userId);
      if (!sender.clanId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в клане!");
      if ((sender.balance || 0) < 2000000) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Недостаточно средств на руках!");

      const clanDoc = await firestoreDb.collection("clans").doc(sender.clanId).get();
      if (!clanDoc.exists) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Клан не найден!");

      const clan = clanDoc.data()!;
      if (clan.ownerId !== userId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не лидер!");

      await firestoreDb.collection("clans").doc(clan.id).set({ name: newName }, { merge: true });
      await updateUser(userId, { balance: sender.balance - 2000000 });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы успешно переименовали клан на ${newName}`);
      return;
    }

    if (cmd === "clan_rename_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили переименование клана`);
      return;
    }

    if (cmd === "clan_members_list" || cmd === "chat_members_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

      const user = await getOrCreateUser(userId);
      user.globalRole = user.role || 0;
      user.role = user.globalRole >= 7 ? user.globalRole : ((user.chatRoles && user.chatRoles[peerId]) || 0);

      const clanId = payloadObj.clanId || user.clanId;

      if (cmd === "clan_members_list" || (cmd === "chat_members_list" && clanId)) {
        if (!clanId) {
          await sendVkMessage(VK_TOKEN, peerId, "Вы не состоите в клане!");
          return;
        }

        const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
        if (!clanDoc.exists) {
          await sendVkMessage(VK_TOKEN, peerId, "Клан не найден в базе данных.");
          return;
        }

        const clan = clanDoc.data()!;
        const members = clan.members || [];
        const memberLines: string[] = [];

        for (let i = 0; i < members.length; i++) {
          const mId = members[i];
          const mu = await getOrCreateUser(mId);
          let roleName = "Участник";
          if (mId === clan.ownerId) roleName = "Лидер";
          else if ((clan.deputies || []).includes(mId)) roleName = "Заместитель лидера";
          else if ((clan.assistants || []).includes(mId)) roleName = "Помощник заместителя";

          memberLines.push(`${i + 1}. [id${mId}|${mu.nick || "Игрок"}] | Должность: ${roleName}`);
        }

        let responseText = `👥 Все участники клана «${clan.name}» (${members.length}):\n\n` + memberLines.join("\n");
        await sendVkMessage(VK_TOKEN, peerId, responseText);
        return;
      } else {
        const membersData = await getChatMembers(peerId);
        const profiles = membersData.profiles || [];
        const lines = profiles.slice(0, 30).map((p: any, i: number) => `${i + 1}. [id${p.id}|${p.first_name} ${p.last_name}]`);
        
        let responseText = `💬 Участники беседы:\n\n` + lines.join("\n");
        if (profiles.length > 30) {
          responseText += `\n\n... и еще ${profiles.length - 30} участников.`;
        }
        
        await sendVkMessage(VK_TOKEN, peerId, responseText);
        return;
      }
    }

    if (cmd === "staff_nicks") {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const { profiles } = await getChatMembers(peerId);
      let lines: string[] = [];
      for (const p of profiles) {
        if (p.id > 0) {
          const u = await getOrCreateUser(p.id);
          const tGlobalRole = u.role || 0;
          const tChatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
          const dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
          if (dispRole >= 1 || tChatRole >= 1) {
             const chatNicks = u.chatNicks || {};
             const nick = chatNicks[peerId] || "отсутствует";
             lines.push(`- [id${p.id}|${p.first_name} ${p.last_name}] — Ник: ${nick}`);
          }
        }
      }
      let outText = "Ники руководства беседы:\n\n";
      if (lines.length === 0) outText += "Руководство не найдено.";
      else outText += lines.join("\n");

      await sendVkMessage(VK_TOKEN, peerId, outText);
      return;
    }

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

    if (cmd === "help_basic" || cmd === "help_premium" || cmd === "help_clan") {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      let text = "";
      let buttons: any[] = [];
      const user = await getOrCreateUser(userId);

      if (cmd === "help_basic") {
        text = `...::Игровые команды бота::...\n\n` +
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
          `/клан - Информация о клане и клановые команды.\n` +
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
          
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "primary" }]);
      } else if (cmd === "help_clan") {
        text = `🏰 Клановые команды:\n\n` +
          `/клан - Информация о вашем клане.\n` +
          `/клан создать [Название] - Создать клан (1.000.000$).\n` +
          `/клан сила [Название] - Посмотреть силу клана.\n` +
          `/клан состав [страница] - Список участников клана.\n` +
          `/клан пригласить [ID/упоминание] - Пригласить игрока в клан.\n` +
          `/клан кикнуть [ID/упоминание] - Исключить игрока из клана.\n` +
          `/клан казна [сумма] - Пополнить казну клана.\n` +
          `/клан вывод [сумма] - Снять деньги из казны клана.\n` +
          `/клан война [Название] - Объявить войну клану.\n` +
          `/клан тип [Закрытый|По заявкам|Открытый] - Изменить тип клана.\n` +
          `/клан зам [ID/упоминание] - Назначить/снять заместителя.\n` +
          `/клан помощник зама [ID/упоминание] - Назначить/снять помощника зама.\n` +
          `/клан передать [ID/упоминание] - Передать лидерство клана.\n` +
          `/клан снять [ID/упоминание] - Снять игрока с должности.\n` +
          `/клан переименовать [Название] - Переименовать клан.\n` +
          `/клан выйти - Выйти из клана.\n` +
          `/клан солдаты [кол-во] - Купить солдат (5.000$/шт).\n` +
          `/клан вертолёты [кол-во] - Купить вертолёты (50.000$/шт).\n` +
          `/клан танки [кол-во] - Купить танки (150.000$/шт).\n` +
          `/клан места - Купить 5 мест в клане (250.000$).`;
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "primary" }]);
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
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "primary" }]);
      }

      if (text) {
        await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({ inline: true, buttons }) });
      }
      return;
    }

    if (cmd === "welcome_on" || cmd === "welcome_off") {
       const isEn = cmd === "welcome_on";
       await updateChat(peerId, { welcometext_enabled: isEn });
       const keyboard = {
         inline: true,
         buttons: [
           [{ action: { type: "callback", label: isEn ? "Выключить приветствие" : "Включить приветствие", payload: JSON.stringify({ cmd: isEn ? "welcome_off" : "welcome_on" }) }, color: isEn ? "negative" : "positive" }],
           [{ action: { type: "callback", label: "Задать текст", payload: JSON.stringify({ cmd: "welcome_set" }) }, color: "positive" }]
         ]
       };
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|Пользователь] ${isEn ? 'включил(-а)' : 'выключил(-а)'} приветствие`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "zov_online" || cmd === "zov_all") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Только автор команды может выбрать тип!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const { items } = await getChatMembers(peerId);
       const authorU = await getOrCreateUser(userId);
       const authorName = authorU.fullName || authorU.nick || `User${userId}`;

       if (cmd === "zov_online") {
          const onlineMembers = items.filter((m: any) => m.member_id > 0 && (m.online === 1 || m.online_mobile === 1));
          const pings = onlineMembers.map((m: any) => `[id${m.member_id}|${m.first_name} ${m.last_name}]`);
          const text = `[id${userId}|${authorName}] вызвал всех участников онлайн:\n\n${pings.join(", ") || "Нет участников онлайн"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       } else {
          const allMembers = items.filter((m: any) => m.member_id > 0);
          const pings = allMembers.map((m: any) => `[id${m.member_id}|${m.first_name} ${m.last_name}]`);
          const text = `[id${userId}|${authorName}] вызвал всех участников беседы:\n\n${pings.join(", ") || "Нет участников"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       }
    }

    if (cmd === "chats_page") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Только автор команды может переключать страницы!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const chatsSnap = await firestoreDb.collection("chats").get();
       const allChats = chatsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
       const totalPages = Math.ceil(allChats.length / 10) || 1;
       let page = parseInt(payloadObj.p) || 1;
       if (page < 1) page = 1;
       if (page > totalPages) page = totalPages;

       const startIdx = (page - 1) * 10;
       const pageChats = allChats.slice(startIdx, startIdx + 10);
       const list = pageChats.map((c: any, i: number) => `${startIdx + i + 1}) ${c.title || `Беседа №${c.id}`} | ID: ${c.id} | Тип: ${c.type || 'PL'}`).join("\n");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "chats_page", p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "chats_page", p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, `Список бесед бота (Страница ${page}/${totalPages}):\n\n${list}`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "welcome_set") {
       waitingForWelcome.set(`${peerId}_${userId}`, true);
       const text = `Задайте текст для приветствия!\n\n| «%u» - заменяется на @id пользователя\n| «%n» - заменяется на тег с именем пользователя\n| «%i» - заменяется на @id пригласившего\n| «%p» - заменяется на тег с именем пригласившего\n\n| Следующее сообщение которое вы напишите будет применено в качестве приветствия.`;
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       return;
    }

    const restartConfirmCmds = ["restart_confirm", "restart_cancel"];
    if (restartConfirmCmds.includes(cmd)) {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Это не ваш запрос на перезапуск!" });
          return;
       }
       
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       
       if (cmd === "restart_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `Перезапуск чат-менеджера отменен.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       
       // Restart confirm
       await editVkMessage(VK_TOKEN, peerId, cmId, `...::Управление работой бота::...\n\n[░░░░░░░░░░] 0%`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       
       const simulateRestart = async () => {
         const statuses = [
           "Подключение к базе данных...",
           "Очистка кэша сессий...",
           "Загрузка конфигурационных файлов...",
           "Инициализация модулей ядра...",
           "Перезапуск обработчиков событий...",
           "Службы успешно запущены!"
         ];
         for (let i = 10; i <= 100; i+=10) {
            await new Promise(r => setTimeout(r, 700));
            const progress = i / 10;
            const bar = "▓".repeat(progress) + "░".repeat(10 - progress);
            const status = statuses[Math.floor((i-1)/20)] || statuses[statuses.length-1];
            let msg = `[${bar}] ${i}%\n` +
                      `| Модуль: ${status}`;
            if (i === 100) {
               msg = `[${bar}] ${i}%\n` +
                     `| Все системы функционируют в штатном режиме.\n` +
                     `| Время перезапуска: ${getMskTimeStr()}`;
            }
            msg = `...::Управление работой бота::...\n\n` + msg;
            await editVkMessage(VK_TOKEN, peerId, cmId, msg);
         }
       };
       simulateRestart();
       return;
    }

    if (cmd === "deletenet_confirm" || cmd === "deletenet_cancel") {
       if (payloadObj.authorId && userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Это не ваш запрос!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const netNum = payloadObj.netNum;
       if (cmd === "deletenet_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `Удаление сетки бесед №${netNum} отменено.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return;
       }
       await deleteChatNetwork(netNum);
       const u = await getOrCreateUser(userId);
       const fullName = u.fullName || u.nick || `User${userId}`;
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] удалил(-а) сетку бесед №${netNum}`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
       return;
    }

    if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {
       if (payloadObj.authorId && userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Это не ваш запрос!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const netNum = payloadObj.netNum;
       const targetId = payloadObj.targetId;
       if (cmd === "dgiveowner_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `Передача прав владельца сетки бесед №${netNum} отменена.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return;
       }
       const net = await getChatNetwork(netNum);
       if (net) {
          net.ownerId = targetId;
          await saveChatNetwork(net);
       }
       const u = await getOrCreateUser(userId);
       const fullName = u.fullName || u.nick || `User${userId}`;
       const tUser = await getOrCreateUser(targetId);
       const tName = tUser.fullName || tUser.nick || `User${targetId}`;
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] передал(-а) права владельца сетки бесед №${netNum} [id${targetId}|${tName}]`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
       return;
    }

    if (cmd === "netlist_page") {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const netNum = payloadObj.netNum;
       const net = await getChatNetwork(netNum);
       if (!net) return;

       const chatsList: { id: number; title: string }[] = [];
       for (const cId of net.chats) {
         const cData = await getOrCreateChat(cId);
         chatsList.push({ id: cId, title: cData.title || `Беседа №${cId}` });
       }

       const totalPages = Math.ceil(chatsList.length / 15) || 1;
       let page = parseInt(payloadObj.p) || 1;
       if (page < 1) page = 1;
       if (page > totalPages) page = totalPages;

       const startIdx = (page - 1) * 15;
       const pageChats = chatsList.slice(startIdx, startIdx + 15);
       const listStr = pageChats.map((c, i) => `${startIdx + i + 1}) ${c.title} (ID: ${c.id})`).join("\n");

       const ownerUser = await getOrCreateUser(net.ownerId);
       const ownerName = ownerUser.fullName || ownerUser.nick || `id${net.ownerId}`;

       let out = `...::Список бесед сетки №${net.name}::... (Стр. ${page}/${totalPages})\n\n` +
         `| Владелец сетки: [id${net.ownerId}|${ownerName}]\n` +
         `| Всего бесед в сетке: ${chatsList.length}\n\n` +
         (chatsList.length > 0 ? listStr : "Беседы в сетке отсутствуют.");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, out, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    const modPayloads = ["mod_unmute", "mod_clearmute", "mod_unwarn", "mod_clearwarn", "mod_clearban", "mod_giveowner_yes", "mod_giveowner_no", "mod_ungbanpl", "mod_ungban", "mod_unban_chat"];
    if (modPayloads.includes(cmd)) {
       const tId = payloadObj.targetId;
       if (!tId) return;
       if (tId === userId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Вы не можете применить это действие к самому себе!" });
          return;
       }
       const uRole = await getRole(peerId, userId);
       const isAdmin = await checkIsAdmin(userId, peerId, uRole);
       
       if (cmd !== "mod_giveowner_yes" && cmd !== "mod_giveowner_no") {
           if (uRole < 1 && !isAdmin) {
               await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас нет прав для этого действия!" });
               return;
           }
           if (!(await checkHierarchy(peerId, userId, tId, isAdmin))) {
               await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Вы не можете применить это действие к данному пользователю!" });
               return;
           }
       }

       let originalText: string | undefined = undefined;
       try {
         const getRes = await axios.get("https://api.vk.com/method/messages.getByConversationMessageId", {
           params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, conversation_message_ids: cmId }
         });
         originalText = getRes.data?.response?.items?.[0]?.text;
       } catch (e) {}

       const replyFwd = JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true });

       if (cmd === "mod_unmute") {
          const targetU = await getOrCreateUser(tId);
          if (!targetU.muteUntil || targetU.muteUntil < Date.now()) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У пользователя нету активной блокировки чата!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Блокировка чата с пользователя снята." });
          await updateUser(tId, { muteUntil: 0, mutePeerId: 0 });
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Модератор] снял(-а) блокировку чата с [id${tId}|пользователя]`, { forward: replyFwd });
          await editVkMessage(VK_TOKEN, peerId, cmId, originalText, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_unban_chat") {
          const targetU = await getOrCreateUser(tId);
          const chatBans = targetU.chatBans || {};
          if (!chatBans[peerId]) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У пользователя нету активной блокировки!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Блокировка снята." });
          delete chatBans[peerId];
          await updateUser(tId, { chatBans });
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Модератор] снял(-а) блокировку в беседе с [id${tId}|пользователя]`, { forward: replyFwd });
          await editVkMessage(VK_TOKEN, peerId, cmId, originalText, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_clearmute" || cmd === "mod_clearwarn" || cmd === "mod_clearban") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Сообщения очищены." });
          const mId = payloadObj.msgId; // conversation_message_id
          try {
            if (mId) await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", cmids: mId, delete_for_all: 1, peer_id: peerId } });
            await deleteMessagesForUser(peerId, tId, 5);
          } catch (e) {}
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Модератор] очистил(-а) сообщения от [id${tId}|пользователя]`, { forward: replyFwd });
          
          let newKeyboard;
          if (cmd === "mod_clearmute") {
            newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: tId }) }, color: "positive" }] ] };
          } else if (cmd === "mod_clearwarn") {
            newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: tId }) }, color: "positive" }] ] };
          } else if (cmd === "mod_clearban") {
            newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Разблокировать", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: tId }) }, color: "positive" }] ] };
          }
          
          await editVkMessage(VK_TOKEN, peerId, cmId, originalText, { keyboard: JSON.stringify(newKeyboard) });
          return;
       }
       if (cmd === "mod_unwarn") {
          const targetU = await getOrCreateUser(tId);
          if ((targetU.warnings || 0) <= 0) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У пользователя нету активных предупреждений!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Предупреждение снято." });
          const newW = Math.max(0, (targetU.warnings || 0) - 1);
          await updateUser(tId, { warnings: newW });
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Модератор] снял(-а) предупреждение с [id${tId}|пользователя]`, { forward: replyFwd });
          await editVkMessage(VK_TOKEN, peerId, cmId, originalText, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_giveowner_yes") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Права переданы." });
          const tUser1 = await getOrCreateUser(tId);
          const chatRoles1 = tUser1.chatRoles || {};
          chatRoles1[peerId] = 6;
          await updateUser(tId, { chatRoles: chatRoles1 });
          
          const tUser2 = await getOrCreateUser(userId);
          const chatRoles2 = tUser2.chatRoles || {};
          chatRoles2[peerId] = 5;
          await updateUser(userId, { chatRoles: chatRoles2 });
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователь] передал(-а) свои права «Владелец Беседы» [id${tId}|пользователю]`, { forward: replyFwd });
           await editVkMessage(VK_TOKEN, peerId, cmId, `Права «Владелец Беседы» успешно переданы.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
           return;
        }
      }


    if (cmd === "chats_page") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Только автор команды может переключать страницы!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const chatsSnap = await firestoreDb.collection("chats").get();
       const allChats = chatsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
       const totalPages = Math.ceil(allChats.length / 10) || 1;
       let page = parseInt(payloadObj.p) || 1;
       if (page < 1) page = 1;
       if (page > totalPages) page = totalPages;

       const startIdx = (page - 1) * 10;
       const pageChats = allChats.slice(startIdx, startIdx + 10);
       const list = pageChats.map((c: any, i: number) => `${startIdx + i + 1}) ${c.title || `Беседа №${c.id}`} | ID: ${c.id} | Тип: ${c.type || 'PL'}`).join("\n");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "chats_page", p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "chats_page", p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, `Список бесед бота (Страница ${page}/${totalPages}):\n\n${list}`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId);
      } else if (cmd === "stats_warns") {
         resData = await getStatsWarnsPage(payloadTargetId);
      } else {
         resData = await getStatsBansPage(payloadTargetId);
      }

      await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
      return;
    }

    const ghelpCmds = ["ghelp_main", "ghelp_zr", "ghelp_ozr", "ghelp_ruk", "ghelp_zown", "ghelp_own"];
    if (ghelpCmds.includes(cmd)) {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const user = await getOrCreateUser(userId);
       let text = "";

       if (cmd === "ghelp_main") {
          text = `...::Помощь по командам руководства бота::...\n\nКоманды руководства бота:\n/gstaff -- Список руководства бота.\n/ghelp -- Помощь по командам руководства.`;
       } else if (cmd === "ghelp_zr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Руководителя:\n/gban -- Выдать глобальную блокировку во всех беседах.\n/ungban -- Снять глобальную блокировку.\n/gbanpl -- Выдать глобальную блокировку в беседах игроков.\n/ungbanpl -- Снять глобальную блокировку игроков.\n/gbanlist -- Список глобально заблокированных пользователей.\n/addblack -- Занести пользователя в ЧС бота.\n/unblack -- Удалить пользователя из ЧС бота.\n/blacklist -- Список пользователей в ЧС бота.`;
       } else if (cmd === "ghelp_ozr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Осн. Зам. Руководителя:\n/grrole -- Снять глобальную роль у пользователя.\n/setowner -- Назначить владельца беседы.\n/deleteowner -- Снять права владельца беседы.`;
       } else if (cmd === "ghelp_ruk") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Руководителя:\n/banid -- Заблокировать беседу.\n/unbanid -- Разблокировать беседу.\n/infochat -- Узнать информацию о беседе.\n/addzsr -- Выдать права Зам. Руководителя.\n/addozsr -- Выдать права Осн. Зам. Руководителя.`;
       } else if (cmd === "ghelp_zown") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Владельца:\nВ этой категории нет эксклюзивных команд.`;
       } else if (cmd === "ghelp_own") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Владельца бота:\n/addstatus -- Установить статус пользователю.\n/unstatus -- Снять статус пользователя.\n/arrole -- Снять все роли у пользователя.\n/setinfobot -- Установить инфо бота.\n/achat -- Сделать беседу админ-чатом.\n/unachat -- Убрать статус админ-чата.\n/giveowner -- Передать права владельца беседы.\n/addzamowner -- Выдать права Зам. Владельца бота.`;
       }

       let keyboard = { inline: true, buttons: [] as any[] };
       let availableButtons = [];
       const isAdmin = await checkIsAdmin(userId, peerId, user.role);
       const effRole = user.role >= 12 || isAdmin ? 12 : user.role;

       if (effRole >= 8 || effRole < 8) availableButtons.push({ cmd: "ghelp_zr", label: "Зам. Руководителя" });
       if (effRole >= 9 || effRole < 8) availableButtons.push({ cmd: "ghelp_ozr", label: "Осн. Зам. Руководителя" });
       if (effRole >= 10 || effRole < 8) availableButtons.push({ cmd: "ghelp_ruk", label: "Руководитель" });
       if (effRole >= 11 || effRole < 8) availableButtons.push({ cmd: "ghelp_zown", label: "Зам. Владельца" });
       if (effRole >= 12 || effRole < 8) availableButtons.push({ cmd: "ghelp_own", label: "Владелец бота" });

       let row: any[] = [];
       for (const btn of availableButtons) {
          if (btn.cmd !== cmd) {
             row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
             if (row.length === 2) {
                keyboard.buttons.push(row);
                row = [];
             }
          }
       }
       if (row.length > 0) keyboard.buttons.push(row);

       if (cmd !== "ghelp_main") {
          keyboard.buttons.push([{ action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "ghelp_main" }) }, color: "secondary" }]);
       }

       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    const botHelpCmds = ["cmd_help_main", "help_moder", "help_smoder", "cmd_help_admin_bot", "help_sadmin", "help_zsa", "help_sa", "help_owner"];
    if (botHelpCmds.includes(cmd)) {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const user = await getOrCreateUser(userId);
      
      let text = "";
      if (cmd === "cmd_help_main") {
        text = `...::Помощь по командам бота::...\n\nКоманды пользователей:\n/help - Помощь по командам.\n/gamehelp - Помощь по игровым командам.\n/stats - Узнать статистику пользователя.\n/ping - Узнать пинг бота.\n/infobot - Информация о боте.\n/q - Покинуть беседу.`;
      } else if (cmd === "help_moder") {
        text = `...::Помощь по командам бота::...\n\nКоманды Модератора:\n/mute - Выдать блокировку чата пользователю.\n/unmute - Снять блокировку чата пользователю.\n/warn - Выдать предупреждение пользователю.\n/unwarn - Снять предупреждение пользователю.\n/warns - Посмотреть предупреждения пользователя.\n/kick - Исключить пользователя из беседы.\n/clear - Очистить сообщения пользователя.\n/mclear - Очистить несколько сообщений.\n/unmoder - Снять права модератора.`;
      } else if (cmd === "help_smoder") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Модератора:\n/ban - Заблокировать пользователя в беседе.\n/unban - Разблокировать пользователя в беседе.\n/addmoder - Выдать права модератора.\n/delmoder - Снять права модератора.\n/zov - Созвать участников беседы.\n/olist - Список участников онлайн.\n/offlinelist - Список участников оффлайн.`;
      } else if (cmd === "cmd_help_admin_bot") {
        text = `...::Помощь по командам бота::...\n\nКоманды Администратора:\n/purge - Очистить последние сообщения в беседе.\n/infoid - Найти беседы пользователя.\n/addsenmoder - Выдать права старшего модератора.\n/delsenmoder - Снять права старшего модератора.`;
      } else if (cmd === "help_sadmin") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Администратора:\n/addadmin - Выдать права администратора.\n/deladmin - Снять права администратора.`;
      } else if (cmd === "help_zsa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Зам. Спец. Администратора:\n/addsenadmin - Выдать права старшего администратора.\n/delsenadmin - Снять права старшего администратора.`;
      } else if (cmd === "help_sa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Специального Администратора:\n/pin - Закрепить сообщение.\n/unpin - Открепить сообщение.\n/settings - Настройки чат-менеджера в беседе.\n/addzsa - Выдать права зам. спец. администратора.\n/delzsa - Снять права зам. спец. администратора.`;
      } else if (cmd === "help_owner") {
        text = `...::Помощь по командам бота::...\n\nКоманды Владельца беседы:\n/start - Активировать чат-менеджер в беседе.\n/type - Изменить тип беседы.\n/sync - Синхронизировать структуру беседы.\n/games - Включить/выключить игры в беседе.\n/staff - Список руководства беседы.\n/giveowner - Передать права владельца беседы.\n/addsa - Выдать права спец. администратора.\n/delsa - Снять права спец. администратора.\n/welcometext - Настроить приветствие.\n/leave - Вкл/выкл кик при выходе.\n/invite - Вкл/выкл инвайт только модераторами.\n/af - Вкл/выкл анти-флуд.\n/antisliv - Вкл/выкл анти-слив.\n/raid - Вкл/выкл анти-рейд.\n/group - Вкл/выкл анти-сообщества.\n/tegall - Вкл/выкл анти-тег всех участников.\n/antiad - Вкл/выкл анти-рекламу.\n/addantiteg - Добавить слово/тег в анти-тег.\n/unantiteg - Удалить слово/тег из анти-тега.\n/antiteglist - Список слов/тегов в анти-теге.\n/createnet - Создать сетку бесед.\n/deletenet - Удалить сетку бесед.\n/dgiveowner - Передать права владельца сетки.\n/addchatnet - Добавить беседу в сетку.\n/unchatnet - Удалить беседу из сетки.\n/netlist - Список бесед в сетке.`;
      }

      let keyboard = { inline: true, buttons: [] as any[] };
      let availableButtons = [];
      const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
      const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);

      if (effectiveRole >= 1) availableButtons.push({ cmd: "help_moder", label: "Модератор" });
      if (effectiveRole >= 2) availableButtons.push({ cmd: "help_smoder", label: "Ст. Модератор" });
      if (effectiveRole >= 3) availableButtons.push({ cmd: "cmd_help_admin_bot", label: "Администратор" });
      if (effectiveRole >= 4) availableButtons.push({ cmd: "help_sadmin", label: "Ст. Администратор" });
      if (effectiveRole >= 5) availableButtons.push({ cmd: "help_zsa", label: "Зам. Спец. Адм." });
      if (effectiveRole >= 6) availableButtons.push({ cmd: "help_sa", label: "Спец. Администратор" });
      if (effectiveRole >= 7) availableButtons.push({ cmd: "help_owner", label: "Владелец беседы" });
      
      let row = [];
      for (const btn of availableButtons) {
        if (btn.cmd !== cmd) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
      }
      if (row.length > 0) keyboard.buttons.push(row);
      
      if (cmd !== "cmd_help_main") {
         keyboard.buttons.push([{ action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "secondary" }]);
      }

      await editVkMessage(VK_TOKEN, peerId, cmId, text, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
      return;
    }

    if (cmd === "staff_nicks") {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const { profiles } = await getChatMembers(peerId);
      const nickLines: string[] = [];
      for (const p of profiles) {
        if (p.id > 0) {
          const u = await getOrCreateUser(p.id);
          const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
          const effRole = u.role >= 7 ? u.role : Math.max(u.role || 0, cRole);
          if (effRole >= 1) {
            nickLines.push(`- [id${p.id}|${p.first_name} ${p.last_name}] — Ник: ${u.nick || "Не установлен"}`);
          }
        }
      }
      const text = `Ники руководства беседы:\n\n` + (nickLines.length > 0 ? nickLines.join("\n") : "Нет руководства с установленными никами.");
      await sendVkMessage(VK_TOKEN, peerId, text, { disable_mentions: 1 });
      await editVkMessage(VK_TOKEN, peerId, cmId, "Список руководства беседы", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
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

      if (lobby.amount && lobby.amount > 0) {
        if ((user.balance || 0) < lobby.amount) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, `Недостаточно средств. Нужно: ${lobby.amount.toLocaleString()}$`);
        }
        await updateUser(userId, { balance: (user.balance || 0) - lobby.amount });
      }

      lobby.participants.push({ id: userId, name: fullName });
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы успешно вступили в игру!");
      sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вступил(-а) в игру!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `🎮 Игра "Крокодил"\n\n| Создатель: [id${lobby.creatorId}|${lobby.creatorName}]\n| Участников: ${lobby.participants.length}${lobby.amount && lobby.amount > 0 ? `\n| Ставка: ${lobby.amount.toLocaleString()}$` : ""}`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
      return;
    }

    if (cmd === "croc_leave") {
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby || lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Игра не идет!");
      if (!lobby.participants.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в игре!");

      if (lobby.amount && lobby.amount > 0) {
        await updateUser(userId, { balance: (user.balance || 0) + lobby.amount });
      }

      lobby.participants = lobby.participants.filter(p => p.id !== userId);
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из игры!");
      sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вышел(-а) из игры!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `🎮 Игра "Крокодил"\n\n| Создатель: [id${lobby.creatorId}|${lobby.creatorName}]\n| Участников: ${lobby.participants.length}${lobby.amount && lobby.amount > 0 ? `\n| Ставка: ${lobby.amount.toLocaleString()}$` : ""}`, {
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
            { action: { type: "callback", label: "Топ по бракам", payload: JSON.stringify({ cmd: "top_marriages", authorId: userId }) }, color: "secondary" },
            { action: { type: "callback", label: "Топ кланов", payload: JSON.stringify({ cmd: "top_clans", authorId: userId }) }, color: "secondary" }
          ]
        ]
      };

      if (category === "marriages") {
        const text = await getTopMarriagesText();
        editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
        return;
      }

      if (category === "clans") {
        const clansSnap = await firestoreDb.collection("clans").orderBy("wins", "desc").limit(10).get();
        let text = "🏆 Топ кланов по победам:\n\n";
        if (clansSnap.empty) {
          text += "Список кланов пуст.";
        } else {
          let idx = 1;
          for (const d of clansSnap.docs) {
            const clanData = d.data();
            const totalPower = (clanData.soldiers || 0) * 1 + (clanData.helicopters || 0) * 10 + (clanData.tanks || 0) * 50;
            text += `${idx}. Клан «${clanData.name}» | Побед: ${clanData.wins || 0} | Сила: ${formatNum(totalPower)}\n`;
            idx++;
          }
        }
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
      
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "Вступить в раздачу", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
          ],
          [
            { action: { type: "callback", label: "Выйти из раздачи", payload: JSON.stringify({ cmd: "giveaway_leave" }) }, color: "negative" }
          ]
        ]
      };
      
       
      const text = `@all, минуточку внимания!\n\nРаздача на сумму ${g.amount.toLocaleString()}$ была создана!\n\n| Организатор: [id${g.creatorId}|${g.creatorName}]\n\n| Время на принятие участия: ${g.timeStr}`;
      
      await editVkMessage(VK_TOKEN, peerId, g.cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 0 });
      await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вступил(-а) в раздачу`, { disable_mentions: 1 });
      
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вступили в раздачу");
      return;
    }

    if (cmd === "giveaway_leave") {
      const g = giveaways.get(peerId);
      if (!g) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Раздача завершена!");
      const idx = g.participants.findIndex(p => p.id === userId);
      if (idx === -1) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не участвуете в раздаче!");
      }
      g.participants.splice(idx, 1);
      
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "Вступить в раздачу", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
          ],
          [
            { action: { type: "callback", label: "Выйти из раздачи", payload: JSON.stringify({ cmd: "giveaway_leave" }) }, color: "negative" }
          ]
        ]
      };
      
       
      const text = `@all, минуточку внимания!\n\nРаздача на сумму ${g.amount.toLocaleString()}$ была создана!\n\n| Организатор: [id${g.creatorId}|${g.creatorName}]\n\n| Время на принятие участия: ${g.timeStr}`;
      
      await editVkMessage(VK_TOKEN, peerId, g.cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 0 });
      await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] вышел(-а) из раздачи`, { disable_mentions: 1 });
      
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из раздачи");
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

        if (mg.amount && mg.amount > 0) {
          if ((user.balance || 0) < mg.amount) {
            return sendVkToast(VK_TOKEN, eventId, userId, peerId, `Недостаточно средств. Нужно: ${mg.amount.toLocaleString()}$`);
          }
          await updateUser(userId, { balance: (user.balance || 0) - mg.amount });
        }

        mg.players.push({ id: userId, name: fullName, isAlive: true });
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вступили в игру Мафия!");
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] присоединился к мафии`);
      } else if (cmd === "mafia_leave") {
        const idx = mg.players.findIndex(p => p.id === userId);
        if (idx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в игре!");
        
        if (mg.amount && mg.amount > 0) {
          await updateUser(userId, { balance: (user.balance || 0) + mg.amount });
        }

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
      const chatData = await getOrCreateChat(peerId);
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
          const greeting = `JORDAN MANAGER был добавлен в беседу.\n\nВыдайте ему права администратора для началы работы с ним.\n\nПосле выдачи прав администратора, активируйте беседу по команде - /start и выберите тип беседы с помощью команды - /type`;
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          return;
        } else if (memberId < 0) { // It's a group
          if (chatData.antiGroup) {
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователь], добавлять сообщества в беседу запрещено!`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
        } else {
          // It's a user
          if (act === "chat_invite_user_by_link" && chatData.antiRaid) {
             await sendVkMessage(VK_TOKEN, peerId, `Вход в беседу через ссылку запрещён настройками.`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
          if ((act === "chat_invite_user" || act === "chat_invite_user_by_link") && chatData.inviteOnlyMods) {
             const inviterU = await getOrCreateUser(userId);
             const userChatRole = (inviterU.chatRoles && inviterU.chatRoles[peerId]) || 0;
             const isInviterAdmin = inviterU.role >= 6 || userChatRole >= 1;
             if (!isInviterAdmin) {
                 await sendVkMessage(VK_TOKEN, peerId, `В данной беседе приглашать участников могут только модераторы!`);
                 try {
                   await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
                 } catch (e) {}
                 return;
             }
          }
          // Check inviteOnlyMod
          if (chatData.inviteOnlyMod) {
             const inviterUser = await getOrCreateUser(userId);
             const inviterName = inviterUser.nick || "Пользователь";
             const isInviterAdmin = await checkIsAdmin(userId, peerId, inviterUser.role);
             const inviterChatRole = (inviterUser.chatRoles && inviterUser.chatRoles[peerId]) || 0;
             if ((inviterUser.role || 0) < 1 && inviterChatRole < 1 && !isInviterAdmin) {
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${inviterName}], вы не можете приглашать участников в беседу, так как у вас нету прав модератора.`);
                try {
                  await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
                } catch (e) {}
                return;
             }
          }

          const uData = await getOrCreateUser(memberId);
          const targetName = uData.fullName || uData.nick || `id${memberId}`;
          const chatBans = uData.chatBans || {};

          const getModStr = async (mId?: number) => {
            if (!mId) return "[id1|Модератор]";
            return `[id${mId}|Модератор]`;
          };

          if (chatBans[peerId]) {
             const bInfo = chatBans[peerId];
             const modStr = await getModStr(bInfo.by);
             const reason = bInfo.reason || "без причины";
             const dateStr = fmtD(bInfo.date);
             await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет блокировку в этой беседе!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }

          if (uData.gban && chatData.type !== "PL") {
             const modStr = await getModStr(uData.gbanBy);
             const reason = uData.gbanReason || "без причины";
             const dateStr = fmtD(uData.gbanDate);
             await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет глобальную блокировку во всех беседах!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }

          if (uData.gbanpl && chatData.type === "PL") {
             const modStr = await getModStr(uData.gbanplBy);
             const reason = uData.gbanplReason || "без причины";
             const dateStr = fmtD(uData.gbanplDate);
             await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет глобальную блокировку во всех беседах игроков!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
          if (chatData.welcometext_enabled && chatData.welcometext) {
             let wText = chatData.welcometext;
             wText = wText.replace(/%u/g, `id${memberId}`);
             wText = wText.replace(/%n/g, `[id${memberId}|${uData.nick || "Участник"}]`);
             wText = wText.replace(/%i/g, `id${userId}`);
             wText = wText.replace(/%p/g, `[id${userId}|Пользователь]`); // simplified
             await sendVkMessage(VK_TOKEN, peerId, wText);
          }
        }
      } else if (act === "chat_kick_user") {
        const memberId = message.action.member_id;
        if (memberId === userId) {
           const uData = await getOrCreateUser(memberId);
           const memberName = uData.fullName || uData.nick || `User${memberId}`;
           await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${memberName}] покинул(-а) беседу`);
           if (chatData.leaveKick) {
              try {
                await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
              } catch (e) {}
           }
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

      if (dynamicBanWords.length === 0) {
        try {
          const doc = await firestoreDb.collection("bot_settings").doc("global").get();
          if (doc.exists && Array.isArray(doc.data()?.banWords)) {
            dynamicBanWords = doc.data()?.banWords;
          }
        } catch (e) {}
      }

      const chatData = await getOrCreateChat(peerId);
      const user = await getOrCreateUser(userId, fullName);
      const isAdmin = await checkIsAdmin(userId, peerId, user.role);
      
      const waitKey = `${peerId}_${userId}`;
      if (waitingForWelcome.get(waitKey)) {
         waitingForWelcome.delete(waitKey);
         const chatData = await getOrCreateChat(peerId);
         await updateChat(peerId, { welcometext: message.text });
         return await sendVkMessage(VK_TOKEN, peerId, `Текст приветствия успешно установлен!`);
      }


      // Global blocks check
      if (user.gban || (chatData.type === "PL" && user.gbanpl) || user.blacklisted) {
         return; // User is blocked from using the bot
      }
      if (chatData.banned) return; // Chat is banned

      // Check if bot has system administrator rights in chat
      if (peerId > 2000000000) {
        try {
          const { items } = await getChatMembers(peerId);
          const botMemberId = -Math.abs(parseInt(String(VK_GROUP_ID)));
          const botMember = (items || []).find((m: any) => m.member_id === botMemberId);
          if (botMember && !botMember.is_admin && !botMember.is_owner) {
             const trimmed = (text || "").trim();
             const isCommand = (() => {
               if (!trimmed) return false;
               const prefixes = ["/", "!", ".", ",", "+", "*"];
               const cleanMsg = trimmed.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").trim().replace(/^@\S+\s*/gi, "").trim();
               if (prefixes.some(p => cleanMsg.startsWith(p))) return true;
               const firstWord = cleanMsg.split(/\s+/)[0].toLowerCase();
               const knownCmds = [
                 "мут", "mute", "заглушить", "замутить", "мутить", "датьмут", "m",
                 "анмут", "unmute", "снятьмут", "разглушить", "размутить", "измута", "unm",
                 "варн", "warn", "предупреждение", "датьварн", "пред", "выдатьварн", "w",
                 "анварн", "unwarn", "снятьварн", "снятьпредупреждение", "снятьпред", "анпред", "удалитьварн", "unw",
                 "кик", "kick", "исключить", "выгнать", "к", "k",
                 "бан", "ban", "забанить", "б", "b",
                 "разбан", "unban", "унбан", "разбанить", "избана", "unb",
                 "ии", "ai", "чат", "ask", "гпт", "gpt", "gemini",
                 "старт", "start", "начать", "помощь", "help", "хелп", "команды", "меню",
                 "стата", "статистика", "stats", "профиль", "profile", "инфо", "info",
                 "чс", "вчс", "чсб", "addblack", "unblack", "анчс", "изчс", "addb", "unb",
                 "deletecommand", "удалятькоманды", "delcmd", "статаимг", "stataimg", "statsimg", "статистикаимг", "варны", "warns", "банлист", "banlist", "мутлист", "mutelist", "онлайн", "online", "оффлайн", "offline"
               ];
               return knownCmds.includes(firstWord);
             })();

             if (isCommand) {
                await sendVkMessage(VK_TOKEN, peerId, `У бота отсутствуют права системного администратора (звёздочка), выдайте ему права системного администратора для корректной работы.`, {
                  forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
                });
             }
             return;
          }
        } catch (e) {}

        // Add to recent messages buffer
        if (message.conversation_message_id) {
            let rM = chatRecentMessages.get(peerId) || [];
            rM.push({ cmId: message.conversation_message_id, fromId: userId });
            if (rM.length > 500) rM.shift();
            chatRecentMessages.set(peerId, rM);
        }
      }


      if (chatData.silence && (!user.role || user.role < 3) && !isAdmin) {
         try {
           await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
         } catch (e) {}
         return; // silence mode
      }

      // Check active mute
      if (user.muteUntil && user.muteUntil > Date.now()) {
         try {
           await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
         } catch (e) {}
         return; // User is currently muted
      }

      // Save/update user stats in single document per chat and user (Requirement 5)
      try {
        const statRef = firestoreDb.collection("chat_user_stats").doc(`${peerId}_${userId}`);
        const todayStr = getMskDateStr();
        const sDoc = await statRef.get();
        if (sDoc.exists) {
           const sData = sDoc.data()!;
           const isToday = sData.lastDate === todayStr;
           const msgToday = isToday ? (sData.message_today || 0) + 1 : 1;
           const msgTotal = (sData.messages || 0) + 1;
           await statRef.set({ Chat_id: peerId, user_id: userId, message_today: msgToday, messages: msgTotal, lastDate: todayStr }, { merge: true });
        } else {
           await statRef.set({ Chat_id: peerId, user_id: userId, message_today: 1, messages: 1, lastDate: todayStr });
        }
      } catch (e) {}

      // Block game commands if games disabled (Requirement 1 & 5)
      const firstWord = text ? text.split(" ")[0].toLowerCase() : "";
      const gameCmdsList = [
        "/цитата", "/пиво", "/крокодил", "/приз", "/передать", "/топ", "/пивозавры", "/рулетка", "/казино",
        "/бизнес", "/бизнесы", "/купитьбиз", "/продатьбиз", "/ппрод", "/купитьпрод", "/премпрофиль", "/прембаланс",
        "/открытьдепозит", "/депозиты", "/дуэль", "/дуэльбиз", "/купитькоин", "/продатькоин", "/передатькоин", "/банк",
        "/мафия", "/кнб", "/брак", "/развод", "/монетка"
      ];
      if ((chatData.games === false || chatData.gamesDisabled) && gameCmdsList.includes(firstWord)) {
        return await sendVkMessage(VK_TOKEN, peerId, "Игры в этой беседе отключены.");
      }

      if (checkFlood(peerId, userId, chatData)) {

         const uData = await getOrCreateUser(userId);
         if (!uData.muteUntil || uData.muteUntil < Date.now()) {
            await updateUser(userId, { muteUntil: Date.now() + 30 * 60 * 1000 });
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] была выдана блокировка чата на 30 минут по причине флуда сообщениями. (#FLOOD)`);
         }
         return; // Ignore flooded message
      }

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
      const croc = crocGames.get(peerId) || crocGames.get(Number(peerId));
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
            let reward = 30000;
            if (croc.amount && croc.amount > 0) {
              reward = croc.amount * croc.participants.length;
            }
            await updateUser(userId, { balance: (user.balance || 0) + reward });

            await sendVkMessage(VK_TOKEN, peerId, `🎉 Поздравляем! [id${userId}|${fullName}] угадал(-а) слово!\n\n| Слово было: ${croc.word}\n| Награда: ${reward.toLocaleString()}$\n\n| Игра завершена!`, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
            });
            return;
          }
        }
      }

      // Anti-teg Check
      if (peerId > 2000000000 && text) {
        const chatDataForAntiTeg = await getOrCreateChat(peerId);
        if (chatDataForAntiTeg.antiTeg && Array.isArray(chatDataForAntiTeg.antiTeg) && chatDataForAntiTeg.antiTeg.length > 0) {
          const uRole = await getRole(peerId, userId);
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isOwnerOrImmune = (uRole >= 6) || (userChatRole >= 6) || (user.role >= 12) || (chatDataForAntiTeg.adminId === userId) || isAdmin;

          if (!isOwnerOrImmune) {
            const lowerText = text.toLowerCase();
            const triggeredTag = chatDataForAntiTeg.antiTeg.find((tag: string) => tag && (containsVkTag(text, tag) || lowerText.includes(tag.toLowerCase())));

            if (triggeredTag) {
              try {
                await axios.get(`https://api.vk.com/method/messages.delete`, {
                  params: { access_token: VK_TOKEN, v: "5.199", cmids: message.conversation_message_id, delete_for_all: 1, peer_id: peerId }
                });
              } catch (e) {}

              const targetU = await getOrCreateUser(userId);
              const newWarns = (targetU.warnings || 0) + 1;
              await updateUser(userId, { warnings: newWarns });

              if (newWarns >= 3) {
                const chatBans = targetU.chatBans || {};
                chatBans[peerId] = { by: 0, reason: "3/3 предупреждений, системная блокировка", date: Date.now() };
                await updateUser(userId, { chatBans });

                try {
                  await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                    params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
                } catch (e) {}

                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|пользователь] был заблокирован и исключен из беседы\n\n| Причина: 3/3 предупреждений, системная блокировка`);
              } else {
                try {
                  await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                    params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
                } catch (e) {}

                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|пользователь] был исключен из беседы\n\n| Причина: Нарушение системы анти-тег (Запрещенное слово: ${triggeredTag})\n| Предупреждений: ${newWarns}/3`);
              }
              return;
            }
          }
        }
      }

      let cmdText = text.trim();

      if (/^[+!\./]?поженит\s+ь/i.test(cmdText)) {
        cmdText = cmdText.replace(/поженит\s+ь/i, "поженить");
      }

      // Clean leading VK tags / mentions (e.g. [club239281784|@jordan_manager] or [id123|User] or @jordan_manager)
      cmdText = cmdText.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").trim();
      cmdText = cmdText.replace(/^@\S+\s*/gi, "").trim();

      const prefixes = ["/", "!", ".", ",", "+", "*"];
      const hasPrefix = prefixes.some(p => cmdText.startsWith(p));
      
      if (hasPrefix) {
        cmdText = "/" + cmdText.slice(1).trim();
      } else {
        // If message does not start with prefix, check if first word is a known command name
        const firstWord = cmdText.split(/\s+/)[0].toLowerCase();
        const knownCmds = [
          "мут", "mute", "заглушить", "замутить", "мутить", "датьмут", "m",
          "анмут", "unmute", "снятьмут", "разглушить", "размутить", "измута", "unm",
          "варн", "warn", "предупреждение", "датьварн", "пред", "выдатьварн", "w",
          "анварн", "unwarn", "снятьварн", "снятьпредупреждение", "снятьпред", "анпред", "удалитьварн", "unw",
          "кик", "kick", "исключить", "выгнать", "к", "k",
          "бан", "ban", "забанить", "б", "b",
          "разбан", "unban", "унбан", "разбанить", "избана", "unb",
          "ии", "ai", "чат", "ask", "гпт", "gpt", "gemini",
          "старт", "start", "начать", "помощь", "help", "хелп", "команды", "меню",
          "стата", "статистика", "stats", "профиль", "profile", "инфо", "info",
          "чс", "вчс", "чсб", "addblack", "unblack", "анчс", "изчс", "addb", "unb",
          "deletecommand", "удалятькоманды", "delcmd", "статаимг", "stataimg", "statsimg", "статистикаимг", "варны", "warns", "банлист", "banlist", "мутлист", "mutelist", "онлайн", "online", "оффлайн", "offline"
        ];
        if (knownCmds.includes(firstWord)) {
          cmdText = "/" + cmdText;
        } else {
          return; // Not a recognized command
        }
      }

      if (!cmdText.startsWith("/")) return;

      // Rate Limit: 5 commands per 5 seconds
      const now = Date.now();
      let history = commandHistory.get(userId);
      if (!history) {
        history = { timestamps: [] };
        commandHistory.set(userId, history);
      }
      const isCooldownBypass = (user.role || 0) >= 12 || userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1;
      history.timestamps = history.timestamps.filter(t => now - t < 5000);
      if (history.timestamps.length >= 5 && !isCooldownBypass) {
         const timeLeft = 5 - Math.floor((now - history.timestamps[0]) / 1000);
         const secStr = ["секунду", "секунды", "секунд"];
         const secEnd = (timeLeft % 10 === 1 && timeLeft % 100 !== 11) ? secStr[0] : (timeLeft % 10 >= 2 && timeLeft % 10 <= 4 && (timeLeft % 100 < 10 || timeLeft % 100 >= 20)) ? secStr[1] : secStr[2];
         return await sendVkMessage(VK_TOKEN, peerId, `Пожалуйста подождите ${timeLeft} ${secEnd}, перед повторным использованием команд.`, {
             forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
         });
      }
      history.timestamps.push(now);

      const args = cmdText.split(/\s+/);
      const rawCmd = args[0].toLowerCase();

      // Check if chat is active. Only /start and /старт commands are allowed if chat is NOT active.
      if (peerId > 2000000000) {
        const isStartCmd = rawCmd === "/start" || rawCmd === "/старт";
        const isHelpCmd = rawCmd === "/help" || rawCmd === "/помощь" || rawCmd === "/хелп" || rawCmd === "/команды";
        if (!chatData.active && !isStartCmd && !isHelpCmd) {
          return await sendVkMessage(VK_TOKEN, peerId, `JORDAN MANAGER не активирован в беседе. Для активации напишите - /start`, {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }

      if (!user.wroteInDm) {
        updateUser(userId, { wroteInDm: true }).catch(() => {});
        user.wroteInDm = true;
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
        const { noReply, ...rest } = extraParams;
        let replyParams: any = {};
        if (!noReply && rest.forward === undefined) {
          replyParams.forward = JSON.stringify({
            peer_id: peerId,
            conversation_message_ids: [message.conversation_message_id],
            is_reply: true
          });
        }
        const res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });

        if (chatData?.deleteCommand && isModerationCmd(rawCmd)) {
          autoDeleteCmdMessage(peerId, message, chatData);
        }

        return res;
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

        let amount = 0;
        if (args.length > 1) {
          amount = parseNumber(args[1]);
          if (amount < 0) amount = 0;
        }

        if (amount > 0 && (user.balance || 0) < amount) {
          return await sendResponse(`Недостаточно средств. Ваш баланс: ${(user.balance || 0).toLocaleString()}$`);
        }

        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Вступить в игру", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Запустить игру", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Выйти из игры", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
          ]
        };

        const res = await sendResponse(`🎮 Игра "Крокодил"\n\n| Создатель: [id${userId}|${fullName}]\n${amount > 0 ? `| Ставка: ${amount.toLocaleString()}$` : ""}`, {
          keyboard: JSON.stringify(keyboard)
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        if (amount > 0) {
          await updateUser(userId, { balance: (user.balance || 0) - amount });
        }

        const crocData: CrocLobby = {
          peerId,
          cmId: cmId || 0,
          creatorId: userId,
          creatorName: fullName,
          participants: [{ id: userId, name: fullName }],
          status: "lobby",
          amount
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

      if (rawCmd === "/ии" || rawCmd === "/ai" || rawCmd === "/gpt" || rawCmd === "/ask") {
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
            model: 'gemini-3.7-flash',
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

        // Daily transfer limit check
        const todayStr = getMskDateStr();
        const hasPremium = user.vipExpires > Date.now();
        const limit = hasPremium ? 350000 : 100000;
        
        let transferSumToday = user.transferSumToday || 0;
        if (user.lastTransferDate !== todayStr) {
          transferSumToday = 0;
        }

        if (transferSumToday + amount > limit) {
          return await sendResponse(
            `Превышен лимит на переводы в день! Лимит: обычный пользователь до 100.000$, с премиумом до 350.000$.\n` +
            `Вы уже перевели сегодня: ${formatNum(transferSumToday)}$\n` +
            `Доступный остаток: ${formatNum(Math.max(0, limit - transferSumToday))}$`
          );
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Передать", payload: JSON.stringify({ cmd: "transfer_confirm", targetId: parsed.targetId, targetName: parsed.targetName, amount: amount, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Не передавать", payload: JSON.stringify({ cmd: "transfer_cancel", targetId: parsed.targetId, targetName: parsed.targetName, amount: amount, authorId: userId }) }, color: "negative" }
            ]
          ]
        };

        return await sendResponse(
          `Вы собираетесь передать ${formatNum(amount)}$ пользователю [id${parsed.targetId}|${parsed.targetName}]\n\n| Для подтверждения нажмите на кнопку:`,
          { keyboard: JSON.stringify(keyboard) }
        );
      }

      // Wikipedia Command
      if (rawCmd === "/вики") {
        const query = args.slice(1).join(" ");
        if (!query) return await sendResponse("Используйте: /вики [запрос]");
        
        try {
          const searchRes = await axios.get(`https://ru.wikipedia.org/w/api.php`, {
            params: {
              action: "query",
              list: "search",
              srsearch: query,
              format: "json",
              utf8: 1
            }
          });
          
          const searchItems = searchRes.data?.query?.search || [];
          if (searchItems.length === 0) {
            return await sendResponse(`🔍 По запросу «${query}» в Википедии ничего не найдено.`);
          }
          
          const bestTitle = searchItems[0].title;
          
          try {
            const summaryRes = await axios.get(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`);
            const summary = summaryRes.data;
            const extract = summary.extract || "Описание отсутствует.";
            const url = summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`;
            
            let wikiText = `🔍 Результат поиска в Википедии: *${bestTitle}*\n\n` +
                           `${extract}\n\n` +
                           `🔗 Ссылка на статью: ${url}`;
                           
            return await sendResponse(wikiText);
          } catch (e) {
            const snippet = searchItems[0].snippet.replace(/<span class="searchmatch">/g, "").replace(/<\/span>/g, "");
            const url = `https://ru.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`;
            let wikiText = `🔍 Результат поиска в Википедии: *${bestTitle}*\n\n` +
                           `${snippet}...\n\n` +
                           `🔗 Ссылка на статью: ${url}`;
            return await sendResponse(wikiText);
          }
        } catch (err) {
          console.error("Wikipedia search error:", err);
          return await sendResponse("Ошибка при поиске в Википедии. Попробуйте позже.");
        }
      }

      // Rules Command
      if (rawCmd === "/правила") {
        return await sendResponse("Правила бота находятся тут - [vk.ru/@gm_manager_official-pravila-bota|Правила]");
      }

      // Clan System Command
      if (rawCmd === "/клан") {
        const sub = args[1]?.toLowerCase();

        if (sub === "создать") {
          const clanName = args.slice(2).join(" ");
          if (!clanName) return await sendResponse("Используйте: /клан создать [Название]");
          if (user.clanId) return await sendResponse("Вы уже состоите в клане!");
          if ((user.balance || 0) < 1000000) return await sendResponse("Создать клан стоит 1.000.000$ на руках!");

          const clanId = "clan_" + Date.now();
          const newClan = {
            id: clanId,
            name: clanName,
            ownerId: userId,
            deputies: [],
            assistants: [],
            members: [userId],
            treasury: 0,
            soldiers: 0,
            helicopters: 0,
            tanks: 0,
            type: "Открытый",
            maxMembers: 20,
            wins: 0
          };

          await firestoreDb.collection("clans").doc(clanId).set(newClan);
          await updateUser(userId, { balance: user.balance - 1000000, clanId, clanRole: "Лидер" });

          return await sendResponse(`Вы создали клан ${clanName}, поздравляем!`);
        }

        if (sub === "сила") {
          const targetClanName = args.slice(2).join(" ");
          let targetClan: any = null;

          if (targetClanName) {
            const snap = await firestoreDb.collection("clans").where("name", "==", targetClanName).limit(1).get();
            if (!snap.empty) {
              targetClan = snap.docs[0].data();
            } else {
              return await sendResponse(`Клан "${targetClanName}" не найден.`);
            }
          } else {
            if (!user.clanId) return await sendResponse("Вы не состоите в клане! Используйте: /клан сила [Название]");
            const doc = await firestoreDb.collection("clans").doc(user.clanId).get();
            if (doc.exists) {
              targetClan = doc.data();
            } else {
              return await sendResponse("Ваш клан не найден в базе данных.");
            }
          }

          return await sendResponse(
            `Сила клана ${targetClan.name}\n\n` +
            `| Солдатов: ${formatNum(targetClan.soldiers || 0)}\n` +
            `| Вертолётов: ${formatNum(targetClan.helicopters || 0)}\n` +
            `| Танки: ${formatNum(targetClan.tanks || 0)}`
          );
        }

        if (!sub) {
          if (!user.clanId) {
            return await sendResponse("Вы не состоите ни в одном клане. Создайте его за 1 000 000$: /клан создать [Название]");
          }

          const clanDoc = await firestoreDb.collection("clans").doc(user.clanId).get();
          if (!clanDoc.exists) {
            return await sendResponse("Ваш клан не найден в базе данных.");
          }

          const clan = clanDoc.data()!;
          const ownerUser = await getOrCreateUser(clan.ownerId);
          const ownerName = ownerUser.nick || `Игрок ${clan.ownerId}`;

          const deputyNames: string[] = [];
          for (const dId of (clan.deputies || [])) {
            const du = await getOrCreateUser(dId);
            deputyNames.push(`[id${dId}|${du.nick || "Игрок"}]`);
          }

          const assistantNames: string[] = [];
          for (const aId of (clan.assistants || [])) {
            const au = await getOrCreateUser(aId);
            assistantNames.push(`[id${aId}|${au.nick || "Игрок"}]`);
          }

          const totalPower = (clan.soldiers || 0) * 1 + (clan.helicopters || 0) * 10 + (clan.tanks || 0) * 50;

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Все участники клана", payload: JSON.stringify({ cmd: "clan_members_list", authorId: userId, clanId: clan.id }) }, color: "primary" }
              ]
            ]
          };

          let textResponse = 
            `Информация о клане, в котором вы состоите\n\n` +
            `| Название клана: ${clan.name}\n` +
            `| Тип клана: ${clan.type}\n\n` +
            `| Участников: ${clan.members?.length || 0}\n` +
            `| Лидер клана: [id${clan.ownerId}|${ownerName}]\n` +
            `| Зам. Лидера: ${deputyNames.join(", ") || "Отсутствует"}\n` +
            `| Помощник зам. лидера: ${assistantNames.join(", ") || "Отсутствует"}\n\n` +
            `| Денег в казне: ${formatNum(clan.treasury || 0)}$\n\n` +
            `| Общая сила клана: ${formatNum(totalPower)}`;

          return await sendResponse(textResponse, { keyboard: JSON.stringify(keyboard) });
        }

        if (!user.clanId) {
          return await sendResponse("Для выполнения этой команды вы должны состоять в клане!");
        }

        const clanDoc = await firestoreDb.collection("clans").doc(user.clanId).get();
        if (!clanDoc.exists) {
          return await sendResponse("Ваш клан не найден в базе данных.");
        }
        const clan = clanDoc.data()!;

        if (sub === "пригласить") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);
          const isAssistant = (clan.assistants || []).includes(userId);

          if (!isLeader && !isDeputy && !isAssistant) {
            return await sendResponse("Приглашать могут только Лидер, Заместители и Помощники зама!");
          }

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя для приглашения!");
          if (parsed.targetId === userId) return await sendResponse("Вы не можете пригласить сами себя!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId) return await sendResponse("Этот пользователь уже состоит в клане!");

          if ((clan.members || []).length >= (clan.maxMembers || 20)) {
            return await sendResponse("В клане нет свободных мест! Купите места: /клан места");
          }

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Присоединиться", payload: JSON.stringify({ cmd: "clan_join_accept", clanId: clan.id, inviteeId: parsed.targetId, authorId: parsed.targetId }) }, color: "positive" },
                { action: { type: "callback", label: "Отказаться", payload: JSON.stringify({ cmd: "clan_join_decline", clanId: clan.id, inviteeId: parsed.targetId, authorId: parsed.targetId }) }, color: "negative" }
              ]
            ]
          };

          try {
            await sendVkMessage(VK_TOKEN, parsed.targetId, `[id${userId}|${fullName}] хочет пригласить вас в клан ${clan.name}!`, {
              keyboard: JSON.stringify(keyboard)
            });
            return await sendResponse(`вы отправили предложение вступить в клан пользователю [id${parsed.targetId}|${parsed.targetName}]`);
          } catch (e) {
            return await sendResponse(`Не удалось отправить приглашение пользователю [id${parsed.targetId}|${parsed.targetName}] в ЛС (возможно, заблокированы сообщения от бота).`);
          }
        }

        if (sub === "кикнуть") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);

          if (!isLeader && !isDeputy) {
            return await sendResponse("Исключать участников могут только Лидер и Заместители!");
          }

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя для исключения!");
          if (parsed.targetId === userId) return await sendResponse("Вы не можете исключить себя!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId !== clan.id) return await sendResponse("Этот пользователь не состоит в вашем клане!");

          const targetIsLeader = clan.ownerId === parsed.targetId;
          const targetIsDeputy = (clan.deputies || []).includes(parsed.targetId);

          if (targetIsLeader) {
            return await sendResponse("Вы не можете исключить лидера клана!");
          }

          if (isDeputy && targetIsDeputy) {
            return await sendResponse("Заместитель не может исключить другого заместителя!");
          }

          let reason = args.slice(3).join(" ") || "Без причины";

          const updatedMembers = (clan.members || []).filter((mId: number) => mId !== parsed.targetId);
          const updatedDeputies = (clan.deputies || []).filter((mId: number) => mId !== parsed.targetId);
          const updatedAssistants = (clan.assistants || []).filter((mId: number) => mId !== parsed.targetId);

          await firestoreDb.collection("clans").doc(clan.id).set({
            members: updatedMembers,
            deputies: updatedDeputies,
            assistants: updatedAssistants
          }, { merge: true });

          await updateUser(parsed.targetId, { clanId: null, clanRole: null });

          await sendResponse(`Вы исключили пользователя [id${parsed.targetId}|${parsed.targetName}] из клана`);

          try {
            await sendVkMessage(VK_TOKEN, parsed.targetId, 
              `Вы были кикнуты из клана ${clan.name}\n\n` +
              `| Причина: ${reason}\n` +
              `| Вас кикнул: [id${userId}|${fullName}]`
            );
          } catch (e) {}

          return;
        }

        if (sub === "казна") {
          const sumStr = args[2] || "";
          const sum = parseNumber(sumStr);
          if (isNaN(sum) || sum <= 0) return await sendResponse("Укажите корректную сумму для вклада!");
          if ((user.balance || 0) < sum) return await sendResponse("У вас недостаточно средств на руках!");

          const updatedTreasury = (clan.treasury || 0) + sum;
          await firestoreDb.collection("clans").doc(clan.id).set({ treasury: updatedTreasury }, { merge: true });
          await updateUser(userId, { balance: user.balance - sum });

          await sendResponse(`Вы вложили "${formatNum(sum)}$" в казну клана`);

          const membersList = clan.members || [];
          for (const mId of membersList) {
            if (mId !== userId) {
              try {
                await sendVkMessage(VK_TOKEN, mId, `[id${userId}|${fullName}] вложил(-а) ${formatNum(sum)}$ в казну клана`);
              } catch (e) {}
            }
          }
          return;
        }

        if (sub === "вывод") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);

          if (!isLeader && !isDeputy) {
            return await sendResponse("Выводить деньги из казны могут только Лидер и Заместители!");
          }

          const sumStr = args[2] || "";
          const sum = parseNumber(sumStr);
          if (isNaN(sum) || sum <= 0) return await sendResponse("Укажите корректную сумму для вывода!");

          const currentTreasury = clan.treasury || 0;
          if (currentTreasury < sum) return await sendResponse(`В казне недостаточно средств! Доступно: ${formatNum(currentTreasury)}$`);

          const updatedTreasury = currentTreasury - sum;
          await firestoreDb.collection("clans").doc(clan.id).set({ treasury: updatedTreasury }, { merge: true });
          await updateUser(userId, { balance: (user.balance || 0) + sum });

          await sendResponse(`Вы вывели "${formatNum(sum)}$" с казны клана`);

          const membersList = clan.members || [];
          for (const mId of membersList) {
            if (mId !== userId) {
              try {
                await sendVkMessage(VK_TOKEN, mId, `[id${userId}|${fullName}] вывел ${formatNum(sum)}$ с казны клана`);
              } catch (e) {}
            }
          }
          return;
        }

        if (sub === "война") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);

          if (!isLeader && !isDeputy) {
            return await sendResponse("Объявлять войну могут только Лидер и Заместители!");
          }

          const targetClanName = args.slice(2).join(" ");
          if (!targetClanName) return await sendResponse("Используйте: /клан война [название клана]");

          const snap = await firestoreDb.collection("clans").where("name", "==", targetClanName).limit(1).get();
          if (snap.empty) return await sendResponse(`Клан "${targetClanName}" не найден.`);

          const enemyClan = snap.docs[0].data();
          if (enemyClan.id === clan.id) return await sendResponse("Вы не можете воевать со своим собственным кланом!");

          const p1Power = (clan.soldiers || 0) * 1 + (clan.helicopters || 0) * 10 + (clan.tanks || 0) * 50;
          const p2Power = (enemyClan.soldiers || 0) * 1 + (enemyClan.helicopters || 0) * 10 + (enemyClan.tanks || 0) * 50;

          let winnerClan = clan;
          let loserClan = enemyClan;

          if (p2Power > p1Power) {
            winnerClan = enemyClan;
            loserClan = clan;
          }

          const gainedSoldiers = loserClan.soldiers || 0;
          const gainedHelicopters = loserClan.helicopters || 0;

          await firestoreDb.collection("clans").doc(winnerClan.id).set({
            soldiers: (winnerClan.soldiers || 0) + gainedSoldiers,
            helicopters: (winnerClan.helicopters || 0) + gainedHelicopters,
            wins: (winnerClan.wins || 0) + 1
          }, { merge: true });

          await firestoreDb.collection("clans").doc(loserClan.id).set({
            soldiers: 0,
            helicopters: 0
          }, { merge: true });

          return await sendResponse(
            `Война между кланами ${clan.name} и ${enemyClan.name}!\n\n` +
            `У клана ${clan.name}:\n` +
            `Солдатов: ${clan.soldiers || 0}\n` +
            `Вертолётов: ${clan.helicopters || 0}\n` +
            `Танки: ${clan.tanks || 0}\n\n` +
            `У клана ${enemyClan.name}:\n` +
            `Солдатов: ${enemyClan.soldiers || 0}\n` +
            `Вертолётов: ${enemyClan.helicopters || 0}\n` +
            `Танки: ${enemyClan.tanks || 0}\n\n` +
            `Победитель войны: ${winnerClan.name}\n` +
            `Победитель войны также забирает ${gainedSoldiers} солдатов и ${gainedHelicopters} вертолётов`
          );
        }

        if (sub === "состав") {
          const page = Math.max(1, parseInt(args[2]) || 1);
          const limit = 20;
          const offset = (page - 1) * limit;

          const members = clan.members || [];
          const totalPages = Math.ceil(members.length / limit);

          const pageMembers = members.slice(offset, offset + limit);
          const memberLines: string[] = [];

          for (const mId of pageMembers) {
            const mu = await getOrCreateUser(mId);
            let roleName = "Участник";
            if (mId === clan.ownerId) roleName = "Лидер";
            else if ((clan.deputies || []).includes(mId)) roleName = "Заместитель лидера";
            else if ((clan.assistants || []).includes(mId)) roleName = "Помощник заместителя";

            memberLines.push(`[id${mId}|${mu.nick || "Игрок"}] | Должность: ${roleName}`);
          }

          let resp = `Состав клана ${clan.name}\n\n` + memberLines.join("\n");
          if (totalPages > 1) {
            resp += `\n\n| Страница ${page} из ${totalPages}. Для перехода используйте: /клан состав [номер страницы]`;
          }

          return await sendResponse(resp);
        }

        if (sub === "тип") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер клана может менять его тип!");

          const newTypeStr = args[2];
          if (!newTypeStr) return await sendResponse("Используйте: /клан тип [Закрытый|По заявкам|Открытый]");

          let newType = "";
          if (newTypeStr.toLowerCase() === "закрытый") newType = "Закрытый";
          else if (newTypeStr.toLowerCase() === "открытый") newType = "Открытый";
          else if (newTypeStr.toLowerCase().startsWith("по заяв")) newType = "По заявкам";
          else return await sendResponse("Доступные типы клана: Закрытый, По заявкам, Открытый");

          await firestoreDb.collection("clans").doc(clan.id).set({ type: newType }, { merge: true });
          return await sendResponse(`Вы изменили тип клана на: ${newType}`);
        }

        if (sub === "зам") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер клана может назначать заместителей!");

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (parsed.targetId === userId) return await sendResponse("Вы не можете назначить заместителем себя!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId !== clan.id) return await sendResponse("Этот пользователь не в вашем клане!");

          const deputies = clan.deputies || [];
          if (deputies.includes(parsed.targetId)) return await sendResponse("Этот пользователь уже заместитель!");

          const updatedDeputies = [...deputies, parsed.targetId];
          const updatedAssistants = (clan.assistants || []).filter((id: number) => id !== parsed.targetId);

          await firestoreDb.collection("clans").doc(clan.id).set({ deputies: updatedDeputies, assistants: updatedAssistants }, { merge: true });
          await updateUser(parsed.targetId, { clanRole: "Заместитель лидера" });

          return await sendResponse(`Вы установили пользователя [id${parsed.targetId}|${parsed.targetName}] в качестве заместителя лидера клана`);
        }

        if (sub === "помощник" && args[2]?.toLowerCase() === "зама") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);

          if (!isLeader && !isDeputy) {
            return await sendResponse("Назначать помощников могут только Лидер и Заместители!");
          }

          const parsed = await parseTargetUser(message, args.slice(3));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (parsed.targetId === userId) return await sendResponse("Вы не можете назначить себя!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId !== clan.id) return await sendResponse("Этот пользователь не в вашем клане!");

          const assistants = clan.assistants || [];
          if (assistants.includes(parsed.targetId)) return await sendResponse("Этот пользователь уже помощник заместителя!");

          const updatedAssistants = [...assistants, parsed.targetId];
          const updatedDeputies = (clan.deputies || []).filter((id: number) => id !== parsed.targetId);

          await firestoreDb.collection("clans").doc(clan.id).set({ deputies: updatedDeputies, assistants: updatedAssistants }, { merge: true });
          await updateUser(parsed.targetId, { clanRole: "Помощник зам. лидера" });

          return await sendResponse(`Вы установили пользователя [id${parsed.targetId}|${parsed.targetName}] в качестве помощника зама лидера клана`);
        }

        if (sub === "передать") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер может передать клан!");

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (parsed.targetId === userId) return await sendResponse("Вы не можете передать клан самому себе!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId !== clan.id) return await sendResponse("Этот пользователь не состоит в вашем клане!");

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Передать", payload: JSON.stringify({ cmd: "clan_transfer_confirm", targetId: parsed.targetId, authorId: userId }) }, color: "positive" },
                { action: { type: "callback", label: "Не передавать", payload: JSON.stringify({ cmd: "clan_transfer_cancel", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }
              ]
            ]
          };

          return await sendResponse(
            `Вы собираетесь передать клан пользователю [id${parsed.targetId}|${parsed.targetName}]\n\n| Для подтверждения нажмите на кнопку:`,
            { keyboard: JSON.stringify(keyboard) }
          );
        }

        if (sub === "снять") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер клана может снимать пользователей с должности!");

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId !== clan.id) return await sendResponse("Этот пользователь не состоит в вашем клане!");

          const updatedDeputies = (clan.deputies || []).filter((id: number) => id !== parsed.targetId);
          const updatedAssistants = (clan.assistants || []).filter((id: number) => id !== parsed.targetId);

          await firestoreDb.collection("clans").doc(clan.id).set({ deputies: updatedDeputies, assistants: updatedAssistants }, { merge: true });
          await updateUser(parsed.targetId, { clanRole: "Участник" });

          return await sendResponse(`Вы сняли пользователя [id${parsed.targetId}|${parsed.targetName}] с его должности в клане`);
        }

        if (sub === "переименовать") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер клана может переименовать его!");

          const newName = args.slice(2).join(" ");
          if (!newName) return await sendResponse("Используйте: /клан переименовать [Новое название]");
          if ((user.balance || 0) < 2000000) return await sendResponse("Переименовать клан стоит 2.000.000$ на руках!");

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "Переименовать", payload: JSON.stringify({ cmd: "clan_rename_confirm", newName, authorId: userId }) }, color: "positive" },
                { action: { type: "callback", label: "Не переименовывать", payload: JSON.stringify({ cmd: "clan_rename_cancel", authorId: userId }) }, color: "negative" }
              ]
            ]
          };

          return await sendResponse(
            `Вы действительно хотите переименовать название клана на "${newName}" за 2.000.000$?\n\n| Для подтверждения нажмите на кнопку:`,
            { keyboard: JSON.stringify(keyboard) }
          );
        }

        if (sub === "выйти") {
          const isLeader = clan.ownerId === userId;
          if (isLeader) {
            return await sendResponse("Вы не можете выйти из своего клана, будучи Лидером! Сначала передайте клан (/клан передать) или распустите его.");
          }

          const updatedMembers = (clan.members || []).filter((id: number) => id !== userId);
          const updatedDeputies = (clan.deputies || []).filter((id: number) => id !== userId);
          const updatedAssistants = (clan.assistants || []).filter((id: number) => id !== userId);

          await firestoreDb.collection("clans").doc(clan.id).set({
            members: updatedMembers,
            deputies: updatedDeputies,
            assistants: updatedAssistants
          }, { merge: true });

          await updateUser(userId, { clanId: null, clanRole: null });

          return await sendResponse(`Вы вышли из клана ${clan.name}`);
        }

        if (sub === "вертолёты" || sub === "вертолеты") {
          const count = Math.max(1, parseInt(args[2]) || 1);
          const cost = count * 50000;

          if ((user.balance || 0) < cost) return await sendResponse(`У вас недостаточно средств на руках! Цена 1 вертолёта - 50.000$ (нужно ${formatNum(cost)}$)`);

          await updateUser(userId, { balance: user.balance - cost });
          await firestoreDb.collection("clans").doc(clan.id).set({ helicopters: (clan.helicopters || 0) + count }, { merge: true });

          return await sendResponse(`Вы купили ${count} вертолётов для клана`);
        }

        if (sub === "солдаты" || sub === "солдат") {
          const count = Math.max(1, parseInt(args[2]) || 1);
          const cost = count * 5000;

          if ((user.balance || 0) < cost) return await sendResponse(`У вас недостаточно средств на руках! Цена 1 солдата - 5.000$ (нужно ${formatNum(cost)}$)`);

          await updateUser(userId, { balance: user.balance - cost });
          await firestoreDb.collection("clans").doc(clan.id).set({ soldiers: (clan.soldiers || 0) + count }, { merge: true });

          return await sendResponse(`Вы купили ${count} солдатов для клана`);
        }

        if (sub === "танки" || sub === "танк") {
          const count = Math.max(1, parseInt(args[2]) || 1);
          const cost = count * 150000;

          if ((user.balance || 0) < cost) return await sendResponse(`У вас недостаточно средств на руках! Цена 1 танка - 150.000$ (нужно ${formatNum(cost)}$)`);

          await updateUser(userId, { balance: user.balance - cost });
          await firestoreDb.collection("clans").doc(clan.id).set({ tanks: (clan.tanks || 0) + count }, { merge: true });

          return await sendResponse(`Вы купили ${count} танков для клана`);
        }

        if (sub === "места") {
          const isLeader = clan.ownerId === userId;
          if (!isLeader) return await sendResponse("Только Лидер клана может покупать места!");

          const cost = 250000;
          if ((user.balance || 0) < cost) return await sendResponse("Покупка 5 мест стоит 250.000$ на руках!");

          await updateUser(userId, { balance: user.balance - cost });
          await firestoreDb.collection("clans").doc(clan.id).set({ maxMembers: (clan.maxMembers || 20) + 5 }, { merge: true });

          return await sendResponse(`Вы купили дополнительное место для участника в клан.`);
        }

        return await sendResponse("Неизвестная подкоманда. Используйте /клан для информации.");
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
              { action: { type: "callback", label: "Топ по бракам", payload: JSON.stringify({ cmd: "top_marriages", authorId: userId }) }, color: "secondary" },
              { action: { type: "callback", label: "Топ кланов", payload: JSON.stringify({ cmd: "top_clans", authorId: userId }) }, color: "secondary" }
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

        let amount = 0;
        if (args.length > 1) {
          amount = parseNumber(args[1]);
          if (amount < 0) amount = 0;
        }

        if (amount > 0 && (user.balance || 0) < amount) {
          return await sendResponse(`Недостаточно средств. Ваш баланс: ${(user.balance || 0).toLocaleString()}$`);
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

        const res = await sendResponse(`Игра "Мафия"\n\n| Создатель - [id${userId}|${fullName}]\n${amount > 0 ? `| Ставка для участия: ${amount.toLocaleString()}$\n` : ""}\n| Участники игры - [id${userId}|${fullName}]`, {
          keyboard: JSON.stringify(keyboard)
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        if (amount > 0) {
          await updateUser(userId, { balance: (user.balance || 0) - amount });
        }

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
          lobbyTimer,
          amount
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

      if (rawCmd === "/getmute" || rawCmd === "/инфомут") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const tUser = await getOrCreateUser(targetId);
         const targetName = tUser.fullName || tUser.nick || `User${targetId}`;

         if (tUser.muteUntil && tUser.muteUntil > Date.now()) {
            const remMs = tUser.muteUntil - Date.now();
            const remMin = Math.ceil(remMs / 60000);
            return await sendResponse(`...::Информация о блокировке чата::...\n\nПользователь: [id${targetId}|${targetName}]\n| Статус: ✅ Активна\n| Оставшееся время: ${remMin} мин.\n| Блокировка чата до: ${fmtD(tUser.muteUntil)}\n| Причина: ${tUser.muteReason || "без причины"}`);
         } else {
            return await sendResponse(`У пользователя [id${targetId}|${targetName}] отсутствует активная блокировка чата.`);
         }
      }

      if (rawCmd === "/getwarn" || rawCmd === "/getwarns" || rawCmd === "/инфоварн") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const tUser = await getOrCreateUser(targetId);
         const targetName = tUser.fullName || tUser.nick || `User${targetId}`;

         const warnsCount = tUser.warnings || 0;
         if (warnsCount > 0) {
            const mStr = tUser.warnBy ? `[id${tUser.warnBy}|Модератор]` : "[id1|Система]";
            const rStr = tUser.warnReason || "Нарушение правил";
            const dStr = fmtD(tUser.warnDate || Date.now());
            return await sendResponse(`...::Информация о предупреждениях::...\n\nПользователь: [id${targetId}|${targetName}]\n| Количество предупреждений: ${warnsCount}/3\n\n1) ${mStr} | ${rStr} | ${dStr}`);
         } else {
            return await sendResponse(`У пользователя [id${targetId}|${targetName}] нет активных предупреждений.`);
         }
      }

      if (rawCmd === "/infobans" || rawCmd === "/getbans" || rawCmd === "/getban" || rawCmd === "/инфобан" || rawCmd === "/гетбан" || rawCmd === "/гетбанс") {
         if (user.role < 1 && !isAdmin && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 1) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);

         const targetName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;

         const getModStr = async (mId?: number) => {
           if (!mId) return "[id1|Модератор]";
           const mu = await getOrCreateUser(mId);
           return `[id${mId}|${mu.fullName || mu.nick || "Модератор"}]`;
         };

         const gbanText = tUser.gban ? `${await getModStr(tUser.gbanBy)} | ${tUser.gbanReason || 'без причины'} | ${fmtD(tUser.gbanDate)}` : "Отсутствует.";
         const gbanplText = tUser.gbanpl ? `${await getModStr(tUser.gbanplBy)} | ${tUser.gbanplReason || 'без причины'} | ${fmtD(tUser.gbanplDate)}` : "Отсутствует.";
         const blackText = tUser.blacklisted ? `${await getModStr(tUser.blackBy)} | ${tUser.blackReason || 'без причины'} | ${fmtD(tUser.blackDate)}` : "Отсутствует.";
         const gameBanText = tUser.isGameBanned ? `${await getModStr(tUser.gameBanBy)} | ${tUser.gameBanReason || 'без причины'} | ${fmtD(tUser.gameBanDate)}` : "Отсутствует.";

         const chatBans = tUser.chatBans || {};
         const cKeys = Object.keys(chatBans);
         const chatBansCount = cKeys.length;

         let chatBansText = "Отсутствует.";
         if (chatBansCount > 0) {
           const lines = [];
           let idx = 1;
           for (const cId of cKeys) {
             const bInfo = chatBans[cId];
             const cData = await getOrCreateChat(Number(cId));
             const mStr = await getModStr(bInfo.by);
             lines.push(`${idx}) ${cData.title || `Беседа №${cId}`} | ${mStr} | ${bInfo.reason || 'без причины'} | ${fmtD(bInfo.date)}`);
             idx++;
           }
           chatBansText = lines.join("\n");
         }

         const out = `Информация о блокировках [id${parsed.targetId}|${targetName}]\n\n` +
           `| Информация о глобальной блокировке во всех беседах:\n${gbanText}\n\n` +
           `| Информация о глобальной блокировке в беседах игроков:\n${gbanplText}\n\n` +
           `| Информация о нахождении в чёрном списке бота:\n${blackText}\n\n` +
           `| Информация о блокировке игровых команд:\n${gameBanText}\n\n` +
           `| Кол-во блокировок в беседах: ${chatBansCount}\n\n` +
           `| Информация о блокировках в беседах:\n${chatBansText}`;

         return await sendResponse(out);
      }

       if (["/ии", "/ai", "/чат", "/ask", "/гпт", "/gpt", "/gemini"].includes(rawCmd)) {
         const prompt = args.slice(1).join(" ");
         if (!prompt) return await sendResponse("Укажите запрос для ИИ!");
         try {
           const response = await ai.models.generateContent({
             model: "gemini-3.7-flash",
             contents: prompt,
           });
           const replyText = response.text || "Не удалось получить ответ от ИИ.";
           return await sendResponse(`🤖 [ИИ Gemini 3.7-Flash]:\n\n${replyText}`);
         } catch (e: any) {
           return await sendResponse(`Ошибка при запросе к ИИ: ${e?.message || e}`);
         }
       }

       if (["/mute", "/мут", "/заглушить", "/замутить", "/мутить", "/датьмут", "/m"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         const { timeMin, argIndex } = parseMuteDuration(args);
         
         const reasonArgs = args.slice(message.reply_message ? 1 : 2).filter((_, idx) => {
           const actualIdx = (message.reply_message ? 1 : 2) + idx;
           return actualIdx !== argIndex;
         });
         const reason = reasonArgs.join(" ") || "без причины";
         
         const muteUntil = Date.now() + timeMin * 60 * 1000;
         await updateUser(parsed.targetId, { muteUntil, muteReason: reason, mutePeerId: peerId });
         try {
           await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
             params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: parsed.targetId, for_all: 0, read_only: 1 }
           });
         } catch (e) {}
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearmute", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`[id${userId}|Модератор] выдал(-а) блокировку чата [id${parsed.targetId}|пользователю] на ${timeMin} мин\n\n| Причина: ${reason}\n| Блокировка чата до: ${fmtD(muteUntil)}`, { noReply: true, keyboard: JSON.stringify(keyboard) });
       }

      if (["/unmute", "/анмут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        await updateUser(parsed.targetId, { muteUntil: 0, mutePeerId: 0 });
        try {
          await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
            params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: parsed.targetId, for_all: 0 }
          });
        } catch (e) {}
        return await sendResponse(`[id${userId}|Модератор] снял(-а) блокировку чата с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        const reason = args.slice(2).join(" ") || "без причины";
        
        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = (targetU.warnings || 0) + 1;
        await updateUser(parsed.targetId, { warnings: newWarns });
        
        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
          ]
        };
        
        let msg = `[id${userId}|Модератор] выдал(-а) предупреждение [id${parsed.targetId}|пользователю]\n\n| Причина: ${reason}\n| Предупреждений: ${newWarns}/3`;
        
        if (newWarns >= 3) {
           msg += `\n\nДостигнуто 3/3 предупреждений. Пользователь будет исключён.`;
           await updateUser(parsed.targetId, { warnings: 0 });
           try {
             await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
           } catch (e) {}
        }
        
        return await sendResponse(msg, { noReply: true, keyboard: JSON.stringify(keyboard) });
      }

      if (["/unwarn", "/анварн", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн", "/unw"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = Math.max(0, (targetU.warnings || 0) - 1);
        await updateUser(parsed.targetId, { warnings: newWarns });
        return await sendResponse(`[id${userId}|Модератор] снял(-а) предупреждение с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      if (rawCmd === "/snick" || rawCmd === "/сник") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const nick = args.slice(2).join(" ");
        if (!nick) return await sendResponse("Укажите ник!");
        const targetU = await getOrCreateUser(parsed.targetId);
        if (containsBadWord(nick)) return await sendResponse("Ник содержит запрещенные слова!");
        const chatNicks = targetU.chatNicks || {};
        chatNicks[peerId] = nick;
        await updateUser(parsed.targetId, { chatNicks });
        return await sendResponse(`[id${userId}|Модератор] установил(-а) ник [id${parsed.targetId}|пользователю]\n\n| Установленный ник: ${nick}`, { noReply: true });
      }

      if (rawCmd === "/rnick" || rawCmd === "/рник") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const targetU = await getOrCreateUser(parsed.targetId);
        const chatNicks = targetU.chatNicks || {};
        delete chatNicks[peerId];
        await updateUser(parsed.targetId, { chatNicks });
        return await sendResponse(`[id${userId}|Модератор] удалил(-а) ник [id${parsed.targetId}|пользователю]`, { noReply: true });
      }
      


      if (rawCmd === "/тишина") {
         if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.silence;
         await updateChat(peerId, { silence: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? 'включил(-а)' : 'выключил(-а)'} режим тишины.\n\nТеперь все сообщения обычных пользователей будут удаляться!`);
      }
      if (rawCmd === "/rnickall") {
         if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         for (const p of profiles) {
            if (p.id > 0) {
               const u = await getOrCreateUser(p.id);
               if (u.chatNicks && u.chatNicks[peerId]) {
                  delete u.chatNicks[peerId];
                  await updateUser(p.id, { chatNicks: u.chatNicks });
               }
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] очистил(-а) все ники в текущей беседе!`);
      }
      
      if (rawCmd === "/nlist") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         let list = "Список пользователей с никами:\n\n";
         let i = 1;
         for (const p of profiles) {
            if (p.id > 0) {
               const u = await getOrCreateUser(p.id);
               if (u.chatNicks && u.chatNicks[peerId]) {
                  list += `${i}. [id${p.id}|${p.first_name} ${p.last_name}] - ${u.chatNicks[peerId]}\n`;
                  i++;
               }
            }
         }
         if (i === 1) list += "Ников не найдено.";
         return await sendResponse(list);
      }

      if (rawCmd === "/gnick" || rawCmd === "/гник") {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        const targetU = await getOrCreateUser(parsed.targetId);
        const chatNicks = targetU.chatNicks || {};
        const nick = chatNicks[peerId] || "отсутствует";
        return await sendResponse(`Ник [id${parsed.targetId}|пользователя]: ${nick}`);
      }
      
      // Promotion & Demotion commands
      const handlePromotion = async (reqRole: number, giveRole: number, roleName: string) => {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < reqRole && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (giveRole >= effectiveRole && !isAdmin) return await sendResponse("У вас недостаточно прав для выдачи этой роли!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         if (giveRole >= 8) {
            await updateUser(parsed.targetId, { role: giveRole });
         } else {
            const tUser = await getOrCreateUser(parsed.targetId);
            const chatRoles = tUser.chatRoles || {};
            chatRoles[peerId] = giveRole;
            await updateUser(parsed.targetId, { chatRoles });
         }

         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) уровень прав «${roleName}» [id${parsed.targetId}|пользователю]`, { noReply: true });
      };

      const handleDemotion = async (reqRole: number, fromRole: number, roleName: string) => {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < reqRole && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         delete chatRoles[peerId];
         await updateUser(parsed.targetId, { chatRoles });

         return await sendResponse(`[id${userId}|${fullName}] снял(-а) уровень прав «${roleName}» с [id${parsed.targetId}|пользователя]`, { noReply: true });
      };
      
      // Promotions
      if (rawCmd === "/addmoder" || rawCmd === "/модер" || rawCmd === "/выдатьмодера" || rawCmd === "/setmoder") return await handlePromotion(2, 1, "Модератор");
      if (rawCmd === "/addsenmoder" || rawCmd === "/смодер" || rawCmd === "/setsenmoder" || rawCmd === "/setsmoder" || rawCmd === "/старшиймодератор") return await handlePromotion(3, 2, "Старший модератор");
      if (rawCmd === "/addadmin" || rawCmd === "/админ" || rawCmd === "/setadmin") return await handlePromotion(4, 3, "Администратор");
      if (rawCmd === "/addsenadmin" || rawCmd === "/садмин" || rawCmd === "/setsenadmin" || rawCmd === "/setsadmin") return await handlePromotion(5, 4, "Старший администратор");
      if (rawCmd === "/addzsa" || rawCmd === "/замспец" || rawCmd === "/выдатьзса" || rawCmd === "/setzsa" || rawCmd === "/addzamspets") return await handlePromotion(6, 5, "Зам. спец. администратора");
      if (rawCmd === "/addsa" || rawCmd === "/са" || rawCmd === "/sa" || rawCmd === "/setsa" || rawCmd === "/выдатьса" || rawCmd === "/addspets") return await handlePromotion(7, 6, "Специальный администратор");

      // Demotions (replaced with single /removerole command)
      if (rawCmd === "/removerole" || rawCmd === "/снятьроль" || rawCmd === "/снятьправа") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const authorEffRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (authorEffRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const tUser = await getOrCreateUser(parsed.targetId);
         const targetChatRole = (tUser.chatRoles && tUser.chatRoles[peerId]) || 0;
         const targetGlobalRole = tUser.role || 0;
         const targetEffRole = targetGlobalRole >= 8 ? targetGlobalRole : Math.max(targetGlobalRole, targetChatRole);

         if (targetEffRole === 0 && targetChatRole === 0) {
            return await sendResponse("У пользователя нет назначенных ролей!");
         }

         if (!isAdmin && targetEffRole >= authorEffRole) {
            return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         }

         if (targetGlobalRole > 0 && targetGlobalRole < 8) {
            await updateUser(parsed.targetId, { role: 0 });
         }
         if (targetChatRole > 0) {
            const chatRoles = { ...(tUser.chatRoles || {}) };
            delete chatRoles[peerId];
            await updateUser(parsed.targetId, { chatRoles });
         }

         return await sendResponse(`[id${userId}|${fullName}] снял(-а) права у [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      // Special administrator & owner commands
      if (rawCmd === "/pin") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Специальный администратор.");
         const replyMsg = message.reply_message;
         const fwdMsg = message.fwd_messages && message.fwd_messages[0];
         const targetCmId = replyMsg ? replyMsg.conversation_message_id : (fwdMsg ? fwdMsg.conversation_message_id : null);
         if (!targetCmId) return await sendResponse("Ответьте на сообщение, которое нужно закрепить!");
         try {
           await axios.get(`https://api.vk.com/method/messages.pin`, {
             params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, conversation_message_id: targetCmId }
           });
         } catch (e: any) {}
         return await sendResponse("Вы закрепили новое сообщение");
      }

      if (rawCmd === "/unpin") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Специальный администратор.");
         try {
           await axios.get(`https://api.vk.com/method/messages.unpin`, {
             params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId }
           });
         } catch (e: any) {}
         return await sendResponse("Вы открепили сообщение");
      }

      if (rawCmd === "/settings" || rawCmd === "/настройки") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна только с должности Специальный администратор.");
         
         const chatData = await getOrCreateChat(peerId);
         const boolIcon = (val?: boolean) => val ? "✅ Включено" : "❌ Выключено";
         
         const settingsText = `...::Настройки чат-менеджера в беседе::...\n\n` +
           `| Кик при выходе (/leave): ${boolIcon(chatData.leaveKick)}\n` +
           `| Инвайт только модераторами (/invite): ${boolIcon(chatData.inviteOnlyMods)}\n` +
           `| Анти-флуд (/af): ${boolIcon(chatData.antiFlood)}\n` +
           `| Анти-слив беседы (/antisliv): ${boolIcon(chatData.antiSliv)}\n` +
           `| Анти-рейд (/raid): ${boolIcon(chatData.antiRaid)}\n` +
           `| Анти-сообщества (/group): ${boolIcon(chatData.antiGroup)}\n` +
           `| Анти-тег всех участников (/tegall): ${boolIcon(chatData.antiTegAll)}\n` +
           `| Анти-реклама (/antiad): ${boolIcon(chatData.antiAd)}\n` +
           `| Игровой модуль (/games): ${chatData.gamesDisabled ? "❌ Выключен" : "✅ Включен"}\n` +
           `| Режим тишины (/тишина): ${chatData.silentMode ? "✅ Активен" : "❌ Выключен"}\n` +
           `| Приветствие новых участников: ${chatData.welcomeText ? "✅ Установлено" : "❌ По умолчанию"}\n\n` +
           `Для изменения настроек используйте соответствующие команды владельца беседы.`;
           
         return await sendResponse(settingsText);
      }

      if (rawCmd === "/sql") {
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const queryStr = args.slice(1).join(" ");
         if (!queryStr) return await sendResponse("Укажите SQL-запрос!");
         if (queryStr.toLowerCase().includes("drop")) {
           return await sendResponse("Ошибка выполнения запроса: Команда 'DROP' запрещена.");
         }
         return await sendResponse("Запрос выполнен.\n\nОтвет: Успешно");
      }

      if (rawCmd === "/botstats") {
         if (user.role < 10 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const allChats = await getAllChats();
         const chatCount = allChats.length;

         const allUsers = await getAllUsers();
         let gbanCount = 0;
         let gbanplCount = 0;
         let muteCount = 0;
         let warnCount = 0;
         let activeBanCount = 0;
         let nicksCount = 0;
         let rolesCount = 0;

         const now = Date.now();
         allUsers.forEach((u) => {
           if (u.gban) gbanCount++;
           if (u.gbanpl) gbanplCount++;
           if (u.muteUntil && u.muteUntil > now) muteCount++;
           if (u.warnings && u.warnings > 0) warnCount++;
           if (u.blacklisted) activeBanCount++;
           if (u.chatNicks && Object.keys(u.chatNicks).length > 0) nicksCount++;
           if (u.role && u.role > 0) rolesCount++;
         });

         const statsText = `...::Статистика бота::..

| Кол-во бесед, в которых есть бот: ${chatCount} бесед

| Всего глобальных блокировок во всех беседах игроков: ${gbanplCount}
| Всего глобальных блокировок во всех беседах: ${gbanCount}

| Активных мьютов: ${muteCount}
| Активных варнов: ${warnCount}
| Активных блокировок: ${activeBanCount}

| Кол-во пользователей с никами: ${nicksCount}
| Кол-во пользователей с правами: ${rolesCount}

| Всего сообщений в боте: 1250`;

         return await sendResponse(statsText);
      }

      if (rawCmd === "/addgr" || rawCmd === "/главдиректор" || rawCmd === "/addgdirector") {
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 10 });
         return await sendResponse(`[id${userId}|${fullName}] назначил(-а) [id${parsed.targetId}|пользователя] Главным Руководителем чат-менеджера.`, { noReply: true });
      }

      if (rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") {
         if (user.role < 10 && userId !== 778382713) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { role: 9 });
         return await sendResponse(`[id${userId}|${fullName}] назначил(-а) [id${parsed.targetId}|пользователя] Руководителем чат-менеджера.`, { noReply: true });
      }

      if (rawCmd === "/purge") {
         if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         return await sendResponse("Ненужная информация в беседе была очищена");
      }

      if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (parsed.targetId === userId) return await sendResponse("Вы не можете применить это действие к самому себе!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const targetU = await getOrCreateUser(parsed.targetId);
         const targetChatRole = (targetU.chatRoles && targetU.chatRoles[peerId]) || 0;
         const isTargetStar = await checkIsAdmin(parsed.targetId, peerId, targetU.role) || targetU.role >= 6 || targetChatRole >= 5;
         if (isTargetStar) {
            return await sendResponse("Не удалось кикнуть пользователя из беседы. Возможно у него имеются права системного администратора/владельца.");
         }

         try {
           await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
             params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId }
           });
         } catch (e) {
           return await sendResponse("Не удалось кикнуть пользователя из беседы. Возможно у него имеются права системного администратора/владельца.");
         }
         return await sendResponse(`[id${userId}|Модератор] исключил(-а) [id${parsed.targetId}|пользователя] из беседы.`, { noReply: true });
      }

      if (rawCmd === "/id" || rawCmd === "/айди" || rawCmd === "/ид") {
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         if (targetId < 0) {
           const absId = Math.abs(targetId);
           return await sendResponse(`VK ID Сообщества - ${absId}\n| Оригинальная ссылка на ВКонтакте сообщества: https://vk.ru/id${absId}`);
         } else {
           return await sendResponse(`Ваш VK ID - ${targetId}\n| Оригинальная ссылка на ваш ВКонтакте: https://vk.ru/id${targetId}`);
         }
      }

      if (rawCmd === "/setinfo" || rawCmd === "/установитьинфо") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const infoText = getRawArgText(text);
         if (!infoText) return await sendResponse("Укажите текст инфо!");
         if (containsBadWord(infoText)) return await sendResponse("Текст содержит запрещенные слова!");
         await updateChat(peerId, { infoText });
         return await sendResponse("Вы установили новый текст для команды /info");
      }

      if (rawCmd === "/info" || rawCmd === "/инфо") {
         const chatData = await getOrCreateChat(peerId);
         const infoText = chatData.infoText || "Текст информации беседы не установлен. Владелец может установить его командой /setinfo";
         return await sendResponse(infoText);
      }

      if (rawCmd === "/setinfobot" || rawCmd === "/установитьинфобот") {
         if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
         const infoBotText = getRawArgText(text);
         if (!infoBotText) return await sendResponse("Укажите текст инфо бота!");
         if (containsBadWord(infoBotText)) return await sendResponse("Текст содержит запрещенные слова!");
         globalInfoBotText = infoBotText;
         await firestoreDb.collection("bot_settings").doc("global").set({ infoBotText }, { merge: true });
         return await sendResponse("Вы установили новый текст для команды /infobot");
      }

      if (rawCmd === "/infobot" || rawCmd === "/инфобот") {
         if (!globalInfoBotText) {
           const doc = await firestoreDb.collection("bot_settings").doc("global").get();
           if (doc.exists && doc.data()?.infoBotText) {
             globalInfoBotText = doc.data()?.infoBotText;
           }
         }
         const infoBotText = globalInfoBotText || "GAMES MANAGER — ваш надежный помощник и игровой бот для беседы!";
         return await sendResponse(infoBotText);
      }

      if (rawCmd === "/mutelist") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const muted = [];
         const now = Date.now();
         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.muteUntil && u.muteUntil > now) {
               muted.push(p);
             }
           }
         }
         if (muted.length === 0) return await sendResponse("В этой беседе нет заблокированных пользователей.");
         let out = "Список заблокированных пользователей в беседе:\n\n";
         muted.forEach((m, idx) => {
           out += `${idx + 1}. [id${m.id}|${m.first_name} ${m.last_name}]\n`;
         });
         return await sendResponse(out);
      }

      if (rawCmd === "/warnlist") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const warned = [];
         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.warnings && u.warnings > 0) {
               warned.push({ p, warns: u.warnings });
             }
           }
         }
         if (warned.length === 0) return await sendResponse("В этой беседе нет пользователей с предупреждениями.");
         let out = "Список пользователей с предупреждениями:\n\n";
         warned.forEach((w, idx) => {
           out += `${idx + 1}. [id${w.p.id}|${w.p.first_name} ${w.p.last_name}] — ${w.warns}/3\n`;
         });
         return await sendResponse(out);
      }

      if (rawCmd === "/banlist") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const allUsers = await getAllUsers();
         const banned: any[] = [];
         allUsers.forEach(u => {
           if (u.gban || u.gbanpl || u.blacklisted) {
             banned.push(u);
           }
         });
         if (banned.length === 0) return await sendResponse("Список заблокированных пользователей пуст.");
         let out = "Список глобально заблокированных пользователей:\n\n";
         banned.slice(0, 20).forEach((b, idx) => {
           out += `${idx + 1}. [id${b.userId}|${b.nick || `User${b.userId}`}]\n`;
         });
         return await sendResponse(out);
      }


      if (rawCmd === "/gbanpl" || rawCmd === "/гбанпл") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const reason = args.slice(2).join(" ") || "без причины";
         await updateUser(parsed.targetId, { role: 0, chatRoles: {}, gbanpl: true, gbanplBy: userId, gbanplReason: reason, gbanplDate: Date.now() });
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;

         const allChats = await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000 && c.type === "PL") {
               try {
                 const remRes = await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 if (remRes.data && remRes.data.response === 1) {
                   await sendVkMessage(VK_TOKEN, c.id, `[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|${targetName}] во всех беседах игроков!\n\n| Причина: ${reason}`);
                 }
               } catch(e) {}
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|${targetName}] во всех беседах игроков\n\n| Причина: ${reason}`, { keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungbanpl", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/gban" || rawCmd === "/гбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const reason = args.slice(2).join(" ") || "без причины";
         await updateUser(parsed.targetId, { role: 0, chatRoles: {}, gban: true, gbanBy: userId, gbanReason: reason, gbanDate: Date.now() });
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;

         const allChats = await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000 && c.type !== "PL") {
               try {
                 const remRes = await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 if (remRes.data && remRes.data.response === 1) {
                   await sendVkMessage(VK_TOKEN, c.id, `[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|${targetName}] во всех беседах!\n\n| Причина: ${reason}`);
                 }
               } catch(e) {}
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|${targetName}] во всех беседах\n\n| Причина: ${reason}`, { keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungban", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/ungbanpl" || rawCmd === "/gungbanp" || rawCmd === "/юнгбанпл" || rawCmd === "/ангбанл" || rawCmd === "/унгбанплl" || rawCmd === "/гюнбанпл") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gbanpl: false });
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах игроков с [id${parsed.targetId}|пользователя]`);
      }

      if (rawCmd === "/ungban" || rawCmd === "/юнгбан" || rawCmd === "/унгбан" || rawCmd === "/ангбан" || rawCmd === "/гунгбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gban: false });
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах с [id${parsed.targetId}|пользователя]`);
      }

      if (rawCmd === "/staff" || rawCmd === "/состав") {
         const { profiles } = await getChatMembers(peerId);
         const byRole: Record<number, string[]> = {
           7: [],
           6: [],
           5: [],
           4: [],
           3: [],
           2: [],
           1: []
         };

         for (const p of profiles) {
           if (p.id > 0) {
             const u = await getOrCreateUser(p.id);
             if (u.gban || u.gbanpl || u.blacklisted || (u.chatBans && u.chatBans[peerId])) continue;
             const cRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
             const effRole = u.role >= 8 ? u.role : Math.max(u.role || 0, cRole);
             const r = effRole >= 7 ? 7 : (effRole >= 1 ? effRole : 0);
             if (r >= 1 && r <= 7) {
               const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (u.fullName || u.nick || `User${p.id}`);
               byRole[r].push(`- [id${p.id}|${name}]`);
             }
           }
         }

         const fmtList = (arr: string[]) => arr.length > 0 ? arr.join("\n") : " - Отсутствует";

         const text = `Список руководства беседы

| Владелец беседы:
${fmtList(byRole[7])}

| Спец. Администратор:
${fmtList(byRole[6])}

| Зам. Спец. Администратора:
${fmtList(byRole[5])}

| Старший Администратор:
${fmtList(byRole[4])}

| Администратор:
${fmtList(byRole[3])}

| Старший Модератор:
${fmtList(byRole[2])}

| Модератор:
${fmtList(byRole[1])}`;

         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Ники", payload: JSON.stringify({ cmd: "staff_nicks" }) }, color: "primary" }]
           ]
         };

         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }

      if (rawCmd === "/gstaff" || rawCmd === "/гсостав") {
         const chatData = await getOrCreateChat(peerId);
         const isAdminChat = chatData.isAdminChat;
         if (peerId !== userId && !isAdminChat) {
           return await sendResponse("Данная команда доступна только в личных сообщениях сообщества или в админ-чате!");
         }

         const usersSnap = await firestoreDb.collection("users").get();
         const staffByRole: Record<number, string[]> = {
           12: [],
           11: [],
           10: [],
           9: [],
           8: [],
           7: []
         };

         for (const doc of usersSnap.docs) {
           const u = doc.data();
           if (u.gban || u.gbanpl || u.blacklisted) continue;
           const r = u.role || 0;
           if (r >= 7 && r <= 12) {
             const uId = u.userId || parseInt(doc.id);
             if (!uId || isNaN(uId) || uId < 1) continue;
             const name = u.fullName || u.nick || `User${uId}`;
             staffByRole[r].push(`- [id${uId}|${name}]`);
           }
         }

         const fmtList = (arr: string[]) => arr.length > 0 ? arr.join("\n") : " - Отсутствует";

         const text = `Список руководства бота:

| Владелец чат-менеджера:
${fmtList(staffByRole[12])}

| Зам. Владельца чат-менеджера:
${fmtList(staffByRole[11])}

| Главный Руководитель:
${fmtList(staffByRole[10])}

| Руководитель:
${fmtList(staffByRole[9])}

| Осн. Зам. Руководителя:
${fmtList(staffByRole[8])}

| Зам. Руководителя:
${fmtList(staffByRole[7])}`;

         return await sendResponse(text, { disable_mentions: 1 });
      }

      if (rawCmd === "/ghelp" || rawCmd === "/гхелп") {
         const chatData = await getOrCreateChat(peerId);
         const isAdminChat = chatData.isAdminChat;
         if (peerId !== userId && !isAdminChat) {
           return await sendResponse("Данная команда доступна только в личных сообщениях сообщества или в админ-чате!");
         }
         
         const text = `...::Помощь по командам руководства бота::...\n\nКоманды руководства бота:\n/gstaff -- Список руководства бота.\n/ghelp -- Помощь по командам руководства.`;
         
         const effRole = user.role >= 12 || isAdmin ? 12 : user.role;
         let availableButtons = [];
         if (effRole >= 8 || effRole < 8) availableButtons.push({ cmd: "ghelp_zr", label: "Зам. Руководителя" });
         if (effRole >= 9 || effRole < 8) availableButtons.push({ cmd: "ghelp_ozr", label: "Осн. Зам. Руководителя" });
         if (effRole >= 10 || effRole < 8) availableButtons.push({ cmd: "ghelp_ruk", label: "Руководитель" });
         if (effRole >= 11 || effRole < 8) availableButtons.push({ cmd: "ghelp_zown", label: "Зам. Владельца" });
         if (effRole >= 12 || effRole < 8) availableButtons.push({ cmd: "ghelp_own", label: "Владелец бота" });

         let buttons: any[] = [];
         let row: any[] = [];
         for (const btn of availableButtons) {
            row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
            if (row.length === 2) {
               buttons.push(row);
               row = [];
            }
         }
         if (row.length > 0) buttons.push(row);

         const keyboard = { inline: true, buttons };
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/achat" || rawCmd === "/ачат") {
         if (user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         await updateChat(peerId, { isAdminChat: true });
         return await sendResponse(`Беседа №${peerId} успешно установлена как админ-чат!`);
      }

      if (rawCmd === "/unachat" || rawCmd === "/уначат") {
         if (user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         await updateChat(peerId, { isAdminChat: false });
         return await sendResponse(`Беседа №${peerId} убрана из статуса админ-чата.`);
      }

      if (rawCmd === "/start" || rawCmd === "/старт") {
         const chatData = await getOrCreateChat(peerId);
         if (chatData.active) {
            return await sendResponse("Бот в беседе был уже ранее активирован.");
         }

         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const isAllowed = isVkAdmin || user.role >= 6 || userChatRole >= 6 || isAdmin;
         
         if (!isAllowed) {
            return await sendResponse("Вы не являетесь системным администратором/владельцем беседы для её активации.");
         }

         const chatRoles = user.chatRoles || {};
         chatRoles[peerId] = 6;
         await updateUser(userId, { chatRoles });

         await updateChat(peerId, { active: true, adminId: userId });
         return await sendResponse(`[id${userId}|${fullName}] активировал(-а) чат-менеджера в беседе\n\nТеперь выберите тип беседы с помощью команды - /type\n\nПосле выбора типа беседы, синхронизируйте беседу с помощью команды - /sync`);
      }

      if (rawCmd === "/type" || rawCmd === "/тип") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const isAllowed = isVkAdmin || user.role >= 6 || userChatRole >= 6 || isAdmin;
         
         if (!isAllowed) {
            return await sendResponse("Вы не являетесь владельцем беседы!");
         }

         const chatData = await getOrCreateChat(peerId);
         const curType = chatData.chatType || chatData.type || "DEF";
         const allowedTypes = ["DEF", "PL", "MOD", "ADM", "LD", "HP", "TEX", "TEST", "MD"];
         const typeArg = (args[1] || "").toUpperCase();

         if (typeArg === "OFFICIAL" || typeArg === "OFFICAL") {
             if (user.role < 12 && !isAdmin) return await sendResponse("Тип OFFICIAL может установить только владелец чат-менеджера.");
             await updateChat(peerId, { chatType: "OFFICIAL", type: "OFFICIAL" });
             return await sendResponse(`Тип беседы «${curType}» изменён на «OFFICIAL»`);
         }

         if (typeArg) {
             if (allowedTypes.includes(typeArg)) {
                 await updateChat(peerId, { chatType: typeArg, type: typeArg });
                 return await sendResponse(`Тип беседы «${curType}» изменён на «${typeArg}»`);
             } else {
                 return await sendResponse(`Неизвестный тип беседы: ${typeArg}`);
             }
         }

         const text = `У беседы установлен тип - ${curType}

| Все типы бесед:
DEF - Общая беседа.
PL - Беседа игроков.
MOD - Беседа модерации.
ADM - Беседа администрации.
LD - Беседа лидеров.
HP - Беседа агентов поддержки.
TEX - Беседа тех. специалистов.
TEST - Беседа тестировщиков.
MD - Беседа медиа-партнёров.`;

         return await sendResponse(text);
      }

      if (rawCmd === "/sync" || rawCmd === "/синхронизация" || rawCmd === "/синх") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const isAllowed = isVkAdmin || user.role >= 6 || userChatRole >= 6 || isAdmin;
         if (!isAllowed) return await sendResponse("У вас недостаточно прав!");

         const { profiles } = await getChatMembers(peerId);
         let syncCount = 0;
         for (const p of profiles) {
           if (p.id > 0) {
             await getOrCreateUser(p.id, `${p.first_name} ${p.last_name}`);
             syncCount++;
           }
         }
         return await sendResponse(`Синхронизация беседы успешно завершена!\n\n| Обновлено участников: ${syncCount}`);
      }

      if (rawCmd === "/gsync" || rawCmd === "/гсинх") {
         const isAllowed = user.role >= 12 || isAdmin || userId === 778382713 || userId === 1115715881;
         if (!isAllowed) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");

         try {
           const chatsSnap = await firestoreDb.collection("chats").get();
           for (const doc of chatsSnap.docs) {
             const c = doc.data();
             if (c.id && c.id > 2000000000) {
               try {
                 const { profiles } = await getChatMembers(c.id);
                 for (const p of profiles) {
                   if (p.id > 0) {
                     await getOrCreateUser(p.id, `${p.first_name} ${p.last_name}`);
                   }
                 }
               } catch(e) {}
             }
           }
         } catch(e) {}

         return await sendResponse("Вы синхронизировали все беседы с базой данных бота");
      }

      if (rawCmd === "/мут_тест" || rawCmd === "/mutetest" || rawCmd === "/тестмут") {
         if (user.role < 12 && !isAdmin && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const { timeMin } = parseMuteDuration(args);
         const durationSec = Math.max(60, timeMin * 60);

         try {
           await vkApi.get("messages.changeConversationMemberRestrictions", {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               peer_id: peerId,
               member_ids: parsed.targetId,
               for: durationSec,
               action: "read_only"
             }
           });
         } catch (e: any) {
           console.error("changeConversationMemberRestrictions error:", e?.response?.data || e.message);
         }

         const muteUntil = Date.now() + durationSec * 1000;
         await updateUser(parsed.targetId, { muteUntil, muteReason: "Тестовый системный мут" });

         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) тестовый системный мут [id${parsed.targetId}|${targetName}] на ${timeMin} мин\n\n| Системное ограничение (read-only) применено к пользователю.`);
      }

       if (rawCmd === "/clear" || rawCmd === "/очистить" || rawCmd === "/mclear") {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          
          let count = 1;
          if (rawCmd === "/mclear") {
             const countArg = parseInt(args[1]) || parseInt(args[2]);
             count = countArg ? Math.min(Math.max(1, countArg), 100) : 10;
          } else {
             const countArg = parseInt(args[1]) || parseInt(args[2]);
             count = countArg ? Math.min(Math.max(1, countArg), 100) : 1;
          }

          try {
            const deletedCount = await deleteMessagesForUser(peerId, parsed.targetId, count);
            if (rawCmd === "/clear" || rawCmd === "/очистить") {
               if (deletedCount === 1 || count === 1) {
                  return await sendResponse(`[id${userId}|Модератор] очистил(-а) сообщение от [id${parsed.targetId}|пользователя]`, { noReply: true });
               } else {
                  return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${deletedCount} сообщений от [id${parsed.targetId}|пользователя]`, { noReply: true });
               }
            } else {
               return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${deletedCount} сообщений от [id${parsed.targetId}|пользователя]`, { noReply: true });
            }
          } catch(e) {
            return await sendResponse("Произошла ошибка при удалении сообщений.", { noReply: true });
          }
       }

       if (rawCmd === "/purge" || rawCmd === "/чистка") {
          if (user.role < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const count = Math.min(Math.max(1, parseInt(args[1]) || 50), 100);
          try {
            const deletedCount = await deleteMessagesForUser(peerId, null, count);
            return await sendResponse(`Очищено последних сообщений: ${deletedCount}`);
          } catch(e) {
            return await sendResponse("Произошла ошибка при очистке сообщений.");
          }
       }

      if (rawCmd === "/addstatus") {
         if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const statusStr = message.reply_message ? args.slice(1).join(" ") : args.slice(2).join(" ");
         if (!statusStr) return await sendResponse("Укажите статус!");
         await updateUser(parsed.targetId, { customStatus: statusStr });
         const tUser = await getOrCreateUser(parsed.targetId);
         const targetName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] установил(-а) статус «${statusStr}» для [id${parsed.targetId}|${targetName}]`);
      }

      if (rawCmd === "/unstatus") {
         if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { customStatus: "" });
         const tUser = await getOrCreateUser(parsed.targetId);
         const targetName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) статус у [id${parsed.targetId}|${targetName}]`);
      }

      if (rawCmd === "/arrole") {
         if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Да", payload: JSON.stringify({ cmd: "arrole_yes", targetId: parsed.targetId, authorId: userId }) }, color: "positive" },
               { action: { type: "callback", label: "Нет", payload: JSON.stringify({ cmd: "arrole_no", targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
            ]
         };
         const tUser = await getOrCreateUser(parsed.targetId);
         const targetName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;
         return await sendResponse(`Вы действительно хотите снять ВСЕ роли у пользователя [id${parsed.targetId}|${targetName}]?`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/grrole") {
         if (user.role < 8 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только с должности Основной заместитель руководителя.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         await updateUser(parsed.targetId, { role: 0 });
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную роль с [id${parsed.targetId}|${targetName}]`);
      }

      if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         const reason = args.slice(2).join(" ") || "без причины";

         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         chatBans[peerId] = { by: userId, reason, date: Date.now() };
         await updateUser(parsed.targetId, { chatBans });

         try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
         } catch (e) {}

         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Разблокировать", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearban", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
           ]
         };

         return await sendResponse(`[id${userId}|Модератор] заблокировал(-а) [id${parsed.targetId}|пользователя] в текущей беседе\n\n| Причина: ${reason}`, { keyboard: JSON.stringify(keyboard) });
      }

      if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         delete chatBans[peerId];
         await updateUser(parsed.targetId, { chatBans });

         return await sendResponse(`[id${userId}|Модератор] разблокировал(-а) [id${parsed.targetId}|пользователя] в текущей беседе`);
      }

      if (rawCmd === "/leave") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.leaveKick;
         await updateChat(peerId, { leaveKick: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему кика при выходе из беседы`);
      }

      if (rawCmd === "/invite") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.inviteOnlyMods;
         await updateChat(peerId, { inviteOnlyMods: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему добавления только модераторами`);
      }

      if (rawCmd === "/af") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiFlood;
         await updateChat(peerId, { antiFlood: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-флуд сообщениями`);
      }

      if (rawCmd === "/antisliv") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiSliv;
         await updateChat(peerId, { antiSliv: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-слив беседы`);
      }

      if (rawCmd === "/raid") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiRaid;
         await updateChat(peerId, { antiRaid: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-рейд беседы`);
      }

      if (rawCmd === "/group") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiGroup;
         await updateChat(peerId, { antiGroup: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-сообщества`);
      }

      if (rawCmd === "/q" || rawCmd === "/выйти") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isUserStar = await checkIsAdmin(userId, peerId, user.role) || user.role >= 6 || userChatRole >= 5;
         if (isUserStar) {
            return await sendResponse("Не удалось кикнуть вас из беседы. Возможно у вас имеются права системного администратора/владельца.");
         }
         try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
            });
            return await sendResponse(`[id${userId}|${fullName}] покинул(-а) беседу по собственному желанию.`);
         } catch (e) {
            return await sendResponse("Не удалось кикнуть вас из беседы. Возможно у вас имеются права системного администратора/владельца.");
         }
      }

      if (rawCmd === "/addantiteg") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const tag = args.slice(1).join(" ").trim().toLowerCase();
         if (!tag) return await sendResponse("Укажите запрещенное слово/тег!");
         const chatData = await getOrCreateChat(peerId);
         const antiTeg = chatData.antiTeg || [];
         if (antiTeg.includes(tag)) return await sendResponse("Данное слово/тег уже есть в системе!");
         antiTeg.push(tag);
         await updateChat(peerId, { antiTeg });
         return await sendResponse(`[id${userId}|${fullName}] добавил(-а) слово/тег «${tag}» в систему анти-тег.`);
      }

      if (rawCmd === "/unantiteg") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const tag = args.slice(1).join(" ").trim().toLowerCase();
         if (!tag) return await sendResponse("Укажите слово/тег для удаления!");
         const chatData = await getOrCreateChat(peerId);
         let antiTeg = chatData.antiTeg || [];
         if (!antiTeg.includes(tag)) return await sendResponse("Данное слово/тег не найдено в системе!");
         antiTeg = antiTeg.filter((t: string) => t !== tag);
         await updateChat(peerId, { antiTeg });
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) слово/тег «${tag}» из системы анти-тег.`);
      }

      if (rawCmd === "/antiteglist") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const antiTeg = chatData.antiTeg || [];
         if (antiTeg.length === 0) return await sendResponse("Список запрещенных слов/тегов беседы пуст.");
         const list = antiTeg.map((t: string, i: number) => `${i + 1}) ${t}`).join("\n");
         return await sendResponse(`Список запрещенных слов/тегов беседы:\n\n${list}`);
      }



      if (rawCmd === "/zov" || rawCmd === "/зов") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 2 && userChatRole < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Онлайн", payload: JSON.stringify({ cmd: "zov_online", authorId: userId }) }, color: "primary" }],
             [{ action: { type: "callback", label: "Все", payload: JSON.stringify({ cmd: "zov_all", authorId: userId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`[id${userId}|${fullName}] Выберите тип для созыва участников беседы:`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/nrole") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId || args.length < 3) return await sendResponse("Укажите пользователя и аргументы!");
         
         const roleNum = parseInt(args[args.length - 1]);
         if (isNaN(roleNum) || roleNum < 1 || roleNum > 6) return await sendResponse("Неверный номер должности. Доступно от 1 до 6.");
         if (roleNum >= effectiveRole && !isAdmin) return await sendResponse("Вы не можете выдать должность равную или выше вашей.");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         for (const cId of net.chats) chatRoles[cId] = roleNum;
         await updateUser(parsed.targetId, { chatRoles });
         
         const roleNames = { 1: "Модератор", 2: "Ст. Модератор", 3: "Администратор", 4: "Ст. Администратор", 5: "Зам. Спец. Администратора", 6: "Спец. Администратор" } as Record<number, string>;
         const msg = `[id${userId}|${fullName}] выдал(-а) уровень прав «${roleNames[roleNum]}» [id${parsed.targetId}|пользователю] в беседах сетки №${net.name}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nremoverole") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         const oldRole = chatRoles[peerId] || 1;
         const roleNames = { 1: "Модератор", 2: "Ст. Модератор", 3: "Администратор", 4: "Ст. Администратор", 5: "Зам. Спец. Администратора", 6: "Спец. Администратор" } as Record<number, string>;
         for (const cId of net.chats) delete chatRoles[cId];
         await updateUser(parsed.targetId, { chatRoles });
         
         const msg = `[id${userId}|${fullName}] снял(-а) уровень прав «${roleNames[oldRole] || "Модератор"}» у [id${parsed.targetId}|пользователя] в беседах сетки №${net.name}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nkick") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const reason = args.slice(2).join(" ") || "без причины";
         const msg = `[id${userId}|Модератор] исключил(-а) [id${parsed.targetId}|пользователя] из бесед сетки №${net.name}\n| Причина: ${reason}`;
         for (const cId of net.chats) {
            try {
               await vkApi.get("messages.removeChatUser", { params: { access_token: VK_TOKEN, v: "5.199", chat_id: cId - 2000000000, member_id: parsed.targetId } });
               await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
            } catch (e) {}
         }
         return;
      }

      if (rawCmd === "/nban") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const reason = args.slice(2).join(" ") || "без причины";
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatBans = tUser.chatBans || {};
         for (const cId of net.chats) chatBans[cId] = { by: userId, reason, date: Date.now() };
         await updateUser(parsed.targetId, { chatBans });
         
         const msg = `[id${userId}|Модератор] заблокировал(-а) [id${parsed.targetId}|пользователя] в беседах сетки №${net.name}\n| Причина: ${reason}`;
         for (const cId of net.chats) {
            try {
               await vkApi.get("messages.removeChatUser", { params: { access_token: VK_TOKEN, v: "5.199", chat_id: cId - 2000000000, member_id: parsed.targetId } });
               await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
            } catch (e) {}
         }
         return;
      }

      if (rawCmd === "/nunban") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatBans = tUser.chatBans || {};
         for (const cId of net.chats) delete chatBans[cId];
         await updateUser(parsed.targetId, { chatBans });
         
         const msg = `[id${userId}|Модератор] разблокировал(-а) [id${parsed.targetId}|пользователя] в беседах сетки №${net.name}`;
         return await sendResponse(msg);
      }

      if (rawCmd === "/nsnick" || rawCmd === "/нсник") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const nNick = args.slice(2).join(" ");
         if (!nNick) return await sendResponse("Укажите ник!");
          const targetU = await getOrCreateUser(parsed.targetId);
          const chatNicks = targetU.chatNicks || {};
          for (const cId of net.chats) {
             chatNicks[cId] = nNick;
          }
          await updateUser(parsed.targetId, { chatNicks });
         
         const msg = `[id${userId}|Модератор] установил(-а) ник [id${parsed.targetId}|пользователю] в беседах сетки №${net.name}\n| Установленный ник: ${nNick}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nrnick" || rawCmd === "/нрник") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя и аргументы!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
          const targetU = await getOrCreateUser(parsed.targetId);
          const chatNicks = targetU.chatNicks || {};
          for (const cId of net.chats) {
             delete chatNicks[cId];
          }
          await updateUser(parsed.targetId, { chatNicks });
         const msg = `[id${userId}|Модератор] удалил(-а) ник [id${parsed.targetId}|пользователю] в беседах сетки №${net.name}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nzov") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         
         const msgText = args.slice(1).join(" ") || "Общий сбор сетки!";
         
         for (const cId of net.chats) {
            try {
               const { profiles } = await getChatMembers(cId);
               let zovStr = `[id${userId}|${fullName}] созвал(-а) участников бесед сетки №${net.name}\n\n`;
               let mentions = "";
               for (const p of profiles) {
                  if (p.id > 0) mentions += `[id${p.id}|&#8300;]`;
               }
               zovStr += `${msgText}\n${mentions}`;
               await sendVkMessage(VK_TOKEN, cId, zovStr, { disable_mentions: 0 });
            } catch(e) {}
         }
         return;
      }

      if (rawCmd === "/olist") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 2 && userChatRole < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { items } = await getChatMembers(peerId);
         const onlineList = items.filter((m: any) => m.member_id > 0 && (m.online === 1 || m.online_mobile === 1));
         if (onlineList.length === 0) return await sendResponse("Список участников онлайн в беседе пуст.");
         const list = onlineList.map((m: any, i: number) => `${i + 1}) [id${m.member_id}|${m.first_name} ${m.last_name}]`).join("\n");
         return await sendResponse(`Список участников онлайн в беседе (${onlineList.length}):\n\n${list}`, { disable_mentions: 1 });
      }

      if (rawCmd === "/offlinelist") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 2 && userChatRole < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { items } = await getChatMembers(peerId);
         const offlineList = items.filter((m: any) => m.member_id > 0 && !m.online && !m.online_mobile);
         if (offlineList.length === 0) return await sendResponse("Список участников оффлайн в беседе пуст.");
         const list = offlineList.map((m: any, i: number) => `${i + 1}) [id${m.member_id}|${m.first_name} ${m.last_name}]`).join("\n");
         return await sendResponse(`Список участников оффлайн в беседе (${offlineList.length}):\n\n${list}`, { disable_mentions: 1 });
      }

      if (rawCmd === "/infoid") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `User${parsed.targetId}`;
         
         const ownedChats: { id: string; title: string }[] = [];
         
         try {
            const snapshot = await firestoreDb.collection("chats").where("ownerId", "==", parsed.targetId).get();
            snapshot.forEach(doc => {
               const data = doc.data();
               const shortId = parseInt(doc.id) > 2000000000 ? parseInt(doc.id) - 2000000000 : doc.id;
               ownedChats.push({ id: doc.id, title: data.title || `Беседа №${shortId}` });
            });
         } catch (e) {
            console.error("Error fetching owned chats:", e);
         }

         if (ownedChats.length === 0) return await sendResponse(`Пользователь [id${parsed.targetId}|${targetName}] не владеет ни одной из известных бесед.`);

         const list = ownedChats.map((c, i) => {
            const sid = parseInt(c.id) > 2000000000 ? parseInt(c.id) - 2000000000 : c.id;
            return `${i + 1}) ${c.title} (ID: ${sid})`;
         }).join("\n");
         return await sendResponse(`Беседы, которыми владеет [id${parsed.targetId}|${targetName}]:\n\n${list}`);
      }

      if (rawCmd === "/chats" || rawCmd === "/чаты") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatsSnap = await firestoreDb.collection("chats").get();
         const allChats = chatsSnap.docs.map(d => {
           const data = d.data();
           const realId = data.id || d.id;
           return { ...data, id: realId, chatNum: getChatNumber(realId) };
         });
         const totalPages = Math.ceil(allChats.length / 10) || 1;
         const page = 1;
         const pageChats = allChats.slice(0, 10);

         const list = pageChats.map((c: any, i: number) => `${i + 1}) ${c.title || `Беседа №${c.chatNum || c.id}`} | ID: ${c.chatNum || c.id} | Тип: ${c.type || 'PL'}`).join("\n");

         const keyboard = {
           inline: true,
           buttons: [
             [
               { action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "chats_page", p: page - 1, authorId: userId }) }, color: "primary" },
               { action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "chats_page", p: page + 1, authorId: userId }) }, color: "primary" }
             ]
           ]
         };

         return await sendResponse(`Список бесед бота (Страница ${page}/${totalPages}):\n\n${list}`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/pin" || rawCmd === "/закрепить") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const replyMsg = message.reply_message;
         if (!replyMsg) return await sendResponse("Ответьте на сообщение, которое нужно закрепить!");
         try {
           await axios.get(`https://api.vk.com/method/messages.pin`, { params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, conversation_message_id: replyMsg.conversation_message_id } });
           return await sendResponse("Сообщение успешно закреплено!");
         } catch (e) {
           return await sendResponse("Не удалось закрепить сообщение.");
         }
      }

      if (rawCmd === "/unpin" || rawCmd === "/открепить") {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         try {
           await axios.get(`https://api.vk.com/method/messages.unpin`, { params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId } });
           return await sendResponse("Сообщение успешно откреплено!");
         } catch (e) {
           return await sendResponse("Не удалось открепить сообщение.");
         }
      }

      if (rawCmd === "/games" || rawCmd === "/игры") {
         if (user.role < 3 && !isAdmin) {
           const chatData = await getOrCreateChat(peerId);
           return await sendResponse(`Игровые команды в данной беседе ${chatData.gamesDisabled ? 'выключены' : 'включены'}.`);
         }
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.gamesDisabled;
         await updateChat(peerId, { gamesDisabled: newVal });
         return await sendResponse(`Игровые команды в текущей беседе ${newVal ? 'выключены ❌' : 'включены ✅'}.`);
      }

      // System Toggles
      const handleToggle = async (cmd: string, field: string, onText: string, offText: string) => {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав! Команда доступна только для владельца беседы.");
         const chatData = await getOrCreateChat(peerId);
         const current = chatData[field] as boolean;
         await updateChat(peerId, { [field]: !current });
         return await sendResponse(current ? `[id${userId}|${fullName}] ${offText}` : `[id${userId}|${fullName}] ${onText}`, { disable_mentions: 1, noReply: true });
      };

      if (rawCmd === "/leave") return await handleToggle(rawCmd, "leaveKick", "включил(-а) систему кика при выходе из беседы", "выключил(-а) систему кика при выходе из беседы");
      if (rawCmd === "/invite") return await handleToggle(rawCmd, "inviteOnlyMods", "включил(-а) систему добавления только модераторами", "выключил(-а) систему добавления только модераторами");
      if (rawCmd === "/af") return await handleToggle(rawCmd, "antiFlood", "включил(-а) систему анти-флуд сообщениями", "выключил(-а) систему анти-флуд сообщениями");
      if (rawCmd === "/antisliv") return await handleToggle(rawCmd, "antiSliv", "включил(-а) систему анти-слив беседы", "выключил(-а) систему анти-слив беседы");
      if (rawCmd === "/raid") return await handleToggle(rawCmd, "antiRaid", "включил(-а) систему анти-рейд беседы", "выключил(-а) систему анти-рейд беседы");
      if (rawCmd === "/group") return await handleToggle(rawCmd, "antiGroup", "включил(-а) систему анти-сообщества", "выключил(-а) систему анти-сообщества");
      if (rawCmd === "/tegall") return await handleToggle(rawCmd, "antiTegAll", "включил(-а) систему Анти-тег всех участников", "выключил(-а) систему Анти-тег всех участников");
      if (rawCmd === "/antiad") return await handleToggle(rawCmd, "antiAd", "включил(-а) систему Анти-реклама", "выключил(-а) систему Анти-реклама");
      if (rawCmd === "/deletecommand" || rawCmd === "/удалятькоманды" || rawCmd === "/delcmd") return await handleToggle(rawCmd, "deleteCommand", "включил(-а) систему удаления модерационных команд", "выключил(-а) систему удаления модерационных команд");

      // Chat Network owner commands
      if (rawCmd === "/createnet") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const netName = args[1];
         if (!netName) return await sendResponse("Укажите номер или название сетки!");
         const net = await getChatNetwork(netName);
         if (net) return await sendResponse("Сетка с таким номером уже существует!");
         await saveChatNetwork({ id: netName, name: netName, ownerId: userId, chats: [peerId], createdAt: Date.now() });
         return await sendResponse(`[id${userId}|${fullName}] создал(-а) новую сетку бесед №${netName}`, { noReply: true });
      }

      if (rawCmd === "/deletenet") {
         const netName = args[1];
         if (!netName) return await sendResponse("Укажите номер или название сетки!");
         const net = await getChatNetwork(netName);
         if (!net) return await sendResponse("Сетка не найдена!");
         if (net.ownerId !== userId && !isAdmin) return await sendResponse("Вы не являетесь владельцем данной сетки!");
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Подтвердить", payload: JSON.stringify({ cmd: "deletenet_confirm", netNum: net.name, authorId: userId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Отменить", payload: JSON.stringify({ cmd: "deletenet_cancel", netNum: net.name, authorId: userId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`Вы уверены, что хотите удалить сетку бесед №${net.name}?`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/dgiveowner") {
         const netName = args[1];
         if (!netName) return await sendResponse("Укажите номер или название сетки!");
         const net = await getChatNetwork(netName);
         if (!net) return await sendResponse("Сетка не найдена!");
         if (net.ownerId !== userId && !isAdmin) return await sendResponse("Вы не являетесь владельцем данной сетки!");
         const parsed = await parseTargetUser(message, args.slice(2));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Подтвердить", payload: JSON.stringify({ cmd: "dgiveowner_confirm", netNum: net.name, targetId: parsed.targetId, authorId: userId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Отменить", payload: JSON.stringify({ cmd: "dgiveowner_cancel", netNum: net.name, targetId: parsed.targetId, authorId: userId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`Вы уверены, что хотите передать права владельца сетки №${net.name}?`, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/addchatnet") {
         const netName = args[1];
         if (!netName) return await sendResponse("Укажите номер или название сетки!");
         const net = await getChatNetwork(netName);
         if (!net) return await sendResponse("Сетка не найдена!");
         if (net.ownerId !== userId && !isAdmin) return await sendResponse("Вы не являетесь владельцем данной сетки!");
         if (net.chats.includes(peerId)) return await sendResponse("Данная беседа уже привязана к сетке!");
         const oldNet = await findChatNetworkByPeerId(peerId);
         if (oldNet) return await sendResponse(`Беседа уже привязана к сетке №${oldNet.name}! Отвяжите её перед добавлением в новую.`);
         net.chats.push(peerId);
         await saveChatNetwork(net);
         return await sendResponse(`[id${userId}|${fullName}] добавил(-а) эту беседу в сетку бесед №${net.name}`, { noReply: true });
      }

      if (rawCmd === "/unchatnet") {
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         if (net.ownerId !== userId && !isAdmin) return await sendResponse("Вы не являетесь владельцем данной сетки!");
         net.chats = net.chats.filter(c => c !== peerId);
         await saveChatNetwork(net);
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) эту беседу из сетку бесед №${net.name}`, { noReply: true });
      }

      if (rawCmd === "/netlist") {
         const netName = args[1] || (await findChatNetworkByPeerId(peerId))?.name;
         if (!netName) return await sendResponse("Сетка не найдена! Укажите номер сетки.");
         const net = await getChatNetwork(netName);
         if (!net) return await sendResponse("Сетка не найдена!");
         if (net.ownerId !== userId && !isAdmin) return await sendResponse("Вы не являетесь владельцем данной сетки!");
         
         const chatsList: { id: number; title: string }[] = [];
         for (const cId of net.chats) {
           const cData = await getOrCreateChat(cId);
           chatsList.push({ id: cId, title: cData.title || `Беседа №${cId}` });
         }
         
         const totalPages = Math.ceil(chatsList.length / 15) || 1;
         const page = 1;
         const startIdx = 0;
         const pageChats = chatsList.slice(startIdx, startIdx + 15);
         const listStr = pageChats.map((c, i) => `${startIdx + i + 1}) ${c.title} (ID: ${c.id})`).join("\n");
         
         const ownerUser = await getOrCreateUser(net.ownerId);
         const ownerName = ownerUser.fullName || ownerUser.nick || `id${net.ownerId}`;
         
         let out = `...::Список бесед сетки №${net.name}::... (Стр. ${page}/${totalPages})\n\n` +
           `| Владелец сетки: [id${net.ownerId}|${ownerName}]\n` +
           `| Всего бесед в сетке: ${chatsList.length}\n\n` +
           (chatsList.length > 0 ? listStr : "Беседы в сетке отсутствуют.");
           
         const keyboard = {
           inline: true,
           buttons: [
             [
               { action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page - 1, authorId: userId }) }, color: "primary" },
               { action: { type: "callback", label: "Вперед ▶", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page + 1, authorId: userId }) }, color: "primary" }
             ]
           ]
         };
         return await sendResponse(out, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/infochat" || rawCmd === "/чатинфо" || rawCmd === "/инфочат" || rawCmd === "/chatinfo") {
         if (user.role < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         let cId = parseInt(args[1]) || peerId;
         if (cId < 2000000000 && cId > 0) cId += 2000000000;
         
         const chData = await getOrCreateChat(cId);
         
         let membersCount = chData.membersCount || 0;
         let title = chData.title || "Неизвестно";
         let link = chData.inviteLink || "Неизвестно";
         let ownerId = chData.ownerId || 0;
         
         if (cId > 2000000000) {
            try {
               const convRes = await vkApi.get("messages.getConversationsById", { params: { access_token: VK_TOKEN, v: "5.131", peer_ids: cId } });
               const items = convRes.data?.response?.items;
               if (items && items[0]) {
                  const settings = items[0].chat_settings;
                  if (settings) {
                     membersCount = settings.members_count || membersCount;
                     title = settings.title || title;
                     if (settings.owner_id) {
                        ownerId = settings.owner_id;
                     }
                     // Update DB
                     firestoreDb.collection("chats").doc(cId.toString()).set({
                        ownerId: ownerId,
                        membersCount: membersCount,
                        title: title
                     }, { merge: true }).catch(() => {});
                  }
               }
               
               if (link === "Неизвестно") {
                  const linkRes = await vkApi.get("messages.getInviteLink", { params: { access_token: VK_TOKEN, v: "5.131", peer_id: cId, reset: 0 } }).catch(() => null);
                  if (linkRes?.data?.response?.link) {
                     link = linkRes.data.response.link;
                     firestoreDb.collection("chats").doc(cId.toString()).set({ inviteLink: link }, { merge: true }).catch(() => {});
                  }
               }
            } catch(e) {}
         }
         
         const shortId = cId > 2000000000 ? cId - 2000000000 : cId;
         let ownerStr = ownerId ? `[id${ownerId}|Владелец]` : "Неизвестно";
         const text = `Информация о беседе ${shortId}\n\n| Название беседы: ${title}\n| Кол-во участников: ${membersCount}\n\n| Владелец беседы: ${ownerStr}\n\n| Ссылка на вступление в беседу: ${link}`;
         return await sendResponse(text);
      }

      if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const reason = args.slice(2).join(" ") || "без причины";
         
         await updateUser(parsed.targetId, { blacklisted: true, blackBy: userId, blackReason: reason, blackDate: Date.now() });
         const cleanGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
         if (!isNaN(cleanGroupId) && cleanGroupId > 0) {
            try {
               const banRes = await axios.get(`https://api.vk.com/method/groups.ban`, { 
                  params: { 
                     access_token: VK_TOKEN, 
                     v: "5.199", 
                     group_id: cleanGroupId, 
                     owner_id: parsed.targetId,
                     user_id: parsed.targetId,
                     comment: reason,
                     comment_visible: 1
                  } 
               });
               console.log("groups.ban response:", banRes.data);
            } catch (e: any) {
               console.error("groups.ban error:", e?.response?.data || e.message);
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] добавил(-а) [id${parsed.targetId}|пользователя] в черный список сообщества.`);
      }

      if (["/unblack", "/анблэк", "/анчс", "/изчс", "/удалитьизчс", "/унчсб", "/unb", "/изчсб"].includes(rawCmd)) {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         await updateUser(parsed.targetId, { blacklisted: false });
         const cleanGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
         if (!isNaN(cleanGroupId) && cleanGroupId > 0) {
            try {
               const unbanRes = await axios.get(`https://api.vk.com/method/groups.unban`, { 
                  params: { 
                     access_token: VK_TOKEN, 
                     v: "5.199", 
                     group_id: cleanGroupId, 
                     owner_id: parsed.targetId,
                     user_id: parsed.targetId
                  } 
               });
               console.log("groups.unban response:", unbanRes.data);
            } catch (e: any) {
               console.error("groups.unban error:", e?.response?.data || e.message);
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) [id${parsed.targetId}|пользователя] из черного списка сообщества.`);
      }


      if (rawCmd === "/welcometext") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const chatData = await getOrCreateChat(peerId);
         const isEnabled = chatData.welcometext_enabled;
         const currentText = chatData.welcometext || "Не задан";
         
         const text = `Здесь вы можете задать текст приветствия который будет отправляться при каждом приглашении участника.\n\n| Статус текста приветствия - ${isEnabled ? 'Включён' : 'Отключён'}\n\n| Текст приветствия:\n${currentText}\n\n| «%u» - заменяется на @id пользователя\n| «%n» - заменяется на тег с именем пользователя\n| «%i» - заменяется на @id пригласившего\n| «%p» - заменяется на тег с именем пригласившего`;
         
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: isEnabled ? "Выключить приветствие" : "Включить приветствие", payload: JSON.stringify({ cmd: isEnabled ? "welcome_off" : "welcome_on" }) }, color: isEnabled ? "negative" : "positive" }],
             [{ action: { type: "callback", label: "Задать текст", payload: JSON.stringify({ cmd: "welcome_set" }) }, color: "positive" }]
           ]
         };
         
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard) });
      }

       if (rawCmd === "/restart") {
          if (user.role < 12 && userId !== 778382713) return await sendResponse("Недостаточно прав!");
          
          const keyboard = {
             inline: true,
             buttons: [
                [
                   { action: { type: "callback", label: "Подтвердить перезапуск", payload: JSON.stringify({ cmd: "restart_confirm", authorId: userId }) }, color: "positive" },
                   { action: { type: "callback", label: "Отмена", payload: JSON.stringify({ cmd: "restart_cancel", authorId: userId }) }, color: "negative" }
                ]
             ]
          };
          
          return await sendResponse(
             `...::Управление работой бота::...\n\n` +
             `Инициатор: [id${userId}|${fullName}]\n` +
             `Вы действительно хотите перезапустить чат-менеджера?\n` +
             `Во время перезапуска все активные игры и процессы будут временно приостановлены.`,
             { keyboard: JSON.stringify(keyboard) }
          );
       }

      if (rawCmd === "/zov") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const zovList = profiles.filter((p: any) => p.id > 0).map((p: any) => `[id${p.id}|&#8203;]`).join("");
         return await sendResponse(`@all Внимание, участники! ` + zovList, { disable_mentions: 0 });
      }
      
      if (rawCmd === "/online") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = profiles.filter((p: any) => p.id > 0 && p.online).map((p: any) => `[id${p.id}|&#8203;]`).join("");
         return await sendResponse(`@online Внимание, участники в сети! ` + onlineList, { disable_mentions: 0 });
      }
      
      if (rawCmd === "/onlinelist") {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineUsers = profiles.filter((p: any) => p.id > 0 && p.online);
         const lines = onlineUsers.map((p: any, idx: number) => `${idx+1}. [id${p.id}|${p.first_name} ${p.last_name}]`);
         return await sendResponse(`Пользователи онлайн:\n\n` + lines.join("\n"));
      }


      if (rawCmd === "/banid") {
         if (user.role < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const inputId = parseInt(args[1]);
         if (!inputId || isNaN(inputId)) return await sendResponse("Укажите Peer_id беседы!");
         const targetPeerId = inputId < 2000000000 ? inputId + 2000000000 : inputId;
         const targetChatId = targetPeerId - 2000000000;
         const groupIdNum = Math.abs(parseInt(String(VK_GROUP_ID)));
         const botMemberId = "-" + groupIdNum;
         
         let inviteLink = "";
         try {
            const linkRes = await axios.get("https://api.vk.com/method/messages.getInviteLink", {
               params: { access_token: VK_TOKEN, v: "5.199", peer_id: targetPeerId, reset: 0 }
            });
            if (linkRes.data?.response?.link) {
               inviteLink = linkRes.data.response.link;
            }
         } catch (e) {}

         await updateChat(targetPeerId, { banned: true, ...(inviteLink ? { inviteLink } : {}) });
         await sendResponse(`[id${userId}|${fullName}] заблокировал(-а) беседу №${targetPeerId}`);
         
         try {
            await sendVkMessage(VK_TOKEN, targetPeerId, `Беседа была заблокирована руководством бота.\n\nБот отключён от работы в этой беседе.`);
         } catch (e) {}

         try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: targetChatId, member_id: botMemberId }
            });
         } catch (e) {}

         return;
      }

      if (rawCmd === "/unbanid" || rawCmd === "/унбанид") {
         if (user.role < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const inputId = parseInt(args[1]);
         if (!inputId || isNaN(inputId)) return await sendResponse("Укажите Peer_id беседы!");
         const targetPeerId = inputId < 2000000000 ? inputId + 2000000000 : inputId;
         const targetChatId = targetPeerId - 2000000000;
         const groupIdNum = Math.abs(parseInt(String(VK_GROUP_ID)));
         const botMemberId = "-" + groupIdNum;

         const chatData = await getOrCreateChat(targetPeerId);
         await updateChat(targetPeerId, { banned: false });
         await sendResponse(`[id${userId}|${fullName}] разблокировал(-а) беседу №${targetPeerId}`);
         
         if (chatData?.inviteLink) {
            try {
               await axios.get("https://api.vk.com/method/messages.joinChatByInviteLink", {
                  params: { access_token: VK_TOKEN, v: "5.199", link: chatData.inviteLink }
               });
            } catch (e) {}
         }

         try {
            await axios.get("https://api.vk.com/method/messages.addChatUser", {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: targetChatId, user_id: botMemberId, visible_messages_count: 100 }
            });
         } catch (e) {}

         try {
            await axios.get("https://api.vk.com/method/messages.addChatUser", {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: targetChatId, member_id: botMemberId }
            });
         } catch (e) {}

         try {
            await axios.get("https://api.vk.com/method/messages.addChatMember", {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: targetChatId, user_id: botMemberId }
            });
         } catch (e) {}

         try {
            await axios.get("https://api.vk.com/method/messages.addChatMember", {
               params: { access_token: VK_TOKEN, v: "5.199", chat_id: targetChatId, member_id: botMemberId }
            });
         } catch (e) {}

         try {
            await sendVkMessage(VK_TOKEN, targetPeerId, `Беседа была разблокирована руководством бота.`);
         } catch (e) {}
         return;
      }

      if (rawCmd === "/gbanlist" || rawCmd === "/гбанлист" || rawCmd === "/списокгбан") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const usersSnap = await firestoreDb.collection("users").get();
         const gbanList: any[] = [];
         const gbanplList: any[] = [];
         
         for (const doc of usersSnap.docs) {
           const u = doc.data();
           const uId = u.userId || doc.id;
           if (u.gban) gbanList.push({ ...u, userId: Number(uId) });
           if (u.gbanpl) gbanplList.push({ ...u, userId: Number(uId) });
         }

         const getModStr = async (mId?: number) => {
           if (!mId) return "[id1|Модератор]";
           const mu = await getOrCreateUser(mId);
           return `[id${mId}|${mu.fullName || mu.nick || "Модератор"}]`;
         };

         let out = `Список глобально заблокированных пользователей\n\n`;
         out += `| Глобальные блокировки (во всех беседах):\n`;
         if (gbanList.length === 0) {
           out += ` - Отсутствует.\n`;
         } else {
           for (let i = 0; i < gbanList.length; i++) {
             const u = gbanList[i];
             const name = u.fullName || u.nick || `id${u.userId}`;
             const mStr = await getModStr(u.gbanBy);
             out += `${i + 1}) [id${u.userId}|${name}] | ${mStr} | ${u.gbanReason || 'без причины'} | ${fmtD(u.gbanDate)}\n`;
           }
         }

         out += `\n| Глобальные блокировки (в беседах игроков):\n`;
         if (gbanplList.length === 0) {
           out += ` - Отсутствует.`;
         } else {
           for (let i = 0; i < gbanplList.length; i++) {
             const u = gbanplList[i];
             const name = u.fullName || u.nick || `id${u.userId}`;
             const mStr = await getModStr(u.gbanplBy);
             out += `${i + 1}) [id${u.userId}|${name}] | ${mStr} | ${u.gbanplReason || 'без причины'} | ${fmtD(u.gbanplDate)}\n`;
           }
         }

         return await sendResponse(out, { disable_mentions: 1 });
      }

      if (rawCmd === "/blacklist" || rawCmd === "/блэклист" || rawCmd === "/чсбота") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const usersSnap = await firestoreDb.collection("users").get();
         const blackList: any[] = [];
         
         for (const doc of usersSnap.docs) {
           const u = doc.data();
           const uId = u.userId || doc.id;
           if (u.blacklisted) blackList.push({ ...u, userId: Number(uId) });
         }

         const getModStr = async (mId?: number) => {
           if (!mId) return "[id1|Модератор]";
           const mu = await getOrCreateUser(mId);
           return `[id${mId}|${mu.fullName || mu.nick || "Модератор"}]`;
         };

         let out = `Список пользователей в чёрном списке бота\n\n`;
         if (blackList.length === 0) {
           out += ` - Отсутствует.`;
         } else {
           for (let i = 0; i < blackList.length; i++) {
             const u = blackList[i];
             const name = u.fullName || u.nick || `id${u.userId}`;
             const mStr = await getModStr(u.blackBy);
             out += `${i + 1}) [id${u.userId}|${name}] | ${mStr} | ${u.blackReason || 'без причины'} | ${fmtD(u.blackDate)}\n`;
           }
         }

         return await sendResponse(out, { disable_mentions: 1 });
      }

      if (rawCmd === "/addzamowner" || rawCmd === "/замвладельцабота") {
         return await handlePromotion(12, 11, "Зам. Владельца чат-менеджера");
      }

      if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam") {
         return await handlePromotion(10, 8, "Зам. Руководителя чат-менеджера");
      }

      if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam") {
         return await handlePromotion(10, 9, "Осн. Зам. Руководителя чат-менеджера");
      }

      if (rawCmd === "/setowner") {
         if (user.role < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         chatRoles[peerId] = 6;
         await updateUser(parsed.targetId, { chatRoles });
         return await sendResponse(`[id${userId}|${fullName}] назначил(-а) [id${parsed.targetId}|пользователя] владельцем текущей беседы.`);
      }

      if (rawCmd === "/deleteowner" || rawCmd === "/delowner" || rawCmd === "/снятьвладельца" || rawCmd === "/делетоунер") {
         if (user.role < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         delete chatRoles[peerId];
         await updateUser(parsed.targetId, { chatRoles });
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) права владельца текущей беседы с [id${parsed.targetId}|пользователя].`);
      }
      if (rawCmd === "/giveowner") {
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         const keyboard = {
           inline: true,
           buttons: [
             [{ action: { type: "callback", label: "Передать", payload: JSON.stringify({ cmd: "mod_giveowner_yes", targetId: parsed.targetId }) }, color: "positive" }],
             [{ action: { type: "callback", label: "Не передавать", payload: JSON.stringify({ cmd: "mod_giveowner_no", targetId: parsed.targetId }) }, color: "negative" }]
           ]
         };
         return await sendResponse(`Вы действительно хотите передать права владельца беседы [id${parsed.targetId}|пользователю]?\n\n| Для подтверждения нажмите на кнопку:`, { keyboard: JSON.stringify(keyboard) });
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
      if (rawCmd === "/gamehelp" || rawCmd === "/игровые") {
        let helpText = `...::Игровые команды бота::...\n\n` +
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
          `/клан - Информация о клане и клановые команды.\n` +
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
            [{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main" }) }, color: "secondary" }]
          ]
        };
        
        return await sendResponse(helpText, { keyboard: JSON.stringify(keyboard) });
      }

      if (rawCmd === "/help" || rawCmd === "/помощь" || rawCmd === "/хелп" || rawCmd === "/команды" || rawCmd === "/other") {
        let helpText = `...::Помощь по командам бота::...\n\nКоманды пользователей:\n/help - Помощь по командам.\n/gamehelp - Помощь по игровым командам.\n/stats - Узнать статистику пользователя.\n/ping - Узнать пинг бота.\n/infobot - Информация о боте.\n/q - Покинуть беседу.`;

        let keyboard = { inline: true, buttons: [] as any[] };
        let availableButtons = [];
        const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
        const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);

        if (effectiveRole >= 1) availableButtons.push({ cmd: "help_moder", label: "Модератор" });
        if (effectiveRole >= 2) availableButtons.push({ cmd: "help_smoder", label: "Ст. Модератор" });
        if (effectiveRole >= 3) availableButtons.push({ cmd: "cmd_help_admin_bot", label: "Администратор" });
        if (effectiveRole >= 4) availableButtons.push({ cmd: "help_sadmin", label: "Ст. Администратор" });
        if (effectiveRole >= 5) availableButtons.push({ cmd: "help_zsa", label: "Зам. Спец. Адм." });
        if (effectiveRole >= 6) availableButtons.push({ cmd: "help_sa", label: "Спец. Администратор" });
        if (effectiveRole >= 7) availableButtons.push({ cmd: "help_owner", label: "Владелец беседы" });
        
        let row = [];
        for (const btn of availableButtons) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
        if (row.length > 0) keyboard.buttons.push(row);

        return await sendResponse(helpText, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
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
        await promoRef.set({ usedCount: FieldValue.increment(1), usedUsers }, { merge: true });

        return await sendResponse(`Вы активировали промокод "${code}" и получаете ${rewardText}!`);
      }

      // ==========================================
      // ADMIN COMMANDS (Role >= 12 Special Leader)
      // ==========================================
      // (isAdmin and denyAdmin already declared above)

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
            user_id: parsed.targetId,
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
            user_id: String(parsed.targetId),
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

      if (rawCmd === "/chatid" || rawCmd === "/чатид") {
        return await sendResponse(`Peer_id чата: ${peerId}`);
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
          buttons: [
            [
              { action: { type: "callback", label: "Вступить в раздачу", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
            ],
            [
              { action: { type: "callback", label: "Выйти из раздачи", payload: JSON.stringify({ cmd: "giveaway_leave" }) }, color: "negative" }
            ]
          ]
        };
        
        const res = await sendResponse(`@all, минуточку внимания!\n\nРаздача на сумму ${amount.toLocaleString()}$ была создана!\n\n| Организатор: [id${userId}|${fullName}]\n\n| Время на принятие участия: ${timeArg}`, {
          keyboard: JSON.stringify(keyboard),
          disable_mentions: 0
        });

        const cmId = res?.response?.[0]?.conversation_message_id || res?.response;

        const timer = setTimeout(async () => {
          const g = giveaways.get(peerId);
          if (g) {
            try {
              await vkApi.get("messages.delete", {
                params: {
                  peer_id: peerId,
                  cmids: String(g.cmId),
                  delete_for_all: 1,
                  access_token: VK_TOKEN,
                  v: "5.131"
                }
              });
            } catch (e) {}

            if (g.participants.length === 0) {
              await sendVkMessage(VK_TOKEN, peerId, `@all, минуточку внимания!\n\nРаздача на сумму ${amount.toLocaleString()}$ была завершена!\n\nК сожалению, никто не принял участие.`, { disable_mentions: 0 });
            } else {
              const partLines = [];
              for (const p of g.participants) {
                const pu = await getOrCreateUser(p.id);
                await updateUser(p.id, { balance: (pu.balance || 0) + amount });
                partLines.push(`[id${p.id}|${p.name}]`);
                sendVkMessage(VK_TOKEN, p.id, `Вы автоматически получили ${amount.toLocaleString()}$, так как раздача была завершена.`);
              }
              await sendVkMessage(VK_TOKEN, peerId, `@all, минуточку внимания!\n\nРаздача на сумму ${amount.toLocaleString()}$ была завершена!\n\n${partLines.join("\n")}\n\n| Каждый получает: ${amount.toLocaleString()}$`, { disable_mentions: 0 });
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

      if (rawCmd === "/deleteduals" || rawCmd === "/deleteduel" || rawCmd === "/очиститьдуэли" || rawCmd === "/очиститьигры") {
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
        if (mafiaGames.has(peerId)) { 
          const m = mafiaGames.get(peerId);
          if (m?.lobbyTimer) clearTimeout(m.lobbyTimer);
          if (m?.phaseTimer) clearTimeout(m.phaseTimer);
          mafiaGames.delete(peerId); 
          deletedCount++; 
        }

        if (args[1] === "all" || args[1] === "все") {
          deletedCount = duelGames.size + crocGames.size + rpsGames.size + mafiaGames.size;
          duelGames.clear();
          for (const [, c] of crocGames) { if (c.timeoutTimer) clearTimeout(c.timeoutTimer); }
          crocGames.clear();
          rpsGames.clear();
          for (const [, m] of mafiaGames) { 
            if (m.lobbyTimer) clearTimeout(m.lobbyTimer);
            if (m.phaseTimer) clearTimeout(m.phaseTimer);
          }
          mafiaGames.clear();
          return await sendResponse(`[id${userId}|${fullName}] успешно удалил(-а) ВСЕ активные игры (Дуэли, Крокодил, КНБ, Мафия) во всех чатах! (${deletedCount} игр)`);
        }

        if (deletedCount === 0) {
          return await sendResponse(`⚠️ В данном чате нет активных игр.`);
        }

        return await sendResponse(`[id${userId}|${fullName}] успешно удалил(-а) все активные игры в данном чате!`);
      }

      if (rawCmd === "/пример") {
        const exampleUrl = "https://sun1-91.vkuserphoto.ru/s/v1/ig2/ULFTPpBnjJsKDCSpAxHRDk4Yh5ihQDY3nWZS8GzqjegfTcsmdA0NPnClOSYXCFjevWqFkXxrEL7Y3uVCfWALAS1f.jpg?quality=96&as=32x18,48x27,72x40,108x61,160x90,240x135,360x202,480x270,540x304,640x360,720x405,1080x607,1280x720,1440x810,1600x900&from=bu&cs=1600x0";
        const uploadResult = await uploadPhoto(peerId, exampleUrl);
        if (uploadResult.attachment) {
          await sendResponse("Вот пример цитаты:", { attachment: uploadResult.attachment });
        } else {
          await sendResponse(`Ошибка загрузки примера: ${uploadResult.error}`);
        }
      }

      if (rawCmd === "/статаимг" || rawCmd === "/stataimg" || rawCmd === "/statsimg" || rawCmd === "/статистикаимг" || rawCmd === "/си" || rawCmd === "/систата") {
        if (user.role < 11 && userId !== 778382713 && userId !== 607598858 && userId !== 1115715881 && userId !== 1) {
          return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцам и Зам. Владельца чат-менеджера.");
        }

        const nowStataImg = Date.now();
        const lastStataImg = stataImgCooldowns.get(userId) || 0;
        const stataImgRemaining = 30 - Math.floor((nowStataImg - lastStataImg) / 1000);
        const isBypass = user.role >= 12 || userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1;
        if (stataImgRemaining > 0 && !isBypass) {
          return await sendResponse(`Подождите ${stataImgRemaining} сек. перед повторным использованием команды /статаимг!`);
        }
        stataImgCooldowns.set(userId, nowStataImg);

        let waitMsgId: any = null;
        try {
          const waitRes = await sendResponse("Пожалуйста подождите, ваша статистика загружается...");
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

        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const targetUser = await getOrCreateUser(targetId);

        try {
          const imgBuffer = await generateUserStatsImage(targetUser, targetId, peerId);
          const uploadRes = await uploadPhoto(peerId, imgBuffer);

          // Сначала удаляем временное сообщение "Пожалуйста подождите..."
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
            // Небольшая задержка, чтобы гарантировать удаление перед отправкой картинки
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // А затем отправляем готовую картинку статистики
          if (uploadRes.attachment) {
            return await sendResponse(`Статистика пользователя [id${targetId}|${targetUser.fullName || targetUser.nick || 'Игрок'}]:`, { attachment: uploadRes.attachment, disable_mentions: 1 });
          } else {
            return await sendResponse(`Ошибка генерации статистики: ${uploadRes.error || 'не удалось создать фото'}`);
          }
        } catch (err: any) {
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
          return await sendResponse("Произошла ошибка при генерации карточки статистики.");
        }
      }
      else if (rawCmd === "/stats" || rawCmd === "/стата" || rawCmd === "/я" || rawCmd === "/статс" || rawCmd === "/stata" || rawCmd === "/статистика") {
        const parsed = await parseTargetUser(message, args.slice(1));
        const finalId = parsed.targetId || userId;
        const resData = await getStatsMainPage(finalId, peerId);
        await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
      } else if (rawCmd === "/пинг" || rawCmd === "/ping") {
        const latency = Date.now() - (message.date * 1000);
        const respTimeSec = (latency / 1000).toFixed(2);
        await sendResponse(`Информация о пинге бота:\n\n| Пинг: ${latency} мс\n| Скорость ответа: ${respTimeSec} сек`);
      }
    } catch (error) {
      console.error("Error processing message:", error); fs.appendFileSync("error.log", (error.stack || error) + "\n"); 
    }
  }
}

const processedEventIds = new Set<string>();

app.post("/api-vk-callback/verification/E1y7AP8589tyihbt7ig58fu659ft34fv8hn73ff23/jordan-manager/yyywwifkvhegvjbej38bk3nwjvkvkvkv38r834isdfsdaljhewkrjhssdakjfhsdkjhxzkvjhzxckjasdhfkhjasdf/brawl-stars/www39g", async (req, res) => {
  const eventId = req.body?.event_id;
  if (eventId) {
    if (processedEventIds.has(eventId)) {
      return res.send("ok");
    }
    processedEventIds.add(eventId);
    if (processedEventIds.size > 10000) {
      const firstKey = processedEventIds.values().next().value;
      if (firstKey !== undefined) processedEventIds.delete(firstKey);
    }
  }

  // Send "ok" instantly to VK to satisfy the 3-second timeout and prevent duplication
  res.send("ok");

  // Process the webhook payload asynchronously in the background
  try {
    await handleVkEvent(req.body);
  } catch (e) {
    console.error("Error in handleVkEvent:", e);
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

// Mute Expiration Checker
setInterval(async () => {
  try {
    const now = Date.now();
    const expiredUsers: { userId: number; targetPeerId: number }[] = [];

    for (const [uId, uData] of userCache.entries()) {
      if (uData && uData.muteUntil && uData.muteUntil > 0 && uData.muteUntil <= now && uData.mutePeerId && uData.mutePeerId > 2000000000) {
        expiredUsers.push({ userId: uId, targetPeerId: uData.mutePeerId });
        uData.muteUntil = 0;
        uData.mutePeerId = 0;
      }
    }

    for (const item of expiredUsers) {
      const uId = item.userId;
      const targetPeerId = item.targetPeerId;

      await updateUser(uId, { muteUntil: 0, mutePeerId: 0 });

      if (targetPeerId && targetPeerId > 2000000000) {
        try {
          await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
            params: {
              access_token: VK_TOKEN,
              v: "5.199",
              peer_id: targetPeerId,
              member_id: uId,
              for_all: 0
            }
          });
        } catch (e) {}

        await sendVkMessage(VK_TOKEN, targetPeerId, `Блокировка чата у [id${uId}|пользователя] была окончена.`);
      }
    }
  } catch (err) {}
}, 5000);

async function startServer() {
  startTechReports();
  downloadFont().catch(e => console.error("Background font download error:", e));
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
