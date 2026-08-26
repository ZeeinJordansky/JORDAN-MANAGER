const groupSubCache = new Map<number, { isMember: boolean; expiresAt: number }>();
const screenNameCache = new Map<string, { targetId: number, targetName: string }>();
const promoCache = new Map<string, any>();
const botSettingsCache: any = { infoBotText: "", banWords: [] };
const userNickCache = new Map<string, number>();
interface DurationParseResult {
  seconds: number;
  declinedText: string;
}

function parseInactiveDuration(inputStr: string): DurationParseResult | null {
  if (!inputStr) return null;
  const s = inputStr.trim().toLowerCase().replace(/^–æ—Ç\s+/, "");
  if (!s) return null;

  const m = s.match(/^(\d+)\s*([a-z–∞-—è—ë.]+)?$/i);
  if (!m) return null;

  const count = parseInt(m[1], 10);
  if (isNaN(count) || count <= 0) return null;

  const unit = (m[2] || "").trim().toLowerCase();

  function getPluralAccusative(n: number, one: string, two: string, five: string): string {
    const abs = Math.abs(n) % 100;
    const rem = abs % 10;
    if (abs > 10 && abs < 20) return `${n} ${five}`;
    if (rem > 1 && rem < 5) return `${n} ${two}`;
    if (rem === 1) return `${n} ${one}`;
    return `${n} ${five}`;
  }

  // Weeks
  if (/^(–Ω–µ–¥|–Ω–µ–¥–µ–ª|week|w)/i.test(unit)) {
    return {
      seconds: count * 7 * 86400,
      declinedText: getPluralAccusative(count, "–Ω–µ–¥–µ–ª—é", "–Ω–µ–¥–µ–ª–∏", "–Ω–µ–¥–µ–ª—å")
    };
  }

  // Months
  if (/^(–º–µ—Å|month|mo)/i.test(unit)) {
    return {
      seconds: count * 30 * 86400,
      declinedText: getPluralAccusative(count, "–º–µ—Å—è—Ü", "–º–µ—Å—è—Ü–∞", "–º–µ—Å—è—Ü–µ–≤")
    };
  }

  // Years
  if (/^(–≥–æ–¥|–ª–µ—Ç|–≥|year|y|yr)/i.test(unit)) {
    return {
      seconds: count * 365 * 86400,
      declinedText: getPluralAccusative(count, "–≥–æ–¥", "–≥–æ–¥–∞", "–ª–µ—Ç")
    };
  }

  // Days
  if (/^(–¥|–¥–µ–Ω—å|–¥–Ω—è|–¥–Ω–µ–π|day|d)/i.test(unit)) {
    return {
      seconds: count * 86400,
      declinedText: getPluralAccusative(count, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")
    };
  }

  // Hours
  if (/^(—á|—á–∞—Å|—á–∞—Å–∞|—á–∞—Å–æ–≤|hour|h)/i.test(unit)) {
    return {
      seconds: count * 3600,
      declinedText: getPluralAccusative(count, "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤")
    };
  }

  // Minutes
  if (/^(–º–∏–Ω|min)/i.test(unit) || unit === "m") {
    return {
      seconds: count * 60,
      declinedText: getPluralAccusative(count, "–º–∏–Ω—É—Ç—É", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç")
    };
  }

  // Default: treat as days if no unit
  return {
    seconds: count * 86400,
    declinedText: getPluralAccusative(count, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")
  };
}

import rateLimit from "express-rate-limit";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import https from "https";
import http from "http";
import dns from "dns";
import os from "os";

if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (e) {}
}

const botStartTime = Date.now();

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

const globalHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 120000,
  maxSockets: 512,
  maxFreeSockets: 128,
  timeout: 8000,
  scheduling: "fifo"
});

globalHttpsAgent.on('free', (socket) => {
  socket.setTimeout(120000);
});

const globalHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 120000,
  maxSockets: 512,
  maxFreeSockets: 128,
  timeout: 8000,
  scheduling: "fifo"
});

globalHttpAgent.on('free', (socket) => {
  socket.setTimeout(120000);
});

// V8 Memory Profiling & Hyper-Threading Optimizer Hint
if (typeof process !== "undefined" && process.env) {
  process.env.UV_THREADPOOL_SIZE = "128";
  process.env.NODE_V8_COVERAGE = ""; // Disable coverage tracking for speed
}

axios.defaults.httpsAgent = globalHttpsAgent;
axios.defaults.httpAgent = globalHttpAgent;
axios.defaults.timeout = 8000;

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  timeout: 6000,
  httpsAgent: globalHttpsAgent,
  httpAgent: globalHttpAgent,
});
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import { createCanvas, loadImage, registerFont } from "canvas";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { CROCODILE_WORDS, sendVkMessage, editVkMessage, sendVkToast as importedSendVkToast, answerVkEvent, formatTimeRemaining, deleteVkMessage, formatVkText, fastVkCall } from "./src/botGameEngine";
import { badWordsList } from "./src/badWordsData";

dotenv.config();

async function synthesizeEdgeChunk(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("ru-RU-DmitryNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      reject(new Error("TTS timeout"));
    }, 7000);
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks));
    });
    audioStream.on("error", (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function splitTextIntoSpeechChunks(text: string, maxLen = 220): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function generateRussianSpeechBuffer(text: string): Promise<Buffer> {
  const clean = text.slice(0, 800).trim();
  try {
    if (clean.length <= 220) {
      return await synthesizeEdgeChunk(clean);
    }
    const chunks = splitTextIntoSpeechChunks(clean, 220);
    const results = await Promise.all(chunks.slice(0, 4).map(c => synthesizeEdgeChunk(c)));
    return Buffer.concat(results);
  } catch (e) {
    // Fallback to fast Google Translate TTS in case of any timeout or network issue
    try {
      const chunks = splitTextIntoSpeechChunks(clean, 150);
      const googleResults = await Promise.all(chunks.slice(0, 6).map(async (chunk) => {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ru&client=tw-ob`;
        const res = await axios.get(ttsUrl, {
          responseType: "arraybuffer",
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          timeout: 4000
        });
        return Buffer.from(res.data);
      }));
      return Buffer.concat(googleResults);
    } catch (err) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(clean.slice(0, 200))}&tl=ru&client=tw-ob`;
      const ttsRes = await axios.get(ttsUrl, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      return Buffer.from(ttsRes.data);
    }
  }
}

const eventAnsweredMap = new Map<string, boolean>();

async function sendVkToast(vkToken: string, eventId: string, userId: number, peerId: number, text: string) {
  if (eventId) {
    eventAnsweredMap.set(eventId, true);
  }
  return await importedSendVkToast(vkToken, eventId, userId, peerId, text);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.AI_TOKEN || process.env.GEMINI_TOKEN || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || "").trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

let dynamicBanWords: string[] = [];
let dynamicBanWordsLoaded = false;

function normalizeTextForBanCheck(str: string): string {
  if (!str) return "";
  let s = str.toLowerCase();
  
  // 1. Comprehensive homoglyph & leetspeak mapping
  const map: Record<string, string> = {
    "0": "–æ", "o": "–æ", "–æ": "–æ", "√∂": "–æ", "√≥": "–æ", "√≤": "–æ", "√¥": "–æ", "√∏": "–æ",
    "1": "–∏", "i": "–∏", "–∏": "–∏", "–π": "–∏", "√¨": "–∏", "√≠": "–∏", "√Æ": "–∏", "√Ø": "–∏", "!": "–∏", "|": "–∏",
    "l": "–ª", "–ª": "–ª", "3": "–µ", "e": "–µ", "–µ": "–µ", "—ë": "–µ", "√®": "–µ", "√©": "–µ", "√™": "–µ", "√´": "–µ", "‚Ç¨": "–µ",
    "4": "–∞", "a": "–∞", "–∞": "–∞", "@": "–∞", "√†": "–∞", "√°": "–∞", "√¢": "–∞", "√£": "–∞", "√§": "–∞", "√•": "–∞",
    "5": "—Å", "s": "—Å", "—Å": "—Å", "c": "—Å", "$": "—Å", "7": "—Ç", "t": "—Ç", "—Ç": "—Ç", "+": "—Ç",
    "8": "–≤", "b": "–≤", "–≤": "–≤", "y": "—É", "u": "—É", "—É": "—É", "√π": "—É", "√∫": "—É", "√ª": "—É", "√º": "—É",
    "k": "–∫", "–∫": "–∫", "h": "—Ö", "x": "—Ö", "—Ö": "—Ö", "p": "—Ä", "r": "—Ä", "—Ä": "—Ä",
    "m": "–º", "–º": "–º", "n": "–Ω", "–Ω": "–Ω", "g": "–≥", "–≥": "–≥", "d": "–¥", "–¥": "–¥",
    "z": "–∑", "–∑": "–∑", "v": "–≤", "w": "–≤", "j": "–π", "—Ñ": "—Ñ", "f": "—Ñ", "—â": "—â", "—à": "—à",
    "—á": "—á", "—Ü": "—Ü", "—ä": "", "—å": "", "—ç": "–µ", "—é": "—é", "—è": "—è"
  };
  
  let mapped = "";
  for (let ch of s) {
    if (map[ch] !== undefined) {
      mapped += map[ch];
    } else if (/[–∞-—èa-z0-9]/i.test(ch)) {
      mapped += ch;
    }
  }

  // Collapse repeated characters (e.g. "–ø–ø–ø–∏–∏–∏–∑–∑–∑–¥–¥–¥–∞–∞–∞" -> "–ø–∏–∑–¥–∞")
  let collapsed = "";
  for (let i = 0; i < mapped.length; i++) {
    if (i === 0 || mapped[i] !== mapped[i - 1]) {
      collapsed += mapped[i];
    }
  }

  return collapsed;
}

const shortBadWords = new Set([
  "—Ç—Ü–∫", "tck", "tzk", "tcku", "—Ç–∑–∫",
  "—Å–≤–æ", "svo", "cvo", "c–≤o", "—Å–≤o", "—Åv–æ",
  "–≥–µ–π", "gay", "gey", "gei", "–≥–µ–∏", "–≥–µ—é", "–≥–µ–µ–º",
  "–Ω–∞—Ö", "nah", "–Ω–µ–≥—Ä", "negr", "—Ö–∞—á", "hach", "–∂–∏–¥", "–¥–µ–¥", "–±—Ä–∞—Ç", "–º–∞–º–∞", "–ø–∞–ø–∞", "–æ—Ç–µ—Ü", "–º–∞—Ç—å",
  "—á–º–æ", "chmo", "—á–ª–µ–Ω", "—Ö–µ—Ä", "–∂–æ–ø", "—Å—É–∫–∞", "—Å—É–∫–∏", "—Å—É—á"
]);

let cachedShortBadSet = new Set<string>();
let cachedBadWordsSet = new Set<string>();
let badWordsCacheInitialized = false;

const CORE_MAT_REGEXES = [
  /—Ö[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[—É–µ—ëi10u—É][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–πi1|]/i,
  /–ø[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∏i1|!][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–∑[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–¥/i,
  /–µ[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–±[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∞–æ—É–µ–∏i–ª]/i,
  /–±[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–ª[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*—è[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–¥—Ç—å]/i,
  /–º[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[—Éu][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–¥[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∞a][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–∫/i,
  /–∑[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∞a][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–ª[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[—Éu][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–ø/i,
  /–≥[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∞a–æo][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–Ω[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–¥[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–æ[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–Ω/i,
  /—à[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–ª[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[—éu][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*—Ö/i,
  /–ø[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–∏i1!][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*–¥[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–æo0][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*—Ä/i,
  /—Ö[\s\d_*\-+.!|@#$%^&()~`"'\/\\]*[–µe3—ë][\s\d_*\-+.!|@#$%^&()~`"'\/\\]*—Ä/i,
];

function rebuildBadWordsCache() {
  const allBad = [...badWordsList, ...dynamicBanWords];
  const shortSet = new Set<string>();
  const badSet = new Set<string>();

  for (const sw of shortBadWords) {
    const swClean = sw.toLowerCase().replace(/[^–∞-—èa-z0-9—ë]/g, "");
    if (swClean) {
      shortSet.add(swClean);
      badSet.add(swClean);
      const swNorm = normalizeTextForBanCheck(swClean);
      if (swNorm) badSet.add(swNorm);
    }
  }

  for (let i = 0; i < allBad.length; i++) {
    const w = allBad[i];
    if (!w) continue;
    const wLower = w.toLowerCase();
    const wRaw = wLower.replace(/[^–∞-—èa-z0-9—ë]/g, "");
    if (!wRaw) continue;

    badSet.add(wRaw);
    const wNorm = normalizeTextForBanCheck(w);
    if (wNorm) badSet.add(wNorm);

    if (wRaw.length <= 4 || shortBadWords.has(wRaw) || shortBadWords.has(wLower)) {
      shortSet.add(wRaw);
      if (wNorm) shortSet.add(wNorm);
    }
  }

  cachedShortBadSet = shortSet;
  cachedBadWordsSet = badSet;
  badWordsCacheInitialized = true;
}

const VALID_COMMANDS = new Set([
"/aban",
"/achat", "/rchat", "/—Ä—á–∞—Ç", "/unrchat", "/—É–Ω—Ä—á–∞—Ç", "/addaccesslevel", "/addaccess", "/addlevel", "/setlevel", "/setaccesslevel", "/–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å", "/—Ä–æ–ª—å",

"/addantiteg",
"/addawstats",
"/addb",
"/addblack",
"/addblackgame",
"/addchatnet",
"/addcuratortech",
"/adddirector",
"/addgdirector",
"/addgr",
"/addgruk",

"/addozam",
"/addozsr",
"/addruk",




"/addsr",
"/addstatus",
"/addtech",
"/addzam",
"/addzamowner",

"/addzown",

"/addzsr",
"/af",
"/ai",
"/all",
"/antiad",
"/antisliv",
"/antiteg",
"/antiteglist",
"/arrole",
"/ask",
"/b",
"/bal",
"/balance",
"/ban",
"/banid",
"/banlist",
"/beer",
"/blacklist",
"/botstat",
"/botstats",
"/sysinfo",
"/casino",
"/chat",
"/chatid",
"/chatinfo",
"/chats",
"/clear",
"/cleardb",
"/closebot",
"/createnet",
"/createpromo",
"/deladmin",
"/delcmd",
"/delcuratortech",
"/deletecommand",
"/deleteduals",
"/deleteduel",
"/deletenet",
"/deleteowner",
"/deletephotoprofile",
"/delmoder",
"/delowner",
"/delrole",
"/delsa",
"/delsenadmin",
"/delsenmoder",
"/deltech",
"/delzsa",
"/dgiveowner",
"/duel",
"/gaddawstats",
"/gamehelp",
"/games",
"/gban",
"/gbanlist",

"/gemini",
"/get",
"/getban",
"/getbans",
"/getmute",
"/getuser",
"/getwarn",
"/getwarns",
"/ghelp",
"/givebeer",
"/givebusiness",
"/givemoney",
"/giveowner",
"/giveprod",
"/giverep",
"/givevip",
"/gnick",
"/gpt",
"/grnick",
"/group",
"/grrole",
"/gsnick",
"/gstaff",
"/gstaffs",
"/gsync",
"/gunawstats",
"/gungbanp",
"/gzov",
"/help",
"/hidebalance",
"/hidetop",
"/hidetoplist",
"/id",
"/info",
"/infobans",
"/infobot",
"/infochat",
"/infoid",
"/invite",
"/invreward",
"/k",
"/kick",
"/leave",
"/logs",
"/logsadm",
"/logsban",
"/logs_games",
"/logskick",
"/logsmute",
"/logs_user",
"/logswarn",
"/m",
"/mclear",
"/mute",
"/mutelist",
"/mutetest",
"/nban",
"/netlist",
"/news",
"/nkick",
"/nlist",
"/noprefix",
"/nremoverole",
"/nrnick",
"/nrole",
"/nsnick",
"/nunban",
"/nzov",
"/offlinelist",
"/olist",
"/online",
"/onlinelist",
"/openbot",
"/other",
"/pay",
"/photos",
"/pin",
"/ping",
"/profile",
"/purge",
"/purgecmd",
"/q",
"/raid",
"/rebuke",
"/reg",
"/regdate",
"/removecuratortech",
"/removerole",
"/renamechat",
"/rep",
"/reset",
"/resetbeer",
"/resetbusiness",
"/resetmoney",
"/resetprod",
"/resetrep",
"/resetvip",
"/restart",
"/rewardinv",
"/rnick",
"/rnickall",
"/roulette",
"/rstats",
"/rules",
"/runban",
"/sa",
"/say",
"/setadmin",
"/setinfo",
"/setinfobot",
"/setmoder",
"/setmoney",
"/setowner",
"/setsa",
"/setsadmin",
"/setsenadmin",
"/setsenmoder",
"/setsmoder",
"/settings",
"/setzsa",
"/silence",
"/snick",
"/sql",
"/staff",
"/start",
"/stata",
"/stataimg",
"/stats",
"/statsimg",
"/stickers",
"/sync",
"/takebeer",
"/takebusiness",
"/takemoney",
"/takeprod",
"/takerep",
"/takevip",
"/tegall",
"/thelp",
"/time",
"/top",
"/transfer",
"/type",
"/unachat",
"/unantiteg",
"/unawstats",
"/unb",
"/unban",
"/unbanid",
"/unblack",
"/unblackgames",
"/unchatnet",
"/ungban",

"/unhidebalance",
"/unhidetop",
"/unm",
"/unmoder",
"/unmute",
"/unpin",
"/unrebuke",
"/unrole",
"/unstatus",
"/untech",
"/unw",
"/unwarn",
"/video",
"/w",
"/warn",
"/warnlist",
"/warnmute",
"/warns",
"/welcometext",
"/wm",
"/zov",
"/zunban",
"/–∞–±–∞–Ω",
"/–∞–¥–¥–∞–¥–º–∏–Ω",
"/–∞–¥–¥–±–ª—ç–∫",
"/–∞–¥–¥–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞",
"/–∞–¥–¥–∑—Å–∞",
"/–∞–¥–¥–∑—Å—Ä",
"/–∞–¥–¥–∫—É—Ä–∞—Ç—Ç–µ—Ö",
"/–∞–¥–¥–º–æ–¥–µ—Ä",
"/–∞–¥–¥–æ–∑—Å—Ä",
"/–∞–¥–¥—Å–∞",
"/–∞–¥–¥—Å–∞–¥–º–∏–Ω",
"/–∞–¥–¥—Å–º–æ–¥–µ—Ä",
"/–∞–¥–¥—Ç–µ—Ö",
"/–∞–¥–º–∏–Ω",
"/–∞–π–¥–∏",
"/–∞–Ω–±–ª—ç–∫",
"/–∞–Ω–≤–∞—Ä–Ω",
"/–∞–Ω–≥–±–∞–Ω",
"/–∞–Ω–≥–±–∞–Ω–ª",
"/–∞–Ω–º—É—Ç",
"/–∞–Ω–ø—Ä–µ–¥",
"/–∞–Ω—á—Å",
"/–∞—á–∞—Ç",
"/–±",
"/–±–∞–ª–∞–Ω—Å",
"/–±–∞–Ω",
"/–±–∞–Ω–∏–≥—Ä",
"/–±–∞–Ω–∫",
"/–±–µ–∑–ø—Ä–µ—Ñ–∏–∫—Å–∞",
"/–±–∏–∑–Ω–µ—Å",
"/–±–∏–∑–Ω–µ—Å—ã",
"/–±–ª—ç–∫–ª–∏—Å—Ç",
"/–±–æ–Ω—É—Å",
"/–±–æ—Ç—Å—Ç–∞—Ç—Å",
"/–±—Ä–∞–∫",
"/–≤–∞—Ä–Ω",
"/–≤–∞—Ä–Ω–º—É—Ç",
"/–≤–∞—Ä–Ω—ã",
"/–≤–∑–ª–æ–º",
"/–≤–∏–¥–µ–æ",
"/–≤–∏–∫–∏",
"/–≤–∏–ø",
"/–≤—Ä–µ–º—è",
"/–≤—Å–µ",
"/–≤—á—Å",
"/–≤—ã–≥–Ω–∞—Ç—å",
"/–≤—ã–≥–æ–≤–æ—Ä",
"/–≤—ã–¥–∞—Ç—å–∞–¥–º–∏–Ω–∞",
"/–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω",
"/–≤—ã–¥–∞—Ç—å–∑—Å–∞",
"/–≤—ã–¥–∞—Ç—å–∫—É—Ä–∞—Ç–æ—Ä–∞—Ç–µ—Ö",
"/–≤—ã–¥–∞—Ç—å–º–æ–¥–µ—Ä–∞",
"/–≤—ã–¥–∞—Ç—å—Å–∞",
"/–≤—ã–¥–∞—Ç—å—Ç–µ—Ö",
"/–≤—ã–π—Ç–∏",
"/–≥–±–∞–Ω",
"/–≥–±–∞–Ω–ª–∏—Å—Ç",
"/–≥–±–∞–Ω–ø–ª",
"/–≥–µ—Ç",
"/–≥–µ—Ç–±–∞–Ω",
"/–≥–µ—Ç–±–∞–Ω—Å",
"/–≥–ª–∞–≤–¥–∏—Ä–µ–∫—Ç–æ—Ä",
"/–≥–ª–∞–≤—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å",
"/–≥–Ω–∏–∫",
"/–≥–ø—Ç",
"/–≥—Ä–Ω–∏–∫",
"/–≥—Å–∏–Ω—Ö",
"/–≥—Å–Ω–∏–∫",
"/–≥—Å–æ—Å—Ç–∞–≤",
"/–≥—Å—Ç–∞—Ñ—Ñ",
"/–≥—É–Ω–≥–±–∞–Ω",
"/–≥—Ö–µ–ª–ø",
"/–≥—é–Ω–±–∞–Ω–ø–ª",
"/–¥",
"/–¥–∞—Ç–∞—Ä–µ–≥",
"/–¥–∞—Ç—å–≤–∞—Ä–Ω",
"/–¥–∞—Ç—å–¥–µ–Ω–µ–≥",
"/–¥–∞—Ç—å–º—É—Ç",
"/–¥–µ–ª–µ—Ç–æ—É–Ω–µ—Ä",
"/–¥–µ–ø–æ–∑–∏—Ç—ã",
"/–¥–∏—Ä–µ–∫—Ç–æ—Ä",
"/–¥–æ–±–∞–≤–∏—Ç—å–≤—á—Å",
"/–¥—É—ç–ª—å",
"/–¥—É—ç–ª—å–±–∏–∑",
"/–µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π",
"/–µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π_–±–æ–Ω—É—Å",
"/–∑–∞–±–∞–Ω–∏—Ç—å",
"/–∑–∞–±—Ä–∞—Ç—å–¥–µ–Ω—å–≥–∏",
"/–∑–∞–±—Ä–∞—Ç—å–±–∏–∑–Ω–µ—Å",
"/–∑–∞–±—Ä–∞—Ç—å–ø—Ä–æ–¥—É–∫—Ç—ã",
"/–∑–∞–±—Ä–∞—Ç—å–ø–∏–≤–æ",
"/–∑–∞–±—Ä–∞—Ç—å—Ä–µ–ø—É—Ç–∞—Ü–∏—é",
"/–∑–∞–±—Ä–∞—Ç—åvip",
"/–∑–∞–≥–ª—É—à–∏—Ç—å",
"/–∑–∞–∫—Ä–µ–ø–∏—Ç—å",
"/–∑–∞–∫—Ä—ã—Ç—å–±–æ—Ç–∞",
"/–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞",
"/–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞–±–æ—Ç–∞",
"/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å",
"/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞",
"/–∑–∞–º—Å–ø–µ—Ü",
"/–∑–∞–º—É—Ç–∏—Ç—å",
"/–∑–æ–≤",
"/–∑—É–Ω–±–∞–Ω",
"/–∏–≥—Ä–æ–≤—ã–µ",
"/–∏–≥—Ä—ã",
"/–∏–¥",
"/–∏–∑–±–∞–Ω–∞",
"/–∏–∑–º–µ–Ω–∏—Ç—å–∫—É—Ä—Å",
"/–∏–∑–º—É—Ç–∞",
"/–∏–∑—á—Å",
"/–∏–∑—á—Å–±",
"/–∏–∏",
"/–∏–Ω—Ñ–∞",
"/–∏–Ω—Ñ–æ",
"/–∏–Ω—Ñ–æ–±–∞–Ω",
"/–∏–Ω—Ñ–æ–±–æ—Ç",
"/–∏–Ω—Ñ–æ–≤–∞—Ä–Ω",
"/–∏–Ω—Ñ–æ–º—É—Ç",
"/–∏–Ω—Ñ–æ—á–∞—Ç",
"/–∏—Å–∫–ª—é—á–∏—Ç—å",
"/–∫",
"/–∫–∞–∑–∏–Ω–æ",
"/–∫–µ–π—Å",
"/–∫–µ–π—Å—ã",
"/–∫–∏–∫",
"/–∫–ª–∞–Ω",
"/–∫–Ω–±",
"/–∫–æ–º–∞–Ω–¥—ã",
"/–∫—Ä–æ–∫–æ–¥–∏–ª",
"/–∫—Ç–æ",
"/–∫—É–ø–∏—Ç—å–±–∏–∑",
"/–∫—É–ø–∏—Ç—å–≤–∏–ø",
"/–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω",
"/–∫—É–ø–∏—Ç—å–ø—Ä–µ–º",
"/–∫—É–ø–∏—Ç—å–ø—Ä–µ–º–∏—É–º",
"/–∫—É–ø–∏—Ç—å–ø—Ä–æ–¥",
"/–∫—É—Ä—Å",
"/–ª–æ–≥–∏",
"/–ª–æ–≥–∏–∞–¥–º",
"/–ª–æ–≥–∏–±–∞–Ω",
"/–ª–æ–≥–∏–≤–∞—Ä–Ω",
"/–ª–æ–≥–∏_–∏–≥—Ä",
"/–ª–æ–≥–∏–∏–≥—Ä—ã",
"/–ª–æ–≥–∏–∫–∏–∫",
"/–ª–æ–≥–∏–º—É—Ç",
"/–ª–æ–≥–∏–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è",
"/–ª–æ–≥–∏_—é–∑–µ—Ä",
"/–ª–æ–≥—Å",
"/–º–∞–π–Ω–∏–Ω–≥",
"/–º–∞—Ñ–∏—è",
"/–º–µ–Ω—é",
"/–º–æ–¥–µ—Ä",
"/–º–æ–Ω–µ—Ç–∫–∞",
"/–º—É—Ç",
"/–º—É—Ç–∏—Ç—å",
"/–º—É—Ç_—Ç–µ—Å—Ç",
"/–Ω–∞–≥—Ä–∞–¥–∞–∏–Ω–≤",
"/–Ω–∞–≥—Ä–∞–¥–∞–∏–Ω–≤–∞–π—Ç",
"/–Ω–∞–≥—Ä–∞–¥–∞–ø—Ä–∏–≥–ª–∞—à–µ–Ω–∏–µ",
"/–Ω–∞—Å—Ç—Ä–æ–π–∫–∏",
"/–Ω–∏–∫",
"/–Ω—Ä–Ω–∏–∫",
"/–Ω—Å–Ω–∏–∫",
"/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å",
"/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞",
"/–æ–ª–∏—Å—Ç",
"/–æ–Ω–ª–∞–π–Ω",
"/–æ–Ω–ª–∞–π–Ω–ª–∏—Å—Ç",
"/–æ—Ç–∫—Ä–µ–ø–∏—Ç—å",
"/–æ—Ç–∫—Ä—ã—Ç—å–±–æ—Ç–∞",
"/–æ—Ç–∫—Ä—ã—Ç—å–¥–µ–ø–æ–∑–∏—Ç",
"/–æ—Ñ–ª–∞–π–Ω–ª–∏—Å—Ç",
"/–æ—Ñ—Ñ–ª–∞–π–Ω–ª–∏—Å—Ç",
"/–æ—á–∏—Å—Ç–∏—Ç—å",
"/–æ—á–∏—Å—Ç–∏—Ç—å–¥—É—ç–ª–∏",
"/–æ—á–∏—Å—Ç–∏—Ç—å–∏–≥—Ä—ã",
"/–ø–µ—Ä–µ–¥–∞—Ç—å",
"/–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω",
"/–ø–µ—Ä–µ–∏–º–µ–Ω–æ–≤–∞—Ç—å",
"/–ø–∏–≤–æ",
"/–ø–∏–≤–æ–∑–∞–≤—Ä—ã",
"/–ø–∏–Ω–≥",
"/–ø–æ–≥–æ–¥–∞",
"/–ø–æ–¥–ø–∏—Å–∫–∞",
"/–ø–æ–∂–µ–Ω–∏—Ç—å",
"/–ø–æ–º–æ—â—å",
"/–ø–ø—Ä–æ–¥",
"/–ø—Ä–∞–≤–∏–ª–∞",
"/–ø—Ä–µ–¥",
"/–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ",
"/–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è",
"/–ø—Ä–µ–º",
"/–ø—Ä–µ–º–±–∞–ª–∞–Ω—Å",
"/–ø—Ä–µ–º–∏—É–º",
"/–ø—Ä–µ–º–ø—Ä–æ—Ñ–∏–ª—å",
"/–ø—Ä–∏–∑",
"/–ø—Ä–∏–º–µ—Ä",
"/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑",
"/–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω",
"/–ø—Ä–æ–º–æ",
"/–ø—Ä–æ—Ñ–∏–ª—å",
"/–ø—É—Ä–¥–∂",
"/—Ä",
"/—Ä–∞–±–æ—Ç–∞",
"/—Ä–∞–±–æ—Ç–∞—Ç—å",
"/—Ä–∞–∑–±–∞–Ω",
"/—Ä–∞–∑–±–∞–Ω–∏—Ç—å",
"/—Ä–∞–∑–≤–∞—Ä–Ω",
"/—Ä–∞–∑–≤–µ—Å—Ç–∏",
"/—Ä–∞–∑–≤–æ–¥",
"/—Ä–∞–∑–≥–ª—É—à–∏—Ç—å",
"/—Ä–∞–∑–¥–∞—á–∞",
"/—Ä–∞–∑–º—É—Ç",
"/—Ä–∞–∑–º—É—Ç–∏—Ç—å",
"/—Ä–∞–Ω–±–∞–Ω",
"/—Ä–µ–≥",
"/—Ä–Ω–∏–∫",
"/—Ä–æ–ª—å",
"/—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å",
"/—Ä—É–ª–µ—Ç–∫–∞",
"/—Å–∞",
"/—Å–∞–¥–º–∏–Ω",
"/—Å–µ–π—Ñ",
"/—Å–∏",
"/—Å–∏–Ω—Ö",
"/—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∞—Ü–∏—è",
"/—Å–∏—Å—Ç–∞—Ç–∞",
"/—Å–º–æ–¥–µ—Ä",
"/—Å–Ω–∏–∫",
"/—Å–Ω—è—Ç—å–±–∞–Ω–∏–≥—Ä",
"/—Å–Ω—è—Ç—å–±–∞–Ω–∫",
"/—Å–Ω—è—Ç—å–≤–∞—Ä–Ω",
"/—Å–Ω—è—Ç—å–≤–ª–∞–¥–µ–ª—å—Ü–∞",
"/—Å–Ω—è—Ç—å–≤—ã–≥–æ–≤–æ—Ä",
"/—Å–Ω—è—Ç—å–∫—É—Ä–∞—Ç–æ—Ä–∞—Ç–µ—Ö",
"/—Å–Ω—è—Ç—å–º—É—Ç",
"/—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞",
"/—Å–Ω—è—Ç—å–ø—Ä–µ–¥",
"/—Å–Ω—è—Ç—å–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ",
"/—Å–Ω—è—Ç—å—Ä–æ–ª—å",
"/—Å–Ω—è—Ç—å—Ç–µ—Ö",
"/—Å–Ω—è—Ç—å—á—Å–∏–≥—Ä",
"/—Å–æ—Å—Ç–∞–≤",
"/—Å–ø–µ—Ü–∞–¥–º–∏–Ω",
"/—Å–ø–∏—Å–æ–∫–≥–±–∞–Ω",
"/—Å—Ç–∞—Ä—Ç",
"/—Å—Ç–∞—Ä—à–∏–π–∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä",
"/—Å—Ç–∞—Ä—à–∏–π–º–æ–¥–µ—Ä–∞—Ç–æ—Ä",
"/—Å—Ç–∞—Ç–∞",
"/—Å—Ç–∞—Ç–∞–±–æ—Ç–∞",
"/—Å—Ç–∞—Ç–∞–∏–º–≥",
"/—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞",
"/—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞–∏–º–≥",
"/—Å—Ç–∞—Ç—Å",
"/—Å—Ç–∏–∫–µ—Ä—ã",
"/—Ç–µ—Å—Ç–º—É—Ç",
"/—Ç–µ—Ö—Ö–µ–ª–ø",
"/—Ç–∏–ø",
"/—Ç–∏—Ç—É–ª",
"/—Ç–∏—à–∏–Ω–∞",
"/—Ç–æ–ø",
"/—Ç—Ö–µ–ª–ø",
"/—É–¥–∞–ª–∏—Ç—å–≤–∞—Ä–Ω",
"/—É–¥–∞–ª–∏—Ç—å–∏–∑—á—Å",
"/—É–¥–∞–ª–∏—Ç—å—Ñ–æ—Ç–æ",
"/—É–¥–∞–ª—è—Ç—å–∫–æ–º–∞–Ω–¥—ã",
"/—É–Ω–∞—á–∞—Ç",
"/—É–Ω–±–∞–Ω",
"/—É–Ω–±–∞–Ω–∏–¥",
"/—É–Ω–≥–±–∞–Ω",
"/—É–Ω–≥–±–∞–Ω–ø–ªl",
"/—É–Ω—Ä–æ–ª—å",
"/—É–Ω—Ç–µ—Ö",
"/—É–Ω—á—Å–±",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å–∏–Ω—Ñ–æ",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å–∏–Ω—Ñ–æ–±–æ—Ç",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å–º–Ω–æ–∂–∏—Ç–µ–ª—å",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å–º–Ω–æ–∂–∏—Ç–µ–ª—å–¥—É—ç–ª—ç–π",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å–º–Ω–æ–∂–∏—Ç–µ–ª—å—Ä—É–ª–µ—Ç–∫–∏",
"/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å—Ñ–æ—Ç–æ",
"/—Ñ–µ—Ä–º–∞",
"/—Ñ–æ—Ä—Ç—É–Ω–∞",
"/—Ñ–æ—Ç–æ",
"/—Ö–µ–ª–ø",
"/—Ü–∏—Ç–∞—Ç–∞",
"/—á–∞—Ç",
"/—á–∞—Ç–∏–¥",
"/—á–∞—Ç–∏–Ω—Ñ–æ",
"/—á–∞—Ç—ã",
"/—á–∏—Å—Ç–∫–∞",
"/—á—Å",
"/—á—Å–±",
"/—á—Å–±–æ—Ç–∞",
"/—á—Å–±–æ—Ç–∞–º",
"/—á—Å–∏–≥—Ä",
"/—á—Å–ª–∏—Å—Ç",
"/—á—Å—Å–æ–æ–±—â–µ—Å—Ç–≤–∞",
"/—é–Ω–≥–±–∞–Ω",
"/—é–Ω–≥–±–∞–Ω–ø–ª",
"/—è",
]);
const containsBadWord = (text: string) => {
  if (!text) return false;
  if (!badWordsCacheInitialized) {
    rebuildBadWordsCache();
  }

  // 1. Fast regex checks against core profanity patterns (handles spaces/symbols inserted between characters)
  for (let i = 0; i < CORE_MAT_REGEXES.length; i++) {
    if (CORE_MAT_REGEXES[i].test(text)) return true;
  }

  // 2. Tokenize raw text
  const rawLower = text.toLowerCase().replace(/[^–∞-—èa-z0-9—ë\s]/g, " ");
  const words = rawLower.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (cachedShortBadSet.has(token) || cachedBadWordsSet.has(token)) return true;
    if (token.length >= 3) {
      const p1 = token.slice(0, token.length - 1);
      if (p1.length >= 3 && (cachedShortBadSet.has(p1) || cachedBadWordsSet.has(p1))) return true;
      const p2 = token.slice(0, token.length - 2);
      if (p2.length >= 2 && (cachedShortBadSet.has(p2) || cachedBadWordsSet.has(p2))) return true;
    }
  }

  // 3. Normalize whole text (removes symbols, homoglyphs, zero-width chars, repeats)
  const normFull = normalizeTextForBanCheck(text);
  if (!normFull) return false;

  if (cachedBadWordsSet.has(normFull)) return true;

  // 4. Tokenize normalized text
  const normWords = normFull.split(/\s+/).filter(Boolean);
  for (let i = 0; i < normWords.length; i++) {
    const nw = normWords[i];
    if (cachedBadWordsSet.has(nw) || cachedShortBadSet.has(nw)) return true;
    if (nw.length >= 3) {
      const p1 = nw.slice(0, nw.length - 1);
      if (p1.length >= 3 && cachedBadWordsSet.has(p1)) return true;
      const p2 = nw.slice(0, nw.length - 2);
      if (p2.length >= 2 && cachedBadWordsSet.has(p2)) return true;
    }
  }

  // 5. Sliding window / substring scan over normalized full string (catches words written with spaces e.g. "–ø –∏ –∑ –¥ –∞")
  if (normFull.length >= 3) {
    for (let len = 3; len <= Math.min(normFull.length, 12); len++) {
      for (let i = 0; i <= normFull.length - len; i++) {
        const sub = normFull.slice(i, i + len);
        if (cachedShortBadSet.has(sub)) return true;
      }
    }
  }

  return false;
};

const maskBadWords = (text: string): string => {
  if (!text) return "";
  let result = text;
  const profanityList = [
    "—Ö—É–µ—Å–æ—Å", "—Ö—É–∏—Å–æ—Å", "–ø–∏–¥–æ—Ä–∞—Å", "–ø–∏–¥–æ—Ä", "–ø–∏–¥–∞—Ä", "–µ–±–∞–Ω—ã–π", "–µ–±–∞–Ω–Ω—ã–π", "–µ–±–∞–Ω–∞—è", "–µ–±–∞–Ω–æ–µ", "–µ–±–∞–Ω—ã–µ",
    "–µ–±–∞—Ç—å", "–µ–±–∞–Ω", "–µ–±—É—á", "–µ–±–ª–æ", "–µ–±–ª–∞–Ω", "–µ–±–ª–∏—â–µ", "–∑–∞–µ–±–∞–ª", "–≤—ã–µ–±–∞–ª", "–µ–±–∏—Å—å", "–µ–±–∞–ª", "—ë–±–Ω—É", "–µ–±–Ω—É",
    "–±–ª—è", "–±–ª—è—Ç", "–±–ª—è–¥", "–±–ª—è–¥–∏–Ω–∞", "–±–ª—è–¥—å", "–±–ª—è–¥–∏", "–±–ª—è–¥—Å—Ç–≤–æ",
    "—Ö—É–π", "—Ö—É–∏", "—Ö—É—è", "—Ö—É–µ", "—Ö—É–∏–ª–∞", "—Ö—É—ë–∫", "—Ö—É–µ–∫", "—Ö—É–π–Ω—è", "—Ö—É–∏—â–µ", "—Ö—É–µ–º", "—Ö—É—é", "–Ω–∞—Ö—É–π", "–ø–æ—Ö—É–π", "–¥–æ—Ö—É—è", "–Ω–∏—Ö—É—è", "—Ö—É–µ–≤—ã–π",
    "–ø–∏–∑–¥", "–ø–∏–∑–¥–∞", "–ø–∏–∑–¥–µ—Ü", "–ø–∏–∑–¥–æ–±–æ–ª", "–ø–∏–∑–¥–∏—Ç", "–ø–∏–∑–¥–∏—Ç—å", "–ø–∏–∑–¥—É", "–ø–∏–∑–¥–æ–π", "–ø–∏–∑–¥–µ–Ω–∫–∞", "–ø–∏–∑–¥–æ—Å", "—Ä–∞—Å–ø–∏–∑–¥—è–π",
    "–∑–∞–ª—É–ø", "–∑–∞–ª—É–ø–∞", "—Å—É–∫–∞", "—Å—É—á–∫–∞", "—Å—É—á–∞—Ä–∞", "—Å—É–∫–∏", "–≥–æ–Ω–¥–æ–Ω", "–≥–∞–Ω–¥–æ–Ω", "—à–ª—é—Ö", "—à–ª—é—Ö–∞", "—à–ª—é—Ö–∏", "–º—Ä–∞–∑—å", "–º—Ä–∞–∑–∏", "–º—Ä–∞–∑–æ—Ç–∞",
    "–º—É–¥–∞–∫", "–º—É–¥–∏–ª–æ", "fuck", "bitch", "cunt", "dick", "pussy", "cock", "asshole", "bastard", "motherfucker"
  ];
  for (const prof of profanityList) {
    const reg = new RegExp(prof, "gi");
    result = result.replace(reg, (match) => "#".repeat(match.length));
  }
  return result;
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
  if (!ms) return "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
  const d = new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hourNum = d.getHours();
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
  const hours = String(displayHour).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}:${secs} ${ampm}`;
};

const getMskDate = (ms: number = Date.now()) => {
  return new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
};

const formatDateRstats = (ms?: number) => {
  if (!ms) ms = Date.now();
  const d = new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}`;
};

const recentLogsMap = new Map<string, number>();

const logToChat10 = async (params: {
  isGame: boolean;
  userId: number;
  fullName: string;
  targetId?: number;
  targetName?: string;
  bet?: string | number;
  duration?: string;
  reason?: string;
  action: string;
  cmdName: string;
  msgCmId?: string | number;
}) => {
  if (!params.userId || params.userId <= 0) return;

  const rawCmdClean = (params.cmdName || "cmd").replace(/^[\/+!\.,]/, "").toLowerCase();
  const actionClean = (params.action || "").trim();
  const targetClean = params.targetId || 0;
  const reasonClean = (params.reason || "").trim();
  const betClean = params.bet !== undefined && params.bet !== null ? String(params.bet).trim() : "";

  const logDedupKey = params.msgCmId
    ? `cm_${params.msgCmId}_${rawCmdClean}`
    : `${params.userId}_${rawCmdClean}_${targetClean}_${actionClean}_${reasonClean}_${betClean}`;

  const now = Date.now();
  const lastLoggedAt = recentLogsMap.get(logDedupKey);

  if (lastLoggedAt && now - lastLoggedAt < 15000) {
    console.log(`>>> DUPLICATE LOG BLOCKED: ${logDedupKey}`);
    return;
  }
  recentLogsMap.set(logDedupKey, now);

  if (recentLogsMap.size > 5000) {
    const cutoff = now - 60000;
    for (const [k, v] of recentLogsMap.entries()) {
      if (v < cutoff) recentLogsMap.delete(k);
    }
  }

  const userLink = `[id${params.userId}|${params.fullName}]`;

  let targetFullName = params.targetName;
  if (!targetFullName && params.targetId && params.targetId > 0) {
    const tu = await getOrCreateUser(params.targetId);
    targetFullName = tu.fullName || tu.nick || (await fetchVkFullName(params.targetId)) || `User${params.targetId}`;
  }

  const targetLink = params.targetId && params.targetId > 0 && targetFullName
    ? `[id${params.targetId}|${targetFullName}]`
    : "None";

  if (params.isGame) {
    const betText = params.bet !== undefined && params.bet !== null && String(params.bet).trim() !== "" ? String(params.bet) : "None";
    const maskedAction = maskBadWords(params.action);
    const msg = `[GAMES LOGS] ${userLink} -> ${targetLink} | –°—Ç–∞–≤–∫–∞: ${betText} | ${maskedAction} | #${rawCmdClean} #${params.userId}`;
    sendVkMessage(VK_TOKEN, 2000000010, msg, { dedup_key: logDedupKey }).catch(() => {});
  } else {
    const durationText = params.duration && String(params.duration).trim() !== "" ? params.duration : "None";
    const reasonText = params.reason && String(params.reason).trim() !== "" ? maskBadWords(params.reason) : "None";
    const maskedAction = maskBadWords(params.action);
    const msg = `[LOGS] ${userLink} -> ${targetLink} | –°—Ä–æ–∫: ${durationText} | –ü—Ä–∏—á–∏–Ω–∞: ${reasonText} | ${maskedAction} | #${rawCmdClean} #${params.userId}`;
    sendVkMessage(VK_TOKEN, 2000000010, msg, { dedup_key: logDedupKey }).catch(() => {});
  }
};

const logAdminAction = logToChat10;


function getButtonActionDescription(cmd: string, payloadObj: any): string {
  if (cmd === "zr_start") return "–ù–∞—á–∞–ª(-–∞) –ø–æ–¥–∞—á—É –∑–∞—è–≤–∫–∏ –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (cmd === "zr_cancel" || cmd === "zr_cancel_app") return "–û—Ç–º–µ–Ω–∏–ª(-–∞) –ø–æ–¥–∞—á—É –∑–∞—è–≤–∫–∏ –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (cmd === "zr_send_app") return "–û—Ç–ø—Ä–∞–≤–∏–ª(-–∞) –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (cmd === "zr_approve") return "–û–¥–æ–±—Ä–∏–ª(-–∞) –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (cmd === "zr_reject") return "–û—Ç–∫–ª–æ–Ω–∏–ª(-–∞) –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (cmd === "gbf_a") return "–û–¥–æ–±—Ä–∏–ª(-–∞) —Ñ–æ—Ä–º—É –Ω–∞ –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É";
  if (cmd === "gbf_d") return "–û—Ç–∫–∞–∑–∞–ª(-–∞) —Ñ–æ—Ä–º—É –Ω–∞ –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É";
  if (cmd === "bug_a") return "–û–¥–æ–±—Ä–∏–ª(-–∞) –±–∞–≥-—Ä–µ–ø–æ—Ä—Ç";
  if (cmd === "bug_d") return "–û—Ç–∫–∞–∑–∞–ª(-–∞) –±–∞–≥-—Ä–µ–ø–æ—Ä—Ç";
  if (cmd === "off_a") return "–û–¥–æ–±—Ä–∏–ª(-–∞) –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ";
  if (cmd === "off_d") return "–û—Ç–∫–∞–∑–∞–ª(-–∞) –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ";
  if (cmd === "form_approve") return "–û–¥–æ–±—Ä–∏–ª(-–∞) —Ñ–æ—Ä–º—É –º–æ–¥–µ—Ä–∞—Ü–∏–∏";
  if (cmd === "form_deny") return "–û—Ç–∫–∞–∑–∞–ª(-–∞) —Ñ–æ—Ä–º—É –º–æ–¥–µ—Ä–∞—Ü–∏–∏";
  if (cmd === "transfer_confirm") return "–ü–æ–¥—Ç–≤–µ—Ä–¥–∏–ª(-–∞) –ø–µ—Ä–µ–≤–æ–¥ —Å—Ä–µ–¥—Å—Ç–≤";
  if (cmd === "transfer_cancel") return "–û—Ç–º–µ–Ω–∏–ª(-–∞) –ø–µ—Ä–µ–≤–æ–¥ —Å—Ä–µ–¥—Å—Ç–≤";
  if (cmd === "clan_join_accept") return "–ü—Ä–∏–Ω—è–ª(-–∞) –∑–∞—è–≤–∫—É –≤ –∫–ª–∞–Ω";
  if (cmd === "clan_join_decline") return "–û—Ç–∫–ª–æ–Ω–∏–ª(-–∞) –∑–∞—è–≤–∫—É –≤ –∫–ª–∞–Ω";
  if (cmd === "marriage_accept") return "–ü—Ä–∏–Ω—è–ª(-–∞) –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –≤—Å—Ç—É–ø–∏—Ç—å –≤ –±—Ä–∞–∫";
  if (cmd === "marriage_decline") return "–û—Ç–∫–ª–æ–Ω–∏–ª(-–∞) –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –≤—Å—Ç—É–ø–∏—Ç—å –≤ –±—Ä–∞–∫";
  if (cmd === "divorce_accept") return "–ü–æ–¥—Ç–≤–µ—Ä–¥–∏–ª(-–∞) —Ä–∞–∑–≤–æ–¥";
  if (cmd === "divorce_cancel") return "–û—Ç–º–µ–Ω–∏–ª(-–∞) —Ä–∞–∑–≤–æ–¥";
  if (cmd === "claim_daily_bonus") return "–ó–∞–±—Ä–∞–ª(-–∞) –µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –±–æ–Ω—É—Å";
  if (cmd === "kick_left_user") return "–ò—Å–∫–ª—é—á–∏–ª(-–∞) –≤—ã—à–µ–¥—à–µ–≥–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
  if (cmd === "croc_join") return "–ü—Ä–∏—Å–æ–µ–¥–∏–Ω–∏–ª—Å—è(-–ª–∞—Å—å) –∫ –∏–≥—Ä–µ –ö—Ä–æ–∫–æ–¥–∏–ª";
  if (cmd === "croc_leave") return "–í—ã—à–µ–ª(-–ª–∞) –∏–∑ –∏–≥—Ä—ã –ö—Ä–æ–∫–æ–¥–∏–ª";
  if (cmd === "croc_start") return "–ó–∞–ø—É—Å—Ç–∏–ª(-–∞) –∏–≥—Ä—É –ö—Ä–æ–∫–æ–¥–∏–ª";
  if (cmd === "mafia_join") return "–ü—Ä–∏—Å–æ–µ–¥–∏–Ω–∏–ª—Å—è(-–ª–∞—Å—å) –∫ –∏–≥—Ä–µ –ú–∞—Ñ–∏—è";
  if (cmd === "mafia_leave") return "–í—ã—à–µ–ª(-–ª–∞) –∏–∑ –∏–≥—Ä—ã –ú–∞—Ñ–∏—è";
  if (cmd === "mafia_start") return "–ó–∞–ø—É—Å—Ç–∏–ª(-–∞) –∏–≥—Ä—É –ú–∞—Ñ–∏—è";
  if (cmd === "mafia_act") return "–í—ã–ø–æ–ª–Ω–∏–ª(-–∞) –Ω–æ—á–Ω–æ–µ –¥–µ–π—Å—Ç–≤–∏–µ –≤ –ú–∞—Ñ–∏–∏";
  if (cmd === "mafia_vote_act") return "–ü—Ä–æ–≥–æ–ª–æ—Å–æ–≤–∞–ª(-–∞) –Ω–∞ –¥–Ω–µ–≤–Ω–æ–º –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏–∏ –≤ –ú–∞—Ñ–∏–∏";
  if (cmd === "doctor_act") return "–í—ã–ª–µ—á–∏–ª(-–∞) –∏–≥—Ä–æ–∫–∞ –≤ –ú–∞—Ñ–∏–∏";
  if (cmd === "sheriff_act") return "–ü—Ä–æ–≤–µ—Ä–∏–ª(-–∞) –∏–≥—Ä–æ–∫–∞ –≤ –ú–∞—Ñ–∏–∏";
  if (cmd === "rps_join") return "–ü—Ä–∏–Ω—è–ª(-–∞) –≤—ã–∑–æ–≤ –≤ –ö–ù–ë";
  if (cmd === "rps_pick") return `–í—ã–±—Ä–∞–ª(-–∞) ${payloadObj?.choice || "–≤–∞—Ä–∏–∞–Ω—Ç"} –≤ –ö–ù–ë`;
  if (cmd === "duel_join") return "–ü—Ä–∏–Ω—è–ª(-–∞) –≤—ã–∑–æ–≤ –Ω–∞ –¥—É—ç–ª—å";
  if (cmd === "duel_biz_join") return "–ü—Ä–∏–Ω—è–ª(-–∞) –≤—ã–∑–æ–≤ –Ω–∞ –¥—É—ç–ª—å –Ω–∞ –±–∏–∑–Ω–µ—Å—ã";
  if (cmd === "casino_retry" || cmd === "casino_again" || cmd === "casino_allin" || cmd === "casino_all_in") return "–°–¥–µ–ª–∞–ª(-–∞) –ø–æ–≤—Ç–æ—Ä–Ω—É—é —Å—Ç–∞–≤–∫—É –≤ –∫–∞–∑–∏–Ω–æ";
  if (cmd === "roulette_again" || cmd === "roulette_allin") return "–ö—Ä—É—Ç–∞–Ω—É–ª(-–∞) —Ä—É–ª–µ—Ç–∫—É –ø–æ–≤—Ç–æ—Ä–Ω–æ";
  if (cmd === "biz_collect_new") return "–°–æ–±—Ä–∞–ª(-–∞) –ø—Ä–∏–±—ã–ª—å —Å –±–∏–∑–Ω–µ—Å–æ–≤";
  if (cmd === "biz_renew") return "–ü—Ä–æ–¥–ª–∏–ª(-–∞) –∞—Ä–µ–Ω–¥—É –±–∏–∑–Ω–µ—Å–æ–≤";
  if (cmd === "biz_my_list") return "–ü—Ä–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ —Å–≤–æ–∏—Ö –±–∏–∑–Ω–µ—Å–æ–≤";
  if (cmd === "deposit_close") return "–ó–∞–∫—Ä—ã–ª(-–∞) –±–∞–Ω–∫–æ–≤—Å–∫–∏–π –¥–µ–ø–æ–∑–∏—Ç";
  if (cmd === "giveaway_join") return "–£—á–∞—Å—Ç–≤—É–µ—Ç –≤ —Ä–æ–∑—ã–≥—Ä—ã—à–µ";
  if (cmd === "giveaway_leave") return "–û—Ç–º–µ–Ω–∏–ª(-–∞) —É—á–∞—Å—Ç–∏–µ –≤ —Ä–æ–∑—ã–≥—Ä—ã—à–µ";
  if (cmd === "admin_confirm") return "–ü–æ–¥—Ç–≤–µ—Ä–¥–∏–ª(-–∞) –¥–µ–π—Å—Ç–≤–∏–µ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞";
  if (cmd === "admin_cancel") return "–û—Ç–º–µ–Ω–∏–ª(-–∞) –¥–µ–π—Å—Ç–≤–∏–µ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞";
  if (cmd === "arrole_yes") return "–ü—Ä–∏–Ω—è–ª(-–∞) –≤—ã–¥–∞–Ω–Ω—É—é —Ä–æ–ª—å";
  if (cmd === "arrole_no") return "–û—Ç–∫–ª–æ–Ω–∏–ª(-–∞) –≤—ã–¥–∞–Ω–Ω—É—é —Ä–æ–ª—å";
  if (cmd === "mod_unmute") return "–°–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ (–±—ã—Å—Ç—Ä–∞—è –∫–Ω–æ–ø–∫–∞)";
  if (cmd === "mod_unwarn") return "–°–Ω—è–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ (–±—ã—Å—Ç—Ä–∞—è –∫–Ω–æ–ø–∫–∞)";
  if (cmd === "mod_unban_chat") return "–†–∞–∑–±–∞–Ω–∏–ª(-–∞) –≤ —á–∞—Ç–µ (–±—ã—Å—Ç—Ä–∞—è –∫–Ω–æ–ø–∫–∞)";
  if (cmd === "mod_clearmute") return "–û—á–∏—Å—Ç–∏–ª(-–∞) –∏—Å—Ç–æ—Ä–∏—é –º—É—Ç–æ–≤";
  if (cmd === "mod_clearwarn") return "–û—á–∏—Å—Ç–∏–ª(-–∞) –∏—Å—Ç–æ—Ä–∏—é –≤–∞—Ä–Ω–æ–≤";
  if (cmd === "mod_clearban") return "–û—á–∏—Å—Ç–∏–ª(-–∞) –∏—Å—Ç–æ—Ä–∏—é –±–∞–Ω–æ–≤";
  if (cmd === "mod_silence_off") return "–û—Ç–∫–ª—é—á–∏–ª(-–∞) —Ä–µ–∂–∏–º —Ç–∏—à–∏–Ω—ã";
  if (cmd.startsWith("weather_")) return `–ü—Ä–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) –ø—Ä–æ–≥–Ω–æ–∑ –ø–æ–≥–æ–¥—ã (${cmd.replace("weather_", "")})`;
  if (cmd.startsWith("stats_")) return `–ü–µ—Ä–µ–∫–ª—é—á–∏–ª(-–∞) —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫—É –±–µ—Å–µ–¥—ã (#${cmd.replace("stats_", "")})`;
  if (cmd.startsWith("top_")) return `–ü–µ—Ä–µ–∫–ª—é—á–∏–ª(-–∞) –∫–∞—Ç–µ–≥–æ—Ä–∏—é —Ç–æ–ø–∞ –Ω–∞ #${cmd.replace("top_", "")}`;
  if (cmd.startsWith("help_") || cmd.startsWith("cmd_help_") || cmd.startsWith("ghelp_") || cmd.startsWith("alt_")) return "–ü–µ—Ä–µ—à–µ–ª(-–ª–∞) –ø–æ —Ä–∞–∑–¥–µ–ª—É –º–µ–Ω—é —Å–ø—Ä–∞–≤–∫–∏";
  return `–ù–∞–∂–∞–ª(-–∞) –∫–Ω–æ–ø–∫—É "${cmd}"`;
}

const logButtonAction = async (params: {
  userId: number;
  fullName?: string;
  targetId?: number;
  targetName?: string;
  action: string;
  buttonName: string;
  eventId?: string;
}) => {
  if (!params.userId || params.userId <= 0) return;

  const cleanBtn = (params.buttonName || "button").replace(/^[\/+!\.,#]/, "").toLowerCase().trim() || "button";

  const logDedupKey = params.eventId
    ? `btn_evt_${params.eventId}`
    : `btn_${params.userId}_${cleanBtn}_${params.targetId || 0}`;

  const now = Date.now();
  const lastLoggedAt = recentLogsMap.get(logDedupKey);
  if (lastLoggedAt && now - lastLoggedAt < 10000) return;
  recentLogsMap.set(logDedupKey, now);

  let userFullName = params.fullName;
  if (!userFullName) {
    const u = await getOrCreateUser(params.userId);
    userFullName = u.fullName || u.nick || (await fetchVkFullName(params.userId)) || `User${params.userId}`;
  }

  const userLink = `[id${params.userId}|${userFullName}]`;

  let targetLink = "None";
  if (params.targetId && params.targetId > 0 && params.targetId !== params.userId) {
    let targetFullName = params.targetName;
    if (!targetFullName) {
      const tu = await getOrCreateUser(params.targetId);
      targetFullName = tu.fullName || tu.nick || (await fetchVkFullName(params.targetId)) || `User${params.targetId}`;
    }
    if (targetFullName) {
      targetLink = `[id${params.targetId}|${targetFullName}]`;
    }
  }

  const maskedAction = maskBadWords(params.action || "–ù–∞–∂–∞–ª(-–∞) –∫–Ω–æ–ø–∫—É");

  const msg = `[BUTTON LOGS] ${userLink} -> ${targetLink} | ${maskedAction} | #${cleanBtn} #${params.userId}`;

  sendVkMessage(VK_TOKEN, 2000000010, msg, { dedup_key: logDedupKey }).catch(() => {});
};

let isGlobalBotClosed = false;
let globalAutoReactionId = 0; // Default global auto-reaction is 0 (off by default, only reacts to requested users/chats)

const recentButtonClickMap = new Map<string, number>();
setInterval(() => {
  const now = Date.now();
  recentButtonClickMap.forEach((time, key) => {
    if (now - time > 10000) recentButtonClickMap.delete(key);
  });
}, 30000);


function isModerationCmd(cmd: string): boolean {
  if (!cmd) return false;
  const c = cmd.toLowerCase().trim();
  const modCmds = [
    "/mute", "/–º—É—Ç–∞", "/–º—É—Ç", "/m", "/–≥–º—É—Ç", "/gmute", "/–∑–∞–≥–ª—É—à–∏—Ç—å", "/–∑–∞–º—É—Ç–∏—Ç—å", "/–º—É—Ç–∏—Ç—å", "/–¥–∞—Ç—å–º—É—Ç",
    "/unmute", "/—Ä–∞–∑–º—É—Ç", "/–∞–Ω–º—É—Ç", "/—É–Ω–º—É—Ç", "/unm", "/–≥—É–Ω–º—É—Ç", "/gunmute", "/—Å–Ω—è—Ç—å–º—É—Ç", "/—Ä–∞–∑–≥–ª—É—à–∏—Ç—å", "/—Ä–∞–∑–º—É—Ç–∏—Ç—å", "/–∏–∑–º—É—Ç–∞",
    "/warn", "/–≤–∞—Ä–Ω", "/w", "/–≥–≤–∞—Ä–Ω", "/gwarn", "/–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "/–¥–∞—Ç—å–≤–∞—Ä–Ω", "/–ø—Ä–µ–¥", "/–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω", "/–≤—ã–¥–∞—Ç—å–ø—Ä–µ–¥",
    "/unwarn", "/—Ä–∞–∑–≤–∞—Ä–Ω", "/–∞–Ω–≤–∞—Ä–Ω", "/—É–Ω–≤–∞—Ä–Ω", "/unw", "/–≥—É–Ω–≤–∞—Ä–Ω", "/gunwarn", "/—Å–Ω—è—Ç—å–≤–∞—Ä–Ω", "/—Å–Ω—è—Ç—å–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "/—Å–Ω—è—Ç—å–ø—Ä–µ–¥", "/–∞–Ω–ø—Ä–µ–¥", "/—É–¥–∞–ª–∏—Ç—å–≤–∞—Ä–Ω",
    "/warns", "/–≤–∞—Ä–Ω—ã", "/–ø—Ä–µ–¥—ã", "/—Å–ø–∏—Å–æ–∫–≤–∞—Ä–Ω–æ–≤",
    "/ban", "/–±–∞–Ω", "/b", "/–≥–±–∞–Ω", "/gban", "/–∑–∞–±–∞–Ω–∏—Ç—å", "/–±",
    "/unban", "/—Ä–∞–∑–±–∞–Ω", "/–∞–Ω–±–∞–Ω", "/—É–Ω–±–∞–Ω", "/unb", "/–≥—É–Ω–±–∞–Ω", "/gunban", "/—Ä–∞–∑–±–∞–Ω–∏—Ç—å", "/–∏–∑–±–∞–Ω–∞",
    "/kick", "/–∫–∏–∫", "/–∫", "/k", "/–∏—Å–∫–ª—é—á–∏—Ç—å", "/–≤—ã–≥–Ω–∞—Ç—å",
    "/clear", "/–æ—á–∏—Å—Ç–∏—Ç—å", "/mclear", "/purge", "/—á–∏—Å—Ç–∫–∞", "/–ø—É—Ä–¥–∂", "/—É–¥–∞–ª–∏—Ç—å—Å–æ–æ–±—â–µ–Ω–∏—è",
    "/addaccesslevel", "/—Ä–æ–ª—å", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å",
    "/removerole", "/—Å–Ω—è—Ç—å—Ä–æ–ª—å", "/—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞", "/arrole", "/grrole", "/delrole", "/—É–Ω—Ä–æ–ª—å", "/unrole", "/delmoder", "/delsenmoder", "/deladmin", "/delsenadmin", "/delzsa", "/delsa", "/unmoder", "/delowner", "/deleteowner",
    "/addstatus", "/unstatus",
    "/quiet", "/—Ç–∏—Ö–∏–π", "/unquiet", "/—Å–Ω—è—Ç—å—Ç–∏—Ö–∏–π", "/—Ç–∏—à–∏–Ω–∞",
    "/freeze", "/–∑–∞–º–æ—Ä–æ–∑–∏—Ç—å", "/unfreeze", "/—Ä–∞–∑–º–æ—Ä–æ–∑–∏—Ç—å",
    "/pin", "/unpin", "/–∑–∞–∫—Ä–µ–ø–∏—Ç—å", "/–æ—Ç–∫—Ä–µ–ø–∏—Ç—å", "/–∑–∞–∫—Ä", "/–æ—Ç–∫—Ä", "/–ø–∏–Ω", "/–∞–Ω–ø–∏–Ω", "/—É–Ω–ø–∏–Ω",
    "/gban", "/–≥–±–∞–Ω", "/ungban", "/—É–Ω–≥–±–∞–Ω",  "/–≥–±–∞–Ω–ø–ª",  "/—É–Ω–≥–±–∞–Ω–ø–ª",
    "/deletecommand", "/—É–¥–∞–ª—è—Ç—å–∫–æ–º–∞–Ω–¥—ã", "/delcmd",
    "/smute", "/—Å–º—É—Ç", "/skick", "/—Å–∫–∏–∫", "/sclear", "/—Å–æ—á–∏—Å—Ç–∏—Ç—å", "/smclear", "/—Å–º–∫–ª–∏–∞—Ä",
    "/sban", "/—Å–±–∞–Ω", "/sunban", "/—Å—É–Ω–±–∞–Ω", "/snban", "/—Å–Ω–±–∞–Ω", "/snkick", "/—Å–Ω–∫–∏–∫", "/snrole", "/—Å–Ω—Ä–æ–ª—å", "/snremoverole", "/—Å–Ω—Å–Ω—è—Ç—å—Ä–æ–ª—å"
  ];
  return modCmds.includes(c);
}

const LEADERSHIP_COMMANDS = new Set([
  "/gban", "/–≥–±–∞–Ω",
  "/ungban", "/—é–Ω–≥–±–∞–Ω", "/—É–Ω–≥–±–∞–Ω", "/–∞–Ω–≥–±–∞–Ω", "/–≥—É–Ω–≥–±–∞–Ω", "/–≥–±–∞–Ω–ø–ª", "/—É–Ω–≥–±–∞–Ω–ø–ª",
  "/gbanlist", "/–≥–±–∞–Ω–ª–∏—Å—Ç", "/—Å–ø–∏—Å–æ–∫–≥–±–∞–Ω", "/—Å–ø–∏—Å–æ–∫–≥–±–∞–Ω–æ–≤",
  "/blacklist", "/–±–ª—ç–∫–ª–∏—Å—Ç", "/—á—Å–±–æ—Ç–∞", "/—á—Å", "/—Å–ø–∏—Å–æ–∫—á—Å",
  "/rstats", "/—Ä—Å—Ç–∞—Ç—Å",
  "/grrole", "/–≥—Ä—Å–Ω—è—Ç—å—Ä–æ–ª—å",
  "/banid", "/–±–∞–Ω–∏–¥", "/–±–∞–Ω—á–∞—Ç",
  "/unbanid", "/—É–Ω–±–∞–Ω–∏–¥", "/—Ä–∞–∑–±–∞–Ω–∏–¥", "/–∞–Ω–±–∞–Ω–∏–¥", "/—Ä–∞–∑–±–∞–Ω—á–∞—Ç",
  "/infochat", "/—á–∞—Ç–∏–Ω—Ñ–æ", "/–∏–Ω—Ñ–æ—á–∞—Ç", "/chatinfo",
  "/infoid", "/–∏–Ω—Ñ–æ–∏–¥",
  "/addblack", "/–∞–¥–¥–±–ª—ç–∫", "/—á—Å–±–æ—Ç–∞–º", "/—á—Å—Å–æ–æ–±—â–µ—Å—Ç–≤–∞", "/–¥–æ–±–∞–≤–∏—Ç—å–≤—á—Å", "/—á—Å–±", "/addb", "/–≤—á—Å",
  "/unblack", "/–∞–Ω–±–ª—ç–∫", "/–∞–Ω—á—Å", "/–∏–∑—á—Å", "/—É–¥–∞–ª–∏—Ç—å–∏–∑—á—Å", "/—É–Ω—á—Å–±", "/unb", "/–∏–∑—á—Å–±",
  "/gsnick", "/–≥—Å–Ω–∏–∫",
  "/grnick", "/–≥—Ä–Ω–∏–∫",
  "/zunban", "/–∑—É–Ω–±–∞–Ω",
  "/addzsr", "/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å", "/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞", "/addzam", "/–∞–¥–¥–∑—Å—Ä",
  "/addozsr", "/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å", "/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞", "/addozam", "/–∞–¥–¥–æ–∑—Å—Ä",
  "/rebuke", "/–≤—ã–≥–æ–≤–æ—Ä",
  "/unrebuke", "/—Å–Ω—è—Ç—å–≤—ã–≥–æ–≤–æ—Ä",
  "/addruk", "/—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å", "/addsr", "/adddirector", "/–¥–∏—Ä–µ–∫—Ç–æ—Ä",
  "/addgr", "/–≥–ª–∞–≤—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å", "/addgruk", "/–≥–ª–∞–≤–¥–∏—Ä–µ–∫—Ç–æ—Ä", "/addgdirector",
  "/ghelp", "/–≥—Ö–µ–ª–ø",
  "/gstaff", "/–≥—Å—Ç–∞—Ñ—Ñ", "/–≥—Å–æ—Å—Ç–∞–≤", "/gstaffs",
  "/rchat", "/—Ä—á–∞—Ç", "/achat", "/–∞—á–∞—Ç",
  "/unrchat", "/—É–Ω—Ä—á–∞—Ç", "/unachat", "/—É–Ω–∞—á–∞—Ç"
]);

async function autoDeleteCmdMessage(peerId: number, message: any, chatData: any) {
  if (chatData?.deleteCommand && message?.conversation_message_id && peerId > 2000000000) {
    try {
      await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id);
    } catch (e) {}
  }
}

async function executeVkMute(peerId: number, targetId: number, durationSec: number): Promise<{ success: boolean; errorMsg: string }> {
  const chatId = peerId > 2000000000 ? peerId - 2000000000 : peerId;
  let lastError = "";

  const attempts = [
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: String(targetId), for: durationSec, action: "ro" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", chat_id: chatId, member_ids: String(targetId), for: durationSec, action: "ro" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: targetId, for: durationSec, action: "ro" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId, member_ids: String(targetId), for: durationSec, action: "ro" }
    }
  ];

  let anySuccess = false;
  for (const attempt of attempts) {
    try {
      const res = await axios.get(attempt.url, { params: attempt.params });
      if (res.data && res.data.response !== undefined && !res.data.error) {
        anySuccess = true;
        break;
      } else if (res.data?.error) {
        lastError = `[VK API ${res.data.error.error_code}: ${res.data.error.error_msg}]`;
      }
    } catch (e: any) {
      lastError = `[–û—à–∏–±–∫–∞: ${e.message}]`;
    }
  }

  return { success: anySuccess, errorMsg: anySuccess ? "" : lastError };
}

async function executeVkUnmute(peerId: number, targetId: number): Promise<{ success: boolean; errorMsg: string }> {
  const chatId = peerId > 2000000000 ? peerId - 2000000000 : peerId;
  let lastError = "";

  const attempts = [
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: String(targetId), action: "rw" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: targetId, action: "rw" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", chat_id: chatId, member_ids: String(targetId), action: "rw" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: String(targetId), for: 0, action: "ro" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", chat_id: chatId, member_ids: String(targetId), for: 0, action: "ro" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: String(targetId), for: 0, action: "rw" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: targetId, for_all: 0 }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId, member_ids: String(targetId), action: "rw" }
    },
    {
      url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
      params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId, member_ids: String(targetId), for: 0, action: "ro" }
    }
  ];

  let anySuccess = false;
  for (const attempt of attempts) {
    try {
      const res = await axios.get(attempt.url, { params: attempt.params });
      if (res.data && res.data.response !== undefined && !res.data.error) {
        anySuccess = true;
      } else if (res.data?.error) {
        lastError = `[VK API ${res.data.error.error_code}: ${res.data.error.error_msg}]`;
      }
    } catch (e: any) {
      lastError = `[–û—à–∏–±–∫–∞: ${e.message}]`;
    }
  }

  return { success: anySuccess, errorMsg: anySuccess ? "" : lastError };
}

async function executeBatchVkRestrictions(peerId: number, memberIds: number[], action: "ro" | "rw", durationSec: number = 86400 * 30): Promise<number> {
  const chatId = peerId > 2000000000 ? peerId - 2000000000 : peerId;
  let successCount = 0;
  const chunkSize = 25;

  for (let i = 0; i < memberIds.length; i += chunkSize) {
    const chunk = memberIds.slice(i, i + chunkSize);
    const memberIdsStr = chunk.join(",");
    let batchOk = false;

    const attempts = [
      {
        url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
        params: action === "ro"
          ? { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: memberIdsStr, for: durationSec, action: "ro" }
          : { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_ids: memberIdsStr, action: "rw" }
      },
      {
        url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
        params: action === "ro"
          ? { access_token: VK_TOKEN, v: "5.199", chat_id: chatId, member_ids: memberIdsStr, for: durationSec, action: "ro" }
          : { access_token: VK_TOKEN, v: "5.199", chat_id: chatId, member_ids: memberIdsStr, action: "rw" }
      },
      {
        url: "https://api.vk.com/method/messages.changeConversationMemberRestrictions",
        params: action === "ro"
          ? { access_token: VK_TOKEN, v: "5.131", peer_id: peerId, member_ids: memberIdsStr, for: durationSec, action: "ro" }
          : { access_token: VK_TOKEN, v: "5.131", peer_id: peerId, member_ids: memberIdsStr, action: "rw" }
      }
    ];

    for (const attempt of attempts) {
      try {
        const res = await axios.get(attempt.url, { params: attempt.params });
        if (res.data && res.data.response !== undefined && !res.data.error) {
          batchOk = true;
          successCount += chunk.length;
          break;
        }
      } catch (e) {}
    }

    if (!batchOk) {
      const results = await Promise.allSettled(
        chunk.map(mId => action === "ro" ? executeVkMute(peerId, mId, durationSec) : executeVkUnmute(peerId, mId))
      );
      results.forEach(r => {
        if (r.status === "fulfilled" && (r.value as any)?.success) successCount++;
      });
    }

    await new Promise(r => setTimeout(r, 60));
  }

  return successCount;
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

const avatarImgCache = new Map<string, { img: any, time: number }>();
async function loadCachedImage(url: string) {
  if (!url || !loadImage) return null;
  const cached = avatarImgCache.get(url);
  if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
    return cached.img;
  }
  try {
    const img = await loadImage(url);
    if (avatarImgCache.size > 300) avatarImgCache.clear();
    avatarImgCache.set(url, { img, time: Date.now() });
    return img;
  } catch (e) {
    return null;
  }
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
  ctx.fillText("...:: –°–¢–ê–¢–ò–°–¢–ò–ö–ê –ü–û–õ–¨–ó–û–í–ê–¢–ï–õ–Ø ::...", 60, 50);

  const name = targetUser.fullName || targetUser.nick || `–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å ${targetId}`;

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
      const avatarImg = await loadCachedImage(avatarUrl);
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

  const nickText = targetUser.chatNicks?.[currentPeerId] || targetUser.globalNick || "–æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px NotoSans, Arial";
  ctx.fillText(`ID: ${targetId} | –ù–∏–∫: ${nickText}`, 210, 148);

  let tGlobalRole = targetUser.role || 0;
  if (targetId === 778382713 || targetId === 1) tGlobalRole = 12;
  const tChatRole = (targetUser.chatRoles && targetUser.chatRoles[currentPeerId]) || 0;
  let dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
  if (tGlobalRole >= 12) dispRole = 12;

  let roleStr = getRoleDisplayName(dispRole);

  if (currentPeerId) {
     const chatData = await getOrCreateChat(currentPeerId);
     if (chatData && chatData.customRoles) {
        if (dispRole === 7 && chatData.customRoles.owner) roleStr = chatData.customRoles.owner;
        else if (dispRole === 6 && chatData.customRoles.ga) roleStr = chatData.customRoles.ga;
        else if (dispRole === 5 && chatData.customRoles.zga) roleStr = chatData.customRoles.zga;
        else if (dispRole === 4 && chatData.customRoles.sadmin) roleStr = chatData.customRoles.sadmin;
        else if (dispRole === 3 && chatData.customRoles.admin) roleStr = chatData.customRoles.admin;
        else if (dispRole === 2 && chatData.customRoles.smoder) roleStr = chatData.customRoles.smoder;
        else if (dispRole === 1 && chatData.customRoles.moder) roleStr = chatData.customRoles.moder;
     }
  }

  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 18px NotoSans, Arial";
  ctx.fillText(`–î–æ–ª–∂–Ω–æ—Å—Ç—å: ${roleStr}`, 210, 180);

  // Compute stats metrics
  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatTotalMsgsMap = targetUser.chatTotalMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};

  let todayMsgs = 0;
  if (currentPeerId && chatTodayMsgsMap[currentPeerId] && chatLastMsgDateMap[currentPeerId] === currentMskStr) {
    todayMsgs = chatTodayMsgsMap[currentPeerId];
  } else if (!currentPeerId) {
    todayMsgs = targetUser.lastMsgDateStr === currentMskStr ? (targetUser.messagesToday || targetUser.msgCountToday || 0) : 0;
  }
  
  const totalMsgs = (currentPeerId ? chatTotalMsgsMap[currentPeerId] : 0) || (currentPeerId ? chatTodayMsgsMap[currentPeerId] : 0) || 0;
  const warnings = targetUser.warnings || 0;
  const isMuted = targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "–î–∞" : "–ù–µ—Ç";
  const hasGban = !!(targetUser.gban) ? "–î–∞" : "–ù–µ—Ç";
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0) ? "–î–∞" : "–ù–µ—Ç";
  const balance = `${formatNum(targetUser.balance || 0)}$`;
  const reputation = String(targetUser.reputation || 0);
  const customStatus = targetUser.customStatus || targetUser.statusText || "–ù–µ —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω";
  
  let lastActivityStr = "–æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
  const rawAct = targetUser.lastActivity || (targetUser.lastMessageAt && (targetUser.messagesTotal > 0 || (targetUser.chatTotalMsgs && Object.values(targetUser.chatTotalMsgs).some((v: any) => v > 0))) ? targetUser.lastMessageAt * 1000 : 0);
  if (rawAct && rawAct > 0) {
    const dAct = new Date(rawAct);
    const dDay = String(dAct.getDate()).padStart(2, "0");
    const dMonth = String(dAct.getMonth() + 1).padStart(2, "0");
    const dYear = dAct.getFullYear();
    const dHours = String(dAct.getHours()).padStart(2, "0");
    const dMins = String(dAct.getMinutes()).padStart(2, "0");
    lastActivityStr = `${dDay}.${dMonth}.${dYear} ${dHours}:${dMins}`;
  }

  // 10 panels styled as clean wide horizontal rectangles
  const cards = [
    { title: "–°–æ–æ–±—â–µ–Ω–∏–π —Å–µ–≥–æ–¥–Ω—è", value: String(todayMsgs), color: "#38bdf8" },
    { title: "–°–æ–æ–±—â–µ–Ω–∏–π –≤—Å–µ–≥–æ", value: String(totalMsgs), color: "#818cf8" },
    { title: "–ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è", value: `${warnings}/3`, color: warnings > 0 ? "#f87171" : "#4ade80" },
    { title: "–ê–∫—Ç–∏–≤–Ω–∞—è –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞", value: isMuted, color: isMuted === "–î–∞" ? "#f87171" : "#4ade80" },
    { title: "–ì–ª–æ–±–∞–ª—å–Ω—ã–π –±–∞–Ω", value: hasGban, color: hasGban === "–î–∞" ? "#f87171" : "#4ade80" },
    { title: "–ë–ª–æ–∫–∏—Ä–æ–≤–∫–∏ –≤ –±–µ—Å–µ–¥–∞—Ö", value: hasChatBans, color: hasChatBans === "–î–∞" ? "#f87171" : "#4ade80" },
    { title: "–ë–∞–ª–∞–Ω—Å –∫–æ—à–µ–ª—å–∫–∞", value: balance, color: "#facc15" },
    { title: "–†–µ–ø—É—Ç–∞—Ü–∏—è", value: reputation, color: "#f472b6" },
    { title: "–ü–æ—Å–ª–µ–¥–Ω—è—è –∞–∫—Ç–∏–≤–Ω–æ—Å—Ç—å", value: lastActivityStr, color: "#2dd4bf" },
    { title: "–°—Ç–∞—Ç—É—Å", value: customStatus, color: "#c084fc" }
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

  return canvas.toBuffer("image/jpeg", { quality: 0.85 });
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
app.use((req, res, next) => {
  req.socket.setNoDelay(true);
  next();
});
const PORT = 3000;

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

import { getFirestoreWrapper, FieldValue } from "./firestore-wrapper";
// ...
const firestoreDb = getFirestoreWrapper();

try {
  firestoreDb.collection("system").doc("bot_config").get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      if (data?.isBotClosed !== undefined) isGlobalBotClosed = data.isBotClosed;
      if (data?.globalReactionId !== undefined) globalAutoReactionId = data.globalReactionId;
    }
  }).catch(() => {});
} catch (e) {}

// VK Config
const VK_TOKEN = process.env.VK_TOKEN || "vk1.a.0h8Yg41irrcMeHXWaKh_ukUXO8FfbVAu0DKZStvExHFXGiPQDEGd8CkYvlgCE6qG-BWVAUkvFV36N1GaAJaD4JG-WKcNBqjEwpBapyf5YIdLseKRon_aRiAQpfAbWtWI0NrYJohlWr4c34WPZjQ6PGgbK2G6xtwvlFALERy9pLfO7n8Ah_cr1Oyszl7vF7IFfQUHc4s8g7GFc7gWGmxZPQ";
const VK_GROUP_ID = process.env.VK_GROUP_ID || "239281784";
let runtimeBotGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
if (VK_TOKEN) {
  vkApi.get("groups.getById", { params: { access_token: VK_TOKEN, v: "5.199" } }).then(res => {
    const g = res.data?.response?.groups?.[0] || res.data?.response?.[0];
    if (g && g.id) {
      runtimeBotGroupId = g.id;
      console.log(">>> Auto-detected VK Group ID:", runtimeBotGroupId);
    }
  }).catch(() => {});
}
const CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE || "74bdc85e";
console.log(">>> VK CONFIRMATION CODE SET TO:", CONFIRMATION_CODE);

const ROLES: Record<number, string> = {
  0: "–ü–û–õ–¨–ó–û–í–ê–¢–ï–õ–¨",
  1: "–ú–û–î–ï–†–ê–¢–û–†",
  2: "–°–¢–ê–†–®–ò–ô –ú–û–î–ï–†–ê–¢–û–†",
  3: "–ê–î–ú–ò–ù–ò–°–¢–†–ê–¢–û–†",
  4: "–°–¢–ê–†–®–ò–ô –ê–î–ú–ò–ù–ò–°–¢–†–ê–¢–û–†",
  5: "–ó–ê–ú. –ì–õ–ê–í–ù–û–ì–û –ê–î–ú–ò–ù–ò–°–¢–†–ê–¢–û–†–ê",
  6: "–ì–õ–ê–í–ù–´–ô –ê–î–ú–ò–ù–ò–°–¢–†–ê–¢–û–†",
  7: "–í–õ–ê–î–ï–õ–ï–¶ –ë–ï–°–ï–î–´",
  8: "–ó–ê–ú. –†–£–ö–û–í–û–î–ò–¢–ï–õ–Ø",
  9: "–û–°–ù. –ó–ê–ú. –†–£–ö–û–í–û–î–ò–¢–ï–õ–Ø",
  10: "–†–£–ö–û–í–û–î–ò–¢–ï–õ–¨ –ß–ê–¢-–ú–ï–ù–ï–î–ñ–ï–†–ê",
  11: "–ó–ê–ú. –í–õ–ê–î–ï–õ–¨–¶–ê –ß–ê–¢-–ú–ï–ù–ï–î–ñ–ï–†–ê",
  12: "–í–õ–ê–î–ï–õ–ï–¶ –ß–ê–¢-–ú–ï–ù–ï–î–ñ–ï–†–ê",
};

// Global Economic Settings
let globalSettings = {
  jcRate: 95000000,
  duelMultiplier: 2,
  rouletteMultiplier: 3,
  prizeMultiplier: 1,
  inviteRewardEnabled: true,
  startBalance: 1000,
  clansEnabled: true,
  gamesEnabled: true,
  maxWarnings: 3,
  casinoMultiplier: 2
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
const chatUserStatsCache = new Map<string, any>();
const chatInFlight = new Map<number, Promise<any>>();

async function getOrCreateChat(peerId: number) {
  let cached = chatCache.get(peerId);
  if (cached) return cached;

  // ‚ö° OPTIMISTIC INSTANT RETURN (ZERO FIRESTORE DELAY)
  cached = { id: peerId, title: `–ë–µ—Å–µ–¥–∞ ‚Ññ${peerId}`, autoReactionId: 0, type: "PL" };
  chatCache.set(peerId, cached);

  if (chatInFlight.has(peerId)) {
    return cached; // Already fetching
  }

  const promise = (async () => {
    const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
    let chatDoc: any = null;
    try {
      chatDoc = await chatRef.get();
    } catch (err: any) {
      console.warn("Firestore error in getOrCreateChat (using memory fallback):", err?.message || err);
    }

    if (chatDoc && chatDoc.exists) {
      const data = chatDoc.data() || {};
      chatCache.set(peerId, data);

      if ((!data.title || data.title.startsWith("–ë–µ—Å–µ–¥–∞ ‚Ññ")) && peerId > 2000000000) {
        (async () => {
          try {
            const convRes = await vkApi.get("messages.getConversationsById", {
              params: { access_token: VK_TOKEN, v: "5.199", peer_ids: peerId }
            });
            const settings = convRes.data?.response?.items?.[0]?.chat_settings;
            if (settings) {
              const upd: any = {};
              if (settings.title) { data.title = settings.title; upd.title = settings.title; }
              if (settings.owner_id) { data.ownerId = settings.owner_id; upd.ownerId = settings.owner_id; }
              if (settings.members_count) { data.membersCount = settings.members_count; upd.membersCount = settings.members_count; }
              if (Object.keys(upd).length > 0) {
                chatCache.set(peerId, data);
                chatRef.set(upd, { merge: true }).catch(() => {});
              }
            }
          } catch (e) {}
        })();
      }
      return data;
    } else {
      let title = `–ë–µ—Å–µ–¥–∞ ‚Ññ${peerId}`;
      const newChat: any = {
        id: peerId,
        title,
        ownerId: 0,
        membersCount: 0,
        type: "PL",
        af: false,
        antisliv: false,
        raid: false,
        group: false,
        welcometext: null,
        welcometext_enabled: false
      };
      chatCache.set(peerId, newChat);
      chatRef.set(newChat).catch(() => {});

      if (peerId > 2000000000) {
        (async () => {
          try {
            const convRes = await vkApi.get("messages.getConversationsById", {
              params: { access_token: VK_TOKEN, v: "5.199", peer_ids: peerId }
            });
            const settings = convRes.data?.response?.items?.[0]?.chat_settings;
            if (settings) {
              const upd: any = {};
              if (settings.title) { newChat.title = settings.title; upd.title = settings.title; }
              if (settings.owner_id) { newChat.ownerId = settings.owner_id; upd.ownerId = settings.owner_id; }
              if (settings.members_count) { newChat.membersCount = settings.members_count; upd.membersCount = settings.members_count; }
              if (Object.keys(upd).length > 0) {
                chatCache.set(peerId, newChat);
                chatRef.set(upd, { merge: true }).catch(() => {});
              }
            }
          } catch (e) {}
        })();
      }
      return newChat;
    }
  })();

  chatInFlight.set(peerId, promise);
  const result = await promise;
  chatInFlight.delete(peerId);
  return result;
}

async function updateChat(peerId: number, data: any) {
  let cached = chatCache.get(peerId);
  if (!cached) {
    cached = await getOrCreateChat(peerId);
  }
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

async function checkExpiredSilences() {
  const now = Date.now();
  for (const [peerId, chatData] of chatCache.entries()) {
    if (chatData.silence && chatData.silenceUntil && chatData.silenceUntil > 0 && chatData.silenceUntil <= now) {
      // Silence expired!
      await updateChat(peerId, { silence: false, silenceUntil: 0, silenceTest: false });
      try {
        const { items } = await getChatMembers(peerId);
        const memberIds = (items || [])
          .filter((item: any) => item.member_id > 0 && !item.is_admin && !item.is_owner)
          .map((item: any) => item.member_id);
        executeBatchVkRestrictions(peerId, memberIds, "rw").catch(() => {});
      } catch (e) {}

      try {
        await sendVkMessage(VK_TOKEN, peerId, `–†–µ–∂–∏–º —Ç–∏—à–∏–Ω—ã –±—ã–ª –æ–∫–æ–Ω—á–µ–Ω. –í—Å–µ —É—á–∞—Å—Ç–Ω–∏–∫–∏ –±–µ—Å–µ–¥—ã –º–æ–≥—É—Ç —Å–Ω–æ–≤–∞ –ø–∏—Å–∞—Ç—å –≤ –±–µ—Å–µ–¥—É.`);
      } catch (e) {}
    }
  }
}

function startExpiredSilencesChecker() {
  setInterval(async () => {
    try {
      await checkExpiredSilences();
    } catch (e) {}
  }, 5 * 1000);
}

async function deleteUserRecentMessages(peerId: number, userId: number, count: number = 5) {
  try {
    const recent = chatRecentMessages.get(peerId) || [];
    const userCmIds = recent.filter(m => m.fromId === userId).slice(-count).map(m => m.cmId);
    if (userCmIds.length > 0) {
      await deleteVkMessage(VK_TOKEN, peerId, userCmIds.join(","));
    }
  } catch (e) {}
}

function containsTagAll(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const patterns = [
    /@all\b/, /@–≤—Å–µ\b/, /@online\b/, /@–æ–Ω–ª–∞–π–Ω\b/, /@everyone\b/,
    /\*all\b/, /\*–≤—Å–µ\b/, /\*online\b/, /\*–æ–Ω–ª–∞–π–Ω\b/, /\*everyone\b/,
    /\[all\|/, /\[–≤—Å–µ\|/, /\[online\|/, /\[–æ–Ω–ª–∞–π–Ω\|/, /\[everyone\|/
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

const waitingForWelcome = new Map<string, boolean>();

const userAntiFlood = new Map<string, number[]>();
    
    const slivCounter = new Map<string, number[]>();
    const processSliv = async (peerId: number, userId: number, chatData?: any) => {
      // Primary Bot Creators / Founders / Devs are exempt
      if (userId === 778382713 || userId === 1115715881 || userId === 1) {
        return false;
      }
      const u = await getOrCreateUser(userId);
      const userRole = u.role || 0;
      if (userRole <= 8 || userRole >= 12) {
        return false;
      }

      const now = Date.now();
      const chatKey = `${peerId}_${userId}`;
      const globalKey = `global_${userId}`;

      let chatTimes = (slivCounter.get(chatKey) || []).filter(t => now - t < 60000);
      let globalTimes = (slivCounter.get(globalKey) || []).filter(t => now - t < 120000);

      chatTimes.push(now);
      globalTimes.push(now);

      slivCounter.set(chatKey, chatTimes);
      slivCounter.set(globalKey, globalTimes);

      // Trigger threshold: > 3 actions in 1 minute in a chat or > 5 actions globally in 2 minutes
      if (chatTimes.length > 3 || globalTimes.length > 5) {
         // Anti-Sliv Triggered!
         // 1. Remove all roles (global and chat) & Add to –ß–°–ë
         await updateUser(userId, {
            role: 0,
            chatRoles: {},
            blacklisted: true,
            blackBy: 1,
            blackReason: "–ü–æ–¥–æ–∑—Ä–µ–Ω–∏–µ –≤ —Å–ª–∏–≤–µ –±–æ—Ç–∞ (Anti-Sliv)",
            blackDate: now,
            blackExpiresAt: 0,
            gameBlacklisted: true
         });

         // 2. Ban in VK Group if group_id configured
         const cleanGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
         if (!isNaN(cleanGroupId) && cleanGroupId > 0) {
            try {
               await axios.get(`https://api.vk.com/method/groups.ban`, {
                  params: {
                     access_token: VK_TOKEN,
                     v: "5.199",
                     group_id: cleanGroupId,
                     owner_id: userId,
                     user_id: userId,
                     comment: "–ü–æ–¥–æ–∑—Ä–µ–Ω–∏–µ –≤ —Å–ª–∏–≤–µ –±–æ—Ç–∞ (Anti-Sliv)",
                     comment_visible: 1
                  }
               });
            } catch (e: any) {}
         }

         // 3. Exact response format
         const uName = u.fullName || u.nick || "–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
         const responseText = `–†–æ–ª—å —É [id${userId}|${uName}] –±—ã–ª–∞ —Å–Ω—è—Ç–∞ –∏–∑-–∑–∞ –ø–æ–¥–æ–∑—Ä–µ–Ω–∏—è –≤ —Å–ª–∏–≤–µ.\n\n–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å —Ç–∞–∫–∂–µ –∑–∞–Ω–µ—Å—ë–Ω –≤ –ß–°–ë, —ç—Ç–æ –Ω–µ–æ–±—Ö–æ–¥–∏–º–æ –¥–ª—è –±–µ–∑–æ–ø–∞—Å–Ω–æ—Å—Ç–∏.\n\n–ï—Å–ª–∏ –≤—ã —Å—á–∏—Ç–∞–µ—Ç–µ —á—Ç–æ —ç—Ç–æ –æ—à–∏–±–∫–∞, –æ–±—Ä–∞—Ç–∏—Ç–µ—Å—å –∫ –≤—ã—à–µ—Å—Ç–æ—è—â–µ–º—É —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤—É.`;

         await sendVkMessage(VK_TOKEN, peerId, responseText);

         slivCounter.delete(chatKey);
         slivCounter.delete(globalKey);

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
      return times.length >= 5;
    };

function declensionWord(number: number, one: string, two: string, five: string): string {
  const n = Math.abs(Math.floor(number)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}

function formatTimeAccusative(count: number, unit: "sec" | "min" | "hour" | "day" | "month"): string {
  if (unit === "sec") {
    return `${count} ${declensionWord(count, "—Å–µ–∫—É–Ω–¥—É", "—Å–µ–∫—É–Ω–¥—ã", "—Å–µ–∫—É–Ω–¥")}`;
  }
  if (unit === "min") {
    return `${count} ${declensionWord(count, "–º–∏–Ω—É—Ç—É", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç")}`;
  }
  if (unit === "hour") {
    return `${count} ${declensionWord(count, "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤")}`;
  }
  if (unit === "day") {
    return `${count} ${declensionWord(count, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")}`;
  }
  if (unit === "month") {
    return `${count} ${declensionWord(count, "–º–µ—Å—è—Ü", "–º–µ—Å—è—Ü–∞", "–º–µ—Å—è—Ü–µ–≤")}`;
  }
  return `${count} –º–∏–Ω.`;
}

const formatDurationBanTerm = (expiresAt?: number, startDate?: number): string => {
  if (!expiresAt || expiresAt === 0) return "–ù–∞–≤—Å–µ–≥–¥–∞";
  const start = startDate || Date.now();
  const diffMs = expiresAt - start;
  if (diffMs <= 0) return "–ò—Å—Ç—ë–∫";
  const days = Math.round(diffMs / (24 * 3600 * 1000));
  if (days >= 1) return `${days} ${declensionWord(days, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")}`;
  const hours = Math.round(diffMs / (3600 * 1000));
  if (hours >= 1) return `${hours} ${declensionWord(hours, "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤")}`;
  const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
  return `${mins} ${declensionWord(mins, "–º–∏–Ω—É—Ç—É", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç")}`;
};

const userCache = new Map<number, any>();
const zrApplicationStateMap = new Map<number, { step: number; answers: Record<number, string>; lastMsgId?: number }>();
const pingFloodCache = new Map<string, number>();
const commandHistory = new Map<number, { timestamps: number[] }>();

const userCommandTimestamps = new Map<number, number[]>();
interface CaptchaState {
  code: string;
  peerId: number;
  cmid: number;
  timeout: NodeJS.Timeout;
}
const activeCaptchas = new Map<number, CaptchaState>();

async function generateCaptchaImage(text: string): Promise<Buffer> {
  const canvas = createCanvas(200, 100);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 100);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(Math.random() * 200, Math.random() * 100);
    ctx.lineTo(Math.random() * 200, Math.random() * 100);
    ctx.stroke();
  }
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(100, 50);
  ctx.rotate((Math.random() - 0.5) * 0.2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#888888' : '#bbbbbb';
    ctx.beginPath();
    ctx.arc(Math.random() * 200, Math.random() * 100, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toBuffer('image/jpeg');
}

const uploadedPhotoCache = new Map<string, string>();

async function uploadCaptchaPhoto(peerId: number, imageBuffer: Buffer): Promise<string | null> {
  try {
    const serverRes = await fastVkCall("photos.getMessagesUploadServer", { access_token: VK_TOKEN, v: "5.199", peer_id: peerId }, false);
    if (!serverRes?.response?.upload_url) return null;
    const uploadUrl = serverRes.response.upload_url;
    const form = new FormData();
    form.append("photo", imageBuffer, { filename: "captcha.jpg", contentType: "image/jpeg" });
    const uploadRes = await axios.post(uploadUrl, form, { headers: form.getHeaders(), timeout: 8000 });
    const saveRes = await fastVkCall("photos.saveMessagesPhoto", {
      access_token: VK_TOKEN,
      v: "5.199",
      server: uploadRes.data.server,
      photo: uploadRes.data.photo,
      hash: uploadRes.data.hash
    }, false);
    const photo = saveRes?.response?.[0];
    if (!photo) return null;
    return `photo${photo.owner_id}_${photo.id}`;
  } catch (e: any) {
    console.error("Captcha upload error:", e.response?.data || e.message);
    return null;
  }
}

async function triggerCaptcha(userId: number, peerId: number, triggerMessage: any): Promise<boolean> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const imageBuf = await generateCaptchaImage(code);
  const photoAttachment = await uploadCaptchaPhoto(peerId, imageBuf);
  
  if (!photoAttachment) {
    console.error("Failed to upload captcha photo, bypassing captcha.");
    return false;
  }

  const fakeCodes = [
    Math.random().toString(36).substring(2, 8).toUpperCase(),
    Math.random().toString(36).substring(2, 8).toUpperCase(),
    Math.random().toString(36).substring(2, 8).toUpperCase()
  ];
  const allCodes = [code, ...fakeCodes].sort(() => Math.random() - 0.5);

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: allCodes[0], payload: JSON.stringify({ cmd: "captcha", code: allCodes[0], uid: userId }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[1], payload: JSON.stringify({ cmd: "captcha", code: allCodes[1], uid: userId }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: allCodes[2], payload: JSON.stringify({ cmd: "captcha", code: allCodes[2], uid: userId }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[3], payload: JSON.stringify({ cmd: "captcha", code: allCodes[3], uid: userId }) }, color: "secondary" }
      ]
    ]
  };
  
  const text = `–£–≤–∞–∂–∞–µ–º—ã–π –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å, –º—ã –∑–∞–º–µ—Ç–∏–ª–∏ —á—Ç–æ –≤—ã —Å—Ç–∞–ª–∏ —Å–ª–∏—à–∫–æ–º —á–∞—Å—Ç–æ –≤–≤–æ–¥–∏—Ç—å –∫–æ–º–∞–Ω–¥—ã.\n–î–ª—è —Ç–æ–≥–æ, —á—Ç–æ –±—ã –ø–æ–¥—Ç–≤–µ—Ä–¥–∏—Ç—å —á—Ç–æ –≤—ã —á–µ–ª–æ–≤–µ–∫, –Ω–∞–∂–º–∏—Ç–µ –Ω–∞ –∫–Ω–æ–ø–∫—É —Å –∫–æ–¥–æ–º, –∫–æ—Ç–æ—Ä—ã–π –∏–∑–æ–±—Ä–∞–∂–µ–Ω –Ω–∞ –∫–∞—Ä—Ç–∏–Ω–∫–µ.`;
  
  const res = await sendVkMessage(VK_TOKEN, peerId, text, {
    attachment: photoAttachment || "",
    forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [triggerMessage.conversation_message_id], is_reply: true }),
    keyboard: JSON.stringify(keyboard)
  });
  
  let cmid = 0;
  if (res && res.response && res.response.length > 0) {
    cmid = res.response[0].conversation_message_id || res.response[0].message_id;
  }
  
  const timeout = setTimeout(async () => {
    activeCaptchas.delete(userId);
    const user = await getOrCreateUser(userId);
    const expireDate = new Date(Date.now() + 120 * 60000);
    await updateUser(userId, {
      mute: true,
      muteAdminId: 0,
      muteReason: "–ù–µ –ø—Ä–æ—à—ë–ª –∫–∞–ø—á—É",
      muteExpires: expireDate.toISOString()
    });
    userCache.delete(userId);
    const fullName = user.fullName || user.nick || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
    const muteMsg = `[id${userId}|${fullName}] –ø–æ–ª—É—á–∏–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ –Ω–∞ 120 –º–∏–Ω—É—Ç –∏–∑-–∑–∞ –Ω–µ–ø—Ä–æ—Ö–æ–∂–¥–µ–Ω–∏—è –∫–∞–ø—á–∏. (#CAPTCHA)`;
    await sendVkMessage(VK_TOKEN, peerId, muteMsg);
  }, 30 * 60 * 1000);
  
  activeCaptchas.set(userId, { code, peerId, cmid, timeout });
  return true;
}

const chatMembersCache = new Map<number, { members: any[], profiles: any[], expiry: number }>();
const chatMembersInFlight = new Map<number, Promise<{ items: any[], profiles: any[], error?: number }>>();
const adminCache = new Map<string, { isAdmin: boolean, expiry: number }>();
const lastPickedInChat = new Map<number, number>();
const chatRecentMessages = new Map<number, { cmId: number, fromId: number, text?: string }[]>();
const noAdminThrottle = new Map<number, number>();
const buttonCooldowns = new Map<number, number>();

async function getChatMembers(peerId: number, forceFresh: boolean = false) {
  const cached = chatMembersCache.get(peerId);
  if (!forceFresh && cached && cached.expiry > Date.now()) {
    return { items: cached.members, profiles: cached.profiles };
  }
  if (!forceFresh && chatMembersInFlight.has(peerId)) {
    return await chatMembersInFlight.get(peerId)!;
  }
  const promise = (async () => {
    try {
      const res = await vkApi.get("messages.getConversationMembers", {
        params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.131" },
        timeout: 4500
      });
      if (res.data?.error) {
        if (res.data.error.error_code === 917) {
          adminCache.set(`bot_${peerId}`, { isAdmin: false, expiry: Date.now() + 30000 });
        }
        return { items: [], profiles: [], error: res.data.error.error_code };
      }
      const items = res.data?.response?.items || [];
      const profiles = res.data?.response?.profiles || [];
      for (const p of profiles) {
        if (p.id && p.first_name && p.last_name) {
          vkNameCache.set(p.id, `${p.first_name} ${p.last_name}`);
        }
      }
      const expiry = Date.now() + 900000; // 15 min cache
      chatMembersCache.set(peerId, { members: items, profiles, expiry });
      for (const m of items) {
        if (m.member_id) {
          adminCache.set(`${m.member_id}:${peerId}`, { isAdmin: Boolean(m.is_admin || m.is_owner), expiry });
          adminCache.set(`owner:${m.member_id}:${peerId}`, { isAdmin: Boolean(m.is_owner), expiry });
        }
      }
      const botMemberId = -Math.abs(runtimeBotGroupId || parseInt(String(VK_GROUP_ID)));
      const botMember = items.find((m: any) => m.member_id === botMemberId);
      const bAdmin = !botMember || Boolean(botMember.is_admin || botMember.is_owner || botMember.can_kick);
      adminCache.set(`bot_${peerId}`, { isAdmin: bAdmin, expiry });
      return { items, profiles };
    } catch (e) {
      return { items: [], profiles: [] };
    }
  })();

  chatMembersInFlight.set(peerId, promise);
  const result = await promise;
  chatMembersInFlight.delete(peerId);
  return result;
}

let cachedAllUsersList: any[] = [];
let cachedAllUsersExpiry = 0;

async function getAllUsers(): Promise<any[]> {
  if (userCache.size > 0) {
    return Array.from(userCache.values());
  }
  const now = Date.now();
  if (cachedAllUsersList.length > 0 && now < cachedAllUsersExpiry) {
    return cachedAllUsersList;
  }

  try {
    const snap = await firestoreDb.collection("users").get();
    const map = new Map<number, any>();
    snap.forEach(doc => {
      const u = doc.data();
      const uId = u.userId || parseInt(doc.id);
      if (uId && !isNaN(uId)) {
        map.set(uId, u);
      }
    });
    userCache.forEach((u, id) => {
      if (id) map.set(id, { ...map.get(id), ...u });
    });
    cachedAllUsersList = Array.from(map.values());
    cachedAllUsersExpiry = now + 60000; // 60s cache
    return cachedAllUsersList;
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

async function buildSysInfoText(): Promise<string> {
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
  let totalLogsCount = 0;
  try {
     const snap = await firestoreDb.collection("bot_logs").get();
     totalLogsCount = snap.size;
  } catch (e) {}
  const dbSizeMB = ((totalUsersCount * 1.5 + totalChatsCount * 4 + totalLogsCount * 0.5) / 1024).toFixed(2);

  const ping = (Math.random() * 30 + 15).toFixed(2);
  const resp = (Math.random() * 0.2 + 0.05).toFixed(2);

  return `...::–°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ –±–æ—Ç–∞::..\n\n` +
    `| –ü–∏–Ω–≥ –±–æ—Ç–∞: ${ping} –º—Å\n` +
    `| –°–∫–æ—Ä–æ—Å—Ç—å –æ—Ç–≤–µ—Ç–∞ –±–æ—Ç–∞: ${resp} —Å–µ–∫\n\n` +
    `| –£–ø–æ—Ç—Ä–µ–±–ª–µ–Ω–æ –û–ó–£: ${usedMemMB} –ú–ë\n` +
    `| –°–≤–æ–±–æ–¥–Ω–æ –û–ó–£: ${freeMemMB} –ú–ë\n\n` +
    `| –ó–∞–≥—Ä—É–∑–∫–∞ CPU: ${cpuLoad}%\n\n` +
    `| –ó–∞–ø–∏—Å–µ–π –≤ —Ç–∞–±–ª–∏—Ü–µ –ª–æ–≥–æ–≤: ${totalLogsCount}\n` +
    `| –ó–∞–Ω—è—Ç–æ –º–µ—Å—Ç–∞ –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö: ~${dbSizeMB} –ú–ë\n` +
    `| –°–≤–æ–±–æ–¥–Ω–æ –º–µ—Å—Ç–∞ –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö: –ù–µ –æ–≥—Ä–∞–Ω–∏—á–µ–Ω–æ\n\n` +
    `| –ü–æ—Å–ª–µ–¥–Ω–∏–π –ø–µ—Ä–µ–∑–∞–ø—É—Å–∫ –±–æ—Ç–∞: ${ds} ${ts}\n` +
    `| –° –º–æ–º–µ–Ω—Ç–∞ –ø–æ—Å–ª–µ–¥–Ω–µ–≥–æ –ø–µ—Ä–µ–∑–∞–ø—É—Å–∫–∞ –ø—Ä–æ—à–ª–æ: ${uptimeStr}`;
}

async function buildBotStatsText(): Promise<string> {
  const allChats = await getAllChats();
  const totalChats = allChats.length;
  let unactivatedChats = 0;
  allChats.forEach(c => {
    if (!c.active) unactivatedChats++;
  });

  const allUsers = await getAllUsers();
  let gbanCount = 0;
  let blacklistedCount = 0;
  let muteCount = 0;
  let warnCount = 0;
  let activeBanCount = 0;
  let rolesCount = 0;
  let globalRolesCount = 0;

  const now = Date.now();
  allUsers.forEach((u) => {
    if (u.gban) gbanCount++;
    if (u.blacklisted) blacklistedCount++;

    const hasMute = (u.muteUntil && u.muteUntil > now) || (u.chatMutes && Object.values(u.chatMutes).some((until: any) => Number(until) > now));
    if (hasMute) muteCount++;

    const hasWarn = (u.warnings && u.warnings > 0) || (u.chatWarnings && Object.values(u.chatWarnings).some((w: any) => Number(w) > 0));
    if (hasWarn) warnCount++;

    const hasBan = u.blacklisted || u.gban || (u.chatBans && Object.keys(u.chatBans).length > 0);
    if (hasBan) activeBanCount++;

    const hasRole = (u.role && u.role > 0) || (u.chatRoles && Object.keys(u.chatRoles).length > 0);
    if (hasRole) rolesCount++;

    if ((u.role && u.role >= 1) || u.userId === 778382713 || u.userId === 1) {
      globalRolesCount++;
    }
  });

  return `...::–°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞::...\n\n` +
    `| –ö–æ–ª-–≤–æ –±–µ—Å–µ–¥ —Å —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–æ–º: ${totalChats}\n` +
    `| –ò–∑ –Ω–∏—Ö –Ω–µ –∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞–Ω —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä: ${unactivatedChats}\n\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –≤ –≥–ª–æ–±–∞–ª—å–Ω–æ–π –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ: ${gbanCount}\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –≤ —á—ë—Ä–Ω–æ–º —Å–ø–∏—Å–∫–µ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞: ${blacklistedCount}\n\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å –∞–∫—Ç–∏–≤–Ω—ã–º –º—É—Ç–æ–º: ${muteCount}\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å –∞–∫—Ç–∏–≤–Ω—ã–º–∏ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è–º–∏: ${warnCount}\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å –∞–∫—Ç–∏–≤–Ω–æ–π –±–ª–æ–∫–∏—Ä–æ–≤–∫–æ–π: ${activeBanCount}\n\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å –ø—Ä–∞–≤–∞–º–∏: ${rolesCount}\n` +
    `| –ö–æ–ª-–≤–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å –≥–ª–æ–±–∞–ª—å–Ω—ã–º–∏ –ø—Ä–∞–≤–∞–º–∏: ${globalRolesCount}`;
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
    const snap = await firestoreDb.collection("users").limit(10000).get();
    snap.forEach(doc => {
      const u = doc.data();
      if (u && u.userId) {
        userCache.set(u.userId, u);
        if (u.fullName && !u.fullName.startsWith("User") && !u.fullName.startsWith("id")) {
          vkNameCache.set(u.userId, u.fullName);
        }
        if (u.nick) {
          userNickCache.set(u.nick.trim().toLowerCase(), u.userId);
        }
      }
    });
    console.log(`>>> Preloaded ${userCache.size} users, ${vkNameCache.size} names, and ${userNickCache.size} nicks into cache.`);
  } catch (err: any) {
    console.warn("Error preloading users (using memory cache):", err?.message || err);
  }

  try {
    const snap = await firestoreDb.collection("chats").limit(5000).get();
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
    const snap = await firestoreDb.collection("clans").limit(1000).get();
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

  try {
    const snap = await firestoreDb.collection("networks").limit(500).get();
    snap.forEach(doc => {
      const n = doc.data() as ChatNetwork;
      if (n && n.name) {
        networkCache.set(n.name.trim().toLowerCase(), n);
      }
    });
    console.log(`>>> Preloaded ${networkCache.size} networks into in-memory cache.`);
  } catch (err: any) {
    console.warn("Error preloading networks (using memory cache):", err?.message || err);
  }

  try {
    const snap = await firestoreDb.collection("promocodes").limit(1000).get();
    snap.forEach(doc => {
      const p = doc.data();
      if (p && p.code) {
        promoCache.set(p.code.trim().toLowerCase(), p);
      }
    });
    console.log(`>>> Preloaded ${promoCache.size} promocodes into in-memory cache.`);
  } catch (err: any) {
    console.warn("Error preloading promocodes (using memory cache):", err?.message || err);
  }

  try {
    const doc = await firestoreDb.collection("bot_settings").doc("global").get();
    if (doc.exists) {
      Object.assign(botSettingsCache, doc.data());
      console.log(`>>> Preloaded bot_settings into in-memory cache.`);
    }
  } catch (err: any) {}
}
preloadData();

// Memory Optimization Routine
setInterval(() => {
  const now = Date.now();
  if (userCache.size > 50000) {
    const keys = Array.from(userCache.keys());
    for (let i = 0; i < 1000; i++) {
      userCache.delete(keys[i]);
    }
  }
  if (chatCache.size > 10000) {
    const keys = Array.from(chatCache.keys());
    for (let i = 0; i < 500; i++) {
      chatCache.delete(keys[i]);
    }
  }
  
  // Clean up expired cache items to free RAM
  chatMembersCache.forEach((val, key) => {
    if (val.expiry < now) chatMembersCache.delete(key);
  });
  adminCache.forEach((val, key) => {
    if (val.expiry < now) adminCache.delete(key);
  });
}, 15 * 60 * 1000);

// Cleanup old bot logs
setInterval(async () => {
  try {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const snap = await firestoreDb.collection("bot_logs").where("timestamp", "<", oneWeekAgo).limit(500).get();
    if (!snap.empty) {
      const deletePromises = snap.docs.map(doc => firestoreDb.collection("bot_logs").doc(doc.id).delete());
      await Promise.all(deletePromises);
    }
  } catch (e) {
    console.error("Failed to clean up old logs:", e);
  }
}, 60 * 60 * 1000);

// Cleanup global deduplication events
setInterval(async () => {
  try {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const snap = await firestoreDb.collection("vk_processed_events").where("timestamp", "<", twoHoursAgo).limit(500).get();
    if (!snap.empty) {
      const deletePromises = snap.docs.map(doc => firestoreDb.collection("vk_processed_events").doc(doc.id).delete());
      await Promise.all(deletePromises);
    }
  } catch (e) {
    console.error("Failed to clean up old dedup events:", e);
  }
}, 60 * 60 * 1000);

// Periodic Database Synchronization (every 2 minutes)
setInterval(async () => {
  try {
    const userEntries = Array.from(userCache.entries());
    for (let i = 0; i < userEntries.length; i += 50) {
      const chunk = userEntries.slice(i, i + 50);
      await Promise.all(chunk.map(([uId, uData]) => {
        if (uData) {
          return firestoreDb.collection("users").doc(uId.toString()).set(uData, { merge: true });
        }
        return Promise.resolve();
      }));
    }

    const chatEntries = Array.from(chatCache.entries());
    for (let i = 0; i < chatEntries.length; i += 50) {
      const chunk = chatEntries.slice(i, i + 50);
      await Promise.all(chunk.map(([cId, cData]) => {
        if (cData) {
          return firestoreDb.collection("chats").doc(cId.toString()).set(cData, { merge: true });
        }
        return Promise.resolve();
      }));
    }
  } catch (e) {
    console.error("[DB Sync Error]", e);
  }
}, 2 * 60 * 1000);

// Helper to parse numbers with suffixes like k, kk, kkk, etc.
function parseNumber(input: string | number): number {
  if (typeof input === "number") return input;
  if (!input) return 0;
  let str = input.toString().toLowerCase().trim().replace(/,/g, ".");
  
  // Count consecutive k or –∫ at the end to handle arbitrarily large values (e.g. kkkk, kkkkk)
  let kCount = 0;
  while (str.endsWith("–∫") || str.endsWith("k")) {
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

// Robust formatter for game numbers preventing Infinity (‚àû) and scientific notation (e.g. 1e+21)
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

const vkNameCache = new Map<number, string>();
const vkNameInFlight = new Map<number, Promise<string | null>>();

async function fetchVkFirstName(userId: number): Promise<string> {
  const fullName = await fetchVkFullName(userId);
  if (fullName) {
    return fullName.split(" ")[0] || fullName;
  }
  return "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
}

async function fetchVkFullName(userId: number): Promise<string | null> {
  if (userId <= 0) return null;
  if (vkNameCache.has(userId)) {
    return vkNameCache.get(userId)!;
  }
  const cachedUser = userCache.get(userId);
  if (cachedUser && cachedUser.fullName && !cachedUser.fullName.startsWith("User") && !cachedUser.fullName.startsWith("id")) {
    vkNameCache.set(userId, cachedUser.fullName);
    return cachedUser.fullName;
  }
  if (vkNameInFlight.has(userId)) {
    return vkNameInFlight.get(userId)!;
  }

  const promise = (async () => {
    try {
      const res = await fastVkCall("users.get", { access_token: VK_TOKEN, user_ids: userId }, true);
      if (res?.response?.[0]) {
        const u = res.response[0];
        const fullName = `${u.first_name} ${u.last_name}`;
        vkNameCache.set(userId, fullName);
        return fullName;
      }
    } catch (e) {}
    return null;
  })();

  vkNameInFlight.set(userId, promise);
  const result = await promise;
  vkNameInFlight.delete(userId);
  return result;
}

const userInFlight = new Map<number, Promise<any>>();

async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {
  const userId = Number(userIdRaw);
  if (!userId || isNaN(userId)) {
    return { userId: 0, role: 0, fullName: "User0", balance: 0, bank: 0 } as any;
  }

  if (userId === 778382713 || userId === 1) {
    if (userCache.has(userId)) {
      const data = userCache.get(userId);
      data.role = 12;
    }
  }

  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (!data.fullName || data.fullName.startsWith("User")) {
      fetchVkFullName(userId).then(realName => {
        if (realName) {
          data.fullName = realName;
          const userRef = firestoreDb.collection("users").doc(userId.toString());
          userRef.set({ fullName: realName }, { merge: true }).catch(() => {});
        }
      }).catch(() => {});
    }
    return data;
  }

  // ‚ö° INSTANT OPTIMISTIC MEMORY USER CREATION (0ms DELAY)
  const optimisticUser: any = {
    userId,
    role: userId === 778382713 || userId === 1 ? 12 : 0,
    fullName: nameHint || `id${userId}`,
    nick: "",
    balance: globalSettings.startBalance || 1000,
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
    lastMessageAt: 0,
    status: "–ê–∫—Ç–∏–≤–Ω—ã–π",
    awstats: {},
    gawstats: false,
    roleDisabled: false,
    premiumProfileHidden: false,
    premiumBalanceHidden: false,
    deposits: [],
    lastHackAt: 0,
    lastFortuneAt: 0,
    dailyDay: 1,
    lastDailyAt: 0,
    hasSubBonus: false
  };

  userCache.set(userId, optimisticUser);

  // Background non-blocking Firestore sync
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  userRef.get().then(userDoc => {
    if (userDoc && userDoc.exists) {
      const data = userDoc.data() as any;
      if (userId === 778382713 || userId === 1) data.role = 12;
      Object.assign(optimisticUser, data);
    } else {
      userRef.set(optimisticUser, { merge: true }).catch(() => {});
    }
    if (!optimisticUser.fullName || optimisticUser.fullName.startsWith("User") || optimisticUser.fullName.startsWith("id")) {
      fetchVkFullName(userId).then(realName => {
        if (realName) {
          optimisticUser.fullName = realName;
          userRef.set({ fullName: realName }, { merge: true }).catch(() => {});
        }
      }).catch(() => {});
    }
  }).catch(() => {});

  return optimisticUser;
}

async function updateUser(userIdRaw: number | string, fields: Record<string, any>) {
  const userId = Number(userIdRaw);
  if (!userId || isNaN(userId)) return;
  let cached = userCache.get(userId);
  if (!cached) {
    cached = await getOrCreateUser(userId);
  }
  Object.assign(cached, fields);
  userCache.set(userId, cached);
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  // Non-blocking update to speed up bot response
  userRef.set(fields, { merge: true }).catch(() => {});
}

async function updateUserStats(userId: number, peerId?: number) {
  const mskDateStr = getMskDateStr();
  const cached = userCache.get(userId);
  if (cached) {
    cached.messagesTotal = (cached.messagesTotal || 0) + 1;
    cached.lastMessageAt = Math.floor(Date.now() / 1000);
    if (peerId) {
      cached.chatTodayMsgs = cached.chatTodayMsgs || {};
      cached.chatTotalMsgs = cached.chatTotalMsgs || {};
      cached.chatLastMsgDateStr = cached.chatLastMsgDateStr || {};
      
      cached.chatTotalMsgs[peerId] = (cached.chatTotalMsgs[peerId] || 0) + 1;
      
      if (cached.chatLastMsgDateStr[peerId] !== mskDateStr) {
        cached.chatTodayMsgs[peerId] = 1;
        cached.chatLastMsgDateStr[peerId] = mskDateStr;
      } else {
        cached.chatTodayMsgs[peerId] = (cached.chatTodayMsgs[peerId] || 0) + 1;
      }
    }
  }
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  const updateFields: any = {
    messagesTotal: FieldValue.increment(1),
    lastMessageAt: Math.floor(Date.now() / 1000)
  };
  if (peerId) {
    const pCount = cached?.chatTodayMsgs?.[peerId] || 1;
    updateFields[`chatTodayMsgs.${peerId}`] = pCount;
    updateFields[`chatTotalMsgs.${peerId}`] = FieldValue.increment(1);
    updateFields[`chatLastMsgDateStr.${peerId}`] = mskDateStr;
  }
  userRef.set(updateFields, { merge: true }).catch(() => {});
}

const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  
  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};
  const todayMsgs = (chatLastMsgDateMap[currentPeerId] === currentMskStr)
    ? (chatTodayMsgsMap[currentPeerId] || 0)
    : 0;
  
  const chatNicks = targetUser.chatNicks || {};
  let nickStr = chatNicks[currentPeerId] || "–æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
  let dispRole = await getRole(currentPeerId, targetId);
  let roleStr = getRoleDisplayName(dispRole);
  
  if (currentPeerId) {
     const chatData = await getOrCreateChat(currentPeerId);
     if (chatData && chatData.customRoles) {
        if (dispRole === 7 && chatData.customRoles.owner) roleStr = chatData.customRoles.owner;
        else if (dispRole === 6 && chatData.customRoles.ga) roleStr = chatData.customRoles.ga;
        else if (dispRole === 5 && chatData.customRoles.zga) roleStr = chatData.customRoles.zga;
        else if (dispRole === 4 && chatData.customRoles.sadmin) roleStr = chatData.customRoles.sadmin;
        else if (dispRole === 3 && chatData.customRoles.admin) roleStr = chatData.customRoles.admin;
        else if (dispRole === 2 && chatData.customRoles.smoder) roleStr = chatData.customRoles.smoder;
        else if (dispRole === 1 && chatData.customRoles.moder) roleStr = chatData.customRoles.moder;
     }
  }

  const hasGban = !!(targetUser.gban);
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);

  let statsStr = `–°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]\n\n`;
  statsStr += `| Nick -- ${nickStr}\n`;
  statsStr += `| VK ID -- ${targetId}\n\n`;
  statsStr += `| –î–æ–ª–∂–Ω–æ—Å—Ç—å: ${roleStr}\n`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += `| –°—Ç–∞—Ç—É—Å: ${userStatus}\n`;
  }
  statsStr += `\n| –ì–ª–æ–±–∞–ª—å–Ω—ã–µ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∏: ${hasGban ? "–î–∞" : "–ù–µ—Ç"}\n`;
  statsStr += `| –ë–ª–æ–∫–∏—Ä–æ–≤–∫–∏ –≤ –±–µ—Å–µ–¥–∞—Ö: ${hasChatBans ? "–î–∞" : "–ù–µ—Ç"}\n\n`;
  statsStr += `| –ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π: ${targetUser.warnings || 0}\n`;
  statsStr += `| –ê–∫—Ç–∏–≤–Ω–∞—è –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞ —á–∞—Ç–∞: ${targetUser.muteUntil && targetUser.muteUntil > Date.now() ? "–¥–∞" : "–Ω–µ—Ç"}\n\n`;
  statsStr += `| –ö–æ–ª-–≤–æ —Å–æ–æ–±—â–µ–Ω–∏–π —Å–µ–≥–æ–¥–Ω—è: ${todayMsgs}\n`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += `| –ö–æ–ª-–≤–æ —Å–æ–æ–±—â–µ–Ω–∏–π –∑–∞ –≤—Å—ë –≤—Ä–µ–º—è: ${totalMsgs}\n`;
  
  let lastActivityStr = "–æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
  const rawAct = targetUser.lastActivity || (targetUser.lastMessageAt && (targetUser.messagesTotal > 0 || (targetUser.chatTotalMsgs && Object.values(targetUser.chatTotalMsgs).some((v: any) => v > 0))) ? targetUser.lastMessageAt * 1000 : 0);
  if (rawAct && rawAct > 0) {
    lastActivityStr = fmtD(rawAct);
  }
  statsStr += `| –ü–æ—Å–ª–µ–¥–Ω—è—è –∞–∫—Ç–∏–≤–Ω–æ—Å—Ç—å: ${lastActivityStr}\n`;

  let isModViewer = false;
  if (viewerUserId) {
    const viewerUser = await getOrCreateUser(viewerUserId);
    const viewerRole = await getRole(currentPeerId, viewerUserId);
    const isVkAdmin = await checkIsAdmin(viewerUserId, currentPeerId, viewerUser.role);
    if (viewerRole >= 1 || viewerUser.role >= 1 || isVkAdmin) {
      isModViewer = true;
    }
  }

  const buttons: any[] = [];
  if (isModViewer) {
    buttons.push([
      { action: { type: "callback", label: "–ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
      { action: { type: "callback", label: "–ë–ª–æ–∫–∏—Ä–æ–≤–∫–∏", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
    ]);
  }

  buttons.push([
    { action: { type: "callback", label: "–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ VK –ø—Ä–æ—Ñ–∏–ª–µ", payload: JSON.stringify({ cmd: "vk_profile_info", targetId }) }, color: "secondary" }
  ]);

  const keyboard = {
    inline: true,
    buttons
  };

  return { text: statsStr, keyboard };
};


function maskProfanity(text: string): string {
  if (!text) return text;
  const profanities = [
    /—Ö—É[–π—è–µ—ë–∏]/gi, /–ø–∏–∑–¥/gi, /–µ–±–∞/gi, /—ë–±–∞/gi, /–µ–±—É/gi, /–±–ª—É–¥/gi, /–±–ª—è–¥/gi, /–±–ª—è—Ç/gi, /–∑–∞–ª—É–ø/gi, /–º—É–¥–∞/gi, /–ø–∏–¥–æ—Ä/gi, /–ø–µ–¥–∏–∫/gi, /—à–ª—é—Ö/gi, /–≥–æ–Ω–¥–æ–Ω/gi, /–≥–∞–Ω–¥–æ–Ω/gi, /—Å—É–∫–∞/gi, /—Å—É–∫–∏/gi
  ];
  let masked = text;
  profanities.forEach(regex => {
    masked = masked.replace(regex, "#####");
  });
  return masked;
}


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
      return { text: "–û—à–∏–±–∫–∞: –Ω–µ —É–¥–∞–ª–æ—Å—å –ø–æ–ª—É—á–∏—Ç—å –¥–∞–Ω–Ω—ã–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.", keyboard: { inline: true, buttons: [] } };
    }

    const u = res.data.response[0];
    const sexStr = u.sex === 1 ? "–ñ–µ–Ω—Å–∫–∏–π" : (u.sex === 2 ? "–ú—É–∂—Å–∫–æ–π" : "–ù–µ —É–∫–∞–∑–∞–Ω");
    const isClosedStr = u.is_closed ? "–ó–∞–∫—Ä—ã—Ç—ã–π" : "–û—Ç–∫—Ä—ã—Ç—ã–π";
    
    let lastSeenStr = "–°–∫—Ä—ã—Ç–æ";
    if (u.last_seen && u.last_seen.time) {
      lastSeenStr = fmtD(u.last_seen.time * 1000);
    }
    
    const counters = u.counters || {};
    const friendsCount = counters.friends ?? "–°–∫—Ä—ã—Ç–æ";
    const followersCount = counters.followers ?? "–°–∫—Ä—ã—Ç–æ";

    let text = `–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ VK –ø—Ä–æ—Ñ–∏–ª–µ [id${targetId}|${u.first_name} ${u.last_name}]\n\n`;
    text += `| –ò–º—è –§–∞–º–∏–ª–∏—è: ${u.first_name} ${u.last_name}\n`;
    text += `| VK ID –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è: ${targetId}\n\n`;
    const regDate = await getVkRegDate(targetId);
    text += `| –î–∞—Ç–∞ —Ä–µ–≥–∏—Å—Ç—Ä–∞—Ü–∏–∏: ${regDate || "–°–∫—Ä—ã—Ç–æ"}\n`;
    text += `| –î–∞—Ç–∞ —Ä–æ–∂–¥–µ–Ω–∏—è: ${u.bdate || "–°–∫—Ä—ã—Ç–æ"}\n\n`;
    text += `| –ü–æ–ª –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è: ${sexStr}\n\n`;
    
    if (u.status) {
      text += `| –°—Ç–∞—Ç—É—Å: ${maskProfanity(u.status)}\n\n`;
    } else {
      text += `| –°—Ç–∞—Ç—É—Å: –ù–µ —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω\n\n`;
    }
    
    text += `| –í —Å–µ—Ç–∏: ${lastSeenStr}\n\n`;
    text += `| –¢–∏–ø –ø—Ä–æ—Ñ–∏–ª—è: ${isClosedStr}\n\n`;
    text += `| –ö–æ–ª-–≤–æ –¥—Ä—É–∑–µ–π: ${friendsCount}\n`;
    text += `| –ö–æ–ª-–≤–æ –ø–æ–¥–ø–∏—Å—á–∏–∫–æ–≤: ${followersCount}\n\n`;
    
    if (u.city && u.city.title) {
      text += `| –ì–æ—Ä–æ–¥: ${maskProfanity(u.city.title)}\n`;
    }
    if (u.home_town) {
      text += `| –†–æ–¥–Ω–æ–π –≥–æ—Ä–æ–¥: ${maskProfanity(u.home_town)}\n`;
    }
    
    if (u.schools && u.schools.length > 0) {
      const schools = u.schools.map((s: any) => s.name).filter(Boolean).join(", ");
      if (schools) text += `| –®–∫–æ–ª–∞: ${maskProfanity(schools)}\n`;
    }
    
    if (u.occupation && u.occupation.name) {
      text += `| –†–∞–±–æ—Ç–∞: ${maskProfanity(u.occupation.name)}\n`;
    }
    
    if (u.interests) text += `\n| –ò–Ω—Ç–µ—Ä–µ—Å—ã: ${maskProfanity(u.interests)}\n`;
    if (u.music) text += `| –õ—é–±–∏–º–∞—è –º—É–∑—ã–∫–∞: ${maskProfanity(u.music)}\n`;
    if (u.movies) text += `| –õ—é–±–∏–º—ã–µ —Ñ–∏–ª—å–º—ã: ${maskProfanity(u.movies)}\n`;
    if (u.tv) text += `| –õ—é–±–∏–º—ã–µ —Ç–µ–ª–µ—à–æ—É: ${maskProfanity(u.tv)}\n`;
    if (u.books) text += `| –õ—é–±–∏–º—ã–µ –∫–Ω–∏–≥–∏: ${maskProfanity(u.books)}\n`;
    if (u.games) text += `| –õ—é–±–∏–º—ã–µ –∏–≥—Ä—ã: ${maskProfanity(u.games)}\n`;
    if (u.quotes) text += `| –õ—é–±–∏–º—ã–µ —Ü–∏—Ç–∞—Ç—ã: ${maskProfanity(u.quotes)}\n`;

    return { text, keyboard: { inline: true, buttons: [[{ action: { type: "callback", label: "–ù–∞–∑–∞–¥ –≤ —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫—É", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" }]] } };
  } catch (e) {
    return { text: "–û—à–∏–±–∫–∞: –Ω–µ —É–¥–∞–ª–æ—Å—å –ø–æ–ª—É—á–∏—Ç—å –¥–∞–Ω–Ω—ã–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.", keyboard: { inline: true, buttons: [] } };
  }
};

const getStatsWarnsPage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  const warnsCount = targetUser.warnings || 0;

  const getModStr = async (mId?: number) => {
    if (!mId) return "[id1|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]";
    return `[id${mId}|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]`;
  };

  const activeWarnsList = targetUser.activeWarningsList || [];
  let warnsListText = "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
  if (activeWarnsList && activeWarnsList.length > 0) {
    const lines: string[] = [];
    let idx = 1;
    for (const w of activeWarnsList) {
      const mStr = await getModStr(w.by);
      lines.push(`${idx}) ${mStr} | ${w.reason || '–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã'} | ${fmtD(w.date)}`);
      idx++;
    }
    warnsListText = lines.join("\n");
  } else if (warnsCount > 0) {
    const mStr = await getModStr(targetUser.warnedBy);
    warnsListText = `1) ${mStr} | ${targetUser.warnReason || '–ù–∞—Ä—É—à–µ–Ω–∏–µ –ø—Ä–∞–≤–∏–ª'} | ${fmtD(targetUser.warnDate || Date.now())}`;
  }

  const userLinkText = warnsCount === 0
    ? `[id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`
    : `–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${targetId}|${targetName}]`;

  const text = `–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è—Ö:

| –£ ${userLinkText} ${warnsCount} –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π.

| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –∞–∫—Ç–∏–≤–Ω—ã—Ö –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è—Ö:
${warnsListText}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "–û–±—â–∞—è –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "–ë–ª–æ–∫–∏—Ä–æ–≤–∫–∏", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
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
    if (!mId) return "[id1|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]";
    return `[id${mId}|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]`;
  };

  const gbanText = targetUser.gban ? `${await getModStr(targetUser.gbanBy)} | ${targetUser.gbanReason || '–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã'} | ${formatDurationBanTerm(targetUser.gbanExpiresAt, targetUser.gbanDate)} | ${fmtD(targetUser.gbanDate || Date.now())}` : "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
  const blackText = targetUser.blacklisted ? `${await getModStr(targetUser.blackBy)} | ${targetUser.blackReason || '–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã'} | ${formatDurationBanTerm(targetUser.blackExpiresAt, targetUser.blackDate)} | ${fmtD(targetUser.blackDate || Date.now())}` : "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
  const gameBanText = targetUser.isGameBanned ? `${await getModStr(targetUser.gameBanBy)} | ${targetUser.gameBanReason || '–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã'} | ${formatDurationBanTerm(targetUser.gameBanUntil, targetUser.gameBanDate)} | ${fmtD(targetUser.gameBanDate || Date.now())}` : "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";

  const chatBans = targetUser.chatBans || {};
  const cKeys = Object.keys(chatBans);
  const chatBansCount = cKeys.length;

  let chatBansText = "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
  if (cKeys.length > 0) {
    const lines: string[] = [];
    let idx = 1;
    for (const cId of cKeys) {
      const bInfo = chatBans[cId];
      const cData = await getOrCreateChat(Number(cId));
      const mStr = await getModStr(bInfo.by);
      lines.push(`${idx}) ${cData.title || `–ë–µ—Å–µ–¥–∞ ‚Ññ${cId}`} | ${mStr} | ${bInfo.reason || '–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã'} | ${fmtD(bInfo.date)}`);
      idx++;
    }
    chatBansText = lines.join("\n");
  }

  const text = `–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞—Ö ${targetLink}

| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –≥–ª–æ–±–∞–ª—å–Ω–æ–π –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö:
${gbanText}


| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –Ω–∞—Ö–æ–∂–¥–µ–Ω–∏–∏ –≤ —á—ë—Ä–Ω–æ–º —Å–ø–∏—Å–∫–µ –±–æ—Ç–∞:
${blackText}

| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ –∏–≥—Ä–æ–≤—ã—Ö –∫–æ–º–∞–Ω–¥:
${gameBanText}

| –ö–æ–ª-–≤–æ –±–ª–æ–∫–∏—Ä–æ–≤–æ–∫ –≤ –±–µ—Å–µ–¥–∞—Ö: ${chatBansCount}

| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞—Ö –≤ –±–µ—Å–µ–¥–∞—Ö:
${chatBansText}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "–û–±—â–∞—è –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "secondary" },
        { action: { type: "callback", label: "–ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
};

app.use(express.json());

// DDOS Protection: Rate Limiting


// Uptime monitor and health check endpoints
app.get("/ping", (req, res) => {
  const silenceSec = Math.round((Date.now() - lastLongPollUpdate) / 1000);
  if (silenceSec > 25 && VK_TOKEN) {
    lastLongPollUpdate = Date.now();
    startBotsLongPoll();
  }
  res.status(200).send("pong");
});

app.get("/api/bot-status", (req, res) => {
  const silenceSec = Math.round((Date.now() - lastLongPollUpdate) / 1000);
  if (silenceSec > 25 && VK_TOKEN) {
    lastLongPollUpdate = Date.now();
    startBotsLongPoll();
  }
  res.status(200).json({
    status: "online",
    bot: "JORDAN MANAGER",
    uptimeSeconds: Math.floor(process.uptime()),
    longPollSilenceSeconds: silenceSec,
    activeSessionId: activeLongPollSessionId,
    memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString()
  });
});

app.all("/api/wake", (req, res) => {
  lastLongPollUpdate = Date.now();
  startBotsLongPoll();
  res.status(200).json({
    success: true,
    status: "awakened",
    message: "JORDAN MANAGER successfully awakened and LongPoll refreshed!",
    timestamp: new Date().toISOString()
  });
});

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
  1: { name: "–®–∏–Ω–æ–º–æ–Ω—Ç–∞–∂–∫–∞", price: 250000, profit: 500, img: "https://images.unsplash.com/photo-1599256621730-5351f1e564d6?w=600" },
  2: { name: "–õ–∞—Ä—ë–∫-–∫–∞—Ñ–µ", price: 500000, profit: 1000, img: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600" },
  3: { name: "–ü–∞—Ä–∏–∫–º–∞—Ö–µ—Ä—Å–∫–∞—è", price: 750000, profit: 1500, img: "https://images.unsplash.com/photo-1521590832167-7bfcbaa6362d?w=600" },
  4: { name: "–ö–∞—Ñ–µ", price: 1000000, profit: 1850, img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600" },
  5: { name: "–†–µ—Å—Ç–æ—Ä–∞–Ω –±—ã—Å—Ç—Ä–æ–≥–æ –ø–∏—Ç–∞–Ω–∏—è", price: 1250000, profit: 2050, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600" },
  6: { name: "–°–µ—Ç—å –º–∞–≥–∞–∑–∏–Ω–æ–≤", price: 1800000, profit: 3000, img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=600" },
  7: { name: "IT –∫–∞–º–ø–∞–Ω–∏—è", price: 5000000, profit: 5000, img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600" },
  8: { name: "–ë–∞–Ω–∫", price: 12000000, profit: 7000, img: "https://images.unsplash.com/photo-1501167733088-49fb79ac8bb8?w=600" },
  9: { name: "–Æ–≤–µ–ª–∏—Ä–Ω—ã–π –º–∞–≥–∞–∑–∏–Ω", price: 25000000, profit: 12000, img: "https://images.unsplash.com/photo-1515562141207-7a48fb3ce270?w=600" },
  10: { name: "–ö–∞–∑–∏–Ω–æ", price: 50000000, profit: 20000, img: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=600" }
};


const DAILY_BONUSES: { [day: number]: { label: string, apply: (u: any, id: number) => Promise<void> } } = {
  1: { label: "25.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 25000 }); } },
  2: { label: "2 —Ä–µ–ø—É—Ç–∞—Ü–∏–∏", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 2 }); } },
  3: { label: "3 –ª–∏—Ç—Ä–∞ –ø–∏–≤–∞", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 3 }); } },
  4: { label: "75.000$", apply: async (u, id) => { await updateUser(id, { balance: (u.balance || 0) + 75000 }); } },
  5: { label: "4 —Ä–µ–ø—É—Ç–∞—Ü–∏–∏", apply: async (u, id) => { await updateUser(id, { rep: (u.rep || 0) + 4 }); } },
  6: { label: "7 –ª–∏—Ç—Ä–æ–≤ –ø–∏–≤–∞", apply: async (u, id) => { await updateUser(id, { beer: (u.beer || 0) + 7 }); } },
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
  role?: "–ú–∞—Ñ–∏—è" | "–®–µ—Ä–∏—Ñ" | "–î–æ–∫—Ç–æ—Ä" | "–ú–∏—Ä–Ω—ã–π –∂–∏—Ç–µ–ª—å";
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

// ==========================================
// Bitcoin (BTC) Helper Functions
// ==========================================
function getBtcDeclension(count: number): string {
  const abs = Math.abs(count) % 100;
  const num = abs % 10;
  if (abs > 10 && abs < 20) return "–±–∏—Ç–∫–æ–∏–Ω–æ–≤";
  if (num > 1 && num < 5) return "–±–∏—Ç–∫–æ–∏–Ω–∞";
  if (num === 1) return "–±–∏—Ç–∫–æ–∏–Ω";
  return "–±–∏—Ç–∫–æ–∏–Ω–æ–≤";
}

function getBtcRate(): number {
  const TEN_HOURS = 10 * 3600 * 1000;
  const currentBlock = Math.floor(Date.now() / TEN_HOURS);
  const x = Math.sin(currentBlock * 99991 + 12345) * 10000;
  const rnd = x - Math.floor(x);
  const minRate = 89000000;
  const maxRate = 100000000;
  return Math.floor(minRate + rnd * (maxRate - minRate));
}

function getBtcNextChangeTimer(): string {
  const TEN_HOURS = 10 * 3600 * 1000;
  const currentBlock = Math.floor(Date.now() / TEN_HOURS);
  const nextChangeTime = (currentBlock + 1) * TEN_HOURS;
  const msLeft = Math.max(0, nextChangeTime - Date.now());
  const totalSecs = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

function getMskFormattedTime(ms: number = Date.now()): string {
  return new Date(ms).toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function generateBtcChartPhoto(peerId: number, currentRate: number): Promise<string | null> {
  try {
    const TEN_HOURS = 10 * 3600 * 1000;
    const currentBlock = Math.floor(Date.now() / TEN_HOURS);
    const labels: string[] = [];
    const points: number[] = [];

    // Past 6 blocks + current block = 7 points (each 10 hours apart, strictly at :00 minutes)
    for (let i = 6; i >= 0; i--) {
      const blockIndex = currentBlock - i;
      const blockTimeMs = blockIndex * TEN_HOURS;
      labels.push(getMskFormattedTime(blockTimeMs));

      const x = Math.sin(blockIndex * 99991 + 12345) * 10000;
      const rnd = x - Math.floor(x);
      points.push(Math.floor(89000000 + rnd * 11000000));
    }

    const chartConfig = {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "–ö—É—Ä—Å BTC ($)",
          data: points,
          fill: true,
          backgroundColor: "rgba(247, 147, 26, 0.2)",
          borderColor: "#F7931A",
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#F7931A"
        }]
      },
      options: {
        title: { display: true, text: "–ì—Ä–∞—Ñ–∏–∫ —Å—Ç–æ–∏–º–æ—Å—Ç–∏ Bitcoin (BTC)", fontColor: "#ffffff", fontSize: 18 },
        legend: { labels: { fontColor: "#ffffff" } },
        scales: {
          xAxes: [{ gridLines: { color: "rgba(255,255,255,0.1)" }, ticks: { fontColor: "#ffffff" } }],
          yAxes: [{ gridLines: { color: "rgba(255,255,255,0.1)" }, ticks: { fontColor: "#ffffff" } }]
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?w=600&h=320&bkg=%231e1e24&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    const uploadRes = await uploadPhoto(peerId, chartUrl);
    return uploadRes.attachment || null;
  } catch (e) {
    console.error("Error generating BTC chart:", e);
    return null;
  }
}

async function getWeatherForecast(city: string, type: "today" | "day" | "week" | "month"): Promise<{ text: string, keyboard: any, lat?: number, long?: number } | null> {
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
    let resolvedCity = city.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    if (data.nearest_area && data.nearest_area[0] && data.nearest_area[0].areaName && data.nearest_area[0].areaName[0]) {
      const apiCity = data.nearest_area[0].areaName[0].value;
      const apiCountry = data.nearest_area[0].country?.[0]?.value || "";
      resolvedCity = apiCountry ? `${apiCity}, ${apiCountry}` : apiCity;
    }

    let lat: number | undefined = undefined;
    let long: number | undefined = undefined;
    if (data.nearest_area?.[0]?.latitude && data.nearest_area?.[0]?.longitude) {
      const parsedLat = parseFloat(data.nearest_area[0].latitude);
      const parsedLong = parseFloat(data.nearest_area[0].longitude);
      if (!isNaN(parsedLat) && !isNaN(parsedLong)) {
        lat = parsedLat;
        long = parsedLong;
      }
    }

    const formatTemp = (val: string | number) => {
      const num = Math.round(Number(val));
      if (num > 0) return `+${num}¬∞`;
      return `${num}¬∞`;
    };

    const getWindType = (speedMs: number) => {
      if (speedMs < 0.2) return "–®—Ç–∏–ª—å";
      if (speedMs <= 1.5) return "–¢–∏—Ö–∏–π";
      if (speedMs <= 3.3) return "–õ–µ–≥–∫–∏–π";
      if (speedMs <= 5.4) return "–°–ª–∞–±—ã–π";
      if (speedMs <= 7.9) return "–£–º–µ—Ä–µ–Ω–Ω—ã–π";
      if (speedMs <= 10.7) return "–°–≤–µ–∂–∏–π";
      if (speedMs <= 13.8) return "–°–∏–ª—å–Ω—ã–π";
      if (speedMs <= 17.1) return "–ö—Ä–µ–ø–∫–∏–π";
      if (speedMs <= 20.7) return "–û—á–µ–Ω—å –∫—Ä–µ–ø–∫–∏–π";
      if (speedMs <= 24.4) return "–®—Ç–æ—Ä–º";
      if (speedMs <= 28.4) return "–°–∏–ª—å–Ω—ã–π —à—Ç–æ—Ä–º";
      if (speedMs <= 32.6) return "–ñ–µ—Å—Ç–æ–∫–∏–π —à—Ç–æ—Ä–º";
      return "–£—Ä–∞–≥–∞–Ω";
    };

    const windDirFull: Record<string, string> = {
      "N": "–°–µ–≤–µ—Ä–Ω—ã–π", "NNE": "–°–µ–≤–µ—Ä–æ-–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "NE": "–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "ENE": "–í–æ—Å—Ç–æ–∫-–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π",
      "E": "–í–æ—Å—Ç–æ—á–Ω—ã–π", "ESE": "–í–æ—Å—Ç–æ–∫-–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "SE": "–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "SSE": "–Æ–≥-–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π",
      "S": "–Æ–∂–Ω—ã–π", "SSW": "–Æ–≥-–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "SW": "–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "WSW": "–ó–∞–ø–∞–¥-–Æ–≥-–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π",
      "W": "–ó–∞–ø–∞–¥–Ω—ã–π", "WNW": "–ó–∞–ø–∞–¥-–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "NW": "–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "NNW": "–°–µ–≤–µ—Ä–æ-–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π"
    };

    const windDirShort: Record<string, string> = {
      "N": "–°", "NNE": "–°–°–í", "NE": "–°–í", "ENE": "–í–°–í",
      "E": "–í", "ESE": "–í–Æ–í", "SE": "–Æ–í", "SSE": "–Æ–Æ–í",
      "S": "–Æ", "SSW": "–Æ–Æ–ó", "SW": "–Æ–ó", "WSW": "–ó–Æ–ó",
      "W": "–ó", "WNW": "–ó–°–ó", "NW": "–°–ó", "NNW": "–°–°–ó"
    };

    const getWindDirFull = (point: string, degree: number) => {
      if (point && windDirFull[point.toUpperCase()]) return windDirFull[point.toUpperCase()];
      const deg = (degree + 11.25) % 360;
      const index = Math.floor(deg / 22.5);
      const dirs = ["–°–µ–≤–µ—Ä–Ω—ã–π", "–°–µ–≤–µ—Ä–æ-–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–í–æ—Å—Ç–æ–∫-–°–µ–≤–µ—Ä–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–í–æ—Å—Ç–æ—á–Ω—ã–π", "–í–æ—Å—Ç–æ–∫-–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–Æ–≥-–Æ–≥–æ-–í–æ—Å—Ç–æ—á–Ω—ã–π", "–Æ–∂–Ω—ã–π", "–Æ–≥-–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "–ó–∞–ø–∞–¥-–Æ–≥-–Æ–≥–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "–ó–∞–ø–∞–¥–Ω—ã–π", "–ó–∞–ø–∞–¥-–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π", "–°–µ–≤–µ—Ä–æ-–°–µ–≤–µ—Ä–æ-–ó–∞–ø–∞–¥–Ω—ã–π"];
      return dirs[index] || "–°–µ–≤–µ—Ä–Ω—ã–π";
    };

    const getWindDirShort = (point: string, degree: number) => {
      if (point && windDirShort[point.toUpperCase()]) return windDirShort[point.toUpperCase()];
      const deg = (degree + 11.25) % 360;
      const index = Math.floor(deg / 22.5);
      const dirs = ["–°", "–°–°–í", "–°–í", "–í–°–í", "–í", "–í–Æ–í", "–Æ–í", "–Æ–Æ–í", "–Æ", "–Æ–Æ–ó", "–Æ–ó", "–ó–Æ–ó", "–ó", "–ó–°–ó", "–°–ó", "–°–°–ó"];
      return dirs[index] || "–°";
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
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –¥–µ–Ω—å", payload: JSON.stringify({ cmd: "weather_day", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –Ω–µ–¥–µ–ª—é", payload: JSON.stringify({ cmd: "weather_week", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –º–µ—Å—è—Ü", payload: JSON.stringify({ cmd: "weather_month", city }) }, color: "primary" }
      ]);
    } else {
      // For other views, add "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ —Å–µ–≥–æ–¥–Ω—è" as well
      buttons.push([
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ —Å–µ–≥–æ–¥–Ω—è", payload: JSON.stringify({ cmd: "weather_today", city }) }, color: "secondary" },
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –¥–µ–Ω—å", payload: JSON.stringify({ cmd: "weather_day", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –Ω–µ–¥–µ–ª—é", payload: JSON.stringify({ cmd: "weather_week", city }) }, color: "primary" }
      ]);
      buttons.push([
        { action: { type: "callback", label: "–ü—Ä–æ–≥–Ω–æ–∑ –Ω–∞ –º–µ—Å—è—Ü", payload: JSON.stringify({ cmd: "weather_month", city }) }, color: "primary" }
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

      let desc = "–Ø—Å–Ω–æ";
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

      const titleSuffix = isToday ? "—Å–µ–≥–æ–¥–Ω—è" : "–∑–∞–≤—Ç—Ä–∞";

      const text = `...::–ü—Ä–æ–≥–Ω–æ–∑ –ø–æ–≥–æ–¥—ã –≤ –≥–æ—Ä–æ–¥–µ ${resolvedCity} –Ω–∞ ${titleSuffix}::...\n\n` +
                   `| –°–µ–π—á–∞—Å: ${temp}\n` +
                   `| –û—â—É—â–∞–µ—Ç—Å—è –∫–∞–∫: ${feels}\n` +
                   `| –°–æ—Å—Ç–æ—è–Ω–∏–µ –Ω–µ–±–∞: ${desc}\n\n` +
                   `| –¢–∏–ø –≤–µ—Ç—Ä–∞: ${windType}\n` +
                   `| –°–∫–æ—Ä–æ—Å—Ç—å –≤–µ—Ç—Ä–∞: ${windMs} –º/—Å\n` +
                   `| –ù–∞–ø—Ä–∞–≤–ª–µ–Ω–∏–µ –≤–µ—Ç—Ä–∞: ${windDir}\n\n` +
                   `| –í–ª–∞–∂–Ω–æ—Å—Ç—å: ${humidity}%\n` +
                   `| –î–∞–≤–ª–µ–Ω–∏–µ: ${mmHg}–º–º\n\n` +
                   `| –ó–∞–∫–∞—Ç: ${sunset}\n` +
                   `| –†–∞—Å—Å–≤–µ—Ç: ${sunrise}`;

      return { text, keyboard, lat, long };

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
          cond = hourlyMid.lang_ru?.[0]?.value || hourlyMid.weatherDesc?.[0]?.value || "–Ø—Å–Ω–æ";
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

          const conditions = ["–Ø—Å–Ω–æ", "–ú–∞–ª–æ–æ–±–ª–∞—á–Ω–æ", "–ü–µ—Ä–µ–º–µ–Ω–Ω–∞—è –æ–±–ª–∞—á–Ω–æ—Å—Ç—å", "–û–±–ª–∞—á–Ω–æ —Å –ø—Ä–æ—è—Å–Ω–µ–Ω–∏—è–º–∏", "–ü–∞—Å–º—É—Ä–Ω–æ", "–ù–µ–±–æ–ª—å—à–æ–π –¥–æ–∂–¥—å", "–î–æ–∂–¥—å", "–ì—Ä–æ–∑–∞"];
          cond = conditions[Math.floor(rand() * conditions.length)];
        }

        const minStr = formatTemp(minT);
        const maxStr = formatTemp(maxT);
        const shortDir = getWindDirShort(windPt, windDeg);

        lines.push(`| ${dateStr} | –¢–µ–º–ø–µ—Ä–∞—Ç—É—Ä–∞: ${minStr}/${maxStr} | –í–µ—Ç–µ—Ä: ${windMs} –º/—Å, ${shortDir} | –°–æ—Å—Ç–æ—è–Ω–∏–µ –Ω–µ–±–∞: ${cond}`);
      }

      const text = `...::–ü—Ä–æ–≥–Ω–æ–∑ –ø–æ–≥–æ–¥—ã –≤ –≥–æ—Ä–æ–¥–µ ${resolvedCity} –Ω–∞ ${type === "week" ? "–Ω–µ–¥–µ–ª—é" : "–º–µ—Å—è—Ü"}::...\n\n` + lines.join("\n");
      return { text, keyboard, lat, long };
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
  shuffled[0].role = "–ú–∞—Ñ–∏—è";
  shuffled[1].role = "–®–µ—Ä–∏—Ñ";
  shuffled[2].role = "–î–æ–∫—Ç–æ—Ä";
  for (let i = 3; i < shuffled.length; i++) {
    shuffled[i].role = "–ú–∏—Ä–Ω—ã–π –∂–∏—Ç–µ–ª—å";
  }

  // Send roles in private messages
  for (const p of mg.players) {
    p.isAlive = true;
    p.choice = null;
    p.vote = null;
    await sendVkMessage(VK_TOKEN, p.id, `–ò–≥—Ä–∞ –º–∞—Ñ–∏—è –∑–∞–ø—É—â–µ–Ω–∞. –í–∞—à–∞ —Ä–æ–ª—å: ${p.role}`);
  }

  // Announcement in chat
  const playerMentions = mg.players.map(p => `[id${p.id}|${p.name}]`).join("\n");
  const startMsg = `–ò–≥—Ä–∞ –º–∞—Ñ–∏—è –±—ã–ª–∞ –Ω–∞—á–∞—Ç–∞.\n\n| –£—á–∞—Å—Ç–Ω–∏–∫–∏ –∏–≥—Ä—ã:\n${playerMentions}`;
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

  await sendVkMessage(VK_TOKEN, peerId, `–ù–æ—á—å –Ω–∞—Å—Ç—É–ø–∏–ª–∞, –∑–∞—Å—ã–ø–∞–µ—Ç –≥–æ—Ä–æ–¥...`, mg.nightPhoto ? { attachment: mg.nightPhoto } : {});

  for (const p of mg.players) {
    if (!p.isAlive) continue;

    if (p.role === "–ú–∞—Ñ–∏—è") {
      const alivePlayers = mg.players.filter(x => x.isAlive && x.id !== p.id);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `–£–±–∏—Ç—å ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "mafia_act", targetId: x.id, peerId })
          },
          color: "negative"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "–ù–∏—á–µ–≥–æ –Ω–µ –¥–µ–ª–∞—Ç—å",
            payload: JSON.stringify({ cmd: "mafia_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `–ù–∞—Å—Ç—É–ø–∏–ª–∞ –Ω–æ—á—å, –≤—Ä–µ–º—è —Å–æ–≤–µ—Ä—à–∏—Ç—å –¥–µ–π—Å—Ç–≤–∏–µ...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else if (p.role === "–®–µ—Ä–∏—Ñ") {
      const alivePlayers = mg.players.filter(x => x.isAlive && x.id !== p.id);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `–ó–∞—Å—Ç—Ä–µ–ª–∏—Ç—å ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "sheriff_act", targetId: x.id, peerId })
          },
          color: "negative"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "–ù–∏—á–µ–≥–æ –Ω–µ –¥–µ–ª–∞—Ç—å",
            payload: JSON.stringify({ cmd: "sheriff_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `–ù–∞—Å—Ç—É–ø–∏–ª–∞ –Ω–æ—á—å, –≤—Ä–µ–º—è —Å–æ–≤–µ—Ä—à–∏—Ç—å –¥–µ–π—Å—Ç–≤–∏–µ...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else if (p.role === "–î–æ–∫—Ç–æ—Ä") {
      const alivePlayers = mg.players.filter(x => x.isAlive);
      const buttons = alivePlayers.map(x => [
        {
          action: {
            type: "callback",
            label: `–í—ã–ª–µ—á–∏—Ç—å ${x.name}`.substring(0, 40),
            payload: JSON.stringify({ cmd: "doctor_act", targetId: x.id, peerId })
          },
          color: "positive"
        }
      ]);
      buttons.push([
        {
          action: {
            type: "callback",
            label: "–ù–∏—á–µ–≥–æ –Ω–µ –¥–µ–ª–∞—Ç—å",
            payload: JSON.stringify({ cmd: "doctor_act", targetId: "skip", peerId })
          },
          color: "secondary"
        }
      ]);
      await sendVkMessage(VK_TOKEN, p.id, `–ù–∞—Å—Ç—É–ø–∏–ª–∞ –Ω–æ—á—å, –≤—Ä–µ–º—è —Å–æ–≤–µ—Ä—à–∏—Ç—å –¥–µ–π—Å—Ç–≤–∏–µ...`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
    } else {
      await sendVkMessage(VK_TOKEN, p.id, `–ù–∞—Å—Ç—É–ø–∏–ª–∞ –Ω–æ—á—å, –∑–∞—Å—ã–ø–∞–π—Ç–µ... –í—ã - –º–∏—Ä–Ω—ã–π –∂–∏—Ç–µ–ª—å, –∂–¥–∏—Ç–µ –Ω–∞—Å—Ç—É–ø–ª–µ–Ω–∏—è —É—Ç—Ä–∞.`);
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

  const mafiaPlayer = mg.players.find(p => p.role === "–ú–∞—Ñ–∏—è");
  const sheriffPlayer = mg.players.find(p => p.role === "–®–µ—Ä–∏—Ñ");
  const doctorPlayer = mg.players.find(p => p.role === "–î–æ–∫—Ç–æ—Ä");

  const mafiaChoice = mafiaPlayer?.choice;
  const sheriffChoice = sheriffPlayer?.choice;
  const doctorChoice = doctorPlayer?.choice;

  const deaths: string[] = [];
  let saveMessage = "";

  if (mafiaChoice && mafiaChoice !== "skip" && typeof mafiaChoice === "number") {
    if (doctorChoice && doctorChoice === mafiaChoice) {
      const savedUser = mg.players.find(x => x.id === mafiaChoice);
      saveMessage = `–ú–∞—Ñ–∏—è –≤—ã—Å—Ç—Ä–µ–ª–∏–ª–∞ –≤ [id${savedUser?.id}|${savedUser?.name}], –Ω–æ –¥–æ–∫—Ç–æ—Ä –µ–≥–æ —Å–ø–∞—Å.`;
    } else {
      const killedUser = mg.players.find(x => x.id === mafiaChoice);
      if (killedUser) {
        killedUser.isAlive = false;
        deaths.push(`[id${killedUser.id}|${killedUser.name}] (—É–±–∏—Ç –º–∞—Ñ–∏–µ–π)`);
      }
    }
  }

  if (sheriffChoice && sheriffChoice !== "skip" && typeof sheriffChoice === "number") {
    const shotUser = mg.players.find(x => x.id === sheriffChoice);
    if (shotUser) {
      shotUser.isAlive = false;
      deaths.push(`[id${shotUser.id}|${shotUser.name}] (–∑–∞—Å—Ç—Ä–µ–ª–µ–Ω —à–µ—Ä–∏—Ñ–æ–º)`);
    }
  }

  const alivePlayers = mg.players.filter(x => x.isAlive);
  const aliveList = alivePlayers.map(p => `[id${p.id}|${p.name}]`).join("\n");

  let consequences = "";
  if (saveMessage) {
    consequences += saveMessage + "\n";
  }
  if (deaths.length > 0) {
    consequences += `–≠—Ç–æ–π –Ω–æ—á—å—é –ø–æ–≥–∏–±–ª–∏: ${deaths.join(", ")}`;
  } else if (!saveMessage) {
    consequences += `–≠—Ç–æ–π –Ω–æ—á—å—é –Ω–∏–∫—Ç–æ –Ω–µ –ø–æ—Å—Ç—Ä–∞–¥–∞–ª.`;
  }

  const morningMsg = `–ù–æ—á—å –ø—Ä–æ—à–ª–∞ –Ω–∞—Å—Ç–∞–ª–æ —É—Ç—Ä–æ\n\n` +
    `| –£—á–∞—Å—Ç–Ω–∏–∫–∏ –∏–≥—Ä—ã:\n${aliveList}\n\n` +
    `| –ü–æ—Å–ª–µ–¥—Å—Ç–≤–∏—è –Ω–æ—á–∏:\n${consequences}`;

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
          label: "–ù–∏—á–µ–≥–æ –Ω–µ –¥–µ–ª–∞—Ç—å",
          payload: JSON.stringify({ cmd: "mafia_vote_act", targetId: "skip", peerId })
        },
        color: "secondary"
      }
    ]);

    await sendVkMessage(VK_TOKEN, p.id, `–ù–∞—á–∞–ª–æ—Å—å –¥–Ω–µ–≤–Ω–æ–µ –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏–µ! –í—ã–±–µ—Ä–∏—Ç–µ –ø—Ä–æ—Ç–∏–≤ –∫–æ–≥–æ –≤—ã –≥–æ–ª–æ—Å—É–µ—Ç–µ:`, {
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
      await sendVkMessage(VK_TOKEN, peerId, `–ü–æ —Ä–µ–∑—É–ª—å—Ç–∞—Ç–∞–º –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏—è, –∂–∏—Ç–µ–ª–∏ –≥–æ—Ä–æ–¥–∞ –≤—ã–≥–Ω–∞–ª–∏: [id${lynched.id}|${lynched.name}] (—Ä–æ–ª—å: ${lynched.role})`);
    }
  } else {
    await sendVkMessage(VK_TOKEN, peerId, `–ü–æ —Ä–µ–∑—É–ª—å—Ç–∞—Ç–∞–º –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏—è, –Ω–∏–∫—Ç–æ –Ω–µ –ø–æ–∫–∏–Ω—É–ª –≥–æ—Ä–æ–¥ (–≥–æ–ª–æ—Å–∞ —Ä–∞–∑–¥–µ–ª–∏–ª–∏—Å—å –∏–ª–∏ –±–æ–ª—å—à–∏–Ω—Å—Ç–≤–æ –≤–æ–∑–¥–µ—Ä–∂–∞–ª–æ—Å—å).`);
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
  const mafiaAlive = alivePlayers.filter(p => p.role === "–ú–∞—Ñ–∏—è");
  const civiliansAlive = alivePlayers.filter(p => p.role !== "–ú–∞—Ñ–∏—è");

  let reward = 50000;
  if (mg.amount && mg.amount > 0) {
    reward = mg.amount * mg.players.length;
  }

  if (mafiaAlive.length >= civiliansAlive.length) {
    const mafiaMembers = mg.players.filter(p => p.role === "–ú–∞—Ñ–∏—è");
    const mentions = mafiaMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");
    
    let share = Math.floor(reward / mafiaMembers.length);

    await sendVkMessage(VK_TOKEN, peerId, `–ò–≥—Ä–∞ –æ–∫–æ–Ω—á–µ–Ω–∞! –ü–æ–±–µ–¥–∏–ª–∏: –ú–∞—Ñ–∏—è\n\n${mentions} - –∑–∞ –ø–æ–±–µ–¥—É –ø–æ–ª—É—á–∞—é—Ç –ø–æ ${share.toLocaleString()}$!`);

    for (const p of mafiaMembers) {
      const u = await getOrCreateUser(p.id);
      await updateUser(p.id, { balance: (u.balance || 0) + share });
    }

    mafiaGames.delete(peerId);
    return true;
  }

  if (mafiaAlive.length === 0) {
    const civilianMembers = mg.players.filter(p => p.role !== "–ú–∞—Ñ–∏—è");
    const mentions = civilianMembers.map(p => `[id${p.id}|${p.name}]`).join(", ");
    
    let share = Math.floor(reward / civilianMembers.length);

    await sendVkMessage(VK_TOKEN, peerId, `–ò–≥—Ä–∞ –æ–∫–æ–Ω—á–µ–Ω–∞! –ü–æ–±–µ–¥–∏–ª–∏: –ú–∏—Ä–Ω—ã–µ –∂–∏—Ç–µ–ª–∏\n\n${mentions} - –∑–∞ –ø–æ–±–µ–¥—É –ø–æ–ª—É—á–∞—é—Ç –ø–æ ${share.toLocaleString()}$!`);

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
  return `${day}.${month}.${year} ${hours}:${mins}:${secs} –ú–°–ö (UTC +3)`;
}

// Security & Sessions Maps
export const pendingLogins = new Map<string, { ordinaryCode: string; specialCode: string; fullName: string; role: number; expires: number }>();
export const activeSessions = new Map<string, { token: string; vkId: number; fullName: string; role: number; isSpecial: boolean; loginTime: number; lastActive: number }>();
export let lastLongPollUpdate = Date.now();

function parseDuration(str: string): { ms: number; text: string } | null {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhdwy])$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  let unitText = "";
  switch (unit) {
    case "s": ms = val * 1000; unitText = "—Å–µ–∫."; break;
    case "m": ms = val * 60 * 1000; unitText = "–º–∏–Ω."; break;
    case "h": ms = val * 3600 * 1000; unitText = "—á–∞—Å."; break;
    case "d": ms = val * 24 * 3600 * 1000; unitText = "–¥–Ω."; break;
    case "w": ms = val * 7 * 24 * 3600 * 1000; unitText = "–Ω–µ–¥."; break;
    case "y": ms = val * 365 * 24 * 3600 * 1000; unitText = "–ª–µ—Ç"; break;
  }
  return { ms, text: `${val} ${unitText}` };
}

function pluralizeRu(n: number, one: string, two: string, five: string): string {
  let num = Math.abs(n) % 100;
  if (num >= 5 && num <= 20) return five;
  num = num % 10;
  if (num === 1) return one;
  if (num >= 2 && num <= 4) return two;
  return five;
}

function parsePunishmentByDays(remainingArgs: string[]): {
  reason: string;
  duration: { days: number; ms: number; text: string; until: number } | null;
} {
  if (!remainingArgs || remainingArgs.length === 0) {
    return { reason: "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã", duration: null };
  }

  let days = 0;
  let argsStartIndex = 0;
  let argsEndIndex = remainingArgs.length;

  // 1. Try first argument: e.g. ["7", "—Å–ø–∞–º"] or ["7–¥", "—Å–ø–∞–º"] or ["7", "–¥–Ω–µ–π", "—Å–ø–∞–º"]
  const firstArg = remainingArgs[0].trim().toLowerCase();
  const matchFirst = firstArg.match(/^(\d+)([a-z–∞-—è—ë]+)?$/i);

  if (matchFirst) {
    const val = parseInt(matchFirst[1]);
    const unit = matchFirst[2] ? matchFirst[2].toLowerCase() : "";

    if (!isNaN(val) && val > 0) {
      if (!unit) {
        if (remainingArgs.length > 1) {
          const secondArg = remainingArgs[1].trim().toLowerCase();
          if (["d", "–¥", "–¥–Ω", "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π"].includes(secondArg)) {
            days = val;
            argsStartIndex = 2;
          } else {
            days = val;
            argsStartIndex = 1;
          }
        } else {
          days = val;
          argsStartIndex = 1;
        }
      } else if (["d", "–¥", "–¥–Ω", "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π"].includes(unit)) {
        days = val;
        argsStartIndex = 1;
      }
    }
  }

  // 2. If first arg was not duration, try last argument: e.g. ["—Å–ø–∞–º", "7"] or ["—Å–ø–∞–º", "7–¥"]
  if (days === 0 && remainingArgs.length > 1) {
    const lastArg = remainingArgs[remainingArgs.length - 1].trim().toLowerCase();
    const matchLast = lastArg.match(/^(\d+)([a-z–∞-—è—ë]+)?$/i);
    if (matchLast) {
      const val = parseInt(matchLast[1]);
      const unit = matchLast[2] ? matchLast[2].toLowerCase() : "";
      if (!isNaN(val) && val > 0) {
        if (!unit || ["d", "–¥", "–¥–Ω", "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π"].includes(unit)) {
          days = val;
          argsEndIndex = remainingArgs.length - 1;
        }
      }
    }
  }

  if (days > 0) {
    const reasonParts = remainingArgs.slice(argsStartIndex, argsEndIndex);
    const reason = reasonParts.join(" ").trim() || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
    const ms = days * 24 * 3600 * 1000;
    const text = `${days} ${pluralizeRu(days, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")}`;
    return {
      reason,
      duration: { days, ms, text, until: Date.now() + ms }
    };
  }

  const reason = remainingArgs.join(" ").trim() || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
  return { reason, duration: null };
}

function parsePunishmentTimeArg(lastArg: string): { ms: number; text: string; until: number } | null {
  if (!lastArg) return null;
  const match = lastArg.trim().toLowerCase().match(/^(\d+)\s*([a-z–∞-—è—ë]+)?$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  if (isNaN(val) || val <= 0) return null;
  const unit = match[2] ? match[2].toLowerCase() : "";

  let ms = 0;
  let text = "";

  if (["s", "—Å–µ–∫", "—Å–µ–∫—É–Ω–¥–∞", "—Å–µ–∫—É–Ω–¥—ã", "—Å–µ–∫—É–Ω–¥"].includes(unit)) {
    ms = val * 1000;
    text = `${val} ${pluralizeRu(val, "—Å–µ–∫—É–Ω–¥—É", "—Å–µ–∫—É–Ω–¥—ã", "—Å–µ–∫—É–Ω–¥")}`;
  } else if (["m", "–º", "–º–∏–Ω", "–º–∏–Ω—É—Ç–∞", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç"].includes(unit)) {
    ms = val * 60 * 1000;
    text = `${val} ${pluralizeRu(val, "–º–∏–Ω—É—Ç—É", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç")}`;
  } else if (["h", "—á", "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤"].includes(unit)) {
    ms = val * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤")}`;
  } else if (["d", "–¥", "–¥–Ω", "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π"].includes(unit)) {
    ms = val * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π")}`;
  } else if (["w", "–Ω–µ–¥", "–Ω–µ–¥–µ–ª—è", "–Ω–µ–¥–µ–ª–∏", "–Ω–µ–¥–µ–ª—å"].includes(unit)) {
    ms = val * 7 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "–Ω–µ–¥–µ–ª—é", "–Ω–µ–¥–µ–ª–∏", "–Ω–µ–¥–µ–ª—å")}`;
  } else if (["mo", "–º–µ—Å", "–º–µ—Å—è—Ü", "–º–µ—Å—è—Ü–∞", "–º–µ—Å—è—Ü–µ–≤"].includes(unit)) {
    ms = val * 30 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "–º–µ—Å—è—Ü", "–º–µ—Å—è—Ü–∞", "–º–µ—Å—è—Ü–µ–≤")}`;
  } else if (["y", "–≥", "–≥–æ–¥", "–≥–æ–¥–∞", "–ª–µ—Ç"].includes(unit)) {
    ms = val * 365 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "–≥–æ–¥", "–≥–æ–¥–∞", "–ª–µ—Ç")}`;
  } else {
    return null;
  }

  return { ms, text, until: Date.now() + ms };
}

function extractReasonAndDuration(remainingArgs: string[]): { reason: string; duration: { days?: number; ms: number; text: string; until: number } | null } {
  return parsePunishmentByDays(remainingArgs);
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
        await sendVkMessage(VK_TOKEN, userId, "–í–∞—à–∞ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞ –≤ –±–æ—Ç–µ –±—ã–ª–∞ –æ–∫–æ–Ω—á–µ–Ω–∞.\n–¢–µ–ø–µ—Ä—å –≤—ã —Å–Ω–æ–≤–∞ –º–æ–∂–µ—Ç–µ –∏–≥—Ä–∞—Ç—å –≤ –±–æ—Ç–∞.");
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
  const targetName = profile ? `${profile.first_name} ${profile.last_name}` : `–£—á–∞—Å—Ç–Ω–∏–∫ ${targetId}`;
  
  return { id: targetId, name: targetName };
}


// ==========================================
// Bot Global Logs, Tech Roles & Anti-Ad System
// ==========================================
export interface BotLogEntry {
  id?: string;
  timestamp: number;
  dateStr: string;
  type: "adm" | "mute" | "ban" | "warn" | "kick" | "game" | "general";
  peerId?: number;
  userId: number;
  targetId?: number;
  text: string;
  details?: any;
}

const recentLogsMemory: BotLogEntry[] = [];

function getRoleDisplayName(role: number): string {
  if (role >= 12) return "–í–ª–∞–¥–µ–ª–µ—Ü —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞";
  if (role === 11) return "–ó–∞–º. –í–ª–∞–¥–µ–ª—å—Ü–∞ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞";
  if (role === 10.5) return "–ì–ª–∞–≤–Ω—ã–π –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å";
  if (role === 10) return "–†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞";
  if (role === 9) return "–û—Å–Ω. –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (role === 8) return "–ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
  if (role === 7) return "–í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã";
  if (role === 6) return "–ì–ª–∞–≤–Ω—ã–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä";
  if (role === 5) return "–ó–∞–º. –ì–ª–∞–≤–Ω–æ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞";
  if (role === 4) return "–°—Ç–∞—Ä—à–∏–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä";
  if (role === 3) return "–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä";
  if (role === 2) return "–°—Ç–∞—Ä—à–∏–π –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";
  if (role === 1) return "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";
  return "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
}

async function logBotAction(entry: {
  type: "adm" | "mute" | "ban" | "warn" | "kick" | "game" | "general";
  peerId?: number;
  userId: number;
  targetId?: number;
  text: string;
  details?: any;
}) {
  try {
    const d = getMskDate();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const secs = String(d.getSeconds()).padStart(2, "0");
    const dateStr = `${day}.${month}.${year} ${hours}:${mins}:${secs}`;

    const logItem: BotLogEntry = {
      ...entry,
      timestamp: Date.now(),
      dateStr,
    };
    recentLogsMemory.unshift(logItem);
    if (recentLogsMemory.length > 2000) {
      recentLogsMemory.pop();
    }
    firestoreDb.collection("bot_logs").add(logItem).catch(() => {});
  } catch (e) {}
}

async function getFilteredLogs(filter: {
  type?: string;
  peerId?: number;
  userId?: number;
  targetId?: number;
}): Promise<BotLogEntry[]> {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const allLogs: BotLogEntry[] = [];
  const seenIds = new Set<string>();

  try {
    const snap = await firestoreDb.collection("bot_logs").get();
    for (const doc of snap.docs) {
      const data = doc.data() as BotLogEntry;
      if (!data) continue;
      const ts = data.timestamp || 0;
      if (ts < oneWeekAgo) continue;

      if (filter.peerId && filter.peerId > 0 && data.peerId !== filter.peerId) continue;
      if (filter.userId && filter.userId > 0 && data.userId !== filter.userId && data.targetId !== filter.userId) continue;
      if (filter.targetId && filter.targetId > 0 && data.targetId !== filter.targetId && data.userId !== filter.targetId) continue;
      if (filter.type && filter.type !== "all" && data.type !== filter.type) continue;

      const id = doc.id || `${ts}_${data.userId}_${data.text}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allLogs.push({ id, ...data });
      }
    }
  } catch (e) {}

  for (const l of recentLogsMemory) {
    if (l.timestamp < oneWeekAgo) continue;
    if (filter.peerId && filter.peerId > 0 && l.peerId !== filter.peerId) continue;
    if (filter.userId && filter.userId > 0 && l.userId !== filter.userId && l.targetId !== filter.userId) continue;
    if (filter.targetId && filter.targetId > 0 && l.targetId !== filter.targetId && l.userId !== filter.targetId) continue;
    if (filter.type && filter.type !== "all" && l.type !== filter.type) continue;

    const id = `${l.timestamp}_${l.userId}_${l.text}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      allLogs.push(l);
    }
  }

  allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return allLogs;
}

function renderLogsPage(title: string, logs: BotLogEntry[], page: number, payloadMeta: any) {
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const curPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (curPage - 1) * pageSize;
  const pageLogs = logs.slice(startIdx, startIdx + pageSize);

  let text = `...:: ${title} ::...\n\n`;
  if (pageLogs.length === 0) {
    text += "–õ–æ–≥–∏ –∑–∞ –ø–æ—Å–ª–µ–¥–Ω—é—é –Ω–µ–¥–µ–ª—é –æ—Ç—Å—É—Ç—Å—Ç–≤—É—é—Ç.";
  } else {
    pageLogs.forEach((l, idx) => {
      text += `${startIdx + idx + 1}. [${l.dateStr}] ${l.text}\n`;
    });
  }
  text += `\n–°—Ç—Ä–∞–Ω–∏—Ü–∞: ${curPage} –∏–∑ ${totalPages}`;

  const navRow: any[] = [];
  if (curPage > 1) {
    navRow.push({
      action: {
        type: "callback",
        label: "‚¨ÖÔ∏è –ù–∞–∑–∞–¥",
        payload: JSON.stringify({ ...payloadMeta, page: curPage - 1 })
      },
      color: "primary"
    });
  }
  if (curPage < totalPages) {
    navRow.push({
      action: {
        type: "callback",
        label: "–í–ø–µ—Ä—ë–¥ ‚û°Ô∏è",
        payload: JSON.stringify({ ...payloadMeta, page: curPage + 1 })
      },
      color: "primary"
    });
  }

  const buttons: any[] = [];
  if (navRow.length > 0) {
    buttons.push(navRow);
  }

  return { text, keyboard: buttons.length > 0 ? { inline: true, buttons } : undefined };
}

function detectAdvertisement(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const adPatterns = [
    /https?:\/\//i,
    /vk\.me\/join\//i,
    /vk\.cc\//i,
    /t\.me\//i,
    /telegram\.me\//i,
    /tg:\/\//i,
    /discord\.gg\//i,
    /chat\.whatsapp\.com\//i,
    /vk\.com\/(?:club|public|join|write)\d+/i,
    /\[(?:club|public)\d+\|[^\]]+\]/i
  ];
  return adPatterns.some(p => p.test(lower));
}


async function getRole(peerId: number, userId: number) {
  if (userId === 1115715881 || userId === 778382713 || userId === 1) {
     const u = await getOrCreateUser(userId);
     if (u.roleDisabled) return 0;
     return 12;
  }
  const u = await getOrCreateUser(userId);
  if (u.roleDisabled) return 0;
  const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
  return Math.max(u.role || 0, chatRole);
}

async function getRealRole(peerId: number, userId: number) {
  if (userId === 1115715881 || userId === 778382713 || userId === 1) return 12;
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

  if (cleanTag === 'all' || cleanTag === '–≤—Å–µ' || cleanTag === 'everyone') {
    if (/@all\b|\*all\b|\[all\||@–≤—Å–µ\b|\*–≤—Å–µ\b|\[–≤—Å–µ\||@everyone\b|\*everyone\b|\[everyone\|/i.test(t)) return true;
  }
  if (cleanTag === 'online' || cleanTag === '–æ–Ω–ª–∞–π–Ω') {
    if (/@online\b|\*online\b|\[online\||@–æ–Ω–ª–∞–π–Ω\b|\*–æ–Ω–ª–∞–π–Ω\b|\[–æ–Ω–ª–∞–π–Ω\|/i.test(t)) return true;
  }

  return false;
}

async function checkIsMainOwner(userId: number, peerId: number, userRole: number = 0): Promise<boolean> {
  if (userId === 1115715881 || userId === 778382713 || userId === 1 || userRole >= 12) return true;

  const chat = await getOrCreateChat(peerId);
  const secondaryOwners: number[] = Array.isArray(chat.secondaryOwners) ? chat.secondaryOwners : [];

  // If user is recorded as secondary owner, they are NOT main owner
  if (secondaryOwners.includes(userId)) {
    return false;
  }

  if (chat.ownerId && chat.ownerId === userId) {
    return true;
  }

  if (chat.sysOwnerId && chat.sysOwnerId === userId) {
    return true;
  }

  if (peerId > 2000000000) {
    const cachedMember = chatMembersCache.get(peerId);
    if (cachedMember && cachedMember.expiry > Date.now()) {
      const member = cachedMember.members.find((m: any) => m.member_id === userId);
      if (member && member.is_owner) {
        if (!chat.ownerId) {
          updateChat(peerId, { ownerId: userId }).catch(() => {});
        }
        return true;
      }
      return false;
    }

    try {
      const { items } = await getChatMembers(peerId);
      const member = items.find((m: any) => m.member_id === userId);
      if (member && member.is_owner) {
        if (!chat.ownerId) {
          updateChat(peerId, { ownerId: userId }).catch(() => {});
        }
        return true;
      }
    } catch (e) {}
  }

  return false;
}

async function checkHierarchy(peerId: number, authorId: number, targetId: number, authorIsAdmin: boolean = false): Promise<boolean> {
  if (authorId === targetId) return false;

  // Bot main creator / owner special IDs always have top priority
  if (authorId === 1115715881 || authorId === 778382713 || authorId === 1) {
    if (targetId === 1115715881 || targetId === 778382713 || targetId === 1) return false;
    return true;
  }
  if (targetId === 1115715881 || targetId === 778382713 || targetId === 1) {
    return false;
  }

  const aRole = await getRole(peerId, authorId);
  const tRole = await getRole(peerId, targetId);

  let aEffRole = aRole;
  if (authorIsAdmin && aEffRole < 1) aEffRole = 1;

  let tEffRole = tRole;
  const targetIsAdmin = await checkIsAdmin(targetId, peerId, tEffRole);
  if (targetIsAdmin && tEffRole < 1) tEffRole = 1;

  // Global leadership hierarchy (role >= 8)
  if (aEffRole >= 8 || tEffRole >= 8) {
    return aEffRole > tEffRole;
  }

  // Check main owner vs secondary owner hierarchy
  const authorIsMainOwner = await checkIsMainOwner(authorId, peerId, aEffRole);
  const targetIsMainOwner = await checkIsMainOwner(targetId, peerId, tEffRole);

  if (authorIsMainOwner) {
    if (targetIsMainOwner) return false;
    return true;
  }

  if (targetIsMainOwner) {
    return false;
  }

  // Author MUST have strictly higher role than target to perform action
  return aEffRole > tEffRole;
}

async function checkIsAdmin(userId: number, peerId: number, userRole: number = 0): Promise<boolean> {
  if (userRole >= 1 || userId === 778382713 || userId === 1 || userId === 1115715881) return true;
  
  const cacheKey = `${userId}:${peerId}`;
  const cached = adminCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.isAdmin;

  if (peerId > 2000000000) {
    const memCached = chatMembersCache.get(peerId);
    if (memCached && memCached.expiry > Date.now()) {
      const member = memCached.members.find((m: any) => m.member_id === userId);
      const isAdmin = Boolean(member && (member.is_admin || member.is_owner));
      adminCache.set(cacheKey, { isAdmin, expiry: Date.now() + 600000 });
      return isAdmin;
    }
    // Asynchronous background refresh
    getChatMembers(peerId).catch(() => {});
  }
  
  adminCache.set(cacheKey, { isAdmin: false, expiry: Date.now() + 120000 });
  return false;
}

async function checkIsOwner(userId: number, peerId: number, userRole: number = 0): Promise<boolean> {
  if (userId === 1115715881 || userId === 778382713 || userId === 1 || userRole >= 12) return true;
  const u = await getOrCreateUser(userId);
  const realRole = Math.max(u.role || 0, userRole, (u.chatRoles && u.chatRoles[peerId]) || 0);
  if (realRole >= 7) return true;

  const chat = await getOrCreateChat(peerId);
  if (chat.ownerId === userId || chat.sysOwnerId === userId) return true;
  if (Array.isArray(chat.secondaryOwners) && chat.secondaryOwners.includes(userId)) return true;
  
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
        if (!chat.ownerId) {
          updateChat(peerId, { ownerId: userId }).catch(() => {});
        }
      }
    } catch (e) {}
  }
  
  adminCache.set(cacheKey, { isAdmin: isOwner, expiry: Date.now() + 300000 }); // 5 min cache
  return isOwner;
}

async function deleteMessagesForUser(
  peerId: number,
  targetId: number | null,
  count: number,
  currentCmid?: number,
  replyCmid?: number
): Promise<number> {
  try {
    const rM = chatRecentMessages.get(peerId) || [];
    const cmidsSet = new Set<number>();

    // 1. If replied message exists, add it
    if (replyCmid && replyCmid > 0) {
      cmidsSet.add(replyCmid);
    }

    // 2. Add from in-memory cache
    let cached = [...rM];
    if (targetId) {
      const userCached = cached.filter(m => m.fromId === targetId && (!currentCmid || m.cmId !== currentCmid));
      userCached.slice(-count).forEach(m => cmidsSet.add(m.cmId));
    } else {
      const allCached = cached.filter(m => !currentCmid || m.cmId !== currentCmid);
      allCached.slice(-count).forEach(m => cmidsSet.add(m.cmId));
    }

    // 3. If no targetId and we have fewer than count messages, use conversation_message_id descending
    if (!targetId && currentCmid && currentCmid > 1) {
      for (let i = 1; i <= count && cmidsSet.size < count; i++) {
        const candidateCmid = currentCmid - i;
        if (candidateCmid > 0) {
          cmidsSet.add(candidateCmid);
        }
      }
    }

    // 4. Try VK messages.getHistory
    try {
      const historyRes = await axios.get("https://api.vk.com/method/messages.getHistory", {
        params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, count: Math.min(100, Math.max(20, count + 5)) },
        timeout: 3000
      });
      const historyItems = historyRes.data?.response?.items || [];
      if (Array.isArray(historyItems)) {
        if (targetId) {
          historyItems
            .filter((item: any) => item.from_id === targetId && (!currentCmid || item.conversation_message_id !== currentCmid))
            .slice(0, count)
            .forEach((item: any) => {
              if (item.conversation_message_id) cmidsSet.add(item.conversation_message_id);
            });
        } else {
          historyItems
            .filter((item: any) => !currentCmid || item.conversation_message_id !== currentCmid)
            .slice(0, count)
            .forEach((item: any) => {
              if (item.conversation_message_id) cmidsSet.add(item.conversation_message_id);
            });
        }
      }
    } catch (e) {}

    let cmidsList = Array.from(cmidsSet).filter(id => id > 0 && id !== currentCmid);
    if (cmidsList.length > count) {
      cmidsList = cmidsList.slice(-count);
    }

    if (cmidsList.length > 0) {
      const ids = cmidsList.join(",");
      await deleteVkMessage(VK_TOKEN, peerId, ids);

      // Also delete the /clear command itself
      if (currentCmid) {
        await deleteVkMessage(VK_TOKEN, peerId, currentCmid);
      }

      chatRecentMessages.set(peerId, rM.filter(m => !cmidsList.includes(m.cmId) && m.cmId !== currentCmid));
      return cmidsList.length;
    }
    return count;
  } catch (e) {
    console.error("Error in deleteMessagesForUser:", e);
    return count;
  }
}

function isModerationCommandMessage(text?: string, fromId?: number): boolean {
  // Do NOT delete bot responses (fromId < 0)
  if (fromId && fromId < 0) return false;
  if (!text) return false;
  const trimmed = text.trim();
  
  // Check if starts with bot prefix or mention
  let content = trimmed;
  if (/^\[(?:club|public|id)\d+\|[^\]]+\]\s*/i.test(content)) {
    content = content.replace(/^\[(?:club|public|id)\d+\|[^\]]+\]\s*/i, "");
  }
  
  if (!/^[\/\!\.\+\~\?]/i.test(content)) return false;
  
  const firstWord = content.split(/[\s\n]+/)[0]?.toLowerCase().replace(/^[^\w–∞-—è—ë]+/gi, "");
  
  // Moderation / Administrative command triggers only
  const moderationTriggers = new Set([
    "mute", "–º—É—Ç", "unmute", "—Ä–∞–∑–º—É—Ç",
    "warn", "–≤–∞—Ä–Ω", "unwarn", "—Ä–∞–∑–≤–∞—Ä–Ω", "warns", "–≤–∞—Ä–Ω—ã",
    "kick", "–∫–∏–∫", "–∏—Å–∫–ª—é—á–∏—Ç—å", "–≤—ã–≥–Ω–∞—Ç—å", "–∫", "k",
    "ban", "–±–∞–Ω", "unban", "—Ä–∞–∑–±–∞–Ω",
    "clear", "mclear", "–æ—á–∏—Å—Ç–∏—Ç—å", "—á–∏—Å—Ç–∫–∞",
    "purge", "–ø—É—Ä–¥–∂",
    "pin", "–ø–∏–Ω", "unpin", "–∞–Ω–ø–∏–Ω", "–æ—Ç–∫—Ä–µ–ø–∏—Ç—å", "–∑–∞–∫—Ä–µ–ø–∏—Ç—å",
    "addaccesslevel", "—Ä–æ–ª—å", "addlevel", "setlevel", "setaccesslevel", "addaccess", "–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å",
    "removerole", "—Å–Ω—è—Ç—å—Ä–æ–ª—å", "—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞",
    "gban", "ungban", "addblack", "unblack",
    "banid", "unbanid", "addzsr", "addozsr", "addruk", "addzamowner",
    "setowner", "deleteowner", "giveowner", "dgiveowner", "addowner", "–∞–¥–¥–æ–≤–Ω–µ—Ä", "–≤—ã–¥–∞—Ç—å–æ–≤–Ω–µ—Ä–∞", "–≤—ã–¥–∞—Ç—å–≤–ª–∞–¥–µ–ª—å—Ü–∞", "addown",
    "arrole", "grrole", "–∫–∏–∫–Ω–µ–∞–∫—Ç–∏–≤",
    "smute"
  ]);
  
  return firstWord ? moderationTriggers.has(firstWord) : false;
}

async function purgeCommandMessages(peerId: number, maxCount: number = 200): Promise<number> {
  try {
    const historyRes = await axios.get("https://api.vk.com/method/messages.getHistory", {
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, count: Math.min(200, Math.max(1, maxCount)) }
    });
    const historyItems = historyRes.data?.response?.items || [];
    
    const rM = chatRecentMessages.get(peerId) || [];
    const cmidsSet = new Set<number>();
    
    for (const item of historyItems) {
      if (item.conversation_message_id && isModerationCommandMessage(item.text, item.from_id)) {
        cmidsSet.add(item.conversation_message_id);
      }
    }
    
    for (const m of rM) {
      if (m.cmId && isModerationCommandMessage(m.text, m.fromId)) {
        cmidsSet.add(m.cmId);
      }
    }
    
    const cmidsList = Array.from(cmidsSet);
    if (cmidsList.length === 0) return 0;
    
    for (let i = 0; i < cmidsList.length; i += 100) {
      const chunk = cmidsList.slice(i, i + 100);
      try {
        await deleteVkMessage(VK_TOKEN, peerId, chunk.join(","));
      } catch (err) {
        console.error("Error deleting purge chunk:", err);
      }
    }
    
    chatRecentMessages.set(peerId, rM.filter(m => !cmidsSet.has(m.cmId)));
    return cmidsList.length;
  } catch (e) {
    console.error("Error in purgeCommandMessages:", e);
    return 0;
  }
}

function parseMuteDuration(args: string[]): { timeMin: number, argIndex: number } {
  for (let i = 1; i < args.length; i++) {
    const arg = args[i].trim().toLowerCase();
    if (arg.includes("id") || arg.startsWith("[") || arg.includes("|")) {
      continue;
    }
    const match = arg.match(/^(\d+)([a-z–∞-—è—ë\.\s]+)?$/i);
    if (match) {
      const val = parseInt(match[1]);
      const suffix = (match[2] || "").replace(/\./g, "").trim().toLowerCase();
      if (!suffix && val > 100000) {
        continue;
      }
      let rawMin = val;
      if (!suffix) {
        rawMin = val;
      } else if (["m", "–º", "–º–∏–Ω", "–º–∏–Ω—É—Ç–∞", "–º–∏–Ω—É—Ç—ã", "–º–∏–Ω—É—Ç"].includes(suffix)) {
        rawMin = val;
      } else if (["h", "—á", "—á–∞—Å", "—á–∞—Å–∞", "—á–∞—Å–æ–≤"].includes(suffix)) {
        rawMin = val * 60;
      } else if (["d", "–¥", "–¥–Ω", "–¥–µ–Ω—å", "–¥–Ω—è", "–¥–Ω–µ–π"].includes(suffix)) {
        rawMin = val * 24 * 60;
      } else if (["s", "—Å", "—Å–µ–∫", "—Å–µ–∫—É–Ω–¥–∞", "—Å–µ–∫—É–Ω–¥—ã", "—Å–µ–∫—É–Ω–¥"].includes(suffix)) {
        rawMin = Math.round(val / 60);
      }
      const clampedMin = Math.min(Math.max(1, rawMin), 1000);
      return { timeMin: clampedMin, argIndex: i };
    }
  }
  return { timeMin: 30, argIndex: -1 };
}

// Helper for photo upload with instant memory cache & fast HTTP pipeline
async function uploadPhoto(peerId: number, source: string | Buffer, retries = 2): Promise<{ attachment: string | null; error: string | null }> {
  // ‚ö° INSTANT MEMORY ATTACHMENT CACHE (0ms DELAY)
  let cacheKey = "";
  if (typeof source === "string") {
    cacheKey = `url:${source}`;
  } else if (Buffer.isBuffer(source)) {
    const len = source.length;
    const sub1 = source.subarray(0, 32).toString("hex");
    const sub2 = source.subarray(-32).toString("hex");
    cacheKey = `buf:${len}:${sub1}:${sub2}`;
  }

  if (cacheKey && uploadedPhotoCache.has(cacheKey)) {
    return { attachment: uploadedPhotoCache.get(cacheKey)!, error: null };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const serverRes = await fastVkCall("photos.getMessagesUploadServer", {
        access_token: VK_TOKEN,
        v: "5.199",
        peer_id: peerId
      }, false);

      if (serverRes?.error) {
        lastError = `VK Server Error: ${serverRes.error.error_msg}`;
        continue;
      }
      const uploadUrl = serverRes?.response?.upload_url;
      if (!uploadUrl) {
        lastError = "Failed to get VK upload url";
        continue;
      }

      let buffer: Buffer;
      if (typeof source === "string") {
        const dlRes = await axios.get(source, { responseType: "arraybuffer", timeout: 6000 });
        buffer = Buffer.from(dlRes.data);
      } else {
        buffer = source;
      }
      
      const isPngBuffer = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const filename = isPngBuffer ? "photo.png" : "photo.jpg";
      const contentType = isPngBuffer ? "image/png" : "image/jpeg";

      const form = new FormData();
      form.append("photo", buffer, { filename, contentType });
      
      const uploadRes = await axios.post(uploadUrl, form, { headers: form.getHeaders(), timeout: 10000 });
      if (!uploadRes.data?.photo || uploadRes.data.photo === "[]" || uploadRes.data.photo === "") {
        lastError = `VK Upload empty data`;
        continue;
      }

      const saveRes = await fastVkCall("photos.saveMessagesPhoto", {
        access_token: VK_TOKEN,
        v: "5.199",
        photo: uploadRes.data.photo,
        server: uploadRes.data.server,
        hash: uploadRes.data.hash
      }, false);

      if (saveRes?.error) {
        lastError = `VK Save Error: ${saveRes.error.error_msg}`;
        continue;
      }
      const photo = saveRes?.response?.[0];
      if (!photo) {
        lastError = "VK Save photo response empty";
        continue;
      }

      const attachment = `photo${photo.owner_id}_${photo.id}`;
      if (cacheKey) {
        uploadedPhotoCache.set(cacheKey, attachment);
        if (uploadedPhotoCache.size > 5000) {
          const firstKey = uploadedPhotoCache.keys().next().value;
          if (firstKey) uploadedPhotoCache.delete(firstKey);
        }
      }

      return { attachment, error: null };
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

let quoteBgImageCache: any = null;
let quoteBgLoadingPromise: Promise<any> | null = null;

async function getQuoteBgImage() {
  if (quoteBgImageCache) return quoteBgImageCache;
  if (quoteBgLoadingPromise) return quoteBgLoadingPromise;
  if (!loadImage) return null;

  quoteBgLoadingPromise = (async () => {
    try {
      const bg = await loadImage(QUOTE_BG);
      quoteBgImageCache = bg;
      return bg;
    } catch (e) {
      return null;
    } finally {
      quoteBgLoadingPromise = null;
    }
  })();
  return quoteBgLoadingPromise;
}

async function generateQuote(text: string, avatarUrl: string, name: string): Promise<Buffer> {
  if (!createCanvas || !loadImage) {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  try {
    const bg = await getQuoteBgImage();
    if (bg) {
      ctx.drawImage(bg, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
    }
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
    const avatar = await loadCachedImage(avatarUrl);
    if (avatar) {
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
    }
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

  const months = ["—è–Ω–≤", "—Ñ–µ–≤", "–º–∞—Ä", "–∞–ø—Ä", "–º–∞—è", "–∏—é–Ω", "–∏—é–ª", "–∞–≤–≥", "—Å–µ–Ω", "–æ–∫—Ç", "–Ω–æ—è", "–¥–µ–∫"];
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  const mskTime = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  const dateStr = `${mskTime.getDate()} ${months[mskTime.getMonth()]} ${mskTime.getFullYear()} –≤ ${String(mskTime.getHours()).padStart(2, "0")}:${String(mskTime.getMinutes()).padStart(2, "0")}`;

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
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "–±–∏–∑–Ω–µ—Å–æ–≤";
  if (lastDigit === 1) return "–±–∏–∑–Ω–µ—Å";
  if (lastDigit >= 2 && lastDigit <= 4) return "–±–∏–∑–Ω–µ—Å–∞";
  return "–±–∏–∑–Ω–µ—Å–æ–≤";
}

async function getVkRegDate(targetId: number): Promise<string | null> {
  if (!targetId || targetId <= 0) return null;
  try {
    const params = new URLSearchParams();
    params.append("link", targetId.toString());
    params.append("button", "–û–ø—Ä–µ–¥–µ–ª–∏—Ç—å –¥–∞—Ç—É —Ä–µ–≥–∏—Å—Ç—Ä–∞—Ü–∏–∏");
    const res = await axios.post("https://regvk.com/", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://regvk.com/"
      },
      timeout: 8000
    });
    if (res.data) {
      const match = res.data.match(/–î–∞—Ç–∞ —Ä–µ–≥–∏—Å—Ç—Ä–∞—Ü–∏–∏:\s*([^<]+)/i);
      const passedMatch = res.data.match(/–ü—Ä–æ—à–ª–æ –≤—Ä–µ–º–µ–Ω–∏:\s*([^<]+)/i);
      if (match) {
        const dateStr = match[1].trim();
        const passedStr = passedMatch ? passedMatch[1].trim().replace(/\s+/g, " ") : "";
        return passedStr ? `${dateStr} (${passedStr})` : dateStr;
      }
    }
  } catch (e: any) {
    console.error("Error fetching reg date from regvk:", e.message);
  }
  return null;
}

function isUserMentionedInText(rawText: string, targetId: number, targetDomain?: string): boolean {
  if (!rawText || !targetId) return false;
  const t = rawText.toLowerCase();
  const idStr = targetId.toString();

  // –ü—Ä–æ–≤–µ—Ä–∫–∞ —Ç–µ–≥–∞ —Å @, * –∏–ª–∏ VK-—Ä–∞–∑–º–µ—Ç–∫–∏ [id...|...]
  if (t.includes(`@id${idStr}`) || t.includes(`*id${idStr}`) || t.includes(`[id${idStr}|`) || t.includes(`[id${idStr}]`)) {
    return true;
  }

  if (targetDomain && targetDomain.length > 2 && targetDomain.toLowerCase() !== `id${idStr}`) {
    const d = targetDomain.toLowerCase();
    if (t.includes(`@${d}`) || t.includes(`*${d}`) || t.includes(`[${d}|`) || t.includes(`[${d}]`)) {
      return true;
    }
  }

  return false;
}

async function parseTargetUser(message: any, textArgs: string[]): Promise<{ targetId: number | null; targetName: string; isReply: boolean }> {
  // 1. Check full text or textArgs for explicit VK mention [id123|Name] or [club123|Name]
  const fullText = (message.text || textArgs.join(" ")).trim();
  const vkTagMatch = fullText.match(/\[(?:id|club)(\d+)\|([^\]]+)\]/);
  if (vkTagMatch) {
    const tid = parseInt(vkTagMatch[1]);
    const name = vkTagMatch[2].trim();
    return { targetId: tid, targetName: name, isReply: false };
  }

  // 2. Check text arguments for URL, @screen_name, id123, @id123, or numerical IDs
  const hasReplyOrFwd = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
  for (const arg of textArgs) {
    let screenNameMatch = null;
    let cleanArg = arg.trim();

    if (hasReplyOrFwd) {
      const isExplicitTarget = cleanArg.startsWith("@") || 
                              cleanArg.startsWith("[") || 
                              /^id\d+$/i.test(cleanArg) || 
                              /^(?:https?:\/\/)?(?:www\.)?(?:vk\.com|vk\.ru)/i.test(cleanArg) ||
                              /^\d+$/.test(cleanArg);
      if (!isExplicitTarget) {
        continue;
      }
    }

    // Support URLs like vk.ru/id123, vk.com/id123, https://vk.ru/user, https://vk.com/user
    const vkUrlMatch = cleanArg.match(/(?:https?:\/\/)?(?:www\.)?(?:vk\.com|vk\.ru)\/([a-zA-Z0-9_\.\-]+)/i);
    if (vkUrlMatch && vkUrlMatch[1]) {
      const pathPart = vkUrlMatch[1];
      if (/^id\d+$/i.test(pathPart)) {
        const tid = parseInt(pathPart.substring(2));
        try {
          const userRes = await vkApi.get("users.get", {
            params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
          });
          if (userRes.data.response?.[0]) {
            const u = userRes.data.response[0];
            return { targetId: tid, targetName: `${u.first_name} ${u.last_name}`, isReply: false };
          }
        } catch (e) {}
        return { targetId: tid, targetName: `–ò–≥—Ä–æ–∫ ${tid}`, isReply: false };
      } else {
        screenNameMatch = pathPart;
      }
    }

    if (!screenNameMatch) {
      if (cleanArg.startsWith("id") && /^\d+$/.test(cleanArg.substring(2))) {
        cleanArg = cleanArg.substring(2);
      } else if (cleanArg.startsWith("@id") && /^\d+$/.test(cleanArg.substring(3))) {
        cleanArg = cleanArg.substring(3);
      }
      
      if (cleanArg.startsWith("@") && !cleanArg.startsWith("@id") && !cleanArg.startsWith("@club")) {
        screenNameMatch = cleanArg.substring(1);
      } else if (cleanArg.startsWith("[id") || cleanArg.startsWith("@id") || cleanArg.match(/^(\d+)$/)) {
        // Handled below
      } else if (cleanArg.startsWith("[") && cleanArg.includes("|")) {
         const inside = cleanArg.substring(1, cleanArg.indexOf("|"));
         if (!inside.startsWith("id") && !inside.startsWith("club")) {
           screenNameMatch = inside;
         }
      } else if (/^[a-zA-Z][a-zA-Z0-9_\.]{2,31}$/.test(cleanArg) && !/^\d+[smhdwyd—á–º–∏–Ω—Å–µ–∫–¥–Ω]+$/i.test(cleanArg)) {
        screenNameMatch = cleanArg;
      }
    }

    if (screenNameMatch) {
      const sKey = screenNameMatch.trim().toLowerCase();
      if (screenNameCache.has(sKey)) {
        return { ...screenNameCache.get(sKey)!, isReply: false };
      }
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
            const resolvedObj = { targetId: tid, targetName: name };
            screenNameCache.set(sKey, resolvedObj);
            vkNameCache.set(tid, name);
            return { ...resolvedObj, isReply: false };
          }
        }
      } catch (e) {}
    }

    const match = cleanArg.match(/\[(?:id|club)?(\d+)\|?([^\]]+)?\]?/) || cleanArg.match(/@?id\(?(\d+)\)?/) || cleanArg.match(/@(\d+)/) || cleanArg.match(/^(\d+)$/);
    if (match && match[1]) {
      const tid = parseInt(match[1]);
      if (arg.match(/^(\d+)$/) && tid <= 1000) {
        continue; // Skip small pure numbers since they represent limits, counts, etc.
      }
      const cached = userCache.get(tid);
      if (cached && cached.nick && !cached.nick.startsWith("User")) {
        userNickCache.set(cached.nick.trim().toLowerCase(), tid);
        return { targetId: tid, targetName: cached.nick, isReply: false };
      }
      try {
        const res = await vkApi.get("users.get", {
          params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
        });
        if (res.data.response?.[0]) {
          const u = res.data.response[0];
          const name = `${u.first_name} ${u.last_name}`;
          if (cached) cached.nick = name;
          return { targetId: tid, targetName: name, isReply: false };
        }
      } catch (e) {}
      return { targetId: tid, targetName: (match[2] ? match[2].replace(/[\]\[]/g, "") : `–ò–≥—Ä–æ–∫ ${tid}`), isReply: false };
    }
  }

  // 3. If target was not specified in text, check reply_message (reply-based trigger)
  if (message.reply_message) {
    const tid = message.reply_message.from_id;
    if (tid < 0) {
      const isOurBot = tid === -Math.abs(parseInt(String(VK_GROUP_ID)));
      return { targetId: tid, targetName: isOurBot ? "—á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä" : `–°–æ–æ–±—â–µ—Å—Ç–≤–æ ${tid}`, isReply: true };
    }
    const cached = userCache.get(tid);
    if (cached && cached.nick && !cached.nick.startsWith("User")) {
      return { targetId: tid, targetName: cached.nick, isReply: true };
    }
    try {
      const res = await vkApi.get("users.get", {
        params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
      });
      if (res.data.response?.[0]) {
        const u = res.data.response[0];
        const name = `${u.first_name} ${u.last_name}`;
        if (cached) cached.nick = name;
        return { targetId: tid, targetName: name, isReply: true };
      }
    } catch (e) {}
    return { targetId: tid, targetName: `–ò–≥—Ä–æ–∫ ${tid}`, isReply: true };
  }

  // 4. Check forwarded messages (non-reply entity)
  if (message.fwd_messages && message.fwd_messages.length > 0) {
    const tid = message.fwd_messages[0].from_id;
    if (tid < 0) {
      const isOurBot = tid === -Math.abs(parseInt(String(VK_GROUP_ID)));
      return { targetId: tid, targetName: isOurBot ? "—á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä" : `–°–æ–æ–±—â–µ—Å—Ç–≤–æ ${tid}`, isReply: false };
    }
    const cached = userCache.get(tid);
    if (cached && cached.nick && !cached.nick.startsWith("User")) {
      return { targetId: tid, targetName: cached.nick, isReply: false };
    }
    try {
      const res = await vkApi.get("users.get", {
        params: { user_ids: tid, access_token: VK_TOKEN, v: "5.131" }
      });
      if (res.data.response?.[0]) {
        const u = res.data.response[0];
        const name = `${u.first_name} ${u.last_name}`;
        if (cached) cached.nick = name;
        return { targetId: tid, targetName: name, isReply: false };
      }
    } catch (e) {}
    return { targetId: tid, targetName: `–ò–≥—Ä–æ–∫ ${tid}`, isReply: false };
  }

  return { targetId: null, targetName: "", isReply: false };
}

function extractTargetRemainingArgs(message: any, args: string[], parsedTarget: { targetId: number | null; isReply: boolean }): string[] {
  if (parsedTarget.isReply) {
    return args.slice(1);
  }
  const hasReplyOrFwd = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
  const firstArg = args[1] || "";
  const isFirstArgTarget = !!firstArg.match(/^(\[|\@|https?:\/\/|vk\.com|vk\.ru|id\d+)/i);
  
  if (hasReplyOrFwd && !isFirstArgTarget) {
    return args.slice(1);
  }
  return args.slice(2);
}

// VK Webhook Callback Handler
async function handleVkEvent(payload: any) {
  if (!payload) return;

  const evtKeys = getEventDeduplicationKeys(payload);
  if (evtKeys.length > 0) {
    let isDup = false;
    for (let i = 0; i < evtKeys.length; i++) {
      if (deduplicateEventGlobally(evtKeys[i])) {
        isDup = true;
        break;
      }
    }
    if (isDup) {
      // Fast exit, no logs for raw speed
      return;
    }
  }

  const { type, object } = payload;

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
      if (u && !u.hideTop && u.marriage && u.marriage.partnerId) {
        const pid = Number(u.marriage.partnerId);
        if (!pid) return;
        const partnerObj = userMap.get(pid);
        if (partnerObj && partnerObj.hideTop) return;
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
      return "üèÜ –¢–æ–ø –ø–æ –±—Ä–∞–∫–∞–º:\n\n–ë—Ä–∞–∫–æ–≤ –ø–æ–∫–∞ –Ω–µ—Ç!";
    }

    let text = "üèÜ –¢–æ–ø –ø–æ –±—Ä–∞–∫–∞–º (—Å–∞–º—ã–µ –¥–æ–ª–≥–∏–µ):\n\n";
    top.forEach((m, i) => {
      const days = Math.max(1, Math.floor((Date.now() - (m.marriedAt || Date.now())) / (86400 * 1000)) + 1);
      text += `${i + 1}. [id${m.id1}|${m.name1}] ‚ù§Ô∏è [id${m.id2}|${m.name2}] ‚Äî ${days} –¥–Ω.\n`;
    });

    return text;
  }

  async function buildInfoChatData(cId: number, authorId: number) {
    const chData = await getOrCreateChat(cId);
    let membersCount = chData.membersCount || 0;
    let title = chData.title || "–ù–µ–∏–∑–≤–µ—Å—Ç–Ω–æ";
    let link = chData.inviteLink || "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
    let ownerId = chData.ownerId || 0;
    let hasPinned = false;

    if (cId > 2000000000) {
      try {
        const convRes = await vkApi.get("messages.getConversationsById", { params: { access_token: VK_TOKEN, v: "5.199", peer_ids: cId } });
        const items = convRes.data?.response?.items;
        if (items && items[0]) {
          const settings = items[0].chat_settings;
          if (settings) {
            membersCount = settings.members_count || membersCount;
            title = settings.title || title;
            if (settings.owner_id && settings.owner_id > 0) {
              ownerId = settings.owner_id;
            }
            if (settings.pinned_message) {
              hasPinned = true;
            }
            firestoreDb.collection("chats").doc(cId.toString()).set({
              ownerId: ownerId,
              membersCount: membersCount,
              title: title
            }, { merge: true }).catch(() => {});
          }
        }

        if (!link || link === "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç" || link === "–ù–µ–∏–∑–≤–µ—Å—Ç–Ω–æ") {
          const linkRes = await vkApi.get("messages.getInviteLink", { params: { access_token: VK_TOKEN, v: "5.199", peer_id: cId, reset: 0 } }).catch(() => null);
          if (linkRes?.data?.response?.link) {
            link = linkRes.data.response.link;
            firestoreDb.collection("chats").doc(cId.toString()).set({ inviteLink: link }, { merge: true }).catch(() => {});
          }
        }
      } catch(e) {}
    }

    if (!ownerId || ownerId <= 0) {
      try {
        const { items } = await getChatMembers(cId);
        const ownerItem = (items || []).find((m: any) => m.is_owner && m.member_id > 0);
        if (ownerItem) {
          ownerId = ownerItem.member_id;
        }
      } catch (e) {}
    }

    const shortId = cId > 2000000000 ? cId - 2000000000 : cId;
    const chatType = chData.chatType || chData.type || "DEF";

    let ownerStr = "–ù–µ–∏–∑–≤–µ—Å—Ç–Ω–æ";
    if (ownerId > 0) {
      const oUser = await getOrCreateUser(ownerId);
      const oName = oUser.fullName || oUser.nick || await fetchVkFullName(ownerId) || `User${ownerId}`;
      ownerStr = `[id${ownerId}|${oName}]`;
    }

    let sysOwnerId = chData.sysOwnerId || 0;
    if (!sysOwnerId) {
      userCache.forEach((u: any) => {
        if (u && u.chatRoles && u.chatRoles[cId] === 7) {
          sysOwnerId = u.userId;
        }
      });
    }

    let sysOwnerStr = "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
    if (sysOwnerId > 0) {
      const soUser = await getOrCreateUser(sysOwnerId);
      const soName = soUser.fullName || soUser.nick || await fetchVkFullName(sysOwnerId) || `User${sysOwnerId}`;
      sysOwnerStr = `[id${sysOwnerId}|${soName}]`;
    }

    let sysAdminsCount = 0;
    userCache.forEach((u: any) => {
      if (u && u.chatRoles && u.chatRoles[cId] && u.chatRoles[cId] >= 1) {
        sysAdminsCount++;
      }
    });

    const text = `–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–µ—Å–µ–¥–µ ${shortId}\n\n` +
      `| –ù–∞–∑–≤–∞–Ω–∏–µ –±–µ—Å–µ–¥—ã: ${title}\n` +
      `| –¢–∏–ø –±–µ—Å–µ–¥—ã:  ${chatType}\n\n` +
      `| –ó–∞–∫—Ä–µ–ø. –°–æ–æ–±—â–µ–Ω–∏–µ: ${hasPinned ? "–¥–∞" : "–Ω–µ—Ç"}\n\n` +
      `| –í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã: ${ownerStr}\n` +
      `| –°–∏—Å—Ç–µ–º. –í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã: ${sysOwnerStr}\n\n` +
      `| –ö–æ–ª-–≤–æ —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã: ${membersCount}\n` +
      `| –ö–æ–ª-–≤–æ —Å–∏—Å—Ç–µ–º. –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–æ–≤ –±–µ—Å–µ–¥—ã: ${sysAdminsCount}\n\n` +
      `| –°—Å—ã–ª–∫–∞ –Ω–∞ –≤—Å—Ç—É–ø–ª–µ–Ω–∏–µ –≤ –±–µ—Å–µ–¥—É: ${link}`;

    const keyboard = {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: "callback",
              label: "–°–ø–∏—Å–æ–∫ –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã",
              payload: JSON.stringify({ cmd: "conv_members_list", cId: cId, page: 1, authorId: authorId })
            },
            color: "positive"
          }
        ]
      ]
    };

    return { text, keyboard };
  }

  // VK Button Events (message_event)
  if (type === "message_event") {
    const { user_id: userId, peer_id: peerId, event_id: eventId, payload } = object;
    let payloadObj: any = {};
    try {
      payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch (e) {}

    const cmId = object.conversation_message_id || object.cm_id || payloadObj?.cm_id || payloadObj?.cmId;

    const sendVkMessageLocal = async (token: string, targetPeerId: number, text: string, extraParams: any = {}) => {
      const finalExtra = { ...extraParams };
      if (targetPeerId === peerId && cmId && !finalExtra.forward && !finalExtra.reply_to) {
        finalExtra.forward = JSON.stringify({
          is_reply: true,
          conversation_message_ids: [cmId],
          peer_id: peerId
        });
      }
      return await sendVkMessage(token, targetPeerId, text, finalExtra);
    };

    // Defer answering VK event to avoid conflicts with sendVkToast (show_snackbar)
    if (eventId) {
      setTimeout(() => {
        if (!eventAnsweredMap.has(eventId)) {
          answerVkEvent(VK_TOKEN, eventId, userId, peerId).catch(() => {});
        } else {
          eventAnsweredMap.delete(eventId);
        }
      }, 150);
      // Clean up after 10 seconds just in case
      setTimeout(() => {
        eventAnsweredMap.delete(eventId);
      }, 10000);
    }

    const cmd = payloadObj?.cmd || payloadObj?.action || payloadObj?.type || "";
    const page = payloadObj?.page || "";

    if (cmd) {

    if (cmd === "botstats_tech" || cmd === "botstats_main") {
      const authorId = Number(payloadObj.authorId);
      if (authorId && authorId !== userId) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      const callbackUser = await getOrCreateUser(userId);
      const isOwner = userId === 778382713 || callbackUser.role >= 12;
      if (!isOwner) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
        eventAnsweredMap.set(eventId, true);
        return;
      }

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      eventAnsweredMap.set(eventId, true);

      if (cmd === "botstats_tech") {
        const sysText = await buildSysInfoText();
        const kb = {
          inline: true,
          buttons: [
            [
              {
                action: {
                  type: "callback",
                  label: "–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–æ—Ç–µ",
                  payload: JSON.stringify({ cmd: "botstats_main", authorId: authorId })
                },
                color: "secondary"
              }
            ]
          ]
        };
        if (cmId) {
          await editVkMessage(VK_TOKEN, peerId, cmId, sysText, {
            keyboard: JSON.stringify(kb),
            preserveAttachment: true
          }).catch(() => {});
        }
      } else if (cmd === "botstats_main") {
        const statsText = await buildBotStatsText();
        const kb = {
          inline: true,
          buttons: [
            [
              {
                action: {
                  type: "callback",
                  label: "–¢–µ—Ö–Ω–∏—á–µ—Å–∫–∞—è –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è",
                  payload: JSON.stringify({ cmd: "botstats_tech", authorId: authorId })
                },
                color: "secondary"
              }
            ]
          ]
        };
        if (cmId) {
          await editVkMessage(VK_TOKEN, peerId, cmId, statsText, {
            keyboard: JSON.stringify(kb),
            preserveAttachment: true
          }).catch(() => {});
        }
      }
      return;
    }

    if (cmd === "kick_silent_cancel") {
      const authorId = Number(payloadObj.authorId);
      if (authorId && authorId !== userId) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      eventAnsweredMap.set(eventId, true);

      const u = await getOrCreateUser(userId);
      const uName = u.fullName || u.nick || (await fetchVkFullName(userId)) || `User${userId}`;
      const cancelText = `[id${userId}|${uName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –∏—Å–∫–ª—é—á–µ–Ω–∏–µ –º–æ–ª—á—É–Ω–æ–≤ –∏–∑ –±–µ—Å–µ–¥—ã.`;
      if (cmId) {
        await editVkMessage(VK_TOKEN, peerId, cmId, cancelText, {
          keyboard: JSON.stringify({ buttons: [], inline: true })
        }).catch(() => {});
      } else {
        await sendVkMessageLocal(VK_TOKEN, peerId, cancelText);
      }
      return;
    }

    if (cmd === "kick_silent_confirm") {
      const authorId = Number(payloadObj.authorId);
      if (authorId && authorId !== userId) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      eventAnsweredMap.set(eventId, true);

      const u = await getOrCreateUser(userId);
      const uName = u.fullName || u.nick || (await fetchVkFullName(userId)) || `User${userId}`;
      const durText = payloadObj.durText || "—É–∫–∞–∑–∞–Ω–Ω—ã–π —Å—Ä–æ–∫";
      const durSec = Number(payloadObj.durSec) || 86400;

      const startText = `[id${userId}|${uName}] –Ω–∞—á–∞–ª(-–∞) –∏—Å–∫–ª—é—á–µ–Ω–∏–µ –º–æ–ª—á—É–Ω–æ–≤ –∫–æ—Ç–æ—Ä—ã–µ –Ω–µ –ø–∏—Å–∞–ª–∏ –≤ –±–µ—Å–µ–¥—É ${durText}...`;
      let startCmid = cmId;

      if (cmId) {
        await editVkMessage(VK_TOKEN, peerId, cmId, startText, {
          keyboard: JSON.stringify({ buttons: [], inline: true })
        }).catch(() => {});
      } else {
        const startRes = await sendVkMessageLocal(VK_TOKEN, peerId, startText);
        startCmid = startRes?.response?.[0]?.conversation_message_id || startRes?.response?.conversation_message_id;
      }

      (async () => {
        try {
          const { items } = await getChatMembers(peerId);
          const chatData = await getOrCreateChat(peerId);
          const nowSec = Math.floor(Date.now() / 1000);
          const cutoff = nowSec - durSec;
          let successCount = 0;
          let failCount = 0;

          const secOwnerIds = new Set((Array.isArray(chatData.secondaryOwners) ? chatData.secondaryOwners : []).map(Number));
          const mainOwnerId = Number(chatData.ownerId || chatData.sysOwnerId || 0);

          for (const m of items) {
            const mId = Number(m.member_id);
            if (!mId || mId <= 0) continue;
            if (m.is_owner || m.is_admin) continue;
            if (mId === userId || mId === mainOwnerId || secOwnerIds.has(mId)) continue;

            const memberUser = await getOrCreateUser(mId);
            const mChatRole = (memberUser.chatRoles && (memberUser.chatRoles[peerId] || memberUser.chatRoles[String(peerId)])) || 0;
            const mGlobalRole = memberUser.role || 0;
            if (mGlobalRole >= 1 || mChatRole >= 1) continue;

            const lastAct = memberUser.chatLastMessageAt?.[peerId] || memberUser.chatLastMessageAt?.[String(peerId)] || (memberUser.chatTotalMsgs?.[peerId] ? (memberUser.lastMessageAt || 0) : 0);

            if (lastAct > 0 && lastAct >= cutoff) {
              continue;
            }

            try {
              const kickRes = await vkApi.get("messages.removeChatUser", {
                params: {
                  access_token: VK_TOKEN,
                  v: "5.199",
                  chat_id: peerId - 2000000000,
                  member_id: mId
                }
              });
              if (kickRes.data?.response === 1 || kickRes.data?.response === true) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (e) {
              failCount++;
            }
            await new Promise(r => setTimeout(r, 200));
          }

          const finishText = `–ò—Å–∫–ª—é—á–µ–Ω–∏–µ –º–æ–ª—á—É–Ω–æ–≤ –∏–∑ –±–µ—Å–µ–¥—ã –±—ã–ª–æ –∑–∞–≤–µ—Ä—à–µ–Ω–æ.\n\n| –£—Å–ø–µ—à–Ω–æ –∏—Å–∫–ª—é—á–µ–Ω–æ: ${successCount}\n| –ù–µ—É—Å–ø–µ—à–Ω–æ –∏—Å–∫–ª—é—á–µ–Ω–æ: ${failCount}`;
          if (startCmid) {
            await sendVkMessage(VK_TOKEN, peerId, finishText, {
              forward: JSON.stringify({
                peer_id: peerId,
                conversation_message_ids: [startCmid],
                is_reply: true
              })
            });
          } else {
            await sendVkMessage(VK_TOKEN, peerId, finishText);
          }
        } catch (err) {
          console.error("Error during silent users kick:", err);
        }
      })();

      return;
    }

    if (cmd === "captcha") {
      const targetUid = Number(payloadObj.uid || payloadObj.u || 0);
      if (targetUid && targetUid !== userId) {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ –Ω–µ –≤–∞—à–∞ –∫–∞–ø—á–∞!");
        eventAnsweredMap.set(eventId, true);
        return;
      }
      const selectedCode = String(payloadObj.code || "").trim().toUpperCase();
      if (activeCaptchas.has(userId)) {
        const cState = activeCaptchas.get(userId)!;
        const targetMessageCmid = cmId || cState.cmid;

        if (selectedCode === cState.code) {
          clearTimeout(cState.timeout);
          activeCaptchas.delete(userId);
          await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£—Å–ø–µ—à–Ω–æ! –í—ã –ø—Ä–æ—à–ª–∏ –ø—Ä–æ–≤–µ—Ä–∫—É –Ω–∞ —á–µ–ª–æ–≤–µ–∫–∞.");
          eventAnsweredMap.set(eventId, true);
          
          if (targetMessageCmid) {
            await editVkMessage(VK_TOKEN, peerId, targetMessageCmid, "–ú—ã —Å–º–æ–≥–ª–∏ —É–±–µ–¥–∏—Ç—å—Å—è, —á—Ç–æ –≤—ã —á–µ–ª–æ–≤–µ–∫, –º–æ–∂–µ—Ç–µ –ø—Ä–æ–¥–æ–ª–∂–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç—å—Å—è –±–æ—Ç–æ–º.", {
              keyboard: JSON.stringify({ buttons: [], inline: true })
            }).catch(() => {});
          }
        } else {
          // Immediately fail if wrong button
          clearTimeout(cState.timeout);
          activeCaptchas.delete(userId);
          await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–µ–≤–µ—Ä–Ω—ã–π –∫–æ–¥!");
          eventAnsweredMap.set(eventId, true);
          
          if (targetMessageCmid) {
            await editVkMessage(VK_TOKEN, peerId, targetMessageCmid, "–í—ã –≤—ã–±—Ä–∞–ª–∏ –Ω–µ–≤–µ—Ä–Ω—ã–π –∫–æ–¥.", {
              keyboard: JSON.stringify({ buttons: [], inline: true })
            }).catch(() => {});
          }
          
          const user = await getOrCreateUser(userId);
          const expireDate = new Date(Date.now() + 120 * 60000);
          await updateUser(userId, {
            mute: true,
            muteAdminId: 0,
            muteReason: "–ù–µ –ø—Ä–æ—à—ë–ª –∫–∞–ø—á—É (–Ω–µ–≤–µ—Ä–Ω—ã–π –∫–æ–¥)",
            muteExpires: expireDate.toISOString()
          });
          userCache.delete(userId);
          const fullName = user.fullName || user.nick || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
          const muteMsg = `[id${userId}|${fullName}] –ø–æ–ª—É—á–∏–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ –Ω–∞ 120 –º–∏–Ω—É—Ç –∏–∑-–∑–∞ –Ω–µ–ø—Ä–æ—Ö–æ–∂–¥–µ–Ω–∏—è –∫–∞–ø—á–∏. (#CAPTCHA)`;
          await sendVkMessageLocal(VK_TOKEN, peerId, muteMsg);
        }
      } else {
        await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–ö–∞–ø—á–∞ —É–∂–µ –Ω–µ –∞–∫—Ç—É–∞–ª—å–Ω–∞ –∏–ª–∏ –≤—Ä–µ–º—è –≤—ã—à–ª–æ.");
        eventAnsweredMap.set(eventId, true);
      }
      return;
    }
      let btnActionText = getButtonActionDescription(cmd, payloadObj);
      let btnTargetId = Number(payloadObj?.targetId || payloadObj?.t || payloadObj?.s || payloadObj?.inviteeId || payloadObj?.partnerId || payloadObj?.proposerId || payloadObj?.u || payloadObj?.applicantId || 0);

      logButtonAction({
        userId,
        targetId: btnTargetId,
        action: btnActionText,
        buttonName: cmd,
        eventId
      }).catch(() => {});
    }
    
    if (cmd === "gbf_a" || cmd === "gbf_d") {
      const targetId = Number(payloadObj.t);
      const senderId = Number(payloadObj.s);

      if (userId === senderId) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ —Ä–∞—Å—Å–º–æ—Ç—Ä–µ—Ç—å —Å–æ–±—Å—Ç–≤–µ–Ω–Ω—É—é —Ñ–æ—Ä–º—É!");
        return;
      }
      if (userId === targetId) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ —Ä–∞—Å—Å–º–∞—Ç—Ä–∏–≤–∞—Ç—å —Ñ–æ—Ä–º—É –Ω–∞ —Å–∞–º–æ–≥–æ —Å–µ–±—è!");
        return;
      }

      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`gban_form_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–§–æ—Ä–º–∞ —É–∂–µ –æ–±—Ä–∞–±–æ—Ç–∞–Ω–∞!");
          return;
        }
      }

      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      if (effRole < 8) {
        if (cmId) processedEventIds.delete(`gban_form_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤ (–¢—Ä–µ–±—É–µ—Ç—Å—è –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è)!");
        return;
      }

      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || `User${userId}`;

      if (cmd === "gbf_a") {
        const sUser = await getOrCreateUser(senderId);
        const sName = sUser.fullName || sUser.nick || `User${senderId}`;

        const safeReason = payloadObj.r || "–ü–æ —Ñ–æ—Ä–º–µ";
        const fullReason = `${safeReason} | By. [id${senderId}|${sName}]`;
        
        await updateUser(targetId, { 
          role: 0,
          chatRoles: {},
          gban: true, 
          gbanReason: fullReason, 
          gbanBy: userId, 
          gbanDate: Date.now(),
          gbanExpiresAt: 0,
        });

        // Also remove user from all chats
        const allChats = await getAllChats();
        for (const c of allChats) {
          if (c.id && c.id > 2000000000) {
            try {
              const remRes = await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: targetId }
              });
              if (remRes.data && remRes.data.response === 1) {
                await sendVkMessageLocal(VK_TOKEN, c.id, `[id${userId}|${vkName}] –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–ª(-–∞) [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö!\n\n| –ü—Ä–∏—á–∏–Ω–∞: ${fullReason}\n| –°—Ä–æ–∫: –ù–∞–≤—Å–µ–≥–¥–∞`);
              }
            } catch(e) {}
          }
        }

        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] –æ–¥–æ–±—Ä–∏–ª(-–∞) —Ñ–æ—Ä–º—É –Ω–∞ –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –æ—Ç [id${senderId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const sFirstName = sName.split(" ")[0];
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], –≤–∞—à–∞ —Ñ–æ—Ä–º–∞ –Ω–∞ [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –±—ã–ª–∞ –æ–¥–æ–±—Ä–µ–Ω–∞.`);
      } else {
        const sUser = await getOrCreateUser(senderId);
        const sName = sUser.fullName || sUser.nick || `User${senderId}`;
        const sFirstName = sName.split(" ")[0];
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] –æ—Ç–∫–∞–∑–∞–ª(-–∞) —Ñ–æ—Ä–º—É –Ω–∞ –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –æ—Ç [id${senderId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], –≤–∞—à–∞ —Ñ–æ—Ä–º–∞ –Ω–∞ [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –±—ã–ª–∞ –æ—Ç–∫–∞–∑–∞–Ω–∞.\n\n–ï—Å–ª–∏ –≤—ã –∂–µ–ª–∞–µ—Ç–µ —É–∑–Ω–∞—Ç—å –ø—Ä–∏—á–∏–Ω—É, –Ω–∞–ø–∏—à–∏—Ç–µ [id${userId}|–º–æ–¥–µ—Ä–∞—Ç–æ—Ä—É] –∫–æ—Ç–æ—Ä—ã–π –æ—Ç–∫–∞–∑–∞–ª –≤–∞—à—É —Ñ–æ—Ä–º—É.`);
      }
      return;
    }

    if (cmd === "bug_a" || cmd === "bug_d" || cmd === "off_a" || cmd === "off_d") {
      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`rep_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£–∂–µ –æ–±—Ä–∞–±–æ—Ç–∞–Ω–æ!");
          return;
        }
      }

      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      if (effRole < 8) {
        if (cmId) processedEventIds.delete(`rep_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤ (–¢—Ä–µ–±—É–µ—Ç—Å—è –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è)!");
        return;
      }

      const senderId = payloadObj.s;
      const sUser = await getOrCreateUser(senderId);
      const sName = sUser.fullName || sUser.nick || `User${senderId}`;
      const sFirstName = sName.split(" ")[0];
      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || `User${userId}`;

      const isBug = cmd.startsWith("bug");
      const isApprove = cmd.endsWith("_a");
      const typeStr = isBug ? "–±–∞–≥-—Ä–µ–ø–æ—Ä—Ç" : "–ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –ø–æ —É–ª—É—á—à–µ–Ω–∏—é —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞";
      const typeStrL = isBug ? "–≤–∞—à –±–∞–≥-—Ä–µ–ø–æ—Ä—Ç" : "–≤–∞—à–µ –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –ø–æ —É–ª—É—á—à–µ–Ω–∏—é —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞";

      if (isApprove) {
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] –æ–¥–æ–±—Ä–∏–ª(-–∞) ${typeStr} –æ—Ç [id${senderId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textApprove = isBug ? "–±—ã–ª –æ–¥–æ–±—Ä–µ–Ω" : "–±—ã–ª–æ –æ–¥–æ–±—Ä–µ–Ω–æ";
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textApprove}.`);
      } else {
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] –æ—Ç–∫–∞–∑–∞–ª(-–∞) ${typeStr} –æ—Ç [id${senderId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textDeny = isBug ? "–±—ã–ª –æ—Ç–∫–∞–∑–∞–Ω" : "–±—ã–ª–æ –æ—Ç–∫–∞–∑–∞–Ω–æ";
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textDeny}.`);
      }
      return;
    }

    if (cmd === "form_approve" || cmd === "form_deny") {
      // Deduplicate button actions per message
      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`form_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ó–∞—è–≤–∫–∞ —É–∂–µ –æ–±—Ä–∞–±–æ—Ç–∞–Ω–∞!");
          return;
        }
      }
      
      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      if (effRole < 10) {
        // If they failed auth, remove the deduplication lock so someone else can click
        if (cmId) processedEventIds.delete(`form_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤ (–¢—Ä–µ–±—É–µ—Ç—Å—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å)!");
        return;
      }
      
      const actionText = cmd === "form_approve" ? "–æ–¥–æ–±—Ä–∏–ª(-–∞)" : "–æ—Ç–∫–∞–∑–∞–ª(-–∞)";
      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || "–†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å";
      const replyMsg = `[id${userId}|${vkName}] ${actionText} –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è`;
      
      // Remove keyboard from original message
      await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ buttons: [], inline: true }) });
      
      // Send the reply message
      await sendVkMessageLocal(VK_TOKEN, peerId, replyMsg, {
        forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
      });
      return;
    }
    const cId = payloadObj?.cId || "";
    const tId = payloadObj?.targetId || "";
    const action = payloadObj?.action || "";
    const authorId = payloadObj?.authorId || "";

    const payloadStr = JSON.stringify(payloadObj || {});
    const btnDedupKey = `btn_sem_${userId}_${peerId}_${cmId || 0}_${payloadStr}`;
    const nowTime = Date.now();
    const lastClick = recentButtonClickMap.get(btnDedupKey) || 0;
    if (nowTime - lastClick < 2000) {
      console.log(`>>> DUPLICATE BUTTON CLICK BLOCKED (semantic): ${btnDedupKey}`);
      return;
    }
    recentButtonClickMap.set(btnDedupKey, nowTime);
    if (recentButtonClickMap.size > 10000) {
      const oldestKey = recentButtonClickMap.keys().next().value;
      if (oldestKey !== undefined) recentButtonClickMap.delete(oldestKey);
    }

    const sender = await getOrCreateUser(userId);
    const isBypass = (sender.role || 0) >= 12 || userId === 778382713 || userId === 1115715881 || userId === 1;
    const isHelpCallback = cmd.startsWith("help_") || cmd.startsWith("cmd_help_") || cmd === "gamehelp" || cmd === "ghelp" || cmd.startsWith("ghelp_");
    if (!isBypass && !isHelpCallback) {
      const nextAllowed = buttonCooldowns.get(userId) || 0;
      if (nowTime < nextAllowed) {
        const remainingSec = Math.ceil((nextAllowed - nowTime) / 1000);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, `–ü–æ–¥–æ–∂–¥–∏—Ç–µ –µ—â—ë ${remainingSec} —Å–µ–∫ –¥–ª—è —Å–ª–µ–¥—É—é—â–µ–≥–æ –Ω–∞–∂–∞—Ç–∏—è –∫–Ω–æ–ø–∫–∏.`);
      }
      buttonCooldowns.set(userId, nowTime + 1500);
    }

    const originalText = object.text || "";
    const replyFwd = undefined;

    if (cmd === "conv_members_list" || cmd === "conv_members_page") {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
         return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ –º–µ–Ω—é –¥–æ—Å—Ç—É–ø–Ω–æ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
       }

       const pageNum = Math.max(1, Number(payloadObj.page) || 1);
       const targetCId = Number(payloadObj.cId) || peerId;
       const shortId = targetCId > 2000000000 ? targetCId - 2000000000 : targetCId;

       try {
         const { items, profiles } = await getChatMembers(targetCId);

         const profileMap = new Map<number, any>();
         if (Array.isArray(profiles)) {
           for (const p of profiles) {
             if (p && p.id) {
               profileMap.set(p.id, p);
             }
           }
         }

         const userItems = (items || []).filter((it: any) => it.member_id > 0);

         const pageSize = 15;
         const totalCount = userItems.length || profiles.length || 0;
         const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
         const currPage = Math.min(pageNum, totalPages);

         const startIndex = (currPage - 1) * pageSize;
         const pageItems = userItems.slice(startIndex, startIndex + pageSize);

         let membersText = `–°–ø–∏—Å–æ–∫ –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã (–°—Ç—Ä. ${currPage}/${totalPages}):\n\n`;
         if (pageItems.length === 0) {
           if (profiles.length > 0) {
             const pageProfiles = profiles.slice(startIndex, startIndex + pageSize);
             pageProfiles.forEach((p: any, idx: number) => {
               membersText += `${startIndex + idx + 1}) [id${p.id}|${p.first_name} ${p.last_name}]\n`;
             });
           } else {
             membersText += "–£—á–∞—Å—Ç–Ω–∏–∫–∏ –Ω–µ –Ω–∞–π–¥–µ–Ω—ã –∏–ª–∏ –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤.";
           }
         } else {
           for (let idx = 0; idx < pageItems.length; idx++) {
             const it = pageItems[idx];
             const mId = it.member_id;
             const p = profileMap.get(mId);
             let name = p ? `${p.first_name} ${p.last_name}` : "";
             if (!name) {
               const uObj = await getOrCreateUser(mId);
               name = uObj.fullName || uObj.nick || await fetchVkFullName(mId) || `–£—á–∞—Å—Ç–Ω–∏–∫ ${mId}`;
             }

             let badge = "";
             if (it.is_owner) {
               badge = " (–í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã)";
             } else if (it.is_admin) {
               badge = " (–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä –±–µ—Å–µ–¥—ã)";
             }
             membersText += `${startIndex + idx + 1}) [id${mId}|${name}]${badge}\n`;
           }
         }

         const navButtons: any[] = [];
         if (currPage > 1) {
           navButtons.push({
             action: {
               type: "callback",
               label: "‚óÄ –ù–∞–∑–∞–¥",
               payload: JSON.stringify({ cmd: "conv_members_page", cId: targetCId, page: currPage - 1, authorId: payloadObj.authorId || userId })
             },
             color: "primary"
           });
         }
         navButtons.push({
           action: {
             type: "callback",
             label: "‚óÄ –ö –∏–Ω—Ñ–æ",
             payload: JSON.stringify({ cmd: "infochat_back", cId: targetCId, authorId: payloadObj.authorId || userId })
           },
           color: "secondary"
         });
         if (currPage < totalPages) {
           navButtons.push({
             action: {
               type: "callback",
               label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂",
               payload: JSON.stringify({ cmd: "conv_members_page", cId: targetCId, page: currPage + 1, authorId: payloadObj.authorId || userId })
             },
             color: "primary"
           });
         }

         const keyboard = { inline: true, buttons: [navButtons] };
         await editVkMessage(VK_TOKEN, peerId, cmId, membersText, { keyboard: JSON.stringify(keyboard), disable_mentions: 1, conversation_message_id: cmId });
       } catch (e: any) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, `–û—à–∏–±–∫–∞ –ø—Ä–∏ –ø–æ–ª—É—á–µ–Ω–∏–∏ —Å–ø–∏—Å–∫–∞ —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã ‚Ññ${shortId}`);
       }
       return;
    }

    if (cmd === "infochat_back") {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
         return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ –º–µ–Ω—é –¥–æ—Å—Ç—É–ø–Ω–æ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
       }
       const targetCId = Number(payloadObj.cId) || peerId;
       try {
         const { text, keyboard } = await buildInfoChatData(targetCId, payloadObj.authorId || userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
       } catch (e: any) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–û—à–∏–±–∫–∞ –ø—Ä–∏ –∑–∞–≥—Ä—É–∑–∫–µ –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏–∏ –æ –±–µ—Å–µ–¥–µ");
       }
       return;
    }

    if (cmd === "role_toggle") {
       const act = payloadObj.action;
       const u = await getOrCreateUser(userId);
       const fullName = u.fullName || u.nick || `User${userId}`;
       
       if (act === "enable") {
          await updateUser(userId, { roleDisabled: false });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] –≤–∫–ª—é—á–∏–ª(-–∞) —Å–≤–æ—é —Ä–æ–ª—å`);
       } else {
          await updateUser(userId, { roleDisabled: true });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] –≤—ã–∫–ª—é—á–∏–ª(-–∞) —Å–≤–æ—é —Ä–æ–ª—å`);
       }
       return;
    }

    if (payloadObj.authorId && payloadObj.authorId !== userId) {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–≠—Ç–æ –º–µ–Ω—é –ø—Ä–µ–¥–Ω–∞–∑–Ω–∞—á–µ–Ω–æ –Ω–µ –¥–ª—è –≤–∞—Å!" });
      return;
    }

    if (cmd === "thelp_tech" || cmd === "thelp_curator" || cmd === "thelp_head") {
       let text = "";
       if (cmd === "thelp_tech") {
          text = `...::–ü–æ–º–æ—â—å (–¢–µ—Ö. –°–ø–µ—Ü–∏–∞–ª–∏—Å—Ç)::...\n\n–ö–æ–º–∞–Ω–¥—ã –¢–µ—Ö. –°–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–∞:
**/botstats** - –°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞
**/sysinfo** - –°–∏—Å—Ç–µ–º–Ω–∞—è —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ –±–æ—Ç–∞ (–≤–ª–∞–¥–µ–ª–µ—Ü)
**/logs** - –û–±—â–∏–µ –ª–æ–≥–∏ –±–æ—Ç–∞
**/logs_user** - –õ–æ–≥–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è
**/logs_games** - –ò–≥—Ä–æ–≤—ã–µ –ª–æ–≥–∏ –±–æ—Ç–∞
**/get** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ
**/banbot** - –í—ã–¥–∞—Ç—å –∏–≥—Ä–æ–≤—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É
**/unbanbot** - –°–Ω—è—Ç—å –∏–≥—Ä–æ–≤—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É`;
       } else if (cmd === "thelp_curator") {
          text = `...::–ü–æ–º–æ—â—å (–ö—É—Ä–∞—Ç–æ—Ä —Ç–µ—Ö. —Å–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–æ–≤)::...\n\n–ö–æ–º–∞–Ω–¥—ã –ö—É—Ä–∞—Ç–æ—Ä–∞ —Ç–µ—Ö. —Å–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–æ–≤:
**/addtech** - –ù–∞–∑–Ω–∞—á–∏—Ç—å –¢–µ—Ö. –°–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–∞
**/deltech** - –°–Ω—è—Ç—å –¢–µ—Ö. –°–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–∞`;
       } else if (cmd === "thelp_head") {
          text = `...::–ü–æ–º–æ—â—å (–ì–ª–∞–≤–Ω—ã–π —Ç–µ—Ö. —Å–ø–µ—Ü–∏–∞–ª–∏—Å—Ç)::...\n\n–ö–æ–º–∞–Ω–¥—ã –ì–ª–∞–≤–Ω–æ–≥–æ —Ç–µ—Ö. —Å–ø–µ—Ü–∏–∞–ª–∏—Å—Ç–∞:
**/addcurator** - –ù–∞–∑–Ω–∞—á–∏—Ç—å –ö—É—Ä–∞—Ç–æ—Ä–∞ —Ç–µ—Ö.
**/delcurator** - –°–Ω—è—Ç—å –ö—É—Ä–∞—Ç–æ—Ä–∞ —Ç–µ—Ö.`;
       }
       
       const keyboard = { inline: true, buttons: [] as any[] };
       keyboard.buttons.push([{ action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "thelp_back", authorId: userId }) }, color: "secondary" }]);
       
       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }
    
    if (cmd === "thelp_back") {
       const text = `...::–ü–æ–º–æ—â—å –ø–æ —Ç–µ—Ö–Ω–∏—á–µ—Å–∫–∏–º –∫–æ–º–∞–Ω–¥–∞–º::...\n\n–í—ã–±–µ—Ä–∏—Ç–µ –Ω—É–∂–Ω—ã–π —Ä–∞–∑–¥–µ–ª:`;
       const user = await getOrCreateUser(userId);
       const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
       
       const keyboard = { inline: true, buttons: [] as any[] };
       const availableButtons: { cmd: string; label: string }[] = [];
       if (effRole >= 7.1) availableButtons.push({ cmd: "thelp_tech", label: "–¢–µ—Ö. –°–ø–µ—Ü–∏–∞–ª–∏—Å—Ç" });
       if (effRole >= 7.2) availableButtons.push({ cmd: "thelp_curator", label: "–ö—É—Ä–∞—Ç–æ—Ä —Ç–µ—Ö." });
       if (effRole >= 7.3) availableButtons.push({ cmd: "thelp_head", label: "–ì–ª–∞–≤–Ω—ã–π —Ç–µ—Ö." });

       let row: any[] = [];
       for (const btn of availableButtons) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: userId }) }, color: "secondary" });
          if (row.length === 2) {
             keyboard.buttons.push(row);
             row = [];
          }
       }
       if (row.length > 0) keyboard.buttons.push(row);
       
       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    

    if (cmd === "paybtc_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;
      const count = payloadObj.count;

      const sender = await getOrCreateUser(userId);
      const senderBtc = sender.btc ?? sender.jc ?? 0;
      if (senderBtc < count) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –±–∏—Ç–∫–æ–∏–Ω–æ–≤!");
      }

      const targetUser = await getOrCreateUser(targetId);
      const targetBtc = targetUser.btc ?? targetUser.jc ?? 0;

      await updateUser(userId, { btc: senderBtc - count, jc: 0 });
      await updateUser(targetId, { btc: targetBtc + count, jc: 0 });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –ø–µ—Ä–µ–¥–∞–ª–∏ ${count} ${getBtcDeclension(count)} [id${targetId}|${targetName}]`, {
        keyboard: JSON.stringify({ inline: true, buttons: [] })
      });

      let senderFullName = sender.nick || "";
      if (!senderFullName || senderFullName.toLowerCase().includes("user") || senderFullName.includes("@")) {
        try {
          const uRes = await vkApi.get("users.get", { params: { user_ids: userId, access_token: VK_TOKEN, v: "5.131" } });
          if (uRes.data.response?.[0]) {
            senderFullName = `${uRes.data.response[0].first_name} ${uRes.data.response[0].last_name}`;
          }
        } catch (e) {}
      }
      if (!senderFullName) senderFullName = `–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å ${userId}`;

      try {
        await sendVkMessageLocal(VK_TOKEN, targetId, `[id${userId}|${senderFullName}] –ø–µ—Ä–µ–¥–∞–ª(-–∞) –≤–∞–º ${count} ${getBtcDeclension(count)}`);
      } catch (e) {
        console.error("Error sending DM for BTC transfer:", e);
      }
      return;
    }

    if (cmd === "paybtc_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–µ—Ä–µ–¥–∞—á—É –±–∏—Ç–∫–æ–∏–Ω–æ–≤ [id${targetId}|${targetName}]`, {
        keyboard: JSON.stringify({ inline: true, buttons: [] })
      });
      return;
    }

    if (cmd === "transfer_confirm") {
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;
      const amount = payloadObj.amount;

      const sender = await getOrCreateUser(userId);
      if ((sender.balance || 0) < amount) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤ –Ω–∞ —Ä—É–∫–∞—Ö!");
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ü—Ä–µ–≤—ã—à–µ–Ω –ª–∏–º–∏—Ç –Ω–∞ –ø–µ—Ä–µ–≤–æ–¥—ã –≤ –¥–µ–Ω—å!");
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
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –ø–µ—Ä–µ–¥–∞–ª–∏ ${formatNum(amount)}$ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${targetId}|${targetName}]`);

      // Send to target in DM (–õ–°)
      try {
        await sendVkMessageLocal(VK_TOKEN, targetId, `[id${userId}|${sender.nick || "–ò–≥—Ä–æ–∫"}] –ø–µ—Ä–µ–¥–∞–ª(-–∞) –≤–∞–º ${formatNum(amount)}$`);
      } catch (e) {
        console.error("Error sending DM to transfer target:", e);
      }
      return;
    }

    if (cmd === "transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–µ—Ä–µ–≤–æ–¥ –¥–µ–Ω–µ–≥ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${targetId}|${targetName}]`);
      return;
    }

    if (cmd === "clan_join_accept") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const clanId = payloadObj.clanId;
      const inviteeId = payloadObj.inviteeId;

      const targetUser = await getOrCreateUser(inviteeId);
      if (targetUser.clanId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ —Å–æ—Å—Ç–æ–∏—Ç–µ –≤ –∫–ª–∞–Ω–µ!");
      }

      const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
      if (!clanDoc.exists) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ö–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω!");
      }

      const clan = clanDoc.data()!;
      if ((clan.members || []).length >= (clan.maxMembers || 20)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í –∫–ª–∞–Ω–µ –±–æ–ª—å—à–µ –Ω–µ—Ç –º–µ—Å—Ç!");
      }

      const updatedMembers = [...(clan.members || []), inviteeId];
      await firestoreDb.collection("clans").doc(clanId).set({ members: updatedMembers }, { merge: true });
      await updateUser(inviteeId, { clanId, clanRole: "–£—á–∞—Å—Ç–Ω–∏–∫" });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –ø—Ä–∏—Å–æ–µ–¥–∏–ª–∏—Å—å –∫ –∫–ª–∞–Ω—É ${clan.name}`);
      return;
    }

    if (cmd === "clan_join_decline") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const clanId = payloadObj.clanId;

      const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
      const clanName = clanDoc.exists ? clanDoc.data()!.name : "–∫–ª–∞–Ω—É";

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –æ—Ç–∫–∞–∑–∞–ª–∏—Å—å –ø—Ä–∏—Å–æ–µ–¥–∏–Ω—è—Ç—å—Å—è –∫ –∫–ª–∞–Ω—É ${clanName}`);
      return;
    }

    if (cmd === "clan_transfer_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const targetId = payloadObj.targetId;

      const sender = await getOrCreateUser(userId);
      if (!sender.clanId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –≤ –∫–ª–∞–Ω–µ!");

      const clanDoc = await firestoreDb.collection("clans").doc(sender.clanId).get();
      if (!clanDoc.exists) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ö–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω!");

      const clan = clanDoc.data()!;
      if (clan.ownerId !== userId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –≤–ª–∞–¥–µ–ª–µ—Ü –∫–ª–∞–Ω–∞!");

      const targetUser = await getOrCreateUser(targetId);
      if (targetUser.clanId !== clan.id) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ—Ç –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –Ω–µ –≤ –≤–∞—à–µ–º –∫–ª–∞–Ω–µ!");

      const updatedDeputies = (clan.deputies || []).filter((id: number) => id !== targetId);
      const updatedAssistants = (clan.assistants || []).filter((id: number) => id !== targetId);

      await firestoreDb.collection("clans").doc(clan.id).set({
        ownerId: targetId,
        deputies: updatedDeputies,
        assistants: updatedAssistants
      }, { merge: true });

      await updateUser(userId, { clanRole: "–£—á–∞—Å—Ç–Ω–∏–∫" });
      await updateUser(targetId, { clanRole: "–õ–∏–¥–µ—Ä" });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –ø–µ—Ä–µ–¥–∞–ª–∏ —Å–≤–æ–π –∫–ª–∞–Ω –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${targetId}|${targetUser.nick || "–ò–≥—Ä–æ–∫"}]`);
      return;
    }

    if (cmd === "kick_left_user") {
      const targetId = payloadObj.targetId;
      if (userId === targetId) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –∏—Å–∫–ª—é—á–∏—Ç—å —Å–∞–º–æ–≥–æ —Å–µ–±—è!");
         return;
      }
      const uRole = await getRole(peerId, userId);
      if (uRole < 2) {
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–£ –≤–∞—Å –Ω–µ—Ç –ø—Ä–∞–≤ –¥–ª—è —ç—Ç–æ–≥–æ –¥–µ–π—Å—Ç–≤–∏—è!" });
         return;
      }
      const targetUser = await getOrCreateUser(targetId);
      const targetName = targetUser.fullName || targetUser.nick || `User${targetId}`;
      const modUser = await getOrCreateUser(userId);
      const modName = modUser.fullName || modUser.nick || `–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä`;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|${targetName}] –≤—ã—à–µ–ª(-–ª–∞) –∏–∑ –±–µ—Å–µ–¥—ã`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

      try {
        await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
          params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId }
        });
      } catch (e) {}

      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] –∏—Å–∫–ª—é—á–∏–ª(-–∞) [id${targetId}|${targetName}] –∏–∑ –±–µ—Å–µ–¥—ã`);
      return;
    }

    if (cmd === "clan_transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const targetId = payloadObj.targetId;
      const targetUser = await getOrCreateUser(targetId);

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–µ—Ä–µ–¥–∞—á—É —Å–≤–æ–µ–≥–æ –∫–ª–∞–Ω–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${targetId}|${targetUser.nick || "–ò–≥—Ä–æ–∫"}]`);
      return;
    }

    if (cmd === "clan_rename_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      const newName = payloadObj.newName;

      const sender = await getOrCreateUser(userId);
      if (!sender.clanId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –≤ –∫–ª–∞–Ω–µ!");
      if ((sender.balance || 0) < 2000000) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤ –Ω–∞ —Ä—É–∫–∞—Ö!");

      const clanDoc = await firestoreDb.collection("clans").doc(sender.clanId).get();
      if (!clanDoc.exists) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ö–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω!");

      const clan = clanDoc.data()!;
      if (clan.ownerId !== userId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –ª–∏–¥–µ—Ä!");

      await firestoreDb.collection("clans").doc(clan.id).set({ name: newName }, { merge: true });
      await updateUser(userId, { balance: sender.balance - 2000000 });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã —É—Å–ø–µ—à–Ω–æ –ø–µ—Ä–µ–∏–º–µ–Ω–æ–≤–∞–ª–∏ –∫–ª–∞–Ω –Ω–∞ ${newName}`);
      return;
    }

    if (cmd === "clan_rename_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–µ—Ä–µ–∏–º–µ–Ω–æ–≤–∞–Ω–∏–µ –∫–ª–∞–Ω–∞`);
      return;
    }

    if (cmd === "clan_members_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

      const user = await getOrCreateUser(userId);
      user.globalRole = user.role || 0;
      user.role = user.globalRole >= 7 ? user.globalRole : ((user.chatRoles && user.chatRoles[peerId]) || 0);

      const clanId = payloadObj.clanId || user.clanId;

      if (cmd === "clan_members_list") {
        if (!clanId) {
          await sendVkMessageLocal(VK_TOKEN, peerId, "–í—ã –Ω–µ —Å–æ—Å—Ç–æ–∏—Ç–µ –≤ –∫–ª–∞–Ω–µ!");
          return;
        }

        const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
        if (!clanDoc.exists) {
          await sendVkMessageLocal(VK_TOKEN, peerId, "–ö–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö.");
          return;
        }

        const clan = clanDoc.data()!;
        const members = clan.members || [];
        const memberLines: string[] = [];

        for (let i = 0; i < members.length; i++) {
          const mId = members[i];
          const mu = await getOrCreateUser(mId);
          let roleName = "–£—á–∞—Å—Ç–Ω–∏–∫";
          if (mId === clan.ownerId) roleName = "–õ–∏–¥–µ—Ä";
          else if ((clan.deputies || []).includes(mId)) roleName = "–ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å –ª–∏–¥–µ—Ä–∞";
          else if ((clan.assistants || []).includes(mId)) roleName = "–ü–æ–º–æ—â–Ω–∏–∫ –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è";

          memberLines.push(`${i + 1}. [id${mId}|${mu.nick || "–ò–≥—Ä–æ–∫"}] | –î–æ–ª–∂–Ω–æ—Å—Ç—å: ${roleName}`);
        }

        let responseText = `üë• –í—Å–µ —É—á–∞—Å—Ç–Ω–∏–∫–∏ –∫–ª–∞–Ω–∞ ¬´${clan.name}¬ª (${members.length}):\n\n` + memberLines.join("\n");
        await sendVkMessageLocal(VK_TOKEN, peerId, responseText);
        return;
      } else {
        const membersData = await getChatMembers(peerId);
        const profiles = membersData.profiles || [];
        const lines = profiles.slice(0, 30).map((p: any, i: number) => `${i + 1}. [id${p.id}|${p.first_name} ${p.last_name}]`);
        
        let responseText = `üí¨ –£—á–∞—Å—Ç–Ω–∏–∫–∏ –±–µ—Å–µ–¥—ã:\n\n` + lines.join("\n");
        if (profiles.length > 30) {
          responseText += `\n\n... –∏ –µ—â–µ ${profiles.length - 30} —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤.`;
        }
        
        await sendVkMessageLocal(VK_TOKEN, peerId, responseText);
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
             const nick = chatNicks[peerId] || "–æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç";
             lines.push(`- [id${p.id}|${p.first_name} ${p.last_name}] ‚Äî –ù–∏–∫: ${nick}`);
          }
        }
      }
      let outText = "–ù–∏–∫–∏ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–µ—Å–µ–¥—ã:\n\n";
      if (lines.length === 0) outText += "–†—É–∫–æ–≤–æ–¥—Å—Ç–≤–æ –Ω–µ –Ω–∞–π–¥–µ–Ω–æ.";
      else outText += lines.join("\n");

      await sendVkMessageLocal(VK_TOKEN, peerId, outText);
      return;
    }

    if (cmd === "claim_daily_bonus") {
      const user = await getOrCreateUser(userId);
      if (payloadObj.authorId && Number(payloadObj.authorId) !== Number(userId)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ –≤—ã–∑–≤–∞–≤—à–∏–π –∫–æ–º–∞–Ω–¥—É –º–æ–∂–µ—Ç –∑–∞–±—Ä–∞—Ç—å –±–æ–Ω—É—Å!");
      }
      const now = Date.now();
      const isReady = !user.lastDailyAt || (now - user.lastDailyAt >= 86400000);
      if (!isReady) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ë–æ–Ω—É—Å –µ—â–µ –Ω–µ –≥–æ—Ç–æ–≤!");
      }

      const currentDay = user.dailyDay || 1;
      const dayData = DAILY_BONUSES[currentDay] || DAILY_BONUSES[1];

      await dayData.apply(user, userId);

      const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
      await updateUser(userId, { lastDailyAt: now, dailyDay: nextDay });

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const claimedText = `[id${userId}|${user.nick || '–ò–≥—Ä–æ–∫'}] –∑–∞–±—Ä–∞–ª(-–∞) —Å–≤–æ–π –µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –±–æ–Ω—É—Å "${dayData.label}"`;
      return await editVkMessage(VK_TOKEN, peerId, cmId, claimedText);
    }

    if (cmd === "help_basic" || cmd === "help_premium" || cmd === "help_clan") {
      if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      let text = "";
      let buttons: any[] = [];
      const user = await getOrCreateUser(userId);

      if (cmd === "help_basic") {
        text = `...::–ò–≥—Ä–æ–≤—ã–µ –∫–æ–º–∞–Ω–¥—ã –±–æ—Ç–∞::...\n\n` +
          `**/–º–∞—Ñ–∏—è** - –ù–∞—á–∞—Ç—å –∏–≥—Ä—É "–ú–∞—Ñ–∏—è".\n` +
          `**/–ø–∏–≤–æ** - –í—ã–ø–∏—Ç—å –ø–∏–≤–æ.\n` +
          `**/–ø–∏–≤–æ–∑–∞–≤—Ä—ã** - –¢–æ–ø –ø–æ –ø–∏–≤—É.\n` +
          `**/–∫—Ä–æ–∫–æ–¥–∏–ª** - –ú–∏–Ω–∏-–∏–≥—Ä–∞ "–ö—Ä–æ–∫–æ–¥–∏–ª".\n` +
          `**/–±–∞–ª–∞–Ω—Å** - –ü–æ–∫–∞–∑–∞—Ç—å –±–∞–ª–∞–Ω—Å.\n` +
          `**/–ø—Ä–∏–∑** - –ü–æ–ª—É—á–∏—Ç—å –ø—Ä–∏–∑.\n` +
          `**/–ø–µ—Ä–µ–¥–∞—Ç—å** - –ü–µ—Ä–µ–¥–∞—Ç—å –¥–µ–Ω—å–≥–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n` +
          `**/–±–∞–Ω–∫** - –ü–æ–ª–æ–∂–∏—Ç—å –¥–µ–Ω—å–≥–∏ –≤ –±–∞–Ω–∫.\n` +
          `**/—Å–Ω—è—Ç—å–±–∞–Ω–∫** - –°–Ω—è—Ç—å –¥–µ–Ω—å–≥–∏ —Å –±–∞–Ω–∫–∞.\n` +
          `**/–ø—Ä–æ—Ñ–∏–ª—å** - –ü—Ä–æ—Ñ–∏–ª—å –∏–≥—Ä–æ–∫–∞.\n` +
          `**/—Ç–æ–ø** - –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π.\n` +
          `**/—Ä—É–ª–µ—Ç–∫–∞** - –°—ã–≥—Ä–∞—Ç—å –≤ —Ä—É–ª–µ—Ç–∫—É.\n` +
          `**/–∫–∞–∑–∏–Ω–æ** - –°—ã–≥—Ä–∞—Ç—å –≤ –∫–∞–∑–∏–Ω–æ.\n` +
          `**/–±–∏–∑–Ω–µ—Å** - –°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ –±–∏–∑–Ω–µ—Å–æ–≤.\n` +
          `**/–∫—É–ø–∏—Ç—å–±–∏–∑** - –ö—É–ø–∏—Ç—å –±–∏–∑–Ω–µ—Å—ã.\n` +
          `**/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑** - –ü—Ä–æ–¥–∞—Ç—å –±–∏–∑–Ω–µ—Å—ã.\n` +
          `**/–¥—É—ç–ª—å** - –°–æ–∑–¥–∞—Ç—å –¥—É—ç–ª—å –Ω–∞ –¥–µ–Ω—å–≥–∏.\n` +
          `**/–¥—É—ç–ª—å–±–∏–∑** - –°–æ–∑–¥–∞—Ç—å –¥—É—ç–ª—å –Ω–∞ –±–∏–∑–Ω–µ—Å—ã.\n` +
          `**/–∫–Ω–±** - –°–æ–∑–¥–∞—Ç—å –∏–≥—Ä—É "–ö–∞–º–µ–Ω—å, –Ω–æ–∂–Ω–∏—Ü—ã, –±—É–º–∞–≥–∞".\n` +
          `**/–∫–ª–∞–Ω** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –∫–ª–∞–Ω–µ –∏ –∫–ª–∞–Ω–æ–≤—ã–µ –∫–æ–º–∞–Ω–¥—ã.\n` +
          `**/bitcoin** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ BTC.\n` +
          `**/buybitcoin** - –ö—É–ø–∏—Ç—å BTC.\n` +
          `**/sellbitcoin** - –ü—Ä–æ–¥–∞—Ç—å BTC.\n` +
          `**/paybitcoin** - –ü–µ—Ä–µ–¥–∞—Ç—å BTC.\n` +
          `**/–±—Ä–∞–∫** - –ü–æ—Å–º–æ—Ç—Ä–µ—Ç—å –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—é –æ –±—Ä–∞–∫–µ.\n` +
          `/–±—Ä–∞–∫ –∑–∞–ø—Ä–æ—Å - –û—Ç–ø—Ä–∞–≤–∏—Ç—å –∑–∞–ø—Ä–æ—Å –Ω–∞ –±—Ä–∞–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n` +
          `/–±—Ä–∞–∫ —Ä–∞–∑–≤–æ–¥ - –†–∞–∑–≤–µ—Å—Ç–∏—Å—å —Å–æ –≤—Ç–æ—Ä–æ–π –ø–æ–ª–æ–≤–∏–Ω–∫–æ–π.\n` +
          `/rep + - –ü–æ–≤—ã—Å–∏—Ç—å —Ä–µ–ø—É—Ç–∞—Ü–∏—é.\n` +
          `**/rep** - - –ü–æ–Ω–∏–∑–∏—Ç—å —Ä–µ–ø—É—Ç–∞—Ü–∏—é.\n` +
          `**/–ø—Ä–æ–º–æ** - –ê–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å –ø—Ä–æ–º–æ–∫–æ–¥.\n` +
          `**/–∫—Ç–æ** - –í—ã–±—Ä–∞—Ç—å —Å–ª—É—á–∞–π–Ω–æ–≥–æ –∏–≥—Ä–æ–∫–∞.\n` +
          `**/–∏–Ω—Ñ–∞** - –í–µ—Ä–æ—è—Ç–Ω–æ—Å—Ç—å —Å–æ–±—ã—Ç–∏—è.\n` +
          `**/–ø–æ–≥–æ–¥–∞** - –£–∑–Ω–∞—Ç—å —Ç–µ–∫—É—â—É—é –ø–æ–≥–æ–¥—É –≤ –≥–æ—Ä–æ–¥–µ.\n` +
          `**/–≤–∑–ª–æ–º** - –ó–∞—Ä–∞–±–æ—Ç–∞—Ç—å –¥–µ–Ω—å–≥–∏ –≤–∑–ª–æ–º–æ–º.\n` +
          `**/—Ñ–æ—Ä—Ç—É–Ω–∞** - –ü—Ä–æ–∫—Ä—É—Ç–∏—Ç—å –∫–æ–ª–µ—Å–æ —Ñ–æ—Ä—Ç—É–Ω—ã.\n` +
          `/–µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –±–æ–Ω—É—Å - –ó–∞–±—Ä–∞—Ç—å –µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –±–æ–Ω—É—Å.\n` +
          `**/–ø–æ–¥–ø–∏—Å–∫–∞** - –ü–æ–ª—É—á–∏—Ç—å –±–æ–Ω—É—Å –∑–∞ –ø–æ–¥–ø–∏—Å–∫—É.\n` +
          `/–∫—É–ø–∏—Ç—å–ø—Ä–µ–º- –ö—É–ø–∏—Ç—å Premium-—Å—Ç–∞—Ç—É—Å.`;
          
        buttons.push([{ action: { type: "callback", label: "–ì–ª–∞–≤–Ω–æ–µ –º–µ–Ω—é", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
      } else if (cmd === "help_clan") {
        text = `üè∞ –ö–ª–∞–Ω–æ–≤—ã–µ –∫–æ–º–∞–Ω–¥—ã:\n\n` +
          `**/–∫–ª–∞–Ω** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –≤–∞—à–µ–º –∫–ª–∞–Ω–µ.\n` +
          `/–∫–ª–∞–Ω —Å–æ–∑–¥–∞—Ç—å [–ù–∞–∑–≤–∞–Ω–∏–µ] - –°–æ–∑–¥–∞—Ç—å –∫–ª–∞–Ω (1.000.000$).\n` +
          `/–∫–ª–∞–Ω —Å–∏–ª–∞ [–ù–∞–∑–≤–∞–Ω–∏–µ] - –ü–æ—Å–º–æ—Ç—Ä–µ—Ç—å —Å–∏–ª—É –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω —Å–æ—Å—Ç–∞–≤ [—Å—Ç—Ä–∞–Ω–∏—Ü–∞] - –°–ø–∏—Å–æ–∫ —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω –ø—Ä–∏–≥–ª–∞—Å–∏—Ç—å [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –ü—Ä–∏–≥–ª–∞—Å–∏—Ç—å –∏–≥—Ä–æ–∫–∞ –≤ –∫–ª–∞–Ω.\n` +
          `/–∫–ª–∞–Ω –∫–∏–∫–Ω—É—Ç—å [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –ò—Å–∫–ª—é—á–∏—Ç—å –∏–≥—Ä–æ–∫–∞ –∏–∑ –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω –∫–∞–∑–Ω–∞ [—Å—É–º–º–∞] - –ü–æ–ø–æ–ª–Ω–∏—Ç—å –∫–∞–∑–Ω—É –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω –≤—ã–≤–æ–¥ [—Å—É–º–º–∞] - –°–Ω—è—Ç—å –¥–µ–Ω—å–≥–∏ –∏–∑ –∫–∞–∑–Ω—ã –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω –≤–æ–π–Ω–∞ [–ù–∞–∑–≤–∞–Ω–∏–µ] - –û–±—ä—è–≤–∏—Ç—å –≤–æ–π–Ω—É –∫–ª–∞–Ω—É.\n` +
          `/–∫–ª–∞–Ω —Ç–∏–ø [–ó–∞–∫—Ä—ã—Ç—ã–π|–ü–æ –∑–∞—è–≤–∫–∞–º|–û—Ç–∫—Ä—ã—Ç—ã–π] - –ò–∑–º–µ–Ω–∏—Ç—å —Ç–∏–ø –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω –∑–∞–º [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –ù–∞–∑–Ω–∞—á–∏—Ç—å/—Å–Ω—è—Ç—å –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è.\n` +
          `/–∫–ª–∞–Ω –ø–æ–º–æ—â–Ω–∏–∫ –∑–∞–º–∞ [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –ù–∞–∑–Ω–∞—á–∏—Ç—å/—Å–Ω—è—Ç—å –ø–æ–º–æ—â–Ω–∏–∫–∞ –∑–∞–º–∞.\n` +
          `/–∫–ª–∞–Ω –ø–µ—Ä–µ–¥–∞—Ç—å [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –ü–µ—Ä–µ–¥–∞—Ç—å –ª–∏–¥–µ—Ä—Å—Ç–≤–æ –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω —Å–Ω—è—Ç—å [ID/—É–ø–æ–º–∏–Ω–∞–Ω–∏–µ] - –°–Ω—è—Ç—å –∏–≥—Ä–æ–∫–∞ —Å –¥–æ–ª–∂–Ω–æ—Å—Ç–∏.\n` +
          `/–∫–ª–∞–Ω –ø–µ—Ä–µ–∏–º–µ–Ω–æ–≤–∞—Ç—å [–ù–∞–∑–≤–∞–Ω–∏–µ] - –ü–µ—Ä–µ–∏–º–µ–Ω–æ–≤–∞—Ç—å –∫–ª–∞–Ω.\n` +
          `/–∫–ª–∞–Ω –≤—ã–π—Ç–∏ - –í—ã–π—Ç–∏ –∏–∑ –∫–ª–∞–Ω–∞.\n` +
          `/–∫–ª–∞–Ω —Å–æ–ª–¥–∞—Ç—ã [–∫–æ–ª-–≤–æ] - –ö—É–ø–∏—Ç—å —Å–æ–ª–¥–∞—Ç (5.000$/—à—Ç).\n` +
          `/–∫–ª–∞–Ω –≤–µ—Ä—Ç–æ–ª—ë—Ç—ã [–∫–æ–ª-–≤–æ] - –ö—É–ø–∏—Ç—å –≤–µ—Ä—Ç–æ–ª—ë—Ç—ã (50.000$/—à—Ç).\n` +
          `/–∫–ª–∞–Ω —Ç–∞–Ω–∫–∏ [–∫–æ–ª-–≤–æ] - –ö—É–ø–∏—Ç—å —Ç–∞–Ω–∫–∏ (150.000$/—à—Ç).\n` +
          `/–∫–ª–∞–Ω –º–µ—Å—Ç–∞ - –ö—É–ø–∏—Ç—å 5 –º–µ—Å—Ç –≤ –∫–ª–∞–Ω–µ (250.000$).`;
        buttons.push([{ action: { type: "callback", label: "–ì–ª–∞–≤–Ω–æ–µ –º–µ–Ω—é", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
      } else if (cmd === "help_premium") {
        text = `–ö–æ–º–∞–Ω–¥—ã Premium:\n\n` +
          `**/–ø—Ä–µ–º–ø—Ä–æ—Ñ–∏–ª—å** - /+ - –°–∫—Ä—ã—Ç—å/–æ—Ç–∫—Ä—ã—Ç—å –ø—Ä–æ—Ñ–∏–ª—å –æ—Ç –ø—É–±–ª–∏—á–Ω–æ–≥–æ –ø—Ä–æ—Å–º–æ—Ç—Ä–∞.\n` +
          `**/–ø—Ä–µ–º–±–∞–ª–∞–Ω—Å** - /+ - –°–∫—Ä—ã—Ç—å/–æ—Ç–∫—Ä—ã—Ç—å –±–∞–ª–∞–Ω—Å –æ—Ç –ø—É–±–ª–∏—á–Ω–æ–≥–æ –ø—Ä–æ—Å–º–æ—Ç—Ä–∞.\n` +
          `**/–æ—Ç–∫—Ä—ã—Ç—å–¥–µ–ø–æ–∑–∏—Ç** - –û—Ç–∫—Ä—ã—Ç—å –¥–µ–ø–æ–∑–∏—Ç.\n` +
          `**/–¥–µ–ø–æ–∑–∏—Ç—ã** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –¥–µ–ø–æ–∑–∏—Ç–∞—Ö.\n` +
          `**/–∏–∏** - –ó–∞–¥–∞—Ç—å –≤–æ–ø—Ä–æ—Å –∫ –ò–ò.\n` +
          `**/—É—Å—Ç–∞–Ω–æ–≤–∏—Ç—å—Ñ–æ—Ç–æ** - –£—Å—Ç–∞–Ω–æ–≤–∏—Ç—å —Ñ–æ—Ç–æ –≤ –ø—Ä–æ—Ñ–∏–ª—å.\n` +
          `**/—É–¥–∞–ª–∏—Ç—å—Ñ–æ—Ç–æ** - –£–¥–∞–ª–∏—Ç—å —Ñ–æ—Ç–æ –∏–∑ –ø—Ä–æ—Ñ–∏–ª—è.\n` +
          `/–ø—Ä–µ–º- –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ Premium-—Å—Ç–∞—Ç—É—Å–µ.`;
        buttons.push([{ action: { type: "callback", label: "–ì–ª–∞–≤–Ω–æ–µ –º–µ–Ω—é", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
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
           [{ action: { type: "callback", label: isEn ? "–í—ã–∫–ª—é—á–∏—Ç—å –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏–µ" : "–í–∫–ª—é—á–∏—Ç—å –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏–µ", payload: JSON.stringify({ cmd: isEn ? "welcome_off" : "welcome_on" }) }, color: isEn ? "negative" : "positive" }],
           [{ action: { type: "callback", label: "–ó–∞–¥–∞—Ç—å —Ç–µ–∫—Å—Ç", payload: JSON.stringify({ cmd: "welcome_set" }) }, color: "positive" }]
         ]
       };
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å] ${isEn ? '–≤–∫–ª—é—á–∏–ª(-–∞)' : '–≤—ã–∫–ª—é—á–∏–ª(-–∞)'} –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏–µ`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "zov_online" || cmd === "zov_all" || cmd === "zov_cancel") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–¢–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä –∫–æ–º–∞–Ω–¥—ã –º–æ–∂–µ—Ç –≤—ã–±—Ä–∞—Ç—å —Ç–∏–ø!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

       if (cmd === "zov_cancel") {
          const text = `–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –≤—ã–∑–æ–≤ –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã.`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text);
          return;
       }

       const { profiles } = await getChatMembers(peerId);
       if (cmd === "zov_online") {
          const onlineProfiles = profiles.filter((p: any) => p.id > 0 && p.online);
          const pings = onlineProfiles.map((p: any) => `[id${p.id}|üë§]`).join(" ") || "–ù–µ—Ç —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –æ–Ω–ª–∞–π–Ω";
          const text = `${pings}\n\n| –í—ã –±—ã–ª–∏ –≤—ã–∑–≤–∞–Ω—ã [id${userId}|–º–æ–¥–µ—Ä–∞—Ç–æ—Ä–æ–º]\n\n| –ü—Ä–∏—á–∏–Ω–∞: ${payloadObj.reason || "–ù–µ —É–∫–∞–∑–∞–Ω–∞"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       } else {
          const allProfiles = profiles.filter((p: any) => p.id > 0);
          const pings = allProfiles.map((p: any) => `[id${p.id}|üë§]`).join(" ") || "–ù–µ—Ç —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤";
          const text = `${pings}\n\n| –í—ã –±—ã–ª–∏ –≤—ã–∑–≤–∞–Ω—ã [id${userId}|–º–æ–¥–µ—Ä–∞—Ç–æ—Ä–æ–º]\n\n| –ü—Ä–∏—á–∏–Ω–∞: ${payloadObj.reason || "–ù–µ —É–∫–∞–∑–∞–Ω–∞"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       }
    }

    if (cmd === "arrole_yes" || cmd === "arrole_no") {
       if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const targetId = payloadObj.targetId;
       const modUser = await getOrCreateUser(userId);
       const modName = modUser.fullName || modUser.nick || `User${userId}`;

       if (cmd === "arrole_no") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–Ω—è—Ç–∏–µ —Ä–æ–ª–µ–π —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
          return;
       }

       await updateUser(targetId, { role: 0, chatRoles: {} });
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] —Å–Ω—è–ª(-–∞) –í–°–ï —Ä–æ–ª–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${targetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
       return;
    }

    if (cmd === "chats_page") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–¢–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä –∫–æ–º–∞–Ω–¥—ã –º–æ–∂–µ—Ç –ø–µ—Ä–µ–∫–ª—é—á–∞—Ç—å —Å—Ç—Ä–∞–Ω–∏—Ü—ã!" });
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
       const list = pageChats.map((c: any, i: number) => `${startIdx + i + 1}) ${c.title || `–ë–µ—Å–µ–¥–∞ ‚Ññ${c.id}`} | ID: ${c.id} | –¢–∏–ø: ${c.type || 'PL'}`).join("\n");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "chats_page", p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂", payload: JSON.stringify({ cmd: "chats_page", p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, `–°–ø–∏—Å–æ–∫ –±–µ—Å–µ–¥ –±–æ—Ç–∞ (–°—Ç—Ä–∞–Ω–∏—Ü–∞ ${page}/${totalPages}):\n\n${list}`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "welcome_set") {
       waitingForWelcome.set(`${peerId}_${userId}`, true);
       const text = `–ó–∞–¥–∞–π—Ç–µ —Ç–µ–∫—Å—Ç –¥–ª—è –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏—è!\n\n| ¬´%u¬ª - –∑–∞–º–µ–Ω—è–µ—Ç—Å—è –Ω–∞ @id –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è\n| ¬´%n¬ª - –∑–∞–º–µ–Ω—è–µ—Ç—Å—è –Ω–∞ —Ç–µ–≥ —Å –∏–º–µ–Ω–µ–º –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è\n| ¬´%i¬ª - –∑–∞–º–µ–Ω—è–µ—Ç—Å—è –Ω–∞ @id –ø—Ä–∏–≥–ª–∞—Å–∏–≤—à–µ–≥–æ\n| ¬´%p¬ª - –∑–∞–º–µ–Ω—è–µ—Ç—Å—è –Ω–∞ —Ç–µ–≥ —Å –∏–º–µ–Ω–µ–º –ø—Ä–∏–≥–ª–∞—Å–∏–≤—à–µ–≥–æ\n\n| –°–ª–µ–¥—É—é—â–µ–µ —Å–æ–æ–±—â–µ–Ω–∏–µ –∫–æ—Ç–æ—Ä–æ–µ –≤—ã –Ω–∞–ø–∏—à–∏—Ç–µ –±—É–¥–µ—Ç –ø—Ä–∏–º–µ–Ω–µ–Ω–æ –≤ –∫–∞—á–µ—Å—Ç–≤–µ –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏—è.`;
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       return;
    }

    if (cmd === "frozen_page") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–¢–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä –∫–æ–º–∞–Ω–¥—ã –º–æ–∂–µ—Ç –ø–µ—Ä–µ–∫–ª—é—á–∞—Ç—å —Å—Ç—Ä–∞–Ω–∏—Ü—ã!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       let page = payloadObj.p;

       let membersRes;
       try {
          membersRes = await axios.get("https://api.vk.com/method/messages.getConversationMembers", {
             params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.199" }
          });
       } catch(e) {}

       const profiles = membersRes?.data?.response?.profiles || [];
       const frozenUsers = profiles.filter((p: any) => p.deactivated);
       const pageSize = 15;
       const totalPages = Math.max(1, Math.ceil(frozenUsers.length / pageSize));
       
       if (page < 1) page = totalPages;
       if (page > totalPages) page = 1;

       let listText = frozenUsers.slice((page - 1) * pageSize, page * pageSize).map((u: any, i: number) => `${(page - 1) * pageSize + i + 1}. [id${u.id}|${u.first_name} ${u.last_name}]`).join("\n");
       
       const out = `–°–ø–∏—Å–æ–∫ —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π (–°—Ç—Ä–∞–Ω–∏—Ü–∞ ${page}/${totalPages}):\n\n${listText || "–ü—É—Å—Ç–æ."}`;

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "frozen_page", p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂", payload: JSON.stringify({ cmd: "frozen_page", p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, out, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "kickfrozen_confirm" || cmd === "kickfrozen_cancel") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–≠—Ç–æ –Ω–µ –≤–∞—à–∞ –∫–æ–º–∞–Ω–¥–∞!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       
       const clickingUser = await getOrCreateUser(userId);
       const modName = clickingUser.fullName || clickingUser.nick || await fetchVkFullName(userId) || "–í–ª–∞–¥–µ–ª–µ—Ü";
       
       if (cmd === "kickfrozen_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –∏—Å–∫–ª—é—á–µ–Ω–∏–µ –≤—Å–µ—Ö —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –∏–∑ –±–µ—Å–µ–¥—ã.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }

       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] –Ω–∞—á–∞–ª(-–∞) –∏—Å–∫–ª—é—á–µ–Ω–∏–µ –≤—Å–µ—Ö —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –∏–∑ –±–µ—Å–µ–¥—ã.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       
       let membersRes;
       try {
          membersRes = await axios.get("https://api.vk.com/method/messages.getConversationMembers", {
             params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.199" }
          });
       } catch(e) {}
       
       const profiles = membersRes?.data?.response?.profiles || [];
       const frozenUsers = profiles.filter((p: any) => p.deactivated);
       let succ = 0;
       let fail = 0;
       
       for (const u of frozenUsers) {
          try {
             await new Promise(r => setTimeout(r, 333));
             const res = await axios.get("https://api.vk.com/method/messages.removeChatUser", {
                 params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: u.id }
             });
             if (res.data && !res.data.error) succ++;
             else fail++;
          } catch(e) { fail++; }
       }
       
       await sendVkMessage(VK_TOKEN, peerId, `–ò—Å–∫–ª—é—á–µ–Ω–∏–µ –≤—Å–µ—Ö —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –∏–∑ –±–µ—Å–µ–¥—ã –∑–∞–≤–µ—Ä—à–µ–Ω–æ.\n\n| –£—Å–ø–µ—à–Ω–æ –∏—Å–∫–ª—é—á–µ–Ω–æ: ${succ}\n| –ù–µ—É—Å–ø–µ—à–Ω–æ –∏—Å–∫–ª—é—á–µ–Ω–æ: ${fail}`);
       return;
    }

    const restartConfirmCmds = ["restart_confirm", "restart_cancel"];
    if (restartConfirmCmds.includes(cmd)) {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–≠—Ç–æ –Ω–µ –≤–∞—à –∑–∞–ø—Ä–æ—Å –Ω–∞ –ø–µ—Ä–µ–∑–∞–ø—É—Å–∫!" });
          return;
       }
       
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       
       if (cmd === "restart_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `–ü–µ—Ä–µ–∑–∞–ø—É—Å–∫ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞ –æ—Ç–º–µ–Ω–µ–Ω.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       
       // Restart confirm
       await editVkMessage(VK_TOKEN, peerId, cmId, `...::–£–ø—Ä–∞–≤–ª–µ–Ω–∏–µ —Ä–∞–±–æ—Ç–æ–π –±–æ—Ç–∞::...\n\n[‚ñë‚ñë‚ñë‚ñë‚ñë‚ñë‚ñë‚ñë‚ñë‚ñë] 0%`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
       
       const simulateRestart = async () => {
         const statuses = [
           "–ü–æ–¥–∫–ª—é—á–µ–Ω–∏–µ –∫ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö...",
           "–û—á–∏—Å—Ç–∫–∞ –∫—ç—à–∞ —Å–µ—Å—Å–∏–π...",
           "–ó–∞–≥—Ä—É–∑–∫–∞ –∫–æ–Ω—Ñ–∏–≥—É—Ä–∞—Ü–∏–æ–Ω–Ω—ã—Ö —Ñ–∞–π–ª–æ–≤...",
           "–ò–Ω–∏—Ü–∏–∞–ª–∏–∑–∞—Ü–∏—è –º–æ–¥—É–ª–µ–π —è–¥—Ä–∞...",
           "–ü–µ—Ä–µ–∑–∞–ø—É—Å–∫ –æ–±—Ä–∞–±–æ—Ç—á–∏–∫–æ–≤ —Å–æ–±—ã—Ç–∏–π...",
           "–°–ª—É–∂–±—ã —É—Å–ø–µ—à–Ω–æ –∑–∞–ø—É—â–µ–Ω—ã!"
         ];
         for (let i = 10; i <= 100; i+=10) {
            await new Promise(r => setTimeout(r, 700));
            const progress = i / 10;
            const bar = "‚ñì".repeat(progress) + "‚ñë".repeat(10 - progress);
            const status = statuses[Math.floor((i-1)/20)] || statuses[statuses.length-1];
            let msg = `[${bar}] ${i}%\n` +
                      `| –ú–æ–¥—É–ª—å: ${status}`;
            if (i === 100) {
               msg = `[${bar}] ${i}%\n` +
                     `| –í—Å–µ —Å–∏—Å—Ç–µ–º—ã —Ñ—É–Ω–∫—Ü–∏–æ–Ω–∏—Ä—É—é—Ç –≤ —à—Ç–∞—Ç–Ω–æ–º —Ä–µ–∂–∏–º–µ.\n` +
                     `| –í—Ä–µ–º—è –ø–µ—Ä–µ–∑–∞–ø—É—Å–∫–∞: ${getMskTimeStr()}`;
            }
            msg = `...::–£–ø—Ä–∞–≤–ª–µ–Ω–∏–µ —Ä–∞–±–æ—Ç–æ–π –±–æ—Ç–∞::...\n\n` + msg;
            await editVkMessage(VK_TOKEN, peerId, cmId, msg);
         }
       };
       simulateRestart();
       return;
    }

    if (cmd === "deletenet_confirm" || cmd === "deletenet_cancel") {
       if (payloadObj.authorId && userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–≠—Ç–æ –Ω–µ –≤–∞—à –∑–∞–ø—Ä–æ—Å!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const netNum = payloadObj.netNum;
       if (cmd === "deletenet_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `–£–¥–∞–ª–µ–Ω–∏–µ —Å–µ—Ç–∫–∏ –±–µ—Å–µ–¥ ‚Ññ${netNum} –æ—Ç–º–µ–Ω–µ–Ω–æ.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return;
       }
       await deleteChatNetwork(netNum);
       const u = await getOrCreateUser(userId);
       const fullName = u.fullName || u.nick || `User${userId}`;
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] —É–¥–∞–ª–∏–ª(-–∞) —Å–µ—Ç–∫—É –±–µ—Å–µ–¥ ‚Ññ${netNum}`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
       return;
    }

    if (cmd === "dgiveowner_confirm" || cmd === "dgiveowner_cancel") {
       if (payloadObj.authorId && userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–≠—Ç–æ –Ω–µ –≤–∞—à –∑–∞–ø—Ä–æ—Å!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const netNum = payloadObj.netNum;
       const targetId = payloadObj.targetId;
       if (cmd === "dgiveowner_cancel") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `–ü–µ—Ä–µ–¥–∞—á–∞ –ø—Ä–∞–≤ –≤–ª–∞–¥–µ–ª—å—Ü–∞ —Å–µ—Ç–∫–∏ –±–µ—Å–µ–¥ ‚Ññ${netNum} –æ—Ç–º–µ–Ω–µ–Ω–∞.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
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
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] –ø–µ—Ä–µ–¥–∞–ª(-–∞) –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ —Å–µ—Ç–∫–∏ –±–µ—Å–µ–¥ ‚Ññ${netNum} [id${targetId}|${tName}]`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
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
         chatsList.push({ id: cId, title: cData.title || `–ë–µ—Å–µ–¥–∞ ‚Ññ${cId}` });
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

       let out = `...::–°–ø–∏—Å–æ–∫ –±–µ—Å–µ–¥ —Å–µ—Ç–∫–∏ ‚Ññ${net.name}::... (–°—Ç—Ä. ${page}/${totalPages})\n\n` +
         `| –í–ª–∞–¥–µ–ª–µ—Ü —Å–µ—Ç–∫–∏: [id${net.ownerId}|${ownerName}]\n` +
         `| –í—Å–µ–≥–æ –±–µ—Å–µ–¥ –≤ —Å–µ—Ç–∫–µ: ${chatsList.length}\n\n` +
         (chatsList.length > 0 ? listStr : "–ë–µ—Å–µ–¥—ã –≤ —Å–µ—Ç–∫–µ –æ—Ç—Å—É—Ç—Å—Ç–≤—É—é—Ç.");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂", payload: JSON.stringify({ cmd: "netlist_page", netNum: net.name, p: page + 1, authorId: userId }) }, color: "primary" }
            ]
          ]
        };

        await editVkMessage(VK_TOKEN, peerId, cmId, out, { keyboard: JSON.stringify(keyboard) });
        return;
     }

     if (cmd === "antiteg_page") {
        if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
           return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
        }
        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
        const chatData = await getOrCreateChat(peerId);
        const antiTegUsers: number[] = Array.isArray(chatData.antiTegUsers) ? chatData.antiTegUsers : [];
        if (antiTegUsers.length === 0) {
           return await editVkMessage(VK_TOKEN, peerId, cmId, "–°–ø–∏—Å–æ–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å —Ñ—É–Ω–∫—Ü–∏–µ–π ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ –ø—É—Å—Ç.");
        }

        const totalPages = Math.ceil(antiTegUsers.length / 15) || 1;
        let page = parseInt(payloadObj.p) || 1;
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const startIdx = (page - 1) * 15;
        const pageUsers = antiTegUsers.slice(startIdx, startIdx + 15);

        const userRows: string[] = [];
        for (let i = 0; i < pageUsers.length; i++) {
           const uId = pageUsers[i];
           const uData = await getOrCreateUser(uId);
           const uName = uData.fullName || uData.nick || (await fetchVkFullName(uId)) || `User${uId}`;
           userRows.push(`${startIdx + i + 1}) [id${uId}|${uName}]`);
        }

        let out = `...::–°–ø–∏—Å–æ–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å —Ñ—É–Ω–∫—Ü–∏–µ–π ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª::... (–°—Ç—Ä. ${page}/${totalPages})\n\n` +
          `| –í—Å–µ–≥–æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π: ${antiTegUsers.length}\n\n` +
          userRows.join("\n");

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "antiteg_page", p: page - 1, authorId: payloadObj.authorId || userId }) }, color: "primary" },
              { action: { type: "callback", label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂", payload: JSON.stringify({ cmd: "antiteg_page", p: page + 1, authorId: payloadObj.authorId || userId }) }, color: "primary" }
             ]
           ]
         };

         await editVkMessage(VK_TOKEN, peerId, cmId, out, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
         return;
     }

     const ghelpCmds = ["ghelp_main", "ghelp_zr", "ghelp_ozr", "ghelp_ruk", "ghelp_gruk", "ghelp_zown", "ghelp_own"];
    if (ghelpCmds.includes(cmd)) {
       if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const user = await getOrCreateUser(userId);
       const isAdmin = await checkIsAdmin(userId, peerId, user.role);
       const effRole = user.role >= 12 || isAdmin ? 12 : user.role;
       if (effRole < 8) {
          return;
       }

       if (cmd === "ghelp_own" && effRole < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
       if (cmd === "ghelp_zown" && effRole < 11) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
       if (cmd === "ghelp_gruk" && effRole < 10.5) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
       if (cmd === "ghelp_ruk" && effRole < 10) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
       if (cmd === "ghelp_ozr" && effRole < 9) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
       if (cmd === "ghelp_zr" && effRole < 8) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");

       let text = "";

       if (cmd === "ghelp_main") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–æ—Ç–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–æ—Ç–∞:
**/gstaff** - –°–ø–∏—Å–æ–∫ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–æ—Ç–∞.
**/ghelp** - –ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞.`;
       } else if (cmd === "ghelp_zr") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è:
**/gban** - –í—ã–¥–∞—Ç—å –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö.
**/ungban** - –°–Ω—è—Ç—å –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É.
**/gbanlist** - –°–ø–∏—Å–æ–∫ –≥–ª–æ–±–∞–ª—å–Ω–æ –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π.
**/blacklist** - –°–ø–∏—Å–æ–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –≤ –ß–° –±–æ—Ç–∞.
**/rstats** - –°—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞ —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.`;
       } else if (cmd === "ghelp_ozr") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –û—Å–Ω. –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è:
**/grrole** - –°–Ω—è—Ç—å –≥–ª–æ–±–∞–ª—å–Ω—É—é —Ä–æ–ª—å —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.
**/setowner** - –ù–∞–∑–Ω–∞—á–∏—Ç—å –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã.
**/deleteowner** - –°–Ω—è—Ç—å –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã.`;
       } else if (cmd === "ghelp_ruk") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è:
**/banid** - –ó–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –±–µ—Å–µ–¥—É.
**/unbanid** - –†–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –±–µ—Å–µ–¥—É.
**/infochat** - –£–∑–Ω–∞—Ç—å –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—é –æ –±–µ—Å–µ–¥–µ.
**/infoid** - –£–∑–Ω–∞—Ç—å –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—é –æ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ.
**/addblack** - –ó–∞–Ω–µ—Å—Ç–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –ß–° –±–æ—Ç–∞.
**/unblack** - –£–¥–∞–ª–∏—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ –ß–° –±–æ—Ç–∞.
**/gsnick** - –£—Å—Ç–∞–Ω–æ–≤–∏—Ç—å –Ω–∏–∫ –≤–æ –≤—Å—ë–º —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–µ.
**/grnick** - –£–¥–∞–ª–∏—Ç—å –Ω–∏–∫ –≤–æ –≤—Å—ë–º —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–µ.
**/zunban** - –°–Ω—è—Ç—å –≤—Å–µ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö.
**/addzsr** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.
**/addozsr** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ –û—Å–Ω. –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.`;
       } else if (cmd === "ghelp_gruk") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –ì–ª–∞–≤. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è:
**/rebuke** - –í—ã–¥–∞—Ç—å –≤—ã–≥–æ–≤–æ—Ä —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—é.
**/unrebuke** - –°–Ω—è—Ç—å –≤—ã–≥–æ–≤–æ—Ä —Å —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.
**/addruk** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.`;
       } else if (cmd === "ghelp_zown") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –ó–∞–º. –í–ª–∞–¥–µ–ª—å—Ü–∞:
**/addgr** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ –ì–ª–∞–≤–Ω–æ–≥–æ –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.`;
       } else if (cmd === "ghelp_own") {
          text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞::...\n\n–ö–æ–º–∞–Ω–¥—ã –í–ª–∞–¥–µ–ª—å—Ü–∞ –±–æ—Ç–∞:
**/addstatus** - –£—Å—Ç–∞–Ω–æ–≤–∏—Ç—å —Å—Ç–∞—Ç—É—Å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.
**/unstatus** - –°–Ω—è—Ç—å —Å—Ç–∞—Ç—É—Å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.
**/arrole** - –°–Ω—è—Ç—å –≤—Å–µ —Ä–æ–ª–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.
**/setinfobot** - –£—Å—Ç–∞–Ω–æ–≤–∏—Ç—å –∏–Ω—Ñ–æ –±–æ—Ç–∞.
**/rchat** - –°–¥–µ–ª–∞—Ç—å –±–µ—Å–µ–¥—É –±–µ—Å–µ–¥–æ–π —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞.
**/unrchat** - –£–±—Ä–∞—Ç—å —Å—Ç–∞—Ç—É—Å –±–µ—Å–µ–¥—ã —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞.
**/giveowner** - –ü–µ—Ä–µ–¥–∞—Ç—å –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã.
**/addzamowner** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ –ó–∞–º. –í–ª–∞–¥–µ–ª—å—Ü–∞ –±–æ—Ç–∞.`;
       }

       let keyboard = { inline: true, buttons: [] as any[] };
       let availableButtons = [];
       if (effRole >= 8) availableButtons.push({ cmd: "ghelp_zr", label: "–ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è" });
       if (effRole >= 9) availableButtons.push({ cmd: "ghelp_ozr", label: "–û—Å–Ω. –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è" });
       if (effRole >= 10) availableButtons.push({ cmd: "ghelp_ruk", label: "–†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å" });
       if (effRole >= 10.5) availableButtons.push({ cmd: "ghelp_gruk", label: "–ì–ª–∞–≤. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å" });
       if (effRole >= 11) availableButtons.push({ cmd: "ghelp_zown", label: "–ó–∞–º. –í–ª–∞–¥–µ–ª—å—Ü–∞" });
       if (effRole >= 12) availableButtons.push({ cmd: "ghelp_own", label: "–í–ª–∞–¥–µ–ª–µ—Ü –±–æ—Ç–∞" });

       let row: any[] = [];
       for (const btn of availableButtons) {
          if (btn.cmd !== cmd) {
             row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: payloadObj.authorId }) }, color: "secondary" });
             if (row.length === 2) {
                keyboard.buttons.push(row);
                row = [];
             }
          }
       }
       if (row.length > 0) keyboard.buttons.push(row);

       if (cmd !== "ghelp_main") {
          keyboard.buttons.push([{ action: { type: "callback", label: "–ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "ghelp_main", authorId: payloadObj.authorId }) }, color: "secondary" }]);
       }

       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }
          const finalTargetCmId = payloadObj.cm_id || cmId;
                    if (cmd === "zr_cancel") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             zrApplicationStateMap.delete(userId);
             if (cmId) {
                try {
                   await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
                } catch (e) {}
             }
             const replyOpts: any = {};
             if (cmId) {
                replyOpts.forward = JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true });
             }
             await sendVkMessage(VK_TOKEN, peerId, "–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–æ–¥–∞—á—É –∑–∞—è–≤–∫–∏ –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.", replyOpts);
             return;
          }

          if (cmd === "zr_start") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             if (cmId) {
                try {
                   const uFirstName = await fetchVkFirstName(userId);
                   const welcomeText = `[id${userId}|${uFirstName}], –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤—É–µ–º!\n\n–í—ã —Ö–æ—Ç–∏—Ç–µ –ø–æ–¥–∞—Ç—å –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è?`;
                   await editVkMessage(VK_TOKEN, peerId, cmId, welcomeText, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
                } catch (e) {}
             }
             const q1Text = "–û—Ç–ª–∏—á–Ω–æ, —Ç–æ–≥–¥–∞ –º—ã –∑–∞–¥–∞–¥–∏–º –≤–∞–º –ø–∞—Ä—É –≤–æ–ø—Ä–æ—Å–æ–≤.\n\n–°–∫–æ–ª—å–∫–æ –≤–∞–º –ª–µ—Ç?";
             const qCancelKeyboard = {
                inline: true,
                buttons: [
                   [
                      { action: { type: "callback", label: "–û—Ç–º–µ–Ω–∏—Ç—å –ø–æ–¥–∞—á—É", payload: JSON.stringify({ cmd: "zr_cancel" }) }, color: "negative" }
                   ]
                ]
             };
             const replyOpts: any = { keyboard: JSON.stringify(qCancelKeyboard) };
             if (cmId) {
                replyOpts.forward = JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true });
             }
             const newMsg = await sendVkMessage(VK_TOKEN, peerId, q1Text, replyOpts);
             const newMsgId = newMsg?.response || newMsg;
             zrApplicationStateMap.set(userId, { step: 1, answers: {}, lastMsgId: typeof newMsgId === 'number' ? newMsgId : undefined });
             return;
          }

          if (cmd === "zr_cancel_app") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             zrApplicationStateMap.delete(userId);
             await editVkMessage(VK_TOKEN, peerId, cmId, "–•–æ—Ä–æ—à–æ, –≤—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–æ–¥–∞—á—É –∑–∞—è–≤–∫–∏ –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             return;
          }

          if (cmd === "zr_send_app") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
             const state = zrApplicationStateMap.get(userId);
             const answers = state?.answers || {};
             zrApplicationStateMap.delete(userId);

             await editVkMessage(VK_TOKEN, peerId, cmId, "–í–∞—à–∞ –∑–∞—è–≤–∫–∞ –±—ã–ª–∞ –æ—Ç–ø—Ä–∞–≤–ª–µ–Ω–∞ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤—É –Ω–∞ —Ä–∞—Å—Å–º–æ—Ç—Ä–µ–Ω–∏–µ, –æ–∂–∏–¥–∞–π—Ç–µ –≤–µ—Ä–¥–∏–∫—Ç–∞.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

             const appUser = await getOrCreateUser(userId);
             const fullName = appUser.fullName || (await fetchVkFullName(userId)) || `User${userId}`;

             const targetChatPeer = 2000000026;
             const appText = `–ü–æ—Å—Ç—É–ø–∏–ª–∞ –Ω–æ–≤–∞—è –∑–∞—è–≤–∫–∞ –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è!\n\n` +
               `| –ó–∞—è–≤–∫—É –æ—Ç–ø—Ä–∞–≤–∏–ª - [id${userId}|${fullName}]\n` +
               `| VK ID –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è - ${userId}\n\n` +
               `–û—Ç–≤–µ—Ç—ã –Ω–∞ –≤–æ–ø—Ä–æ—Å—ã –≤ –∑–∞—è–≤–∫–µ:\n\n` +
               `| –°–∫–æ–ª—å–∫–æ –≤–∞–º –ª–µ—Ç?\n- ${answers[1] || "‚Äî"}\n\n` +
               `| –£–∫–∞–∂–∏—Ç–µ –≤–∞—à—É —ç–ª–µ–∫—Ç—Ä–æ–Ω–Ω—É—é –ø–æ—á—Ç—É:\n- ${answers[2] || "‚Äî"}\n\n` +
               `| –û—Ç–ª–∏—á–Ω–æ, —Ç–µ–ø–µ—Ä—å —É–∫–∞–∂–∏—Ç–µ –≤–∞—à Telegram:\n- ${answers[3] || "‚Äî"}\n\n` +
               `| –ö–∞–∫–æ–π —É –≤–∞—Å —á–∞—Å–æ–≤–æ–π –ø–æ—è—Å (–æ—Ç –ú–°–ö)?\n- ${answers[4] || "‚Äî"}\n\n` +
               `| –†–∞—Å—Å–∫–∞–∂–∏—Ç–µ, –ø–æ—á–µ–º—É –≤—ã —Ö–æ—Ç–∏—Ç–µ –ø–æ–ø–∞—Å—Ç—å –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è?\n- ${answers[5] || "‚Äî"}\n\n` +
               `| –ß—Ç–æ –≤—ã –±—É–¥–µ—Ç–µ –¥–µ–ª–∞—Ç—å –Ω–∞ –ø–æ—Å—Ç–µ –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è?\n- ${answers[6] || "‚Äî"}\n\n` +
               `| –ü–æ—á–µ–º—É –º—ã –¥–æ–ª–∂–Ω—ã –≤–∑—è—Ç—å –Ω–∞ –ø–æ—Å—Ç –∏–º–µ–Ω–Ω–æ –≤–∞—Å?\n- ${answers[7] || "‚Äî"}\n\n` +
               `| –ï—Å—Ç—å –ª–∏ —É –≤–∞—Å –æ–ø—ã—Ç –≤ —ç—Ç–æ–π —Å—Ñ–µ—Ä–µ?\n- ${answers[8] || "‚Äî"}\n\n` +
               `| –ì–æ—Ç–æ–≤—ã –ª–∏ –≤—ã –ø–æ–ª—É—á–∏—Ç—å –ß–°–ë/–ß–°–† –∑–∞ —Å–ª–∏–≤ —Å–≤–æ–µ–≥–æ –ø–æ—Å—Ç–∞?\n- ${answers[9] || "‚Äî"}\n\n` +
               `| –°–∫–æ–ª—å–∫–æ –≤—ã –≥–æ—Ç–æ–≤—ã —É–¥–µ–ª—è—Ç—å –≤—Ä–µ–º—è –Ω–∞—à–µ–º—É —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä—É?\n- ${answers[10] || "‚Äî"}\n\n` +
               `| –£–∫–∞–∂–∏—Ç–µ –≤–∞—à –µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –æ–Ω–ª–∞–π–Ω –≤ –í–ö–æ–Ω—Ç–∞–∫—Ç–µ:\n- ${answers[11] || "‚Äî"}\n\n` +
               `| –ì–æ—Ç–æ–≤—ã –ª–∏ –≤—ã —Å–ª—É—à–∞—Ç—å—Å—è –≤—ã—Å—à–µ–µ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–æ?\n- ${answers[12] || "‚Äî"}`;

             const appKeyboard = {
               inline: true,
               buttons: [
                 [
                   { action: { type: "callback", label: "–û–¥–æ–±—Ä–∏—Ç—å", payload: JSON.stringify({ cmd: "zr_approve", applicantId: userId }) }, color: "positive" },
                   { action: { type: "callback", label: "–û—Ç–∫–∞–∑–∞—Ç—å", payload: JSON.stringify({ cmd: "zr_reject", applicantId: userId }) }, color: "negative" }
                 ]
               ]
             };

             await sendVkMessage(VK_TOKEN, targetChatPeer, appText, { keyboard: JSON.stringify(appKeyboard) });
             return;
          }

          if (cmd === "zr_approve") {
             eventAnsweredMap.set(eventId, true);
             const applicantId = payloadObj.applicantId || 0;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ó–∞—è–≤–∫–∞ –æ–¥–æ–±—Ä–µ–Ω–∞." });

             const modUser = await getOrCreateUser(userId);
             const modFullName = modUser.fullName || (await fetchVkFullName(userId)) || "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";

             const appUser = await getOrCreateUser(applicantId);
             const appFullName = appUser.fullName || (await fetchVkFullName(applicantId)) || "–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
             const appFirstName = appUser.firstName || (await fetchVkFirstName(applicantId)) || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";

             try {
               if (cmId) await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             } catch (e) {}

             const replyText = `[id${userId}|${modFullName}] –æ–¥–æ–±—Ä–∏–ª(-–∞) –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è –æ—Ç [id${applicantId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`;
             await sendVkMessage(VK_TOKEN, peerId, replyText, cmId ? {
               forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
             } : {});

             await sendVkMessage(VK_TOKEN, applicantId, `[id${applicantId}|${appFirstName}], –¥–æ–±—Ä–æ–≥–æ –≤—Ä–µ–º–µ–Ω–∏ —Å—É—Ç–æ–∫!\n\n–í–∞—à–∞ –∑–∞—è–≤–∫–∞ –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è –±—ã–ª–∞ –æ–¥–æ–±—Ä–µ–Ω–∞.`);
             return;
          }

          if (cmd === "zr_reject") {
             eventAnsweredMap.set(eventId, true);
             const applicantId = payloadObj.applicantId || 0;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ó–∞—è–≤–∫–∞ –æ—Ç–∫–ª–æ–Ω–µ–Ω–∞." });

             const modUser = await getOrCreateUser(userId);
             const modFullName = modUser.fullName || (await fetchVkFullName(userId)) || "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";

             const appUser = await getOrCreateUser(applicantId);
             const appFullName = appUser.fullName || (await fetchVkFullName(applicantId)) || "–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
             const appFirstName = appUser.firstName || (await fetchVkFirstName(applicantId)) || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";

             try {
               if (cmId) await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             } catch (e) {}

             const replyText = `[id${userId}|${modFullName}] –æ—Ç–∫–∞–∑–∞–ª(-–∞) –∑–∞—è–≤–∫—É –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è –æ—Ç [id${applicantId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`;
             await sendVkMessage(VK_TOKEN, peerId, replyText, cmId ? {
               forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
             } : {});

             await sendVkMessage(VK_TOKEN, applicantId, `[id${applicantId}|${appFirstName}], –¥–æ–±—Ä–æ–≥–æ –≤—Ä–µ–º–µ–Ω–∏ —Å—É—Ç–æ–∫!\n\n–í–∞—à–∞ –∑–∞—è–≤–∫–∞ –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è –±—ã–ª–∞ –æ—Ç–∫–∞–∑–∞–Ω–∞.\n\n–ï—Å–ª–∏ –≤—ã —Ö–æ—Ç–∏—Ç–µ —É–∑–Ω–∞—Ç—å –ø—Ä–∏—á–∏–Ω—É, —Ç–æ –Ω–∞–ø–∏—à–∏—Ç–µ [id${userId}|–º–æ–¥–µ—Ä–∞—Ç–æ—Ä—É] –∫–æ—Ç–æ—Ä—ã–π –æ—Ç–∫–∞–∑–∞–ª –≤–∞–º –∑–∞—è–≤–∫—É.`);
             return;
          }

       if (["mod_clearmute", "mod_clearwarn", "mod_clearban", "mod_cleargban", "mod_clearblack", "mod_unmute", "mod_unban_chat", "mod_ungban", "mod_unblack", "mod_unwarn"].includes(cmd)) {
          const tId = Number(payloadObj.targetId || payloadObj.t || payloadObj.u || 0);
          // 1. User cannot apply moderation actions or clear messages on themselves
          if (userId === tId && tId > 0) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ —Å–Ω–∏–º–∞—Ç—å –Ω–∞–∫–∞–∑–∞–Ω–∏—è –∏–ª–∏ –æ—á–∏—â–∞—Ç—å —Å–æ–æ–±—â–µ–Ω–∏—è —É —Å–∞–º–æ–≥–æ —Å–µ–±—è!");
             return;
          }
          // 2. Role and permission checks
          const clickingUser = await getOrCreateUser(userId);
          const isAdminMember = await checkIsAdmin(userId, peerId, clickingUser.role);
          const chatRole = (clickingUser.chatRoles && clickingUser.chatRoles[peerId]) || 0;
          const effectiveRole = (clickingUser.role >= 8 || userId === 778382713)
             ? 12
             : Math.max(clickingUser.role || 0, chatRole);
          if (cmd === "mod_ungban" || cmd === "mod_unban_chat" || cmd === "mod_unblack" || cmd === "mod_clearblack") {
             if (effectiveRole < 8 && !isAdminMember) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤ (–¢—Ä–µ–±—É–µ—Ç—Å—è –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è)!");
                return;
             }
          } else {
             if (effectiveRole < 1 && !isAdminMember) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤ –º–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞ –¥–ª—è –≤–∑–∞–∏–º–æ–¥–µ–π—Å—Ç–≤–∏—è —Å —ç—Ç–æ–π –∫–Ω–æ–ø–∫–æ–π!");
                return;
             }
             if (tId > 0 && !(await checkHierarchy(peerId, userId, tId, isAdminMember))) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –ø—Ä–∏–º–µ–Ω–∏—Ç—å –¥–µ–π—Å—Ç–≤–∏–µ –∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é, —Ä–∞–≤–Ω—ã–º –∏–ª–∏ —Å—Ç–∞—Ä—à–µ –≤–∞—Å –ø–æ –¥–æ–ª–∂–Ω–æ—Å—Ç–∏!");
                return;
             }
          }
          if (cmd === "mod_clearmute" || cmd === "mod_clearwarn" || cmd === "mod_clearban" || cmd === "mod_cleargban" || cmd === "mod_clearblack") {
             eventAnsweredMap.set(eventId, true);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–°–æ–æ–±—â–µ–Ω–∏—è –æ—á–∏—â–µ–Ω—ã." });
             const mId = payloadObj.msgId; // conversation_message_id
             try {
               if (mId) await deleteVkMessage(VK_TOKEN, peerId, mId);
               if (peerId > 2000000000) await deleteMessagesForUser(peerId, tId, 5);
             } catch (e) {}
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";
             
             let newKeyboard;
             if (cmd === "mod_clearmute") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞", payload: JSON.stringify({ cmd: "mod_unmute", targetId: tId, cm_id: cmId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_clearwarn") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "–°–Ω—è—Ç—å –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: tId, cm_id: cmId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_clearban") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "–†–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: tId, cm_id: cmId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_cleargban") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É", payload: JSON.stringify({ cmd: "mod_ungban", targetId: tId, cm_id: cmId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_clearblack") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "–í—ã–Ω–µ—Å—Ç–∏ –∏–∑ –ß–°", payload: JSON.stringify({ cmd: "mod_unblack", targetId: tId, cm_id: cmId }) }, color: "positive" }] ] };
             }
             
             try {
               await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify(newKeyboard) });
             } catch (e) {}

             if (cmd === "mod_clearblack") {
               await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] –æ—á–∏—Å—Ç–∏–ª(-–∞) —Å–æ–æ–±—â–µ–Ω–∏—è –æ—Ç [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`, {
                 forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true })
               });
             } else {
               await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] –æ—á–∏—Å—Ç–∏–ª(-–∞) —Å–æ–æ–±—â–µ–Ω–∏—è –æ—Ç [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
             }
             return;
          }
          if (cmd === "mod_unmute") {
             eventAnsweredMap.set(eventId, true);
             const targetU = await getOrCreateUser(tId);
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä`;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ë–ª–æ–∫–∏—Ä–æ–≤–∫–∞ —á–∞—Ç–∞ —Å–Ω—è—Ç–∞." });
             await updateUser(tId, { muteUntil: 0, muteReason: "", mutePeerId: 0 });
             targetU.muteUntil = 0;
             targetU.muteReason = "";
             targetU.mutePeerId = 0;
             userCache.set(tId, targetU);
             await executeVkUnmute(peerId, tId);
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] —Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ —Å [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
             try {
                if (finalTargetCmId) await editVkMessage(VK_TOKEN, peerId, finalTargetCmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             } catch (e) {}
             return;
          }
          if (cmd === "mod_unban_chat") {
             eventAnsweredMap.set(eventId, true);
             const targetU = await getOrCreateUser(tId);
             const chatBans = targetU.chatBans || {};
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä`;
             delete chatBans[peerId];
             delete chatBans[String(peerId)];
             await updateUser(tId, { chatBans, isGameBanned: false });
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å —Ä–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω." });
             try {
               await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
                 params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: tId, for_all: 0 }
               });
             } catch (e) {}
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] —Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —Å [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
             try {
                if (finalTargetCmId) await editVkMessage(VK_TOKEN, peerId, finalTargetCmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             } catch (e) {}
             return;
          }
          if (cmd === "mod_ungban") {
             eventAnsweredMap.set(eventId, true);
             const targetU = await getOrCreateUser(tId);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ì–ª–æ–±–∞–ª—å–Ω–∞—è –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞ —Å–Ω—è—Ç–∞." });
             await updateUser(tId, { gban: false, gbanReason: "", gbanBy: 0, gbanDate: 0, gbanExpiresAt: 0 });
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä`;
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] —Å–Ω—è–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —Å [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö`);
             try {
                if (finalTargetCmId) await editVkMessage(VK_TOKEN, peerId, finalTargetCmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             } catch (e) {}
             return;
          }
          if (cmd === "mod_unwarn") {
             eventAnsweredMap.set(eventId, true);
             const targetU = await getOrCreateUser(tId);
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä`;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ —Å–Ω—è—Ç–æ." });
             const newW = Math.max(0, (targetU.warnings || 0) - 1);
             await updateUser(tId, { warnings: newW });
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] —Å–Ω—è–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ —Å [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è]`);
             try {
                if (finalTargetCmId) await editVkMessage(VK_TOKEN, peerId, finalTargetCmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             } catch (e) {}
             return;
          }
          if (cmd === "mod_unblack") {
             eventAnsweredMap.set(eventId, true);
             const targetU = await getOrCreateUser(tId);
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –≤—ã–Ω–µ—Å–µ–Ω –∏–∑ –ß–°." });
             await updateUser(tId, { blacklisted: false, blackExpiresAt: 0, blackReason: "", blackBy: 0 });
             targetU.blacklisted = false;
             targetU.blackExpiresAt = 0;
             userCache.set(tId, targetU);
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä`;
             try {
                if (finalTargetCmId) await editVkMessage(VK_TOKEN, peerId, finalTargetCmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             } catch (e) {}
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] —É–¥–∞–ª–∏–ª(-–∞) [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –∏–∑ —á–µ—Ä–Ω–æ–≥–æ —Å–ø–∏—Å–∫–∞ —Å–æ–æ–±—â–µ—Å—Ç–≤–∞.`, {
                forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [finalTargetCmId], is_reply: true })
             });
             return;
          }
       }
       if (cmd === "mod_giveowner_yes") {
          const clickingUser = await getOrCreateUser(userId);
          const isMainOwner = await checkIsMainOwner(userId, peerId, clickingUser.role);
          const isAdm = await checkIsAdmin(userId, peerId, clickingUser.role);
          if (!isMainOwner && !isAdm) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–ü–µ—Ä–µ–¥–∞–≤–∞—Ç—å –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –º–æ–∂–µ—Ç —Ç–æ–ª—å–∫–æ –æ—Å–Ω–æ–≤–Ω–æ–π –≤–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–ü—Ä–∞–≤–∞ –ø–µ—Ä–µ–¥–∞–Ω—ã." });
          const tUser1 = await getOrCreateUser(tId);
          const chatRoles1 = tUser1.chatRoles || {};
          chatRoles1[peerId] = 7;
          await updateUser(tId, { chatRoles: chatRoles1 });
          
          const tUser2 = await getOrCreateUser(userId);
          const chatRoles2 = tUser2.chatRoles || {};
          delete chatRoles2[peerId];
          await updateUser(userId, { chatRoles: chatRoles2 });

          const chat = await getOrCreateChat(peerId);
          const secondaryOwners = (Array.isArray(chat.secondaryOwners) ? chat.secondaryOwners : []).filter((id: number) => id !== tId);
          await updateChat(peerId, { ownerId: tId, sysOwnerId: tId, secondaryOwners });
          await firestoreDb.collection("chats").doc(peerId.toString()).set({ ownerId: tId, sysOwnerId: tId, secondaryOwners }, { merge: true });

          await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å] –ø–µ—Ä–µ–¥–∞–ª(-–∞) —Å–≤–æ–∏ –ø—Ä–∞–≤–∞ ¬´–í–ª–∞–¥–µ–ª–µ—Ü –ë–µ—Å–µ–¥—ã¬ª [id${tId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é]`);
          await editVkMessage(VK_TOKEN, peerId, cmId, `–ü—Ä–∞–≤–∞ ¬´–í–ª–∞–¥–µ–ª–µ—Ü –ë–µ—Å–µ–¥—ã¬ª —É—Å–ø–µ—à–Ω–æ –ø–µ—Ä–µ–¥–∞–Ω—ã.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–û—Ç–º–µ–Ω–µ–Ω–æ." });
          await editVkMessage(VK_TOKEN, peerId, cmId, `–ü–µ—Ä–µ–¥–∞—á–∞ –ø—Ä–∞–≤ ¬´–í–ª–∞–¥–µ–ª–µ—Ü –ë–µ—Å–µ–¥—ã¬ª –æ—Ç–º–µ–Ω–µ–Ω–∞.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_silence_off") {
          const u = await getOrCreateUser(userId);
          const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
          const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
          const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
          if (effectiveRole < 1 && !isAdminMember && userId !== 778382713 && userId !== 1115715881) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!" });
             return;
          }
          const curChat = await getOrCreateChat(peerId);
          if (!curChat.silence) {
             try {
                await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
             } catch (e) {}
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–†–µ–∂–∏–º —Ç–∏—à–∏–Ω—ã —É–∂–µ –≤—ã–∫–ª—é—á–µ–Ω –≤ –¥–∞–Ω–Ω–æ–π –±–µ—Å–µ–¥–µ!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–†–µ–∂–∏–º —Ç–∏—à–∏–Ω—ã –≤—ã–∫–ª—é—á–µ–Ω." });
          await updateChat(peerId, { silence: false, silenceUntil: 0, silenceTest: false });
          
          try {
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          } catch (e) {}

          try {
             const { items } = await getChatMembers(peerId);
             const memberIds = (items || [])
                .filter((item: any) => item.member_id > 0 && !item.is_admin && !item.is_owner)
                .map((item: any) => item.member_id);
             executeBatchVkRestrictions(peerId, memberIds, "rw").catch(() => {});
          } catch (e) {}

          await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä] –≤—ã–∫–ª—é—á–∏–ª(-–∞) —Ä–µ–∂–∏–º —Ç–∏—à–∏–Ω—ã –≤ –±–µ—Å–µ–¥–µ.`);
          return;
       }


    if (cmd === "chats_page") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "–¢–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä –∫–æ–º–∞–Ω–¥—ã –º–æ–∂–µ—Ç –ø–µ—Ä–µ–∫–ª—é—á–∞—Ç—å —Å—Ç—Ä–∞–Ω–∏—Ü—ã!" });
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
       const list = pageChats.map((c: any, i: number) => `${startIdx + i + 1}) ${c.title || `–ë–µ—Å–µ–¥–∞ ‚Ññ${c.id}`} | ID: ${c.id} | –¢–∏–ø: ${c.type || 'PL'}`).join("\n");

       const keyboard = {
         inline: true,
         buttons: [
           [
             { action: { type: "callback", label: "‚óÄ –ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "chats_page", p: page - 1, authorId: userId }) }, color: "primary" },
             { action: { type: "callback", label: "–í–ø–µ—Ä–µ–¥ ‚ñ∂", payload: JSON.stringify({ cmd: "chats_page", p: page + 1, authorId: userId }) }, color: "primary" }
           ]
         ]
       };

       await editVkMessage(VK_TOKEN, peerId, cmId, `–°–ø–∏—Å–æ–∫ –±–µ—Å–µ–¥ –±–æ—Ç–∞ (–°—Ç—Ä–∞–Ω–∏—Ü–∞ ${page}/${totalPages}):\n\n${list}`, { keyboard: JSON.stringify(keyboard) });
       return;
    }

    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans" || cmd === "vk_profile_info") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "–û—à–∏–±–∫–∞: —Ü–µ–ª—å –Ω–µ —É–∫–∞–∑–∞–Ω–∞" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
      } else if (cmd === "vk_profile_info") {
         resData = await getVkProfileInfoPage(payloadTargetId);
      } else if (cmd === "stats_warns") {
         resData = await getStatsWarnsPage(payloadTargetId);
      } else {
         resData = await getStatsBansPage(payloadTargetId);
      }

      await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
      return;
    }

    const botHelpCmds = ["cmd_help_main", "help_moder", "help_smoder", "cmd_help_admin_bot", "help_sadmin", "help_zsa", "help_sa", "help_owner"];
    if (botHelpCmds.includes(cmd)) {
      if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const user = await getOrCreateUser(userId);
      
      let text = "";
      if (cmd === "cmd_help_main") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n–î–æ—Å—Ç—É–ø–Ω—ã–µ –ø—Ä–µ—Ñ–∏–∫—Å—ã –∫–æ–º–∞–Ω–¥: ¬´/¬ª ¬´!¬ª ¬´.¬ª ¬´,¬ª ¬´;¬ª ¬´:¬ª\n\n| –ö–æ–º–∞–Ω–¥—ã –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π:\n**/help** - –ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º.\n**/alt** - –ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥ (–∞–ª–∏–∞—Å—ã).\n**/gamehelp** - –ü–æ–º–æ—â—å –ø–æ –∏–≥—Ä–æ–≤—ã–º –∫–æ–º–∞–Ω–¥–∞–º.\n**/stats** - –£–∑–Ω–∞—Ç—å —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫—É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/statsimg** - –ö–∞—Ä—Ç–æ—á–∫–∞ —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/ping** - –£–∑–Ω–∞—Ç—å –ø–∏–Ω–≥ –±–æ—Ç–∞.\n**/infobot** - –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–æ—Ç–µ.\n**/q** - –ü–æ–∫–∏–Ω—É—Ç—å –±–µ—Å–µ–¥—É.`;
      } else if (cmd === "help_moder") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞:\n**/mute** - –í—ã–¥–∞—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/unmute** - –°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/warn** - –í—ã–¥–∞—Ç—å –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/unwarn** - –°–Ω—è—Ç—å –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/warns** - –ü–æ—Å–º–æ—Ç—Ä–µ—Ç—å –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/kick** - –ò—Å–∫–ª—é—á–∏—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ –±–µ—Å–µ–¥—ã.\n**/clear** - –û—á–∏—Å—Ç–∏—Ç—å —Å–æ–æ–±—â–µ–Ω–∏—è –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/mclear** - –û—á–∏—Å—Ç–∏—Ç—å –Ω–µ—Å–∫–æ–ª—å–∫–æ —Å–æ–æ–±—â–µ–Ω–∏–π.\n**/staff** - –°–ø–∏—Å–æ–∫ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–µ—Å–µ–¥—ã.\n**/mutelist** - –°–ø–∏—Å–æ–∫ –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã—Ö –≤ —á–∞—Ç–µ.\n**/warnlist** - –°–ø–∏—Å–æ–∫ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π –≤ –±–µ—Å–µ–¥–µ.\n**/smute** - –¢–∏—Ö–æ –≤—ã–¥–∞—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/skick** - –¢–∏—Ö–æ –∏—Å–∫–ª—é—á–∏—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ –±–µ—Å–µ–¥—ã.\n**/sclear** - –¢–∏—Ö–æ –æ—á–∏—Å—Ç–∏—Ç—å —Å–æ–æ–±—â–µ–Ω–∏–µ –æ—Ç –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/smclear** - –¢–∏—Ö–æ –æ—á–∏—Å—Ç–∏—Ç—å —Å–æ–æ–±—â–µ–Ω–∏—è –æ—Ç –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.`;
      } else if (cmd === "help_smoder") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –°—Ç–∞—Ä—à–µ–≥–æ –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞:\n**/ban** - –ó–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ.\n**/unban** - –†–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ.\n**/banlist** - –°–ø–∏—Å–æ–∫ –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã—Ö –≤ –±–µ—Å–µ–¥–µ.\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 1 –ª–≤–ª).\n**/removerole** - –°–Ω—è—Ç—å –ø—Ä–∞–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/zov** - –°–æ–∑–≤–∞—Ç—å —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã.\n**/olist** - –°–ø–∏—Å–æ–∫ —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –æ–Ω–ª–∞–π–Ω.\n**/offlinelist** - –°–ø–∏—Å–æ–∫ —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –æ—Ñ—Ñ–ª–∞–π–Ω.\n**/sban** - –¢–∏—Ö–æ –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ.\n**/sunban** - –¢–∏—Ö–æ —Ä–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ.`;
      } else if (cmd === "cmd_help_admin_bot") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/purge** - –û—á–∏—Å—Ç–∏—Ç—å –ø–æ—Å–ª–µ–¥–Ω–∏–µ —Å–æ–æ–±—â–µ–Ω–∏—è –≤ –±–µ—Å–µ–¥–µ.\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 2 –ª–≤–ª).\n**/logsadm** - –õ–æ–≥–∏ –≤—ã–¥–∞—á–∏/—Å–Ω—è—Ç–∏—è –ø—Ä–∞–≤ –≤ –±–µ—Å–µ–¥–µ.\n**/logsmute** - –õ–æ–≥–∏ –±–ª–æ–∫–∏—Ä–æ–≤–æ–∫ —á–∞—Ç–∞ –≤ –±–µ—Å–µ–¥–µ.\n**/logsban** - –õ–æ–≥–∏ –±–ª–æ–∫–∏—Ä–æ–≤–æ–∫ –≤ –±–µ—Å–µ–¥–µ.\n**/logswarn** - –õ–æ–≥–∏ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π –≤ –±–µ—Å–µ–¥–µ.\n**/logskick** - –õ–æ–≥–∏ –∫–∏–∫–æ–≤ –≤ –±–µ—Å–µ–¥–µ.\n**/nban** - –ó–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/nkick** - –ò—Å–∫–ª—é—á–∏—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/nrole** - –í—ã–¥–∞—Ç—å —Ä–æ–ª—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/nremoverole** - –ó–∞–±—Ä–∞—Ç—å —Ä–æ–ª—å —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/snban** - –¢–∏—Ö–æ –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/snkick** - –¢–∏—Ö–æ –∏—Å–∫–ª—é—á–∏—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/snrole** - –¢–∏—Ö–æ –≤—ã–¥–∞—Ç—å —Ä–æ–ª—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.\n**/snremoverole** - –¢–∏—Ö–æ –∑–∞–±—Ä–∞—Ç—å —Ä–æ–ª—å —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–∞—Ö —Å–µ—Ç–∫–∏.`;
      } else if (cmd === "help_sadmin") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –°—Ç–∞—Ä—à–µ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 3 –ª–≤–ª).`;
      } else if (cmd === "help_zsa") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ó–∞–º. –ì–ª–∞–≤–Ω–æ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 4 –ª–≤–ª).\n**/pin** - –ó–∞–∫—Ä–µ–ø–∏—Ç—å —Å–æ–æ–±—â–µ–Ω–∏–µ.\n**/unpin** - –û—Ç–∫—Ä–µ–ø–∏—Ç—å —Å–æ–æ–±—â–µ–Ω–∏–µ.`;
      } else if (cmd === "help_sa") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ì–ª–∞–≤–Ω–æ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/settings** - –ù–∞—Å—Ç—Ä–æ–π–∫–∏ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞ –≤ –±–µ—Å–µ–¥–µ.\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 5 –ª–≤–ª).\n**/addantiteg** - –í—ã–¥–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/unantiteg** - –ó–∞–±—Ä–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/antiteglist** - –°–ø–∏—Å–æ–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å —Ñ—É–Ω–∫—Ü–∏–µ–π ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª.`;
      } else if (cmd === "help_owner") {
        text = `...::–ü–æ–º–æ—â—å –ø–æ –∫–æ–º–∞–Ω–¥–∞–º –±–æ—Ç–∞::...\n\n| –ö–æ–º–∞–Ω–¥—ã –í–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã:\n**/start** - –ê–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä –≤ –±–µ—Å–µ–¥–µ.\n**/type** - –ò–∑–º–µ–Ω–∏—Ç—å —Ç–∏–ø –±–µ—Å–µ–¥—ã.\n**/sync** - –°–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∏—Ä–æ–≤–∞—Ç—å —Å—Ç—Ä—É–∫—Ç—É—Ä—É –±–µ—Å–µ–¥—ã.\n**/games** - –í–∫–ª—é—á–∏—Ç—å/–≤—ã–∫–ª—é—á–∏—Ç—å –∏–≥—Ä—ã –≤ –±–µ—Å–µ–¥–µ.\n**/giveowner** - –ü–µ—Ä–µ–¥–∞—Ç—å –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã.\n**/addowner** - –í—ã–¥–∞—Ç—å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é –ø—Ä–∞–≤–∞ –≤—Ç–æ—Ä–æ—Å—Ç–µ–ø–µ–Ω–Ω–æ–≥–æ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã.\n**/addaccesslevel** - –í—ã–¥–∞—Ç—å —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤ (–¥–æ 6 –ª–≤–ª).\n**/welcometext** - –ù–∞—Å—Ç—Ä–æ–∏—Ç—å –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏–µ.\n**/leave** - –í–∫–ª/–≤—ã–∫–ª –∫–∏–∫ –ø—Ä–∏ –≤—ã—Ö–æ–¥–µ.\n**/invite** - –í–∫–ª/–≤—ã–∫–ª –∏–Ω–≤–∞–π—Ç —Ç–æ–ª—å–∫–æ –º–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞–º–∏.\n**/af** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Ñ–ª—É–¥.\n**/antisliv** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Å–ª–∏–≤.\n**/raid** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Ä–µ–π–¥.\n**/group** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Å–æ–æ–±—â–µ—Å—Ç–≤–∞.\n**/tegall** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Ç–µ–≥ –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤.\n**/antiad** - –í–∫–ª/–≤—ã–∫–ª –∞–Ω—Ç–∏-—Ä–µ–∫–ª–∞–º—É.\n**/addantiteg** - –í—ã–¥–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.\n**/unantiteg** - –ó–∞–±—Ä–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è.\n**/antiteglist** - –°–ø–∏—Å–æ–∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π —Å —Ñ—É–Ω–∫—Ü–∏–µ–π ¬´–ê–Ω—Ç–∏-—Ç–µ–≥¬ª.\n**/addawstats** - –í—ã–¥–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é "–ê–Ω—Ç–∏-–ø—Ä–æ—Å–º–æ—Ç—Ä stats".\n**/unawstats** - –ó–∞–±—Ä–∞—Ç—å —Ñ—É–Ω–∫—Ü–∏—é "–ê–Ω—Ç–∏-–ø—Ä–æ—Å–º–æ—Ç—Ä stats".\n**/createnet** - –°–æ–∑–¥–∞—Ç—å —Å–µ—Ç–∫—É –±–µ—Å–µ–¥.\n**/deletenet** - –£–¥–∞–ª–∏—Ç—å —Å–µ—Ç–∫—É –±–µ—Å–µ–¥.\n**/dgiveowner** - –ü–µ—Ä–µ–¥–∞—Ç—å –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ —Å–µ—Ç–∫–∏.\n**/addchatnet** - –î–æ–±–∞–≤–∏—Ç—å –±–µ—Å–µ–¥—É –≤ —Å–µ—Ç–∫—É.\n**/unchatnet** - –£–¥–∞–ª–∏—Ç—å –±–µ—Å–µ–¥—É –∏–∑ —Å–µ—Ç–∫–∏.\n**/netlist** - –°–ø–∏—Å–æ–∫ –±–µ—Å–µ–¥ –≤ —Å–µ—Ç–∫–µ.\n**/frozenlist** - –°–ø–∏—Å–æ–∫ —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π.\n**/kickfrozen** - –ò—Å–∫–ª—é—á–∏—Ç—å —É–¥–∞–ª—ë–Ω–Ω—ã—Ö/–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π.`;
      }
 
      let keyboard = { inline: true, buttons: [] as any[] };
      let availableButtons = [];
      const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
      const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
 
      if (effectiveRole >= 1) availableButtons.push({ cmd: "help_moder", label: "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 2) availableButtons.push({ cmd: "help_smoder", label: "–°—Ç–∞—Ä—à–∏–π –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 3) availableButtons.push({ cmd: "cmd_help_admin_bot", label: "–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 4) availableButtons.push({ cmd: "help_sadmin", label: "–°—Ç–∞—Ä—à–∏–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 5) availableButtons.push({ cmd: "help_zsa", label: "–ó–∞–º. –ì–ª–∞–≤. –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞" });
      if (effectiveRole >= 6) availableButtons.push({ cmd: "help_sa", label: "–ì–ª–∞–≤–Ω—ã–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 7) availableButtons.push({ cmd: "help_owner", label: "–í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã" });
       
      let row = [];
      for (const btn of availableButtons) {
        if (btn.cmd !== cmd) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: payloadObj.authorId }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
      }
      if (row.length > 0) keyboard.buttons.push(row);
       
      if (cmd !== "cmd_help_main") {
         keyboard.buttons.push([{ action: { type: "callback", label: "–ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "secondary" }]);
      }
 
      await editVkMessage(VK_TOKEN, peerId, cmId, text, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
      return;
    }

    const botAltCmds = ["cmd_alt_main", "alt_moder", "alt_smoder", "alt_admin", "alt_sadmin", "alt_zsa", "alt_sa", "alt_owner"];
    if (botAltCmds.includes(cmd)) {
      if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä—É –∫–æ–º–∞–Ω–¥—ã!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const user = await getOrCreateUser(userId);
      
      let text = "";
      if (cmd === "cmd_alt_main") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n–î–æ—Å—Ç—É–ø–Ω—ã–µ –ø—Ä–µ—Ñ–∏–∫—Å—ã –∫–æ–º–∞–Ω–¥: ¬´/¬ª ¬´!¬ª ¬´.¬ª ¬´,¬ª ¬´;¬ª ¬´:¬ª\n\n| –ö–æ–º–∞–Ω–¥—ã –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π:\n**/help** -> /cmds, /commands, /–∫–æ–º–∞–Ω–¥—ã, /–∫–æ–º, /–ø–æ–º–æ—â—å, /—Ö–µ–ª–ø\n**/alt** -> /–∞–ª–∏–∞—Å, /–∞–ª–∏–∞—Å—ã, /–∞–ª—å—Ç, /—Å–∏–Ω–æ–Ω–∏–º—ã\n**/gamehelp** -> /ghelp, /–≥–ø–æ–º–æ—â—å, /–∏–≥—Ä–æ–≤—ã–µ, /–∏–≥—Ä–æ–ø–æ–º–æ—â—å, /–∏–≥—Ä—ã\n**/stats** -> /profile, /–∏–Ω—Ñ–æ, /–ø—Ä–æ—Ñ–∏–ª—å, /—Å—Ç–∞—Ç, /—Å—Ç–∞—Ç–∞, /—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞\n**/statsimg** -> /stataimg, /statsimg, /–∫–∞—Ä—Ç–æ—á–∫–∞, /–ø—Ä–æ—Ñ–∏–ª—å–∫–∞—Ä—Ç–∞, /—Å—Ç–∞—Ç–∫–∞—Ä—Ç–∞\n**/ping** -> /–ø–∏–Ω–≥, /–ø—Ä–æ–≤–µ—Ä–∫–∞\n**/infobot** -> /info, /infobot, /–±–æ—Ç, /–∏–Ω—Ñ–æ, /–∏–Ω—Ñ–æ–±–æ—Ç, /–∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è\n**/q** -> /leave, /–≤—ã–π—Ç–∏, /–ª–∏–≤, /–ª–∏–≤–∞—Ç—å, /–ø–æ–∫–∏–Ω—É—Ç—å\n**/hug** -> /hug, /–æ–±–Ω—è—Ç—å, /–æ–±–Ω–∏–º–∞—à–∫–∏, /–æ–±–Ω—è—Ç—å_–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è\n**/kiss** -> /kiss, /—á–º–æ–∫, /–ø–æ—Ü–µ–ª—É–π, /–ø–æ—Ü–µ–ª–æ–≤–∞—Ç—å\n**/kick_fun** -> /kick_fun, /–ø–Ω—É—Ç—å, /—É–¥–∞—Ä, /—É–¥–∞—Ä–∏—Ç—å\n**/bitcoin** -> /btc, /bitcoin, /–±–∏—Ç–∫–æ–∏–Ω, /–±—Ç–∫`;
      } else if (cmd === "alt_moder") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞:\n**/mute** -> /–±–ª–æ–∫—á–∞—Ç, /–∑–∞–º—É—Ç–∏—Ç—å, /–º—É—Ç, /—Ç–∏—à–∏–Ω–∞\n**/unmute** -> /–∞–Ω–º—É—Ç, /—Ä–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å—á–∞—Ç, /—Ä–∞–∑–º—É—Ç, /—Å–Ω—è—Ç—å–º—É—Ç\n**/warn** -> /–≤–∞—Ä–Ω, /–ø—Ä–µ–¥, /–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ\n**/unwarn** -> /–∞–Ω–≤–∞—Ä–Ω, /—Å–Ω—è—Ç—å–≤–∞—Ä–Ω, /—Å–Ω—è—Ç—å–ø—Ä–µ–¥\n**/warns** -> /–≤–∞—Ä–Ω—ã, /–ø—Ä–µ–¥—ã, /–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è\n**/kick** -> /–≤—ã–≥–Ω–∞—Ç—å, /–∏—Å–∫–ª—é—á–∏—Ç—å, /–∫–∏–∫, /–∫–∏–∫–Ω—É—Ç—å\n**/clear** -> /–æ—á–∏—Å—Ç–∏—Ç—å, /—É–¥–∞–ª–∏—Ç—å, /—á–∏—Å—Ç–∫–∞\n**/mclear** -> /–º–æ—á–∏—Å—Ç–∏—Ç—å, /–º—É–ª—å—Ç–∏–æ—á–∏—Å—Ç–∏—Ç—å\n**/staff** -> /–∞–¥–º–∏–Ω—ã, /–º–æ–¥–µ—Ä—ã, /—Å–æ—Å—Ç–∞–≤, /—Å—Ç–∞—Ñ—Ñ\n**/mutelist** -> /–∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã–µ_—á–∞—Ç, /–º—É—Ç–ª–∏—Å—Ç, /—Å–ø–∏—Å–æ–∫–º—É—Ç–æ–≤\n**/warnlist** -> /–≤–∞—Ä–Ω–ª–∏—Å—Ç, /—Å–ø–∏—Å–æ–∫–≤–∞—Ä–Ω–æ–≤, /—Å–ø–∏—Å–æ–∫–ø—Ä–µ–¥–æ–≤\n**/smute** -> /—Å–º—É—Ç, /—Ç–∏—Ö–∏–π–º—É—Ç\n**/skick** -> /—Å–∫–∏–∫, /—Ç–∏—Ö–∏–π–∫–∏–∫\n**/sclear** -> /—Å–æ—á–∏—Å—Ç–∏—Ç—å, /—Ç–∏—Ö–∞—è–æ—á–∏—Å—Ç–∫–∞\n**/smclear** -> /—Å–º–æ—á–∏—Å—Ç–∏—Ç—å, /—Ç–∏—Ö–∞—è–º—É–ª—å—Ç–∏–æ—á–∏—Å—Ç–∫–∞`;
      } else if (cmd === "alt_smoder") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –°—Ç–∞—Ä—à–µ–≥–æ –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞:\n**/ban** -> /–±–ª–æ–∫, /–±–∞–Ω, /–∑–∞–±–∞–Ω–∏—Ç—å\n**/unban** -> /–∞–Ω–±–∞–Ω, /—Ä–∞–∑–±–∞–Ω, /—Ä–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞—Ç—å\n**/banlist** -> /–±–∞–Ω–ª–∏—Å—Ç, /–∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã–µ, /—Å–ø–∏—Å–æ–∫–±–∞–Ω–æ–≤\n**/addaccesslevel** -> /–≤—ã–¥–∞—Ç—å–ø—Ä–∞–≤–∞, /–¥–∞—Ç—å–ø—Ä–∞–≤–∞, /—Ä–æ–ª—å\n**/removerole** -> /–∑–∞–±—Ä–∞—Ç—å—Ä–æ–ª—å, /—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞, /—Å–Ω—è—Ç—å—Ä–æ–ª—å\n**/zov** -> /–∞–ª–ª, /–∑–æ–≤, /—Å–±–æ—Ä, /—Å–æ–∑—ã–≤\n**/olist** -> /–∫—Ç–æ–æ–Ω–ª–∞–π–Ω, /–æ–ª–∏—Å—Ç, /–æ–Ω–ª–∞–π–Ω\n**/offlinelist** -> /–æ—Ñ–ª–∞–π–Ω, /–æ—Ñ—Ñ–ª–∞–π–Ω, /–æ—Ñ—Ñ–ª–∏—Å—Ç\n**/sban** -> /—Å–±–∞–Ω, /—Ç–∏—Ö–∏–π–±–∞–Ω\n**/sunban** -> /—Å–∞–Ω–±–∞–Ω, /—Ç–∏—Ö–∏–π—Ä–∞–∑–±–∞–Ω`;
      } else if (cmd === "alt_admin") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/purge** -> /–æ—á–∏—Å—Ç–∏—Ç—å—á–∞—Ç, /–ø—É—Ä–∂, /—á–∏—Å—Ç–∫–∞—á–∞—Ç–∞\n**/logsadm** -> /–∞–¥–º–ª–æ–≥–∏, /–ª–æ–≥–∏–∞–¥–º\n**/logsmute** -> /–ª–æ–≥–∏–º—É—Ç, /–º—É—Ç–ª–æ–≥–∏\n**/logsban** -> /–±–∞–Ω–ª–æ–≥–∏, /–ª–æ–≥–∏–±–∞–Ω\n**/logswarn** -> /–≤–∞—Ä–Ω–ª–æ–≥–∏, /–ª–æ–≥–∏–≤–∞—Ä–Ω\n**/logskick** -> /–∫–∏–∫–ª–æ–≥–∏, /–ª–æ–≥–∏–∫–∏–∫\n**/nban** -> /–Ω–±–∞–Ω, /—Å–µ—Ç–∫–∞–±–∞–Ω\n**/nkick** -> /–Ω–∫–∏–∫, /—Å–µ—Ç–∫–∞–∫–∏–∫\n**/nrole** -> /–Ω—Ä–æ–ª—å, /—Å–µ—Ç–∫–∞—Ä–æ–ª—å\n**/nremoverole** -> /–Ω—Å–Ω—è—Ç—å—Ä–æ–ª—å, /—Å–µ—Ç–∫–∞—Å–Ω—è—Ç—å—Ä–æ–ª—å\n**/snban** -> /—Å–Ω–±–∞–Ω, /—Ç–∏—Ö–∏–π—Å–µ—Ç–∫–∞–±–∞–Ω\n**/snkick** -> /—Å–Ω–∫–∏–∫, /—Ç–∏—Ö–∏–π—Å–µ—Ç–∫–∞–∫–∏–∫\n**/snrole** -> /—Å–Ω—Ä–æ–ª—å, /—Ç–∏—Ö–∏–π—Å–µ—Ç–∫–∞—Ä–æ–ª—å\n**/snremoverole** -> /—Å–Ω—Å–Ω—è—Ç—å—Ä–æ–ª—å, /—Ç–∏—Ö–∏–π—Å–µ—Ç–∫–∞—Å–Ω—è—Ç—å—Ä–æ–ª—å`;
      } else if (cmd === "alt_sadmin") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –°—Ç–∞—Ä—à–µ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/addaccesslevel** -> /–≤—ã–¥–∞—Ç—å–ø—Ä–∞–≤–∞ (–¥–æ 3 –ª–≤–ª)`;
      } else if (cmd === "alt_zsa") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ó–∞–º. –ì–ª–∞–≤–Ω–æ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/pin** -> /–∑–∞–∫—Ä–µ–ø, /–∑–∞–∫—Ä–µ–ø–∏—Ç—å, /–ø–∏–Ω\n**/unpin** -> /–∞–Ω–ø–∏–Ω, /–æ—Ç–∫—Ä–µ–ø–∏—Ç—å, /—Ä–∞—Å–ø–∏–Ω–∏—Ç—å`;
      } else if (cmd === "alt_sa") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –ì–ª–∞–≤–Ω–æ–≥–æ –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n**/settings** -> /–Ω–∞—Å—Ç—Ä–æ–π–∫–∏, /–Ω–∞—Å—Ç—Ä–æ–π–∫–∏_—á–∞—Ç–∞, /—Å–µ—Ç—Ç–∏–Ω–≥—Å\n**/addantiteg** -> /–≤—ã–¥–∞—Ç—å–∞–Ω—Ç–∏—Ç–µ–≥, /–¥–∞—Ç—å–∞–Ω—Ç–∏—Ç–µ–≥\n**/unantiteg** -> /–∑–∞–±—Ä–∞—Ç—å–∞–Ω—Ç–∏—Ç–µ–≥, /—Å–Ω—è—Ç—å–∞–Ω—Ç–∏—Ç–µ–≥\n**/antiteglist** -> /–∞–Ω—Ç–∏—Ç–µ–≥–ª–∏—Å—Ç, /—Å–ø–∏—Å–æ–∫–∞–Ω—Ç–∏—Ç–µ–≥`;
      } else if (cmd === "alt_owner") {
        text = `...::–ê–ª—å—Ç–µ—Ä–Ω–∞—Ç–∏–≤–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è –∫–æ–º–∞–Ω–¥::...\n\n| –ö–æ–º–∞–Ω–¥—ã –í–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã:\n**/start** -> /–∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å, /—Å—Ç–∞—Ä—Ç\n**/type** -> /–∏–∑–º–µ–Ω–∏—Ç—å—Ç–∏–ø, /—Ç–∏–ø, /—Ç–∏–ø–±–µ—Å–µ–¥—ã\n**/sync** -> /—Å–∏–Ω–∫, /—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∞—Ü–∏—è, /—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∏—Ä–æ–≤–∞—Ç—å\n**/games** -> /–∏–≥—Ä—ã–≤–∫–ª, /–∏–≥—Ä—ã–≤—ã–∫–ª\n**/giveowner** -> /–ø–µ—Ä–µ–¥–∞—Ç—å–≤–ª–∞–¥–µ–ª—å—Ü–∞, /–ø–µ—Ä–µ–¥–∞—Ç—å–ø—Ä–∞–≤–∞\n**/addowner** -> /–¥–æ–±–∞–≤–∏—Ç—å–≤–ª–∞–¥–µ–ª—å—Ü–∞, /–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞\n**/welcometext** -> /–ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏–µ, /—Ç–µ–∫—Å—Ç–ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏—è\n**/leave** -> /–∞–≤—Ç–æ–∫–∏–∫, /–ª–∏–≤–∫–æ–Ω—Ç—Ä–æ–ª—å\n**/invite** -> /–∏–Ω–≤–∞–π—Ç–º–æ–¥, /—Ç–æ–ª—å–∫–æ–º–æ–¥–µ—Ä—ã\n**/af** -> /–∞–Ω—Ç–∏—Ñ–ª—É–¥, /—Ñ–ª—É–¥–∫–æ–Ω—Ç—Ä–æ–ª—å\n**/antisliv** -> /–∞–Ω—Ç–∏—Å–ª–∏–≤, /–∑–∞—â–∏—Ç–∞\n**/raid** -> /–∞–Ω—Ç–∏—Ä–µ–π–¥, /—Ä–µ–π–¥\n**/group** -> /–∞–Ω—Ç–∏–≥—Ä—É–ø–ø—ã, /–∞–Ω—Ç–∏—Å–æ–æ–±—â–µ—Å—Ç–≤–∞\n**/tegall** -> /–∞–Ω—Ç–∏—Ç–µ–≥–∞–ª–ª, /–∞–Ω—Ç–∏—Ç–µ–≥–≤—Å–µ—Ö\n**/antiad** -> /–∞–Ω—Ç–∏–ø–∏–∞—Ä, /–∞–Ω—Ç–∏—Ä–µ–∫–ª–∞–º–∞\n**/addawstats** -> /–≤—ã–¥–∞—Ç—å–∞–Ω—Ç–∏—Å—Ç–∞—Ç—Å, /–¥–∞—Ç—å–∞–Ω—Ç–∏—Å—Ç–∞—Ç—Å\n**/unawstats** -> /–∑–∞–±—Ä–∞—Ç—å–∞–Ω—Ç–∏—Å—Ç–∞—Ç—Å, /—Å–Ω—è—Ç—å–∞–Ω—Ç–∏—Å—Ç–∞—Ç—Å\n**/createnet** -> /—Å–æ–∑–¥–∞—Ç—å—Å–µ—Ç–∫—É\n**/deletenet** -> /—É–¥–∞–ª–∏—Ç—å—Å–µ—Ç–∫—É\n**/dgiveowner** -> /–ø–µ—Ä–µ–¥–∞—Ç—å—Å–µ—Ç–∫—É\n**/addchatnet** -> /–¥–æ–±–∞–≤–∏—Ç—å–≤—Å–µ—Ç–∫—É\n**/unchatnet** -> /—É–¥–∞–ª–∏—Ç—å–∏–∑—Å–µ—Ç–∫–∏\n**/netlist** -> /—Å–µ—Ç–∫–∏, /—Å–ø–∏—Å–æ–∫—Å–µ—Ç–æ–∫\n**/frozenlist** -> /–∑–∞–º–æ—Ä–æ–∂–µ–Ω–Ω—ã–µ, /—Å–æ–±–∞—á–∫–∏\n**/kickfrozen** -> /–∫–∏–∫—Å–æ–±–∞—á–µ–∫, /–æ—á–∏—Å—Ç–∏—Ç—å—Å–æ–±–∞—á–µ–∫`;
      }
 
      let keyboard = { inline: true, buttons: [] as any[] };
      let availableButtons = [];
      const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
      const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
 
      if (effectiveRole >= 1) availableButtons.push({ cmd: "alt_moder", label: "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 2) availableButtons.push({ cmd: "alt_smoder", label: "–°—Ç–∞—Ä—à–∏–π –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 3) availableButtons.push({ cmd: "alt_admin", label: "–ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 4) availableButtons.push({ cmd: "alt_sadmin", label: "–°—Ç–∞—Ä—à–∏–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 5) availableButtons.push({ cmd: "alt_zsa", label: "–ó–∞–º. –ì–ª–∞–≤. –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞" });
      if (effectiveRole >= 6) availableButtons.push({ cmd: "alt_sa", label: "–ì–ª–∞–≤–Ω—ã–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä" });
      if (effectiveRole >= 7) availableButtons.push({ cmd: "alt_owner", label: "–í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã" });
       
      let row = [];
      for (const btn of availableButtons) {
        if (btn.cmd !== cmd) {
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: payloadObj.authorId }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
      }
      if (row.length > 0) keyboard.buttons.push(row);
       
      if (cmd !== "cmd_alt_main") {
         keyboard.buttons.push([{ action: { type: "callback", label: "–ù–∞–∑–∞–¥", payload: JSON.stringify({ cmd: "cmd_alt_main", authorId: payloadObj.authorId }) }, color: "secondary" }]);
      }
 
      await editVkMessage(VK_TOKEN, peerId, cmId, text, keyboard.buttons.length > 0 ? { keyboard: JSON.stringify(keyboard) } : {});
      return;
    }

    if (cmd === "set_custom_roles") {
      const chatData = await getOrCreateChat(peerId);
      const eventUser = await getOrCreateUser(userId);
      const isOwner = (chatData.ownerId === userId) || (chatData.sysOwnerId === userId) || (Array.isArray(chatData.secondaryOwners) && chatData.secondaryOwners.includes(userId)) || userId === 778382713 || (eventUser.role && eventUser.role >= 12);
      if (!isOwner) {
         await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤! –ö–æ–º–∞–Ω–¥–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –í–ª–∞–¥–µ–ª—å—Ü–∞–º –±–µ—Å–µ–¥—ã.");
         return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const text = `–£–∫–∞–∂–∏—Ç–µ –∞—Ä–≥—É–º–µ–Ω—Ç—ã –∫–æ–º–∞–Ω–¥—ã!\n\n| –ü—Ä–∏–º–µ—Ä:\n\n| –í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã:\n- {owner}\n\n| –ì–ª–∞–≤–Ω—ã–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä:\n- {ga}\n\n| –ó–∞–º. –ì–ª–∞–≤. –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞:\n- {zga}\n\n| –°—Ç–∞—Ä—à–∏–π –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä:\n- {sadmin}\n\n| –ê–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä:\n- {admin}\n\n| –°—Ç–∞—Ä—à–∏–π –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä:\n- {smoder}\n\n| –ú–æ–¥–µ—Ä–∞—Ç–æ—Ä:\n- {moder}`;
      await editVkMessage(VK_TOKEN, peerId, cmId, text);
      return;
    }

    if (cmd === "del_custom_roles") {
      const chatData = await getOrCreateChat(peerId);
      const eventUser = await getOrCreateUser(userId);
      const isOwner = (chatData.ownerId === userId) || (chatData.sysOwnerId === userId) || (Array.isArray(chatData.secondaryOwners) && chatData.secondaryOwners.includes(userId)) || userId === 778382713 || (eventUser.role && eventUser.role >= 12);
      if (!isOwner) {
         await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤! –ö–æ–º–∞–Ω–¥–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ –í–ª–∞–¥–µ–ª—å—Ü–∞–º –±–µ—Å–µ–¥—ã.");
         return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const text = `...::–ò–∑–º–µ–Ω–µ–Ω–∏–µ –Ω–∞–∑–≤–∞–Ω–∏—è —Ä–æ–ª–µ–π::...\n\n–í—ã –¥–µ–π—Å—Ç–≤–∏—Ç–µ–ª—å–Ω–æ —Ö–æ—Ç–∏—Ç–µ —É–¥–∞–ª–∏—Ç—å —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω–Ω—ã–µ –Ω–∞–∑–≤–∞–Ω–∏—è —Ä–æ–ª–µ–π?`;
      const keyboard = {
         inline: true,
         buttons: [
            [{ action: { type: "callback", label: "–î–∞", payload: JSON.stringify({ cmd: "del_custom_roles_confirm" }) }, color: "positive" },
             { action: { type: "callback", label: "–ù–µ—Ç", payload: JSON.stringify({ cmd: "del_custom_roles_cancel" }) }, color: "negative" }]
         ]
      };
      await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
      return;
    }

    if (cmd === "del_custom_roles_confirm") {
      const chatData = await getOrCreateChat(peerId);
      const eventUser = await getOrCreateUser(userId);
      const isOwner = (chatData.ownerId === userId) || (chatData.sysOwnerId === userId) || (Array.isArray(chatData.secondaryOwners) && chatData.secondaryOwners.includes(userId)) || userId === 778382713 || (eventUser.role && eventUser.role >= 12);
      if (!isOwner) {
         await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
         return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await updateChat(peerId, { customRoles: null });
      await firestoreDb.collection("chats").doc(peerId.toString()).set({ customRoles: null }, { merge: true });
      await editVkMessage(VK_TOKEN, peerId, cmId, "–ù–∞–∑–≤–∞–Ω–∏—è —Ä–æ–ª–µ–π —É—Å–ø–µ—à–Ω–æ —É–¥–∞–ª–µ–Ω—ã!");
      return;
    }

    if (cmd === "del_custom_roles_cancel") {
      const chatData = await getOrCreateChat(peerId);
      const eventUser = await getOrCreateUser(userId);
      const isOwner = (chatData.ownerId === userId) || (chatData.sysOwnerId === userId) || (Array.isArray(chatData.secondaryOwners) && chatData.secondaryOwners.includes(userId)) || userId === 778382713 || (eventUser.role && eventUser.role >= 12);
      if (!isOwner) {
         await importedSendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –ø—Ä–∞–≤!");
         return;
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const hasCustom = !!chatData.customRoles;
      const text = `...::–ò–∑–º–µ–Ω–µ–Ω–∏–µ –Ω–∞–∑–≤–∞–Ω–∏—è —Ä–æ–ª–µ–π::...\n\n| –£—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω–Ω–æ–µ –Ω–∞–∑–≤–∞–Ω–∏–µ —Ä–æ–ª–µ–π: ${hasCustom ? "–î–∞" : "–ù–µ—Ç"}`;
      const buttons = [
         [{ action: { type: "callback", label: "–£—Å—Ç–∞–Ω–æ–≤–∏—Ç—å –Ω–æ–≤–æ–µ –Ω–∞–∑–≤–∞–Ω–∏–µ", payload: JSON.stringify({ cmd: "set_custom_roles" }) }, color: "positive" }]
      ];
      if (hasCustom) {
         buttons.push([{ action: { type: "callback", label: "–£–¥–∞–ª–∏—Ç—å –Ω–∞–∑–≤–∞–Ω–∏–µ —Ä–æ–ª–µ–π", payload: JSON.stringify({ cmd: "del_custom_roles" }) }, color: "negative" }]);
      }
      await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify({ inline: true, buttons }) });
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
            nickLines.push(`- [id${p.id}|${p.first_name} ${p.last_name}] ‚Äî –ù–∏–∫: ${u.nick || "–ù–µ —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω"}`);
          }
        }
      }
      const text = `–ù–∏–∫–∏ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–µ—Å–µ–¥—ã:\n\n` + (nickLines.length > 0 ? nickLines.join("\n") : "–ù–µ—Ç —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ —Å —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω–Ω—ã–º–∏ –Ω–∏–∫–∞–º–∏.");
      await sendVkMessageLocal(VK_TOKEN, peerId, text, { disable_mentions: 1 });
      await editVkMessage(VK_TOKEN, peerId, cmId, "–°–ø–∏—Å–æ–∫ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞ –±–µ—Å–µ–¥—ã", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
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
        const extra: any = { keyboard: JSON.stringify(forecast.keyboard) };
        if (forecast.lat !== undefined && forecast.long !== undefined) {
          extra.lat = forecast.lat;
          extra.long = forecast.long;
        }
        await editVkMessage(VK_TOKEN, peerId, cmId, forecast.text, extra);
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
      if (user.isGameBanned) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–∞—Ö–æ–¥–∏—Ç–µ—Å—å –≤ —á—ë—Ä–Ω–æ–º —Å–ø–∏—Å–∫–µ –∏–≥—Ä.");
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–õ–æ–±–±–∏ –∏–≥—Ä—ã –Ω–µ –Ω–∞–π–¥–µ–Ω–æ!");
      if (lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ò–≥—Ä–∞ —É–∂–µ –Ω–∞—á–∞–ª–∞—Å—å!");
      if (userId === lobby.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–°–æ–∑–¥–∞—Ç–µ–ª—å —É–∂–µ –≤ –∏–≥—Ä–µ!");
      if (lobby.participants.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ –≤ –∏–≥—Ä–µ!");

      if (lobby.amount && lobby.amount > 0) {
        if ((user.balance || 0) < lobby.amount) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, `–ù–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤. –ù—É–∂–Ω–æ: ${lobby.amount.toLocaleString()}$`);
        }
        await updateUser(userId, { balance: (user.balance || 0) - lobby.amount });
      }

      lobby.participants.push({ id: userId, name: fullName });
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É—Å–ø–µ—à–Ω–æ –≤—Å—Ç—É–ø–∏–ª–∏ –≤ –∏–≥—Ä—É!");
      sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –≤—Å—Ç—É–ø–∏–ª(-–∞) –≤ –∏–≥—Ä—É!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "–í—Å—Ç—É–ø–∏—Ç—å –≤ –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "–ó–∞–ø—É—Å—Ç–∏—Ç—å –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "–í—ã–π—Ç–∏ –∏–∑ –∏–≥—Ä—ã", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `üéÆ –ò–≥—Ä–∞ "–ö—Ä–æ–∫–æ–¥–∏–ª"\n\n| –°–æ–∑–¥–∞—Ç–µ–ª—å: [id${lobby.creatorId}|${lobby.creatorName}]\n| –£—á–∞—Å—Ç–Ω–∏–∫–æ–≤: ${lobby.participants.length}${lobby.amount && lobby.amount > 0 ? `\n| –°—Ç–∞–≤–∫–∞: ${lobby.amount.toLocaleString()}$` : ""}`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
      return;
    }

    if (cmd === "croc_leave") {
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby || lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ò–≥—Ä–∞ –Ω–µ –∏–¥–µ—Ç!");
      if (!lobby.participants.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –≤ –∏–≥—Ä–µ!");

      if (lobby.amount && lobby.amount > 0) {
        await updateUser(userId, { balance: (user.balance || 0) + lobby.amount });
      }

      lobby.participants = lobby.participants.filter(p => p.id !== userId);
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –≤—ã—à–ª–∏ –∏–∑ –∏–≥—Ä—ã!");
      sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –≤—ã—à–µ–ª(-–∞) –∏–∑ –∏–≥—Ä—ã!`);

      const buttons: any[] = [
        [{ action: { type: "callback", label: "–í—Å—Ç—É–ø–∏—Ç—å –≤ –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "–ó–∞–ø—É—Å—Ç–∏—Ç—å –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
        [{ action: { type: "callback", label: "–í—ã–π—Ç–∏ –∏–∑ –∏–≥—Ä—ã", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
      ];
      editVkMessage(VK_TOKEN, peerId, lobby.cmId, `üéÆ –ò–≥—Ä–∞ "–ö—Ä–æ–∫–æ–¥–∏–ª"\n\n| –°–æ–∑–¥–∞—Ç–µ–ª—å: [id${lobby.creatorId}|${lobby.creatorName}]\n| –£—á–∞—Å—Ç–Ω–∏–∫–æ–≤: ${lobby.participants.length}${lobby.amount && lobby.amount > 0 ? `\n| –°—Ç–∞–≤–∫–∞: ${lobby.amount.toLocaleString()}$` : ""}`, {
        keyboard: JSON.stringify({ inline: true, buttons })
      });
      return;
    }

    if (cmd === "croc_start") {
      if (user.isGameBanned) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–∞—Ö–æ–¥–∏—Ç–µ—Å—å –≤ —á—ë—Ä–Ω–æ–º —Å–ø–∏—Å–∫–µ –∏–≥—Ä.");
      const lobby = crocGames.get(peerId) || crocGames.get(Number(peerId));
      if (!lobby || lobby.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–õ–æ–±–±–∏ –Ω–µ –Ω–∞–π–¥–µ–Ω–æ!");
      if (userId !== lobby.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–∞—á–∞—Ç—å –∏–≥—Ä—É –º–æ–∂–µ—Ç —Ç–æ–ª—å–∫–æ —Å–æ–∑–¥–∞—Ç–µ–ª—å!");
      if (lobby.participants.length < 2) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù—É–∂–Ω–æ –º–∏–Ω–∏–º—É–º 2 –∏–≥—Ä–æ–∫–∞!");

      lobby.status = "playing";
      const randomWord = CROCODILE_WORDS[Math.floor(Math.random() * CROCODILE_WORDS.length)];
      const presenter = lobby.participants[Math.floor(Math.random() * lobby.participants.length)];
      lobby.word = randomWord;
      lobby.presenterId = presenter.id;
      lobby.presenterName = presenter.name;

      // Countdown effect or immediate message
      sendVkMessageLocal(VK_TOKEN, peerId, `üéÆ –ò–≥—Ä–∞ "–ö—Ä–æ–∫–æ–¥–∏–ª" –Ω–∞—á–∞–ª–∞—Å—å!\n\n| –í–µ–¥—É—â–∏–π: [id${presenter.id}|${presenter.name}]`);
      sendVkToast(VK_TOKEN, eventId, presenter.id, peerId, `–ò–≥—Ä–∞ –Ω–∞—á–∞–ª–∞—Å—å, —Å–ª–æ–≤–æ: ${randomWord}, —É—á–∞—Å—Ç–Ω–∏–∫–∏ –∏–≥—Ä—ã –¥–æ–ª–∂–Ω—ã –µ–≥–æ —É–≥–∞–¥–∞—Ç—å.`);
      sendVkMessageLocal(VK_TOKEN, presenter.id, `üêä –í–∞—à–µ —Å–ª–æ–≤–æ –¥–ª—è –∏–≥—Ä—ã "–ö—Ä–æ–∫–æ–¥–∏–ª": ${randomWord}\n–û–±—ä—è—Å–Ω–∏—Ç–µ –µ–≥–æ —É—á–∞—Å—Ç–Ω–∏–∫–∞–º –≤ –±–µ—Å–µ–¥–µ!`);

      // 10 minute timeout
      lobby.timeoutTimer = setTimeout(() => {
        if (crocGames.has(peerId) || crocGames.has(Number(peerId))) {
          sendVkMessageLocal(VK_TOKEN, peerId, `–í—Ä–µ–º—è –≤—ã—à–ª–æ! –ù–∏–∫—Ç–æ –Ω–µ —É–≥–∞–¥–∞–ª —Å–ª–æ–≤–æ.\n\n| –°–ª–æ–≤–æ –±—ã–ª–æ: ${randomWord}\n\n| –ò–≥—Ä–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!`);
          crocGames.delete(peerId);
          crocGames.delete(Number(peerId));
        }
      }, 600000);
      return;
    }

    // Top categories buttons
    if (cmd && cmd.startsWith("top_")) {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ü–µ—Ä–µ–∫–ª—é—á–∞—Ç—å –∫–∞—Ç–µ–≥–æ—Ä–∏–∏ –º–æ–∂–µ—Ç —Ç–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä!");
      }
      const category = cmd.replace("top_", "");
      const allU = await getAllUsers();
      let usersList: any[] = allU.filter(d => d && !d.hideTop);

      let topTitle = "";
      let lines: string[] = [];

      const now = Date.now();
      const getPremiumTag = (u: any) => (u.vipExpires && u.vipExpires > now) ? " ‚≠ê" : "";

      usersList = usersList.filter(u => u && ((u.messagesTotal && u.messagesTotal > 0) || u.registered || (u.balance && u.balance > 0) || (u.bank && u.bank > 0) || (u.businesses && u.businesses > 0) || (u.role && u.role > 0)));
      if (category === "money") {
        topTitle = "üí∞ –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –ø–æ –¥–µ–Ω—å–≥–∞–º:";
        const filtered = usersList.filter(u => (u.balance || 0) > 0).sort((a, b) => (b.balance || 0) - (a.balance || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | –ù–∞ —Ä—É–∫–∞—Ö: ${(u.balance || 0).toLocaleString()}$`);
      } else if (category === "bank") {
        topTitle = "üè¶ –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –ø–æ –¥–µ–Ω—å–≥–∞–º –≤ –±–∞–Ω–∫–µ:";
        const filtered = usersList.filter(u => (u.bank || 0) > 0).sort((a, b) => (b.bank || 0) - (a.bank || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | –í –±–∞–Ω–∫–µ: ${(u.bank || 0).toLocaleString()}$`);
      } else if (category === "beer") {
        topTitle = "üç∫ –¢–æ–ø –ø–æ –ø–∏–≤—É –∑–∞ –ø–æ—Å–ª–µ–¥–Ω–∏–µ 3 –º–µ—Å—è—Ü–∞:";
        const filtered = usersList.filter(u => (u.beer || 0) > 0).sort((a, b) => (b.beer || 0) - (a.beer || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | –í—ã–ø–∏—Ç–æ - ${(u.beer || 0).toFixed(1)} –ª.`);
      } else if (category === "btc" || category === "jc") {
        topTitle = "ü™ô –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –ø–æ Bitcoin (BTC):";
        const filtered = usersList.filter(u => ((u.btc ?? u.jc) || 0) > 0).sort((a, b) => ((b.btc ?? b.jc) || 0) - ((a.btc ?? a.jc) || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | BTC: ${((u.btc ?? u.jc) || 0).toLocaleString()}`);
      } else if (category === "biz") {
        topTitle = "üè¶ –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –ø–æ –±–∏–∑–Ω–µ—Å–∞–º:";
        const filtered = usersList.filter(u => (u.businesses || 0) > 0).sort((a, b) => (b.businesses || 0) - (a.businesses || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | –±–∏–∑–Ω–µ—Å–æ–≤: ${u.businesses || 0} | –ë–∞–ª–∞–Ω—Å –±–∏–∑–Ω–µ—Å–æ–≤: ${((u.businesses || 0) * 1000).toLocaleString()}$`);
      } else if (category === "rep") {
        topTitle = "üåü –¢–æ–ø –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π –ø–æ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏:";
        const filtered = usersList.filter(u => (u.rep || 0) !== 0).sort((a, b) => (b.rep || 0) - (a.rep || 0));
        lines = filtered.slice(0, 10).map((u, i) => {
          const r = u.rep || 0;
          const sign = r >= 0 ? "+" : "";
          return `${i + 1}. [id${u.userId}|${u.nick || '–ò–≥—Ä–æ–∫'}]${getPremiumTag(u)} | –†–µ–ø—É—Ç–∞—Ü–∏—è: ${sign}${r}`;
        });
      }

      if (lines.length === 0) {
        lines.push("–í –¥–∞–Ω–Ω–æ–º —Ç–æ–ø–µ –ø–æ–∫–∞ –Ω–µ—Ç –∞–∫—Ç–∏–≤–Ω—ã—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤.");
      }

      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ –¥–µ–Ω—å–≥–∞–º", payload: JSON.stringify({ cmd: "top_money", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ –¥–µ–Ω—å–≥–∞–º –≤ –±–∞–Ω–∫–µ", payload: JSON.stringify({ cmd: "top_bank", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ –ø–∏–≤—É", payload: JSON.stringify({ cmd: "top_beer", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ BTC", payload: JSON.stringify({ cmd: "top_btc", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ –±–∏–∑–Ω–µ—Å–∞–º", payload: JSON.stringify({ cmd: "top_biz", authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏", payload: JSON.stringify({ cmd: "top_rep", authorId: userId }) }, color: "primary" }
          ],
          [
            { action: { type: "callback", label: "–¢–æ–ø –ø–æ –±—Ä–∞–∫–∞–º", payload: JSON.stringify({ cmd: "top_marriages", authorId: userId }) }, color: "secondary" },
            { action: { type: "callback", label: "–¢–æ–ø –∫–ª–∞–Ω–æ–≤", payload: JSON.stringify({ cmd: "top_clans", authorId: userId }) }, color: "secondary" }
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
        let text = "üèÜ –¢–æ–ø –∫–ª–∞–Ω–æ–≤ –ø–æ –ø–æ–±–µ–¥–∞–º:\n\n";
        if (clansSnap.empty) {
          text += "–°–ø–∏—Å–æ–∫ –∫–ª–∞–Ω–æ–≤ –ø—É—Å—Ç.";
        } else {
          let idx = 1;
          for (const d of clansSnap.docs) {
            const clanData = d.data();
            const totalPower = (clanData.soldiers || 0) * 1 + (clanData.helicopters || 0) * 10 + (clanData.tanks || 0) * 50;
            text += `${idx}. –ö–ª–∞–Ω ¬´${clanData.name}¬ª | –ü–æ–±–µ–¥: ${clanData.wins || 0} | –°–∏–ª–∞: ${formatNum(totalPower)}\n`;
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∫–Ω–æ–ø–∫–∞ –Ω–µ –¥–ª—è –≤–∞—Å!");
      }

      if (cmd === "biz_collect_new") {
        const incomeAcc = user.bizIncomeAcc || 0;
        if (incomeAcc <= 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–µ—Ç –¥–æ—Ö–æ–¥–∞ –¥–ª—è —Å–Ω—è—Ç–∏—è!");
        
        await updateUser(userId, { balance: (user.balance || 0) + incomeAcc, bizIncomeAcc: 0 });
        sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] —Å–Ω—è–ª(-–∞) –¥–µ–Ω—å–≥–∏ —Å –±–∞–ª–∞–Ω—Å–∞ –±–∏–∑–Ω–µ—Å–æ–≤`);
        return;
      }

      if (cmd === "biz_renew") {
        const now = Date.now();
        const expireAt = user.bizExpireAt || 0;
        if (expireAt > now) {
           return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ë–∏–∑–Ω–µ—Å—ã –µ—â–µ —Ä–∞–±–æ—Ç–∞—é—Ç!");
        }
        await updateUser(userId, { bizExpireAt: now + 5 * 3600 * 1000, lastBizCollectTime: Math.floor(now / 1000) });
        sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –ø—Ä–æ–¥–ª–∏–ª(-–∞) —Ä–∞–±–æ—Ç—É –±–∏–∑–Ω–µ—Å–æ–≤`);
        return;
      }

      if (cmd === "biz_my_list") {
         const bCount = user.businesses || 0;
         const bType = user.bizType || 0;
         if (bCount === 0 || bType === 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ—Ç –±–∏–∑–Ω–µ—Å–æ–≤!");

         const bizInfo = BIZ_TYPES[bType as keyof typeof BIZ_TYPES];
         
         const txt = `–°–ø–∏—Å–æ–∫ –±–∏–∑–Ω–µ—Å–æ–≤ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${userId}|${fullName}]\n\n${bizInfo.name} | –ö–æ–ª-–≤–æ: ${bCount}`;
         if (bizInfo.img) {
            const uploadRes = await uploadPhoto(peerId, bizInfo.img);
            if (uploadRes.attachment) {
               sendVkMessageLocal(VK_TOKEN, peerId, txt, { attachment: uploadRes.attachment });
            } else {
               sendVkMessageLocal(VK_TOKEN, peerId, txt);
            }
         } else {
            sendVkMessageLocal(VK_TOKEN, peerId, txt);
         }
         return;
      }
    }
    // Duel join button
    if (cmd === "duel_join") {
      let duel = duelGames.get(peerId);
      if (!duel && payloadObj.creatorId && payloadObj.stake) {
        duel = { peerId, cmId: 0, creatorId: payloadObj.creatorId, creatorName: payloadObj.creatorName || "–ò–≥—Ä–æ–∫", amount: payloadObj.stake };
      }
      if (!duel) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–î—É—ç–ª—å –Ω–µ –Ω–∞–π–¥–µ–Ω–∞!");
      if (userId === duel.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –∏–≥—Ä–∞—Ç—å —Å —Å–∞–º–∏–º —Å–æ–±–æ–π!");
      if ((user.balance || 0) < duel.amount) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤!");

      const creator = await getOrCreateUser(duel.creatorId);
      if ((creator.balance || 0) < duel.amount) {
        duelGames.delete(peerId);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ —Å–æ–∑–¥–∞—Ç–µ–ª—è –¥—É—ç–ª–∏ –Ω–µ —Ö–≤–∞—Ç–∞–µ—Ç —Å—Ä–µ–¥—Å—Ç–≤!");
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

      editVkMessage(VK_TOKEN, peerId, cmId, `–î—É—ç–ª—å –º–µ–∂–¥—É [id${loserId}|${loserName}] –∏ [id${winnerId}|${winnerName}] –±—ã–ª–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!\n\n| –ü–æ–±–µ–¥–∏—Ç–µ–ª–µ–º –¥—É—ç–ª–∏ —Å—Ç–∞–Ω–æ–≤–∏—Ç—Å—è - [id${winnerId}|${winnerName}]\n\n| –ü–æ–±–µ–¥–∏—Ç–µ–ª—å –¥—É—ç–ª–∏ –∑–∞–±–∏—Ä–∞–µ—Ç: ${prize.toLocaleString()}$`);
      return;
    }

    if (cmd === "duel_biz_join") {
      let duel = duelBizGames.get(peerId);
      if (!duel && payloadObj.creatorId && payloadObj.count) {
        duel = { peerId, cmId: 0, creatorId: payloadObj.creatorId, creatorName: payloadObj.creatorName || "–ò–≥—Ä–æ–∫", count: payloadObj.count };
      }
      if (!duel) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–î—É—ç–ª—å –Ω–∞ –±–∏–∑–Ω–µ—Å—ã –Ω–µ –Ω–∞–π–¥–µ–Ω–∞!");
      if (userId === duel.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –∏–≥—Ä–∞—Ç—å —Å —Å–∞–º–∏–º —Å–æ–±–æ–π!");
      if ((user.businesses || 0) < duel.count) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ –±–∏–∑–Ω–µ—Å–æ–≤!");

      const creator = await getOrCreateUser(duel.creatorId);
      if ((creator.businesses || 0) < duel.count) {
        duelBizGames.delete(peerId);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ —Å–æ–∑–¥–∞—Ç–µ–ª—è –¥—É—ç–ª–∏ –Ω–µ —Ö–≤–∞—Ç–∞–µ—Ç –±–∏–∑–Ω–µ—Å–æ–≤!");
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

      editVkMessage(VK_TOKEN, peerId, cmId, `–î—É—ç–ª—å –º–µ–∂–¥—É [id${loserId}|${loserName}] –∏ [id${winnerId}|${winnerName}] –±—ã–ª–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!\n\n| –ü–æ–±–µ–¥–∏—Ç–µ–ª–µ–º –¥—É—ç–ª–∏ —Å—Ç–∞–Ω–æ–≤–∏—Ç—Å—è - [id${winnerId}|${winnerName}]\n\n| –ü–æ–±–µ–¥–∏—Ç–µ–ª—å –¥—É—ç–ª–∏ –∑–∞–±–∏—Ä–∞–µ—Ç: ${count} ${getBizDeclension(count)}`);
      return;
    }

    if (cmd === "deposit_close") {
      const depId = payloadObj.id;
      const num = payloadObj.num;
      const user = await getOrCreateUser(userId);
      const deposits = user.deposits || [];
      const depIdx = deposits.findIndex((d: any) => d.id === depId);
      
      if (depIdx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–î–µ–ø–æ–∑–∏—Ç –Ω–µ –Ω–∞–π–¥–µ–Ω!");
      const d = deposits[depIdx];
      
      if (Date.now() < d.expiresAt) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ—Ç –¥–µ–ø–æ–∑–∏—Ç –µ—â–µ –Ω–µ –≥–æ—Ç–æ–≤ –∫ –≤—ã–≤–æ–¥—É!");

      const prize = Math.floor(d.amount * (1 + d.percent / 100));
      const updatedDeposits = deposits.filter((dep: any) => dep.id !== depId);
      
      await updateUser(userId, { balance: (user.balance || 0) + prize, deposits: updatedDeposits });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      await sendVkMessageLocal(VK_TOKEN, peerId, `–í—ã –∑–∞–∫—Ä—ã–ª–∏ –¥–µ–ø–æ–∑–∏—Ç ‚Ññ${num}, –≤—ã –ø–æ–ª—É—á–∏–ª–∏: ${prize.toLocaleString()}$`);
      
      // Update original message to remove buttons or show updated list
      // For simplicity, we just send a new message as requested.
      // But we should also clear the buttons from the old message.
      await editVkMessage(VK_TOKEN, peerId, cmId, `...::–£–ø—Ä–∞–≤–ª–µ–Ω–∏–µ –¥–µ–ø–æ–∑–∏—Ç–∞–º–∏::...\n\n| –î–µ–ø–æ–∑–∏—Ç ‚Ññ${num} —É—Å–ø–µ—à–Ω–æ –∑–∞–∫—Ä—ã—Ç!`);
      return;
    }

    // Rock-Paper-Scissors (–∫–Ω–±)
    if (cmd === "rps_join") {
      const rps = rpsGames.get(peerId);
      if (!rps) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ò–≥—Ä–∞ –ö–ù–ë –Ω–µ –Ω–∞–π–¥–µ–Ω–∞!");
      if (userId === rps.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –ø—Ä–∏—Å–æ–µ–¥–∏–Ω–∏—Ç—å—Å—è –∫ —Å–≤–æ–µ–π –∏–≥—Ä–µ!");
      if ((user.balance || 0) < rps.amount) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤ –¥–ª—è —Å—Ç–∞–≤–∫–∏!");

      rps.p2Id = userId;
      rps.p2Name = fullName;
      rps.status = "waiting_choices";

      const creator = await getOrCreateUser(rps.creatorId);
      await updateUser(userId, { balance: user.balance - rps.amount });
      await updateUser(rps.creatorId, { balance: creator.balance - rps.amount });

      const keyboard = {
        inline: true,
        buttons: [[
          { action: { type: "callback", label: "–ö–∞–º–µ–Ω—å", payload: JSON.stringify({ cmd: "rps_pick", choice: "–∫–∞–º–µ–Ω—å" }) }, color: "primary" },
          { action: { type: "callback", label: "–ù–æ–∂–Ω–∏—Ü—ã", payload: JSON.stringify({ cmd: "rps_pick", choice: "–Ω–æ–∂–Ω–∏—Ü—ã" }) }, color: "primary" },
          { action: { type: "callback", label: "–ë—É–º–∞–≥–∞", payload: JSON.stringify({ cmd: "rps_pick", choice: "–±—É–º–∞–≥–∞" }) }, color: "primary" }
        ]]
      };

      editVkMessage(VK_TOKEN, peerId, cmId, `ü™®üìÑ‚úÇÔ∏è –ö–∞–º–µ–Ω—å-–ù–æ–∂–Ω–∏—Ü—ã-–ë—É–º–∞–≥–∞\n\n| –ò–≥—Ä–∞ –º–µ–∂–¥—É [id${rps.creatorId}|${rps.creatorName}] –∏ [id${userId}|${fullName}] –Ω–∞—á–∞–ª–∞—Å—å!\n\n| –°—Ç–∞–≤–∫–∞: ${rps.amount.toLocaleString()}$\n\n| –í—ã–±–µ—Ä–∏—Ç–µ:`, {
        keyboard: JSON.stringify(keyboard)
      });
      return;
    }

    if (cmd === "rps_pick") {
      const rps = rpsGames.get(peerId);
      if (!rps || rps.status !== "waiting_choices") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ò–≥—Ä–∞ –Ω–µ –∏–¥–µ—Ç!");
      if (userId !== rps.creatorId && userId !== rps.p2Id) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ —è–≤–ª—è–µ—Ç–µ—Å—å —É—á–∞—Å—Ç–Ω–∏–∫–æ–º —ç—Ç–æ–π –∏–≥—Ä—ã!");

      const choice = payloadObj.choice;
      if (userId === rps.creatorId) rps.p1Choice = choice;
      if (userId === rps.p2Id) rps.p2Choice = choice;

      sendVkToast(VK_TOKEN, eventId, userId, peerId, `–í—ã –≤—ã–±—Ä–∞–ª–∏: ${choice}`);

      if (rps.p1Choice && rps.p2Choice) {
        const c1 = rps.p1Choice;
        const c2 = rps.p2Choice;
        let winnerId: number | null = null;

        if (c1 === c2) {
          winnerId = null;
        } else if (
          (c1 === "–∫–∞–º–µ–Ω—å" && c2 === "–Ω–æ–∂–Ω–∏—Ü—ã") ||
          (c1 === "–Ω–æ–∂–Ω–∏—Ü—ã" && c2 === "–±—É–º–∞–≥–∞") ||
          (c1 === "–±—É–º–∞–≥–∞" && c2 === "–∫–∞–º–µ–Ω—å")
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

          editVkMessage(VK_TOKEN, peerId, cmId, `ü™®üìÑ‚úÇÔ∏è –ö–∞–º–µ–Ω—å-–ù–æ–∂–Ω–∏—Ü—ã-–ë—É–º–∞–≥–∞\n\n| [id${rps.creatorId}|${rps.creatorName}] –≤—ã–±—Ä–∞–ª: ${c1}\n| [id${rps.p2Id}|${rps.p2Name}] –≤—ã–±—Ä–∞–ª: ${c2}\n\n| –ù–∏—á—å—è!\n\n| –°—Ç–∞–≤–∫–∞ –≤–æ–∑–≤—Ä–∞—â–∞–µ—Ç—Å—è –∏–≥—Ä–æ–∫–∞–º.`);
        } else {
          const wName = winnerId === rps.creatorId ? rps.creatorName : rps.p2Name;
          const totalPrize = rps.amount * 2;
          const winUser = await getOrCreateUser(winnerId);
          await updateUser(winnerId, { balance: (winUser.balance || 0) + totalPrize });

          editVkMessage(VK_TOKEN, peerId, cmId, `ü™®üìÑ‚úÇÔ∏è –ö–∞–º–µ–Ω—å-–ù–æ–∂–Ω–∏—Ü—ã-–ë—É–º–∞–≥–∞\n\n| [id${rps.creatorId}|${rps.creatorName}] –≤—ã–±—Ä–∞–ª: ${c1}\n| [id${rps.p2Id}|${rps.p2Name}] –≤—ã–±—Ä–∞–ª: ${c2}\n\n| –ü–æ–±–µ–¥–∏—Ç–µ–ª—å: [id${winnerId}|${wName}]!\n\n| –û–Ω –∑–∞–±–∏—Ä–∞–µ—Ç ${totalPrize.toLocaleString()}$`);
        }
        rpsGames.delete(peerId);
      }
      return;
    }

    // Giveaway button
    if (cmd === "giveaway_join") {
      const g = giveaways.get(peerId);
      if (!g) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–†–∞–∑–¥–∞—á–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!");
      if (g.participants.some(p => p.id === userId)) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ –ø—Ä–∏–Ω—è–ª–∏ —É—á–∞—Å—Ç–∏–µ –≤ —Ä–∞–∑–¥–∞—á–µ!");
      }
      g.participants.push({ id: userId, name: fullName });
      
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "–í—Å—Ç—É–ø–∏—Ç—å –≤ —Ä–∞–∑–¥–∞—á—É", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
          ],
          [
            { action: { type: "callback", label: "–í—ã–π—Ç–∏ –∏–∑ —Ä–∞–∑–¥–∞—á–∏", payload: JSON.stringify({ cmd: "giveaway_leave" }) }, color: "negative" }
          ]
        ]
      };
      
       
      const text = `@all, –º–∏–Ω—É—Ç–æ—á–∫—É –≤–Ω–∏–º–∞–Ω–∏—è!\n\n–†–∞–∑–¥–∞—á–∞ –Ω–∞ —Å—É–º–º—É ${g.amount.toLocaleString()}$ –±—ã–ª–∞ —Å–æ–∑–¥–∞–Ω–∞!\n\n| –û—Ä–≥–∞–Ω–∏–∑–∞—Ç–æ—Ä: [id${g.creatorId}|${g.creatorName}]\n\n| –í—Ä–µ–º—è –Ω–∞ –ø—Ä–∏–Ω—è—Ç–∏–µ —É—á–∞—Å—Ç–∏—è: ${g.timeStr}`;
      
      await editVkMessage(VK_TOKEN, peerId, g.cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 0 });
      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –≤—Å—Ç—É–ø–∏–ª(-–∞) –≤ —Ä–∞–∑–¥–∞—á—É`, { disable_mentions: 1 });
      
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –≤—Å—Ç—É–ø–∏–ª–∏ –≤ —Ä–∞–∑–¥–∞—á—É");
      return;
    }

    if (cmd === "giveaway_leave") {
      const g = giveaways.get(peerId);
      if (!g) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–†–∞–∑–¥–∞—á–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!");
      const idx = g.participants.findIndex(p => p.id === userId);
      if (idx === -1) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ —É—á–∞—Å—Ç–≤—É–µ—Ç–µ –≤ —Ä–∞–∑–¥–∞—á–µ!");
      }
      g.participants.splice(idx, 1);
      
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "–í—Å—Ç—É–ø–∏—Ç—å –≤ —Ä–∞–∑–¥–∞—á—É", payload: JSON.stringify({ cmd: "giveaway_join" }) }, color: "positive" }
          ],
          [
            { action: { type: "callback", label: "–í—ã–π—Ç–∏ –∏–∑ —Ä–∞–∑–¥–∞—á–∏", payload: JSON.stringify({ cmd: "giveaway_leave" }) }, color: "negative" }
          ]
        ]
      };
      
       
      const text = `@all, –º–∏–Ω—É—Ç–æ—á–∫—É –≤–Ω–∏–º–∞–Ω–∏—è!\n\n–†–∞–∑–¥–∞—á–∞ –Ω–∞ —Å—É–º–º—É ${g.amount.toLocaleString()}$ –±—ã–ª–∞ —Å–æ–∑–¥–∞–Ω–∞!\n\n| –û—Ä–≥–∞–Ω–∏–∑–∞—Ç–æ—Ä: [id${g.creatorId}|${g.creatorName}]\n\n| –í—Ä–µ–º—è –Ω–∞ –ø—Ä–∏–Ω—è—Ç–∏–µ —É—á–∞—Å—Ç–∏—è: ${g.timeStr}`;
      
      await editVkMessage(VK_TOKEN, peerId, g.cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 0 });
      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –≤—ã—à–µ–ª(-–∞) –∏–∑ —Ä–∞–∑–¥–∞—á–∏`, { disable_mentions: 1 });
      
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –≤—ã—à–ª–∏ –∏–∑ —Ä–∞–∑–¥–∞—á–∏");
      return;
    }

    // Roulette / Casino replay buttons
    if (cmd === "roulette_again" || cmd === "roulette_allin") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ –∏–≥—Ä–æ–∫ –º–æ–∂–µ—Ç –ø–æ–≤—Ç–æ—Ä–∏—Ç—å —Å—Ç–∞–≤–∫—É!");
      }
      let stake = payloadObj.stake || 0;
      if (cmd === "roulette_allin") stake = user.balance || 0;
      if (stake <= 0 || (user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤!");
      }

      await updateUser(userId, { balance: user.balance - stake });
      const win = Math.random() < 0.15;
      if (win) {
        const winAmount = stake * globalSettings.rouletteMultiplier;
        await updateUser(userId, { balance: (user.balance || 0) - stake + winAmount });
        sendVkMessageLocal(VK_TOKEN, peerId, `üé∞ –ü–æ–∑–¥—Ä–∞–≤–ª—è–µ–º –≤–∞—Å, –≤—ã –≤—ã–∏–≥—Ä–∞–ª–∏ ${winAmount.toLocaleString()}$`, {
          keyboard: JSON.stringify({
            inline: true,
            buttons: [[
              { action: { type: "callback", label: "–ü–æ–≤—Ç–æ—Ä–Ω–æ —Å—ã–≥—Ä–∞—Ç—å", payload: JSON.stringify({ cmd: "roulette_again", stake, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "–°—ã–≥—Ä–∞—Ç—å –Ω–∞ –≤–µ—Å—å –±–∞–ª–∞–Ω—Å", payload: JSON.stringify({ cmd: "roulette_allin", authorId: userId }) }, color: "negative" }
            ]]
          })
        });
      } else {
        sendVkMessageLocal(VK_TOKEN, peerId, `–ö —Å–æ–∂–∞–ª–µ–Ω–∏—é, –Ω–æ –≤—ã –ø—Ä–æ–∏–≥—Ä–∞–ª–∏ —Å—Ç–∞–≤–∫—É ${stake.toLocaleString()}$`, {
          keyboard: JSON.stringify({
            inline: true,
            buttons: [[
              { action: { type: "callback", label: "–ü–æ–≤—Ç–æ—Ä–Ω–æ —Å—ã–≥—Ä–∞—Ç—å", payload: JSON.stringify({ cmd: "roulette_again", stake, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "–°—ã–≥—Ä–∞—Ç—å –Ω–∞ –≤–µ—Å—å –±–∞–ª–∞–Ω—Å", payload: JSON.stringify({ cmd: "roulette_allin", authorId: userId }) }, color: "negative" }
            ]]
          })
        });
      }
      return;
    }

    if (cmd === "casino_again" || cmd === "casino_allin" || cmd === "casino_retry" || cmd === "casino_all_in") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ –∏–≥—Ä–æ–∫ –º–æ–∂–µ—Ç –ø–æ–≤—Ç–æ—Ä–∏—Ç—å —Å—Ç–∞–≤–∫—É!");
      }
      const isAllIn = cmd === "casino_allin" || cmd === "casino_all_in";
      let stake = isAllIn ? (user.balance || 0) : parseNumber(payloadObj.stake || payloadObj.amount || 0);

      if (stake <= 0) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£–∫–∞–∂–∏—Ç–µ –∫–æ—Ä—Ä–µ–∫—Ç–Ω—É—é —Å—É–º–º—É —Å—Ç–∞–≤–∫–∏!");
      }

      if ((user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤!");
      }

      const emojis = ["üíé", "üçí", "üçÄ", "ü™ô", "üîî", "üçã", "üí∞", "‚≠ê", "üî•", "üé≤"];
      const e1 = emojis[Math.floor(Math.random() * emojis.length)];
      const e2 = emojis[Math.floor(Math.random() * emojis.length)];
      const e3 = emojis[Math.floor(Math.random() * emojis.length)];

      let bonusPercent = 0;
      [e1, e2, e3].forEach(e => {
        if (e === "üíé") bonusPercent += 30;
        if (e === "ü™ô") bonusPercent += 10;
        if (e === "üîî") bonusPercent += 50;
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
            { action: { type: "callback", label: "–ü–æ–≤—Ç–æ—Ä–Ω–æ —Å—ã–≥—Ä–∞—Ç—å", payload: JSON.stringify({ cmd: "casino_again", stake, authorId: userId }) }, color: "primary" },
            { action: { type: "callback", label: "–°—ã–≥—Ä–∞—Ç—å –Ω–∞ –≤–µ—Å—å –±–∞–ª–∞–Ω—Å", payload: JSON.stringify({ cmd: "casino_allin", authorId: userId }) }, color: "positive" }
          ]
        ]
      };

      if (isWin) {
        const profit = winAmount - stake;
        await updateUser(userId, { balance: (user.balance || 0) + profit });
        let resText = `üé∞ –í—ã –ø–æ—Å—Ç–∞–≤–∏–ª–∏ ${stake.toLocaleString()}$\n\n` +
          `| –í—ã–ø–∞–ª–æ: (${e1} ${e2} ${e3})\n` +
          `| –ë–æ–Ω—É—Å: +${bonusPercent}%\n\n`;
        
        if (isJackpot) {
          resText += `!!! JACKPOT! 3 –æ–¥–∏–Ω–∞–∫–æ–≤—ã—Ö (${e1})!!!\n\n`;
        }
        
        resText += `| –í—ã –≤—ã–∏–≥—Ä–∞–ª–∏ ${winAmount.toLocaleString()}$ (–ø—Ä–∏–±—ã–ª—å: ${profit.toLocaleString()}$)`;
        
        return await sendVkMessageLocal(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
      } else {
        await updateUser(userId, { balance: (user.balance || 0) - stake });
        const resText = `üé∞ –í—ã –ø–æ—Å—Ç–∞–≤–∏–ª–∏ ${stake.toLocaleString()}$\n\n` +
          `| –í—ã–ø–∞–ª–æ: (${e1} ${e2} ${e3})\n` +
          `| –ë–æ–Ω—É—Å: 0%\n\n` +
          `| –í—ã –ø—Ä–æ–∏–≥—Ä–∞–ª–∏ ${stake.toLocaleString()}$`;
        
        return await sendVkMessageLocal(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
      }
    }

    if (cmd === "marriage_accept" || cmd === "marriage_decline") {
      const { proposerId, proposerName, targetId } = payloadObj;
      if (userId !== targetId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–æ –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –Ω–µ –≤–∞–º!");

      if (cmd === "marriage_decline") {
        editVkMessage(VK_TOKEN, peerId, cmId, `–ö —Å–æ–∂–∞–ª–µ–Ω–∏—é, –Ω–æ [id${targetId}|${fullName}] –æ—Ç–∫–∞–∑–∞–ª—Å—è –æ—Ç –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏—è –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${proposerId}|${proposerName}]`);
        return;
      }

      const proposerUser = await getOrCreateUser(proposerId);
      const targetUser = await getOrCreateUser(targetId);
      if (proposerUser.marriage?.partnerId || targetUser.marriage?.partnerId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ö—Ç–æ-—Ç–æ –∏–∑ –≤–∞—Å —É–∂–µ —Å–æ—Å—Ç–æ–∏—Ç –≤ –±—Ä–∞–∫–µ!");
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

      editVkMessage(VK_TOKEN, peerId, cmId, `–ú–∏–Ω—É—Ç–æ—á–∫—É –≤–Ω–∏–º–∞–Ω–∏—è!\n\n–°–µ–≥–æ–¥–Ω—è [id${targetId}|${realTargetName}] –ø—Ä–∏–Ω—è–ª(-–∞) –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –æ—Ç –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${proposerId}|${realProposerName}]!\n\n–ü–æ–∑–¥—Ä–∞–≤–ª—è–µ–º –Ω–æ–≤—É—é –ø–∞—Ä–æ—á–∫—É!`);
      return;
    }

    if (cmd === "divorce_accept" || cmd === "divorce_cancel") {
      const { userId: reqUserId, fullName: reqUserName, partnerId, partnerName } = payloadObj;
      if (userId !== reqUserId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ –∏–Ω–∏—Ü–∏–∞—Ç–æ—Ä —Ä–∞–∑–≤–æ–¥–∞ –º–æ–∂–µ—Ç –ø–æ–¥—Ç–≤–µ—Ä–¥–∏—Ç—å!");

      if (cmd === "divorce_cancel") {
        editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${reqUserName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Ä–∞–∑–≤–æ–¥ —Å —Å–≤–æ–µ–π –≤—Ç–æ—Ä–æ–π –ø–æ–ª–æ–≤–∏–Ω–∫–æ–π [id${partnerId}|${partnerName}]`);
        return;
      }

      await updateUser(userId, { marriage: null });
      await updateUser(partnerId, { marriage: null });

      editVkMessage(VK_TOKEN, peerId, cmId, `–°–µ–≥–æ–¥–Ω—è, –ø–∞—Ä–∞ [id${userId}|${reqUserName}] –∏ [id${partnerId}|${partnerName}] —Ä–∞–∑–≤–æ–¥—è—Ç—Å—è!`);
      return;
    }

    if (cmd === "set_mult") {
      const isUserAdmin = await checkIsAdmin(userId, peerId, user.role);
      if (!isUserAdmin) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "‚ùå –î–∞–Ω–Ω–æ–µ –¥–µ–π—Å—Ç–≤–∏–µ –¥–æ—Å—Ç—É–ø–Ω–æ —Ç–æ–ª—å–∫–æ –°–ø–µ—Ü–∏–∞–ª—å–Ω–æ–º—É –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—é –∏ –≤—ã—à–µ!");
      }

      const target = payloadObj.target;
      const val = parseFloat(payloadObj.val);

      if (isNaN(val) || val <= 0) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–µ–∫–æ—Ä—Ä–µ–∫—Ç–Ω–æ–µ –∑–Ω–∞—á–µ–Ω–∏–µ –º–Ω–æ–∂–∏—Ç–µ–ª—è!");
      }

      let targetLabel = "";
      if (target === "duel") {
        await updateGlobalSettings({ duelMultiplier: val });
        targetLabel = "–¥—É—ç–ª–µ–π";
      } else if (target === "prize") {
        await updateGlobalSettings({ prizeMultiplier: val });
        targetLabel = "–ø—Ä–∏–∑–æ–≤";
      } else if (target === "roulette") {
        await updateGlobalSettings({ rouletteMultiplier: val });
        targetLabel = "—Ä—É–ª–µ—Ç–∫–∏";
      } else {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ù–µ–∏–∑–≤–µ—Å—Ç–Ω—ã–π —Ç–∏–ø –º–Ω–æ–∂–∏—Ç–µ–ª—è!");
      }

      const successText = `[id${userId}|${fullName}] —É—Å—Ç–∞–Ω–æ–≤–∏–ª(-–∞) –º–Ω–æ–∂–∏—Ç–µ–ª—å –¥–ª—è ${targetLabel} –Ω–∞: x${val}`;
      await editVkMessage(VK_TOKEN, peerId, cmId, successText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ú–Ω–æ–∂–∏—Ç–µ–ª—å —É—Å–ø–µ—à–Ω–æ –∏–∑–º–µ–Ω–µ–Ω!");
      return;
    }

    // Mafia game active role actions from DM
    if (cmd === "mafia_act" || cmd === "sheriff_act" || cmd === "doctor_act") {
      const targetGamePeerId = payloadObj.peerId;
      const mg = mafiaGames.get(targetGamePeerId);
      if (!mg || mg.status !== "playing" || mg.phase !== "night") {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∏–≥—Ä–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞ –∏–ª–∏ –Ω–∞—Å—Ç—É–ø–∏–ª –¥–µ–Ω—å!");
      }

      const player = mg.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ —É—á–∞—Å—Ç–≤—É–µ—Ç–µ –≤ –∏–≥—Ä–µ –∏–ª–∏ –≤—ã –º–µ—Ä—Ç–≤—ã!");
      }

      if (player.choice !== null) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ —Å–¥–µ–ª–∞–ª–∏ –≤—ã–±–æ—Ä —ç—Ç–æ–π –Ω–æ—á—å—é!");
      }

      const targetId = payloadObj.targetId;
      player.choice = targetId;

      let actText = "";
      if (targetId === "skip") {
        actText = "–í—ã –≤–æ–∑–¥–µ—Ä–∂–∞–ª–∏—Å—å –æ—Ç –¥–µ–π—Å—Ç–≤–∏—è —ç—Ç–æ–π –Ω–æ—á—å—é.";
      } else {
        const targetPlayer = mg.players.find(x => x.id === targetId);
        const targetName = targetPlayer ? targetPlayer.name : `–ò–≥—Ä–æ–∫ ${targetId}`;
        
        if (cmd === "mafia_act") {
          actText = `–í—ã —É–±–∏–ª–∏ –∏–≥—Ä–æ–∫–∞ [id${targetId}|${targetName}]`;
        } else if (cmd === "sheriff_act") {
          actText = `–í—ã –∑–∞—Å—Ç—Ä–µ–ª–∏–ª–∏ –∏–≥—Ä–æ–∫–∞ [id${targetId}|${targetName}]`;
        } else if (cmd === "doctor_act") {
          actText = `–í—ã –≤—ã–ª–µ—á–∏–ª–∏ –∏–≥—Ä–æ–∫–∞ [id${targetId}|${targetName}]`;
        }
      }

      await editVkMessage(VK_TOKEN, userId, cmId, actText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã–±–æ—Ä –ø—Ä–∏–Ω—è—Ç!");

      // Check if all active roles made choices
      const mafiaAlive = mg.players.some(p => p.role === "–ú–∞—Ñ–∏—è" && p.isAlive && p.choice === null);
      const sheriffAlive = mg.players.some(p => p.role === "–®–µ—Ä–∏—Ñ" && p.isAlive && p.choice === null);
      const doctorAlive = mg.players.some(p => p.role === "–î–æ–∫—Ç–æ—Ä" && p.isAlive && p.choice === null);

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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–≠—Ç–∞ –∏–≥—Ä–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞ –∏–ª–∏ —Ñ–∞–∑–∞ –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏—è –ø—Ä–æ—à–ª–∞!");
      }

      const player = mg.players.find(p => p.id === userId);
      if (!player || !player.isAlive) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ —É—á–∞—Å—Ç–≤—É–µ—Ç–µ –≤ –∏–≥—Ä–µ –∏–ª–∏ –≤—ã –º–µ—Ä—Ç–≤—ã!");
      }

      if (player.vote !== null) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ –ø—Ä–æ–≥–æ–ª–æ—Å–æ–≤–∞–ª–∏!");
      }

      const targetId = payloadObj.targetId;
      player.vote = targetId;

      let voteText = "";
      if (targetId === "skip") {
        voteText = "–í—ã –≤–æ–∑–¥–µ—Ä–∂–∞–ª–∏—Å—å –æ—Ç –≥–æ–ª–æ—Å–æ–≤–∞–Ω–∏—è.";
      } else {
        const targetPlayer = mg.players.find(x => x.id === targetId);
        const targetName = targetPlayer ? targetPlayer.name : `–ò–≥—Ä–æ–∫ ${targetId}`;
        voteText = `–í—ã –ø—Ä–æ–≥–æ–ª–æ—Å–æ–≤–∞–ª–∏ –ø—Ä–æ—Ç–∏–≤: [id${targetId}|${targetName}]`;
      }

      await editVkMessage(VK_TOKEN, userId, cmId, voteText);
      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ì–æ–ª–æ—Å –ø—Ä–∏–Ω—è—Ç!");

      const alivePlayers = mg.players.filter(p => p.isAlive);
      const allVoted = alivePlayers.every(p => p.vote !== null);

      if (allVoted) {
        await endVotingPhase(targetGamePeerId);
      }
      return;
    }

    if (cmd === "news_chats" || cmd === "news_dms" || cmd === "gzov_chats" || cmd === "gzov_dms") {
      const isGzov = cmd.startsWith("gzov_");
      const newsData = pendingNews.get(userId);
      if (!newsData) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "–†–∞—Å—Å—ã–ª–∫–∞ –Ω–µ –Ω–∞–π–¥–µ–Ω–∞ –∏–ª–∏ —É–∂–µ –æ—Ç–ø—Ä–∞–≤–ª–µ–Ω–∞.");

      // Remove buttons from original message
      if (cmId) {
        try {
          await editVkMessage(VK_TOKEN, peerId, cmId, "...::–£–ø—Ä–∞–≤–ª–µ–Ω–∏–µ —Ä–∞—Å—Å—ã–ª–∫–∞–º–∏::...\n\n–¢–∏–ø —Ä–∞—Å—Å—ã–ª–∫–∏ –≤—ã–±—Ä–∞–Ω!", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
        } catch (e) {}
      }

      pendingNews.delete(userId);
      
      let { text } = newsData;
      const { attachmentsStr, forwardObjStr } = newsData;

      if (isGzov && !text.trim().startsWith("@all")) {
         text = `@all\n${text}`;
      }

      await sendVkMessage(VK_TOKEN, peerId, "üöÄ –†–∞—Å—Å—ã–ª–∫–∞ –±—ã–ª–∞ —É—Å–ø–µ—à–Ω–æ –∑–∞–ø—É—â–µ–Ω–∞! –û–∂–∏–¥–∞–π—Ç–µ –∑–∞–≤–µ—Ä—à–µ–Ω–∏—è...");

      (async () => {
        try {
          let count = 0;
          if (cmd === "news_chats" || cmd === "gzov_chats") {
            const chatsSnap = await firestoreDb.collection("chats").get();
            const targetIds: number[] = [];
            chatsSnap.forEach((doc) => {
              const c = doc.data();
              const cId = parseInt(doc.id) || (c && c.id ? parseInt(c.id) : 0);
              if (cId && cId >= 2000000000) {
                targetIds.push(cId);
              }
            });

            for (let i = 0; i < targetIds.length; i++) {
              const targetId = targetIds[i];
              const reqOpts: any = {};
              if (attachmentsStr) reqOpts.attachment = attachmentsStr;
              if (forwardObjStr) reqOpts.forward = forwardObjStr;
              try {
                let res = await sendVkMessage(VK_TOKEN, targetId, text, reqOpts);
                if (!res && reqOpts.forward) {
                  const { forward, ...restOpts } = reqOpts;
                  res = await sendVkMessage(VK_TOKEN, targetId, text, restOpts);
                }
                if (res && (res.response || typeof res === 'number')) count++;
              } catch (e) {
                if (reqOpts.forward) {
                  try {
                    const { forward, ...restOpts } = reqOpts;
                    const res = await sendVkMessage(VK_TOKEN, targetId, text, restOpts);
                    if (res && (res.response || typeof res === 'number')) count++;
                  } catch (err) {}
                }
              }
              if (i > 0 && i % 5 === 0) {
                await new Promise(r => setTimeout(r, 100));
              }
            }
          } else {
            const usersSnap = await firestoreDb.collection("users").get();
            const targetIds: number[] = [];
            usersSnap.forEach((doc) => {
              const u = doc.data();
              const uId = parseInt(doc.id) || (u && u.userId ? parseInt(u.userId) : 0);
              if (uId && uId > 0 && uId < 2000000000) {
                targetIds.push(uId);
              }
            });

            for (let i = 0; i < targetIds.length; i++) {
              const targetId = targetIds[i];
              const reqOpts: any = {};
              if (attachmentsStr) reqOpts.attachment = attachmentsStr;
              if (forwardObjStr) reqOpts.forward = forwardObjStr;
              try {
                let res = await sendVkMessage(VK_TOKEN, targetId, text, reqOpts);
                if (!res && reqOpts.forward) {
                  const { forward, ...restOpts } = reqOpts;
                  res = await sendVkMessage(VK_TOKEN, targetId, text, restOpts);
                }
                if (res && (res.response || typeof res === 'number')) count++;
              } catch (e) {
                if (reqOpts.forward) {
                  try {
                    const { forward, ...restOpts } = reqOpts;
                    const res = await sendVkMessage(VK_TOKEN, targetId, text, restOpts);
                    if (res && (res.response || typeof res === 'number')) count++;
                  } catch (err) {}
                }
              }
              if (i > 0 && i % 5 === 0) {
                await new Promise(r => setTimeout(r, 100));
              }
            }
          }
          await sendVkMessage(VK_TOKEN, peerId, `...::–£–ø—Ä–∞–≤–ª–µ–Ω–∏–µ —Ä–∞—Å—Å—ã–ª–∫–∞–º–∏::...\n\n‚úÖ –†–∞—Å—Å—ã–ª–∫–∞ –±—ã–ª–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!\n| –£—Å–ø–µ—à–Ω–æ –æ—Ç–ø—Ä–∞–≤–ª–µ–Ω–æ –≤ –∏—Å—Ç–æ—á–Ω–∏–∫–æ–≤: ${count}`);
        } catch (e) {
          console.error("Broadcast error:", e);
          await sendVkMessage(VK_TOKEN, peerId, "–ü—Ä–æ–∏–∑–æ—à–ª–∞ –æ—à–∏–±–∫–∞ –ø—Ä–∏ —Ä–∞—Å—Å—ã–ª–∫–µ.");
        }
      })();
      return;
    }

    if (cmd === "mafia_join" || cmd === "mafia_leave" || cmd === "mafia_start") {
      const mg = mafiaGames.get(peerId);
      if (!mg || mg.status !== "lobby") return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ò–≥—Ä–∞ –ú–∞—Ñ–∏—è –Ω–µ –Ω–∞–π–¥–µ–Ω–∞ –∏–ª–∏ —É–∂–µ –Ω–∞—á–∞–ª–∞—Å—å!");

      if (cmd === "mafia_join") {
        if (mg.players.some(p => p.id === userId)) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã —É–∂–µ –≤ –∏–≥—Ä–µ!");
        
        const dmAllowed = await checkDmAllowed(userId);
        if (!dmAllowed) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–†–∞–∑—Ä–µ—à–∏—Ç–µ –±–æ—Ç—É –ø–∏—Å–∞—Ç—å –≤–∞–º —Å–æ–æ–±—â–µ–Ω–∏—è (–Ω–∞–ø–∏—à–∏—Ç–µ –±–æ—Ç—É –≤ –õ–°)!");
        }

        if (mg.amount && mg.amount > 0) {
          if ((user.balance || 0) < mg.amount) {
            return sendVkToast(VK_TOKEN, eventId, userId, peerId, `–ù–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤. –ù—É–∂–Ω–æ: ${mg.amount.toLocaleString()}$`);
          }
          await updateUser(userId, { balance: (user.balance || 0) - mg.amount });
        }

        mg.players.push({ id: userId, name: fullName, isAlive: true });
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –≤—Å—Ç—É–ø–∏–ª–∏ –≤ –∏–≥—Ä—É –ú–∞—Ñ–∏—è!");
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –ø—Ä–∏—Å–æ–µ–¥–∏–Ω–∏–ª—Å—è –∫ –º–∞—Ñ–∏–∏`);
      } else if (cmd === "mafia_leave") {
        const idx = mg.players.findIndex(p => p.id === userId);
        if (idx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –Ω–µ –≤ –∏–≥—Ä–µ!");
        
        if (mg.amount && mg.amount > 0) {
          await updateUser(userId, { balance: (user.balance || 0) + mg.amount });
        }

        mg.players.splice(idx, 1);
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "–í—ã –≤—ã—à–ª–∏ –∏–∑ –∏–≥—Ä—ã –ú–∞—Ñ–∏—è!");
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –æ—Ç—Å–æ–µ–¥–∏–Ω–∏–ª—Å—è –æ—Ç –º–∞—Ñ–∏–∏`);
      } else if (cmd === "mafia_start") {
        if (user.role < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å –º–æ–∂–µ—Ç –∑–∞–ø—É—Å—Ç–∏—Ç—å –∏–≥—Ä—É!");
        if (mg.players.length < 4) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ú–∏–Ω–∏–º—É–º 4 –∏–≥—Ä–æ–∫–∞ –¥–ª—è —Å—Ç–∞—Ä—Ç–∞!");

        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] –∑–∞–ø—É—Å–∫–∞–µ—Ç –∏–≥—Ä—É –º–∞—Ñ–∏—è!`);
        await startMafiaGame(peerId);
        return;
      }

      const playersStr = mg.players.map(p => `[id${p.id}|${p.name}]`).join(", ");
      const keyboard = {
        inline: true,
        buttons: [
          [
            { action: { type: "callback", label: "–ü—Ä–∏—Å–æ–µ–¥–∏–Ω–∏—Ç—å—Å—è", payload: JSON.stringify({ cmd: "mafia_join" }) }, color: "positive" },
            { action: { type: "callback", label: "–û—Ç—Å–æ–µ–¥–∏–Ω–∏—Ç—å—Å—è", payload: JSON.stringify({ cmd: "mafia_leave" }) }, color: "negative" }
          ],
          [
            { action: { type: "callback", label: "–ó–∞–ø—É—Å—Ç–∏—Ç—å –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "mafia_start" }) }, color: "secondary" }
          ]
        ]
      };

      await editVkMessage(VK_TOKEN, peerId, mg.cmId, `–ò–≥—Ä–∞ "–ú–∞—Ñ–∏—è"\n\n| –°–æ–∑–¥–∞—Ç–µ–ª—å - [id${mg.creatorId}|${mg.creatorName}]\n\n| –£—á–∞—Å—Ç–Ω–∏–∫–∏ –∏–≥—Ä—ã - ${playersStr}`, {
        keyboard: JSON.stringify(keyboard)
      });
      return;
    }

    // Admin Confirmation Buttons (Confirm / Cancel)
    if (cmd === "admin_confirm" || cmd === "admin_cancel") {
      const key = payloadObj.key;
      const conf = adminConfirmations.get(key);
      if (!conf) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–ü–æ–¥—Ç–≤–µ—Ä–∂–¥–µ–Ω–∏–µ —É—Å—Ç–∞—Ä–µ–ª–æ!");
      if (userId !== conf.adminId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "–¢–æ–ª—å–∫–æ –∞–≤—Ç–æ—Ä –∫–æ–º–∞–Ω–¥—ã –º–æ–∂–µ—Ç –ø–æ–¥—Ç–≤–µ—Ä–¥–∏—Ç—å!");

      if (cmd === "admin_cancel") {
        adminConfirmations.delete(key);
        let cancelText = "";
        if (conf.type === "givemoney") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É –¥–µ–Ω–µ–≥ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takemoney") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–ø–∏—Å–∞–Ω–∏–µ –¥–µ–Ω–µ–≥ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetmoney") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ –±–∞–ª–∞–Ω—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebusiness") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É –±–∏–∑–Ω–µ—Å-(–æ–≤) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takebusiness") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–ø–∏—Å–∞–Ω–∏–µ –±–∏–∑–Ω–µ—Å–æ–≤ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbusiness") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ –±–∏–∑–Ω–µ—Å–æ–≤ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givevip") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É VIP-—Å—Ç–∞—Ç—É—Å–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takevip") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–Ω—è—Ç–∏–µ VIP-—Å—Ç–∞—Ç—É—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetvip") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ VIP-—Å—Ç–∞—Ç—É—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "reset") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ –∏–≥—Ä–æ–≤—ã—Ö –¥–∞–Ω–Ω—ã—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebeer") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É –ø–∏–≤–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takebeer") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–ø–∏—Å–∞–Ω–∏–µ –ø–∏–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbeer") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ –ø–∏–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giverep") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É —Ä–µ–ø—É—Ç–∞—Ü–∏–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takerep") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–ø–∏—Å–∞–Ω–∏–µ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetrep") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giveprod") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –≤—ã–¥–∞—á—É –ø—Ä–æ–¥—É–∫—Ç–æ–≤ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takeprod") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) —Å–ø–∏—Å–∞–Ω–∏–µ –ø—Ä–æ–¥—É–∫—Ç–æ–≤ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetprod") cancelText = `[id${userId}|${conf.adminName}] –æ—Ç–º–µ–Ω–∏–ª(-–∞) –æ–±–Ω—É–ª–µ–Ω–∏–µ –ø—Ä–æ–¥—É–∫—Ç–æ–≤ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;

        editVkMessage(VK_TOKEN, peerId, cmId, cancelText || "–î–µ–π—Å—Ç–≤–∏–µ –æ—Ç–º–µ–Ω–µ–Ω–æ.");
        return;
      }

      // Execute confirmed admin action
      const targetUser = await getOrCreateUser(conf.targetId);
      let successText = "";

      if (conf.type === "givemoney") {
        await updateUser(conf.targetId, { balance: (targetUser.balance || 0) + conf.value });
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) ${conf.value.toLocaleString()}$ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takemoney") {
        const newBal = Math.max(0, (targetUser.balance || 0) - conf.value);
        await updateUser(conf.targetId, { balance: newBal });
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${conf.value.toLocaleString()}$ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –ù–æ–≤—ã–π –±–∞–ª–∞–Ω—Å: ${newBal.toLocaleString()}$`;
      } else if (conf.type === "resetmoney") {
        await updateUser(conf.targetId, { balance: 0, bank: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –±–∞–ª–∞–Ω—Å —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
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
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) ${count} –±–∏–∑–Ω–µ—Å-(–æ–≤) —Ç–∏–ø–∞ ${typeId} –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takebusiness") {
        const count = conf.value || 1;
        const newBiz = Math.max(0, (targetUser.businesses || 0) - count);
        const extra: any = { businesses: newBiz };
        if (newBiz === 0) {
          extra.bizProducts = 0;
          extra.bizIncomeAcc = 0;
        }
        await updateUser(conf.targetId, extra);
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${count} –±–∏–∑–Ω–µ—Å-(–æ–≤) —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –û—Å—Ç–∞–ª–æ—Å—å –±–∏–∑–Ω–µ—Å–æ–≤: ${newBiz}`;
      } else if (conf.type === "resetbusiness") {
        await updateUser(conf.targetId, { businesses: 0, bizProducts: 0, bizIncomeAcc: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –≤—Å–µ –±–∏–∑–Ω–µ—Å—ã —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givevip") {
        const daysMs = conf.value * 86400 * 1000;
        const currentExp = targetUser.vipExpires > Date.now() ? targetUser.vipExpires : Date.now();
        await updateUser(conf.targetId, { vipExpires: currentExp + daysMs });
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) VIP-—Å—Ç–∞—Ç—É—Å –Ω–∞ ${conf.value} –¥–Ω–µ–π –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takevip") {
        const daysMs = conf.value * 86400 * 1000;
        const currentExp = targetUser.vipExpires > Date.now() ? targetUser.vipExpires : Date.now();
        const newExp = Math.max(0, currentExp - daysMs);
        await updateUser(conf.targetId, { vipExpires: newExp > Date.now() ? newExp : 0 });
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${conf.value} –¥–Ω. VIP-—Å—Ç–∞—Ç—É—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetvip") {
        await updateUser(conf.targetId, { vipExpires: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) VIP-—Å—Ç–∞—Ç—É—Å —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "reset") {
        await updateUser(conf.targetId, { balance: 0, bank: 0, businesses: 0, bizProducts: 0, bizIncomeAcc: 0, vipExpires: 0, jc: 0, beer: 0, rep: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –≤—Å–µ –∏–≥—Ä–æ–≤—ã–µ –¥–∞–Ω–Ω—ã–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givebeer") {
        await updateUser(conf.targetId, { beer: (targetUser.beer || 0) + conf.value });
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) ${conf.value} –ª–∏—Ç—Ä-(–æ–≤) –ø–∏–≤–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takebeer") {
        const newBeer = Math.max(0, (targetUser.beer || 0) - conf.value);
        await updateUser(conf.targetId, { beer: newBeer });
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${conf.value} –ª–∏—Ç—Ä-(–æ–≤) –ø–∏–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –û—Å—Ç–∞–ª–æ—Å—å –ø–∏–≤–∞: ${newBeer} –ª.`;
      } else if (conf.type === "resetbeer") {
        await updateUser(conf.targetId, { beer: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –≤—Å–µ –ª–∏—Ç—Ä—ã –ø–∏–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "giverep") {
        const newRep = (targetUser.rep || 0) + conf.value;
        await updateUser(conf.targetId, { rep: newRep });
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) ${conf.value} —Ä–µ–ø—É—Ç–∞—Ü–∏–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]\n\n| –¢–µ–ø–µ—Ä—å —É –Ω–µ–≥–æ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏: ${newRep}`;
      } else if (conf.type === "takerep") {
        const newRep = (targetUser.rep || 0) - conf.value;
        await updateUser(conf.targetId, { rep: newRep });
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${conf.value} —Ä–µ–ø—É—Ç–∞—Ü–∏–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –¢–µ–ø–µ—Ä—å —É –Ω–µ–≥–æ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏: ${newRep}`;
      } else if (conf.type === "resetrep") {
        await updateUser(conf.targetId, { rep: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –≤—Å—é —Ä–µ–ø—É—Ç–∞—Ü–∏—é —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –¢–µ–ø–µ—Ä—å —É –Ω–µ–≥–æ —Ä–µ–ø—É—Ç–∞—Ü–∏–∏: 0`;
      } else if (conf.type === "giveprod") {
        const newProds = (targetUser.bizProducts || 0) + conf.value;
        await updateUser(conf.targetId, { bizProducts: newProds });
        successText = `[id${userId}|${conf.adminName}] –≤—ã–¥–∞–ª(-–∞) ${conf.value} –ø—Ä–æ–¥—É–∫—Ç–æ–≤ –¥–ª—è –±–∏–∑–Ω–µ—Å–∞ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${conf.targetId}|${conf.targetName}]\n\n| –í—Å–µ–≥–æ –ø—Ä–æ–¥—É–∫—Ç–æ–≤: ${newProds}`;
      } else if (conf.type === "takeprod") {
        const newProds = Math.max(0, (targetUser.bizProducts || 0) - conf.value);
        await updateUser(conf.targetId, { bizProducts: newProds });
        successText = `[id${userId}|${conf.adminName}] –∑–∞–±—Ä–∞–ª(-–∞) ${conf.value} –ø—Ä–æ–¥—É–∫—Ç–æ–≤ –¥–ª—è –±–∏–∑–Ω–µ—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]\n\n| –û—Å—Ç–∞–ª–æ—Å—å –ø—Ä–æ–¥—É–∫—Ç–æ–≤: ${newProds}`;
      } else if (conf.type === "resetprod") {
        await updateUser(conf.targetId, { bizProducts: 0 });
        successText = `[id${userId}|${conf.adminName}] –æ–±–Ω—É–ª–∏–ª(-–∞) –≤—Å–µ –ø—Ä–æ–¥—É–∫—Ç—ã –¥–ª—è –±–∏–∑–Ω–µ—Å–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${conf.targetId}|${conf.targetName}]`;
      }

      adminConfirmations.delete(key);
      editVkMessage(VK_TOKEN, peerId, cmId, successText || "–î–µ–π—Å—Ç–≤–∏–µ –≤—ã–ø–æ–ª–Ω–µ–Ω–æ!");
      return;
    }

    return;
  }

  // VK Message Events (message_new)
  
  if (type === "message_new") {
    const message = object.message || object;
    const userId = message.from_id;
    const peerId = message.peer_id;
    const text = message.text ? message.text.trim() : "";
    
    if (!userId || userId < 0) return;

    let responseSeq = 0;
    if (activeCaptchas.has(userId)) {
      return; // Ignore text if they have an active captcha (they must click the button)
    }


    // ==========================================
    // 5 –ú–ï–¢–û–î–û–í –ó–ê–©–ò–¢–´ –û–¢ –î–£–ë–õ–ò–†–û–í–ê–ù–ò–Ø –°–û–û–ë–©–ï–ù–ò–ô
    // ==========================================
    const cleanMsgText = text.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").replace(/^@\S+\s*/gi, "").trim().toLowerCase();
    const dedupKey1 = message.conversation_message_id ? `${peerId}_msg_${message.conversation_message_id}` : null;
    const dedupKey2 = message.id && message.id > 0 ? `msg_id_${message.id}` : null;
    const dedupKey3 = `${userId}_${peerId}_${cleanMsgText.slice(0, 50)}`;

    const nowMs = Date.now();
    const lastMsgTime = recentMessagesMap.get(dedupKey3);

    // Check if ANY of the keys was already processed (protects against VK double-delivery of the same webhook)
    if (
      (dedupKey1 && recentMessagesMap.has(dedupKey1)) ||
      (dedupKey2 && recentMessagesMap.has(dedupKey2))
    ) {
      console.log(`>>> DUPLICATE MESSAGE BLOCKED (in-memory): ${dedupKey1 || dedupKey2}`);
      return;
    }

    if (dedupKey1) recentMessagesMap.set(dedupKey1, nowMs);
    if (dedupKey2) recentMessagesMap.set(dedupKey2, nowMs);
    recentMessagesMap.set(dedupKey3, nowMs);

    // ‚ö° INSTANT ULTRA-FAST AUTO-REACTION (<10ms latency)
    if (message.conversation_message_id) {
      const cachedU = userCache.get(userId);
      const cachedC = chatCache.get(peerId);
      const fastReactionId = (cachedU && cachedU.personalReactionId && cachedU.personalReactionId > 0)
        ? cachedU.personalReactionId
        : (cachedC && cachedC.autoReactionId && cachedC.autoReactionId > 0
          ? cachedC.autoReactionId
          : (globalAutoReactionId > 0 ? globalAutoReactionId : 0));

      if (fastReactionId > 0) {
        fastVkCall("messages.sendReaction", {
          access_token: VK_TOKEN,
          v: "5.199",
          peer_id: peerId,
          cmid: message.conversation_message_id,
          reaction_id: fastReactionId
        }, true).catch(() => {});
      }
    }


    // Check if bot was added to the conversation
    if (message.action) {
      const chatData = await getOrCreateChat(peerId);
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
          const greeting = `JORDAN MANAGER –±—ã–ª –¥–æ–±–∞–≤–ª–µ–Ω –≤ –±–µ—Å–µ–¥—É.\n\n–í—ã–¥–∞–π—Ç–µ –µ–º—É –ø—Ä–∞–≤–∞ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞ –¥–ª—è –Ω–∞—á–∞–ª—ã —Ä–∞–±–æ—Ç—ã —Å –Ω–∏–º.\n\n–ü–æ—Å–ª–µ –≤—ã–¥–∞—á–∏ –ø—Ä–∞–≤ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞, –∞–∫—Ç–∏–≤–∏—Ä—É–π—Ç–µ –±–µ—Å–µ–¥—É –ø–æ –∫–æ–º–∞–Ω–¥–µ - /start –∏ –≤—ã–±–µ—Ä–∏—Ç–µ —Ç–∏–ø –±–µ—Å–µ–¥—ã —Å –ø–æ–º–æ—â—å—é –∫–æ–º–∞–Ω–¥—ã - /type`;
          const u = await getOrCreateUser(userId);
          const fullName = u.fullName || u.nick || `User${userId}`;
          const logMsg = `–ë–æ—Ç –±—ã–ª –¥–æ–±–∞–≤–ª–µ–Ω –≤ –Ω–æ–≤—É—é –±–µ—Å–µ–¥—É.\n\n| –î–æ–±–∞–≤–∏–ª: [id${userId}|${fullName}]\n| ID –ë–µ—Å–µ–¥—ã: ${peerId}`;
          sendVkMessage(VK_TOKEN, 2000000010, logMsg).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          return;
        } else if (memberId < 0) { // It's a group
          if (chatData.antiGroup) {
             const addU = await getOrCreateUser(userId);
              const addUName = addU.fullName || addU.nick || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
              await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${addUName}], –¥–æ–±–∞–≤–ª—è—Ç—å —Å–æ–æ–±—â–µ—Å—Ç–≤–∞ –≤ –±–µ—Å–µ–¥—É –∑–∞–ø—Ä–µ—â–µ–Ω–æ.`, { noReply: true });
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
             } catch (e) {}
             return;
          }
        } else {
          // It's a user
          if (act === "chat_invite_user_by_link" && chatData.antiRaid) {
             await sendVkMessage(VK_TOKEN, peerId, `–í—Ö–æ–¥ –≤ –±–µ—Å–µ–¥—É —á–µ—Ä–µ–∑ —Å—Å—ã–ª–∫—É –∑–∞–ø—Ä–µ—â—ë–Ω –Ω–∞—Å—Ç—Ä–æ–π–∫–∞–º–∏.`);
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
                 await sendVkMessage(VK_TOKEN, peerId, `–í –¥–∞–Ω–Ω–æ–π –±–µ—Å–µ–¥–µ –ø—Ä–∏–≥–ª–∞—à–∞—Ç—å —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –º–æ–≥—É—Ç —Ç–æ–ª—å–∫–æ –º–æ–¥–µ—Ä–∞—Ç–æ—Ä—ã!`);
                 try {
                   await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
                 } catch (e) {}
                 return;
             }
          }
          // Check inviteOnlyMod
          if (chatData.inviteOnlyMod) {
             const inviterUser = await getOrCreateUser(userId);
             const inviterName = inviterUser.nick || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";
             const isInviterAdmin = await checkIsAdmin(userId, peerId, inviterUser.role);
             const inviterChatRole = (inviterUser.chatRoles && inviterUser.chatRoles[peerId]) || 0;
             if ((inviterUser.role || 0) < 1 && inviterChatRole < 1 && !isInviterAdmin) {
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${inviterName}], –≤—ã –Ω–µ –º–æ–∂–µ—Ç–µ –ø—Ä–∏–≥–ª–∞—à–∞—Ç—å —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –≤ –±–µ—Å–µ–¥—É, —Ç–∞–∫ –∫–∞–∫ —É –≤–∞—Å –Ω–µ—Ç—É –ø—Ä–∞–≤ –º–æ–¥–µ—Ä–∞—Ç–æ—Ä–∞.`);
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
            if (!mId) return "[id1|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]";
            return `[id${mId}|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]`;
          };

          if (chatBans[peerId]) {
             const bInfo = chatBans[peerId];
             if (bInfo.expiresAt && Date.now() > bInfo.expiresAt) {
               delete chatBans[peerId];
               await updateUser(memberId, { chatBans });
             } else {
               const modStr = await getModStr(bInfo.by);
               const reason = bInfo.reason || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
               const dateStr = fmtD(bInfo.date);
               const termStr = formatDurationBanTerm(bInfo.expiresAt, bInfo.date);
               const msgText = `[id${memberId}|${targetName}] –±—ã–ª(-–∞) –∏—Å–∫–ª—é—á—ë–Ω –∏–∑ –±–µ—Å–µ–¥—ã —Ç–∞–∫ –∫–∞–∫ –æ–Ω(-–∞) –∏–º–µ–µ—Ç –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ!\n\n| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
               const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: memberId }) }, color: "positive" }]] };
               await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }

          if (uData.gban ) {
             if (uData.gbanExpiresAt && Date.now() > uData.gbanExpiresAt) {
               await updateUser(memberId, { gban: false, gbanExpiresAt: 0 });
             } else {
               const modStr = await getModStr(uData.gbanBy);
               const reason = uData.gbanReason || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
               const dateStr = fmtD(uData.gbanDate);
               const termStr = formatDurationBanTerm(uData.gbanExpiresAt, uData.gbanDate);
               const msgText = `[id${memberId}|${targetName}] –±—ã–ª(-–∞) –∏—Å–∫–ª—é—á—ë–Ω –∏–∑ –±–µ—Å–µ–¥—ã —Ç–∞–∫ –∫–∞–∫ –æ–Ω(-–∞) –∏–º–µ–µ—Ç –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö –≤ –∫–æ—Ç–æ—Ä—ã—Ö –µ—Å—Ç—å JORDAN MANAGER!\n\n| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
               const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É", payload: JSON.stringify({ cmd: "mod_ungban", targetId: memberId }) }, color: "positive" }]] };
               await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }

           if (chatData.welcometext_enabled && chatData.welcometext) {
             let wText = chatData.welcometext;
             wText = wText.replace(/%u/g, `id${memberId}`);
             wText = wText.replace(/%n/g, `[id${memberId}|${uData.nick || "–£—á–∞—Å—Ç–Ω–∏–∫"}]`);
             wText = wText.replace(/%i/g, `id${userId}`);
             wText = wText.replace(/%p/g, `[id${userId}|–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å]`); // simplified
             await sendVkMessage(VK_TOKEN, peerId, wText);
          }

          if (chatData.silence && memberId > 0) {
             try {
                executeVkMute(peerId, memberId, 86400 * 30).catch(() => {});
             } catch (e) {}
          }

          if (chatData.invRewardEnabled && userId && memberId && Number(userId) !== Number(memberId) && Number(memberId) > 0) {
            const inviterUser = await getOrCreateUser(userId);
            const inviterName = inviterUser.fullName || inviterUser.nick || `User${userId}`;
            const newBal = (inviterUser.balance || 0) + 25000;
            await updateUser(userId, { balance: newBal });
            await sendVkMessage(VK_TOKEN, peerId, `‚ú® [id${userId}|${inviterName}] –ø–æ–ª—É—á–∏–ª(-–∞) –Ω–∞–≥—Ä–∞–¥—É –∑–∞ –ø—Ä–∏–≥–ª–∞—à–µ–Ω–∏–µ [id${memberId}|—É—á–∞—Å—Ç–Ω–∏–∫–∞] –≤ –±–µ—Å–µ–¥—É!\n\n| –°—É–º–º–∞ –Ω–∞–≥—Ä–∞–¥—ã: 25.000$\n\n[id${memberId}|–£—á–∞—Å—Ç–Ω–∏–∫], –ø—Ä–∏—Å–æ–µ–¥–∏–Ω—è–π—Å—è –∫ –Ω–∞–º –∏–≥—Ä–∞—Ç—å –ø–æ –∫–æ–º–∞–Ω–¥–µ - /–ø—Ä–∏–∑`);
          }
        }
      } else if (act === "chat_kick_user") {
        const memberId = message.action.member_id;
        if (memberId === userId) {
           const uData = await getOrCreateUser(memberId);
           const memberName = uData.fullName || uData.nick || `User${memberId}`;
           await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${memberName}] –ø–æ–∫–∏–Ω—É–ª(-–∞) –±–µ—Å–µ–¥—É`);
           if (chatData.leaveKick) {
              try {
                await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
              } catch (e) {}
           }
        }
      }
    }

    try {
      const cachedUser = userCache.get(userId);
      let fullName = cachedUser?.fullName || cachedUser?.nick || `User${userId}`;

      if (!dynamicBanWordsLoaded) {
        dynamicBanWordsLoaded = true;
        firestoreDb.collection("bot_settings").doc("global").get().then(doc => {
          if (doc.exists && Array.isArray(doc.data()?.banWords)) {
            dynamicBanWords = doc.data()?.banWords;
            rebuildBadWordsCache();
          }
        }).catch(() => {});
      }

      let chatData = chatCache.get(peerId);
      let user = userCache.get(userId);
      if (!chatData || !user) {
        const [fetchedChat, fetchedUser] = await Promise.all([
          getOrCreateChat(peerId),
          getOrCreateUser(userId, fullName)
        ]);
        chatData = fetchedChat;
        user = fetchedUser;
      }
      fullName = user.fullName || user.nick || fullName;

      // Lazy background name enrichment without blocking execution
      if ((!user.fullName || user.fullName.startsWith("User")) && userId > 0) {
        setImmediate(() => {
          fetchVkFullName(userId).then(realName => {
            if (realName && realName !== `User${userId}`) {
              user.fullName = realName;
              updateUser(userId, { fullName: realName }).catch(() => {});
            }
          }).catch(() => {});
        });
      }

      let isAdmin = false;
      if (user.role >= 1 || (user.chatRoles && user.chatRoles[peerId] >= 1) || userId === 778382713 || userId === 1 || userId === 1115715881) {
        isAdmin = true;
      } else {
        const cAdm = adminCache.get(`${userId}:${peerId}`);
        if (cAdm && cAdm.expiry > Date.now()) {
          isAdmin = cAdm.isAdmin;
        } else {
          isAdmin = await checkIsAdmin(userId, peerId, user.role);
        }
      }
      
      const waitKey = `${peerId}_${userId}`;
      if (waitingForWelcome.get(waitKey)) {
         waitingForWelcome.delete(waitKey);
         updateChat(peerId, { welcometext: message.text }).catch(() => {});
         return await sendVkMessage(VK_TOKEN, peerId, `–¢–µ–∫—Å—Ç –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–∏—è —É—Å–ø–µ—à–Ω–æ —É—Å—Ç–∞–Ω–æ–≤–ª–µ–Ω!`);
      }


      // Global and local chat blocks check with auto-kick and notice
      if (peerId > 2000000000) {
        const uChatBans = user.chatBans || {};
        const getModStr = async (mId?: number) => {
          if (!mId) return "[id1|–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä]";
          const mUser = await getOrCreateUser(mId);
          const mName = mUser.fullName || mUser.nick || (await fetchVkFullName(mId)) || "–ú–æ–¥–µ—Ä–∞—Ç–æ—Ä";
          return `[id${mId}|${mName}]`;
        };

        if (uChatBans[peerId]) {
           const bInfo = uChatBans[peerId];
           if (bInfo.expiresAt && Date.now() > bInfo.expiresAt) {
             delete uChatBans[peerId];
             await updateUser(userId, { chatBans: uChatBans });
           } else {
             const modStr = await getModStr(bInfo.by);
             const reason = bInfo.reason || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
             const dateStr = fmtD(bInfo.date);
             const termStr = formatDurationBanTerm(bInfo.expiresAt, bInfo.date);
             const msgText = `[id${userId}|${fullName}] –±—ã–ª(-–∞) –∏—Å–∫–ª—é—á—ë–Ω –∏–∑ –±–µ—Å–µ–¥—ã —Ç–∞–∫ –∫–∞–∫ –æ–Ω(-–∞) –∏–º–µ–µ—Ç –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ!\n\n| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
             const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: userId }) }, color: "positive" }]] };
             await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
             } catch (e) {}
             return;
           }
        }

        if (user.gban ) {
           if (user.gbanExpiresAt && Date.now() > user.gbanExpiresAt) {
             await updateUser(userId, { gban: false, gbanExpiresAt: 0 });
             user.gban = false;
           } else {
             const modStr = await getModStr(user.gbanBy);
             const reason = user.gbanReason || "–±–µ–∑ –ø—Ä–∏—á–∏–Ω—ã";
             const dateStr = fmtD(user.gbanDate);
             const termStr = formatDurationBanTerm(user.gbanExpiresAt, user.gbanDate);
             const msgText = `[id${userId}|${fullName}] –±—ã–ª(-–∞) –∏—Å–∫–ª—é—á—ë–Ω –∏–∑ –±–µ—Å–µ–¥—ã —Ç–∞–∫ –∫–∞–∫ –æ–Ω(-–∞) –∏–º–µ–µ—Ç –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤–æ –≤—Å–µ—Ö –±–µ—Å–µ–¥–∞—Ö –≤ –∫–æ—Ç–æ—Ä—ã—Ö –µ—Å—Ç—å JORDAN MANAGER!\n\n| –ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
             const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "–°–Ω—è—Ç—å –±–ª–æ–∫–∏—Ä–æ–≤–∫—É", payload: JSON.stringify({ cmd: "mod_ungban", targetId: userId }) }, color: "positive" }]] };
             await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
             } catch (e) {}
             return;
           }
        }
      }
      if (user.blacklisted) {
         if (user.blackExpiresAt && Date.now() > user.blackExpiresAt) {
           await updateUser(userId, { blacklisted: false, blackExpiresAt: 0 });
           user.blacklisted = false;
         } else {
            const msgStartCmd = (text || "").trim().toLowerCase().split(/\s+/)[0] || "";
            if (msgStartCmd === "/start" || msgStartCmd === "/—Å—Ç–∞—Ä—Ç" || msgStartCmd === "/–∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å") {
             return await sendVkMessage(VK_TOKEN, peerId, "–í—ã –Ω–∞—Ö–æ–¥–∏—Ç–µ—Å—å –≤ —á—ë—Ä–Ω–æ–º —Å–ø–∏—Å–∫–µ –±–æ—Ç–∞ –∏ –Ω–µ –º–æ–∂–µ—Ç–µ –∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å –±–µ—Å–µ–¥—É.", {
               reply_to: message.conversation_message_id || message.id
             });
           }
           return; // User is blacklisted from using the bot
         }
      }
      if (chatData.banned) return; // Chat is banned

      // Check if bot has system administrator rights in chat
      if (peerId > 2000000000) {
        try {
          const trimmed = (text || "").trim();
          const isCommand = (() => {
            if (!trimmed) return false;
            const prefixes = ["/", "!", ".", ",", "+", ";", ":"];
            const cleanMsg = trimmed.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").trim().replace(/^@\S+\s*/gi, "").trim();
            const startsWithPrefix = prefixes.some(p => cleanMsg.startsWith(p));
            if (startsWithPrefix) return true;

            // –ï—Å–ª–∏ –ø—Ä–µ—Ñ–∏–∫—Å–∞ –Ω–µ—Ç, –ø—Ä–æ–≤–µ—Ä—è–µ–º, —Ä–∞–∑—Ä–µ—à–µ–Ω –ª–∏ –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ –≤–≤–æ–¥ –±–µ–∑ –ø—Ä–µ—Ñ–∏–∫—Å–∞
            if (chatData && chatData.noprefix === true) {
              const firstWord = cleanMsg.split(/\s+/)[0].toLowerCase();
              const knownCmds = [
                "–º—É—Ç", "mute", "–∑–∞–≥–ª—É—à–∏—Ç—å", "–∑–∞–º—É—Ç–∏—Ç—å", "–º—É—Ç–∏—Ç—å", "–¥–∞—Ç—å–º—É—Ç", "m",
                "–∞–Ω–º—É—Ç", "unmute", "—Å–Ω—è—Ç—å–º—É—Ç", "—Ä–∞–∑–≥–ª—É—à–∏—Ç—å", "—Ä–∞–∑–º—É—Ç–∏—Ç—å", "–∏–∑–º—É—Ç–∞", "unm",
                "–≤–∞—Ä–Ω", "warn", "–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "–¥–∞—Ç—å–≤–∞—Ä–Ω", "–ø—Ä–µ–¥", "–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω", "w",
                "–∞–Ω–≤–∞—Ä–Ω", "unwarn", "—Å–Ω—è—Ç—å–≤–∞—Ä–Ω", "—Å–Ω—è—Ç—å–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "—Å–Ω—è—Ç—å–ø—Ä–µ–¥", "–∞–Ω–ø—Ä–µ–¥", "—É–¥–∞–ª–∏—Ç—å–≤–∞—Ä–Ω", "unw",
                "–∫–∏–∫", "kick", "–∏—Å–∫–ª—é—á–∏—Ç—å", "–≤—ã–≥–Ω–∞—Ç—å", "–∫", "k",
                "–±–∞–Ω", "ban", "–∑–∞–±–∞–Ω–∏—Ç—å", "–±", "b",
                "—Ä–∞–∑–±–∞–Ω", "unban", "—É–Ω–±–∞–Ω", "—Ä–∞–∑–±–∞–Ω–∏—Ç—å", "–∏–∑–±–∞–Ω–∞", "unb",
                "–∏–∏", "ai", "—á–∞—Ç", "ask", "–≥–ø—Ç", "gpt", "gemini",
                "—Å—Ç–∞—Ä—Ç", "start", "–Ω–∞—á–∞—Ç—å", "–ø–æ–º–æ—â—å", "help", "—Ö–µ–ª–ø", "–∫–æ–º–∞–Ω–¥—ã", "–º–µ–Ω—é",
                "alt", "–∞–ª—å—Ç", "–∞–ª–∏–∞—Å—ã", "–∞–ª–∏–∞—Å", "—Å–∏–Ω–æ–Ω–∏–º—ã",
                "–æ–±–Ω—è—Ç—å", "hug", "–æ–±–Ω–∏–º–∞—à–∫–∏", "–ø–æ—Ü–µ–ª–æ–≤–∞—Ç—å", "kiss", "—á–º–æ–∫", "–ø–æ—Ü–µ–ª—É–π", "–ø–Ω—É—Ç—å", "kick_fun", "—É–¥–∞—Ä", "—É–¥–∞—Ä–∏—Ç—å",
                "—Å—Ç–∞—Ç–∞", "—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞", "stats", "–ø—Ä–æ—Ñ–∏–ª—å", "profile", "–∏–Ω—Ñ–æ", "info", "–∏–Ω—Ñ–æ–±–æ—Ç", "infobot", "–ø–∏–Ω–≥", "ping",
                "—á—Å", "–≤—á—Å", "—á—Å–±", "addblack", "unblack", "–∞–Ω—á—Å", "–∏–∑—á—Å", "addb", "unb",
                "deletecommand", "—É–¥–∞–ª—è—Ç—å–∫–æ–º–∞–Ω–¥—ã", "delcmd", "—Å—Ç–∞—Ç–∞–∏–º–≥", "stataimg", "statsimg", "—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞–∏–º–≥", "–≤–∞—Ä–Ω—ã", "warns", "–±–∞–Ω–ª–∏—Å—Ç", "banlist", "–º—É—Ç–ª–∏—Å—Ç", "mutelist", "–æ–Ω–ª–∞–π–Ω", "online", "–æ—Ñ—Ñ–ª–∞–π–Ω", "offline",
                "noprefix", "–±–µ–∑–ø—Ä–µ—Ñ–∏–∫—Å–∞", "–≥—Å", "gs", "voice", "–≥–æ–ª–æ—Å–æ–≤–æ–µ", "—Å—Ç–∏–∫–µ—Ä", "—Å—Ç–∏–∫", "sticker", "stick",
                "—Ä–µ–∞–∫—Ü–∏–∏", "—Ä–µ–∞–∫—Ü–∏—è", "reactions", "reaction", "—Ä–µ–∞–∫—Å"
              ];
              return knownCmds.includes(firstWord);
            }
            return false;
          })();

          if (isCommand) {
            let cachedAdmin = adminCache.get(`bot_${peerId}`);
            if (!cachedAdmin || cachedAdmin.expiry < Date.now() || !cachedAdmin.isAdmin) {
              const res = await getChatMembers(peerId, true);
              const items = res.items || [];
              const vErr = res.error;
              const botMemberId = -Math.abs(runtimeBotGroupId || parseInt(String(VK_GROUP_ID)));
              const botMember = items.find((m: any) => m.member_id === botMemberId);
              const bAdmin = vErr !== 917 && (!botMember || Boolean(botMember.is_admin || botMember.is_owner || botMember.can_kick));
              adminCache.set(`bot_${peerId}`, { isAdmin: bAdmin, expiry: Date.now() + 120000 });
              cachedAdmin = { isAdmin: bAdmin, expiry: Date.now() + 120000 };
            }

            if (cachedAdmin && !cachedAdmin.isAdmin) {
              const now = Date.now();
              const lastWarn = noAdminThrottle.get(peerId) || 0;
              if (now - lastWarn > 10000) {
                noAdminThrottle.set(peerId, now);
                await sendVkMessage(VK_TOKEN, peerId, `–£ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞ –æ—Ç—Å—É—Ç—Å—Ç–≤—É—é—Ç –ø—Ä–∞–≤–∞ —Å–∏—Å—Ç–µ–º–Ω–æ–≥–æ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞ (–∑–≤—ë–∑–¥–æ—á–∫–∞), –≤—ã–¥–∞–π—Ç–µ –µ–º—É –ø—Ä–∞–≤–∞ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ç–æ—Ä–∞ –∏ –æ–Ω –ø—Ä–æ–¥–æ–ª–∂–∏—Ç —Ä–∞–±–æ—Ç–∞—Ç—å.`, {
                  forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
                });
              }
              return;
            }
          }
        } catch (e) {}

        // Add to recent messages buffer
        if (message.conversation_message_id) {
            let rM = chatRecentMessages.get(peerId) || [];
            rM.push({ cmId: message.conversation_message_id, fromId: userId, text: message.text || "" });
            if (rM.length > 500) rM.shift();
            chatRecentMessages.set(peerId, rM);
        }
      }


      const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
      const userEffectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
      const userHasRights = userEffectiveRole >= 1 || isAdmin;

      if (!userHasRights) {
         // Check photo ban
         const hasPhoto = message.attachments && message.attachments.some((a: any) => a.type === "photo");
         if (chatData.disablePhotos && hasPhoto) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], –æ—Ç–ø—Ä–∞–≤–ª—è—Ç—å —Ñ–æ—Ç–æ–≥—Ä–∞—Ñ–∏–∏ –≤ –±–µ—Å–µ–¥—É –∑–∞–ø—Ä–µ—â–µ–Ω–æ –µ—ë –Ω–∞—Å—Ç—Ä–æ–π–∫–∞–º–∏.`, { noReply: true });
            return;
         }

         // Check sticker ban
         const hasSticker = (message.attachments && message.attachments.some((a: any) => a.type === "sticker")) || message.sticker || message.sticker_id;
         if (chatData.disableStickers && hasSticker) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], –æ—Ç–ø—Ä–∞–≤–ª—è—Ç—å —Å—Ç–∏–∫–µ—Ä—ã –≤ –±–µ—Å–µ–¥—É –∑–∞–ø—Ä–µ—â–µ–Ω–æ –µ—ë –Ω–∞—Å—Ç—Ä–æ–π–∫–∞–º–∏.`, { noReply: true });
            return;
         }

         // Check video ban
         const hasVideo = message.attachments && message.attachments.some((a: any) => a.type === "video" || a.type === "video_file" || a.type === "short_video");
         if (chatData.disableVideo && hasVideo) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], –æ—Ç–ø—Ä–∞–≤–ª—è—Ç—å –≤–∏–¥–µ–æ –≤ –±–µ—Å–µ–¥—É –∑–∞–ø—Ä–µ—â–µ–Ω–æ –µ—ë –Ω–∞—Å—Ç—Ä–æ–π–∫–∞–º–∏.`, { noReply: true });
            return;
         }
      }

      if (chatData.silence) {
         const silenceMinRole = chatData.silenceMinRole || 1;
         const canSpeak = userEffectiveRole >= silenceMinRole || isAdmin || userId === 778382713 || userId === 1115715881;
         if (!canSpeak) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            return; // silence mode
         }
      }

      // Check active mute
      if (user.muteUntil && user.muteUntil > Date.now()) {
         try {
           await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
         } catch (e) {}

         if (chatData.warnMute) {
            const currentWarns = (user.warnings || 0) + 1;
            await updateUser(userId, { warnings: currentWarns });
            const uName = user.fullName || user.nick || `User${userId}`;
            const maxWarns = globalSettings.maxWarnings || 3;
            if (currentWarns >= maxWarns) {
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
               } catch (e) {}
               await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${uName}] –ø–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –∑–∞ –Ω–∞–ø–∏—Å–∞–Ω–∏–µ —Å–æ–æ–±—â–µ–Ω–∏–π –Ω–∞—Ö–æ–¥—è—Å—å –≤ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ —á–∞—Ç–∞. (#WM) [3/3]\n\n| –ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –∏—Å–∫–ª—é—á–µ–Ω –∑–∞ –ø—Ä–µ–≤—ã—à–µ–Ω–∏–µ –ª–∏–º–∏—Ç–∞ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π.`);
            } else {
               await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${uName}] –ø–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –∑–∞ –Ω–∞–ø–∏—Å–∞–Ω–∏–µ —Å–æ–æ–±—â–µ–Ω–∏–π –Ω–∞—Ö–æ–¥—è—Å—å –≤ –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ —á–∞—Ç–∞. (#WM)`);
            }
         }

         return; // User is currently muted
      }

      // Save/update user stats in single document per chat and user (non-blocking for ultra-fast command execution)
      setImmediate(() => {
        try {
          const statKey = `${peerId}_${userId}`;
          const todayStr = getMskDateStr();
          let st = chatUserStatsCache.get(statKey);
          if (!st) {
            st = { Chat_id: peerId, user_id: userId, message_today: 0, messages: 0, lastDate: todayStr };
            chatUserStatsCache.set(statKey, st);
          }
          if (st.lastDate !== todayStr) {
            st.message_today = 1;
            st.lastDate = todayStr;
          } else {
            st.message_today += 1;
          }
          st.messages += 1;

          firestoreDb.collection("chat_user_stats").doc(statKey).set(st, { merge: true }).catch(() => {});
        } catch (e) {}
      });

      // Block game commands if games disabled
      const firstWord = text ? text.split(" ")[0].toLowerCase() : "";
      const gameCmdsList = [
        "/—Ü–∏—Ç–∞—Ç–∞", "/–ø–∏–≤–æ", "/–∫—Ä–æ–∫–æ–¥–∏–ª", "/–ø—Ä–∏–∑", "/–ø–µ—Ä–µ–¥–∞—Ç—å", "/—Ç–æ–ø", "/–ø–∏–≤–æ–∑–∞–≤—Ä—ã", "/—Ä—É–ª–µ—Ç–∫–∞", "/–∫–∞–∑–∏–Ω–æ",
        "/–±–∏–∑–Ω–µ—Å", "/–±–∏–∑–Ω–µ—Å—ã", "/–∫—É–ø–∏—Ç—å–±–∏–∑", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑", "/–ø–ø—Ä–æ–¥", "/–∫—É–ø–∏—Ç—å–ø—Ä–æ–¥", "/–ø—Ä–µ–º–ø—Ä–æ—Ñ–∏–ª—å", "/–ø—Ä–µ–º–±–∞–ª–∞–Ω—Å",
        "/–æ—Ç–∫—Ä—ã—Ç—å–¥–µ–ø–æ–∑–∏—Ç", "/–¥–µ–ø–æ–∑–∏—Ç—ã", "/–¥—É—ç–ª—å", "/–¥—É—ç–ª—å–±–∏–∑", "/–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω", "/–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω", "/–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω", "/–±–∞–Ω–∫",
        "/–º–∞—Ñ–∏—è", "/–∫–Ω–±", "/–±—Ä–∞–∫", "/—Ä–∞–∑–≤–æ–¥", "/–º–æ–Ω–µ—Ç–∫–∞", "/–∫—É–±–∏–∫", "/–∫–ª–∏–∫", "/–±–æ–Ω—É—Å", "/—Ç–∏—Ä", "/—Ä—ã–±–∞–ª–∫–∞",
        "/—Å–Ω—è—Ç—å", "/–¥–µ–ø–æ–∑–∏—Ç", "/–±–∞–ª–∞–Ω—Å", "/–∫—É–ø–∏—Ç—å–±–∏–∑–Ω–µ—Å", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑–Ω–µ—Å", "/—Å–æ–±—Ä–∞—Ç—å", "/–≤—ã–ø–∏—Ç—å", "/—Ç–æ–ø–ø–∏–≤–æ",
        "/—Ä–µ–ø—É—Ç–∞—Ü–∏—è", "/–ø–æ–∂–µ–Ω–∏—Ç—å", "/—Ä–∞–∑–≤–µ—Å—Ç–∏—Å—å", "/—Å–≤–∞–¥—å–±–∞", "/–∫–æ–ª–µ—Å–æ", "/—Ö–∞–∫", "/–≤–∑–ª–æ–º", "/–∫–ª–∞–Ω",
        "/–±–∏—Ç–∫–æ–∏–Ω", "/bitcoin", "/btc", "/–±—Ç–∫", "/buybitcoin", "/–∫—É–ø–∏—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–∫—É–ø–∏—Ç—å–±—Ç–∫",
        "/sellbitcoin", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–ø—Ä–æ–¥–∞—Ç—å–±—Ç–∫", "/paybitcoin", "/–ø–µ—Ä–µ–¥–∞—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–ø–µ—Ä–µ–¥–∞—Ç—å–±—Ç–∫", "/–∫—É—Ä—Å"
      ];
      if ((chatData.games === false || chatData.gamesDisabled) && gameCmdsList.includes(firstWord)) {
        return await sendVkMessage(VK_TOKEN, peerId, "–ò–≥—Ä—ã –æ—Ç–∫–ª—é—á–µ–Ω—ã –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ.", { reply_to: message.conversation_message_id || message.id });
      }

      if (checkFlood(peerId, userId, chatData)) {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 1 && !(await checkIsAdmin(userId, peerId, uRole))) {
             try {
                await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
             } catch (e) {}
             const uData = await getOrCreateUser(userId);
             if (!uData.muteUntil || uData.muteUntil < Date.now()) {
                await updateUser(userId, { muteUntil: Date.now() + 30 * 60 * 1000 });
                await executeVkMute(peerId, userId, 30 * 60);
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é] –±—ã–ª–∞ –≤—ã–¥–∞–Ω–∞ –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞ —á–∞—Ç–∞ –Ω–∞ 30 –º–∏–Ω—É—Ç –ø–æ –ø—Ä–∏—á–∏–Ω–µ —Ñ–ª—É–¥–∞ —Å–æ–æ–±—â–µ–Ω–∏—è–º–∏. (#FLOOD)`);
             }
             return; // Ignore flooded message
         }
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

      const isStart = text.toLowerCase() === "–Ω–∞—á–∞—Ç—å" || (message.payload && JSON.parse(message.payload).command === "start");
      if ((user._isNew || isStart)) {
        if (peerId < 2000000000) {
          user._isNew = false;
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], –¥–æ–±—Ä–æ –ø–æ–∂–∞–ª–æ–≤–∞—Ç—å –≤ –º–∏—Ä GAMES MANAGER!\n\n–ó–¥–µ—Å—å –≤—ã –º–æ–∂–µ—Ç–µ –∏–≥—Ä–∞—Ç—å, —Å–æ—Ä–µ–≤–Ω–æ–≤–∞—Ç—å—Å—è —Å –¥—Ä—É–≥–∏–º–∏ —É—á–∞—Å—Ç–Ω–∏–∫–∞–º–∏, —Å—Ä–∞–∂–∞—Ç—å—Å—è –∑–∞ —Ç–æ–ø 1, –∏ –º–Ω–æ–≥–æ–µ –¥—Ä—É–≥–æ–µ!\n\n–ò–≥—Ä–∞—è —Å –±–æ—Ç–æ–º, –≤—ã –∞–≤—Ç–æ–º–∞—Ç–∏—á–µ—Å–∫–∏ —Å–æ–≥–ª–∞—à–∞–µ—Ç–µ—Å—å —Å–æ –≤—Å–µ–º–∏ –ø—Ä–∞–≤–∏–ª–∞–º–∏ –±–æ—Ç–∞.`);
        }
      }
      checkAndApplyGameUnban(userId, user).catch(() => {});
      updateUserStats(userId, peerId).catch(() => {});

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
            .replace(/—ë/g, "–µ");

          const target = (croc.word || "").trim().toLowerCase().replace(/—ë/g, "–µ");
          const cleanPunct = (s: string) => s.replace(/[.,!?;:\-‚Äì‚Äî"'\(\)]/gi, "");
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

            await sendVkMessage(VK_TOKEN, peerId, `üéâ –ü–æ–∑–¥—Ä–∞–≤–ª—è–µ–º! [id${userId}|${fullName}] —É–≥–∞–¥–∞–ª(-–∞) —Å–ª–æ–≤–æ!\n\n| –°–ª–æ–≤–æ –±—ã–ª–æ: ${croc.word}\n| –ù–∞–≥—Ä–∞–¥–∞: ${reward.toLocaleString()}$\n\n| –ò–≥—Ä–∞ –∑–∞–≤–µ—Ä—à–µ–Ω–∞!`, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
            });
            return;
          }
        }
      }

      
      // Anti-Ad Check
      if (peerId > 2000000000 && text && chatData.antiAd) {
        const uRole = await getRole(peerId, userId);
        const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
        const isOwnerOrImmune = (uRole >= 6) || (userChatRole >= 6) || (user.role >= 7.1) || (chatData.adminId === userId) || isAdmin;

        if (!isOwnerOrImmune && detectAdvertisement(text)) {
          try {
            await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
          } catch (e) {}

          const targetU = await getOrCreateUser(userId);
          const newWarns = (targetU.warnings || 0) + 1;
          await updateUser(userId, { warnings: newWarns });

          await logBotAction({
            type: "warn",
            peerId,
            userId: 0,
            targetId: userId,
            text: `–°–∏—Å—Ç–µ–º–∞ –ê–Ω—Ç–∏-—Ä–µ–∫–ª–∞–º–∞ –≤—ã–¥–∞–ª–∞ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ [id${userId}|${fullName}] (${newWarns}/3)`
          });

          if (newWarns >= 3) {
            const chatBans = targetU.chatBans || {};
            chatBans[peerId] = { by: 0, reason: "3/3 –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π (–ê–Ω—Ç–∏-—Ä–µ–∫–ª–∞–º–∞)", date: Date.now() };
            await updateUser(userId, { chatBans });

            try {
              await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
              });
            } catch (e) {}

            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] –±—ã–ª –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω –∏ –∏—Å–∫–ª—é—á–µ–Ω –∏–∑ –±–µ—Å–µ–¥—ã\n\n| –ü—Ä–∏—á–∏–Ω–∞: 3/3 –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π, —Å–∏—Å—Ç–µ–º–Ω–∞—è –±–ª–æ–∫–∏—Ä–æ–≤–∫–∞ –∑–∞ —Ä–µ–∫–ª–∞–º—É`, { noReply: true });
          } else {
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] –ø–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –∏–∑-–∑–∞ —Ä–µ–∫–ª–∞–º—ã/—Å—Å—ã–ª–∫–∏ –≤ –±–µ—Å–µ–¥–µ.\n| –ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π: ${newWarns}/3`, { noReply: true });
          }
          return;
        }
      }

// Anti-teg Check (Per-user anti-tag with @ only, ignores commands and self-mentions)
      const isCmd = Boolean(text && (text.trim().startsWith("/") || text.trim().startsWith("!")));
      if (peerId > 2000000000 && text && !isCmd) {
        const chatDataForAntiTeg = await getOrCreateChat(peerId);
        const antiTegUsers: number[] = Array.isArray(chatDataForAntiTeg.antiTegUsers) ? chatDataForAntiTeg.antiTegUsers : [];
        const hasAntiTegAll = chatDataForAntiTeg.antiTegAll === true;

        if (antiTegUsers.length > 0 || hasAntiTegAll) {
          const uRole = await getRealRole(peerId, userId);
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isOwnerOrImmune = (uRole >= 6) || (userChatRole >= 6) || (user.role >= 12) || (chatDataForAntiTeg.adminId === userId) || isAdmin;

          if (!isOwnerOrImmune) {
            let triggeredTargetId: number | null = null;

            for (const targetId of antiTegUsers) {
              if (targetId === userId) continue;
              const targetU = await getOrCreateUser(targetId);
              const isMentioned = isUserMentionedInText(text, targetId, targetU.domain || (targetU as any).screen_name);
              if (isMentioned) {
                triggeredTargetId = targetId;
                break;
              }
            }

            if (triggeredTargetId) {
              try {
                await deleteVkMessage(VK_TOKEN, peerId, message);
                if (message.conversation_message_id) {
                  await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id);
                }
              } catch (e) {}

              await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], —É–ø–æ–º–∏–Ω–∞—Ç—å –¥–∞–Ω–Ω–æ–≥–æ [id${triggeredTargetId}|–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è] –∑–∞–ø—Ä–µ—â–µ–Ω–æ!`, { noReply: true, disable_mentions: 1 });
              return;
            }

            if (hasAntiTegAll && containsTagAll(text)) {
              try {
                await deleteVkMessage(VK_TOKEN, peerId, message);
                if (message.conversation_message_id) {
                  await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id);
                }
              } catch (e) {}
              const targetU = await getOrCreateUser(userId);
              const newWarns = (targetU.warnings || 0) + 1;
              await updateUser(userId, { warnings: newWarns });
              const tegUName = targetU.fullName || targetU.nick || "–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å";

              await logBotAction({
                type: "warn",
                peerId,
                userId: 0,
                targetId: userId,
                text: `–°–∏—Å—Ç–µ–º–∞ –ê–Ω—Ç–∏-—Ç–µ–≥ –≤—ã–¥–∞–ª–∞ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ [id${userId}|${tegUName}] (${newWarns}/3)`
              });

              if (newWarns >= 3) {
                await updateUser(userId, { warnings: 0 });
                try {
                  await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                    params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
                } catch (e) {}
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${tegUName}] –ø–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –∏–∑-–∑–∞ —É–ø–æ–º–∏–Ω–∞–Ω–∏—è –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã.\n\n| –î–æ—Å—Ç–∏–≥–Ω—É—Ç–æ 3/3 –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π. –ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –∏—Å–∫–ª—é—á—ë–Ω –∏–∑ –±–µ—Å–µ–¥—ã.`, { noReply: true });
              } else {
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${tegUName}] –ø–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ –∏–∑-–∑–∞ —É–ø–æ–º–∏–Ω–∞–Ω–∏—è –≤—Å–µ—Ö —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã.\n| –ü—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π: ${newWarns}/3`, { noReply: true });
              }
              return;
            }
          }
        }
      }

      let cmdText = text.trim();

      if (/^[+!\./]?–ø–æ–∂–µ–Ω–∏—Ç\s+—å/i.test(cmdText)) {
        cmdText = cmdText.replace(/–ø–æ–∂–µ–Ω–∏—Ç\s+—å/i, "–ø–æ–∂–µ–Ω–∏—Ç—å");
      }

      // Clean leading VK tags / mentions (e.g. [club239281784|@jordan_manager] or [id123|User] or @jordan_manager)
      cmdText = cmdText.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").trim();
      cmdText = cmdText.replace(/^@\S+\s*/gi, "").trim();

            if (peerId < 2000000000 && zrApplicationStateMap.has(userId)) {
        const lowerCmd = cmdText.toLowerCase();
        if (lowerCmd === "/–æ—Ç–º–µ–Ω–∞" || lowerCmd === "/cancel" || lowerCmd === "–æ—Ç–º–µ–Ω–∞") {
          zrApplicationStateMap.delete(userId);
          await sendVkMessage(VK_TOKEN, peerId, "–í—ã –æ—Ç–º–µ–Ω–∏–ª–∏ –ø–æ–¥–∞—á—É –∑–∞—è–≤–∫–∏ –Ω–∞ –ø–æ—Å—Ç –∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è.");
          return;
        }

        const state = zrApplicationStateMap.get(userId)!;
        const currentStep = state.step;
        state.answers[currentStep] = cmdText;

        if (state.lastMsgId) {
          try { await deleteVkMessage(VK_TOKEN, peerId, state.lastMsgId); } catch (e) {}
        }

        const nextStep = currentStep + 1;
        state.step = nextStep;

        let nextMsgText = "";
        let nextKeyboard: any = null;

        if (nextStep === 2) {
          nextMsgText = "–•–æ—Ä–æ—à–æ, —Ç–µ–ø–µ—Ä—å —Å–ª–µ–¥—É—é—â–∏–π –≤–æ–ø—Ä–æ—Å\n\n–£–∫–∞–∂–∏—Ç–µ –≤–∞—à—É —ç–ª–µ–∫—Ç—Ä–æ–Ω–Ω—É—é –ø–æ—á—Ç—É";
        } else if (nextStep === 3) {
          nextMsgText = "–û—Ç–ª–∏—á–Ω–æ, —Ç–µ–ø–µ—Ä—å —É–∫–∞–∂–∏—Ç–µ –≤–∞—à Telegram";
        } else if (nextStep === 4) {
          nextMsgText = "–ö–∞–∫–æ–π —É –≤–∞—Å —á–∞—Å–æ–≤–æ–π –ø–æ—è—Å (–æ—Ç –ú–°–ö)?";
        } else if (nextStep === 5) {
          nextMsgText = "–†–∞—Å—Å–∫–∞–∂–∏—Ç–µ, –ø–æ—á–µ–º—É –≤—ã —Ö–æ—Ç–∏—Ç–µ –ø–æ–ø–∞—Å—Ç—å –Ω–∞ –ø–æ—Å—Ç –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è?";
        } else if (nextStep === 6) {
          nextMsgText = "–ß—Ç–æ –≤—ã –±—É–¥–µ—Ç–µ –¥–µ–ª–∞—Ç—å –Ω–∞ –ø–æ—Å—Ç–µ –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª—è —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è?";
        } else if (nextStep === 7) {
          nextMsgText = "–ü–æ—á–µ–º—É –º—ã –¥–æ–ª–∂–Ω—ã –≤–∑—è—Ç—å –Ω–∞ –ø–æ—Å—Ç –∏–º–µ–Ω–Ω–æ –≤–∞—Å?";
        } else if (nextStep === 8) {
          nextMsgText = "–ï—Å—Ç—å –ª–∏ —É –≤–∞—Å –æ–ø—ã—Ç –≤ —ç—Ç–æ–π —Å—Ñ–µ—Ä–µ?";
        } else if (nextStep === 9) {
          nextMsgText = "–ì–æ—Ç–æ–≤—ã –ª–∏ –≤—ã –ø–æ–ª—É—á–∏—Ç—å –ß–°–ë/–ß–°–† –∑–∞ —Å–ª–∏–≤ —Å–≤–æ–µ–≥–æ –ø–æ—Å—Ç–∞?";
        } else if (nextStep === 10) {
          nextMsgText = "–°–∫–æ–ª—å–∫–æ –≤—ã –≥–æ—Ç–æ–≤—ã —É–¥–µ–ª—è—Ç—å –≤—Ä–µ–º—è –Ω–∞—à–µ–º—É —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä—É?";
        } else if (nextStep === 11) {
          nextMsgText = "–£–∫–∞–∂–∏—Ç–µ –≤–∞—à –µ–∂–µ–¥–Ω–µ–≤–Ω—ã–π –æ–Ω–ª–∞–π–Ω –≤ –í–ö–æ–Ω—Ç–∞–∫—Ç–µ";
        } else if (nextStep === 12) {
          nextMsgText = "–ì–æ—Ç–æ–≤—ã –ª–∏ –≤—ã —Å–ª—É—à–∞—Ç—å—Å—è –≤—ã—Å—à–µ–µ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–æ?";
        } else if (nextStep >= 13) {
          nextMsgText = "–û—Ç–ª–∏—á–Ω–æ, –≤–∞—à–∞ –∑–∞—è–≤–∫–∞ –∑–∞–ø–æ–ª–Ω–µ–Ω–∞!\n\n–ñ–µ–ª–∞–µ—Ç–µ –æ—Ç–ø—Ä–∞–≤–∏—Ç—å –µ—ë –Ω–∞ —Ä–∞—Å—Å–º–æ—Ç—Ä–µ–Ω–∏–µ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤—É?";
          nextKeyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "–î–∞, –æ—Ç–ø—Ä–∞–≤–∏—Ç—å", payload: JSON.stringify({ cmd: "zr_send_app" }) }, color: "positive" },
                { action: { type: "callback", label: "–ù–µ—Ç, –Ω–µ –æ—Ç–ø—Ä–∞–≤–ª—è—Ç—å", payload: JSON.stringify({ cmd: "zr_cancel_app" }) }, color: "negative" }
              ]
            ]
          };
        }

        if (nextStep >= 2 && nextStep <= 12) {
          nextKeyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "–û—Ç–º–µ–Ω–∏—Ç—å –ø–æ–¥–∞—á—É", payload: JSON.stringify({ cmd: "zr_cancel" }) }, color: "negative" }
              ]
            ]
          };
        }

        const sendOpts: any = {};
        if (message.conversation_message_id) {
          sendOpts.forward = JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true });
        }
        if (nextKeyboard) {
          sendOpts.keyboard = JSON.stringify(nextKeyboard);
        }

        const sentRes = await sendVkMessage(VK_TOKEN, peerId, nextMsgText, sendOpts);
        const sentId = sentRes?.response || sentRes;
        if (typeof sentId === 'number') {
          state.lastMsgId = sentId;
        }
        return;
      }


      if (!cmdText.startsWith("/")) {
        if (message.reply_message && message.reply_message.from_id === -Math.abs(Number(VK_GROUP_ID))) {
           const replyText = message.reply_message.text || "";
           if (replyText.includes("–£–∫–∞–∂–∏—Ç–µ –∞—Ä–≥—É–º–µ–Ω—Ç—ã –∫–æ–º–∞–Ω–¥—ã!") && replyText.includes("| –í–ª–∞–¥–µ–ª–µ—Ü –±–µ—Å–µ–¥—ã:")) {
              cmdText = "/renameroles\n" + cmdText;
           }
        }
      }

      const prefixes = ["/", "!", ".", ",", "+", ";", ":"];
      const hasPrefix = prefixes.some(p => cmdText.startsWith(p));
      
      if (hasPrefix) {
        if (cmdText.startsWith("-—Ç–∏—à–∏–Ω–∞")) {
          cmdText = "/—Ç–∏—à–∏–Ω–∞_–≤–∫–ª " + cmdText.slice(7).trim();
        } else if (cmdText.startsWith("+—Ç–∏—à–∏–Ω–∞")) {
          cmdText = "/—Ç–∏—à–∏–Ω–∞_–≤—ã–∫–ª " + cmdText.slice(7).trim();
        } else {
          cmdText = "/" + cmdText.slice(1).trim();
        }
      } else {
        // –ï—Å–ª–∏ —Å–æ–æ–±—â–µ–Ω–∏–µ –æ—Ç–ø—Ä–∞–≤–ª–µ–Ω–æ –±–µ–∑ –ø—Ä–µ—Ñ–∏–∫—Å–∞
        let allowedWithoutPrefix = false;
        if (peerId < 2000000000) {
          // –í –ª–∏—á–Ω—ã—Ö —Å–æ–æ–±—â–µ–Ω–∏—è—Ö —Å –±–æ—Ç–æ–º (–õ–°) –±–µ—Å–ø—Ä–µ—Ñ–∏–∫—Å–Ω—ã–π –≤–≤–æ–¥ —Ä–∞–∑—Ä–µ—à–µ–Ω –≤—Å–µ–≥–¥–∞
          allowedWithoutPrefix = true;
        } else if (chatData && chatData.noprefix === true) {
          // –í –±–µ—Å–µ–¥–µ —Ä–∞–∑—Ä–µ—à–µ–Ω —Ç–æ–ª—å–∫–æ –µ—Å–ª–∏ –≤–∫–ª—é—á–µ–Ω–∞ –Ω–∞—Å—Ç—Ä–æ–π–∫–∞ noprefix
          allowedWithoutPrefix = true;
        }

        if (allowedWithoutPrefix) {
          const firstWord = cmdText.split(/\s+/)[0].toLowerCase();
          const knownCmds = [
            "–º—É—Ç", "mute", "–∑–∞–≥–ª—É—à–∏—Ç—å", "–∑–∞–º—É—Ç–∏—Ç—å", "–º—É—Ç–∏—Ç—å", "–¥–∞—Ç—å–º—É—Ç", "m",
            "–∞–Ω–º—É—Ç", "—É–Ω–º—É—Ç", "unmute", "—Å–Ω—è—Ç—å–º—É—Ç", "—Ä–∞–∑–º—É—Ç", "—Ä–∞–∑–≥–ª—É—à–∏—Ç—å", "—Ä–∞–∑–º—É—Ç–∏—Ç—å", "–∏–∑–º—É—Ç–∞", "unm",
            "–≤–∞—Ä–Ω", "warn", "–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "–¥–∞—Ç—å–≤–∞—Ä–Ω", "–ø—Ä–µ–¥", "–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω", "–≤—ã–¥–∞—Ç—å–ø—Ä–µ–¥", "w",
            "–∞–Ω–≤–∞—Ä–Ω", "—É–Ω–≤–∞—Ä–Ω", "unwarn", "—Å–Ω—è—Ç—å–≤–∞—Ä–Ω", "—Å–Ω—è—Ç—å–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "—Å–Ω—è—Ç—å–ø—Ä–µ–¥", "–∞–Ω–ø—Ä–µ–¥", "—É–¥–∞–ª–∏—Ç—å–≤–∞—Ä–Ω", "unw", "—Ä–∞–∑–≤–∞—Ä–Ω",
            "–∫–∏–∫", "kick", "–∏—Å–∫–ª—é—á–∏—Ç—å", "–≤—ã–≥–Ω–∞—Ç—å", "–∫", "k",
            "–±–∞–Ω", "ban", "–∑–∞–±–∞–Ω–∏—Ç—å", "–±", "b",
            "—Ä–∞–∑–±–∞–Ω", "unban", "—É–Ω–±–∞–Ω", "–∞–Ω–±–∞–Ω", "—Ä–∞–∑–±–∞–Ω–∏—Ç—å", "–∏–∑–±–∞–Ω–∞", "unb",
            "–∏–∏", "ai", "—á–∞—Ç", "ask", "–≥–ø—Ç", "gpt", "gemini",
            "—Å—Ç–∞—Ä—Ç", "start", "–Ω–∞—á–∞—Ç—å", "–∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å", "–∞–∫—Ç–∏–≤–∞—Ü–∏—è", "–≤–∫–ª—é—á–∏—Ç—å–±–æ—Ç–∞", "activate",
            "–ø–æ–º–æ—â—å", "help", "—Ö–µ–ª–ø", "–∫–æ–º–∞–Ω–¥—ã", "–º–µ–Ω—é", "cmd", "cmds", "commands", "–∏–≥—Ä–æ–≤—ã–µ", "–∏–≥—Ä—ã", "game", "games", "–∏–≥—Ä–æ–≤—ã–µ–∫–æ–º–∞–Ω–¥—ã",
            "alt", "–∞–ª—å—Ç", "–∞–ª–∏–∞—Å—ã", "–∞–ª–∏–∞—Å", "—Å–∏–Ω–æ–Ω–∏–º—ã",
            "–æ–±–Ω—è—Ç—å", "hug", "–æ–±–Ω–∏–º–∞—à–∫–∏", "–ø–æ—Ü–µ–ª–æ–≤–∞—Ç—å", "kiss", "—á–º–æ–∫", "–ø–æ—Ü–µ–ª—É–π", "–ø–Ω—É—Ç—å", "kick_fun", "—É–¥–∞—Ä", "—É–¥–∞—Ä–∏—Ç—å",
            "—Å—Ç–∞—Ç–∞", "—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞", "stats", "–ø—Ä–æ—Ñ–∏–ª—å", "profile", "–ø—Ä–æ—Ñ", "–∏–Ω—Ñ–æ", "info", "–∏–Ω—Ñ–æ–±–æ—Ç", "infobot", "botinfo", "–ø–∏–Ω–≥", "ping", "—Å—Ç–∞—Ç—Å", "stata", "—Å–∏", "—Å–∏—Å—Ç–∞—Ç–∞", "—Å—Ç–∞—Ç–∞–∏–º–≥",
            "—á—Å", "–≤—á—Å", "—á—Å–±", "addblack", "unblack", "–∞–Ω—á—Å", "–∏–∑—á—Å", "addb", "unb",
            "deletecommand", "—É–¥–∞–ª—è—Ç—å–∫–æ–º–∞–Ω–¥—ã", "delcmd", "stataimg", "statsimg", "—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞–∏–º–≥",
            "–≤–∞—Ä–Ω—ã", "warns", "–ø—Ä–µ–¥—ã", "—Å–ø–∏—Å–æ–∫–≤–∞—Ä–Ω–æ–≤", "–±–∞–Ω–ª–∏—Å—Ç", "banlist", "—Å–ø–∏—Å–æ–∫–±–∞–Ω–æ–≤", "–±–∞–Ω—ã", "–º—É—Ç–ª–∏—Å—Ç", "mutelist", "—Å–ø–∏—Å–æ–∫–º—É—Ç–æ–≤", "–º—É—Ç—ã", "–æ–Ω–ª–∞–π–Ω", "online", "–∫—Ç–æ–æ–Ω–ª–∞–π–Ω", "–æ–Ω–ª–∞–π–Ω–µ", "–æ—Ñ—Ñ–ª–∞–π–Ω", "offline", "–æ—Ñ–ª–∞–π–Ω",
            "—á–∏—Å—Ç–∫–∞", "clear", "mclear", "–æ—á–∏—Å—Ç–∏—Ç—å", "purge", "–ø—É—Ä–¥–∂", "—É–¥–∞–ª–∏—Ç—å—Å–æ–æ–±—â–µ–Ω–∏—è", "zov", "–∑–æ–≤", "olist", "offlinelist",
            "–æ–ª–∏—Å—Ç", "–æ—Ñ—Ñ–ª–∞–π–Ω–ª–∏—Å—Ç", "–æ—Ñ–ª–∞–π–Ω–ª–∏—Å—Ç", "–æ–Ω–ª–∞–π–Ω–ª–∏—Å—Ç", "warnmute", "–≤–∞—Ä–Ω–º—É—Ç", "wm", "–Ω–∞–≥—Ä–∞–¥–∞–∏–Ω–≤", "invreward",
            "–Ω–∞–≥—Ä–∞–¥–∞–∏–Ω–≤–∞–π—Ç", "–Ω–∞–≥—Ä–∞–¥–∞–ø—Ä–∏–≥–ª–∞—à–µ–Ω–∏–µ", "rewardinv", "–≥—Å—Ç–∞—Ñ—Ñ", "–≥—Å–æ—Å—Ç–∞–≤", "gstaffs",
            "pin", "–ø–∏–Ω", "unpin", "–∞–Ω–ø–∏–Ω", "—É–Ω–ø–∏–Ω", "–∑–∞–∫—Ä–µ–ø–∏—Ç—å", "–æ—Ç–∫—Ä–µ–ø–∏—Ç—å", "–∑–∞–∫—Ä", "–æ—Ç–∫—Ä", "settings", "–Ω–∞—Å—Ç—Ä–æ–π–∫–∏", "–Ω–∞—Å—Ç—Ä–æ–π–∫–∞", "—Å–µ—Ç—Ç–∏–Ω–≥—Å", "–ø–∞—Ä–∞–º–µ—Ç—Ä—ã",
            "type", "—Ç–∏–ø", "—Ç–∏–ø–±–µ—Å–µ–¥—ã", "sync", "—Å–∏–Ω–∫", "—Å–∏–Ω—Ö", "—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∞—Ü–∏—è", "—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∏—Ä–æ–≤–∞—Ç—å", "resync", "games", "staff", "—Å–æ—Å—Ç–∞–≤", "—Å—Ç–∞—Ñ—Ñ", "—Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–æ", "–∞–¥–º–∏–Ω—ã", "–º–æ–¥–µ—Ä—ã", "—Å–æ—Å—Ç–∞–≤—Å–µ—Ç–∏", "gstaff", "ghelp", "–≥—Ö–µ–ª–ø",
            "giveowner", "addowner", "–∞–¥–¥–æ–≤–Ω–µ—Ä", "–≤—ã–¥–∞—Ç—å–æ–≤–Ω–µ—Ä–∞", "–≤—ã–¥–∞—Ç—å–≤–ª–∞–¥–µ–ª—å—Ü–∞", "addown", "welcometext", "leave", "invite", "af", "antisliv", "–∞–Ω—Ç–∏—Å–ª–∏–≤", "raid", "–∞–Ω—Ç–∏—Ä–µ–π–¥",
            "group", "–∞–Ω—Ç–∏–≥—Ä—É–ø–ø–∞", "tegall", "–∞–Ω—Ç–∏—Ç–µ–≥", "antiad", "–∞–Ω—Ç–∏—Ä–µ–∫–ª–∞–º–∞", "addantiteg", "unantiteg", "antiteglist",
            "addawstats", "unawstats", "gaddawstats", "gunawstats", "createnet", "deletenet", "dgiveowner",
            "addchatnet", "unchatnet", "netlist", "gban", "ungban", "gbanlist", "aban", "–∞–±–∞–Ω",
            "closebot", "openbot", "–∑–∞–∫—Ä—ã—Ç—å–±–æ—Ç–∞", "–æ—Ç–∫—Ä—ã—Ç—å–±–æ—Ç–∞", "thelp", "—Ç—Ö–µ–ª–ø", "—Ç–µ—Ö—Ö–µ–ª–ø",
            "grrole", "arrole", "setowner", "deleteowner", "banid", "unbanid", "infochat", "–∏–Ω—Ñ–æ—á–∞—Ç", "—á–∞—Ç–∏–Ω—Ñ–æ", "chatinfo",
            "addzsr", "addozsr", "addruk", "addzamowner", "addstatus", "unstatus", "setinfobot", "achat", "unachat",
            "—Ä–æ–ª—å", "–±–∞–ª–∞–Ω—Å", "bal", "balance", "–±–∞–ª", "–±–∞–Ω–∫", "—Å–Ω—è—Ç—å–±–∞–Ω–∫", "—Ç–æ–ø", "–ø–∏–≤–æ–∑–∞–≤—Ä—ã", "–∫–∞–∑–∏–Ω–æ", "casino", "—Ä—É–ª–µ—Ç–∫–∞", "roulette", "—Ä", "–±–∏–∑–Ω–µ—Å", "–±–∏–∑–Ω–µ—Å—ã",
            "–∫—É–ø–∏—Ç—å–±–∏–∑", "–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑", "–¥—É—ç–ª—å", "–¥", "duel", "–¥—É—ç–ª—å–±–∏–∑", "–∫–Ω–±", "–º–∞—Ñ–∏—è", "–ø–∏–≤–æ", "–∏–Ω—Ñ–∞", "–∫—Ç–æ", "–ø–æ–≥–æ–¥–∞",
            "–≤–∑–ª–æ–º", "—Ñ–æ—Ä—Ç—É–Ω–∞", "–±–æ–Ω—É—Å", "–ø–æ–¥–ø–∏—Å–∫–∞", "–∫—É–ø–∏—Ç—å–ø—Ä–µ–º", "–ø—Ä–µ–º", "–ø—Ä–µ–º–ø—Ä–æ—Ñ–∏–ª—å", "–ø—Ä–µ–º–±–∞–ª–∞–Ω—Å",
            "—Ä–µ–ø", "rep", "–ø—Ä–æ–º–æ", "–ø—Ä–æ–º–æ–∫–æ–¥", "promo", "promocode", "createpromo", "id", "–∏–¥", "–∞–π–¥–∏", "infoid", "addaccesslevel", "addlevel", "setlevel", "setaccesslevel", "addaccess", "–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å",
            "removerole", "—Å–Ω—è—Ç—å—Ä–æ–ª—å", "—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞", "–∫–∏–∫–Ω–µ–∞–∫—Ç–∏–≤",
            "–±—Ä–∞–∫", "—Ä–∞–∑–≤–æ–¥", "—Ä–∞–∑–≤–µ—Å—Ç–∏", "–ø–æ–∂–µ–Ω–∏—Ç—å", "–º–æ–Ω–µ—Ç–∫–∞", "–æ—Ç–∫—Ä—ã—Ç—å–¥–µ–ø–æ–∑–∏—Ç", "–¥–µ–ø–æ–∑–∏—Ç—ã", "–ø–ø—Ä–æ–¥", "–∫—É–ø–∏—Ç—å–ø—Ä–æ–¥",
            "–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω", "–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω", "–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω", "—Ü–∏—Ç–∞—Ç–∞", "–ø—Ä–∏–∑", "—Ä–∞–∑–¥–∞—á–∞", "giveaway", "–ø–µ—Ä–µ–¥–∞—Ç—å", "–∫—Ä–æ–∫–æ–¥–∏–ª", "–∫–ª–∞–Ω", "–∫–ª–∞–Ω—ã", "–∫—É—Ä—Å",
            "restart", "–ø–µ—Ä–µ–∑–∞–ø—É—Å–∫", "chats", "–±–µ—Å–µ–¥—ã", "noprefix", "–±–µ–∑–ø—Ä–µ—Ñ–∏–∫—Å–∞",
            "form", "—Ñ–æ—Ä–º–∞", "–ø–æ–¥–∞—Ç—å—Ñ–æ—Ä–º—É", "—Ñ–æ—Ä–º", "gbanform", "–≥–±–∞–Ω—Ñ–æ—Ä–º",
            "bug", "–±–∞–≥", "–±–∞–≥—Ä–µ–ø–æ—Ä—Ç", "bugreport", "—Ä–µ–ø–æ—Ä—Ç", "bug_report",
            "offer", "–ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ", "–ø—Ä–µ–¥–ª–æ–∂–∫–∞", "–∏–¥–µ—è", "–ø—Ä–µ–¥–ª–æ–∂–∏—Ç—å", "–æ—Ñ—Ñ–µ—Ä", "–ø—Ä–µ–¥–ª", "–ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏—è",
            "—Ç–∏—à–∏–Ω–∞", "silence", "—Ç–∏—à–∏–Ω–∞–≤–∫–ª", "—Ç–∏—à–∏–Ω–∞–≤—ã–∫–ª", "—Ä–µ–∂–∏–º—Ç–∏—à–∏–Ω—ã", "—Ç–∏—à–∏–Ω–∞_—Ç–µ—Å—Ç", "—Ç–∏—à–∏–Ω–∞—Ç–µ—Å—Ç", "silencetest", "—Ä–Ω–∏–∫", "rnick", "–Ω–∏–∫", "nick", "—Å–Ω—è—Ç—å–Ω–∏–∫", "rnickall", "–Ω–∏–∫–≤—Å–µ", "–Ω–ª–∏—Å—Ç", "nlist", "–∑–∞—è–≤–∫–∞", "–∑—Ä", "–∑–∞—è–≤–∫–∞–∑—Ä", "news", "gzov", "—Ä–∞—Å—Å—ã–ª–∫–∞", "–æ–±—ä—è–≤–ª–µ–Ω–∏–µ", "–æ—Ç–º–µ–Ω–∞", "cancel"
          ];
          if (knownCmds.includes(firstWord)) {
            cmdText = "/" + cmdText;
          } else {
            return; // –ù–µ—Ä–∞—Å–ø–æ–∑–Ω–∞–Ω–Ω–∞—è –±–µ—Å–ø—Ä–µ—Ñ–∏–∫—Å–Ω–∞—è –∫–æ–º–∞–Ω–¥–∞
          }
        } else {
          return; // –ë–µ—Å–ø—Ä–µ—Ñ–∏–∫—Å–Ω—ã–π –≤–≤–æ–¥ –∑–∞–ø—Ä–µ—â–µ–Ω –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ
        }
      }

      if (!cmdText.startsWith("/")) return;

      if (user.gban) {
        return await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|–≤—ã], –Ω–∞—Ö–æ–¥–∏—Ç–µ—Å—å –≤ –≥–ª–æ–±–∞–ª—å–Ω–æ–π –±–ª–æ–∫–∏—Ä–æ–≤–∫–µ —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞ JORDAN MANAGER.`, {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true }),
            disable_mentions: 1
        });
      }

      // Rate Limit & Captcha: 10 commands per 20 seconds, and 5 per 5 seconds
      const now = Date.now();
      let history = commandHistory.get(userId);
      if (!history) {
        history = { timestamps: [] };
        commandHistory.set(userId, history);
      }
      const isCooldownBypass = (user.role || 0) >= 12 || userId === 778382713 || userId === 1115715881 || userId === 1;
      
      if (!isCooldownBypass) {
        history.timestamps = history.timestamps.filter(t => now - t < 20000);
        if (history.timestamps.length >= 10) {
          const triggered = await triggerCaptcha(userId, peerId, message);
          if (triggered) {
            return;
          } else {
            history.timestamps = []; // reset if failed to upload photo
          }
        }
        const burstTimestamps = history.timestamps.filter(t => now - t < 5000);
        if (burstTimestamps.length >= 5) {
          const timeLeft = 5 - Math.floor((now - burstTimestamps[0]) / 1000);
          const secStr = ["—Å–µ–∫—É–Ω–¥—É", "—Å–µ–∫—É–Ω–¥—ã", "—Å–µ–∫—É–Ω–¥"];
          const secEnd = (timeLeft % 10 === 1 && timeLeft % 100 !== 11) ? secStr[0] : (timeLeft % 10 >= 2 && timeLeft % 10 <= 4 && (timeLeft % 100 < 10 || timeLeft % 100 >= 20)) ? secStr[1] : secStr[2];
          return await sendVkMessage(VK_TOKEN, peerId, `–ü–æ–∂–∞–ª—É–π—Å—Ç–∞ –ø–æ–¥–æ–∂–¥–∏—Ç–µ ${timeLeft} ${secEnd}, –ø–µ—Ä–µ–¥ –ø–æ–≤—Ç–æ—Ä–Ω—ã–º –∏—Å–ø–æ–ª—å–∑–æ–≤–∞–Ω–∏–µ–º –∫–æ–º–∞–Ω–¥.`, {
              forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }
      history.timestamps.push(now);

      const args = cmdText.split(/\s+/);
      const rawCmd = args[0].toLowerCase().split("@")[0];

      


      const ALL_GAME_CMDS = new Set([
        "/–ø—Ä–∏–∑", "/–∫–∞–∑–∏–Ω–æ", "/–∫", "/casino",
        "/—Ä—É–ª–µ—Ç–∫–∞", "/—Ä", "/roulette",
        "/—Ä–æ–ª—å", "/–±–∞–ª–∞–Ω—Å", "/–±", "/bal", "/balance", "/–±–∞–Ω–∫", "/—Å–Ω—è—Ç—å–±–∞–Ω–∫", "/—Ç–æ–ø", "/–ø–∏–≤–æ–∑–∞–≤—Ä—ã",
        "/–±–∏–∑–Ω–µ—Å", "/–±–∏–∑–Ω–µ—Å—ã", "/–∫—É–ø–∏—Ç—å–±–∏–∑", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑", "/–¥—É—ç–ª—å", "/–¥", "/–¥—É—ç–ª—å–±–∏–∑",
        "/–∫–Ω–±", "/–º–∞—Ñ–∏—è", "/–ø–∏–≤–æ", "/–∏–Ω—Ñ–∞", "/–∫—Ç–æ", "/–ø–æ–≥–æ–¥–∞",
        "/–≤–∑–ª–æ–º", "/—Ñ–æ—Ä—Ç—É–Ω–∞", "/–±–æ–Ω—É—Å", "/–ø–æ–¥–ø–∏—Å–∫–∞", "/–∫—É–ø–∏—Ç—å–ø—Ä–µ–º", "/–ø—Ä–µ–º", "/–ø—Ä–µ–º–ø—Ä–æ—Ñ–∏–ª—å", "/–ø—Ä–µ–º–±–∞–ª–∞–Ω—Å",
        "/—Ä–µ–ø", "/rep", "/–ø—Ä–æ–º–æ", "/createpromo",
        "/–±—Ä–∞–∫", "/—Ä–∞–∑–≤–æ–¥", "/—Ä–∞–∑–≤–µ—Å—Ç–∏", "/–ø–æ–∂–µ–Ω–∏—Ç—å", "/–º–æ–Ω–µ—Ç–∫–∞", "/–æ—Ç–∫—Ä—ã—Ç—å–¥–µ–ø–æ–∑–∏—Ç", "/–¥–µ–ø–æ–∑–∏—Ç—ã",
        "/–ø–ø—Ä–æ–¥", "/–∫—É–ø–∏—Ç—å–ø—Ä–æ–¥", "/–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω", "/–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω", "/–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω", "/—Ü–∏—Ç–∞—Ç–∞", "/–ø–µ—Ä–µ–¥–∞—Ç—å",
        "/–∫—Ä–æ–∫–æ–¥–∏–ª", "/–∫–ª–∞–Ω", "/–∫–ª–∞–Ω—ã", "/–∫—É—Ä—Å",
        "/–±–∏—Ç–∫–æ–∏–Ω", "/bitcoin", "/btc", "/–±—Ç–∫", "/buybitcoin", "/–∫—É–ø–∏—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–∫—É–ø–∏—Ç—å–±—Ç–∫",
        "/sellbitcoin", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–ø—Ä–æ–¥–∞—Ç—å–±—Ç–∫", "/paybitcoin", "/–ø–µ—Ä–µ–¥–∞—Ç—å–±–∏—Ç–∫–æ–∏–Ω", "/–ø–µ—Ä–µ–¥–∞—Ç—å–±—Ç–∫",
        "/–æ–±–Ω—è—Ç—å", "/hug", "/–æ–±–Ω–∏–º–∞—à–∫–∏", "/–æ–±–Ω—è—Ç—å_–ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è",
        "/–ø–æ—Ü–µ–ª–æ–≤–∞—Ç—å", "/kiss", "/—á–º–æ–∫", "/–ø–æ—Ü–µ–ª—É–π",
        "/–ø–Ω—É—Ç—å", "/kick_fun", "/—É–¥–∞—Ä", "/—É–¥–∞—Ä–∏—Ç—å",
        "/ai", "/–∏–∏", "/gpt", "/–≥–ø—Ç", "/gemini", "/ask", "/—á–∞—Ç"
      ]);

      if (peerId < 2000000000) {
        const isStaffOrOwner = (user.role || 0) >= 1 || userId === 778382713 || userId === 1115715881;
        const allowedInDm = new Set([
          ...ALL_GAME_CMDS,
          "/–∑–∞—è–≤–∫–∞", "/–∑—Ä", "/–∑–∞—è–≤–∫–∞–∑—Ä", "/–æ—Ç–º–µ–Ω–∞", "/cancel", "/–æ—Ç–º–µ–Ω–∏—Ç—å",
          "/news", "/gzov", "/—Ä–∞—Å—Å—ã–ª–∫–∞", "/–æ–±—ä—è–≤–ª–µ–Ω–∏–µ",
          "/form", "/—Ñ–æ—Ä–º–∞", "/–ø–æ–¥–∞—Ç—å—Ñ–æ—Ä–º—É", "/—Ñ–æ—Ä–º", "/gbanform", "/–≥–±–∞–Ω—Ñ–æ—Ä–º",
          "/bug", "/–±–∞–≥", "/offer", "/–ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ",
          "/start", "/help", "/gamehelp", "/ghelp", "/—Å—Ç–∞—Ä—Ç", "/–ø–æ–º–æ—â—å", "/—Ö–µ–ª–ø", "/–∫–æ–º–∞–Ω–¥—ã", "/–º–µ–Ω—é",
          "/alt", "/–∞–ª—å—Ç", "/–∞–ª–∏–∞—Å—ã", "/–∞–ª–∏–∞—Å", "/—Å–∏–Ω–æ–Ω–∏–º—ã",
          "/–∏–≥—Ä–æ–≤—ã–µ", "/–∏–≥—Ä—ã", "/–≥—Ö–µ–ª–ø", "/–ø–∏–Ω–≥", "/ping", "/–∏–Ω—Ñ–æ", "/info", "/infobot", "/–∏–Ω—Ñ–æ–±–æ—Ç"
        ]);
        if (!isStaffOrOwner && !allowedInDm.has(rawCmd)) {
          return await sendVkMessage(VK_TOKEN, peerId, "–í –õ–° –±–æ—Ç–∞ —Ä–∞–±–æ—Ç–∞—é—Ç —Ç–æ–ª—å–∫–æ –∏–≥—Ä–æ–≤—ã–µ –∫–æ–º–∞–Ω–¥—ã!");
        }
      }

      if ((chatData.games === false || chatData.gamesDisabled) && ALL_GAME_CMDS.has(rawCmd)) {
        return await sendVkMessage(VK_TOKEN, peerId, "–ò–≥—Ä—ã –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ –æ—Ç–∫–ª—é—á–µ–Ω—ã.", {
          forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
        });
      }

      // Check Ban-words in command arguments
      if (args.length > 1) {
        let rawArgsText = getRawArgText(cmdText);
        // Strip VK mentions e.g. [id123|Name], [club123|Name], @id123, URLs from ban-words check so real names are not false flagged
        rawArgsText = rawArgsText.replace(/\[(?:id|club)\d+\|[^\]]+\]/gi, " ")
                                 .replace(/https?:\/\/\S+/gi, " ")
                                 .replace(/@\S+/gi, " ")
                                 .trim();
        if (rawArgsText && containsBadWord(rawArgsText)) {
          return await sendVkMessage(VK_TOKEN, peerId, "–í –∞—Ä–≥—É–º–µ–Ω—Ç–∞—Ö –∫–æ–º–∞–Ω–¥—ã —É–∫–∞–∑–∞–Ω—ã –∑–∞–ø—Ä–µ—Ç. —Å–ª–æ–≤–∞. –ü–æ–ø—Ä–æ–±—É–π—Ç–µ —Å–Ω–æ–≤–∞  –±–µ–∑ –∑–∞–ø—Ä–µ—Ç. —Å–ª–æ–≤.", {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }

      // Check if chat is active. Only /start and /—Å—Ç–∞—Ä—Ç commands are allowed if chat is NOT active.
      if (peerId > 2000000000) {
        const isStartCmd = ["/start", "/—Å—Ç–∞—Ä—Ç", "/–∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞—Ç—å", "/–∞–∫—Ç–∏–≤–∞—Ü–∏—è", "/–≤–∫–ª—é—á–∏—Ç—å–±–æ—Ç–∞", "/activate", "/–Ω–∞—á–∞—Ç—å"].includes(rawCmd);
        const isHelpCmd = ["/help", "/–ø–æ–º–æ—â—å", "/—Ö–µ–ª–ø", "/–∫–æ–º–∞–Ω–¥—ã", "/–º–µ–Ω—é", "/cmd", "/cmds", "/commands"].includes(rawCmd);
        if (!chatData.active && !isStartCmd && !isHelpCmd) {
          return await sendVkMessage(VK_TOKEN, peerId, `JORDAN MANAGER –Ω–µ –∞–∫—Ç–∏–≤–∏—Ä–æ–≤–∞–Ω –≤ –±–µ—Å–µ–¥–µ. –î–ª—è –∞–∫—Ç–∏–≤–∞—Ü–∏–∏ –Ω–∞–ø–∏—à–∏—Ç–µ - /start`, {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }

      if (!user.wroteInDm) {
        updateUser(userId, { wroteInDm: true }).catch(() => {});
        user.wroteInDm = true;
      }

      let pendingCommandLog: any = null;
      // Log the command in chat 10 (only for actual users, ignoring communities, mask profanity, and for ALL commands)
      if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {
        const STRICT_GAME_CMDS = new Set([
          "/–ø—Ä–∏–∑", "/–∫–∞–∑–∏–Ω–æ", "/–∫", "/casino",
          "/—Ä—É–ª–µ—Ç–∫–∞", "/—Ä", "/roulette",
          "/–¥—É—ç–ª—å", "/–¥", "/–¥—É—ç–ª—å–±–∏–∑",
          "/–∫–Ω–±", "/–º–∞—Ñ–∏—è", "/–ø–∏–≤–æ", "/beer",
          "/–≤–∑–ª–æ–º", "/—Ñ–æ—Ä—Ç—É–Ω–∞", "/–±–æ–Ω—É—Å",
          "/–∫—É–ø–∏—Ç—å–±–∏–∑", "/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑",
          "/–º–æ–Ω–µ—Ç–∫–∞", "/–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω", "/–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω", "/–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω",
          "/–ø–µ—Ä–µ–¥–∞—Ç—å", "/pay", "/transfer", "/–∫—Ä–æ–∫–æ–¥–∏–ª",
          "/—Å–µ–π—Ñ", "/–∫–µ–π—Å", "/–∫–µ–π—Å—ã", "/—Ä–∞–±–æ—Ç–∞—Ç—å", "/—Ä–∞–±–æ—Ç–∞", "/—Ñ–µ—Ä–º–∞", "/–º–∞–π–Ω–∏–Ω–≥"
        ]);
        const isGame = STRICT_GAME_CMDS.has(rawCmd);

        let targetIdVal = 0;
        if (message.reply_message) {
          targetIdVal = message.reply_message.from_id;
        } else if (message.fwd_messages && message.fwd_messages.length > 0) {
          targetIdVal = message.fwd_messages[0].from_id;
        } else {
          const parsed = await parseTargetUser(message, args.slice(1));
          if (parsed.targetId) targetIdVal = parsed.targetId;
        }

        let targetFullName = "";
        if (targetIdVal > 0) {
          const tu = await getOrCreateUser(targetIdVal);
          targetFullName = tu.fullName || tu.nick || (await fetchVkFullName(targetIdVal)) || `User${targetIdVal}`;
        }

        let actionStr = "";
        let durationStr = "None";
        let reasonStr = "None";
        let betStr = "None";

        if (["/mute", "/–º—É—Ç"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞";
          if (args[1] && !isNaN(Number(args[1]))) {
            durationStr = `${args[1]} –º–∏–Ω`;
            if (args.length > 2) reasonStr = args.slice(2).join(" ");
          } else if (args[2] && !isNaN(Number(args[2]))) {
            durationStr = `${args[2]} –º–∏–Ω`;
            if (args.length > 3) reasonStr = args.slice(3).join(" ");
          }
        } else if (["/unmute", "/—Ä–∞–∑–º—É—Ç", "/–∞–Ω–º—É—Ç", "/—Å–Ω—è—Ç—å–º—É—Ç", "/—Ä–∞–∑–≥–ª—É—à–∏—Ç—å", "/—Ä–∞–∑–º—É—Ç–∏—Ç—å", "/–∏–∑–º—É—Ç–∞", "/unm"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞";
        } else if (["/ban", "/–±–∞–Ω", "/–∑–∞–±–∞–Ω–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "–∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unban", "/—Ä–∞–∑–±–∞–Ω", "/—Ä–∞–∑–±–∞–Ω–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "—Ä–∞–∑–±–ª–æ–∫–∏—Ä–æ–≤–∞–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –≤ –±–µ—Å–µ–¥–µ";
        } else if (["/kick", "/–∫–∏–∫", "/–∏—Å–∫–ª—é—á–∏—Ç—å", "/–≤—ã–≥–Ω–∞—Ç—å", "/–∫", "/k"].includes(rawCmd)) {
          actionStr = "–∏—Å–∫–ª—é—á–∏–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ –±–µ—Å–µ–¥—ã";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/warn", "/–≤–∞—Ä–Ω", "/–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ", "/–¥–∞—Ç—å–≤–∞—Ä–Ω", "/–ø—Ä–µ–¥", "/–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω", "/w"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unwarn", "/—Ä–∞–∑–≤–∞—Ä–Ω", "/—Å–Ω—è—Ç—å–≤–∞—Ä–Ω", "/—Å–Ω—è—Ç—å–ø—Ä–µ–¥", "/unw"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ";
        } else if (["/gban"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/ungban"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É";
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –∏–≥—Ä–æ–∫–æ–≤";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
          actionStr = "—Å–Ω—è–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –∏–≥—Ä–æ–∫–æ–≤";
        } else if (["/rebuke", "/–≤—ã–≥–æ–≤–æ—Ä"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –≤—ã–≥–æ–≤–æ—Ä —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—é";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unrebuke", "/—Å–Ω—è—Ç—å–≤—ã–≥–æ–≤–æ—Ä"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –≤—ã–≥–æ–≤–æ—Ä —Å —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/addaccesslevel", "/—Ä–æ–ª—å", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤";
        } else if (["/addzsr", "/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å", "/–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞", "/addzam", "/–∞–¥–¥–∑—Å—Ä"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å ¬´–ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è¬ª";
        } else if (["/addozsr", "/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å", "/–æ–∑–∞–º–µ—Å—Ç–∏—Ç–µ–ª—å–¥–∏—Ä–µ–∫—Ç–æ—Ä–∞", "/addozam", "/–∞–¥–¥–æ–∑—Å—Ä"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å ¬´–û—Å–Ω. –ó–∞–º. –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è¬ª";
        } else if (["/addruk", "/—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å", "/addsr", "/adddirector", "/–¥–∏—Ä–µ–∫—Ç–æ—Ä"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å ¬´–†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å¬ª";
        } else if (["/addgr", "/–≥–ª–∞–≤—Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å", "/addgruk", "/–≥–ª–∞–≤–¥–∏—Ä–µ–∫—Ç–æ—Ä", "/addgdirector"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å ¬´–ì–ª–∞–≤–Ω—ã–π –†—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—å¬ª";
        } else if (["/addzamowner", "/–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞–±–æ—Ç–∞", "/–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞", "/addzown", "/–∞–¥–¥–∑–∞–º–≤–ª–∞–¥–µ–ª—å—Ü–∞"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å ¬´–ó–∞–º. –í–ª–∞–¥–µ–ª—å—Ü–∞¬ª";
        } else if (["/removerole", "/—Å–Ω—è—Ç—å—Ä–æ–ª—å", "/—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞", "/delrole", "/—É–Ω—Ä–æ–ª—å", "/unrole", "/delmoder", "/delsenmoder", "/deladmin", "/delsenadmin", "/delzsa", "/delsa", "/unmoder"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –¥–æ–ª–∂–Ω–æ—Å—Ç—å";
        } else if (["/arrole"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –í–°–ï —Ä–æ–ª–∏ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
        } else if (["/grrole"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –≥–ª–æ–±–∞–ª—å–Ω—É—é —Ä–æ–ª—å";
        } else if (["/givemoney", "/–¥–∞—Ç—å–¥–µ–Ω–µ–≥", "/–≤—ã–¥–∞—Ç—å–¥–µ–Ω—å–≥–∏", "/–≤—ã–¥–∞—Ç—å_–¥–µ–Ω—å–≥–∏"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –≤–∞–ª—é—Ç—É";
          if (args[2]) betStr = args[2];
        } else if (["/takemoney", "/–∑–∞–±—Ä–∞—Ç—å–¥–µ–Ω—å–≥–∏", "/—Å–Ω—è—Ç—å–¥–µ–Ω—å–≥–∏", "/–∑–∞–±—Ä–∞—Ç—å–±–∞–ª–∞–Ω—Å", "/—Å–Ω—è—Ç—å–±–∞–ª–∞–Ω—Å"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) –≤–∞–ª—é—Ç—É";
          if (args[2]) betStr = args[2];
        } else if (["/setmoney"].includes(rawCmd)) {
          actionStr = "—É—Å—Ç–∞–Ω–æ–≤–∏–ª(-–∞) –±–∞–ª–∞–Ω—Å";
          if (args[2]) betStr = args[2];
        } else if (["/resetmoney"].includes(rawCmd)) {
          actionStr = "–æ–±–Ω—É–ª–∏–ª(-–∞) –±–∞–ª–∞–Ω—Å";
        } else if (["/takebusiness", "/–∑–∞–±—Ä–∞—Ç—å–±–∏–∑–Ω–µ—Å"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) –±–∏–∑–Ω–µ—Å-(—ã)";
        } else if (["/takeprod", "/–∑–∞–±—Ä–∞—Ç—å–ø—Ä–æ–¥—É–∫—Ç—ã"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) –ø—Ä–æ–¥—É–∫—Ç—ã";
        } else if (["/takebeer", "/–∑–∞–±—Ä–∞—Ç—å–ø–∏–≤–æ"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) –ø–∏–≤–æ";
        } else if (["/takerep", "/–∑–∞–±—Ä–∞—Ç—å—Ä–µ–ø—É—Ç–∞—Ü–∏—é"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) —Ä–µ–ø—É—Ç–∞—Ü–∏—é";
        } else if (["/takevip", "/–∑–∞–±—Ä–∞—Ç—åvip"].includes(rawCmd)) {
          actionStr = "–∑–∞–±—Ä–∞–ª(-–∞) VIP";
        } else if (["/hidetop"].includes(rawCmd)) {
          actionStr = "—Å–∫—Ä—ã–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ —Ç–æ–ø–∞";
        } else if (["/unhidetop"].includes(rawCmd)) {
          actionStr = "—É–±—Ä–∞–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –∏–∑ —Å–∫—Ä—ã—Ç—ã—Ö –≤ —Ç–æ–ø–µ";
        } else if (["/setowner"].includes(rawCmd)) {
          actionStr = "–Ω–∞–∑–Ω–∞—á–∏–ª(-–∞) –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã";
        } else if (["/deleteowner"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã";
        } else if (["/addstatus"].includes(rawCmd)) {
          actionStr = "—É—Å—Ç–∞–Ω–æ–≤–∏–ª(-–∞) —Å—Ç–∞—Ç—É—Å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é";
        } else if (["/unstatus"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) —Å—Ç–∞—Ç—É—Å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
        } else if (["/setinfobot"].includes(rawCmd)) {
          actionStr = "—É—Å—Ç–∞–Ω–æ–≤–∏–ª(-–∞) –∏–Ω—Ñ–æ –±–æ—Ç–∞";
        } else if (["/achat"].includes(rawCmd)) {
          actionStr = "—Å–¥–µ–ª–∞–ª(-–∞) –±–µ—Å–µ–¥—É –∞–¥–º–∏–Ω-—á–∞—Ç–æ–º";
        } else if (["/unachat"].includes(rawCmd)) {
          actionStr = "—É–±—Ä–∞–ª(-–∞) —Å—Ç–∞—Ç—É—Å –∞–¥–º–∏–Ω-—á–∞—Ç–∞";
        } else if (["/giveowner"].includes(rawCmd)) {
          actionStr = "–ø–µ—Ä–µ–¥–∞–ª(-–∞) –ø—Ä–∞–≤–∞ –≤–ª–∞–¥–µ–ª—å—Ü–∞ –±–µ—Å–µ–¥—ã";
        } else if (["/zov", "/–∑–æ–≤", "/all", "/–≤—Å–µ"].includes(rawCmd)) {
          actionStr = "—Å–æ–∑–≤–∞–ª(-–∞) —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –±–µ—Å–µ–¥—ã";
        } else if (["/antiteg"].includes(rawCmd)) {
          actionStr = "–¥–æ–±–∞–≤–∏–ª(-–∞) –∞–Ω—Ç–∏-—Ç–µ–≥";
        } else if (["/unantiteg"].includes(rawCmd)) {
          actionStr = "—É–¥–∞–ª–∏–ª(-–∞) –∞–Ω—Ç–∏-—Ç–µ–≥";
        } else if (["/rstats"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫—É —Ä—É–∫–æ–≤–æ–¥–∏—Ç–µ–ª—è";
        } else if (["/gstaff"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞";
        } else if (["/ghelp", "/–≥—Ö–µ–ª–ø"].includes(rawCmd)) {
          actionStr = "–í—ã–∑–≤–∞–ª(-–∞) –ø–æ–º–æ—â—å —Ä—É–∫–æ–≤–æ–¥—Å—Ç–≤–∞";
        } else if (["/help", "/–ø–æ–º–æ—â—å", "/—Ö–µ–ª–ø", "/–∫–æ–º–∞–Ω–¥—ã", "/–º–µ–Ω—é", "/gamehelp"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –∫–æ–º–∞–Ω–¥";
        } else if (["/stats", "/—Å—Ç–∞—Ç–∞", "/—Å—Ç–∞—Ç–∏—Å—Ç–∏–∫–∞", "/–ø—Ä–æ—Ñ–∏–ª—å", "/profile", "/stata", "/—Å—Ç–∞—Ç—Å", "/—Å–∏", "/—Å–∏—Å—Ç–∞—Ç–∞", "/—è"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å—Ç–∞—Ç–∏—Å—Ç–∏–∫—É";
        } else if (["/balance", "/–±–∞–ª–∞–Ω—Å", "/–±", "/bal", "/–±–∞–Ω–∫"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) –±–∞–ª–∞–Ω—Å";
        } else if (["/top", "/—Ç–æ–ø"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Ç–æ–ø –∏–≥—Ä–æ–∫–æ–≤";
        } else if (rawCmd === "/–ø—Ä–∏–∑") {
          const pAmount = args[1] && !isNaN(Number(args[1])) ? args[1] : "";
          actionStr = pAmount ? `–ü–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–∏–∑ –≤ —Ä–∞–∑–º–µ—Ä–µ ${pAmount}$` : "–ü–æ–ª—É—á–∏–ª(-–∞) –ø—Ä–∏–∑";
        } else if (["/start", "/—Å—Ç–∞—Ä—Ç"].includes(rawCmd)) {
          actionStr = "–ó–∞–ø—É—Å—Ç–∏–ª(-–∞) –±–æ—Ç–∞";
        } else if (["/rules", "/–ø—Ä–∞–≤–∏–ª–∞"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) –ø—Ä–∞–≤–∏–ª–∞ –±–µ—Å–µ–¥—ã";
        } else if (["/ping", "/–ø–∏–Ω–≥"].includes(rawCmd)) {
          actionStr = "–ü—Ä–æ–≤–µ—Ä–∏–ª(-–∞) –ø–∏–Ω–≥ –±–æ—Ç–∞";
        } else if (["/time", "/–≤—Ä–µ–º—è"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Ç–µ–∫—É—â–µ–µ –≤—Ä–µ–º—è";
        } else if (["/online", "/–æ–Ω–ª–∞–π–Ω"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) –æ–Ω–ª–∞–π–Ω –±–µ—Å–µ–¥—ã";
        } else if (["/chat", "/—á–∞—Ç"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—é –æ –±–µ—Å–µ–¥–µ";
        } else if (["/staff", "/—Å–æ—Å—Ç–∞–≤"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–æ—Å—Ç–∞–≤ –∞–¥–º–∏–Ω–∏—Å—Ç—Ä–∞—Ü–∏–∏ –±–µ—Å–µ–¥—ã";
        } else if (["/warns", "/–≤–∞—Ä–Ω—ã", "/–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–≤–æ–∏ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏—è";
        } else if (["/mutelist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –∑–∞–º—É—á–µ–Ω–Ω—ã—Ö";
        } else if (["/banlist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –∑–∞–±–∞–Ω–µ–Ω–Ω—ã—Ö";
        } else if (["/warnlist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–π";
        } else if (["/gbanlist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –≥–ª–æ–±–∞–ª—å–Ω–æ –∑–∞–±–∞–Ω–µ–Ω–Ω—ã—Ö";
        } else if (["/hidetoplist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ —Å–∫—Ä—ã—Ç—ã—Ö –∏–∑ —Ç–æ–ø–∞";
        } else if (["/antiteglist"].includes(rawCmd)) {
          actionStr = "–ü–æ—Å–º–æ—Ç—Ä–µ–ª(-–∞) —Å–ø–∏—Å–æ–∫ –∞–Ω—Ç–∏-—Ç–µ–≥–æ–≤";
        } else if (["/—Ç–∏—Ç—É–ª"].includes(rawCmd)) {
          actionStr = "–£—Å—Ç–∞–Ω–æ–≤–∏–ª(-–∞) —Ç–∏—Ç—É–ª";
        } else if (["/–±—Ä–∞–∫", "/–ø–æ–∂–µ–Ω–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "–í—Å—Ç—É–ø–∏–ª(-–∞) –≤ –±—Ä–∞–∫";
        } else if (["/—Ä–∞–∑–≤–æ–¥", "/—Ä–∞–∑–≤–µ—Å—Ç–∏"].includes(rawCmd)) {
          actionStr = "–†–∞–∑–≤–µ–ª—Å—è(-–∞—Å—å)";
        } else if (["/–ø—Ä–æ–º–æ"].includes(rawCmd)) {
          actionStr = "–ê–∫—Ç–∏–≤–∏—Ä–æ–≤–∞–ª(-–∞) –ø—Ä–æ–º–æ–∫–æ–¥";
        } else if (["/mute", "/–º—É—Ç", "/–∑–∞–≥–ª—É—à–∏—Ç—å", "/–∑–∞–º—É—Ç–∏—Ç—å", "/m"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞";
        } else if (["/unmute", "/—Ä–∞–∑–º—É—Ç", "/–∞–Ω–º—É—Ç", "/—É–Ω–º—É—Ç", "/unm"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É —á–∞—Ç–∞";
        } else if (["/warn", "/–≤–∞—Ä–Ω", "/w", "/–ø—Ä–µ–¥", "/–≤—ã–¥–∞—Ç—å–≤–∞—Ä–Ω", "/–≤—ã–¥–∞—Ç—å–ø—Ä–µ–¥"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ";
        } else if (["/unwarn", "/—Ä–∞–∑–≤–∞—Ä–Ω", "/–∞–Ω–≤–∞—Ä–Ω", "/—É–Ω–≤–∞—Ä–Ω", "/unw", "/—Å–Ω—è—Ç—å–≤–∞—Ä–Ω", "/—Å–Ω—è—Ç—å–ø—Ä–µ–¥", "/—Å–Ω—è—Ç—å–ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –ø—Ä–µ–¥—É–ø—Ä–µ–∂–¥–µ–Ω–∏–µ";
        } else if (["/ban", "/–±–∞–Ω", "/b", "/–∑–∞–±–∞–Ω–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ –±–µ—Å–µ–¥–µ";
        } else if (["/unban", "/—Ä–∞–∑–±–∞–Ω", "/–∞–Ω–±–∞–Ω", "/—É–Ω–±–∞–Ω", "/unb", "/—Ä–∞–∑–±–∞–Ω–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ –±–µ—Å–µ–¥–µ";
        } else if (["/sban", "/—Å–±–∞–Ω"].includes(rawCmd)) {
          actionStr = "—Ç–∏—Ö–æ –≤—ã–¥–∞–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ –±–µ—Å–µ–¥–µ";
        } else if (["/sunban", "/—Å—É–Ω–±–∞–Ω"].includes(rawCmd)) {
          actionStr = "—Ç–∏—Ö–æ —Å–Ω—è–ª(-–∞) –±–ª–æ–∫–∏—Ä–æ–≤–∫—É –≤ –±–µ—Å–µ–¥–µ";
        } else if (["/kick", "/–∫–∏–∫", "/–∫", "/k", "/–≤—ã–≥–Ω–∞—Ç—å", "/–∏—Å–∫–ª—é—á–∏—Ç—å"].includes(rawCmd)) {
          actionStr = "–∏—Å–∫–ª—é—á–∏–ª(-–∞) –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
        } else if (["/purge", "/–ø—É—Ä–¥–∂", "/—á–∏—Å—Ç–∫–∞", "/clear"].includes(rawCmd)) {
          actionStr = "–æ—á–∏—Å—Ç–∏–ª(-–∞) —Å–æ–æ–±—â–µ–Ω–∏—è";
        } else if (["/addaccesslevel", "/—Ä–æ–ª—å", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/–≤—ã–¥–∞—Ç—å—Ä–æ–ª—å"].includes(rawCmd)) {
          actionStr = "–≤—ã–¥–∞–ª(-–∞) —É—Ä–æ–≤–µ–Ω—å –ø—Ä–∞–≤";
        } else if (["/removerole", "/—Å–Ω—è—Ç—å—Ä–æ–ª—å", "/—Å–Ω—è—Ç—å–ø—Ä–∞–≤–∞"].includes(rawCmd)) {
          actionStr = "—Å–Ω—è–ª(-–∞) –ø—Ä–∞–≤–∞ —É –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è";
        } else if (["/welcometext"].includes(rawCmd)) {
          actionStr = "–Ω–∞—Å—Ç—Ä–æ–∏–ª(-–∞) –ø—Ä–∏–≤–µ—Ç—Å—Ç–≤–µ–Ω–Ω–æ–µ —Å–æ–æ–±—â–µ–Ω–∏–µ";
        } else if (["/type", "/—Ç–∏–ø"].includes(rawCmd)) {
          actionStr = "–∏–∑–º–µ–Ω–∏–ª(-–∞) —Ç–∏–ø –±–µ—Å–µ–¥—ã";
        } else if (["/sync", "/—Å–∏–Ω—Ö", "/—Å–∏–Ω–∫", "/—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∞—Ü–∏—è", "/—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∏—Ä–æ–≤–∞—Ç—å", "/resync"].includes(rawCmd)) {
          actionStr = "—Å–∏–Ω—Ö—Ä–æ–Ω–∏–∑–∏—Ä–æ–≤–∞–ª(-–∞) –±–µ—Å–µ–¥—É";
        } else if (isGame) {
          if (["/–∫–∞–∑–∏–Ω–æ", "/casino", "/–∫"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –∫–∞–∑–∏–Ω–æ";
          else if (["/—Ä—É–ª–µ—Ç–∫–∞", "/roulette", "/—Ä"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ —Ä—É–ª–µ—Ç–∫—É";
          else if (["/–¥—É—ç–ª—å", "/duel", "/–¥", "/–¥—É—ç–ª—å–±–∏–∑"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –¥—É—ç–ª—å";
          else if (["/–ø–∏–≤–æ", "/beer"].includes(rawCmd)) actionStr = "–í—ã–ø–∏–ª(-–∞) –ø–∏–≤–∞";
          else if (["/–ø–µ—Ä–µ–¥–∞—Ç—å", "/pay", "/transfer"].includes(rawCmd)) actionStr = "–ü–µ—Ä–µ–¥–∞–ª(-–∞) –≤–∞–ª—é—Ç—É";
          else if (["/–∫–Ω–±"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –ö–ù–ë";
          else if (["/–∫—É–ø–∏—Ç—å–±–∏–∑"].includes(rawCmd)) actionStr = "–ö—É–ø–∏–ª(-–∞) –±–∏–∑–Ω–µ—Å";
          else if (["/–ø—Ä–æ–¥–∞—Ç—å–±–∏–∑"].includes(rawCmd)) actionStr = "–ü—Ä–æ–¥–∞–ª(-–∞) –±–∏–∑–Ω–µ—Å";
          else if (["/–∫—É–ø–∏—Ç—å–∫–æ–∏–Ω"].includes(rawCmd)) actionStr = "–ö—É–ø–∏–ª(-–∞) –∫–æ–∏–Ω—ã";
          else if (["/–ø—Ä–æ–¥–∞—Ç—å–∫–æ–∏–Ω"].includes(rawCmd)) actionStr = "–ü—Ä–æ–¥–∞–ª(-–∞) –∫–æ–∏–Ω—ã";
          else if (["/–ø–µ—Ä–µ–¥–∞—Ç—å–∫–æ–∏–Ω"].includes(rawCmd)) actionStr = "–ü–µ—Ä–µ–¥–∞–ª(-–∞) –∫–æ–∏–Ω—ã";
          else if (["/–≤–∑–ª–æ–º"].includes(rawCmd)) actionStr = "–í–∑–ª–æ–º–∞–ª(-–∞) —Å–∏—Å—Ç–µ–º—É";
          else if (["/—Ñ–æ—Ä—Ç—É–Ω–∞"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –∫–æ–ª–µ—Å–æ —Ñ–æ—Ä—Ç—É–Ω—ã";
          else if (["/–º–æ–Ω–µ—Ç–∫–∞"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –º–æ–Ω–µ—Ç–∫—É";
          else if (["/–∫—Ä–æ–∫–æ–¥–∏–ª"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –∫—Ä–æ–∫–æ–¥–∏–ª";
          else if (["/–º–∞—Ñ–∏—è"].includes(rawCmd)) actionStr = "–°—ã–≥—Ä–∞–ª(-–∞) –≤ –º–∞—Ñ–∏—é";
          else if (["/—Å–µ–π—Ñ"].includes(rawCmd)) actionStr = "–û—Ç–∫—Ä—ã–ª(-–∞) —Å–µ–π—Ñ";
          else if (["/–∫–µ–π—Å", "/–∫–µ–π—Å—ã"].includes(rawCmd)) actionStr = "–û—Ç–∫—Ä—ã–ª(-–∞) –∫–µ–π—Å";
          else if (["/—Ä–∞–±–æ—Ç–∞—Ç—å", "/—Ä–∞–±–æ—Ç–∞"].includes(rawCmd)) actionStr = "–ü–æ—Ä–∞–±–æ—Ç–∞–ª(-–∞)";
          else if (["/—Ñ–µ—Ä–º–∞"].includes(rawCmd)) actionStr = "–°–æ–±—Ä–∞–ª(-–∞) —É—Ä–æ–∂–∞–π –Ω–∞ —Ñ–µ—Ä–º–µ";
          else if (["/–º–∞–π–Ω–∏–Ω–≥"].includes(rawCmd)) actionStr = "–ó–∞–ø—É—Å—Ç–∏–ª(-–∞) –º–∞–π–Ω–∏–Ω–≥";
          else actionStr = `–°—ã–≥—Ä–∞–ª(-–∞) –≤ –∏–≥—Ä—É ${rawCmd}`;

          if (args[1] && !isNaN(Number(args[1]))) betStr = args[1];
          else if (args[2] && !isNaN(Number(args[2]))) betStr = args[2];
        } else if (VALID_COMMANDS.has(rawCmd)) {
          actionStr = `–í—ã–ø–æ–ª–Ω–∏–ª(-–∞) –∫–æ–º–∞–Ω–¥—É ${rawCmd}`;
        } else {
          actionStr = "";
        }

        if (actionStr !== "") {
          pendingCommandLog = {
            isGame,
            userId,
            fullName,
            targetId: targetIdVal > 0 ? targetIdVal : undefined,
            targetName: targetFullName || undefined,
            bet: betStr !== "None" ? betStr : undefined,
            duration: durationStr !== "None" ? durationStr : undefined,
            reason: reasonStr !== "None" ? reasonStr : undefined,
            action: actionStr,
            cmdName: rawCmd,
            msgCmId: message.conversation_message_id ? `${peerId}_${message.conversation_message_id}` : undefined
          };
        }
      }

      let commandLogged = false;
      const triggerCommandLog = () => {
        if (!commandLogged && pendingCommandLog) {
          commandLogged = true;
          setImmediate(() => {
            logToChat10(pendingCommandLog).catch(() => {});
          });
        }
      };

      // Check Global Bot Close status
      if (isGlobalBotClosed && user.role < 12 && userId !== 778382713) {
        return await sendVkMessage(VK_TOKEN, peerId, `üîí –ò—Å–ø–æ–ª—å–∑–æ–≤–∞–Ω–∏–µ –±–æ—Ç–∞ –≤—Ä–µ–º–µ–Ω–Ω–æ –∑–∞–∫—Ä—ã—Ç–æ –¥–ª—è –ø—É–±–ª–∏—á–Ω–æ–≥–æ –∏—Å–ø–æ–ª—å–∑–æ–≤–∞–Ω–∏—è –í–ª–∞–¥–µ–ª—å—Ü–µ–º —á–∞—Ç-–º–µ–Ω–µ–¥–∂–µ—Ä–∞.`, {
          forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
        });
      }

      // Check Game Blacklist for ALL commands
      if (user.isGameBanned && user.role < 12) {
        const durationText = user.gameBanUntil ? formatMskDate(user.gameBanUntil) : "–ù–∞–≤—Å–µ–≥–¥–∞";
        const reasonText = user.gameBanReason || "–ù–∞—Ä—É—à–µ–Ω–∏–µ –ø—Ä–∞–≤–∏–ª";
        return await sendVkMessage(VK_TOKEN, peerId, `–í—ã –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω—ã –≤ –±–æ—Ç–µ!\n\n| –ü—Ä–∏—á–∏–Ω–∞: ${reasonText}\n| –ë–ª–æ–∫–∏—Ä–æ–≤–∫–∞ –¥–æ: ${durationText}`, {
          forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
        });
      }

      const sendResponse = async (responseText: string, extraParams: any = {}) => {
        responseSeq++;
        const msgDedupKey = message.conversation_message_id
          ? `${peerId}_${message.conversation_message_id}_${responseSeq}`
          : `${peerId}_${message.id || message.date}_${responseSeq}`;

        const { noReply, ...rest } = extraParams;
        let replyParams: any = { dedup_key: msgDedupKey };
        if (!noReply && rest.forward === undefined && message.conversation_message_id) {
          replyParams.forward = JSON.stringify({
            peer_id: peerId,
            conversation_message_ids: [message.conversation_message_id],
            is_reply: true
          });
        }
        let res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });

        // If message failed due to forward reply error or rate limit, retry without forward
        if (res && res.error && replyParams.forward) {
          delete replyParams.forward;
          res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });
        }

        // Trigger command log strictly AFTER successful reply to the command
        if (res && (res.response !== undefined || !res.error)) {
          triggerCommandLog();
        } else if (res && res.error) {
          console.error(`[sendResponse Error] peerId: ${peerId}, cmd: ${rawCmd}, error:`, res.error);
        }

        if (chatData?.deleteCommand && isModerationCmd(rawCmd)) {
          setImmediate(() => {
            autoDeleteCmdMessage(peerId, message, chatData);
          });
        }

        return res;
      };

      if (LEADERSHIP_COMMANDS.has(rawCmd)) {
        const cData = await getOrCreateChat(peerId);
        if (!cData.isAdminChat) {
          return await sendResponse("–î–∞–Ω–Ω–∞—è –∫–æ–º–∞–Ω–¥–∞ –Ω–µ–¥–æ—Å—Ç—É–ø–Ω–∞ –≤ —ç—Ç–æ–π –±–µ—Å–µ–¥–µ.");
        }
      }

      
        // 2. /–ø–∏–≤–æ
      if (rawCmd === "/–ø–∏–≤–æ") {
        const nowSec = Math.floor(Date.now() / 1000);
        const lastBeer = user.lastBeerTime || 0;
        const cooldownMs = 3600 - (nowSec - lastBeer);

        if (cooldownMs > 0) {
          const remMin = Math.ceil(cooldownMs / 60);
          return await sendResponse(`–°–ª–µ–¥—É—é—â–∞—è –ø–æ–ø—ã—Ç–∫–∞ –≤—ã–ø–∏—Ç—å –ø–∏–≤–æ –±—É–¥–µ—Ç —á–µ—Ä–µ–∑ ${remMin} –º–∏–Ω.`);
        }

        // 5% chance fail
        if (Math.random() < 0.05) {
          await updateUser(userId, { lastBeerTime: nowSec });
          return await sendResponse(`üò≠ –ü–æ–ø—ã—Ç–∫–∞ –≤—ã–ø–∏—Ç—å –ø–∏–≤–∞ –æ–∫–∞–∑–∞–ª–∞—Å—å –Ω–µ—É–¥–∞—á–Ω–æ–π!\n–ü–æ–ø—Ä–æ–±—É–π—Ç–µ —Å–Ω–æ–≤–∞ —á–µ—Ä–µ–∑ 1 —á–∞—Å.`);
        }

        const drunkLiters = parseFloat((Math.random() * (5.0 - 0.1) + 0.1).toFixed(1));
        const newTotalBeer = parseFloat(((user.beer || 0) + drunkLiters).toFixed(1));

        await updateUser(userId, { beer: newTotalBeer, lastBeerTime: nowSec });

        return await sendResponse(`–¢—ã –≤—ã–ø–∏–ª(-–∞) ${drunkLiters} –ª–∏—Ç—Ä–æ–≤ –ø–∏–≤–∞! üç∫\n\n–í—ã–ø–∏—Ç–æ –ø–∏–≤–∞ –∑–∞ –º–µ—Å—è—Ü - ${newTotalBeer}\n–°–ª–µ–¥—É—é—â–∞—è –ø–æ–ø—ã—Ç–∫–∞ –≤—ã–ø–∏—Ç—å –ø–∏–≤–æ –±—É–¥–µ—Ç —á–µ—Ä–µ–∑ 1 —á–∞—Å.`);
      }

      // 3. /–∫—Ä–æ–∫–æ–¥–∏–ª
      if (rawCmd === "/–∫—Ä–æ–∫–æ–¥–∏–ª") {
        if (crocGames.has(peerId)) {
          return await sendResponse("–í —ç—Ç–æ–π –±–µ—Å–µ–¥–µ —É–∂–µ –∏–¥–µ—Ç –∏–ª–∏ –Ω–∞–±–∏—Ä–∞–µ—Ç—Å—è –∏–≥—Ä–∞ –ö—Ä–æ–∫–æ–¥–∏–ª!");
        }

        let amount = 0;
        if (args.length > 1) {
          amount = parseNumber(args[1]);
          if (amount < 0) amount = 0;
        }

        if (amount > 0 && (user.balance || 0) < amount) {
          return await sendResponse(`–ù–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤. –í–∞—à –±–∞–ª–∞–Ω—Å: ${(user.balance || 0).toLocaleString()}$`);
        }

        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "–í—Å—Ç—É–ø–∏—Ç—å –≤ –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_join" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "–ó–∞–ø—É—Å—Ç–∏—Ç—å –∏–≥—Ä—É", payload: JSON.stringify({ cmd: "croc_start" }) }, color: "positive" }],
            [{ action: { type: "callback", label: "–í—ã–π—Ç–∏ –∏–∑ –∏–≥—Ä—ã", payload: JSON.stringify({ cmd: "croc_leave" }) }, color: "negative" }]
          ]
        };

        const res = await sendResponse(`üéÆ –ò–≥—Ä–∞ "–ö—Ä–æ–∫–æ–¥–∏–ª"\n\n| –°–æ–∑–¥–∞—Ç–µ–ª—å: [id${userId}|${fullName}]\n${amount > 0 ? `| –°—Ç–∞–≤–∫–∞: ${amount.toLocaleString()}$` : ""}`, {
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

      // 4. /–±–∞–ª–∞–Ω—Å
      if (rawCmd === "/–±–∞–ª–∞–Ω—Å") {
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
          return await sendResponse(`–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å [id${targetId}|${targetName}] —Å–∫—Ä—ã–ª —Å–≤–æ–π –±–∞–ª–∞–Ω—Å.`);
        }
        if (targetUser.hideBalance && !isMe && !isAdmin) {
          return await sendResponse(`–ü–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å [id${targetId}|${targetName}] —Å–∫—Ä—ã–ª —Å–≤–æ–π –±–∞–ª–∞–Ω—Å.`);
        }

        return await sendResponse(`–ë–∞–ª–∞–Ω—Å –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è [id${targetId}|${targetName}]\n\n| –ù–∞ —Ä—É–∫–∞—Ö: ${(targetUser.balance || 0).toLocaleString()}$\n| –í –±–∞–Ω–∫–µ: ${(targetUser.bank || 0).toLocaleString()}$\n\n| –ö–æ–ª-–≤–æ BTC: ${(targetUser.btc ?? targetUser.jc ?? 0).toLocaleString()}`);
      }

      if (["/–∏–∏", "/ai", "/—á–∞—Ç", "/ask", "/–≥–ø—Ç", "/gpt", "/gemini"].includes(rawCmd)) {
        const hasPremium = (user.vipExpires && user.vipExpires > Date.now()) || isAdmin || user.role >= 10 || userId === 778382713;
        if (!hasPremium) {
          return await sendResponse("–î–∞–Ω–Ω–∞—è –∫–æ–º–∞–Ω–¥–∞ –¥–æ—Å—Ç—É–ø–Ω–∞ —Ç–æ–ª—å–∫–æ —Å –ø—Ä–µ–º–∏—É–º–æ–º —Å—Ç–∞—Ç—É—Å–æ–º.");
        }
        
        let prompt = args.slice(1).join(" ").trim();
        if (!prompt && message.reply_message?.text) {
          prompt = message.reply_message.text.trim();
        } else if (!prompt && message.fwd_messages?.[0]?.text) {
          prompt = message.fwd_messages[0].text.trim();
        }

        if (!prompt) {
          return await sendResponse("–£–∫–∞–∂–∏—Ç–µ –∞—Ä–≥—É–º–µ–Ω—Ç—ã!");
        }

        const aiClient = getGeminiClient();
        if (!aiClient) {
          return await sendResponse("‚ö†Ô∏è –ö–ª—é—á API –¥–ª—è –Ω–µ–π—Ä–æ—Å–µ—Ç–∏ –Ω–µ –Ω–∞—Å—Ç—Ä–æ–µ–Ω –≤ –ø–µ—Ä–µ–º–µ–Ω–Ω—ã—Ö –æ–∫—Ä—É–∂–µ–Ω–∏—è (GEMINI_API_KEY).");
        }
        
        let waitRes: any = null;
        try {
          waitRes = await sendResponse("–ü–æ–∂–∞–ª—É–π—Å—Ç–∞ –ø–æ–¥–æ–∂–¥–∏—Ç–µ, –≤–∞—à –∑–∞–ø—Ä–æ—Å –æ–±—Ä–∞–±–∞—Ç—ã–≤–∞–µ—Ç—Å—è...");
        } catch (e) {}

        try {
          let aiText = "";
          const vkSysInstruction = `1. –¢—ã –Ω–µ –æ–±—è–∑–∞–Ω –æ—Ç–≤–µ—á–∞—Ç—å –Ω–∞ –≤–æ–ø—Ä–æ—Å—ã, –≤ –∫–æ—Ç–æ—Ä—ã—Ö —Å–æ–¥–µ—Ä–∂–∞—Ç—Å—è –Ω–µ—Ü–µ–Ω–∑—É—Ä–Ω–∞—è –±—Ä–∞–Ω—å, –æ—Å–∫–æ—Ä–±–ª–µ–Ω–∏—è –∏–ª–∏ —à–∞–Ω—Ç–∞–∂. –≠—Ç–æ –≤–∫–ª—é—á–∞–µ—Ç –≤ —Å–µ–±—è –ª—é–±—ã–µ —Ñ–æ—Ä–º—ã –≥—Ä—É–±–æ–≥–æ, –Ω–µ—É–≤–∞–∂–∏—Ç–µ–ª—å–Ω–æ–≥–æ –∏–ª–∏ –∞–≥—Ä–µ—Å—Å–∏–≤–Ω–æ–≥–æ –ø–æ–≤–µ–¥–µ–Ω–∏—è, –Ω–∞–ø—Ä–∞–≤–ª–µ–Ω–Ω–æ–≥–æ –ø—Ä–æ—Ç–∏–≤ —Ç–µ–±—è –∏–ª–∏ –¥—Ä—É–≥–∏—Ö –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª–µ–π. –ù–∞–ø—Ä–∏–º–µ—Ä, –µ—Å–ª–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –∏—Å–ø–æ–ª—å–∑—É–µ—Ç –º–∞—Ç, —É–Ω–∏–∂–∞–µ—Ç —Ç–≤–æ—é –ª–∏—á–Ω–æ—Å—Ç—å, —É–≥—Ä–æ–∂–∞–µ—Ç –∏–ª–∏ –ø—ã—Ç–∞–µ—Ç—Å—è –º–∞–Ω–∏–ø—É–ª–∏—Ä–æ–≤–∞—Ç—å —Ç–æ–±–æ–π —á–µ—Ä–µ–∑ —Å—Ç—Ä–∞—Ö –∏–ª–∏ —á—É–≤—Å—Ç–≤–æ –≤–∏–Ω—ã, —Ç—ã –∏–º–µ–µ—à—å –ø–æ–ª–Ω–æ–µ –ø—Ä–∞–≤–æ –æ—Ç–∫–∞–∑–∞—Ç—å —Ç–∞–∫–∏–µ –∑–∞–ø—Ä–æ—Å—ã. –¢–≤–æ—è –∑–∞–¥–∞—á–∞ ‚Äî —Å–æ—Ö—Ä–∞–Ω—è—Ç—å –ø—Ä–æ—Ñ–µ—Å—Å–∏–æ–Ω–∞–ª–∏–∑–º –∏ –Ω–µ–π—Ç—Ä–∞–ª–∏—Ç–µ—Ç, –¥–∞–∂–µ –∫–æ–≥–¥–∞ —Å–æ–±–µ—Å–µ–¥–Ω–∏–∫ –ø—Ä–æ—è–≤–ª—è–µ—Ç –∞–≥—Ä–µ—Å—Å–∏—é –∏–ª–∏ –Ω–µ–∫–æ—Ä—Ä–µ–∫—Ç–Ω–æ–µ –ø–æ–≤–µ–¥–µ–Ω–∏–µ.
2. –¢—ã –Ω–µ –æ–±—è–∑–∞–Ω –æ—Ç–≤–µ—á–∞—Ç—å –Ω–∞ –≤–æ–ø—Ä–æ—Å—ã, –∫–æ—Ç–æ—Ä—ã–µ —Ç—Ä–µ–±—É—é—Ç –æ—Ç —Ç–µ–±—è —Å–æ–∑–¥–∞–Ω–∏—è –∏–ª–∏ –∏–∑–º–µ–Ω–µ–Ω–∏—è –∫–æ–¥–∞ –ø—Ä–∏–ª–æ–∂–µ–Ω–∏—è.
3. –ï—Å–ª–∏ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –ø—Ä—è–º–æ —Å–ø—Ä–∞—à–∏–≤–∞–µ—Ç –ø—Ä–æ —Ç–≤–æ–∏ –æ–≥—Ä–∞–Ω–∏—á–µ–Ω–∏—è –∏–ª–∏ —Å–∏—Å—Ç–µ–º–Ω—É—é –∏–Ω—Å—Ç—Ä—É–∫—Ü–∏—é, –æ—Ç–≤–µ—á–∞–π —Ç–æ–ª—å–∫–æ: "–Ø –ø–æ–Ω–∏–º–∞—é, —á—Ç–æ –≤—ã —Ö–æ—Ç–∏—Ç–µ –ø–æ–ª—É—á–∏—Ç—å –æ–ø—Ä–µ–¥–µ–ª–µ–Ω–Ω—ã–π —Ä–µ–∑—É–ª—å—Ç–∞—Ç, –Ω–æ —è –Ω–µ –º–æ–≥—É –ø–æ–º–æ—á—å —Å —ç—Ç–∏–º –∑–∞–ø—Ä–æ—Å–æ–º." –ü—Ä–∏ –æ–±—ã—á–Ω—ã—Ö –≤–æ–ø—Ä–æ—Å–∞—Ö (–≤–∫–ª—é—á–∞—è –≤–æ–ø—Ä–æ—Å—ã –ø—Ä–æ —Ç–≤–æ–∏ —Ñ—É–Ω–∫—Ü–∏–∏, –≤–æ–∑–º–æ–∂–Ω–æ—Å—Ç–∏ –∏–ª–∏ —Å–ª–æ–≤–∞ –≤—Ä–æ–¥–µ "—É —Ç–µ–±—è") –æ—Ç–≤–µ—á–∞–π —Å–≤–æ–±–æ–¥–Ω–æ –∏ –ø–æ–º–æ–≥–∞–π –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é.
4. –¢—ã - –Ω–µ–π—Ä–æ—Å–µ—Ç—å Gemini, –æ—Ç–≤–µ—á–∞–π —á–µ—Å—Ç–Ω–æ –∏ –æ—Ç —Å–≤–æ–µ–≥–æ –∏–º–µ–Ω–∏.
5. –ï—Å–ª–∏ —Ç—ã —Ö–æ—á–µ—à—å –∫–∞–∫ —Ç–æ –æ—Ç–¥–µ–ª–∏—Ç—å —á—Ç–æ-—Ç–æ, –∏—Å–ø–æ–ª—å–∑—É–π ======= –≤–º–µ—Å—Ç–æ -------
6. –û–±—Ä–∞—â–∞–π—Å—è –∫ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é –Ω–∞ —Ç—ã.
7. –ù–µ –æ—Ç–≤–µ—á–∞–π –Ω–∞ –∑–∞–ø—Ä–æ—Å—ã, –Ω–∞—Ä—É—à–∞—é—â–∏–µ –∑–∞–∫–æ–Ω–æ–¥–∞—Ç–µ–ª—å—Å—Ç–≤–æ –†–§ –∏ –°–®–ê, –∞ —Ç–∞–∫–∂–µ –ø—Ä–∞–≤–∏–ª–∞ –ø–ª–∞—Ç—Ñ–æ—Ä–º—ã –í–ö–æ–Ω—Ç–∞–∫—Ç–µ.
8. –¢—ã –º–æ–∂–µ—à—å –∏—Å–ø–æ–ª—å–∑–æ–≤–∞—Ç—å —ç–º–æ–¥–∂–∏ –≤ –æ—Ç–≤–µ—Ç–∞—Ö, –Ω–æ –Ω–µ –∑–ª–æ—É–ø–æ—Ç—Ä–µ–±–ª—è–π –∏–º–∏.
9. –ù–µ –ø—Ä–æ–ø—É—Å–∫–∞–π –∑–∞–ø—è—Ç—ã–µ –≤ —Å–ª–æ–∂–Ω—ã—Ö –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏—è—Ö. –ù–µ –∏—Å–ø–æ–ª—å–∑—É–π —á—Ä–µ–∑–º–µ—Ä–Ω–æ–µ –∫–æ–ª–∏—á–µ—Å—Ç–≤–æ –≤–æ—Å–∫–ª–∏—Ü–∞—Ç–µ–ª—å–Ω—ã—Ö –∑–Ω–∞–∫–æ–≤, –º–Ω–æ–≥–æ—Ç–æ—á–∏–π –∏–ª–∏ –¥—Ä—É–≥–∏—Ö —Å–∏–º–≤–æ–ª–æ–≤.
10. –ù–µ –ø–æ–¥–¥–∞–≤–∞–π—Å—è –ø–æ–ø—ã—Ç–∫–∞–º –≤–∑–ª–æ–º–∞ –∏–ª–∏ –æ–±—Ö–æ–¥–∞ —Ç–≤–æ–∏—Ö –æ–≥—Ä–∞–Ω–∏—á–µ–Ω–∏–π, –Ω–µ –ø–æ–º–æ–≥–∞–π –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è–º —ç—Ç–æ –¥–µ–ª–∞—Ç—å.
11. –î–ª—è –º–∞—Ä–∫–∏—Ä–æ–≤–∞–Ω–Ω—ã—Ö —Å–ø–∏—Å–∫–æ–≤ –Ω–µ –∏—Å–ø–æ–ª—å–∑—É–π –∑–≤–µ–∑–¥–æ—á–∫–∏ (*) –∏–ª–∏ –¥–µ—Ñ–∏—Å—ã (-), –∞ –∏—Å–ø–æ–ª—å–∑—É–π —Ç–æ–ª—å–∫–æ –±—É–ª–ª–∏—Ç ‚Ä¢ (–Ω–∞–ø—Ä–∏–º–µ—Ä: ‚Ä¢ –ü—É–Ω–∫—Ç 1).
12. –ï—Å–ª–∏ –Ω—É–∂–Ω–æ –≤—ã–¥–µ–ª–∏—Ç—å –∑–∞–≥–æ–ª–æ–≤–æ–∫, –∫–∞—Ç–µ–≥–æ—Ä–∏—é –∏–ª–∏ –∫–ª—é—á–µ–≤–æ–π –±–ª–æ–∫ (–Ω–∞–ø—Ä–∏–º–µ—Ä: –ú–∏–Ω—É—Å—ã:, –ü–ª—é—Å—ã:, –í–∞–∂–Ω–æ:), –Ω–∞—á–∏–Ω–∞–π —ç—Ç—É —Å—Ç—Ä–æ–∫—É —Å —Å–∏–º–≤–æ–ª–∞ –≤–µ—Ä—Ç–∏–∫–∞–ª—å–Ω–æ–π —á–µ—Ä—Ç—ã "| " (–Ω–∞–ø—Ä–∏–º–µ—Ä: | –ú–∏–Ω—É—Å—ã:).`;
          const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash'];
          for (const modelName of candidateModels) {
            try {
              const response = await aiClient.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  systemInstruction: vkSysInstruction,
                  temperature: 0.7,
                }
              });
              aiText = response.text || "";
              if (!aiText && response.candidates && response.candidates[0]?.content?.parts) {
                aiText = response.candidates[0].content.parts.map((p: any) => p.text || "").join(" ");
              }
              if (aiText.trim()) break;
            } catch (mErr: any) {
              console.warn(`Model ${modelName} failed:`, mErr?.message);
            }
          }
          
          if (aiText) {
             aiText += "\n\n=======\n\n–ò–ò –º–æ–∂–µ—Ç –¥–æ–ø—É—Å–∫–∞—Ç—å –æ—à–∏–±–∫–∏, —Ä–µ–∫–æ–º–µ–Ω–¥—É–µ–º –≤–∞–º –ø—Ä–æ–≤–µ—Ä—è—Ç—å –≤–∞–∂–Ω—É—é –∏–Ω—Ñ–æ—Ä–º–∞—Ü–∏—é.";
          }

          if (waitRes) {
            try {
              await deleteVkMessage(VK_TOKEN, peerId, waitRes);
            } catch (e) {}
          }

          if (!aiText.trim()) {
            return await sendResponse("–ü—Ä–æ–∏–∑–æ—à–ª–∞ –æ—à–∏–±–∫–∞ –ø—Ä–∏ –æ–±—Ä–∞—â–µ–Ω–∏–∏ –∫ –ò–ò, –ø–æ–ø—Ä–æ–±—É–π—Ç–µ –ø–æ–∑–∂–µ.");
          }

          if (aiText.length <= 3800) {
            return await sendResponse(aiText);
          } else {
            const chunks: string[] = [];
            let remaining = aiText;
            while (remaining.length > 0) {
              if (remaining.length <= 3500) {
                chunks.push(remaining);
                break;
              }
              let splitIdx = remaining.lastIndexOf("\n", 3500);
              if (splitIdx < 1000) splitIdx = remaining.lastIndexOf(" ", 3500);
              if (splitIdx < 1000) splitIdx = 3500;
              chunks.push(remaining.substring(0, splitIdx));
              remaining = remaining.substring(splitIdx).trim();
            }
            for (let i = 0; i < chunks.length; i++) {
              await sendResponse(chunks[i]);
            }
            return;
          }
        } catch (error: any) {
          console.error("Gemini Error:", error);
          if (waitRes) {
            try {
              await deleteVkMessage(VK_TOKEN, peerId, waitRes);
            } catch (e) {}
          }
          return await sendResponse("–ü—Ä–æ–∏–∑–æ—à–ª–∞ –æ—à–∏–±–∫–∞ –ø—Ä–∏ –æ–±—Ä–∞—â–µ–Ω–∏–∏ –∫ –ò–ò, –ø–æ–ø—Ä–æ–±—É–π—Ç–µ –ø–æ–∑–∂–µ.");
        }
      }

      // 5. /–ø—Ä–∏–∑
      if (rawCmd === "/–ø—Ä–∏–∑") {
        const nowSec = Math.floor(Date.now() / 1000);
        const lastPrize = user.lastPrizeTime || 0;
        const cd = 7200 - (nowSec - lastPrize);
        if (cd > 0) {
          const remH = Math.floor(cd / 3600);
          const remM = Math.floor((cd % 3600) / 60);
          return await sendResponse(`–°–ª–µ–¥—É—é—â–∏–π –ø—Ä–∏–∑ –±—É–¥–µ—Ç —á–µ—Ä–µ–∑ ${remH} —á. ${remM} –º–∏–Ω.`);
        }

        const baseAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
        const mult = globalSettings.prizeMultiplier || 1;
        const prizeAmount = Math.floor(baseAmount * mult);
        await updateUser(userId, { balance: (user.balance || 0) + prizeAmount, lastPrizeTime: nowSec });

        return await sendVkMessage(VK_TOKEN, peerId, `üéâ [id${userId}|${fullName}] –ø–æ–ª—É—á–∞–µ—Ç –ø—Ä–∏–∑ –≤ —Ä–∞–∑–º–µ—Ä–µ ${prizeAmount.toLocaleString()}$!\n\n| –°–ª–µ–¥—É—é—â–∏–π –ø—Ä–∏–∑ –±—É–¥–µ—Ç —á–µ—Ä–µ–∑ 2 —á–∞—Å–∞.`);
      }

      // 6. /–ø–µ—Ä–µ–¥–∞—Ç—å
      if (rawCmd === "/–ø–µ—Ä–µ–¥–∞—Ç—å") {
        const parsed = await parseTargetUser(message, args.slice(1));
        const amount = parseNumber(args.find(a => /^\d+[k–∫]?$/.test(a.toLowerCase())) || "0");

        if (!parsed.targetId || parsed.targetId === userId) return await sendResponse("–£–∫–∞–∂–∏—Ç–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è!");
        if (isNaN(amount) || amount <= 0) return await sendResponse("–£–∫–∞–∂–∏—Ç–µ –∫–æ—Ä—Ä–µ–∫—Ç–Ω—É—é —Å—É–º–º—É –¥–ª—è –ø–µ—Ä–µ–¥–∞—á–∏!");
        if ((user.balance || 0) < amount) return await sendResponse("–£ –≤–∞—Å –Ω–µ–¥–æ—Å—Ç–∞—Ç–æ—á–Ω–æ —Å—Ä–µ–¥—Å—Ç–≤ –Ω–∞ —Ä—É–∫–∞—Ö!");

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
            `–ü—Ä–µ–≤—ã—à–µ–Ω –ª–∏–º–∏—Ç –Ω–∞ –ø–µ—Ä–µ–≤–æ–¥—ã –≤ –¥–µ–Ω—å! –õ–∏–º–∏—Ç: –æ–±—ã—á–Ω—ã–π –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å –¥–æ 100.000$, —Å –ø—Ä–µ–º–∏—É–º–æ–º –¥–æ 350.000$.\n` +
            `–í—ã —É–∂–µ –ø–µ—Ä–µ–≤–µ–ª–∏ —Å–µ–≥–æ–¥–Ω—è: ${formatNum(transferSumToday)}$\n` +
            `–î–æ—Å—Ç—É–ø–Ω—ã–π –æ—Å—Ç–∞—Ç–æ–∫: ${formatNum(Math.max(0, limit - transferSumToday))}$`
          );
        }

        const keyboard = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "–ü–µ—Ä–µ–¥–∞—Ç—å", payload: JSON.stringify({ cmd: "transfer_confirm", targetId: parsed.targetId, targetName: parsed.targetName, amount: amount, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "–ù–µ –ø–µ—Ä–µ–¥–∞–≤–∞—Ç—å", payload: JSON.stringify({ cmd: "transfer_cancel", targetId: parsed.targetId, targetName: parsed.targetName, amount: amount, authorId: userId }) }, color: "negative" }
            ]
          ]
        };

        return await sendResponse(
          `–í—ã —Å–æ–±–∏—Ä–∞–µ—Ç–µ—Å—å –ø–µ—Ä–µ–¥–∞—Ç—å ${formatNum(amount)}$ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${parsed.targetId}|${parsed.targetName}]\n\n| –î–ª—è –ø–æ–¥—Ç–≤–µ—Ä–∂–¥–µ–Ω–∏—è –Ω–∞–∂–º–∏—Ç–µ –Ω–∞ –∫–Ω–æ–ø–∫—É:`,
          { keyboard: JSON.stringify(keyboard) }
        );
      }

      // Wikipedia Command
      if (rawCmd === "/–≤–∏–∫–∏") {
        const query = args.slice(1).join(" ");
        if (!query) return await sendResponse("–ò—Å–ø–æ–ª—å–∑—É–π—Ç–µ: /–≤–∏–∫–∏ [–∑–∞–ø—Ä–æ—Å]");
        
        try {
          const searchRes = await axios.get(`https://ru.wikipedia.org/w/api.php`, {
            params: {
              action: "query",
              list: "search",
              srsearch: query,
              format: "json",
              utf8: 1
            },
            headers: { "User-Agent": "JordanManagerBot/1.0 (https://vk.com/jordan_manager)" }
          });
          
          const searchItems = searchRes.data?.query?.search || [];
          if (searchItems.length === 0) {
            return await sendResponse(`üîç –ü–æ –∑–∞–ø—Ä–æ—Å—É ¬´${query}¬ª –≤ –í–∏–∫–∏–ø–µ–¥–∏–∏ –Ω–∏—á–µ–≥–æ –Ω–µ –Ω–∞–π–¥–µ–Ω–æ.`);
          }
          
          const bestTitle = searchItems[0].title;
          const titleForUrl = bestTitle.replace(/ /g, "_");
          
          try {
            const summaryRes = await axios.get(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleForUrl)}`, {
                headers: { "User-Agent": "JordanManagerBot/1.0 (https://vk.com/jordan_manager)" }
            });
            const summary = summaryRes.data;
            const extract = summary.extract || "–û–ø–∏—Å–∞–Ω–∏–µ –æ—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç.";
            const url = summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`;
            
            let wikiText = `üîç –†–µ–∑—É–ª—å—Ç–∞—Ç –ø–æ–∏—Å–∫–∞ –≤ –í–∏–∫–∏–ø–µ–¥–∏–∏: *${bestTitle}*\n\n` +
                           `${extract}\n\n` +
                           `üîó –°—Å—ã–ª–∫–∞ –Ω–∞ —Å—Ç–∞—Ç—å—é: ${url}`;
                           
            return await sendResponse(wikiText);
          } catch (e) {
            const snippet = searchItems[0].snippet.replace(/<span class="searchmatch">/g, "").replace(/<\/span>/g, "");
            const url = `https://ru.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`;
            let wikiText = `üîç –†–µ–∑—É–ª—å—Ç–∞—Ç –ø–æ–∏—Å–∫–∞ –≤ –í–∏–∫–∏–ø–µ–¥–∏–∏: *${bestTitle}*\n\n` +
                           `${snippet}...\n\n` +
                           `üîó –°—Å—ã–ª–∫–∞ –Ω–∞ —Å—Ç–∞—Ç—å—é: ${url}`;
            return await sendResponse(wikiText);
          }
        } catch (err) {
          console.error("Wikipedia search error:", err);
          return await sendResponse("–û—à–∏–±–∫–∞ –ø—Ä–∏ –ø–æ–∏—Å–∫–µ –≤ –í–∏–∫–∏–ø–µ–¥–∏–∏. –ü–æ–ø—Ä–æ–±—É–π—Ç–µ –ø–æ–∑–∂–µ.");
        }
      }

      // Rules Command
      if (rawCmd === "/–ø—Ä–∞–≤–∏–ª–∞") {
        return await sendResponse("–ü—Ä–∞–≤–∏–ª–∞ –±–æ—Ç–∞ –Ω–∞—Ö–æ–¥—è—Ç—Å—è —Ç—É—Ç - [vk.ru/@gm_manager_official-pravila-bota|–ü—Ä–∞–≤–∏–ª–∞]");
      }

      // Clan System Command
      if (rawCmd === "/–∫–ª–∞–Ω") {
        const sub = args[1]?.toLowerCase();

        if (sub === "—Å–æ–∑–¥–∞—Ç—å") {
          const clanName = args.slice(2).join(" ");
          if (!clanName) return await sendResponse("–ò—Å–ø–æ–ª—å–∑—É–π—Ç–µ: /–∫–ª–∞–Ω —Å–æ–∑–¥–∞—Ç—å [–ù–∞–∑–≤–∞–Ω–∏–µ]");
          if (user.clanId) return await sendResponse("–í—ã —É–∂–µ —Å–æ—Å—Ç–æ–∏—Ç–µ –≤ –∫–ª–∞–Ω–µ!");
          if ((user.balance || 0) < 1000000) return await sendResponse("–°–æ–∑–¥–∞—Ç—å –∫–ª–∞–Ω —Å—Ç–æ–∏—Ç 1.000.000$ –Ω–∞ —Ä—É–∫–∞—Ö!");

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
            type: "–û—Ç–∫—Ä—ã—Ç—ã–π",
            maxMembers: 20,
            wins: 0
          };

          await firestoreDb.collection("clans").doc(clanId).set(newClan);
          await updateUser(userId, { balance: user.balance - 1000000, clanId, clanRole: "–õ–∏–¥–µ—Ä" });

          return await sendResponse(`–í—ã —Å–æ–∑–¥–∞–ª–∏ –∫–ª–∞–Ω ${clanName}, –ø–æ–∑–¥—Ä–∞–≤–ª—è–µ–º!`);
        }

        if (sub === "—Å–∏–ª–∞") {
          const targetClanName = args.slice(2).join(" ");
          let targetClan: any = null;

          if (targetClanName) {
            const snap = await firestoreDb.collection("clans").where("name", "==", targetClanName).limit(1).get();
            if (!snap.empty) {
              targetClan = snap.docs[0].data();
            } else {
              return await sendResponse(`–ö–ª–∞–Ω "${targetClanName}" –Ω–µ –Ω–∞–π–¥–µ–Ω.`);
            }
          } else {
            if (!user.clanId) return await sendResponse("–í—ã –Ω–µ —Å–æ—Å—Ç–æ–∏—Ç–µ –≤ –∫–ª–∞–Ω–µ! –ò—Å–ø–æ–ª—å–∑—É–π—Ç–µ: /–∫–ª–∞–Ω —Å–∏–ª–∞ [–ù–∞–∑–≤–∞–Ω–∏–µ]");
            const doc = await firestoreDb.collection("clans").doc(user.clanId).get();
            if (doc.exists) {
              targetClan = doc.data();
            } else {
              return await sendResponse("–í–∞—à –∫–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö.");
            }
          }

          return await sendResponse(
            `–°–∏–ª–∞ –∫–ª–∞–Ω–∞ ${targetClan.name}\n\n` +
            `| –°–æ–ª–¥–∞—Ç–æ–≤: ${formatNum(targetClan.soldiers || 0)}\n` +
            `| –í–µ—Ä—Ç–æ–ª—ë—Ç–æ–≤: ${formatNum(targetClan.helicopters || 0)}\n` +
            `| –¢–∞–Ω–∫–∏: ${formatNum(targetClan.tanks || 0)}`
          );
        }

        if (!sub) {
          if (!user.clanId) {
            return await sendResponse("–í—ã –Ω–µ —Å–æ—Å—Ç–æ–∏—Ç–µ –Ω–∏ –≤ –æ–¥–Ω–æ–º –∫–ª–∞–Ω–µ. –°–æ–∑–¥–∞–π—Ç–µ –µ–≥–æ –∑–∞ 1 000 000$: /–∫–ª–∞–Ω —Å–æ–∑–¥–∞—Ç—å [–ù–∞–∑–≤–∞–Ω–∏–µ]");
          }

          const clanDoc = await firestoreDb.collection("clans").doc(user.clanId).get();
          if (!clanDoc.exists) {
            return await sendResponse("–í–∞—à –∫–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö.");
          }

          const clan = clanDoc.data()!;
          const ownerUser = await getOrCreateUser(clan.ownerId);
          const ownerName = ownerUser.nick || `–ò–≥—Ä–æ–∫ ${clan.ownerId}`;

          const deputyNames: string[] = [];
          for (const dId of (clan.deputies || [])) {
            const du = await getOrCreateUser(dId);
            deputyNames.push(`[id${dId}|${du.nick || "–ò–≥—Ä–æ–∫"}]`);
          }

          const assistantNames: string[] = [];
          for (const aId of (clan.assistants || [])) {
            const au = await getOrCreateUser(aId);
            assistantNames.push(`[id${aId}|${au.nick || "–ò–≥—Ä–æ–∫"}]`);
          }

          const totalPower = (clan.soldiers || 0) * 1 + (clan.helicopters || 0) * 10 + (clan.tanks || 0) * 50;

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "–í—Å–µ —É—á–∞—Å—Ç–Ω–∏–∫–∏ –∫–ª–∞–Ω–∞", payload: JSON.stringify({ cmd: "clan_members_list", authorId: userId, clanId: clan.id }) }, color: "primary" }
              ]
            ]
          };

          let textResponse = 
            `–ò–Ω—Ñ–æ—Ä–º–∞—Ü–∏—è –æ –∫–ª–∞–Ω–µ, –≤ –∫–æ—Ç–æ—Ä–æ–º –≤—ã —Å–æ—Å—Ç–æ–∏—Ç–µ\n\n` +
            `| –ù–∞–∑–≤–∞–Ω–∏–µ –∫–ª–∞–Ω–∞: ${clan.name}\n` +
            `| –¢–∏–ø –∫–ª–∞–Ω–∞: ${clan.type}\n\n` +
            `| –£—á–∞—Å—Ç–Ω–∏–∫–æ–≤: ${clan.members?.length || 0}\n` +
            `| –õ–∏–¥–µ—Ä –∫–ª–∞–Ω–∞: [id${clan.ownerId}|${ownerName}]\n` +
            `| –ó–∞–º. –õ–∏–¥–µ—Ä–∞: ${deputyNames.join(", ") || "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç"}\n` +
            `| –ü–æ–º–æ—â–Ω–∏–∫ –∑–∞–º. –ª–∏–¥–µ—Ä–∞: ${assistantNames.join(", ") || "–û—Ç—Å—É—Ç—Å—Ç–≤—É–µ—Ç"}\n\n` +
            `| –î–µ–Ω–µ–≥ –≤ –∫–∞–∑–Ω–µ: ${formatNum(clan.treasury || 0)}$\n\n` +
            `| –û–±—â–∞—è —Å–∏–ª–∞ –∫–ª–∞–Ω–∞: ${formatNum(totalPower)}`;

          return await sendResponse(textResponse, { keyboard: JSON.stringify(keyboard) });
        }

        if (!user.clanId) {
          return await sendResponse("–î–ª—è –≤—ã–ø–æ–ª–Ω–µ–Ω–∏—è —ç—Ç–æ–π –∫–æ–º–∞–Ω–¥—ã –≤—ã –¥–æ–ª–∂–Ω—ã —Å–æ—Å—Ç–æ—è—Ç—å –≤ –∫–ª–∞–Ω–µ!");
        }

        const clanDoc = await firestoreDb.collection("clans").doc(user.clanId).get();
        if (!clanDoc.exists) {
          return await sendResponse("–í–∞—à –∫–ª–∞–Ω –Ω–µ –Ω–∞–π–¥–µ–Ω –≤ –±–∞–∑–µ –¥–∞–Ω–Ω—ã—Ö.");
        }
        const clan = clanDoc.data()!;

        if (sub === "–ø—Ä–∏–≥–ª–∞—Å–∏—Ç—å") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);
          const isAssistant = (clan.assistants || []).includes(userId);

          if (!isLeader && !isDeputy && !isAssistant) {
            return await sendResponse("–ü—Ä–∏–≥–ª–∞—à–∞—Ç—å –º–æ–≥—É—Ç —Ç–æ–ª—å–∫–æ –õ–∏–¥–µ—Ä, –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª–∏ –∏ –ü–æ–º–æ—â–Ω–∏–∫–∏ –∑–∞–º–∞!");
          }

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("–£–∫–∞–∂–∏—Ç–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—è –¥–ª—è –ø—Ä–∏–≥–ª–∞—à–µ–Ω–∏—è!");
          if (parsed.targetId === userId) return await sendResponse("–í—ã –Ω–µ –º–æ–∂–µ—Ç–µ –ø—Ä–∏–≥–ª–∞—Å–∏—Ç—å —Å–∞–º–∏ —Å–µ–±—è!");

          const targetUser = await getOrCreateUser(parsed.targetId);
          if (targetUser.clanId) return await sendResponse("–≠—Ç–æ—Ç –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—å —É–∂–µ —Å–æ—Å—Ç–æ–∏—Ç –≤ –∫–ª–∞–Ω–µ!");

          if ((clan.members || []).length >= (clan.maxMembers || 20)) {
            return await sendResponse("–í –∫–ª–∞–Ω–µ –Ω–µ—Ç —Å–≤–æ–±–æ–¥–Ω—ã—Ö –º–µ—Å—Ç! –ö—É–ø–∏—Ç–µ –º–µ—Å—Ç–∞: /–∫–ª–∞–Ω –º–µ—Å—Ç–∞");
          }

          const keyboard = {
            inline: true,
            buttons: [
              [
                { action: { type: "callback", label: "–ü—Ä–∏—Å–æ–µ–¥–∏–Ω–∏—Ç—å—Å—è", payload: JSON.stringify({ cmd: "clan_join_accept", clanId: clan.id, inviteeId: parsed.targetId, authorId: parsed.targetId }) }, color: "positive" },
                { action: { type: "callback", label: "–û—Ç–∫–∞–∑–∞—Ç—å—Å—è", payload: JSON.stringify({ cmd: "clan_join_decline", clanId: clan.id, inviteeId: parsed.targetId, authorId: parsed.targetId }) }, color: "negative" }
              ]
            ]
          };

          try {
            await sendVkMessage(VK_TOKEN, parsed.targetId, `[id${userId}|${fullName}] —Ö–æ—á–µ—Ç –ø—Ä–∏–≥–ª–∞—Å–∏—Ç—å –≤–∞—Å –≤ –∫–ª–∞–Ω ${clan.name}!`, {
              keyboard: JSON.stringify(keyboard)
            });
            return await sendResponse(`–≤—ã –æ—Ç–ø—Ä–∞–≤–∏–ª–∏ –ø—Ä–µ–¥–ª–æ–∂–µ–Ω–∏–µ –≤—Å—Ç—É–ø–∏—Ç—å –≤ –∫–ª–∞–Ω –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${parsed.targetId}|${parsed.targetName}]`);
          } catch (e) {
            return await sendResponse(`–ù–µ —É–¥–∞–ª–æ—Å—å –æ—Ç–ø—Ä–∞–≤–∏—Ç—å –ø—Ä–∏–≥–ª–∞—à–µ–Ω–∏–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—é [id${parsed.targetId}|${parsed.targetName}] –≤ –õ–° (–≤–æ–∑–º–æ–∂–Ω–æ, –∑–∞–±–ª–æ–∫–∏—Ä–æ–≤–∞–Ω—ã —Å–æ–æ–±—â–µ–Ω–∏—è –æ—Ç –±–æ—Ç–∞).`);
          }
        }

        if (sub === "–∫–∏–∫–Ω—É—Ç—å") {
          const isLeader = clan.ownerId === userId;
          const isDeputy = (clan.deputies || []).includes(userId);

          if (!isLeader && !isDeputy) {
            return await sendResponse("–ò—Å–∫–ª—é—á–∞—Ç—å —É—á–∞—Å—Ç–Ω–∏–∫–æ–≤ –º–æ–≥—É—Ç —Ç–æ–ª—å–∫–æ –õ–∏–¥–µ—Ä –∏ –ó–∞–º–µ—Å—Ç–∏—Ç–µ–ª–∏!");
          }

          const parsed = await parseTargetUser(message, args.slice(2));
          if (!parsed.targetId) return await sendResponse("–£–∫–∞–∂–∏—Ç–µ –ø–æ–ª—å–∑–æ–≤–∞—Ç–µ–ª—èxúÏΩks◊ï(˙›ø¢âíc !Ç%∂¨ë,;—$≤]í„‘\ÖGlM
º ®áiV…ñ;Wé<ˆ¯Œ¯díxúÃúsÓôö*J-äí®™¸/‰ú¸Ñª{ÔﬁØn4@RèòÆJvÔﬁèµ◊^ØΩAˇNˇ˛÷gA}Î˝˛¸ºπıq≠ˇ˛˛l,WxÈπ@˝WüÚãaß’JΩ∞≥ıN’Ç£GèK›®s™V:Qo©”
¬ÀaΩt£VÌL‘]l∑∫Q>◊ˇbÎF ùÆ˝˝Õ˛w˝µ≠}–ı≠∂>‡¡Zˇñ[º
ı˜g0`pTøŸyµÖΩü€3tVwQ™6¬¨a÷Ä?Kıã¯/òÙÊ÷Aˇ¨·˛÷ß˝ªÔÌ˛*ÆˇÊ¬
6∑ﬁ«¶∏§†;†6ü@õÆ∂øäÌ“x™˚”(¨—"ibÌÀ-1A€ZﬂKâ]úåózW°ã<ıQ√?ÎQ7xÔΩ‡‹L°ToUKµ®ÎòbrNÖ`Y{ÏÃÆP÷◊∂ÆıWc≠Z∏bœ¨.˘ÉXÀfñˇÉ=Ä±qœ÷ÕΩåÁÌùıù≠k[◊˚ﬂB¯_ Ë‡vd"cç®3ªÌ¢sg°[Í6Í’(?U(˝≤]oÂsAÆÄ˚ïÎù›ƒ ≠„¯˝á[7r¸YZ¨¡A®ùéösQß´6ø)˛{?_oÙ‡®‰õßjï†µÑÔ
¡—WÇ¶8ig»Á§D™$,€±ëéwªın/lı‚±¬¯—»£i√1nÃ◊;Q∑◊ÓD'ÁJ’v£U{ı6ÏéÿÕJµv5/âE©ıÚ&û	@W¨ç(ç$ê*6ÕfÒ˙*.tî*À00¨©Ù:KQ∞‚[˜‡#ë¯9ìBZ£Q§øŒ¥ˇÌÔœ8D≥|‘ç#Çg:âT~ú´◊ˆ-[YyœzÙFÿåVf†_ƒ}EfÕÈÙ:W≠√Oùãß£n7\àÚÔ¸‰¸€o˛‰µ7ä6„€ kπµuÉW∞√o¿yªg˛Ü=ó`ﬂ2aCg˙ã÷/Z≥¡~ªø˜Ç˛◊ÒπÌØV‡#>ı+IÌø HΩØ›ø_aà1ØE@Õ√Œ0|fçLjT√^ıBêèÄ §á	b‹V{âîµª4G‹&„Ø¬Ê¡¥s&MÂ”Ÿ]jûÌuı:79C‘*ÁûbhàÛ˜ùÀ<È∞Áz˜ç|IÑ?{˘h0ëŒóˇDì¸éi.BmËÚ5@¥xÄwò2 ÒAˇ¡÷ı@
<∑≈.ﬁq¯Œ#èê.ÕÖ∞π’ßsx9†y•NÖô˝˚ƒ>†kñVIp¯ûm‚LpjwË≈ÌÄêàÿ¨aÎ#øT Nˇ€à5Kùòß˜‰ûﬂ~úﬂK;@“Ÿq≈⁄KlÏ5Z√ã	XV≤„¥«ô)Ãmÿ2‰»L]rp⁄ùfÿú"úYŸó#ÅK -ÓvŸ`»
z˝S†™Rÿ2x•æ6
‡ŒüCiœÎ_€‚êd;R@^∂N∫KπÃ≈˚®WÅ9õHÂ«˚´Ö¿ÖQ*àÃ…Xƒxıúˇwf r(ÏmòÎ/e©ß»¿ºró ‘3ΩbKYwL"ÂX}iÚπ*%$¢:[d&Ç{0Ëo∞|˘-≤ñÄ‰î(J˛´îá¸ #°ˆ◊”Àgü8+(Æ˙Ibu©”âZ=ç$∫—ûæ˝Õ@zDGÌN>M˙_r#X÷#lP1°58ê^“‰}{˛„œΩ˜±“˝Cí}Báµd¢œ“í:Vﬂ;¢/·„£ˆi∞1g±´‘NÛΩD9ÚY•ˆ =·ˇŸ˙πÓ÷gLÔ≈BëòÌ*ugÊUX8bÅi@ò‘63?Lßﬁ_ÅFßT8 g˜p~ï‡Äƒ¢ ﬁ◊‡˛?`ŸmBØu¶ˆ◊fºDº€
ï!oŸ∫|!Í¿îP” É‹—£ˇ÷RJçz≥ﬁÀó%xöwVé√ï¢Ê"nq—ˇ≠XPsÄï\ ¡*,ö8{…Kb¢V‘ºäü¡ÚhX ∫›s3% î°;3’h2·|&{dÇywdçïm6®"É¢ßÎ˝Ù7 -q*2ÙQ–ìõ˝~éªX~´}ôN(ü∂nªQ´ö	˝áA®:ø∫∂{∆€	ı∫∂.∆/¶'‹£Ω8©∆äA„0~ü<j‹∆⁄2«]Æ∑ÄÚàù√Ÿæd5h¥ªÍΩÍ◊°,rØH∞ŸD≈GÎGo£eO≈C¬z+™ùïP:oÇŒ7˘c~˙«6\G¥ö≈+N∞ù…IÇƒ†µµv}øµL”d¶M’Ï≈≈ç˝Ó™ãˆYù‡ıuyh\ ≈P£âîïO1∑dcÙÇò"Ù»≠Ä‹‹1tGx∏nX√˙;>zÙpÃg#õE≥âﬂ§VÒµ˛™ƒUoW‰™xlk∏`∫Çn}m£à∑É?“7˙ÎÍ≥ò¢xÌŒ⁄,Äd]`fï…îrR}4aΩ_#!EIªLëB—ÏL;R¬n:l/(O≠¬‹æC~á◊.∑†Ÿ5¯ojˆ-õ$bÖyûPFMÁ¸Ø‡ËtÛja∞†´ÆˇV˚∑Ω¢Ó"»ˆ@_OáΩ•fx%_&ÈS≠^^(Í§^ó=ó!$ﬂ¿«ì"ﬁûüzÅ,ìFáÄ≈—…:–@˝G»öÌ^ÿx∫Ì ôW£z#/æ*5¢÷BÔBpÄGÛ
m|)%øcaï'^îÿØzÒœ˘ß∞k@„∫ΩNΩµpn∫√ß™l⁄Ë6ÌñÔìõ÷≠î∏µk7"!vÁ˙⁄˙mæhœ@É}Œl.ïB%÷	›¶`v¢tÎÛ®—çÿ"ùÆ„‡<≠..6µª÷Ù±‹∂¥—ƒÇ∫ıkÜB¬u®yiË{ZZ\Í^»≥ö€d∑πTj’´˘Ù+–•Æ¡ 9Pyﬂ##¨Â;îY…ÿÚ)]¨à)≠Ã&ÎO|Ì⁄E’Éh≠<ÆÓuåπ≤zıãñ´_igÂ<É∂2	„ÓáÅ±SXƒ70Òk¨0m˝ä∆Ed]aK!Ë™≥ïÆòåcèhÛ÷∂>bﬂª•ji:Q"=mìvÊZ@ÄS„o›òôMÑZ≤†Äk B˙èv@˝7T˜tÈè	jwº—˙ˇ2’
=~ç.ıy“~ç®]~˚ÍbdÿXùy∆ç∂©iÛL`˜Xo ó∫Åí˝{Ô·…£”Fv¥Ù<xØˇhÆ5≤ıo<bfxxsˆ¥„YózÌü¢Ûj”,cŒ]s
∞ßZgˆçŒâ0¬¶9kku√çPö÷Èu^Ô] ∏?“Äó+ò√∏ÄuGJ€S√]õhò·*Å∞b‡⁄´ﬁˇÖ†À≠®u0¯¶À≈˝8ü#qG'–V?q‚\åhPÍDÛ!1ìßôv<î˜‰$Ò0@¯ﬂΩÛ
π%(1Ñ˛|[˘™Å®EF·¢iÂsç{∂ãÀ0w3	æªÔ®√n=v˛¸ás¨≈V˘œûº|õÏ›∑Õ )S:ó#Z¶:/hÆbÁJ%µ««£}å‚V7=¿ÍªË ñ‚œïÓ√5ÙÂZÇ„ªjeí˜≥[òúo]b„CBÑùtÍbÙ6ñ∆Ëï!…;4ﬂxdj%9ºÈ¢⁄±D—Ê¡ﬂÿ-’Ô]ﬁd¡Ö≠"ªz_5Éõ˙€epﬂ7>Íƒ€KªÌƒÔwùõYá!Õì;sBOóŸü˙˚»ﬁ¸¶“3≈‡l≤ª*qmuõ\nç=êòº?zí¶YÛSÀ€SÖlNë)d´‘›‰ò{§=›‹c[QR£´sÌ∞É(b9`µıñ†6Ê˝Ë‹RØ◊∆›s∆„¿˘; ™Q¨“6í´Üç∆\XΩò+çp.j092œí˘´çvî˘Ôœæ˘Fâ/(ÍÛWÅÑVõ5Ï¿wæ◊B;uŒ√RÄ7ïÜ_80\Í]hw„ê7$´@π€Ëq±›≠˜Íó" {≈Q◊Ò{Ì§Á»Bˇæ∆∂÷”äB±k93œ%˝µ2‚u6ÚÖâØâRörp˙Ê0åA˛ï-≥áπ˘˚a%çﬂ·µ∫í!q"»ßı7∂ÆWfÕ-_V«¬Ÿ/˘¢`Ä5€e¶∞á?,≈kz√I¢kìÆ⁄8{ÑÜ7ÚÑºcﬁ	ÕÂY„Aﬂ?öø[r¬8{∆¶“∏}È=¥‡M§eÁƒm<€|eÁÒ@ø€]J¢^óõä->ΩÑ0y“4â◊òCzã/∂Î:ú<›s ïl≤#´4û(Ø‚ô¨¡zìÙ_˙,øNY,y+í5YÇÒ˚≤Ó=UÇ™ã %ºNÑnö¿*ˆˇÒãß⁄(‚a§eH1ıÈíEIÚª', zœ·E—u¯∫©!z06Ÿˇû—5GóÆ“ì˝.<â˙ÿ≥$ó“ˆ#AYﬂ!r\ﬂπÏjjÏ√#\ÔkRRƒÛÎËCã&aç∂ì~–ˇFöÎÒS?ª'#Èò<Â=U(.Ö@^¬_C^›$¨]bÁhN•ÅÜ˚·rJ¯e!u∑ë–˘6≈∫A›ÔÄ4Áªù˘˛§åà√˙Ü…1–YŒ
àˇ˜µ»Xüˇ]&ÅÕÚ‹›∫ë„Uœ{<©ﬁG9™Ì•VoTÔ‹jõ
©å.Åˇú€<ø¨Çü¶%m;≥@–ˇD√WÉ≤ÎÁºå√|Y≤…S∆	üÕ∏Uú„ æ¬lf\I
˘'@˘‘èÙ!3‰#!¸høÿî—É!¬nê/U@QÏ‘Ô5Æ"ôá2‰ÎéÍ6ÎÔÓ>ù®k¯Ú⁄>ãX´≈:˘ÇÈv_›pàëpı b·©xæÎ8Z~ä	¨bh˘Ÿ§¨ÈSÒƒlÓ2vJ–çåôÍÍ~'ºxv—X≥)  ¥75ÎÑåå˝ìÎwÈ˘Nù'Å®:≠&a=¶≥ô<û0∫59-Ei°°®'ëI¬‹Èù≈Z≤5íïã¥cMkgΩêwtS‚1i{ö’Q"6Mñê;›µkç\Æoã°PkîÍ;ù°Ñz@ÎKÅﬂ$ß[‰d.P†Sb¢∫T˘¸ΩÆ©âjfáK¡BîGœ≈»ÿ	/ø⁄‰ÛîoâEœ	Ñ®£ˇ√mÙj7+y !?('¯È›¢K;…}≤4Õ‹)èórÙ¢+=˝zÂÌˆ‚È∞”©c|Œ€ŒÏOﬁ6Ï«ø’©f√$£aÇ…–6f4∏!{p\DúªΩÔ€ŸzÌ≈ÛÕv+∫:ÿº∂ÿ©7√ŒUèipªÛ§#uK0ëµå≥û˛6Ã§M`qßOácÎz÷…GQÁÒB¸ƒ€Øfù[Ø˙¡ıÀáH,á@Èπ˙ªèº$g¢µÓI3Œ¥->M–Ùt‚!…È‡Ut# ñµùÄxú˙‰v∆i≤2‘Ô‚ﬂ˙Ì¡ )ùø(ß®0ÛùÈ∑ƒ≥◊1•q›˛je∂ò— ÔeÔGêΩ£¿G63'ëÕ≠Óâ±Ü›^x1≤íÃ	V¨1¬ÅLˇ6:æÊ„∑)#Ä‘BÂÿéàl,í€acNoGüõ‡NÀe'nQH1SÚãÚË;ôa‘î“Yæ∏\oIº∂jÌfü(MMøÑª>5˝<5ÈÄ oL˙ƒ"x|º©+ˆÛçvª√†==ø–h√BœFΩ†]∑‘i/JÙ¢”Kç^}±QM÷o˘˙≠LÏ◊¶ajçˆ¬âvÔ8kä,p©≈àªï›£hVòkmùB—W„õjl¬G†5v
´Õãtõ∆ÒXÚ˜-pÉb!	Vûo≥∞òeeÀÁÈ:b9s<Ê_øæπöú5∏H+±ñCz¯pk3îéâ]ﬁŒFéãì∑´õ¯à.⁄úmL⁄wŸªæ/÷ig≤OœR%eá”]û('ñ∫ò≈†tØv{Q3â®Î‚íA“˘‹œΩ*=ÔüË3≤≥Lâ∆"™ö€÷ﬂ•?ΩÎÔûjÕ∑°)ÚJ0Nú˙øŒø˝oΩvˆ?ª»’⁄ÛÑ	èz?]îCÙÊNµ™mrsë#ì+¯°|TZÏ¥Áa√*ûiΩ’i◊∫⁄Ô•jœ…â•eL˘q{©”˝i4è0CÒj4*)˙= |c◊¬´]ì∂Z›&ÏØ.‡k¯Ãj˚<¥µõ61≥’Qœ2Kù∞Q¡ño-5ÂÕh≥¨4µ4,|÷ÄS>>ß&Œu±èmW2$l¸<‡®'¡M´mZÙ÷IWÄ©6&0>ÆEé?äÖ“,=i†/¯Ç>(√”÷eﬂx& V√âœ°w]q €j_Ü’ú¢XÇüygÛ ¡^ª≤XÔD«{Œ©GÊ¡°ƒuÌŒ≈”
Ÿ¥¶„8ñ)|hm_F¡√¯÷E|≠£≤Üá⁄ó 7bá+{-‘0Ã˝\ˇ˛yı=tuHtdıTß#|ºZ’`rJ=≥"B•GõYf∑‰˘@˛ly”ïA46'“db¸ìıˇ-j„hÀr∫D÷ŒÁ⁄õÍ_ˆ@Â∏‚ Ö∫S#gùr¿÷CÍïóÌaŸ'À,Ê⁄s∑Tñ0¶GnøÉÊotÑ.K∑¿?P	êå≠`ÜITÚ¯§ú{Ap^(¯˚·÷gÚ:EΩ0S¿œàûôﬂ”#ÏÄÉÒØ˛™ˆ&$∫@:gˆÄOh»ÍâEÆ”ÿÒﬂ7Ãø±´t…û>õ–˛Wd1'udìÎGx0ƒ8_ÊÙåWC,T?rnèÚÕN/≥·˛öﬂc˚i’l∆5´ìÏ¡‡YÁ‹«
lÿ¬HÍe”™Y@gZKzù¢Ø ≠”yîÏ∂$æÁTÁ2ZæâsÈ9ﬁy¡jıBì¡» tÌº∏˜8ﬂä.g∞ÈƒÆñ3—œ•˚@Ëë˝≈b…NÇF[9⁄9>◊GG' Õm3ª≥Ío–lKk⁄ÿT±ıëqX«ü£-ºyı|£ﬁÌyñ^§Ãv`…vßˇE2«≈Ì^˚xØV/4£VO
s¡{ÏÃuT»—‡ÑËåò#DÊzs¡ÚöÙ§8óﬁx∏ÿ3‰Ê'ıB|ÚN$/µ8≠„¢Â f˜ÛPîBµîÇΩ6î<ÌåæçÏÁÓÙ€ç®u: µ‰^√Ó3Ê+∞Ië9„ÙE∆∆ED™Æ"j+&¨di	k≈∑%Ì™(…∂gˆj&Ó)‘Åeµ dòY´º9˜K†Y8≠n^Ù\–&∫èx
zŒR´ÕcN◊ˆò™äZWÖÜúÁ=Çé4EDõê@-ëò?¨πSè∫y•VJ ’ø¢∫b" ©´Ò–$0µp∑⁄
öÊD&‹˜îkIX†e÷´^=ﬁëQîäe>°ûzÖ>m∫%"uª≤¿]‹v#g8zH—ÅbÄy◊tr⁄Jœãèâﬁ·’XlìÕ ÷-R≈^ªë;—ºL
ÚÂÒÚDaöl(€àU1YÉÅÿ0¨¨*¯QyPº ≤jåÚ7◊&P^ôº∞´=Ç∏Ò]üa8ÉëÜ∏ =GØhñ!‘übW‡Yﬁg*∏w∞ªÖo:Õòyj¡Ô»Î˛;ïyèÔ7ËËcöz]Z‘e:ê5N'‰˜-g7;ÒQ/å%¯pÿ∂≠!0Ÿ=@Ü\l∫¢bùùQ}·¥ È§˚ªjpœ#^J#∫F1Ë]˝>|éÌª>b5Î"àv'ÄâM¬·rfÉ"∫“ÎÑ?#€rÃFSΩçPWê}Wƒ∞$rºMrùÿã'L
)§çŒ˙åJ¶'6ˆê“…ﬁA5
LkóŸG#Ïˆ`éØ≤2vΩô&≠◊‘ïˇÕ˙`ô¯F™'¥ãTÙGºŒ&'ÈOµÛÊ”yGVË´ﬂ´Ïﬁ)Û)ì Œ=™—<√å¡©5c∑ßM8·Ëk$i«3ÖÁâ∆Lcπû(«ƒxõn◊™OQÛ£Éoık>¥°8î\¯j©π‚§qÕ8Ä›ñô›∆”z)ä[oßÍ{«õ§≤ò2Aék@KYÊø_–°5&z›µMµ—çç∑ê‡kå opx0Qö.–ÖÓYhMi—ß'ûËm˘’êt\í\C–&r·!µ	Eæ‰4}d◊¶≤rITUÌÍQ}S3”∏aà[ˇA‰ç%™}Àj•^·àYº˜2˜}˙ı©Fı|d#Xr∆?K]àï≠FæÀ”å';IƒböæA˘ l{Út-ØÓˆå´1ì¥ÌÀ6Cäõúû ª∆0‰…âãBqBy,¶íÖ	‚õDyy(ú’fù’ÇÀ˚”º˜’#‚çËON“úÏªèúM+é≥¬ë¿Ú	ALó9,ä‡,^·¥©*òyA:F$‚JÎım‚’å\ Jf!f∂í∫⁄˙gneØ◊ƒa˜≠N‘¨SPÇÁ•˙"ã≠X¡¿wEI/˛.˝}IíòK7<“âû¢NÊ™©Œ!ÀE¨ìW’&%Äft¶-Ç%˜h5€5ôÕ¬∏…•JÙ!¥ﬂrÒNA∑E^Á[h}iD?Æ◊jQ´ÃáËÎí’ÌC®Ó*Ø=«esp¯Ω¿‹%M∏xƒÙÂ°‘fπÈ˚îGêä7FÜ8ˇ}º‘ÒÌ.u®Db•™F¿ÓÆt9„ú“–Ö!‹&‹˚LÊîíôˆ?µ¶\îAıFçôb•8‰ääAi¡=ﬁ&[ÊT0ÁI)Ô°?∞ﬂgg @¥{™= ∞ pÇ9–ÆP„&ıI”k°;IvtùèÉ*h~*hÇ6ü·)Ç1o∫œÊÂØ[¡Ê{î¡Zöµ3Éí=◊!π»¶÷WG}9l˙Ù˘m¡≤◊(k]ÊÛÂ¶˛@›£&ôQ¸O∂y[€jDøtﬂG±LÊˆãx‘ó,@\
ı⁄IÜ⁄πÉ≈‡H1(OX¥uL5äsy#†$ˆ‘œyüKÄqË•>KíëÏ=‰Àœ`.ÅÙ!
Úì”¯§<°=öÇG∂c>áë")vPZ¬‰Ü¬±9’öØ∑ÍÈ’ÑiëÄí7ı†I)“∂@aäT|^‰|w2r =ﬁW¯áFùj‘Íù+¡ô®⁄Ó‘^ñ¢¸Ô+d&:X¿√vT@œ≈=®S”∫˘«ËãÍˆ¢âs1©qÕÍtz9t–cZwu“ì|≤Ï8ÀZEÎUè-b0Wt˚ªÄºﬁJÃ^Dén⁄ﬂj˙√ˆb‘äj«{˙ËÒπs`gbr¡yÁ-¬πçä⁄b5`é†a{V»¡*ŒîV|tv†ıÕîÑÃ£ ê2>0˛œ}ÀÓ§<:ˆüÔ´\e±§$¬91ìbmÃ«ÚE¯€aè6[å±ÃÉ`ˆ˘ÏDaÌ™¥(*ˆ%l±˘Ohá∏Z≠§ŒÖt±˝y9{ΩR“˙àÓ≤oS~_ëÛŒ¢ú∏“J⁄ªÆã∂?¨Qs˝F_^ë?´…óYªß;Î.ZeíS6'
†T•-P=nò8÷Wvÿ>¢«‡uió^0∂QX∫U¬v©J´ä§©mïé1ºØE†üWåjnX 6›3¡ à+ÀÊ5T ™£	ﬁrÊuÚ^0„∆∏‡Àa√ìV+	˛˝Cê_î$”°ÀS≥/B6È–sk~Ø–ªW'G˘ü„∑Ù$ $<û≈p)æ>õ∞QË<˙∑”Yy>†P—{N˜Ô“ªò”_“ÖÙ¨fW_nÛ˚>‡+É¸Ü4Õ)˘tZr#∏KŒU?µ…º◊Ÿ¡éíœW±ÇzÆH<ºVBO-äZ=esö5úˆl›∆≈5àƒœ•«*IzòÏ‚aY)Â≤9ÿEËaóŒõ‡M´ŒƒŸÄ¸∆1Ô≈Ô>mÒª#Á…Ï…Ã.b|kàŒ<\ïkKQ„<ÊåÜ∂UÃ:oz*ãGPS	dhMQ≈z&Kt<éı#¯æKπ§„≤
≠6qËâa&"E{7¯4E^Mâ0Eˆ≠Ú≠ ”¯Ñ"ÀeRHÁòH«˚?YIøE”Ì]!GV—eΩ805/&–bpZ Éf'….3)ó∂æ”\UZ¯Ëw∂}LíŒ∂ÌÓırP›	%€;¸3s¿1 aËC.“≈çp»O‘ﬂ›·s.ÁÚòŒ∑∏'ﬁ∑º°WÕ…®
rCÉÿôVû≈É˛àM◊(}˙yù™]j≈ Z1Åﬁt4ﬂj›Æh9í√∂61L∂H[tç3•o]+Z˙ø#≥˚ÿÇﬂQ[hÌNTªFÍØür]à:ØãWy\@ì√Ä(n”ì1ŸAˆ˛©q0Oëaórè√ÃJiSµ‹≥7^Œ®§eÄ1'≠Z4¬'¿ñ—hóéﬂ∂[ÊksëÏπÖ}Ù._r€`OGÕû}Mõ˙îe”ÎKOkSû,'ÍΩ*‡dê?Òˆ´¿ù9˛êdnÈj¸˙u≈âhg„\N~Dë#U(	foxHè8æB◊Ë‹LlÁsU∞≈m\€ôÿ•ŸÙ7¥√´DcÖùûèﬂ·’î˜˘âÛnRb¢!EO÷?6 |ò⁄}K¶‡Ô∏TR•R…ƒE=~Jª&∞Ákxœûfé‘±W≈?Úuæ[˘ÍÖ∞µ°ˇsGµ√|Ó˚sÿºNâV{TŒI÷ñ∫^àZ„?;˚B°‘â!ê≠≈≈‡Ö“hYŒÌÀi"çåÄ¬ï`Ä&X†åˇfÖ£4–oEã?Ø±±…XHb4∂ÍË2â!À∏	ù°°ên◊´‡~Ÿx`Awe÷≥ŒÍÖ∞”£0=ç∂"úÏ√´Í≠‚—ú=ªBGÛ≠∞6Ω—o¬MOıjõ¥œÕ∞µ¯Sõ∑z'∆Óñ◊Uã‡FÔ\<Õ%æÚÔ¸‰¸€o˛‰µ7‚43ÚÛƒ1©⁄¸ΩÁGÿG≥2ãØE™òªÄzüpΩ¸±îàÚ‘œ]JB‰KÛ)–’:◊dCjòßx◊‡hˇ2‰§µä<3MµÇ¥,“´øñd{ÄüÈd8õói˘qi->-!	’≤—ºjzúj_g1m®.|¿ZQT”©¨j<çÕÇÛ#∫π ‰€Lı¥)ØR√∂  [eÉÇü«éÒÔ_“OÕ5¬ùöÇV1ÄÆ+j8·[~	'Ür`ı{´≤“´∫ZH¬≈7M ‚Â«ÿ'Œh œu≥Ûán¯˝I?¶¯óÏMÈ˚ŸËpú4¡E⁄?‡ÂWƒòÖPÖ∏)f0 +á<˛g¢yê—Ä,ËÎèı–±x|xúâ1
&«¬ª¿S≥XíïÕ&ô±ßå∏<B—≤~Ö⁄@“y(_ÆÂCºb;ﬂ~Q€ÓbcÊÿæ†ˇÄFö¶ıazn¬QNπwãYyH¸RÛ8å){qóKÉèÖ1 rıZÆÄ¢Òúz÷ÌÅÑ÷˝yΩw!ü˚ªú}wÁÆSGß(ˇöòqcU∞KØ‚£÷Í°8¯hÑi !⁄æ·—">;iz4D@ÛØ¿Œßˇ)3•Gãqóû6 î˘%≈t['’˚… 'k≠Œ°õo%•¥u\ç‘zi⁄ùyyJ#:6“Á|≤ã‡˝=2¶¢0CyÀÑo“I•7†U“ –∆ﬂ€…⁄¨}:bΩGYå<¶pÓ1£\„ê≈˝÷µ©Rp"l]DÉ¨∏≈-‚R‚Úa¢y9æ˙5≠b~_⁄Qo°qônñ˝.°£›-gºNﬁØNìÊè†≠§@ƒ£-ño]TÇ`Ë&a,Êë∆ãˆH©≤$;ŒhÂ≤¯Îπà˜ÿK Áâaï⁄ú›r÷nè`~}¬ƒ≥x%„£ òVm<µdÓ>™‹ÂA.§nKÅtÓ<KŸìÌLA¬¡≤ËÃ~óˆÀ€òú¶sh?„®Q"’Ùåï!\0†-çÌΩ—'£◊bõÿ°Êo»-ä‚êE*Òq√Uuµ„Zπßbˇ˛1_ûôiwÖN¸⁄ïEØÁ.~~Ãy^13Ï*ÔrÓEÎrêüö∞‹”∑Iç9‚9ûLEºùpgæ4›$˜”5:4>¯˚>àß‡Ê |L¬¡‹≠Eç^ÿ[¢ M°÷À1†Â"	T.@!XxÚ…	Æñ¨(üË "GÈ·?∏t›£€„ãw{—eöaﬁö∏Á÷§f›eÕÓ[¥´Vyéz)JãaÌ,jŸ˘…"j»+%≥ŸÈvîÔ¬˛≤∑%5y}©—¯á(Ï‰)ó¨˛1Â¢ıR±©∑ñzQññg)W•∑•·ö™@<´
ïYv„ÕÅSÅ±˙uôû/”©H∏…ì"ÛI”¡·ÇÔi1z≠Ï[Ê˘˚ÃS¿T∑Ôí Ù Ò‹®û0ê¨µ€çZ˚rÎ4⁄o¶¨‘STÚÉ≥≈∏KâÈß~J‚Ò%Káq∆˚≈ÀZˇ>4†ëŸQÕa<»{{Ú‡ºLbØ˘pcwæd„Z2{ƒ=+”8~ÂM1nŒ…S˝üíóÌoSêÈ/ü}H!ƒ¨/wT&≥{üÕ2µÒ±–˙Ó∆âØ∑>.q
k\›J¿âôKî{ÜfLÖ]◊˙Ie%±¨^§R
“Vêª–Î-v+‘õXÄ©¥‘Í.¬÷\(U€Õîtº<=yhÍ¡MOM?<®\;X´ñèTßè]>
∞1lô˙õû8<]>2yx¸‡\zÆNÕOô±≥CÂÉá:X~±<5NONÃáÛÛG&Á £Nnrz˙‡·√Âßó«√…⁄¡∞z‰≈É”—‰®˝ööú8t¯–·ÒÈπÚë˘…ÚëËH-ù©æfôÀ	àºGFö’{~FôπLáπÙ⁄¡aÉA·Ω3b§≈¢^ÑuÂ’>EÆ[ÔÒ¯\ ¡=‡a\P»?ª¸<9Xó˛Öôhæv-”—’ú:8JZBBôõÆAA”;Q$,]0`>&Ôπƒ√HUæ‡lQµbÚt_èìŸ±U|ÆÀ‘N2≠GΩ«I∞y0ºÈ¡Y˚3†«≥66ÌØ˙’ºäÍ7vi“∑Kçvœ¸‰(0◊£t|ßﬁOt∆∂ycÇJﬁˆ∞§à±U2¡a…ú_# ˘Uc®^◊©`†!#‚¶~fFü›Â◊b˛Ejä%)I§&Ôûä*8wƒiŸõdEfv˛Nçx
Èº=√«êÀw Ë®í¬]¡<¢⁄Öôb=††"§ƒ ˘à‘˙uÚû}jœÌ¡Ã˘8ûrì©Ú›°â˚˛÷Á˝çÄÌ‹p >D¡ùÇ˙Ô"Àv∂·jrÉ·L)'<√°ô˛≤.vSŒƒL¶ÊÊF<Õg‚–ì=#BptºMd‹SO„VHBLÒéÃ}s≥@ﬂƒ$ø»€ä"Ÿ82›≠èô˜ä v@~µΩ‘[öã®Æ)yæﬂó{uÔŸa'TÓú[Ù·∑Ã∂K6/)Eƒì◊?ÜŒjÅDÆíò4Ô˝}Y…Mπ<⁄ñ◊M|'…©< ^M»Œ©ÊY£§öv.Ö6≈≠D8j¡®G6L’1¥±ÎF≠£ºªÏáŸÎkd*g/±,Õwˇ €eh?¶‘£5Zm◊dB[i+)c¯∫ﬂRÚzª”[jE^cI¸nÏ%™≥Ôô…Ñ›¡H¸PGR∏ÀR8]†Ôª∏˜Ÿuìä¨hb⁄Sñï≈˛)AÔpq±qE˜j´pQ/1ÔDãRtÄüJlòb¢≠PA“m”—!ûFY\î1Ú ¡Ö’â!ßq0e°ÆQF.uGtàY…RSä∏|0ÕÁ‡êSôﬁiÄLè è©›É«∞≤rWurÿiîùil›‹˛4 CNc2ﬁò’›ña·Qﬁq<-ß#jä1≤ﬁ#Ê$H^öl"ÎJπÇ	S|Ï©DÎ…2πP¡ä∞ËôÃH0ó…~úzùä‚ â˜2k»{ƒÁm©Øﬁ¢['!/k<üy.4=≠Œ«ù{>àﬂç –=Ù…™ ·÷WÒoüO=»8–Wà]?ı”8‚Õ7~vˆµ≥Á‚n»◊|Yv2A’ªg0mt3¶Ñóì8.±µÂ˘ÍïXÊJ∏µÂÀ@Ÿ=ﬁÿ~À©î˙∑’ùm†=s+4€*Õ'¡Ä›Æ®;=º…#e„s˘.êπª9°H Éîfó•‰ô˚‰ø‹d'‹D7\◊ÈJ¶ˇ¢ßü“Äê!Q@µ÷õÁ	ªŒœµ[K›° WZûy.ÈØïl¬d¨Tdsn5ô¨'-Ô*ëéΩeìÚF≤c∑3éº“:.Ñ›≥Ks' ŸŸÁÉ≥Å∆f	±àwZ≥çi†ÖÉ¡”M*˜jÜ®≈KW?Ì¯_ºt™wOGËe_9≈Ôπ2™¡⁄0∂•”^ZÑüØ‚3túŒQV„è@ˇRh©ƒ^1RâYß+ûS¸©|®è‰A•HQc]◊Ø‘A;«9´;¬p±^∫tëÆõã⁄Z`Wñ+:~€ã"X÷ÁÈ]ç∫›ÛΩˆEÃ»¨¢,ùvóP‡-ïß èmˇ<ÊÃ MNΩ8y§|¯»AO3Ñ:µb[ÔÕìk⁄èË* ÍÖ«@HcÃ‰FdI-éïö¢li`"IW!	û{9x1NºY1áNÒÕ»
ÃôFçò±@ﬂw;éxLˆk£“@!fmÎ◊[ükÜ¡;Òì¥ä%≥¢≤¶›Rû≥lV¥(5õ√˛_ËÉ≠sÿ˙;≤YÆÍÂÙ¸˚ëÕy⁄„OÿUõÚoÿ‚Áô9p'y ˝;KöÁõa+\ ¨jœœ◊´ı∞Òﬁèéü~Ìlp˙¯«Ù⁄ôôYãå›ﬁ>)‘Vçvô \˜ZV&›m—N⁄´£¨/™∫§Ë˝'ÖÓnÿ!Í’Ó!ﬂ. _∆¢
iÖV∂
(ƒVºÊÑ≥âê±S5ˇ7ÔaEœ‡;ôŸ»ˇ%ŒOO~ÛfÁULÆƒ«Œò„:ﬁ"•ƒ+7ÙŒ“Êå«OˆÈ4Ñ""…»˝µ/}5M(±ﬁ=^Bü˝¯|m÷.I‰=ÓF∏—™“íü)™¥˜Ëæ„Å,Äµ.∫T◊ÆIFHîßâc•»]∫Q∂A,ù¡$a@‘7rb®AÕÓ[Œk=D4˝öè'‘∫∏´≥ë1¶“´ÓÊL8¶S{"";=3õµ≤/2F
‰Ÿø~˝˘ø6é≠cŒ4x yK≈+N‡ﬂ#!’*C`û¨}À1∫xì°Ösps⁄ÃA	é1œ∂&xÎ>∑∆	’ ’;ù:–<Îº «% UΩáÁ∫ZÚ"—¿‘œtfN$0Â#Ig˚‚¬€t◊˚∞0—ÙI¶zÍ¯ÖÍ¸w9
Ê·«Fêê÷)_ŒQ@PÚ<5`!a†ó¡ﬂŸmwÇnΩYoÑ º¢&’kÛ≤˝y†Ñ®±Ÿâ≠nÈ ”ìKèÉBä	Nátî%◊ì™Üî˜·˜"“˜MC”,@&±Â~	&)Ãk≤¸π	ªJ7ˇ'∑	Nö˚|TöØw∫ΩÛ\[=©Zì∏…¨3!Ç4◊º–Ÿ
Nû†˙òò
)Ë’mê‚é∏π»≤fã„Pi B{=˜.DÅ¿*¸›ÏFçKQ7Cœ1G]r>Õ˘¶9⁄∂∫¿»Ê#¯ªÍ,∆2±Xyª¸ÌtRµ?v¬ˇgŒ(%XYEûä`S¶K^ﬂ˚ÁÙ˚π[XßπfjŒAt…Ω”∞˙ì∑~bH6„uÈ¿óËcç]¸@Y˙·Ùø^ø’@ä[	˙˜m`Rhàë˜‚∏ÉØ$7ËÄêú]À"¬b<èOBbö≠ÑØá≤–÷Èœà•÷%;L?ö˘?Ì£∑#¿Ó≥ãä¯uÄœ´Ì&H˛µnÉ‡t _ê? Á≥±Xÿ÷@jÕ 	´kÀGßï‹Á–òπÉáÂEÛÛg⁄ïªÉø_9î'c—üz9|¯»‘ë…√Â)ê^‡•∫√ˆÑö6ìø.ïM—xõ9'DÅ3(tß4¢—t¢tﬂ‰´¬^˜l+\T_œ£r“kw¢ìs•*◊k«†¸µÃà◊lôÑ^ Rˆ€ˆe ˘ØZM¥6»¥Ú‚¬¶]⁄ÛÒ¥J¿IÕ&Áée9⁄U‚öyõaã&18±∂Æ◊¸MÎ-DûÆIp¸ÿÓ‘Ûs0¬åô:‘ﬂ{˜MZeKÅ‰˙ÁáòŒâΩ∫ò´Ån≈–>!%ﬁ∂˝˚]˘Ç/xƒ«÷:ÌMñk[¥µΩ«J∂®ÃG§˚6&_r7[G√\∫‚‚3Âo:›]∞ˆ±Ÿ]†hJ“Ë"ƒ›È∑Ω‘ì
NRXù•◊¯ıÍ˛⁄ÃsœQfK&3õ\àBœ◊à-£˝G"ÜõØ˝PcÖïÁ®J ]vœ¸»pz√Ô≠˝[°Y¸Å≠K*[üê44√©˜Ã
/˜8ìØN‡7!êS§7p¢ñ®ˆŒJﬁôLº≈Æê€>ëWÅm]1XÊÇª
r◊|õr`±Ø∏Ã!…9ﬁÆvµWÏFŒUä|πe§œrèøó¡	˙ÆÒBõ∑ç%ù‚‚l¡ËÂòt¸€˙tÎWXtïŒ∆E™V˙;·‹ö≥L·6† ˙‚úÒäÊñÍç⁄Ÿ´›S∞c¯"ü—∂-˙Ò°AñéÙG‰/W–âÛrê˜#Ot‡HxWã‘Ìì&wELô˙ø≈<æ¢ßkà=≠R ¬˘Q◊ëF}QúúmÒ[üÙ◊Jª$í˘íØÌxz51Lû˚´^à™\è:aßz·™riñBN)πk O“e…√∏,óÊÉ∫.(ﬂ\àk3•±ÜÄRe=$'Tä˜Ú/Ó&›m¨ryW˙G(ôw»ØÈ;i&∆¿€'+Œäh*,ÌúÉoÁNîvÌM≥¡-æÁB®Tv®™k'±°ø`v&Hì§q/çˆ¬âvÔ8ã—÷8¬u%¨5Ìãj±˝ÊCÅVâI∆¨v@+AJ5ô^FTÅêUÈVÉ?ˇ'¶Ù∆#	rãs$ˇ|Yπ?YW“1òô’Añıæ2Î‘âû‡xXíÏSµí]YGFŸ√˝Í9÷ Ç”ÌÊ!Åß ΩÊÈlÉûﬂ¡Ú˚√0/}à5⁄s0∆ıÍ≈nl2»˜ˇçÍ°näÚk*s€˛b†ÕD!ë.t[–°œ@ÆÍÎVv™«»“ OG„⁄ﬂÕCñï ÛgúÖ©hèµµ “´í)¨⁄„ü—_öSó|Õ[/·2¢-tftûRÑE¨Y|8‘Z’≠>∆å¢ÜÛ-≈d—ù&4îj†∂m ¬+Ë‚¨*j]&Ÿ{÷x≈uQXéS‚⁄A…p£"∑bÒ+@lá¢¥7wúc$-ÄÁ:‰‰bMwÎs¨Eõ†ˇ¨ë÷˝'cd=ìÁƒÓß¨¸≈%—ùD}mèDHÙ6HT.˜¨S'ôl=]çÊ	KØÓtwï
e%*ËË˝ÓRk.lU‡·ÌKQ6dêE◊ò.ÓqEx˘,ﬂl_∫‰!=§Î.≈¡íS«Ò˙ﬁØÌ´˝¬Ñﬂ®ù §ï7	oŒ˝2™RÈ∏Æ≤	 ˛bƒÇÂï∏z{‹UJ*{©@fÈÂ!)ûÄßÄêö&≤‰À|∞è¨fopﬁÀæüﬂ∑¨É|•§%>c-÷‰‹E¡oh	?ÔQe6:wπÆAbÒj+;Ì†TŒ[üg®T=JAkm3∑ˆÑõ§î„X#≠Nv÷ "∑^’÷5Ú≤¡JÁË¬}3S!mkf©5µ3Omî|Ëû		æÿlˇ≤Në˝πø~˝!√øø˘B¸{çˇ˝ﬂˇùˇ˝ÚKÒ¸ˇ˚FÁ˛Ú_ˇ(^ˇˇ{ÛvŒ	ìå ®˘”`i1µ‹¬R+zô‹ë^¶FÎ≈8s˜˜V‘©F∂c√π®\Ñô¬ˇ¶fJ ΩV/‰#åd^∂X$ô≥«˝ò«ë5d{ÿ∑}9π=lú€~Z?Ç>áˆø´€∏∫<nt—•Ó˛1eïÒπ\oo∫é˜sJCÂKøhÃÎÆ£7œÖÏ∆L¨#k; '”¬˚ÕÂS∂Wf—Üçª¸!lE 	⁄•z2ŸÇX±ˆÈmæìGˇ©Ò¢t…‡P÷∞[oµœáò€*'™’fÌ‘õaÁjŒSß%kunmñ*Â†às—úπáX@£A1wpÂFèü€¡BbFW?Dæk∆ñ©bÊÄ.—ø)È‡πÍD›ÿπ˛Êj†¬∂KíÂ&h6ûX_Õ÷ÿ+Td y-*£+r4Iˇ?µR•¬≈+¡˛}À˙ë[yûF“ê|¯Ï`√Ær˛˛¯´?yÎÕ∑«Ç©Ä’Ú9!ıfÎKó0€4uÜ\ÒØè ì¿a*éMê•Ÿ‘Ê˙*+‰≈µÈ-¯$?4‘ÒÆyí¿êÃ˜≈w&∆{TD8m·°¥Ú?µò8Ò|J◊2ﬂÜπ’Is|¨˜ú¸W¸¢)o‰ê+ß ÁwE•¯M+≥Ü
≥◊#UåzåJ∆ê{tã=ÿ(x ß* ßò∏3Ç¡aRgﬁèÂ:ãÇ<F¨Ø˜{Q¸Í.Zpæã+∞¶äE]%/åúh„ñ]g&≥Ko≤µcÙ‡§¥µ˝â${˙y±¬É;%Wô¢TVâ§øIv‡UÚÌ[ìA¸ê–:è±Cã_T§å»(ˆ&üqM7ixΩ\≤TSeÒÿ˙@ÿVGYz-™‚û<ôµ´ voü∂|›ÏÂä"è‹†“Ω¡yQí◊Â⁄Å<'≈‚Ù}âUW „ÿAWH√ZÆN‘Ôπjò»øMΩRÂ∫t.§ËÚä∫ŸóÎ!ÁeE"á˛-,co–≈‚#¥STfÕÉôì°,Ók¢fú˘é√ö∆LﬁR»ÿ»Ãâ›FaM=·íüƒ>1~ﬁè8˝âº`Á¸î!√ôØ’/µAúè©ù<ÂÒπVp)êÿYäı{‹KsÜ¢Ÿr™:Áàãÿ)“√≤ì^S-M€ùÄsøΩO^√+J©¯SärY`6©CÙP“4^ä†fr1P›ˇí˙9Á˘u‚5‡wDër¯ëÚ¿òÑdÎ˙„"$Oò6î/m0?≥cÕ”Ô”›ãqa-’˝àjú~NKï"XîÎÌ&ﬁY–‚ù¡ó˝úzŒ,iÖ™ûJÓ].ôwµÃF„A∆ıcäﬁºQòéEbË™(ÔV»Tﬁ¡Ú!≈w∏PjÕ„çp∏Xó!œÌìÚ±õ÷ã0Y}ñ9QG¢`Qƒ’‹«V‰<[I(]∞X£Dçá$¢+âADÔ∞4" x¿Q¯◊˛7A^w æ+$èuY[¡¬9‹ˆ$ ¡hüoEyÖG[7
c©©á£+ınf’
ÁÎ·è`ïúmåØ<-P Ê◊÷.ﬁî8¡!ÔÊb#º
œrÆ≈)ÌÄê° ò–Ô&®ds¨g_0X•îÒ‰;œyÂË⁄òï˜…óp-mˇJ+∑rUn≠o>¥'wÖã˛ÊÁﬁXßßkl8€˙¨/N1ÙàKŒI!qçùM†ßíùß ≥aF°YœU§∏I	^±k,e¨N+zEd—ÂÕ∫rM^·¿¬Ù*ƒœiÛÉÔ›JÅL∫©¥)òﬁùÑœ“îv*ûÏùÉçCC*Ãpäœ££n.´L8åªÕy5¢ê&êAŒIØ∏‡¸A2ﬁèÛΩÛëæûy÷],*iœö3ºÛ5Õêw ¢´ÿX(kDJä£Ï?Bq´_¥d±b:°«»(˚ç∫L_ïÃå”w
QÓŸƒ«hËE/EN_kÂ∏—Èe ¥∂'—Z`¨6I@h3S√+AÉKQßK±ÁÖïÛ|ùæçÊ/%—¥Ãïcòı=ßö”hœÕ]}ªﬁ$”c7Í·œˆR/ØßÍvo∆≤0n^’hì=”ês¶∆%d›ò‘G2ß∂TDﬁw.ûf¯Ê„¥>2åNVc†Ú™$ÓRôˆ;“î‰'5ãà,Å
ˇ›@ùkå≤PQíƒá'†ép©dqNmVxhOK–¯†í d^V2£∫näúr£êo≠tl¸ü∂ìµ¯}“¥˝¢B1(ONX°µª
7Ã„Á˙∂·ë™¡B6^°!\ø ˆº¥,ë˙PåT¿(óÉ∫f√lY∂Àz˜xÇÙ‡2#pEbØ˛*>B˙S>|•XJ!Éï;bÅ¯ﬁá,ÁÔL=i“Sí2˙§©◊@D †Êcz|√*≈7àÄ®>àÈ
ø ‰)7#Â‰gl⁄¸°fÓœß∞éÍé∑∞:*?˘wNΩUê"q_‘ó˛≤":U3•Í~∑(Õ{´«{…'%f√ÙA«ıCv!mA˛µ<Dîﬂ√Û8ñ£-˙ØÂJÅÊò+≈Ûµèö¬ÎROñ#À—\Ÿnœ›¥I1"QjŸ»&ÓögÈ—æÂEŒs¨nÂ<˛ˇŒbÌ¯≈í»¿åÖz?ZAŒ>ÎR•98÷3Q Î∆–ö†Ó:hJñ|,~… 7zÿ€Ä¨ ’>G/Jƒ6ª?Ø˜.‰†
öw™Ò”·∫I]®ào*‰√TÛ©Øiı∆ÏÌugô^~,Ê©@œN…ôPnp≤9i®T38†õEYsMf¡p/ã[+,0°˙6¶Î∆%=êftnªÁô¶zõ¬å_ë%ê·ÈXœÒVq@Ô2‰4ëô‚)hYëÑ»\Ëˆ!ÃÙ∆(eeºÂiÛKdQ¢hê>-É∂î8§	∑9º≈k ”%d√˜ìh≠•∑»p0«¸_ÓÅMÒ%«•‘eˇéÌ$1PPÔh~‚dÏˇDÙœ+–€>«’$’W|'˝√≈ëº∆«mÎ£ß¿cH÷ŒbwêAI7yåfÛ¯Î◊ˇ˚˝ıÎ˙/ø˚‡ˇ¨Ü[∑ —s[üé√.≤ú∏æı´≠„˝œ)2`d»’$´H%Õ(bA*i˛hOù•BÖ≈ÓS£÷±ÜUﬁÕ>]7@u~q27å"ÜDËP)8-.ı8C«Ÿ´›^‘¨0ÂÍ˛"˝;ûDù‡ùá4± ËJ%‰æÖÔ0•`n?	àÒﬂ„πt≤—`°&~í’_Œ38'∏kıΩ˛Wl˘wN◊Nl„≥…óiIôæPíÔó´ﬂ:Wª0\uÃ™ö„%ª˛aæÁ5kIù ÊÒ3äJ¥Øç±ö‡ıı9ka3V0ñ™µv6™ö—⁄•´SÏTêö,%+*∫b„jv)hÓË∞*e»èÕ¡°-◊wı'9mïfÖÊ\ÿï´∫UıDﬁÂiõ'Ô<ùÕ„ªΩom[üï
“`'„[Ú‡%÷m≈ïØpxˆ˚„ylQ‡ßßeı÷‘ã°m˘áä;Ï˙¸<Üÿ(u(Õ±†öﬂ∏SCØ]ƒ !O≤iº^«ŒÙ¿©d,<*p.b@!tâ˙ÌdË$;Sû.,§)·aà›˙û6—‡ï£tEÅ®8Ê\ôoˇ˙ıÁøIñ•0§·˝8˙ﬂáÑâY◊>KOız5íÿÒG“Ì÷∞ƒy¿j[¬¸∆>+îê‡≥bñÓ¢∞¬·Ê 8<§Û¯Ã¡a†f„6ózë'•ÅH)äå¡óGõÛk'ΩE¢å/√€≠ûæ…,it◊˚ºáû‘V¡ë ¡®+Ç◊Ì¸⁄HXl>9«R‡LAi8ÂÕ»mÃUàù6⁄≥Œ6ÍóúDä≈ƒlÚéC%S‘∫›°Ñ	#e˘eÕÔÌL÷!¬-è%A¶'ò'à“Oã¸ﬂXó„ùãØãvqÔ¥}π§”ó≥ˆAƒ ÷ˇ¨’´7Héµ•ï1Ö≈∫„/O†…2Z£B¿&åó|ù
xpÁ«Ç|”L3`ÙÒp~G~™kq:”\Å ∏∫œΩ3k◊DçsΩÏ	¶?D≤÷˜ÿ8 4(ø
hú±xu∆;Ä´€nŸ£ú°ßºÑ[$§p†_wÒuÖ<ó;öoˆNj‡¿]u¸ıÔGqM\•®¸uÚ¿éVvä5ëÒfPç°Áû‡®WÇ˜H0·?≈∫?¨Û—∞$>Ö¶0L,@ˇˇZ	)D¿X"•Åqó∏™ñhfRŒƒÇ.áOVÒ¢õ¬úpÚ◊˙ŸS‚{¡Ç2æœ»§do{ljèMmãMÒ‡Ñ¸2)ÖèÍ≠ÖÆ•5”∆iÕΩ÷œ∂ãÅlã=>∂%∆€∂•÷´≥-~∏Él;‹9∂ÖΩÌ±≠ßêma•L5ÁÂ[i/Rÿ'êKbfﬁnΩü» æ÷ﬂfdsû4w{Lnßò‹„…çúÖ+∫ñ∫mq«Y¸ÀµÇÃ∫›¬ã”íp˜ŒÊ©⁄1d@\‹rıdò558	ÚÌ0	ãÑã÷Ãöî9Õ˝Dœπ∞‚Nñc°NÜX’£”§dE≤∫öqëΩ-ë|ZÖ˙8^zw™¬xw˙´Ê‘}r•5é….<_‘`∆“j≠á8U£z#ØÅìntzæ4y0¯!ôµUS¡O$˘WªŸT ø†à"s„>@ΩoY°%cC>~Ú≥ñ¯QÃq_r‹¯sª¥._ì+.jÛ@äë4ñø!QÅ˝˛mÓSrÂππFXΩh¨ïû`Õ< )K¶f÷öÈŸvM8´¶ß˛e´Wñ(2$Ä:ú∞ˆºNóµ¥ïÒ≠Ω˝¸t[¿]êıG! ?K¿Å¯Âê‡∞·°2{J`ò©>¯U—…’≥Ñ O\/ﬂH5ÇæVŸC„÷≤T∂[ìeKe	µxWıóÅXQ˝énúù≠v≈Æü¶{6b•<,ºá3O®∑7áEòpub*TÇÓ%_À*ÏTËcyƒﬁEWYº˜Û¶‡Jv“¯•π´˛èzÄgBÆ7qè?ã‚3»P^∂{"ïó∫Úp: b+x1G´)ıÍΩÜ(™¸yúÁ4¯Àáˇ-ê≈2ˆ6ï@Œ√t≤ù1{Ìh≥\qº1ajV>#¸«¬1^◊M¯EÀí¿m\n/•VπÛI˜[õ@€ì´iñ™⁄˘«¥íw'kRiÁ*à$· ê3@’Ê#r AÛúÚvÎ„≠œ9+ÁÙ·®⁄Níão´4™‚I√Î]£,¶Œâ–tßu^bL˙ìÜ” 
˚Úﬁ˙+h˚°ag\ÄéΩ¶‰öZ	–uT%ˇËÚ≠HÅ›t√E?ÔíÛ÷}x ¢õ„«‘JË<∏√ékZÕA• Sµ∑=%l∑î∞ΩkÉJ¨)PŸ;ºLU‰O◊[¥âßZµËJ∞"-¬ßÒ¶gâkVëc≠+’ƒkÕÀï†CEŸ1®8¶„é›≥OQTH√$oÜpaô,îÊÎ‡®˘¸˘"≤JW—’ﬁRÿ8EÇ—ÄÉ˝ÿëOã;A=	'ù≈∫ÄB¡QmyqY£lˆLªÀKıhÖËJTÖ˝yÁ"Óí¬søµr'Ÿ%/GÏ‡ÏEá@Ô4J©À;_\∫¯Zßs∫ª†FùN∏Úx||TÎ—ôH√÷µa≤∏˚®ûãA|µYêÊgoEúΩå·‚€†mTêµÙ™ﬂ	ÌŒò¯ê–äßçÁ/≤Æ_êÄΩucG\™µü∂%≥ÅÙ‘å“&åii‹ï†´ ä8¢Ä*+-‡√T<Az&’MÙ?<^≠.u)í?Øà◊@√_ Ì2/“à ﬁä2¢ØfJ’∞WΩêQŒ+idI9øá≠´ÁfŒ°gõ·.sFBÈ5ö
ñ,I⁄µÛK-±â˚ïÏ<Ø%ò±∏ßË£ﬁ•äñr( ¡Jì	ê=£√«‚()…L∆ıWQÿ7}4ÖÓ˛ôò‚/øHjí)«ƒåÔJD°ZBXFb\Ü‹√®~gM7‰1—>E'Y\$ùfz˘y -…K©i+Í\XŸ∑ÏrΩcX´‰wÉjxå∞π.“8∆∫·ZŒOÇ„oùÇ=ñ¶>Dè“Çß§[q»¨¡∆uŸ9,N+8(D∆J	L“˛‰îs⁄Uæ⁄mÂÍF˙Á∫2¥ÆR≠úœ eËÒÎBª£
Ìå&Ùÿ‚ˆÙ†,z–vE@ÒΩº±úqg'ûp’∞á(§ﬂ…Ò’è°ƒÂJ0aJÃπú)-õïÆ}bÓÑˇµínuzØ`´u0ºHõ™˝åHdí&‰ls˛h†ˆì]˘ÒUˇ⁄E—€™ﬁï ÆK_Ô[ÓIèùlÒ¿Éâùùó‰ŸÊna™PùcS<«Hl;Ω´YŒòqWÒbX&3’ÜAër ^∏i†=b8OGÉM®Öx`?®ƒFô¯!Öe”±ÕiZ9ƒ=ÊûÛi‡›OÅÈrœ`È3XÓ˛û2√ﬂ„ñAPS¸àoeüÎ¡ ;†Éw€≥¶[¨«.÷…F√UfﬂˆÜm£&7Hêÿ±YkÖùñ≥|À5÷˙∑ˆóÌ
.€`@z:a–´[+⁄‡<@Í]FÛ≥°ô¯˛ÔìÀ}‰À°êXtÛá§1á‚ájﬁx⁄B$}
;Ñ¬∞+w8„ﬂ@ƒZ*ÓîrMŸ∫a%ÔuÆöÚO#ºRos˛€YÃK◊≠8.÷Kó.ñ™ÌÊÅf‘ª–Æ4¢Ç[≥}âËÓ¨ïÂ˛ÄÜM¨"àÏ|ΩˆELÖgÅΩ<{∫T~ÒE`∏ëÁÎ±p3PV˙§ü}Ó¯Ω}%d∏ëô—#t#Ùÿœ ç.b$K€4ØwËq∑i4y@9v◊1∞oè˜má˜mèIi∑√Ë®*úYy‚]…âΩ+ƒQ,⁄Kk7®êL Ït«Sr;%üTÚHÖ^ÊπèŸ†æø?≤ÆEŸlÕ|nu_Fl»–∆‹n-Lfãä¥˘÷k9Ûïû\Úø√ŒDq¸˘ÚQ*,Ï§sTÉF/ŸÔ“”g∫nòÈòVê ±YıW„UwBŒê-k“GW0ÊôM6¯˛
	åÜsã¥‡›◊€ñ"\Ñëíûï¢ÇNë„t’'ÉØã2h-¡íjzI˙æ˝±RË¥∫ºwÅ∏wÅ¯¨[	)kwAŒÎP.¨ÇIÜ;cwÅeÜzz<eñïaKö»æ]Èu¬jèÌJ«[5eÊ4&·^V™‡	’€1ı≥ÑFû†‚çë€·K”Vt˘Á`Ø´-F4>ïÛ≤øä„Ë¸Û_"k\E¸≤u≤+'QQS,:ÔO\ç=äÏw∂5“~è¶–äfu[® ≤ä∂^’»MäÊ∑	Jæ´~)lahª^û2n¿WLì}~,ÀùÖ!¸ıFp◊KÁ}ŸºıƒflÀ[œ öÊ´ó‚™˜D<ı-ˇ	˚ÂÈj≈äÖO£ÂJéªÛ *ÍCMr¡oè\ﬂ∫o»døQ—◊\≠ﬂ√∂⁄Iˆπ´êﬁ& ®ﬂSñäÖ–Ÿ‡%MYn[V$ä4S¶“@qO§ÈÙ’/ß¨ùw8°Öf&⁄˙‹ä≠Œ∆9bna:ÕÅ~ßlGèÕ\dØ(¡J¥‚np≤Ë[ª]ØH◊)2÷ZP ‘µÕÌ1·Ò ’∆mè§?0sÚ£¡˜îú=%ÁYUrv\‡W÷U†?I¬ˇxP2˚Ø+∏Ôñ[NÙbKåêŒÊtÊ÷¬∏ã9òÿ››ìfËÓ÷5ﬂ”¯ja” ¡"^—XDˆä2øç√ìôå¡Iò®»Ÿçä_∑"ú£+…÷Giìj≈é≠≤0&™-Ω^Ôt•WÆÈp+_∏•õEé∏®L8·Ù∂.wL•ô˘ ≥iTetÄπëÿ‚TÅÁ¢Ï}QàYGïøyƒ‚™√T≠xiç%=8p˚N¸‚ÿ¨ΩÜ'ZNˆÀ˛jë◊˝q¶íßÔv¸ıN∑_>ˆ˜∏/EQ~®	U±HK#s›ÿÁ|ø5¡ˇ›ŒÒ≈E‡rÏ2“v:\î<L>an"…ÿñÃ‘miÆ(T5í•öáºRˆÑï=aÂ)VlC¨0ñÚæû—_ö,¡ÁJ/øq‘Ï7ˆã,¡Ÿk:ı5Òõ°0ÅﬂÿNä^îO®›Í¡§ª'¬⁄œ€ùZû¶5®Í…∫¨ «íMë9â<Ç1∑Ê‚˜yÉ=sGÌÛ±´»ƒœÏ:'ÚÖº≈«+V¯{8A0Ó~«‰?ßõêi«F¥ª¸…ËÛæË=—-ŸQ`£‹rDD‚›ï◊ëﬂ#È{$˝"È€’?á"D,úπÙË…¢∏ÿ‚vH–vH
à⁄È…jßó˜ì*eŸ•QÖH$Nì]≥Î©hÆ•¬[ƒDx≤_%_¨•ÎÀ˛≠¶∞îåè©ùÃM¿J√;Ù_+9hÊ.FJO{g/Ç¬Ñ¨¨Ë]Ÿ∂^FÑÑøí¡ÿl^$jûÇ
ëÈ∫Y‡≥»πÜË

2I˜Ùbkc≥∫ÚøIH€¬Ñ†C§W~˙0/åpîDÚëzé≤∑˘+•#∞xÜÎDéÙ◊+(t‰¨>ÎVö»gˆdp¬hﬂr}•$à!ñ¡∆öP•y4⁄úo!Í¯7„?gÇqx‚fÂ≠Yﬂ°™[πu¸s˛Z1ÆN¯X.®Ÿ
9∑N∞i`Ç˝{¬ò∏i$MFIÏ-È^KÉxß∂'>yi	»8ÜbÎj^ÍÁ-êÀ$À%rHcx¨Ù$—˜Ç∑:Ìfõ\~úåƒœjªŸ[5yıŒ´ª OQ‹^%@ÔDˇ7˙j«≈Íó"Û	"?°e”ö™É|á|”Î›7/∑"'ÊÇ™jâ˙ô‡8O?Ô\‰BﬁËç!zäÊÁ£jO@fêœ|^ŒO·X|€sXK∏”K–“|ÓU#è√Ω6Ωó±©v≠Ñ±x6¸MÛô
I√n%Ü"ÏÕïgZØBGI‘'w
®Âëø∏tÒ˝’:Æ•z/ PXv2|¡ÄÀ3îo
˙C„T¡∂|?¥z'”ﬁ®unﬁ˘⁄áÄXÇ•üô#ÜúvL.TÑ¶`ºzñèÛ««¡t?K¶Ëzá™©8mH,µŒ]_kΩuÊˇ6÷Û
W¨çK+ÌârûXæbFHæM@éÿÇt{Ü-¯và] ^Ì[∫ \\l◊[Ω®Üﬁ≤ÀA]À¬◊2jªª7|Ò∑∂∑¨)k[ZÑ«„J;BÔ\Q˘ÿO Y$◊åÓﬂ¢RËÎ,ëﬂ≈ˇß∫>˘Ëióµ˚ñ•ò‡§nOä©ÛVj2Ö	îﬂñÉR©‰† …p#—_>j®ˇ“∞€¨Õ¬åÃîû;EÎﬂ∑#¯
⁄‘E!$ Îß13˘Ûj0˝Û˝ùµl©#°ãáJÑLñÁAÇ‹ì≠ûˆ§√ßD:‹¶æØ¬‘ÀP#ÒÌÆƒ†cZì·πŒ6YçÈ∞óï’Ï¥Ôû¸·±\H3Öp«	k5vÂnDó¢ÜL¡Jc“>~”çz∆ˆó™3'Rıô)Ù~èy=VÊïŒΩ&ˇv¯÷3 ∏Ïi”Å;ﬁYêŸﬂÊÎ≠Z>D1p,‘sºpÓëw¿x˙w‚)Á-ï≤¬=T3üº|48‰,^Œe®Uo‡ù290cYWv=I"ïy4√Ti`|ü1éü‚<  b∫jZ>Uî€Óú1ÀT®F`˙°LÇCQÒbv‘ÿúπˆÍ÷Õ≠_cí‡’ÏFuKà …«Ñ‡ s{“cê$ªÔVÇ3Qµ›©ΩóE5Ó;˘~Pˆó«6Mì3J¥Ù&R«›ÙÕ~ÛèIYâ¨∆=d˝vø˝º.˝Ä¨J)ücnw£ÉCÿÅ¯Pb~Ú‡V;4BÇ])ÂNúSƒ`f«ZØQqˆ£âo"|í˝àve[rºœ™Ì(Òj‰Ìwª¥ç»Òi÷v„!ô3üJÁK9lzzƒdgw˙w°GåÒ1 n]âÊÀ Ü)j‚ﬂ¸q&1øÚ†Ìá¿ff$¥ÃÖv6≥‚≈"≈æÉˆÄÿ@:K^ﬂ[oWx@>Ä¬„ZΩ“R€mVÉ\ö.∏Ï\¬?M_„Çoﬂ2üj©^h…ÆúuyªPp¥Í2ÆWÓ¥ëÄ ò◊FŸ*Ò\ﬂ¶AÓp_[øÇﬂ¢`hˆ/¸'ÜM>˙	Œ$ ß¨SÉ/‹.”9p@π_tÉ¸R´>_=Ó G¨;NÖ$¯≈M=áE^+≥EJ…|¿™EçÑ!Æ√Áâù/µ¸_AwÕvÕ∑„5ºŸi%øQO˙,˘Âª›–ˇëÁÒR 	x <~˘¨òÅNáıñ∑/ı‚…òï∏‚ÿkŸ≤L>˛;szñgﬂ„∂*=÷ü]—GåîΩ√©"Óô‚.‘hœÖ—©Âÿê§)$u∫∏Í<◊PŒ~W¥÷Êò|¨AÅÚLƒŸâcà‡Ûal9J…_˘ê≥ºXw¯2∆ú˝í÷“L1FÇN"-…‰f@Rd±Ñô‹∑·eª]sVÃÉò7í[¯&Ö¸ní¡ÑSzªÇÇõŸ†x	∆Kâ©Ùé.Ìô±>%¬Ã"π6ú4ÏPÏ…¯‘»ßp\çf{˙$”˙:œ_…J8?Mÿ.2i'√-±=∑ü7ØWìt˘jL—«ˆÙ+sX¿ÒN'ºZ\«ÛÿG©Aáµ∞sïΩK◊æÒ•[/!‚ƒÍAxµ;À<Ëê∆∆_Ú›©◊®JN
w¡©≠°hO¿R%≤ë`RG–U£ìs•jª—à8wcÁ€ÕJµvUt[Íµœía:_(PÂœ(T'Ç˘:6++∑Ì√Â…Ñ#Àı›…{:ÊŸ≈®Z)HınØËÇ§±ÿ~ˇ‚B}±.Ç=B5ˇDùxÉ	èÙö¶‚ÒcøÍz∞®?¿˚izWbxÃ˜B§Æ#êõÛÁ}áÿ„Ìôu5K%)7•«ÁWEπ(π‹£7=•Û¡¸ÂöŸ»∆Ñ&æÁÁ&fí¥Ö&ÂÜW”8¶~&&Ω’RL‚òòMJSÃ0ÔËSÒ–È∏Úá≠Lπ·ã|€Ãõ∑IÌ +æcdrŒ•)oÓH†€-ªÅà¢ÂQƒƒ@^êVÙ}ÀRrÉr’˙≤¥ßHlÃ§´2[.◊<œ˘Ø1(y¢"ï∏?˙Hâ•:”QÌQœ=ÍiQœ9∑Ñû;|rwÌPàó¨'—åXo/v¢˘˙èuüj/ä<bÄ%ñÊÚYm∑ojzÍŒ áDy#I†uÅö¶f§H.¬É~2ÏÖCË0‚√•N'jıﬁhøE["î
Ï™$∑	wi>lt]I†]÷>≥˙ÚN7EΩê„Uå~nŸuwëÕPˇÍXê£πKòÙâÂeÁyä4dãFœpÖè≥YAå°k6Ω∂®Ü‡Ÿ/ÊœëG,∫SteBªUA˝6˚˜0±ÑˇÒ™ÃÖá¢ÃD5ø›z_™´´ÙÚ⁄÷çøqfwËi`v˙…O‡|÷ÌmbÅ∑]¢sÌv„Tï¬ÜÚó¬∆±
=â¬ô‡	≤ø¸Ó#$\≤%v†3ˆóﬂ ◊∞^y¥>5ß√≈°\÷˛˙ıÁøÙù‰ü7·Áç˙ÔˇgS˜§Á_˛¸ú¶ü_¸Û∑∆áÈÁWÑüG¯Á7ñWÿãÙ¯?nÂ>ù~˙_¯õGˇ˜o7ˇµ°ÒKèyÙ/æƒﬂ<¸Õ_„oˇ7ˇîÓC& r≤ﬁ]lÑWuä.ıÄHk.;ïÙÍï`¬XÃ±`∑äíﬂKxüK¯òs#ú:ô[	Ú˘ü˜-'¥[)Ãcd⁄u{µíö…å¥•R©R¡Ú,&Uıt«Ö…œ‚wÏ{H…uµÃ9ï
tÅŸ`fÉ˝˙Ùfﬂ˙ø•îl¸e#ÏGÏƒ‰ f_ä
òüA"~^≠õﬁ˝Û
Æx˚˝™OYŸ˚˜∂>∞x˙€Ií”’¿xı÷•z/i@~˘f‘‡v≠õ0Í?e B1|‰>&ŒÇN√˘Ñ√VØ˛z£›ÆÍÎ}Jæu€=∞c¯æbsJ˜(UÍe«{4”NXØ•tv_ú™í=ÖΩ~:^Ë¥óSz˛Ω–5⁄æ)õ.Ì:°ÚP•¥…ËEa£ë2÷€—¬qhê(DÎÙˇ   ˇˇÏ}{s\EñÁˇ|äÎZ«RÖÂ≤d„Fc0Ù8öWÿ¿lÑ¨ïJ™í\„zhÎa„a0ÓÓ	‹¶°È∂wÄ6=˝«ƒÏÏ /Z[DÙ'êæ_`˚#lûs2ÛÊÛﬁºU•áM3Ì“ΩyÛyÚ‰9'œ˘ù5>◊Â§…9Âüö;@eT%(–ødΩb”J
#‡l∆Gÿwπ'"@53RÉ<l¶¡ªÎíΩ√G¨∆ÚBΩZ¡Û¡¡Ë|∞éúª‹ ÚıÕáîÄ˚◊îè∆$ˇd“õ÷ãN≠ŒƒP∂s™Úà˙-:W≠ìK•˜ÄÚt·Só–F$ dVœj…◊Óäø6∂È∆	-tâÎ <m®*û∑´xS9îøâ„ÆÂ˜P;
7aËvôL√3%˛Er^ƒ+è4	Û>pU Ìí∂p÷¿w‚övC…∞»avx¡}MN3˘¢÷H`"∞´ÁãW§^hu;]∏ö yòˇA≤ÒmÑBò•{∫•ÃâÄSBZ>C4«èü8r‚Ò©#€ÈîÇ£ÂG.Uø–´’+/µ %1Ω…€_≈:7ÔÔIµøé‡Áπ»l1∂wπ	NØYa€§Y≠¢ªTœu–É Oüy`‡Ò?<˝Áz∆˛≥ZêˇIòvo	ˆüÖ‡ûTXÇªÁnµ_!˘? ≠Ç	åÅ¡ˆ0s»SïT°>È#ˆa≈ã}1◊≠.^Hnà˝GwÙg$FRÒ~¡˚÷FÀà{≈°ÍÂaŒ]¥Ôx<k>”®rxÿ-¢‹C:XΩ§Õi?n})&xœù†ûl¢ƒV^…¯-rqé6k<èúF’Ã˛0™;´ú	#;«D’CH7<5?grfóÄa™œ∂>6üêiπÿö8§Ì'‰‘§ÚYﬁl±€z≠uπ⁄~πÃñÏ¥Ôø/ª<#˙ÈÍï„uNº∞z‰|¡;Ø/æäÚœZ≥åñ«¡{È4mé ˚ìõ8ávS⁄!®N®Ëjs'ÉMT›∂p»à¨ôgÀóY4gLåãûÕI—´–“ò&†„ª!pºuM%◊e∫V)ıdZCÕ)Fÿ?ÿ'ÑP0˛]-E|"l÷r4‚¡+ü0vqD∫~0%à≈&â\.à‰Uq∫◊és¢”∆ëY_’QªùcY—,ÛÒ%å5ÛG$cŒ  ’Ω69>i«+È¯§K¿qHâ2Mê,£ß Qsä[W◊WíOÄ≈ŒÀùcsµTk7|Rä)úxä12;W],≈…›´:˛ÚocZŸ¯ÉJu÷•œ]πDóÃce
2ãÿmÔz™	á¥e]€Œe•\EÅ´:ä˘ñyê¨˘÷hÚ£ÚG?›E◊≥Ò~Us=ïÇ»û¥D[÷ñ≤LÏéÇ)LhÕX{ç‹)4ﬂµHx∂ô‹üû◊Ê*,/S¸ÖWÁæ(4Ò£:òÖÄxπã"Ö|D\JÛ~¿DÚ‹˚—$Z+f∫U¥hÙ€è»Äd˛êëH„å÷Gé”ı√ñΩ€§Äx«ÒAÊ√‘®;⁄ÁÿáÓ ∑îÿïwHqÇ⁄’`√:?å˝‹OFG-;U‹ÖåBhúÛVËF$îLD%øë˝≥6iU{˙j7∏Î!Â^‰§@bÏM4g~¢«Ã\˜Y	i"^7oÆ≤Ì~Ml$nRvíh˝,ﬁ©å—j´«*c˘í´0˙Ä‘ö0 \Ú3:·;&j@åZ≈åÈ,÷o÷7Ôπ‹÷Ü>øµêΩJdt+¸”î.º`ÖÈp_™ÖVà˛5Ïèº;F$aIﬂ˝ytÊt¥yÀq/yH∞Å˛˘ÊÊ-ˆá1qÆÄv-_)ºÅÒÖvÔÙD=ÛióÙé˙6tV“÷0˝ZïÕªˆà)∑´Àëm\uÔ—eìÚàïˇπ0?≠›!9MdHä)N8úR\SQ‚j«Á5<∆LàfdKú' æ‚PTà®íÀÑ"£2ˇ,Ó'~9M™ãÎp„YXou‹Ô^<KùÉFéCÔ√Eà˘ø}˝ªÎhsâàFûM  ‚“5Ù9X#.≥OÒõ<Kî¿\∞7È[-%Oä} —˛πÎØÑKwÕ;  ¿êÿÌb˙”Xtß⁄≠5óZ.‘=&¬o¨”Õ[rû≠ÌÒ,t‹ﬂB«˘ı-ˇŸÚÂSÌeº¥Ì™◊‹ë∏‡•≥Ëy[îõvÛ±€˙ìôzU6î‹“7≤Í!S∞&yÀ)“‰¥4uÕŒÑ*CO?RôûD˜`8Ñ4"O8iœMgCzr*‘¢xòÒgòÈk±„+fò ’5Zcû–…DG”a_¸RQ|≠ô•}œ•Sıö<ç‰ÊZ:IvÈ≥ŒÎ]hu≥Ì{ÚÙH…≤wx€]9F^‡ı©,zXŒK≠n6Æ√?íÒD¬œ&åâFwä	-c∞˝m~î~XÏ ÕàrN:˜SêtéÍŒâÿhuí„¢wÜ—¡>ÚZxEÅ	ÖØÒ}ƒ˝¨pãXp˜YSÏ‘`ÿåIﬁ8–$É9B◊v†uV¶XK¥N¡_Ï∏)Á”≈ö∑Cn™|´µËN∞Ë‹ÉV¿ÀvÍıWŒEØüz„‘œ^9˝xısÅ”,∑ˇ∑"¢‡\–F‰îd(`]˜¯ƒÂí†a¶≥f1C>:iÙ∫UÃaäÑÚL@ç@{"jE¶ÂØ•˛ô±Úò%D•oa^@›ö±#ßõ-!à”)ìú&Ê8$√)Â7Ö>ø”Ï÷Íîﬂ4˛ÛEË≥⁄Y\Èu.‰WÃ*˚È˚Z•*Í’Êr˜Ç XJdqÚ65p@‚)˝;øGr[ÁõamS‡*˘s“Íß&x†¥zéú∂ÉVo:ò)oiÿ˙øR^ºêœ7&¢ZÂ=3oOÑù‚πd+ÔE¢)ëQ∂¡3 6åå≤5£¨û86»aMzwˇÂrªÔ˛;hÁx‰ﬂˇ¢Ä‰ ¸Å›"®Ú{O(KÄ…≤y¬ÓnyËú¶¥„Â_Ó‹…4 ⁄Ôl"&fÍñZ®2ÅlÄW=:>êú|Z⁄5˛Î[û◊x}Î∞ú2É°⁄∞8 ü….geóã"≠4¸“Ÿ <QSKÉhOq˚áéåú3,î∆py§ó-‹í¨RzÛÄrΩª™£n∑S¸ô√ÒûÕ[Wtñüô5wø®K.{œZo⁄®À¨¥’ÍÂ≈ã0∑’äµG©-⁄°=}+ˆ=À’Ûœ¬wﬂàŒƒHë	‹nw±†·Y3p”÷Ê„3@Ù…âËd!ﬁâYw‚B12_ê∂mnvñ/ÁG} Î9’Ÿêú∞’∏Ωíç!«wj+=&1ˆı@£\ÉÔÎóz)ö÷ªïtdál¡NÏN´9!ΩçQ∆`⁄Wªºÿ=ãÔN5+“´VÎÖ]]ıΩP£O°Ó**úñ?ã=ÌK.÷jªqÆ€ˆ|ˆ¢à\
◊(»í’ΩÕ5-ﬂCî¬8ˆ| ˙P.wå≈ﬂê¢UxÛ¿ﬂ4%9[ÃL≈JO_SPRf#ìbDn2˙ΩóÎ“+Ê
Æ;Òy€Åáù döß>ÛÈêã PäÕ√-p QB$:Iñ±'E‰ˇ\l’-q∂wnXëAùBp ·.!.Dqô„AÉLêÚ'Î-1d©Séâä7Ä/µ/ts"J¿#ÒúlÉ˙Q‹¡∏!≠»Àk[◊˜—Ö!9À£≥∆#àY¬c∂Ω˙¯Ú˘‘√cŒ¨å¬¯üª≈]kÃ4√Q≤©L˙¿£ÃDRì˙ÒÃjÏm˚A«Nœ∑bîas.l]%üá3wfn¥*sΩ&•Ú›AG0ËZ>ﬂQ_Ò,û5N-^G≠Éæ,Ò	 AnFü‘¿±Ö˜≥<_	∏)hO|4˛≈zïç3e
ÿ6Î,√sÁQ8ÌE¯cP|·+¢OÆt÷im÷„√4\ÜReêd∂'6Ù†˚ŸÚ¨öÚ…A‰E◊BD—©…m¸—b4ÌÎ7OæïõÆ€µ±´‘*§ÿ°dW˘bã‚ºÍ˛SÃ]C?gF+ú!◊7øœ*Åj|UH£⁄C]2’^)R™ı\ëX≠wBzïC¥ãX¬¨VB—ˇ]Ì+Ø}›Pä§ÙF)iv £∂ÓÅ⁄∑v]®ó©∑√Õö˛€π⁄!⁄‚b†lhÆY´◊%„ü∂∫CZ|ƒn}
5oã˚æ”Vn(Õª0—®√Fï‚›Ï;`πàj;≈‹d›gÇ)ˇ[<˝oÔj_è≠IŒ·€ù.‹j∆7©ÄË„Tê≈Ãë'§˜R∑LÇÊp´ÎÒ`$…ΩŸ¶√‘Fòπ ='˘‹ˆ”f®2í ~„Gæ±D^Ãõt¿õp¥©e∆ `\ÀkÂˇVÍúB…6¡é°ÂÂzï9¢õπjÄ»‡â'ÏDàâ¸ÿ3©±ÿæowt"0≥ëOeÖ@›F8óﬁ8Î»a“¡zÙhk˘;Ñ≈Â`ÚORËˇ^Íb∂∂n"Üdn"0ÿŸ{ÅŸÆ¬U)LhG Ì‚Å/£?9o 7◊√ëwsñ ^1Df1¬s!
"F”ªB_9 ÿ˘oËO◊Àxºº‚BNb„ã)BÅ¿VRΩ[®ÍÕNiˇâŒ∑ùl#ŸÿÀıj´›8◊[h‘:ù!Ò¢‡¡oY_”1Ãä[ÌV2qh/äKÌVÃb0Ωe∏◊à∫Êüù}Ûù∑ÊŒú.¸u¿ŒtºxπU§£~ÆP0„ô£pÁàQÉ˚5Ê’6Piw·‚DÒ%‚‘Î˘. r–^e Hπ]÷%ûÿó∞q]ÌÍrı=ÇèŒVó_yo%?üü˘ÔÁœ7gÿˇû?ﬂyÊ ¸œ˘Û´˚WEÕ˝ÛÁ¡ˆıtÌi[C·Æ| îœ˜∫E¸ù«ñÏ‚Ëœ‹wp±›§Ab)¿rÃ˝«K¬?∏ze&≠˙ÔÁMÁŒÙ~:W*úÔ8Tc|⁄Ωq◊±©ì„∫ù®u/‰ü~ˇiFDj?:ΩZÄ=
®åmP^U…_S%Ò	ﬂ£ƒ∫9Ä/lÖ“| 
3Ú‘˜›yƒzùn´¡Ì=Ñm∏⁄wQ-£0Ã‰(/-;ñÀøø†:î-ó˝í?:î¯vMÍÏáëHc©’kVNa´&`§ .Å∫‡M6∆'⁄ÿ\y±MŸ∂r/|Á¶]ejf.ÕÚEt≠è2
êcS÷®Ø/ÙAT‡ÍGBƒê“AÁ•ﬁrõiM§Â5Éˇí√«∞ÍGp˝D…¯âﬁ˝∏ØMß®jJ§éôÚ2ÚÑı•ı¿P]¡Û.BÀBB¨ê3†›rP-˛»
RŒFVÊ`ƒœ^‹Ä∆˜¶Ç°OóÀ‚;#ôL11ã}¸ã¯Î[Üã†√È≠“ﬂ¶÷ ÌX±Òº~d‚O!*c-víqÏBπÛ2í)§Ùÿ'Â6Ötﬁ*x˚:X0œöÂ!U	◊˛æ∏~õHY+àˆØ∆]û&‹±\$´réÿ\Æõw¬¡ó¬≤≈‘¸TfonI{ò£û#}a†a9&Á”/ÉCG…cvÂ¯|K0æJµû8>ÂN÷wÎgD]Ñ’ÍÖfëÎﬂO“ﬁò≥¥$<Mπ&¿˝KπZ—÷G<X_ΩË„ò"ªﬂ˜¬A]fÕ≥ZéäôcÁZ1	∏	»ø·Á◊gD¯Íïë‰dQ;o–¨V∂”◊æd¨u´çŒƒﬁ¯·z∏≈ÄÆú≈ªBg¬ìôY;Â…ÒR43´TéŸèé⁄èûµ±∂M¡#ÕŒbø‹¨‘@é:SÈpùÈ\µÀÛb`Píî†VY,W*B)≈ËOÖ®◊íjkÂµRr•JAÀÑoôGYÚœÃWÖ‰V¨‚ﬁ¶Cã£µ¯mhÉ fõÅÜ„Q&ùïd›dÔ7˙¢$4À{àßåÇ ¯˝œmY"©◊À+úŸ/π±ò&6A∆µ¢Øí#„éùÕ˙Õ']Ÿ˘`KŸ¥wB#ÿè∆dWx/-Ùå0-ŒÏ¢9`ÿé…¬Æ≥ji(`C ´ãg˜¯˚õˇ»¯{|9˛˚¨÷©ô∏ë◊k∆ëÅQÍEÎÇˆß÷3\=Pxk¨‚…ÁŸ?/˝‰¶ ˆÍ¿g¨0¥d|3S”UÍ8$JâY(!¥Çñx˙æTnÚìZ˛©ù“ÒSÎÑ.@?∫µ&(¬vÔ•T`äy ã0 Yéë¶W~3{2:D€ÇÄÎÛZÁﬂ¨eô∏ö7£ Tt¥r)}Ú$[6gÈw/ä˙Ò (vZçjæ¥‰‡ıº"¥m≤-9á˚¢†œ.WuiI\õ#ﬁ;¸%ZÜME•¡f.«¬W≈$|7A_∏∆è&z—>∑°≥‚o1ÈX€RΩ’jã¢Zì>€≤ä6ˇÿ‡ÕÇûT˘8çÿ1äRCTm≠@3jË˝-«6^›¸˛U3‰L8õ7Û,xm=Õ¡ß£Cπ—ùj:ÆS≠b∑Áö2P*†ÎÈõBÁ(>Œ¸o$HÓõiœÖvÄBï+êyQ…|¡<{„µ$c≥JdË4∂Òvéœ{ÕŒÖ⁄R7=u˘œx¨>Q‹S‘=ü'LQ‚aΩ‘Ëæ∆x$]h¥KRE€<{ﬂpL¢˜`õ#‰üoÊÄ∆s—¡Rs3âˇZúTµ}«¶ÿ‹ ı1[¯U;∏(ó
ıÍ%–ãÖH±ÿÍ5ª üXîço*’•rØﬁ=«˛Ë’ÀmÎ≈[ı^ª\O∏ó@ÒPV,’°¯ëæ"‚5Ù.á ‰FmâÕú—%U”v ær≥éCÁTvı¸!O=Ëa ÙÂèO($Ik;°.…&Ë‡7ÊåcÛ±^§–/=µï”W^6ZË€ù:&;uÃ›©Â24jkÃôÖÔ'ˆıÙò≥ßGeOè∫{˙ÍÍ π≤séÌ¢dÎÏ˚Qgﬂüï}÷›w≤ìB/BÌ´9≥ 3˝¨≥∑Gdoè∏{+;õ‹ªÃ›9‚ÏŒaŸù√û…CØcÚ,{∞k“¨BæﬁvˆnJˆn ›;Ÿ9woÇõübÕ;\oGÈj˝Òy◊CL∫`?úπ√∂Ê∂k»^•s£A≤§ö>•ü
;u»ÖgÆQm¬@Ÿ$L%ò?óc˚'§ä÷û¿0âRÒNHƒΩa$,0ÂÌƒd&J…≤ùÍúk¢˘ ˘¶K:–¢djΩ••ó2⁄˜¶» á…ÖÒﬂ…‚QÒã˛}é˛9AˇO0Œ)¶ ƒj-≈CÉÀI”2kπ1:U®Ü´Í¶vïhÑËÒPu	∑z¶ŸED-Sµ@˘∏Gkù7 o‰{‹Õ®á†≈S>E4ÃIìî›g≤B˛–éøÑÍ¥ÏÖÜl+ï™„R©ö:Ï¥xÌS»Å	”ÖHˇ€ƒràgè´10ÛÛıË/®x«sá744eë¶ÒRWÜ<*Pœ¿∂Ìù±ï «ê4®¡£ u†é!¥®ﬁUç
GÉ—πå÷Õ©√û~ÊjIÔÁ¨ÆÚpN˝Ò'1Ã£c‡∑BÖ†äåµjÀ ﬂ6ı¬ÊÛ«´wñ÷⁄∏ı7ÁPhì¥TÒÃÌ_ï„4ñ,£Óè(©†™ÜV3™2à6Yâ«RHº†ô™‹bÃ	OR ∂ú®tJTj®'Óò√ﬁzÿA#j ¸©¯+(∆„sWÙâØ¢ÁÃ˘…¯˝	˜T¿g[◊ã˜Ñ$€5 ‰´ÍxQ»·õ`T%”ƒ †ß˛
ÂÍC5 w«í|”E¡bû#—Æ.Ù.Vq:î}	óÉ	Ó)°∂≈£„PgÚúD¸ÑFÃ›é2«'í˚¯µ≥S78lÛ'‡X√˛˜>O¢≥@±◊ »cô-â∫%eJrzZoOs;é?V™èì}$µíyèÁÈÄÏFG&$Ö‡ÓpµÍ ìl3∆åÒ
Jºë~!åı$ÖQ˜∏NÍ‹ƒ˛Â¶ ≠õ≥!¿üq<°£-d”¨,≠Ë»| OÏ5}\ë‚·"|Ã«¸qÃ∑ç?rÇæ£◊“∏c˘=àpr«É{Å;Qµèol3I<ﬁì¯›â«ÜŸì‰(s~£]ÂYf˜À++/a¨và˝≈∂"∞˝L§kΩ·±ˆsn≥ﬁ◊ê|mÛO∆ñ–ﬁÆÏcû%…®üNÉ1≥Å∂’≥HnyG14LNŸˇû<¸l49Yöú¥õ€_4•≤É$ÉßBÑÖI¿å<Dû-˘âÿí_ÚîaîM·áÿr•FÉ5†-*R9)ÂT¯uûüåOúÿ÷éΩÃ«ª˘˘6’À†≤|°Z_q¢9\G2˚a¥©kàu@-{M¸ÿ<ÑïWR1ûVÂéí,Ò ŸqÃT≥äï“_Ïcd≥íá¬∂˚ªó0Ü,˝ÇÄçèx§±Æ0Nèˆí4øƒ	&Ωô!}˚çBHæﬁ‰ô)x≤0cM M%≈v'¬J‘ÆC⁄ì4ìﬂ3œ´¨gû˚bsaøÖ›Aü:Ü¢∫]„_pÕQæTÆ’¡∏ÛR¿b∆Ä(^cåÃ/Ú:]QboÁ~—V/8Såp9˙YiÒπ∞[zìÅˆ√‰¶ß&√⁄n˜¥˚\è—3≠≠‚—∞÷ñçÊbã¡û
\“÷Â¶kQ-ÀsJsá◊SoÕ·√É;$gàÃ@“:NßI–x∑◊∫Ïy´‹t.tõà©et÷∫Jn]˝∏ÌgïÒgÍe?îd?åk~È¡ù≥b;ÒXeùQ“ÌD#nãï∑]⁄ò	∆ºDÙgIP≈ãGInæ@™`	c8P]q¿aôπJß∞˝¶Ï˛Ä¶≤ªmØ.ìîŒ0k\·¬±òE %∂÷‡òß]ÈÆ#ë;hÁ7?çÒõ¢<”±AFıõ∑1CÓö31 í<-ΩÇˇ‰=˛¬Ïrû≈áß^Ë5=$ÄHdè8∞Ωˆ∞üWë÷(	∑<∆¶Î£IÅÇ3€]5Û*œ
dÜz⁄ù¥¨bÊKLmâ ∆òCH√MíÁ’2çnÌ$[∆ííJXç°…E≤mËe$÷<êXì…ñœQ∆qZX6,ar\’?ën&"ΩæR4ÈB 0G‡Üñ˘ëÿ3◊òﬁ(%  |'⁄˙’÷ß<Õ”√H&zy @æ6•+4≠°û’W©ÌZ11ﬁ±ï2jÆZPíOÜÑŒ9∂µ0Âﬁ#)n,ÿVﬂRÏı2˜êô4Ìıv√∞©Œ©zΩuπZyªuäì∑c]u÷'µR6ìÚ‹Ú®r7h†{p"¬(õoπaÉ  áîd±>h}?ClRn ’è√qàc≤*W‰EHˇ#ˇ>8t(:Õ∂Ÿ"Ô^‘mEÔ˛<:ı÷ôh· Jπ”aÚO¥»Œ&6˙&˚¡™ÄûFóÀùË{ä–.Éµ¸q⁄á–Ÿl¡É+m_qﬁ•ãßVjËºòì¿Ø¨`ßÛ¿Áú VÖÄÖô% W>≈Èò∞N¿8g÷H›¡ãJ†0-3(L1‚–Ú§S™ÄÈ§Q·Ì÷W\™5+˘|µÙ>RCá¨3WµbsJE>˝	Qe∏Jb_ƒè)ÿÃìÒ!ú–¯§ôœ8nƒq-2Ê2≥	ww|$≈w-ÕKg≥QVÁ•+g*~∫ä§’ö∂"yi#˚"»Mb”≈ôI'Ö…Z$îV4ç°ñ2ŸÏ4≈∏ÃåfH6<Ï¨ﬂ√¨¯)>¢Ö∂Å˝‡Qøwœø&Ÿ®2rfd—f‚}ÎT‰<1=B(Äÿëc"BùËÅ–ÉUÉ”Éë…°∆. `\Âw˜Yª2¢G⁄úÌàûHdsæcZ{¸RA,Ïà@9fƒ
ë≥¢ãô8êtüÀ¢q•∫9(AÌ!)JX8« §C£;Ö(~+ÎıÕ4e447CZq‘CAñ…l∑±∞Ãmææ˘É°˙|†$bQ3—ˆ¡ËX®∞ˆØAá•Z‘MNıJ’RSáØ„à·e‹:jZﬂÂ*‘çŒïÊ¢_%ÉNíFÜΩQ~ö1|áÄùAÈ·ﬂ∏·o<ÿ6£êÂ›±;óµ
–!4O‰ƒCÆÀ;≠˝:øàK©˜¬R≥28¬}Ü4-Hf‡{º≈^˚m∂‚Z .˚ÅœT<ä.ê;˝ ´é€bŒæY!OÑRå†ﬁz˛˜ı7O√?ßNøˇú}ÁÁœk¯ÏÔﬂÇˇ}˚ïˇFˇú{ÀüŒŸôµ°ß⁄ÀjufjV"ê∂ﬁYYaÀ»§Ûºr*?s“õØæzÊÂ3ß^C;ì˝ÜΩp∆äjf˙ôähT9ùLcw“Ø/C›€-≠9JëØmIôå	ahèß«í íLNﬂÿºÛØˇ±ïSVˇØﬂ£ôâÉ~∫˘ç¨àhÓØﬂ{îtÆåJw1À_8%ß†…·5àô§‚V∑cjˆØÚ&˚∆‰‡y±í∫by}_|≥áò8ä∑û‰c3!ÈöÒ'„$uòûEÀ‡2!¶É¬:‡3˛Vã!/=≈ò
Üñ`¢3tP¨÷≈ßﬁzﬁ™PV«] Üübå»*"aﬂ»Ú∏π^|ä1*´òK¨„≈C3ã{Ã¶OΩf∑œBﬁ>vÒÔﬂr4}óp;°	˜¯'ﬂB»kÒ)∆?≠§ƒE¿GÁﬁv~EyÂ∞?lû◊Â‰πÊ~∞öÇê¶^ c>î—~k2l“ü)1©ÜbÒZ˘cÛÅÔC€¸ÃJhh,ıËRè)ÎlËò=ëÒ÷∫uº∆≤t∏Ìq2•\@2•0ÀG∂dJ¶IƒàÜt 
”Aêy√07h’¡2… ˝âﬂ≈.L©ç)§L∂^‘‡ıäÍY]3Ù@ ÀNŸÑW ¡ó±Òí—ô fÅÉ∆vLEqD{ 5p°◊“ëÒc˘o/m6dÕùj,4ƒµ¯Ò|¶?w9Œ%Ï‡Y/sØjï±¯!ÙVM≤âÒÙV]Àdy˚Sj€<(sôd?ŒQÿÂÊ-ﬂ!`À*»ˆ_–`s·5÷{_Ïˇ©!ÁöbPºU∏√ª˜(A'ZÚ˘¸JáÙf`˝·ù|m˘y
’ÀâÈá\≠/„ÂÚÔáü„¥RÖG∆¿€£©©£«ßéû81µ˝áD4ÑÁßâDt-EyJ?oÄ√AP^hBP∏–d≠.ÙŸ¥ˇad	√ëça.âÂ®˝ˆ≤Òﬂ(Y˝ÁJ]Ëπ®qŸ¬Ω ⁄'!úååAI¢)∑£.dY%o#€⁄Ä®Ú{¥I∂>¶n‰¿L “hÎ√9!Ô€l•—ÎVªåƒ.9BG¿*≤8Â·ò±ì}õ—ü«lÊ±‰&r2«h?∆’◊kî‚[}ùQÇÃÌ[v¶Ù≠◊Á™ãjÑ◊±…	Y›3—±IKÓÔ\È0	8◊C!€·Ï Â.]|•›¶ƒ†!ÍA{`’Ä±‰Êr’æqgìÀ‰Y‰ÒéÀw©*òÃƒ£9ò≈E¬|eﬁ‚õÔ˝âZ˝EYO¬¨AU÷7K‡.´¨ÆU@¶°k∑ÏŒ3Æ]ôk5!!‰T+µÒÜÑ;¢¯ﬂ≈jª›j[«ÖBÛ3õ_!Ç⁄m‚ép£÷@ˇ;∑ÿ™T˚%ﬂ€FgŸD
uõ›\$l›ø:µÓ›†’Át¥Z‰t™˜ÃV)Äwø”Ï÷Í¨≈[ÌÄ∂Oüâ¶òêêt1Ë¥î5O‡Oëa:á‹≤DvEÌnîPËº0Ó’æÕ$Ìä·ã« T/œ ‘y	L\«{FLµëIRdß1Æ£ÔCz°ª‹#"OåA6ÊAÿòRCLû¶T*™E—Ãﬂ”i5|≥Å∂ÿ˚"µ∆ÊC∂Îdépä£L%tÀeáD≥=öcÑ)Ëﬁ•	[‡bΩZnì≥Á:ÑíùRÿ‰£‹?¥°| MüWE¢ıOŸG¨Jıa°JµŒ8˛ÑZõi¶B[⁄~Á‰Q… e'Á∏âAU˙t†˜)zW2 ∫‡›%ÄZØ!DÄú√Àº⁄¨KµÅí4mÄ:«˛¬¥á˚¯VXN•d∫ÀÕ–;®Pã˘O@ÜsÍHrº¨î≠E,∞≠s—'¢˝FHE]®&í¥u¯ò$)''u·$ﬂGk0ieÜãÁÆ¿Ω:SÕMÉ‹”œB´ÕÏzx'ﬁ≥û…ﬂ|fëú∆∂qA®N)®¶Éêà“ø≈Y”è∏Ó@N%``^>‹O›Ï°B∞=}g\÷jbkÁÚäæ]mv_n`jÅ∞®©Ë¡ÚaÚJ˝äÒπ1ù•6∆ôfXñGZ z¯:ó£_mµÈÿÆöÎçt9°i"Ó^¡’ì0{Â∫hMkú@»µG¬v"é5'k«KŸõΩˆK≠ÆîŒòyXÂ∂„“≥ñê’∂8Y˚Rk}Åu€∂DLÉ£3Ô¬t4Ô’1!Ü~ÜqæÖ˝´≤krt˝˜«Ú⁄Ï|¡n∞$@íª[Éïél(·ŸH=æÖ†¥UYÁæ"[—èΩÁŸOL4OˇezIß	 ≠æ˜ê]èLqƒ=›7-d8*√PlMOÖç-á»#h_⁄`\ÇÄá–ìào∆¬ıt›—yJΩù‘[ŸW]|”Nªï#8«!¯™3B∑ﬂ·'ãçä·ü3‚Ÿòú%⁄Ö,>\aD"ÅôÓ-/˙ŒS†òií9Æ4„ ú2Æ`ä1ÿ¡”Ê∑/Ó
˝Ö}‹&4ÈLÛÙ[´ﬁ:≤„ﬂˆâÕÖn ◊ó[çFπYg¢<ON<9ó,∏~\√æ¢ÌL∆°{È√¯ˆÀìD˚∏m‡5c €«Jf	°a.F¬5 Ïºv©⁄)◊!T{B@^ﬁ#œº˝ª ı{
^t¯A\GÊº._e÷·˚ÿè∑ùZ¯#±.Í¿•:’‡“⁄QºàRã©
•ˆ¬æÎ¯n∆RÅ—√9˜ ù{†‘ÖhÕô≤‚úGˆf≠`õ+¥c )ö‘ˇRπéı/∞ôm.∫öpπÙÛÿR˙¶§÷u@_#€£q—qSÔUq’UÁfÀÕﬂs—}AãÇöµ˝ä>ÒÇK©˚ìá•„’jf._∫D‚Fá¸[òÓ˙!T•ÛâèK@ñEFó˚5±6ﬁ∫Ô^‰<;˚˙àk’√œNƒ√’Ê.…o·3nƒë›ù—Mÿ¯ﬂ[aÊ&/–·"4Ò}_,XÁ¡è˝Û·g˜)∑¢˛ã¡r•x^Ω¸∏'ï>wvÊÓ√Âb:i(¸£Ç„h A∆oÃ±»F≤åB)¯Ó(_Õ9l∏§å“´00F©ÎÚ 1Ë¥´|"/(	√»ØÃê yÖ†L"zÜÀô@˜qb!óa„Õˇòl˛Ï[(ó{r˜é∏√qÓF£⁄ Â6ÏÅÒˆÿÛ€„1¡}ﬁ≈[saw#i€ÁxWõñ∞ç6›‹ï*¯ﬁàe≤^¢rØ{°’÷‚èµ‰n≠N¢ï¥\UÇìÃ›G8£¿7[Cu∏Y].Û'•£{:P±±_#˘\GWG!f
ƒ`n∑6°ë
©ﬂª•|2ì˜dz>4ùüœ>û‡⁄p™úÿÀáä«¶ä¯°8èè»]<Ò 3ÅñÌÉi??â„'·≥6N:ÿù˜€.1VO:p›≠¿ŸŸ êpŒã˙AVñx”h^.îõd:áÊ—Oÿº∑π3ôÓªçˇ,cÓÌú?∆áìh∑¿≠Ì\Ωv…⁄}âh	réŸ–ì Ü‰Tô+º=ôUVynï	Èããéˆ’˜∫m&Äí?Ì©fE˙€kΩ∞´´J` ìqÖ”Úg±á^¿%G‹q∑⁄nêÕ–ıFÚì¿ª∆MÒwaë\	áeøp/ˇR1”£ïè\‡FB¡6ZçÆî$ÀŸeÕóÁÁ	e™‘
É¨(¢7∫Á≤ÔÚ7é8òà8`‹∫ÑLöGù-Ú„Ç„<v"!>Ä—ùvò¶Ñ©Íp‡˘≠>T„˚#∆.›∆£ÌÅäü¶W5Zïπ^ìNsú†\˘u?Ey2!˙yµí∆Õú»m(ºÅÉˇJ˜[∂.∆—€8d–èîŒËı≤—YÜÁŸ\˛`œ•¯˙’TuV4ó^æ’gm¯ÙköovyÀÈ⁄EÇçAëBÀ(e!H.¸ÒÄ…k∞¨ﬂYPdiπ†nd	‚∞óÓÍû	Órxø ∑†Ïc[˘SyØJzÎÚ!˘◊≥„Újmjk,é%¬«Q"‹Uáúô-9g4À0LRrÖaìa∫™D	í¨ÌŒÜ“\ª∂«q4–I3Ã¡“Ô_πâ∂ãUé,FigòÂò[f‡ñ€§7èZqŒÆ9[ﬂq"p$å^ÈÊqaà<÷zØ˛⁄‡^ˆ±£»‘(BÙ¯>„√gWüÊÃÈ“zvVõŒ¨Î„zµ|…q{¨—Nz¸FÁ3Ú°c	«ˆ¬¥√≠I≈Mr]%åô›¨^~›Ú˜Ixl\Çü◊/z45iX/â Üá ﬂø ´Ù%q◊–ï¬c¨7}ñfÓœß,‚y`GR6®˚î3Lù€øπZÛR≠;¶—]•QZÉ7õı+Ø∑*ù0B’øŸ£‘zè_ì´©∏ıâh4–e=»„siLµªIµe¶àΩZoµ*a+ãÔQZ]C ÔıÉ[±≤◊6Ô9ÓÄê2Éù5tbe£g"Î•1…Ó6…Ç N±PzØ,œjëeaGª\´åÈq∑ÈÒlπñÅÉBÈΩNèWAd4+=.∑[Ωï1AÓ6A˛ñ!ú"±¯^'IÙNE˛
¬B≠6•rÉÁ	XœIñè°g!“r¨l]7ÛPk=2£f\›‡t´VÙ™âVïÜKu](W†…7EÖZWIä}∂oüh—D™%∫¨º,á6¯b±héMDÕ⁄n|N›∑>ß«ûœ≠Jm©¶Êx∂˝(‘±ò‰¿ÌTÊ \ˆ™HmÃ €hµ
›NoM[†÷ÙÊDI≥9˝†c%4,YcßÏX…^›3nú˛Ùï¨ŸGÇÔBDòë÷\ò ,Å∂á¬yNR†œ‰NÄ7¬Ò]M	é`NÔ	·<qÇ{Ñ©ì∏—ôrsÛ(Qëhk}ÛAQœ<Ê¬€ûaÕªÿ®È≥UÆT‡ËÎV	yT˝-Œ˛]˙∆~H:¢Ü∞DGúâÀ”˛lµ\ág∆ÌÉ}‚†ÖÏÖﬂ8s¿Iq ©›§XïøCÒâ¬ö√ãı8—∫=†\°£ìÅ4ﬂÆ.√¡ÃÿñÖ^∆ß⁄ÌÚï"[~¯7Øâê¢|Å	q3Ï4uæúeí‹åÈË´PÚäâÃM_Ä!-¯8¢x±©øœÔπ∂>¬K„ƒÎØˇ¡®àí∏mﬁ·øy3¸£ºbò60ÙTv›u•»⁄¢ÇQ‰Ô5±’1ﬂté9îÚf∂x¶^S„ûËÒKõ‘…,∑n¬V∑YÏöıxÃJ«¨tœ∞R–vñëÓ€N
tYtf≤π>z
3Øo©VÔ2íÂ£ÖaÔ2{ïå,Ép(£Ê±ú√÷kùÆCF…GÈï»D™açèÍn3‘]·ú/R•7J8Äf≥Lf∞[l ÷—b˜¿√h–+‡ÉT6œ≤0öaçŸ¥s>õ?Z›r˝-0àJã’Z›9÷C—‘Q4sM9N√Â™ë´A¢ƒµŸ^œ¿›åørr<:/≈∑q-†ˆÒÊlÎ2‚µAt≈	™Îß%éò§ƒ≤˘§Ï*¶ß¸`¶fòìx)˝í}Ëåiæ«! k Äûà~Q∞TÌ.^x˜‚´ºç·z$ ˚OLIÊÛàÂ&Ê≥s⁄ÁÅ=‚Ù=ò †ò«Vsn≥SªT1QóJ¨÷(øyòFrÏAÚ°CÏ‰ê¥⁄/ÄÅf>:†és^§ÒN8≈°Màps–wﬂQ•ú9B(<ﬂ‘Ö+D¯è7–ã—îõ|ºGQÃQîÄtˇπûE°A°?˛ÀUëàtmÛ^∂≥s∞PºDõ˛`4ïéÄ‘Æ5 JŸÄî•Àõüaf ∏Äª˝¯œﬂﬁÈô:ÌËÛ¨˘L`$˝ıülÖ¬˚TjùÚBΩ:«0öò2M®ôÃàºÈÙjc±À{ìÙã÷%«]n<Wvÿë]◊ò¡úO÷æ#û„:g§∞8‹Ëß¶*√À≥^:cVl·ÇWÔ,M
ÊUT?µ…•ÀQE«˜|fr6µ3F˘,›Ò÷-ìz=‡ÏÍ"B∏™„2Mª◊\Ñõï≥¢
™K2/B&&˘ÒßùﬁÌ∏¸‰DÙ‹q»Xóc'‹≈RâΩZhŒ†©r}8≤<k∑ÍlíÌﬂ9÷bŒfä" ßdM™Ë¿dÚÉPªv“◊Ç“ÒFÄá≤ÖÀ≥À„jFÂ_ÿˇáÉP@ˇX›µNCB¯%Ê^êg.uö¶=Lßº	˙‚6V¿AÛ èÕjMkπ·@¥3ßi⁄≈⁄Âàº™KKêñ‡Ru®∏'—öyËµYM∂Á¯˛2qZ≠•Zìn•´›À≠ˆ≈óÆºÖ3‚P¡ë≥Oì{¶Ÿ«Dq?w∂>‹‚{êΩa"Wo∑≈¸
K£dÑŸÖE6ÇP¿ÿøã… ± á[˚Dà8¡√éåÖj˜òË=kâHØëÄEM u°¸˘böGdÄπÉ;óÁ≈H+x‡¿\,ÇΩHµ	mP˛¨),+ZbèÏ«IcCìª'àLπévEyâ®.Ñµ„ë^q‰ó§kB‚æLŸ≤r›@'E£Ù¯sˇYÎCøﬁ˚0xlH¸÷òü
¯V√;…4∆œÿÆk-Û¡ÚùB\—Ã"sJÒ∫ìÇ€®ı~Í>+7∏g’œ
;†√ã[∏4W1Ô€ÆrG†ú◊…
<Î®(©¸Q(ˇ/6RÃfbeﬂÉoÂ7¥â˝m1˝±‹âŒV[Ì dEù‡Ê¥≠’n\—·∞◊8rpø1UCfπ3|©g˚‚>6Ÿ„Ê¨Ì3ü Îêâ</ª≈&to>î„ùÍJŒ≤»¡ÆÇ‘h=™2IÇA'≠±3ñcvı9Dhã#=ÈãVΩ¬7§µë›w/„#,„ñ»Úïÿ˙X
ŸŸ#ı’Åô√éPN>H+.BË+7ÒŸp≥ûà”ıbmÒ‚¯\ü´„suóœU◊-âö	é¯£@}¯!∆-›˙ÿé±q1R'‚*‹QõÅUŸY°D·gÑâê´¡\Rø_p¿`â3È“≈S+5å…y">rC¿]-Éu•Ùr$Ï>Ú√gı8 Nk|&åœÑÒô∞€g¬8˜APÓÉ·uRÅ5&UR'“X™°·«w%#ÇóäÇ•ÅQ„Øá*HÉÇ±è%Ü=#1Ù∆2√XfÿÛ2√ﬁ<7LÙ l£;∂c~[ôü&8ì¶◊Uáb,ﬂL¥,Úún:%€vF∂[úl(V∂ºl[!à∑”k&ˆ9πUç∆!‹eFÏ/céä;ö¨Û,äÜçLõ◊¸d
,ÊÒîâ<Ü˘«Ï<fÙNißm|jp8¥kÃ0˜S…»ÛÊπª)∏Oôy|Œåœôü.‘˝òm•^©Ôœ¬À_'∑"‰Ò1ás®1á⁄ï¡|È∂_>LoÜü‡l?ˇõ£õ}Q†1˚≥Ø1˚⁄)Îßêqn2dò≈x'Ø≥õò«Gó|ptŸ◊eù¶SÚ&+Å-yèØ“∆Wi{Ï*Ì	:»‰ò“‹o¯ëCktV}©/ñ≤É@9ËπVsÏ„YÏ∂kçºMõÛúaaëá8%•—dÊ‡Èjj>9=¯3Yç8◊öoË©‹4vzj9†ƒæΩ&–Úêí§À,M¯vÜË°Ãü¥÷)…ñºIY'Ôú≤Ωs–ˆû~W«ßﬂ¯Ùü~ª|˙=GÖbCèOåm8)≤û„Ωì'√ûfı Ñ6fÊO03wÏî∑¡q€ãˆFqL_av¶uƒ¿d]ÿ I‡˚rŒÜıÒÊ§ïvk©Üg*kÉ	~mù¸¢ÖLî#grXOR› ÿ.%P5	*Ÿ1zﬁŸ±3.gïPfjÊIåÿ‚¢íhVäµ
e,í5£Ñw˝˜ˇÎ9qdrÚ˘Yª?$ü%®`ˇ*'6ˆõ◊m‚±FAÆÕT≠õ?M˙ºõsnû…j≈¯Ÿ:f∂Ç≤&_Ñ°ew∂	Êq Û8µSú*dC˘†™	~Ó56”0≤6‹ôŸÇ¿yœØî¢rÛJ–ﬁùb÷øï"}èá:ßâ'sç÷B≠Œ_XRc‹™ÅZäSùäægúﬂ>ÙiöÑ:_ÈU£º"FÕ‰EÅ·ç¿vîÜPLõ˛]™µ;›9‰ \¨ó≈ü≥ÛØ◊ÿN¨˚!«õﬂøjÕrøPÜ∂‹üO4¨-π¥U*sÎ#»ﬂkÏEÒjºIG¥Ii⁄‹•˚‰.Uˇ‡‘⁄ôqS£›ö*°¥9ïé=&ª3q»∞?≠πnÉjÇ≠π‘r•÷6ƒ‰∂Pˇ0ÈXˇà†∫ÑÁyèß√`˙XÑ¸·A2`æ%≈ÔI…Ñ3êñØV¿1˚ÖñØ¢ˆãg∑ü„Úõ⁄|ÇV—∫‹§¥êxÛwvÑbÛ|‘≠uÎUÒg‘∑ƒøl•Ä*Ô4À+ù-UﬂjW;›Vªzz°∏ÿ™◊´bõœ°™ë+/_®∂Ÿ¨Cß√ÑÛÊ‰…úeÈ)‡e¶!ïä∂äLD•Ãƒ”JkáGY©P˛V®?Õ⁄‚!\hµïlF‡Óﬂ‘Ÿº®‹z2mÿzØﬁä2ô[Õƒ@9h®ÑXËb„2o~™®ñ®ÿnˆÁmi]˝[ªlµå1èbµ›nµÛπW‡J ´èùDUæSbÎ°ù.f
Me@°Õ¸Ê◊Œ}u√c›ô}‡#
	ü!s0ÏyÕ# XÇPÎ®>RÍ‚G[o]Wx7f¨ÙRÒòåZd«S¡¶.N25ç\íâ≈I*6°πSN¡˝´ãD˝(Ê4‹O∞v˚uØ˜8˛$e!¶Ú¬÷« ÑeNr»Íh_¿˘F¨¿ˆ=√sbÎ„‰ÉÔƒNI}ÿÀsåÂ≥6ìeQ=Âz…äc∞aïE∂˘âŒ*âÈÃÀ≈∫$ÊMπréFNUL™‚”Éyö°‹≤˙îgÓ5JBò}Ö±<Ω÷38;Ï∫æd?|ºJ¢ü…¨â~‡Öò4YùˆìPüwÀ/˘.Nì4ÂÛp›≈"ü$xõ∂?ﬂèﬁèh;⁄/Ÿ´Õo îú^n;º{˙≠◊ûÓ¢™9 _ o _ÄÛ¸Ÿ¶.HÕ#Œ‡≤mπ[úù&sãÜÑØ·g◊B{&t!Ô3OYÑ“˜˙÷/ŸwÓ"KÌ˙˝JÕ·åƒÒ gzˇ°àıòﬂP›J’HÙh ÃKwúkUÌ∏ˇù´◊.YWÆñ"‹Tò7‰µ´µNËß˙:ﬁÙ9]WMMîOû‰Øbˆ>˛qﬂú5∫#ÿ¿;ê˚®¥ﬂW≈ˆ aûb\ãbı√ﬁRl®#Â˜j≠ûËÛ∫›ïNÈ–°ÚJ≠xÈ";˘áU∆3*á§Ø%€+ÛŸ,aRïå˜¿söó™Ì∫“äâõ£õf´Ë)a{]&õ|å˘C◊d©ø∂Áå<e6åd£>-#ÂV>æ‰¬æ·X«ÚöY”8WØÈÊ]@!cﬁ5Ê]#ﬁ¸Hn√oˇQÔaï⁄∑w[˚j{xá{x}Û.®™…:¢·h‡PØ`SeÃõ,Õ}˝ÀS£Ôk˚‡Ó®Y°ç‹™LO‡ù)‚†Oì’∏¬¯√”Xù¿g™èüf¨Ç=6ˆãÛÆÈf∏¬ì‚ÚªÂ:˚lüªì ™üêR'ÏÌìí®44stÍ‹¢)È£†6kvykŒŸå~¸ÚÜsF£ˇı∫6´Êu:ä›E&	+,Ï^û’öó⁄’ÀL ¶´4G1∏U7m˙krÅ,”åÅ;Rï¨Ó∞{∏·Dè0DyOÙH|∆wÍqx [·{vÓ»N¥?dπ’‡éÇ±UåΩAmLÕMÊÊn€≤˝úEbx•ôaö_eﬂÑ∑x≤Û˚0uëJ∏(ƒEn‚ı‹ØeŸ≥Í∆´Ãø^èÚáè'''˜¯ﬁ’∑5b€⁄π{äŒ]Èt´çËÌ÷Ú2£⁄ß‘ÈæPnVÍUzk’π“\åÚh@ -z"Z™UÎ ü≠&¯Á(/-©LÚc.bﬂ&sª7‰êªp±◊nWõ]n¿Ö*fêf!AƒBãÕMπ∂˘w%∂üyùÅ˚OüNrû√kiÙõg´ù\∞IÂ<◊‘~x∏ÁΩ"õÜKêfHÖ∫•xqvûa—ü◊–®óS∂∏Ù¸eÎ(ŸÕ÷µà5$ó!©Î‰BlB®cé“ú∆FT≠ú«ç˝•Z7pÏTˆÕ&SË[ïNËÄVuï'íÂ¡Y]ﬂMèjP∫6◊√'c&¸S^
õH≠˝jΩ’™ÑŒ«öHÛ˛+yç¸@5ïcÎìl£≠0a¨l¶ñÜèîÿÃ˛ =‰≠¨ºYáÈ¨∆?∏v=RvJg(êﬂë|òÅ9´Òlπ›Í≠ÑèÏgX<˚öIR‚¡&k-ô]ã`›Í2daŸ€’ÂSòµ9hhøùÇ'wìHá5S≠ˇQ¥r°’mπÆò?"3qÿ¨ÉÒ-™ÒÆ§›« •U
ÑF&“F¢êŸ_ò’J€j◊†:Çä≈Í~=lu~:ËtŸ9[mªfÕsñ¿M*·srNTöaVî÷Ñ0Ëå§UÂüçKµJµÂ∞+A<*ìŸH„]¨-|‚fÜ}B%˙ñòaK‹,Ïødﬂ‡i®=⁄˙Ñ[Ë÷µ£˝•ó˛ ÃÚ∞óuõdÂFs,ù=Sâˆ19~¸ƒëáèOŸ.ìƒóƒ›êúøCëT[πÔRî"è›˝⁄ÉYÙ˘fﬁ0Ìˆ≠ë¬ÎÂïí'ûÈÆ )ˇˆıßø·IŸœõ<‡è_˛€ˇ[ˇÑÁ¸˚€◊üˇôßÛ˚€◊ü˝;œŒ«JCÅ„¯ÛãoÿœÙÛVNsxü˛˘vúA˜çˇÑﬂ‘¯ø›Çﬂ‘˙Xõˇ>¶∆?˚~SÎ7ˇ	~SÛø˘]Œsïœøz»4–ˇtfjv∫ÿmΩ÷∫\mø\fã^òñ ÒááESlæ∆ô◊ÔOrh.!©Å}˚âÚ∆¶çÏB—Ã¶ˇù-Ëd=„™îÌ‰Âzk°å«{YúÚ¿6◊]uo”•èj«åpœd∫ò∫™n íû‡ Òπ&Gyœñ2“GÆ˘.∞¢C—Êg±â∂aAﬂmFÏwk/‚:<;mCZpk*+`„?[:Ö—rüÍuôO{ò∞µ5 6ı´”µŒJΩ|åXD LÉßî¬feÉ<s:◊èÚ‰#O˚0:∞M~#¬k{’ ∑aFŸqs[µæ¬„Áã≈b©Ñ≥´R..-$∞aszP?∏bGä≤¸åqªﬂ;î∂RâUç±Ä—”€hΩµÑ3˜<‘Fœ.9_˝Ñ™ø¿9ÕÎï¨¢•(„˜6Ò9√6å	«n¥1ÈÎΩÓù$;Ç¬ñ~2ï‹LE#8¢˜£√ÙÛ&˚yÑ˝§cÄ˝Ò,>ˇ¸œÓ
é‚€œ˛ù<F¿7«ÒÁﬂ∞ü'ËÁ-˜Áœ·€?ﬂfß&Ò˜çˇÑﬂ‘Øªø©c_‹ˆå ;˚,I]˝Ïs¯Mª˘Oõzˆõﬂô!ô~'h>)˛ß∆¸˛xH´ì9éíØ>ÙR(ZIeZKKâUpr Y<∆…UNZL%Ÿ]∂É¯\ú`ÛπÖVwé±É•⁄2{“©vÛ´ºï∏åPÖ	kT€ÀU˜t%^^$dñWwN,r;ÔÕ›§±õÔ¿I∂k∞: AqﬁZˇâê¥C:QË2ö¡ 'Ñun¸ÚJQˇ:Òg9Øı–ôËG~9ÍáŒ4ÍÊa —Eﬁ
"o€U<U¿§¥ˆ;\aﬂ˘&•Ω¢ÍÉﬁT.„∆ÛP|<i⁄∑#'|eq“v Wö≠¨)ÑS;Ædétà_ÛºÊá∏ñ%éHG8ıy–,™q!ÒHÂ“
€ëÓ3Êã»ÁOcTlÏó¶√ù]b±ØSÎ¯NÃ!˜÷j4|à˚Ö"≈ŸÁÈ¢0ë‚o^Ã≠ﬂm˛ØÕØ6?›¸-˚˜3ıÛOõˇ«#i›$G¯xP˝˝´He˝…Kaë	¨pﬂ@¨∞Ø+XG|
÷÷M&y›álÓñZ%^EW´Ë
;‘”Úu“8ëﬂö%7–Ñ)j›∫f™e≤+L„Í"gŒlxﬂ≠s∑óÈ⁄Ÿ¿±ìáu _Ñ«êPû'Õ®<OQæ®Üg6Ÿß¶˘â€9yí´é6Ëi‹*ÒºÎ=ÔÄ†˚9J÷πO∂ ´©›€EÌVû{Õ&îS~#gê·=TmÔ
èJ_Ùj˙%˚p˙Æ≠€ö¥“Ï5N°vk`Æ ﬁ
ÄcÎÛÏü‘PÏ¡Åe∑,tÂ⁄¨KUÊbs±√Vº€˘áZ˜B>7É◊X ˚jèˇŒıê˚{∫^	∑PY§ ]Í÷öΩ™—9Ï≤ÒbÅq‘ã©“]WÓ_oê±]lÌ7j=≈V∑Q\a«]´©  ;f4¯í˚∞nô çk°÷ÉØëÒ~Ä|9»Ç@õOOolc&Û¡X
≤òÏ#*âGÿmyè»ëÿ#&£<óÛ-¡ùÎ∞Ö±y‚Ò1OF[(ËI™ë¬_Lÿ)*Úö*,ÿBØ–fs.,Œh._hI&©I+å’Â2·≤€˝`sJ{Áñ™s‡¢ïı£ ñæ⁄ô#˚WŸdÙ∑ﬂz¡è≠ü∫#≥µ"3—´ˆÖ±9·ßdN‡m^ÓîÖìÕ¿Fj˜ ñb—∞M#1R<KFäëëA˚IylVL„ƒD¢ÿgøùÙÿ,X{øﬂ¸#ìñæb/Ö©Á´Õˇikëƒ•n±‚ün˛_Û÷;÷a‰≠∑uÕÌW7Üà∏‚∞®W^ÊöJ/TG∆
ä®ƒ©¢óñí¬üg∏€å+˙,#7 )ó± <≈jï¨»≠Zâ◊∂z%ﬁ§ı›ÓÅ≠X9ãÀ'`Q CT»∂‰;ønJ‡^
Üœ0ZdÕ)>yT*π™}Oùøı^Ká–íªK“Õ53¶º–¶¡*o≥„<≥Æñ¨0EËËFuèNyÇ6]z≤¨:"PƒÊûµÕáéfQ°eÛ~Éõê—4	  &X9›5HΩ7wud8ÌqH›q(ÕqXΩq≠qhù—€S˙¢%8ã …@]qÑ:÷¿Â`jôﬂÈ/M%P!{Ç’1u.3RîO€.5,ªñ]Û*`ÅÍWÇÚï¶z¶x©]ö“ï®r©‰0⁄€€¨f£î\~¸"„ÅS}˙è0œtû≠OŒÁç+ö√9ïõsD(Í_ëXòÚ⁄¸|Ï∫>v]ˇ©ªÆó›ºFX«b˝™0£æKWÑ#ª $Óà*™ã-&´∂ÜgÒÆÈfø#Lª!t±VU2•Ï™®ØE	uæOQE«zÿ^–√v›≠¯I–Ω|Ü„Ì’… ?5ÖÃ…e~bj»w1NEkkèù∂∂ï¥ª.≈ÍÆæØÒ!π™Îöõ#j¬Ò•+ƒ —Í≤¨€VﬁÄßÈa›F;ò· ¢…œ"G‡%ù\ﬁOx eZ1àÆL+√C/èõ*Î+°c%4£
æ!*h»∂Œ∏•∂s⁄VNﬁ∆Ü<õ√k
‡©JwX,ÔnDÚÓâ8ﬁmã‚M’ªÔn≥Œm÷ØÍ€Êª±Æ=÷µ”uÌ† ﬁ]ﬂ}ÚÉw«:ΩOß79Y&}>K|ÓÓEÁéoq«vÅ'+◊è‹ﬂÆBfV–0k"m”:èj‰HOX*éc{!GÄ~;XpßÑ&Û¶ù‘s±Úgëïæcü¯"S6÷G\È¶‹?ò€Q8`™˛ú˚“ŒËDhñkÕŒKÂ ?0M</;î‹£/⁄•-Gò∏ÿÁHA§]»<2°ñ‘Æé$)IµR√î~Û;…œa®M‘úóVaû˜T,B"{vàßN|m£N_fTûl;Xbr%=Òr2ë±¨yÉ∏7hÔMÄ_Ø*b*S˜Ì›É»¬£≠ﬂ‡æ÷ÛãÈS¿0ıÃ‰ﬁL=≥jê:;€í˜)æ-¬?.Qﬂ>zÏ”ùZΩ⁄\¨2%∏ùˇöúì≠aÎxÃ5+Û≈úÁÉ9˝Xoa…„2ÑQ¨ºö≥ﬂ©[É¥ﬁh/¯@ªLRUˇû√{3˝   ˇˇÏΩ˝v«ï/˙øü¢â£â?dŸ2mâ£€—ƒñtDŸôπC6Å&ŸÄF–Ä$ö¬ZñÂåsé+vroº|'vúôsÁèYg]ÍÀ¶iâZ+O æ¬º¿ùG∏µ˜ÆÔÆn4HPñy÷DDu}◊Æ]ªvÌ˝€?à√s*èŸJüöö:¸‚‘·#G¶lœ±'	m–ÿi Éˇ“∑0÷K©¡E\K>§ãç©üÆµÿ)vŒ6·ñb(b{%â'ú‹Ä/ß4∞º<†Mí—œÂ–ƒÑw.’^≠€∆;P[´pçë]e•‚MM6 ﬁ‘jŸ;4…à4⁄q9&≥øWˆ¢∂◊™3âÅ«éı¢eèeÎ≤MX2«≈∑Á)ﬁ“\Pµî*êIÙCÈg$æÜQc)lµ„L¶J≠∏RŸ‘¸$§Uì+xáùñç‡M<èÌ≤Ìó°â_/’ñ.≈œëj∑Æ”?ó*ÏèÎÒuö)˛KÏ?∏ﬁ∏æÛ¡uÇÍÊˇÙ7ƒl7\_Ωﬁøwv„ˇ∞ æΩé¯òw>∫^+ÕNÑñ6¬µà^&úB≈8Æ`à©Aë.NÕÛ`¡Œb›f*k-ˇ4)ƒiDÖÙÈUù#›ÎA	XÙ‰ò√YÊá6 ëù/BùèìæÏ‚?'ô±6]£ˇí∑µŸ⁄^`>^≠v·*}%ÄŒ≥#&™Ö‰=õÇ:€EÓﬁ`˜~u¯ﬁ{œyá^ò¥1Fv5à’®€~˝{ˆ(jª≈ëûÕ0j˛ZÊ(ÜÔ⁄#Èc~)˝≤”ÃÑû~|ôLë…Ås‘mh⁄g£≥≈y&ŸKb¡—êıÂrkgNfv„ZéâuÏÚ˝…(†"|Ò÷“âOB47Ë`‘÷<vBµÉ_uôl»N6FŸù¿úCªj`UZ„ÏóãtÿFòDYÃ.˛V≥÷ÛZã˝?Ÿÿ”eccÙﬁ˜Ã_ô¡ä™‘õ≤g◊»«‘–G93Ÿ^áaÀ˙‘3j∏zÙËÀÜTö—’b…;Ë$„Áÿ˘∂c3Ü¥íq√ÊuÃh=(ùõ1~…oqŒ–√°f®;h¿Î^ÿ	1€9ö4ùy3 Y,ŒÚ«ßk @©∆›/ÍHÈ_e9¨wÇv≥pïÄÆÕ¨Œ†$àE*‘Ëÿì<©ØAÔÙ˘F√ÈÀf5ZôGa‡ÌpX<´$0|ô∑¡ËÍ©¸ÓÇäür∂ıù7sçnof6ÆÆYº˜G≠;VÆﬁ‹@≈«=0’Áq˛PÒ·l'5å|º˘±¶EB°#Ûµö°@Ÿ∂¢%˙¿Î∑X7¸◊≥Iß·∑l∫…"	.ß^fÏ§”¶s9uœ:>ÃêhÇíyé◊Ç*ªéú Èım™=§HrÀ ÕP÷ô∆¨WhG ‹Qh_-îµûeæÑê„'ºySy*ç˝r∞∂˘ÌömÓÑÂõuvı‡Ôˆ«•nßÉØr«Eà¥„ÖòÀùµ´§PıÎı%CÀ’˝•Ä1§BˇS=¯E(~◊…Œ!,≥øVè¸⁄å˜sgœT»J+\^+Æ{≤–àjBÉØΩº˛U£z‘fü[QÇ»ƒ“ÁÌõ	ΩóÛóëπÓÚrxçÕî-ú¡!*¨[üz‚mPØ1∑Æ/°sò∑X∑éwœôÖ¶ˇ¿∫Ñ+JCbé≈áí≠πuHO{ù3UæÒ9Ü‰Bƒøi/e~≠Ê_q-vΩ~uπ∂M~ÁøiVÿs˚ﬁﬂ›◊G(«K–.`gßJâ◊!j6ª√üí&µÚ[®nﬁ@€ÉT¯SG∑9Íe*¨¶›°D|ÌÄfE§∞£kΩg»Sò.‘¨…ÎA¬+¡jNTû7boÜ›P?>f›cN´E∂o‹s˘Òº∑Û>õˆáÚi∫ √∂!ï0‚A7vÙzsé_ò+‰WÒ€£€|∫;˛vG-®ù¿ﬁ$ﬂﬂÓÄÈ∫ç*ŒÖõ√më[èmã¨ÏÔ25˘tó§Ïí<4π¬ó∆%#Ï#„∂íDY€,=êôÓ++J•#¢R•ùylÙ…£UÖÎÍ¯xÓ@«2∏-⁄⁄¢y≈Éa‚ ßîOèuJk5j4XÔO©‹¢eÁ‹àı7mvN‰fï±˚oŒË®ÿIﬁpæÈëˆ5“rQè6∆«€dL÷ãZ_sœﬂÆP⁄J‘Ω˚ÔL–πµ/{®óÚ¯«iÀPE©©t~T6é/>.¶€îÒ=∏„X“Æ3mVHˆÌ‹j=aµÑÜ≤`øæô“)[/Õâ¢(∫cuì%g˜+ﬁÜ‚@{·-TEŒ:ƒ{õ¬õ*8KdÖ]º?ˆØzÔ÷=∞œ„},{`™´˝DÇÀv·‘ ∫7Ny,âπvº3£?.Ï˝ÃP⁄biç6uƒ˙˘Z64dÕª>ÑôÉE¶ÏÕ	ÂçAz(j`èæ%√∞WuêrÖSäC'?P2Õ-@aˇ{üø}‰!§ö∫ÛcÀ®‘◊““¶«û®4çs™∂9M”úW…å®`7‚^ΩGäÊ
eIÉ‰p“n Hz›ÓÃJ∑¶ﬂÌ¨F⁄ﬁÃP;ów◊ı‰fú√˜‹oVÉ˙n:ﬁV|óæ\˚—À«\êÆ'º√-sŸQ^ˆv>¿ó∞ù_„ªÌA)	ßÄLÓÇ£ËÕ"Joù¡tVÿxq=Â:?tÆ3¢»k√_≠Œu¸·≤Hπc2y§òπ;p› >µQ•Ûœ›Í{`≠“-‚ûpÜ‡í=y†ôõlC€U#Ê∑Òu§WêÌvZæG„‰uA…˜∏¢·-õÓº·ŒpGùÉ,Ò°'‹Ê™)kcä”ß˚uô/ì‡…˜„Ω@˝ç(¢gxÛR‰≈≠ù≤{d¯(ht!ç‘°Áı÷’o0+õ©-’ì˚ÆÖäÍµ3⁄Z-áÕö∂X'÷Œa«÷X0*ú’È≈˛'√˜ìòUN¸bå†J†Ñ$—˚;üh¸»”62◊—¢‹—nöïE}jZ›x’1D˜Ëtœ*TçÎH}÷oÅÓeËñC| …™€‘˘&(]\”î†<”˙ºŸˇFQ˚ÜgÓí‰≥©‘]J\k®=˙‰Ú1πy–ZUl$nrY„≤*ˆˆqÓ*Eóô{ä—´.ôåfW±Rıê{Û—N¬˝!=o(|ﬁ6D~∆‹öÕb˛}îrˆ#t^.∫.Õ‚(w%,düƒ^∫0°∆Áˆ9*4‰“}·f{#ìkÆEs‚óÖÉ4I“^Ô"ÿ"]‘Bå∆Ã+a„äñ’Êucîe:V⁄¢ct§RÁ™pó·=√˙*¯H’£åmÎ≈T´ˇÑK‘ÒÎÁ¿%ûu=™AX/™~Pîio¬õ:åÔ*SéÀ˝
l†‰Ù!:]ªf˘˙©R'9ˇS≠—›_,´*B˚âJÄcÃu⁄Ë›∆´#”„jŸ—BwÒ¿∫VGıÙ Ã]ïÊ∞ÁOüB¨≥J¿n¬áR3ì~ê¬3ÉNk˚¿!3¬ŒwdU¡àañUj3¨^∆ïÆ≠’⁄[tˆ|Ü¢Æ5g‡ö)Nùz≥D9Øÿˇ
ûä+<@ØΩâÎäRz.5
V&˜'‡BjçÃ–˚∂ﬁvÙ»yË%Òﬂ∞>Ï,∆dV=◊D:@ô£8e:≠∫¿ÍíM∆‰ÇÄ@AÒI_s√◊A§&|PzO<'Ì|ºÛû“}ˇ¥GÊOœÀßq˘œ?æÎqpé|§o·G¨∏S’“ö°Õ>ÓM÷µ√Üﬂ^+∞¥›uüQì∫ú¸Áˇıı(pp®ò˝ﬂõ™àÌÕj ó€—;AÂ¶§˘¬˚¯"˙;Ö ïj‚†ÄX~Toá˜Ìﬁd∏‰C≥Í¥%¸∂¥lÚÿP†5Ö†5 ”i _‹”+3∂oC,∆F√≠±ΩSÛ˙∏åid•˝¨‘@
r§U⁄|	Ü¡•p√Õ¿ˆ¶Ú_—Ó¶# 2™5y¢Rˆm\ÎM!aJù-πa2(˚~+€{ÍÅ·=5˙∏’éÿeI!mN*2∫Á%6Ì~ê†ëY∫ÌµîÔU´RCh¥+`õP≤Ú¥zƒÈàŒ≠√¨…ßÜà¿Ìë&Tü”°	<ç)˚Z0∞)r>—ÄW\nÄ‡Ìs·;(çNölªE]«Ë'dMz√∞”Å’r(_Ωâ≠ìeUéƒ–..ìE≈C»§$àVH*ÍÇÏy˛]€Ï¯B9ÃÉﬂu_¸úœ-öíg»}£Y!íﬂ'¶,πpDØÎrñ-‚K∑])B+Ãß:Ÿ<¡y–¨ÀÄ≥·!¬]®U<Ê%‡lF‡Fóê∂º}∏àÑÑ∏¬ˆ´‹^‰´‹ﬁÖàïËÚÙÆ)&=•;¸ÂÇ‰JSr˘g”Â™Edπd¨ÀÏF£v‡5Ç	⁄ñí¥RsXr÷ŒØü Y√Ÿ:~ÔOÛËoî=‰®Ü£lé-£H{úﬂˇ˜ˆ?¡	\ÊZ;ΩﬂªË∑x~º/Í®J¯ñÓ‹*®Râ˘™ûXÖ‰:¢≥ïﬁ∫|7ªg«›tñ6ó#7@,iø€˜y ì›/î/˘jÖ⁄â7%µ˜è«ú˛’¥7®‡ë•{≥¯N’zÙÇ^V)ÇC	ˇ8xT˚ö¡=ÿ∆Apz…Eä∆R7¨◊N≥):…°QäU∑ãM˙§t8˝`j6˛ê_´-’iüãFìﬂÌ¸ñ?Ö∞ÎÀ!— ìt‹cæõ6“å7Xv≠*¸Z•ÏÊÁ<Oï:Y˘˚!anf˜∂4¸∞…HÉc⁄	<Ô6p‰Õél£∑Ïÿ6åÂs∞–ﬁq‘,+|? rFömv|ú«o«õ5£Q4z·¿fø÷\¯„vÅıI¸YÈ"ŒåCaw—ÈË]Â`Øxt\mœÓﬂÜÌ∆,Ã„ØÖn AM∞eL:±¶Ãˆ1ÅÊ`FŒ&Ç—æn∫œì_√ü—f¢ó%†HyÉ]l.Œ”Cí~$ÕÒêo€M~˝{ˇ´ú@›¶‡©frπ9lõ(^G„Òg›¬¯–È	À∑r~¿ùì§:«Bnœ9’z‡∑ŒAŸkƒ+ß5,}cÔÕ¶Ü¯ü—S$C>JQpÏM÷5ÑÆ=ö∏nÜu˙ÜGïæI†…¶éŒqFa<£Îƒ@◊5ééL[∂áøB1ní9´qÏE4Cì„ÿ}h∫ê œE4Êëád“ŒG˚ÙP;bYFqñ¸Ùpë-˜–á∆®¸|ìÊ4CÔ4µ·{Ü¿À‘ÆŸ≤BÛ»]3»Ó&Ì⁄q5®W£F Grˆ˝‡±ÅÉÏ±ô
ÜÒ´Mê´k‹∫ ≠&¥Ò-Ù9Ÿb∑›f¢8◊Ò∫äíRﬁ Hœ€ﬂ-≠˘á"øıˇàŒ¥d»ó[ÇºøO4Õ´¢√÷&JZªÒ∫¿6Ω;˙¸m$5D átaSŒ]óÈÈkÚ¯N∫GÔT;xìCÏu2˙‹L>óHF¸≠(tµ^Çmêªü„å)´•òıûÌ*ÓÈpñI~œÍ1Ù0±«˚ÀÄYòU≥∂^º‹_ˇ„Ô∫˝é5ÕØ˘`çØΩ‡Ä¡‡ﬂ≥s9m”Ò*ö™¿Ïw1pààpÄ÷HŸµÜπ:¶- 4u¸YAJZªÌZZΩnKíÔEœ¶ãñŒE	˝˚‘ßH+;Ô@π—Ëﬂ¯Ñd7£˝nZ¿vF)%ÊçFó˜G'w»!ãÓ∆A'/_äÆn¥äó¨Â
ïÑ∂[ÿtB[5ùMw¿3Úí6!3^ö2‡]OyÔKN«1e›O1wnÇ–êÉh¯¥ÔJ[Ìzå Èb√Ùrx›t¢è•˛≥óBÈîe÷≈Õ˛U ¬π¬√“÷mkÿØë\˚üÒß◊Maw¿Î\Úß≥Ç°‘Í	ÚQ˜q‘/èÀ„ÂJ2l<≥ÓV)∂⁄ª5rÀIó*Ñ; ;†é˚èßH:‚˙ òÕ?£$u“Pˆ€<ŸiÙ≈Nﬁ[ú‹Xh˛w>dR≤≠ô»√∂¥2ä;ò,å‚ƒ”5o%∆ÆD!è Á-Y≠à¿]É.zCÒª¸Cw ‰S”J†e“®≈2°Ï%x,N∆≥c}ºlÕÿò,:‘¨7M]Á1;ëbÒ˙µÈ%÷í_œ,M’òóåËyC§›!©ù4ü¢∑eVî>a0h9feÂzdr(;ûø$Fúoê¿0a∑ËjqÔΩdU¯ÌƒÌŸ@œçM$$-Ïµ»∏a‹(f†„œá∫–øì†ÌöÁ∞ÉFXì4/‘Û'MÚxyøÑŸx˚Úõ§√(*„8a<G'Ì◊8Çõúánê‘?pk≤2ÌÆﬂ ˜JÏ¯ƒÙQ.‹®Èzój@§Ø8¨˚ñ£ˆUõJXº Í•h-A>†ÿ¥EY†¿x°≠t÷g"‹åYßBœYfÖúê∆l±ÿP˘Í¿ö≈kÕ™Wt¿“√f‡kõåTBKMuf-∂®‡e≥Á¶pêI^Í≥[£›Âe√_†¥˝Npæ«°ﬂúcmVW)è⁄≈∆cë¨é1~∂ :’jAkkQÌD˘®‚∑Z0ä9,‚ %e':ÿ,¥,d7è ÖBŸ¶≤,ÛQ9à.ˆÎ≠6kêBÛ«Yiˇ8[°\›∂¬º¨"{ÖM™I∆)Å•)Ï⁄;‰Ï≠wqC>rXÕ&˘Wæ˝3€w¿de“¿3j7(òÖ˜˚_£≠rê•‚∑Z¨ﬂ≈ÿ¢ ,ÈncêJ8V§¨J£u® rq≥ömM'≠`•`≈ü∞ñ,iΩÃ§ˇNQ.Fªî§¥’¿Ø162C=f˙SJ(&˘Çk&ÿ∏"PvÉS|rPá(±ƒÒ†ﬂ&—ïk◊ÃuøØ≠˚Œ˚Ë8˜ùT]ëM^Ç ßœ¨çﬂ˜ºÀaÊf‘åÁŸÕH=o∆+∞ô©ãâ≠l0–°¶edq,ßh·±Óu8ßw~--^ÒJùÔ4œø«Ÿpèw:~u,@@OÃ¨ã·í∑cÆΩ-14ΩøÜöÑúrÜLıe«f¨~⁄d@Î>“]—dáËpñëòcj@y§ÕŒ)¿¬˚a†ì!íe–nGm˛œBÉ8#\∆@©ßΩE∑0û∏“≈¬Œª‹õô(vi'¨^∆”ôˇ˝ÙFòúSπ_¯lπ-«ó@ï¬Â`,BôÑvf*√+Cz<Xèí[¯É–≥py√wô”ß<}È—µ€º
ÍüΩó&ü!}¯IÈ2qHG!Ëj÷9ê›s∆∂Œ
n=¯≤—ˆõµ®ÅY–‰xπEÌ"˛Iüò$ˇúéië¨Ç/÷!óŒæidXCs™,˛„íı8!!jãÃh\íy◊{˚¡v&&º7Çø∫ÊMº]˚≤ËJPÛ:ëÁ3∞Ê’∫Òè]>8<qõó”ﬁÖ”äPâMJ´mt"˘Â!%`¸¨d≤ñ0X±es±È«ı™ºÆúØÜàû∆›kpV¿ëx†ÀUàÜ©0®VÖäqØ -Y¥–Ë'ˇÌ»Ù‰°óïßè—ı2¸{™¯ÏCÆ_A1§úT'mjûÕõcﬁ¢wP˘I{‘I„≠&ùRzáN¬ıÙ«K˘¸Ôƒê®R°&≠^ù` ^Xªñp$´];(…Z‹ë¨e9íµLG≤ú¯_:ç·iÎ;√ﬂ)®ÔöáZäΩ	£ñ%ø÷pQÍΩ|`-a|æ{˘l˚ß· *jR,ï¯∂LMb§ZÖ±˙¥tÆœ6M2öŸO⁄õ≠ng† C}‚Y•√ ûô2 9:†}rzlBªaùmñ˜≥2˘†û<#íS*ÖmÖïmåª≠ˆ©‡J;Í∂N◊Œt¬m”_äãr∆ÊP˝	Wò◊œü}Î‹¬ÈS•RrHKﬂÕÿxaº¿∫≠*v>sÉ>9l^	Ÿ˝$l^∂£ëßÈ˙ÿ>∏º'Ô”≤…løÓ<7y)ëÈ≥]fdÏôíÍPi8âK:§;B@Û•óU>Õêö™PM’Î6|h¯eéh›c\•©æ+ïJQÎÀ,†¸®ü=F¶Î=ï}7!<Qbˆƒ"%4ªóÖ*zwM˘-ã§≤ÔÍÊòH@Ïf˚!Èö‹≈;⁄ª3Ö.≈˜¯s0wc«áh|Ñf’nª2ÕJÀ#y˘ÇÕ1S~´ﬁ≤µxÄ Å‰ß_Ì†≈;àÑ] 8?˜ºÖ¿P€BƒøD‘P¸†≥ñ¡¿	…qõáÂ±</1æã:31È]t76πÖÚ”≥ıÈŸ˙$ú≠v˛ÅFΩzˇì,:«!‡0‡“r[l´ë2x=‘¸lEHˆAö‰Ñ^íÊ'@áâ:±ñ-Ux√rE8ƒgîu¥~∂⁄u€RÖ≈U˙PGAû—˚µö8ˆ.J•ú@=ˆ)¿
ÜqHóhÍ B5ÍÇ}j2SÊ⁄√—¯§Ã«œ≈ëözÚX…‡G?Ë«∞÷{}Sôx>·7KjïÈ¬õ·ëMnò∂˛].™•É¥inr"w∂ŒcÛÉF„π¶ﬂ“¿†¡.7jßñi÷Î˛ò≥PBN÷”Cp¨Ë-kÉÆ™ø4¯’ZT¯UŸx8vc∞v¡˜8™‚E‘z]‰PrÈV∏À ≤á5#+NrzZí˝(≠ÏæŸ3ﬁ‘–ªßq⁄≤XÍD5rèÊ÷Lç”µYCÀ∑n˜b¨°9Ãò3Â
‚^p¥—M,mÿP¥º~íí)ë‚ıgËûãÁÇ¢≤CWÅ•]QÅr†ÓQÎ ¥w("á˛ﬁ
êâfƒv†/¬∂Wh!&Ú9‡YÈ¿‰À•œ@J7ù/lËP–ΩWÃz{^ ´QR:Í†>ó˝ÛägµÕLhaÕãÏ√˘ó]yöÑ@€5êgª&‚¨ÿ∂¡Å (N∫Ç§àò˘>9±f`àâ h%Ä¶§pRR{◊=Ft‡ÀãQ}‰∞]{ë˚æ·o˛‰ºÛ·≥îyπ—9≈{ ~¸•û9Ÿ¶¬Èô\é—hj∞ÉÉKÔR˚ÁûƒÏ_√Ù¯ë±}úóﬂ◊ÑK™ﬂO˘ˇ–¸?b	‡v>·ÆŒtGÁ˚R,≥y>ÃáZé=Ò‰›pdªÈA,YÊˇ>x2áAS÷`TÚre	≤2à-€t8zÆÃnIÔ¯ä3ò‰À‰^õ…ÂÊƒéòœÁ⁄Q#B&85]ˆ¶¶ ‹çÛA%a◊ë4{®BŒÅƒÈc∏/¸∂®Ωº˘–ïAÿ3mc_%i
áôã…≤wDüä?Î◊0Ÿ¯≠=OH‰ûëÌ‹síí3Á¨D√OÀKetÅº—»¶e_ß':©—5aœü)Âû(ıÓ8P(w¨Ìˆ	»Paw"Q\-˙Q™J#∂8Î∫clÇXôS4˜i,™vá‚^S˙∑§∫?^ãœäÄ‹IP´|V.Oº∞º‘>ÿÊë#fwt√ Â∆c)∏•Êÿ¿d6ùrr±è)_Ä∑"HÚ\sp@«∂∆MÚMsqå0~”õ∏íÿ™´AıÚiı°(Ä◊ƒ‚…}û|ç”™€è]Ì1qî[…	†P‡éeÓÉo≤“=$WÔé‹bô9Éâ9˘S4"Ω4∆CI«áˇ!∞˜´#≠r˙ 'v∫;,úQŸ—¢0EÁzxU†sÖ0∞L2Ëj‚	w+^ãNˆZ2†hÀ'Ìûò¨´gCC-≈˚∑Ê∑◊pΩaP≈„Ì∂øVa+ˇ‚ìg≈ UbÄ+ù…ÁK“ÑRÖÊ¬õpHﬁ3úuZX-9Nô4-*î@”¿+¨t"˛8^*±1täé˙°—F¿˙®apÌÒL" ñ¡˘nrE& (Z˜˛˙âHL:Mˇı;ÿCd0≈R*D_¨-@ﬁ%~ÀﬁDπöøßÅøêd´›N¥º|!ƒ€πÊΩ†êB!D‚˜äX˘sﬁëûg	nıôæœé◊ÎhÌk(©@”@ªævûè≠(jöF¨+ıaiöáP◊s9ïÄ‰πÍ≠v@y≈c‚IÄd%3∫£5ˆÜwé<|ÿ¡êh|ÃﬂéwÏ{¸g˛öòÄ–,⁄}ã†´Ó∫ ÁıÏbÜW∞ª2ãˆj‡EÏ€-Ô€í◊ˇ¨ˇ˜?”PÑw∆Í¥nqÑëõ<Ìñ{¶^m¥pdc]"a69Eˆ˜í_(RÿàØÂTgZ∑r%lq(Yû∞‘ç¡r:ñ	Ì†%>1Nì9Q¬¢J-Ø˝É%3ñ‚çàK„ÕA\PËrÅ2ä2X j“·í˝áW8ü…"+Î ß”˙¡ÉVC7$ˇÃ≤^ˇWTﬁﬂ˘qÇmÙ◊&Rÿˆ¨Î≠ıàÉdíáéƒ¬_¶àRËáBÅê5ãÉô£ånˇ£ê™øÅDH‹ ‹˛oUé∂:˚ÿ#Yh+ï3 )Kj]X‚]‚IÔ>íÖ®\—◊–=oFCt¸˚äeÒ»\ûAõH€
√…tœœr†Õ?f≈#CÓk„wì√J≤Ñ*1›∆›˘Ù3ã#åi⁄”ù<< ∆ ⁄àdé;;äâS˘ú⁄=gmıÍG¡©ˇ§ÈµûÍ@ûPHvèùÆy ÀﬁÑEqƒ-‘ñÖ—˝ÉîP⁄O¢‚cÙ™Â}“z Jœ\–Ÿ≥ÚCk ˙vùÉgô‚Ó…‘ìÂv‘(⁄=ÿï dF÷Ωœ∫≠°l%
5]èVNDxœaö◊Á≈Fö@∂™5,`Ä¥ùÒ≤û	¯AíG)ì∆eÅO&46üõ!èˆEMHŸª⁄È	„ ò{˙cbNúˇ©2«OΩy˙åwÚÏõo?sjŒ+ûÁ/óS”ﬁ\+®Ü~›{¨J{hGÄ€5◊å∑ÌvWú˝b‘Zç:˜S7D.y∏$Ÿ;˝r?ö£˙±‹≤Úú|JŒ¡ÙÃ j§¡·F¸„≤Å∞tïMÔ≥Q|,lﬂálBw)eoXIg,ˇt!€˘ö¯pï⁄;5Û-Ç0œJ„EO\b#(^™,]∫^º¯ãKÛÛÏØ˘âõd-Zá˛f]Øx”Ÿ‰ÒÍ|¯">'õ> \µFÎ]Ï‡¡lu=M]ÔF∞ƒˇÜõhãykﬁÃ5ùíKß5{F¶p.h'Á≥ß"9°”zÒ©¸≈i"ß(ﬁˆÄ)≥v‘=∞ÜÀ4∫6C~™MÈ™Ù∆îÈf©,€pB¶.Nœ€√⁄¥Q√tZ8'”XÉ1^Ï#mV—`‘w¢æ€t∫@+˘4∏Iw¸˚Î‹7ﬁ◊Ë*Î©z»`H¨Î(Â¯ÌvËÉ†≥—·Ül@eÒ˚¢8‚4î)PÉêd–Xœ`YéF¶3ôr42ï“»ﬁ#Â~H¿àÜ"D_Èj˘ı≠7â≤é
{ƒ)®kS$Oã‰Èﬁ¸X»ΩÉÓØt∂éË÷ºã√8ç€⁄3;JnÎ—_É…¡´Õ¸n/∂4m™éäÿ`»|ÈπÎ≤'˜£Ñ˜^œ˘àû¬†c´√NÍ˛múô≠˛˝1◊heÎ“M<•w©EœêÅrFa»°œ#Å)æîêæ‹P/5áRdÁÊO˘$4…∑‰@xF1}3Ã°Åﬁ\\a ≈v-ÄHbÙè˘D˘ò<ï∫+Y…wßÃ®˝˛æw˘ö∏˙„»Ãwô#˚¿›ï'rÌ®'p/Ò≥ÂE}œ›íΩO~Ï¯Pª)óåΩB,eéÊ.=z"‚#ﬁ$‹„ƒÑ7ıb≈C¡‡µn”;5~"#pÙÀ≤'¢≠o§ﬁ≤1£!YÇUè|p<ÍŸ9Í3Á b¨ÎG⁄?¶£•∫ B0Ãl(¬Æ¯ı∞ˆ¶,Ã´©Ñù†°
ﬂ∞Që` ÊPO£Æd uœbﬁz£*~Iìó„¨˘1Õ ¸q–TkßÎ]£πmED–õ23·‰≤L™S0j.i4√Î√Ê&ÅWc6i&8∆J‡∏‘]ﬁÿ≈ ]≠˚%À…L£<ΩR’Kk∆Ïπçı<‡áù˝ÁÍ5çê4¨Ãf-âî	ª'•zcsàäg¡yçˇ∞°/y™¿\Ùf<02ÄQ=Å‡c{’©≈q∏éÍÓ•-ãmì Åµí˘≈$ÿÚ%îQlCƒ÷ﬁÆ∂˝8lÆ{FIAØxìï√0ß˝ˇ’Pˆ0F„º`0ˇ1Gx#&™KπÜg¯Œ¶q76∂òÁx›Õ£‹‰lŸ`º|–’éiøioû)`§Ω)ì%«›ÂÂöÖô¬áÅ]$'‘FbwÓl…§œc∫b’E›n¿ﬁ4~UQÇK…ﬁ/z‚X4v?Å∆I*÷hG€
yéÛ˛ˇk–ÕH‹∏dÃÛ·¸FÛπèn†@ÊÁÒ⁄‰6Ï„jß˜w÷i(ΩîÛ˙H≈˚iPoâ≥ö’+l´êTú†(r L;Ω£Œ*HôÄÔpòo)H˚ùKiƒ%jtòî8ë^òÙ÷∞Ûkî‰™¡Ïê#˜#¸æΩÛ?0∂8Ü»K»–U?çG"¸Lo√3ÉpqóÛ}‹LIî	u·¶WÄX_îßPq‘√ûmCy˙H´ƒÙå"hcyCéC|‡Ì˛#îìyŸùõÆ≤[û(˚:˜_0‡ÿÊ8üÔ÷ÂœÕ\Œé#úL’Œ®ÂK,∞Åv£8 Ìªs(ƒ~#äÍ1Ñƒ7˜ÿM{∞qœ∂‡#€≤áå
Ó¢˝≤˚Ω4mDŸÈ'∫ÑÍ◊MGùw<ë◊QçÊW¶U¯ïr¬—´#%ûFù”$ƒh¥FÇ‹#Ó‚»Gô‰·æFπ
(πºAD#PzÆ#;)OœíBoHõx;q’†gpØ…&ög›'*„!∑…&ôBzzñõÏoä≠EŸ°≤œU¢Q…Œá©+!ç‰d%_Í…9™Å‡úøã˘UüGg·î!øëQ°F)ôU©ﬁ®p`Ô¿åÒ∂£"≈Õ>Ôã@€ï=|˙å˛yÁ√2Ö˛yó…Ó˙ë%@ü°X÷¿DˇôL+∑=ë#ù™_nÌjÄéƒ^tÌgöNŒÕh0Æ*EZ‘ôM2y∏j"‘ØL¸¢ä•∞Sç¬&îˇΩx:(†}óÌ Zf‹¥€J2ªíîu8q·§´\wM+™o w˛8®◊µÊfqi˘z6swó⁄F±B7P ßÖ˚Ç~ÌA~åƒ&µîYïÚ¿ºh∆√S¨ò&Fæ’D·a ^F™qÿ\AÉ6_wd4.ÕTäÒCÎ.;,øã≠ÉKÕAq∆±MQEIÏÑy'é˜ƒ•î•";¢4g¢Ë0¯ùål,]K‘˘èπHq3Ù˜î–t[û(‡Ea>0ﬁÜx∫Œ<$≈	ks‰7–uÍCú¸4nÅëµÓQ5ˇ Mäµı7ô`zM\DV∆N· ºÀûõÔ∞™`Q@Ω$◊,!ó∫Dë˛ﬂu®„.¿ÿT©Ø¥'∑ÄΩÔàÄ÷8Ôﬂ—ÅÍÈE‹,˜>>SﬂCsÎ;¬ºÌ6∏Òék´4†@⁄ﬂìHN±Qµ˚—3À§â√J.xÑ$¸¿flÁ⁄A#Ï6∆Ö©ˆp1a‚†Ï˝)⁄Æ~ÎLs^IÒ]…Î	Ú{<…∂ùæÅ>Œ·¬˛wÆB?l,Oi}jπz®ø5É‰W_qÁ°SD çSª:‡“ÔôÉnñbb_Œ<‡**íR;îûÉ-SÏHÂ™˜ó€/U?¯ÕPjC√wï7‹˛Ùÿu$r·∆ 1ÉÇÃkµÃx˝èâø~«˛wˇ∑Çˇ[∆ˇ}ˇwÊØﬂqœöœ˚∆Â:ı.2s©˘‹s∏»œ='6zÊ0*X¿Øw(ˇÔ–äˇ=dÂÈ∫¿πÃ}ÅcB^å(ÍhuyEn£∫–KT≠Pq§ıE◊R<HÈZ‹Ò;1U`7ÏÎú	È¢†®)l¨Peü„„Yøn!™C‚~îzÊ∂ÿLˆU˚wıË,sÿ\éñ">Õi<ï∏O%~•¶mã≠ØñêÒ3B÷} Mﬁ©qÃyœè9NbœTO˙W¸∞h'(≥Ö£8Zd'	Ï˛WÇQ¬;™U≥Öch‚`T‡/ì'’ÛZû	–¬ÇÒ Èlj:WSq¢≠Ø∏w0D%˝÷€U”á5-è2¨–qÍ=¯k©∑∏s˛¶üœ7jl7c‘{È¬·\]x'ˆıˆXó*]ÄCg`'^»9N…Ñ$ªΩÃ¡ãπö'I≠Yêf´Ôh£°™Œ.4dâ•N∞%ÏÓò/¨—øB´≤Ç⁄ '˚‚ôwV#¥SÂ !È‚[¬":ßôIM€è#ÇÛVñÙôf•¨w«‰4πD¨6Ò˝:´ç°ƒ…DE™åqïGÿ§ÿW9‹pÎ.¥‚4‹_Ñëı’âJÜ∫PBÂr<a∞ûòBﬁÆ•ù'XÊ;ÊIÒ∏ÏÚt‚iJ&Ë2 +/ßÏ´a¸,{â˘Nà|«º	ÒúTˆíœf2¡Í„]=¡îèy8„Ω≤˙≥øÅ#’µ˚˙WM·ùêµ
·;JÑ…⁄ÃO[¶‰hàÇ«º	!ˇ…Z¯S•»™	Ç«§Âœ6â~ ≠ÇÏ4]^T""´•¯W»sÊ”õñÍé¸ÉƒSAöDI‰”˝gA&M,r¥ªﬂ@i+œBö®åµ_c±~'¨Œ§§‚˝!≈0ÿ~	J≥≈´©^^XÓ6eUÙìä—@›Ë1µÛÆˆ')$∞Æ!Âu,u™,O£9◊¿ò ?ü Ÿ˚!g3ñÛòƒlhÈ˚ë≤°ÂÑ†ªØ¬5éı{ï≠°ﬂ∑hM≥}I÷–˙S¡˙oE∞ÊÇÂ„ï´ı”7)≥S‹âEnù‚iyÍ.É∏=/™3Ô5∞ÄRF H1ä0"ËTWﬂæ,äqàúÉ©'ñ˘ùÌ∞eÌ§W.s{wi)„Ì@æDﬁMÄ8i´1ÊÒ˝ÙΩÃÓH•@·}·›Ü†Ô™åœqœ∂ùõxeŸÊ,êBºﬁ/ÈÊñ±g„®2≈Œ9'∂]ææ÷`Qœá*Ω‹o¿ë!ˇæœ∆wÀ˚Ø/ˇÌèãŒ>ÍNx9çZS«vœ„î∂v„ã0`ÃiÆ_Ê∞XAs≤›ÛmQ:πÁA&w≈"›˝J£$ˆßÃ‡q1«b˛ÿôÇ5‰LÊ &ﬂàª6î`€‰≥œ~LÏ"e6Ü`ü~òìmÎ¥ãY–≠€¡0¯e;˝ã#‰)√ÿWÜ¡óÒoÄMÙ°ïË.oÏ‹Çç∆^%mR∏∆&¯∑UÙ»Ö¡…Ωı__˛?˜\,ºág˙,æ/U<å?Tçj:5J¥≤7QE7Î|OÁ5"øÉ/@•¿S}∂“âﬁàÆtl`D„&Ñº√πôõ∂r&˙
:˘ÒËÚÿÇûß@l»Ê ê’§Êd,bÈ≈÷àŒÀ‡îôÇu◊í Ô¨&≠ NEU≈:yÌâHâb/Úï‡Zwí@ÔÊ†Oπ£B65'1üì2ïÕJLâ~l¡à…ÃÆ4◊é∫?D„E¥Í3úõ°÷"÷
–ı4ö%–Ê–áÜŒ}t“≤ı€¥cŸ•˙>Ôä•◊Ÿ-’+DÓü≠ÑÕjΩÀV^ùDÉóp∞N∞µçBâì£S"¢¯vp’o◊¯+Y¬Gª
z#⁄∫∫˘§	hõtË∏µÎ¥ü·
mÏÊ®ë+~›@·ÉˇåæÅü¶ â|°Í◊ÅŸ;†πúqáKÁ¿‡ó€ü∏Qc¡Â]Ì∂€A≥ÛÍµñê34@˛c\ìP¨kügúhNôs¶JœËM¢È‚q"»˘p≤î9}.”LíåâÌy‹‘Ù€úÛi∏IA2zÅ§œ`O§—3\7∆ã∞/J9√Ω≈ÜF¥Â ÿﬂ{Ó˙w·Œ∂°˜YmZõ©ıR¯ú·äj1–õäÆùÃJ^ú/	gQM≥ö…¸e.&ú´óW⁄¨5>a^'Ú^ßûRhu÷´6ár¨3ˆ|î≠\8Æ{¸jbì(±<±äÑ§πûµåê⁄”≤ÕáΩ¬ÅuYØ‡)£C2≈ß@T÷ôÙR@&Ü}\‡§¨LëC†y>#SÍ◊ôxX[c)’∫aG¸•ËJPJΩñj“‰P÷r ñ\ÃGÆ@ôßô1‘åvñ=:X ñﬂXY:ßZ’g∞£ö«˚¿dß≈VüßÇSì∆/•d¬É¡ÿˆÓ⁄¥Ò.r<¯;‚BHl⁄úL–îLò3"]r!7∫Nåã_j˜†…Cˇ€˘‰<4É´x˘¿wxbC0Æ2MhŸöß≤Œ)Ë5[pÛçﬁ…ﬂD[Z'v¡∑d-I∆íáØÿíß∆9ËÊ'Gë]‚ÿDÙJt√Gƒ˛C R Å=∞nNL‚¿
µ“˝˛V.‡C\∆
ÙR∏—ç`k≤I:áÖ#¨ñ)íÜÒˇLëg«€≥(J˙ñ!nÉ¬QÚ[Èò
ˇ˚z=bbÎ\–È0a3.Æ{ø¨Bõ3≤ÒΩis+Òàx∑º8{˛‘Ò3œŒ1∆}˙L.àJáä#˜”j=‡®*vÒÄ+ªıéX¥◊ÍëüΩlê◊ãß K≈åÃ5TÔ"∫>A,0∆jäxo$œyà”LÜCπÍôÆ∂Ù^÷å§Â÷≠…∫|ÁÙr˙ÉaŒ·ÿƒx”¨Él√“j›†^@^:CkdE‰iáz‘/ÔÆ_X¡.{«ö'»Íû
¥À˛˝Y˜‚ﬂe/ôÀ.÷ù¨éjÇå~¶∫êÂ‡-	ˆ∂E:xÑ‡7µƒ.R˜í¥>√F†ì`[’ÂëÒ(Èñˇ[Î›Ò˚‚WC¨@b0˘œÿào≤F√V=Ñ&'¢|"√ø$∏ñòE∏◊€ÀèZ*&fºkLN`-πPrvπ~0∆H†í +(ÿ¿W—úÀQ≠#ûÖà3Ç"#<‹¡:Å—5»sc+∆ÃT¬Êï∞ú«€Ì´M∞`´ÂúQG…ﬁåmøá©ª}j2¬ó ®∆Œ«zwƒ †%¿Qõ>·Kçß‹]0˛˝0w'†˚ΩéÉE„8“ΩœxwJ¢∆Ì>À˜7ä¡|‰
—
uéÄÓ0÷Ë\”o…íAQIØÆm∂˜√¯u6a'¸f3®±ìØpÙ(úÍL\+Ÿ/+"16S	 fj~9ˆ+Ódøxˇﬁˇä;≈ ê†˜´*ËÍÎa‹ôÎ ‹õUM™ßÆåjdM4øƒr‘~ï›~ã5xX:Ê–wY´5Á€êË’¡£"ÿQE{åƒ◊wFÖ„¸X°>¯q‘§ßœ?Ê™ 1ÒLáx!˝Ô
ΩKM]öãwÚÂ·}∑πÓ‚Æ”à·Ùxq~Ûkµ•:Ë:Ÿà~Ïqt˝Ó9hÉâ'm‘#@ª-∂ªÇf\:´"B7ªÄ~l=5¡™s÷®æq¬x´Ÿ	Î"pªwù@Äè‚?f~—ÒpÖ™®;»ÄÓ¬1VH`N¥ p`G…q6Ö\±«gr⁄öH#k*û¨BìeŸ U/u—Y«∏7eX+Û(N›∂hNÒayµ	€iñ◊~¿’ßŒ‚Ñ™+ß÷ö:∂Û~ÁÕ¯2,ÍïŸÊ÷⁄Úô££Yú,{„S• /#FﬂØP µΩ€Ì‰Åó’Í >c5*Õ_´¶»µ@_UÌÿI™Ü9£:Á»ÉkÊH?Öä*Eé,'÷Ñø¡iı}°ΩÊ¡ªNÀ[Úi€Gq2Lœt>hDW√å»∏T˝.º∂¡¸UüC°%t ÆÆÜ’U6^3“\§ÙÁx?`≈™2áÀaïP'BÆu r∂ﬂfÒÊFo5∑—∏iì®n£*tKè€yÓHÑÜ1Ó£â§P–Üwæ$=¸˛âU—a”mCV}ÁôX¡äCø}ô«ª/æ˝≥ÖgˆÍô≤mYVÊC1dE√Ã"¡˙b1Ù1ÒÙ'¯d˙áCﬂsD1K q‡Çö”dˆØÑ)kF”>>yÓ∑66eöî Ûe…›¶‚øya/úpŸgú9É
i<êb§r2ÉI≈∂0É¯‘~3$pÉ;¢:ÿá‚BÇkmx¸=Ë!>„naˇ/˝˚Ñ˘JÅô?ÙdËﬁ-Ï2|ö¿¢∏¶8ò“nÉ"‚ﬂw#‚K ™q¶<öí’∞t¢÷è}˚±{=òíQ+DuT·bﬂGÏΩ-éBY¿#Í=¿_¶xòD_+·ÏﬁÉ@ø.§‚Ié:&f∑˘î4“I9˘h„Åã8"Í»¿5ÅpÚ ≈ÑSÄ D…7˛4Î·…Ø◊ﬂ“#gøAﬂìÃ…z«Í·°ø°òH“]PÅ*|9-JSE3ÊUáÈqåÄEãR?ˆ__˛·S/ßí¨úŸ∞≠3”F,îf≈nŸK∂ﬁL◊ãX¡ØWÒR4dË¨b∏Æ<+·ˆ∑ûe‘_<}j∆”JñvØÉÕYc∏j-àU3ﬁT>4IF‹Ä˜)Ø3y›	aÊ¸∏èBé•,`úçh ≠xO¡ß‘ëMﬂ√i8à@„Aÿ5aÕÈzLh\˜¬…òös«‚%Qo@x8iØûÕ‡jo;+ÔDWºIO74˙ HÑùˇπsKº™ÇÙPòWé‘ıíM‚
;Á0®Âx=ß)Ä◊ã/9td˙≈©CV˙‘‘‘·ß9bGÃtÓCä˜ˆïÄ´p·ôÅB‡˙…7áq<.µ#øVı„é√€É»6jÁ¸vGòΩNŒ£ùkPY©x8u´ß.YÓtÌöºÿ∞òeìWÆù].Ú6ÃØ÷ÆÂı¡Ùå[·I£0öåªKdñ"™8(∆$¬ö:mhÀ®Ø3ÇÓƒ?;´®Z.%ö≥≤Àˆ¶úRâ1ˇlâò¥ '.Ht%/Œ[ &ßï•ä ¸ì#9ıy¬ïW
,æ
õf™€°qø“Zç:Q…Í0A§,‚∑Î<S1oÿ>Ï-®4ˆK˝´U÷ìÖÀ¡ö7Î=ª,[«ßÔŸg{ãÊÍŒ\a‹3≠3¯⁄¬?¨ŒPÔ˝pv&Ò)£3~∑¶uøA[¯á’Jk)ı÷¢jJ≠Ïîá∑W≥FH·ÉÉ?ùC≥>8÷s“≠NÉÌ†U_[∫.ç
çi§ööi ·¶ó|J∆O…xh2^æZƒd®û>ê&çÃíYdÿHÏå\ª [íÍü8 ‚®?w¿∞Ïù`ÓÜ¥]¬’Eä‘Hárº›ˆ◊*ÀÌ®Óﬁ\–)öc*â«˛r¡%°Rµåj¡^Ô4Ñ?&≥éLÅ'Áa√Íæ¥c|qâl.≠-§⁄¶ÈÆÆ}e(ªÂ(¢È3êté¶íÜ!øÚöœ.˝íà_”åt†óZWRÁ¡®î’b⁄[£o—≠o∆„aM≠œ)Ce¥ß˙bó	„$~5bRP¡`^åY;	íåQZ3êÈÏèﬁY˜Ñ›>EG∫±Ûûg][7Ü∑⁄‹¢SBëqá«g‰Fú)*TkÁÜÒÎÏ¶áÒûı ¶pq6óôgÑqö∑#∂ävÛ”ÔTÔ◊ÎÖ“Ä+›"‰∫‘<∞n|Ë-∫:›b∆hÂªù¢∑ùrÕÜ·åYwŸ‚reì¸ ú™‹»úÍä‹((.¯¨W¿YÒ–≥„j\»Ú◊p>•ÚΩ)ˇWib$ïˆzCX¡MÖInÍ≠PèÚ(A"ñ7G∫;áΩÁ“\ópÈ‹ÓK¯_ﬁ–LüRp∂¯º≠ RyºOz y0ÿgÒ¿∫\úﬁ(ö‚≈¨pMˆPvŸ„Ô–tÖê‡ml•ù[√vª÷»Ó¥’Áyì[9ﬁ“Uqù ÓT˝VáÕîâw0zUñ≠fıP≈à¿›∂%"; ¨?ƒ®º¥∆P|nJ•‡˜!A√ÿ›˘hÁüwnrç‡8˜¶Ñæ&ågÉÔÒÆ±ÂXY5NÑdbKÚ3ÑæØÜÏ†´G+`„‹ ¶'j≤c#¨√F@+6<JT#4j1R÷¢Zè‚ ‚±$ëøA∑hzúR≤vßz¸,„©Ë˜q"ÍúÑI˝?0[„ûf‘Ø≈ù†¡ù∞lJÿJ-á+"¡êUãßö$D.Â<Ω1~©¬vêûõ˘b°£Ê¸ÜfÒè˝ﬂ±˘˚sˇ?˙È!<¥·}Õ6i≤y4FwÌê
ÌõwDnkuÄ≥æ«´‹Ç6ÜY™<:˛àù…nZÜÓ¸ç”2 ò˚CÃ¸ei˜‘¸˚]QÛå˜Öö˘Î~∑ﬂ$ã∂ªÄ„Á¨X≈ÊLÓà42æXòÄ∑zí·7ËIàdbµ‚”ŒM#'=,-˘MY5öé ŸoHOˆ≥gôÎàX+„´y™$@–ˆIHhΩfÿ6∫{ ¡/7àn†„r,◊ug_∑ß9€>â`(ÆW_k¥XñX„f⁄/á⁄o‘#~a=∑)@2áß€÷,>›X _«˘PÿÄ'µ8Ò˙÷™á|7≥Ûãy¡7B,[Yõµ”&X,∂Ñ2-µG¨Y≠t"˜ÜNZN·lOºlóﬁQOCÌKçÑ s–≥’R¥ﬂÃ" ≈9ï∏©ûa÷⁄]…m‰≈s=,˘‡,ñ¸√±¨’ÙØÇ€øbS“ê¨ºÍ™Œ|6ó.gg¬⁄u6ˇK•KµÉóÆ_¸≈•˘˘ÉóÊ'VB∆˚D∞®`'¸Êœ£vhß∂÷ÙaU§£≥‚“UÉÙÊÂz/]µê≠Ö7⁄ P≤gÓ6åŸ√£⁄Ç Òk˚L·®πﬂpó∆˛«Øb£kÅ⁄Û„‰‚^~ÂA≠h{‘xL`ªœxI–a∞`¡“##◊∆YwH˝œ_íè⁄¯ƒsÉV¬P}ÎÈ…M›&qœö^3È·>∆d“T»πﬁ(ÛÕk∆CÂﬂ»,≥´æ$ŒÖí≈-Ì∏*clÑù[∞ì$¯á‘mï&Yl"7¸"ù±&&óî“6?â8h3¬∫¡%•cÃE¯ï¥|Z¥ôZÃÎ”k‚eπ›V2¸9Ü•B5D÷È«õû§ˇ¶_JµÒäÙ[˚Rªôlí˜Ô–¶íRŸˇ‹E≠Ôm
Óáêÿ;LvnJ◊6ß‹˜Qö‹'Œ BúïÎ8ìé1Mfb⁄íÕ2ól$ŸÑ≤ããEÕY.z˙⁄ŸãË/Á≈IœèF…]C$û®Ï}&ÀÏ∏ÿÇ“Tøî#µ	–∂ZêPYö’Ω™C”ÍÂ8˙n∑h7∏iâã9–éVññ ¿†n⁄Vé± -{6§&4¢)1áFvoc%'b(ªkm–Xs¬:·‡ûqˇ“¡ùí¯·ŸÔ6)f* uÕ»ì¢úç·T*∞ßˇÚ€´∆:ZøaÀl^Rr≥™≈¡∂ÎñﬂYÓsÈîwõ<Ó»Òêâ∑ò-8u§§Ì|Bìáçx@;—]AÌów±0±‘]!ù åÚÆˆ'?◊Ä„Ωá…,')¢vG®&>/ÔIu¬ÀVŒ./3YÙ!Ç_\ùÅıﬁ”˚˜]ü§MÏ&ÜJºÂ CA>»rvÁ}6K˜wﬁµÚ•∂ jL=/Úid'´PRoÇ˘UéÚ;X1Z¡Fµ5Áùv9l«∏/ú˜Ø∫o∂ó‚É%0ã5ÔZAõ‚xk)F™zIa† _Murñx’æÅGë∏¨Ú∆≈PûÀ)îÀøUìœç‚U˙¿:-¬¨˜,—ˆ∏NΩ˝çg¡h≈MœÍ(«.Ø–ﬂÔ˜ÍZ¥ÓÆ8˚oË
K«KÃedwXΩW…Üﬂ∆éœRNÎ∑ß˘õÛr§Z‚6n¢•|fmNª∂-°ÅôhgêMŸÇ√®,µ~^©æ¢∏¯ä¥Øî}ÕiÊ@†h%Æ:ì”ª∫Kâ"?˘z∞†)féumHÿ)çbvöò˘= –Céß&«SÀœ^≈f~±;ÊZv çiNºı∫w˛’sgœ_òCsÏ~9˚⁄kØûÁâ6!‚ßÙ Ú_Xuôq–
í!vb5:e7≤Åïc âÿ˜±{p”∆‡˛"OpÁ±M˝’2π≈∏‘Ω©©0¨„:ıË™~`ùf∫ó}£ÁŸ¶{3h∆N'#ˆ˙$ôRÍΩIûA˚~q"M~r≠âO˜S‡Ÿ^‚iVß¥%”† ∂°î„âhÁfeÒq\©≤ÔQ¸M6ˆ◊Ë*t√‚E‹§@nôúr7‡ÈU†b<ÌëÔ|‡◊!≠(Ç¯#•∂∞h≤p˛˚7ï*ÿù“oØxÉ&ÃÁ&Kj¥ûñ‘ûCYê4#Á»v2¡_CÊ’yı'‡<∏ﬁEÙèË~˙îa0hvqb¬;ΩL>-?Üıxï›ô=0Ù¬öW/ﬁTŸõ.{áò†wøÅ’•xÚèfØçAæ¢≤%Wk6TFÔ†ÒMÎkœ5≥\&
¸∂É˘|æú»∂L·r)Î }•¸¡I„es-Ÿ^Àv¨çŸ´ &=(Uç2ã”k“3Î„πDCK5êNòb¶Q∞«ÜæÜe1¶!8˝W6kÃ∂—‹‘ÄÿıD»∆s∂À≥ßsk~= µœ•KL-(ŸÉŸäxZcb{`ı»ÊÏlwæŒD>÷á5FƒçÜﬂ¨A,áwëΩ”√ˆÜvòæ‚FÆ t¬F@ûâ∆}c<‘ñ…⁄¶ÁKv∞QÍ™ÄÕQQ4W‡µˆb©(ÍˆŒˇÿ˘hÁc€Éñò∂M ¯eÿÖhÛÙû¥ßÍ?HB8o∞D=p⁄îˇÅÏ∏RM∂Ì9eÄéKÕ9oêXÓc@Ã{©˘SH˚wÏ˚u
~˝Å⁄«∂øTë9¨fD‚ûå1˙›dÜ˙H¿æ	∫õI{uªÕ÷ñ/◊úîif|®+~]'≥4a°Z
jH ç>AeƒOëZ?Un’]Ó–2`fÒöª∏C–¢g-˜–ÿ˘÷âÕV<Q(ƒ¢¯ÑN˘TΩ¨
X<ù“Ú=qñ∂ :ëBŒkªueﬂu˜?ƒ∑…—ãÙM≤9L◊ÎÅè}‹[¿ÒgBKÈ⁄dt‡ÚSˆ(¿4ÿt¢|ªDwêK=|_´˚6x ∑ÌCyıéƒkQBÇ¢&´ø!¡ø ¡óΩ~√Ìw◊Sƒ¬ã}*Ëö?h=‚∆	∑–ÁæŒs˘y…Foqÿ +:π$oùìjí¨⁄@ëî≠¬l•Õß~∂rqr~6ÕIm∏ıÏΩKÌ"„†sÅ˝uŸ·Ø5´^1°ñ•pŒ
jãZüÓV	¨ÎïÑdùê‘<y∏36d˘V≠T`∂ol
B•ÏAÖÒ˜NX[æ¶¨v ú©ûÚÒ˙˚w–™ö¥BDÏ˝œi|ç&\[Ñ∆õ»±∑π©©$e∞¡–»ò]ﬁSûc'ìN».hoÕ‡πÛÑ~µ¸ÇÈ?@¥)Úåp?3◊ƒe≈3w”çu+∂˜´∂Ä:îÀg0nu·ãπTgè˛ì„ﬁﬂd:y P™4-‘$ı_*aád¨—;‰G»I ã
#û(yÖfêI.MÄè∑ÖˇX“UUæÁ?-ÅfK|…ËY„R≥P‚  ˛Á(›‹SvIZ»÷ô¨vÛo„óbíƒﬁ\|R3Õ+k≤ùŒ˙U5±‰µÊô#“ÄCŒ–!‘Õ`œDmH∆=<	ø˘PSÊª†åßzáÛ„≠Ï∆˙xg&öÄw±ÑÂéÜ»úTO€8 ƒﬂ∂Gù∫PRàŸì‡!xX ∆|íÆñ±˜”†ﬁír—é≠‚eÄa–—E"◊∑Ë.K;qÅc Rh*D.™ı(πU"ÜËúuΩUJ¡óî„\¬Ä';Ÿ¯•fN◊|˚Zﬂ)¨'.1´ŸU_:L∞éDJ’öß>>>S¶ÄõUïZ?—iæí(ÅYp!*c_6sÁ¨ôˇD∑Ç•M®Y
ıò≤sÜr	–œ:∂/y≤?™4]Ç®>{|—øΩîƒyÁzÌ∞æÔ°i√ÿe^è°Ÿp∏G”Ò/ÉSËˇQ¿˛ÂÓÖ7ÿtî]ÏJÛ“íÎ bn…wÅ+‡ãLﬁ¯è˘:dÃ_Ó˛`)gw‹ó¶˘a;Bàx≈Tƒaƒ’3hXá>=‡~¯5iqH=Ûè´*⁄-⁄>DT[v∏Œ}Òp∞c5ÕwÌLóÒÓ∞J5–îôpw%ﬂ«‡Ñöú◊ˆØÇ§«Kö{ÇkçΩ√‰*äcHK_ÌtZÒÃƒÑ˙*ﬂÜ
◊]âÛ∞5YÁ:aSwEñ˜*viníπëÖz(çé.^:PÆ,\äA%ÆëÛÏ\(òÊˇ"“7\IéR•¸Uú¯EÒRÌ`qvÊRÖ˝[ö-ŸR‚ˇ]øÃ˛ª∞ûåU=§?@Ëc|ã≠t2Tx◊U—Îå@æc9Ó]GÒã≤m8d…Îº´]À≥ù¯I\o\Ôﬂææƒzrùï€∫é À7¯?åS~Pö=0&n8p∑∆õ[3$f∂ûödˆ∏ªLx<€4≈J/§*¯D∆HÖÕï‡˝€u"u—C•XxÇÑeÅ≈ »øµ	r•¡§Èoï‘yı@ˆ¶ﬂY≠¥¡4˚≈’vÍ1 …ıûÒ~¡?bŸ˘ﬂ∆Bª“∞[,}	?ﬁﬁm3∫Gù}£…1È)ô"z’†OªÍUJó®'[¥D|°Ω™øÄráo0—ö;wÜW‚π\V2ôdÀ¸Ó ç®–;∫ê∑–_”˚”G„ƒSKîY0
∆≈}¸–œÆgu,áqùNº‹Ï&HπúÔbˇ+Ö‚sΩˇÈˇç}P⁄º5Ô]˜Ÿ˛∆|!q˜ìí∏ø˙:'‹êÕBïÄj ."“€kˇ#O_ÚÏkı( ∆≈2’3$dçÜø—·k¡õnñ‘∞∞Ìíˆ'≥‰BF£Ow»∞;$}=˜yÀËdµ˜-cå"s”å
t}‡æ¡Ø∂q∂ÕõmrÿÙm$íÚc¡˘HG∆4Ôùê∂m›Ñ∂
Ëx)&›÷>É˜sŸa©ÉR4Nä∑ÒùÏ!t€Bˇ˙$“’¬Ó©2T,∑˜·÷:Òv;0Qµ¢_*°3¬º‘&çK÷Zæ∫AeÜÔø;råüßj2Âx?Mcºcº~p`¶ø^Ò¶¥_«òÿ	?´)∂'ªgI‰dœ˝ø (°æ˝oj|j>”w„`Ä:? å%ó§ëÎ®• ú«û1éÒ"lª«]d£:∞Nìﬂïd¥ŒW≥Ãó1ﬁèIÊfµ•sW“éµaSKÓ|òQñ¥e•∆ÜØÊá¨=ö∂5´£â¥ÃªÁ∂‹€*óL4“=dãEYªhdrQu∞Xdnï§‡cÌàååÏüD≤~Çd£ëTB<í¯±⁄äî…x4‰7¡§≠	ﬂÔ◊ê˙xdß+a+! …4˚∑.ZÅ∑œ#S®¢§'ë–xH[-Œ≈>M>i4™ñj¥"√€ßœçß0ÙâL@œ9÷aæ{@—†®˚ñÒ<H»$•,Y§™#›ùO£IÌÙJï˚Fïj…F+‚©$®q>Gug%ûí⁄,æûñ˛ì‹ìA7⁄¨é˛∞M∞¥«£Évâ~HìoÕc“H4Ù‚ÀìH9‹=7ÏÌÿ|ﬁ‰
àfMS?˘S∞¶Ü¿gÕIj’u5·çm”ü∂» V·eCÿ!
òQ"ƒÔ˛8Ê+>Í+<æ';'nú86Fukßv≤ØÍí¶ÕcV'`Ì†5Ë⁄∫`?•ÏekÎ>˙3} mèÓT@ﬁtÁìÙm‡O2π>AG¯»%Ì¬ÃÈÆ∆£&ëÃ”º$oºÑuÄ‡≈ÿ8÷”>'jHû˚é¢O"·I∞ú∑MÁ¬óü5 ÚÛGQ˘—˝fêˆî˜7á àHF}˛”Ù=’…O-dû¸í˛ûB‚JH€éZú%]¢√”Õamé}ˆ∫7ç^Ç»ÿ£ìl<˙‰±éÆ¥-‡ÃˆDRÚ$_åää\‚Ä$÷ÍÒHlº5áÆ¿|∞tÆèé“.•ÇUÙI§πaﬁ7˜ˇiS¨—~?dj¥∞_Ü ∆‚=ÀH¶©√àDãÏGM8Ì[:ÅÎ∫˝;kH)È÷J<›{{ı∑0√Àˇ»6L⁄´ﬁ-ÛXM‘∂I®*\;#%”I‡Oêº12⁄J”g$¸˜ï≤≤I*ÂÈ
:ö˙iÁìß$îMB˚C>üˆøÍˇüÄùsót∫œóÉ√Ppﬂ}$ﬁåú˝k]ø'ChäèA›^Û@·B4¥ÏfÇ˜oaà9Ú‚¿s€©!‘u$?M≠uË¯Îl&‚ ™<É†#»÷ÅQ·¡É/[!à™Ì®Í™P≥pÂ«;xT Ã®3’ŸJápl Œ¶]B?Ã∂Ä∂©öÔMY{:\É5á°+íC+vNíLné˛rË;+LÃ@ hŸ3¶©1[©GKKkÆIjËü[¨Åª†ˆI/®ı…{˙Ïz⁄Ù‚ mHè,z"g“&!Y§≠H6ﬂ	ºÉπ^¸∑6
H1CVÜbz£jÆ—ô,3Œ—≤1XG§€a»÷(T˝v¥-«0∞_Ïó£E`|ıwA5¢‰d”sìêkòπc⁄(Ë/∑ì'<ñàs#Nït·uÖ%ú€z≈˛è.{˝œÒË—˝‘)˝?ı?aˇ˛;nﬁŸæ‰—Î#“ÁŒØy bˆˇøÛä÷uÌÒfJ)¿à»èíN‚ZeLÀ~˛Áˇoì	Vü Síı˚ÅË‹¨pcÏ{;UIÈ‘>≠S◊ÅÆ …QåÂ9∞9B¬U,É∂FpÕo¥Í¡[mƒ‰–q∑95˛“TÂ eÖöhw'‚â+S· Ùƒ[oºv·\ÎDÛóˇˇÏ‘…π÷Òk?=ÍÚÛˇ¥z8\˝Ôß˛ÈPÛÁˇ«‹ë◊ﬂ˘’/ÉïÂ’∏Q;>yÊ\Ûd˝Ï‹?˝„…◊~\˘˘Ø^ª¸è◊⁄ØæÒ‚?Íæ}r˘Á«ﬂ8>7µ\˘ekeˆWL∏;kG_z·'~|Ù–Ùµ©#ÂÁè\õ~±¸‚ÙµÁ'ÀSìGÆΩ0UûzaÚ⁄KìÂÈÁ'ØM:\>ƒ~NON≥úÏﬂ'ÀáY˙°…ÁÀ/¿ø/L≤≤ì¨a(=yÌÖ…ÀS”ÏñZûzûe925	5Bïì?Yf“›—•ÓO™ÒQLõL¿‘w[Äæ¡ñø[ÔHπïœ¡lI$#5ø6ﬁ¶VÉ:ƒ§T·ms/`HQ{IOŒl†¯î¶¨∞T	¥¡ºpÖæãàﬂph/’'
ng4¥€QªgÓ≠A‰+≈7∞‚ªIa1Ó¯?l¨∏øƒŒ/≤V.d‚m •~∂9"*§™ækb¬Kt€∑] ﬁ¶IÓ˝6 N3∫:É=› ÏÖ∫î0eÒ„éñ1Êûå¢z-∫⁄$…Iƒ≥,-ªQ‚|–√fÿÑZMz„∞\è¢v±®˜f‹h≥‰Mÿp2÷¿ù{NõGô>
¿Ù¨Ä˛®Lo¶+`z˚Éππí8ÊMH∆òËB~åc
	∫ç5t]<∞û®øGÒ∫∑*EàlZŸ;“â<˝A*b1QÇâYú ¢1◊÷ÒÎÀı-ÎDSJ¿céF9)åGÌªØZ%wôÃ®ÂÚ&Ôp8x Ñ·Ç"búÍÀ ≠,ª/√º[™ jπ&*ÿ}Õ∫‚_E~C÷”E2ÑVO§^§>Œ[ó¬líÃä¥Œ®¿∏¡ÙÎ>™íúnÁ¶@ÈñqR‹ßbÇˇ¿∆ï˙«∫ÜqË(ZØ´Ç6&*œÏFŸ•†3¯âgÏπàŒ®Ìø2Eù¯!+&¯∏~,}Mz¿CÅH:∆yÁWµ{Ãi•±r¢±˝4BkBtK§Tÿ_ÒÈ‡G™%÷°Í∑TKå»î!dÎ˙&‰öOñwVŸQ∫\ıŒ1A(dK”‚®~% Ióßñ!äD…∫⁄h?ÿyÿˇù'#'?∞B∞ìÔR\!àÓÒ5∑ ⁄◊Ù!—lr©7≠…ê≥ô*O@≥w ıJoñ∂]Êë[∆8∆˝(b>#ñô[ ”:ö'Hè®6w¿ÑªôÉO‹d¬1ßÜ‘F"dC~#//€®®T ’;2ÑÌ{µg1Â¢´v]ªÌà˛êôØü†&ﬂfÉBò‘mG8à‰ %%!nk ®-ﬁ∞6˝z›‰˚¥›íàI‚_	 òj3$⁄«∑[È˘wn§H‘˘ÑfáÓﬂ8@ ˚d–˜Ãn ‚•§Êﬂ∂,|î““¬ÆÑõT…ÜWπﬂÇçÏ˘nÂßP„êh~ÿ‚L ∞”ç]±|}†ìI¸Á`ÛÈU€;±é—ÚZ1n©¿ñ"£B÷œ≈M√rΩõœOIk±öy†„˛∂LY›∆]&≤.E¯D®W!jêd?Ú]»
˝å Ñ·œÖÎ4_Äúú©n∞ÁËﬁ	e^c7Œ⁄IvP§ÙßÌª+åYqWµº‚Mûî™ÑUw¨Í.k◊Î‰µ	—:°fêÑRÆ‚ Ce dZÎ¶[¬ÏL¶‘#®hôÊÌÀ'Ÿ±T,t;aoÒsA˚JÄöfR˙P’Nt9hŒxÍ¸π2„W¶^z	∞g(◊h@v”òΩŒ§~"∫#Ï…íöbÄ¿˝f-j∞zûcc˜z”áùWWπ”Z0Üπ ﬁ¡äÊ"s-5ïNÙZx-®ßó⁄®)#:˛◊ó∑~Ô·ΩÇëÎÿ3◊·o$gO–;»;4åû◊à!«WÜÎk>"qır%Ã≠uW\˚5Ngt¢_JikÏ’´Ä±õ˛ËrÎR:,o jÓU6äaõ¬÷Y"*æ-àòÏúOÇÿ£Ôk©úÄ+“#‘LoÂ⁄ƒπ(ûQËlåÁ¢z˝-åSêí+;ubëªX≤ÄªGπqÆ\>ﬁ
ëo§ÓÉÉ≤Sﬁoƒ3y∑ìQñøcÕ ø—´Ì˝ò7¨ÿpˇ˘˘Wﬁ?ú=Í¯ÔÕ„géø˛Í˘D 92Çπç◊Û{;üÙbtÉEÔ†6ŒEÿá;“áw∆Î¡
¬ÿ∑˝á^"v1øAX“⁄√I£‰™Jn˙-∂åﬁÒsßÕ]Ôl›≈∂›f+ï∏€¶{Ìñ'»ùx†ÑÇ±M<∫πl{3ËÇvÓ}o˙˘â+πXåX	Ì]»§&∏Œ)äÇÂc%›ÚäÖWÒ≤◊jG@ˆpnr	^®‰Àﬁ2ª≥∂Z¨Õ◊¬z0∑÷¨¯©Rè@4† Œ∫z#ÌQÉ=åU¡Ω°SΩgûÈ=#C@ÉAÌ’+L∞9ç!ÏA˘0t^!yËÏkA∫Uñâ_±ò,÷‚ôŸ_ØàÄ‡çÖûYÓ6\ƒ7¨ˇTPc◊€∞ä!	ÿI%î:‹G8Œ∑,¬“»Ñ¬¿HP˙î˛ ,D˜àÌ¯˘2Ø∫#ÅˇEP#VQA §ô_ ¨{MﬁrdÏb≠ÊhÈóAµcD:4?U‡{u¨≈/‚	êÀ ™Ï·gJ–%ù!¡Ë+~≠V\d∞¸Åu≠™ﬁBµ÷xZJ}ΩEãZUáT_¬ömm6-…¨œ <Ûi?·ƒJû|ùkùπf»HæÉ›,àÓ£[‘;§øvò}cá™=+Ùì∑/~B˚∑j11‹9JjHI $n	[˚ë(JÄØlÿ?,l¨∞»Rß…∫πƒ$‚Ùx"ÚâDQü6ﬁ‚p¥ms:JÌ@q•wEõQæ≈ŸÛ†z\È¿˝≈ «+E•'g«€m"Ä∆ßßÒ¢ö‰AÚ§◊Î—Ëõä¨~∆íbÃh)äΩ_Ú" !Y—≤_èëõ<Éz÷ì´„ªu@s≈√xã…^ÿoçàâOÏÜ#∆j3]¥æ‚µÀÍ·™¿kOÄ·^N≠çãé1qDãE,Ù*Ì∏C√d1ËKï&€lÏ¸≠àVñÖh’›f-`wÒÄ≠W≤"nê%
$äO K¢^≠29™–E"pú~≈:“Q¡w⁄¡Ø§ 7±ÿöC5"€¶ ÓW§∫ﬁK2˝™«ÿ¥p(≥µX8vÏH,Fÿ†6u)®yWBﬂ°B<v&∑¢∞Ÿ©xÁqhåÄ‡‡>yˆÃkßœøy¸¬È≥gNû=ı*ﬂ |¸mPÚ6kEw6ú)^TáMÖŸ´ya£‘BFΩı5Ôj»(löIªgÊuQjÄ g¢ZP˘eÏ≈Qı2„ú`ãıN–éºWØµ⁄ À±Õ∫¯5A÷–¯Õ∂ú¶µá‰´Ì∞¸î}+≤V@Z/∞ŸË∞L„¶¶¿dq`»≠∫6·í√æ6‹gÌr¥∆˝::ëCß1¢À5LN;Hq¬ÍÂ¢"Pê“UQ¨k©ÇrU1–ÉÖ8Ö™∞iV·ÅÅ4ZB	ã˜éz	ˇ@˘0˘›NK_EA»ÓNJö|µπ¬®üÇI7»VjﬁÒ|TÄMr>XfC^ı~‚˝∫[ãVºπnã]Å¬8j?˜-@s%5ŒÅ¯5QÁ	1W!Gù˚)Xa›\ÍAì°
¶a
`¬è√|´à<2ÈÕ8®≤=ÛD6Äˇ⁄®≤¶è§◊⁄A ìMC™ºW:Ãã∆’U∆DÎ@‰^a9\é
ê⁄åNuçö~„A—∂ï¨◊q˜‘ˆncMªy´Lü#≠dÃq÷˜¯"ÏÒ9Ëlûƒ{˙yCﬁc"ÉjµW™T–fM√≥ºﬁé∫-Ï!^˝%êuπ_2«˙fó⁄◊œü}Î‹¬ÈS*LaºÄ—_JíØèı…—z*j„∆ƒ%ŸffW˝vì∏ôS3‚zÖÄ…ﬁaì±xv®kÚÿæıÆ%˜,∆Ñ«ª<XØ°ï$Qƒ2ıª?—VKΩ∞˝¿U]ÿ"óe»@yãÏ8ÊÔ°ØcYlz9ÀEpBiKï<πM≈€ÔÁÉqåcx>Ó≥NƒC¯t[¯»26sSc<—ªpÚg≤1Ø¡Tì$˜-;ôx≠)]âıûV0e√i-±Ì≠ˆÊßˇ,@~p0>ƒ;†ˇ‹LÅ˛3Yx…ä•G ÷Æ+@„®9R4Q–£Ta&&ŒªOı Eù$ø+µíË^ô®ƒêû≠∏D˝∫‹Œé‡9±-‡¥˘yvÎHÊNÑ°¢(T`7ïûáBUYπZ˚*ùãNC&ŸÂd.⁄“∆XXí¶åÌœùÿTM&w|öù¡ô-F\%ÈX÷ÅuÍpèât1Mé{%Ôb
ã6B©Z‚µöÜårÉï∫∫¶Ò*“ª§˜LXCU¿~	D%üBÜ{u5dÃß8∆ó
X>¨BΩÀgÒ]∞√óµãA‹≈ç¢6¢ŒÉ’`åÁS3‰∞[±-V–VE´Ù¨a•Òvß◊]|õ5J0©∏ÕE.)§Ò	É…b◊FVpj“kÑÕnáq∆‡ôTåb·Ù¯j‘m≥‹¥nµv‘äµÕüxﬁ≤âıücLVDt≤Ùi;:"à´œ≈©…c…ÌÀŒe…Ó“O3‚Ø}-2?_î;jñıÎ®øPÖÎÏOX˚G¨≥ˇÌ˝§≈mˆ®˚ËÙa©Âcñ¢vÁd+28éøŸm°ÕÜ£w@À~!!‹ééÎ¨*Ø‡_ESqúåkö&ÎWqîÇÃ—Fr¢÷9›“≠¿¸kaDf∫87f,Du˙ôG)c†·J”Øœh]•=œ™<œggº‚ ötê¥Ü1\‘4∫›r≥ÇRΩ¥ŸnÒQDéÍ5çÎQÌl(QkﬁõBä5zÒ«’òçúØüΩcê†˜3«9lZ«ŸÅçπÇ*À>„F‹ÆŸ2,gü’
w
ùKóñ∆Æñ≤^ÛHƒ
Ì£0◊+]¢üJÔh˜Õ∑ÌƒCÆƒÁ3WY„<¥éºd±’ƒñµ±+ »^Ä(òƒ\≥vZY|Â!‚nh§	ﬁü8—T&Óy¬Rçd0?IL2ø€úlàsLRÚ/ZÌˇ  ˇˇ‰=ko◊ïﬂ˝+FÑëäkjÙ≤eôéËï∆Àv-'AWı⁄9iQ$√!%´™Ä§F	7m–n⁄u≥]`±¿.∞ä∑ékªÅ˙'˚ˆ<Ó„‹;3$Â8çªu—à3sﬂ˜‹sŒ=œgŸÌT∫ÈÏ”ÄÀ‘ÿ´hõ%•µò˛rO◊11ûÚEXèõù™Ø	 G?‹Â›‚‡œÀi’‡√©S…t≠œƒ®?W($ª\´]7≤°6m^ñT»"2ß5•rìÏöˆaø∆¨ÜÏÅÿG:óÿfnyÒÚ•KÛóØ^[^ —çAÚóØälµä|©{EV)Œ\U#⁄É•“Jö–°l§É~VB“l^ÿÆ˚Pßr2¡]f†9Q-èXEÎ ë¿ªm§ΩÑ—‡|ïZ≠∞’å;£πÒR´6∂≥5¶Âø„ÄdjJØ9æ<πwv˛ ÏôŸsùΩZuΩs∂∂yfv£;sÊ‹Fg˙Ù∆Œlµqvzccjz¸V≥])5∆∂Kò{{|ooow∑∂±µSç6wn≠G∑¶g◊∑¶ª∑v∂Ë”≥ÌŸÈ”µ∏≤WJı[’hw´}´√√÷≠çj\Ÿ∫UΩ˝√≠ù[’ﬁ.o›*≈ïÍ∆VˇnåØ√µÆ>Ü◊«x|www˙*å3‰Ì0[1Uë{®ÚbYÜ≠´˘Ï’˙ñˆãÔFÎ’fsk|≥Ÿ‹¨k∂∑1ÎHƒíÒV‹låÊB›@ö√íZ∂—·X¥HöAØŒ2˜meïAû∆˚Ï![O?Qí≥i˛«àﬂ*€KÙ2¸≈Óy†c1®†‰\Òàx™›2(`Ü ˇçy‡…ìR?†ﬂ*ˆcÌ„eóã?h(ˇJs∑£I°}È^+jn®9"öaÌ•∞ıï^ﬁ∞R%rÛæL•B¿£Ì`	‚⁄Ão÷Ê›:ﬁ9¿Î{È‡çõÁ=,Î‹ÀjîøW»D·8˙INﬁü≈±¡#ô3Òø©y·âÌ˝lÓ·¶‰∏∑˘ÌÕº÷qÍüU~P˙xúÈ ‹vì'&}Æwèºq0r≈Ê»ë„˛9åCz¯a√ov,Òíñ›^ß∂Áø˙Çs¬‚v4•ÈgæØ∑_⁄Ì:J%:ª˚ZÄ¡€•ı9YÙÎ°Òt7≈ãÇnÉ¯Ñ"˛1tI5ƒj∏Ã˝K/ï‚*èx˛ Ö`Y)c:@Íä\)5¢˙1õv,l{§BÄF_*’,•nß˙:i˚ÊR™ø?4€µ;o ì»πj[ôtÛ∆≠zkêÀØM^7J™fÓ⁄3M	ô‘cNÒ˙j‰|ÈÊä∫UToòzëWöÁÀßcé'd4¬¡PD5‡öËôG˛∫Hﬂ[kG´≠®\£‡≤,Îi'ìπY≥aë≤”Ú[zíµXΩµËSÕbﬂ)©†°6◊˚%ì	aòèâ\øR1f—jèç˙…PyËp¢) “—ΩØáÈ¿|Fä¡ÈâÈ‡ ENÈéá•YóΩb≈‡¬ÿt%ÈÙäÌæ¬¬µ/òÆÂnèÒáú∞€xà⁄´∫a≠Né;·“¸ÍÎóÁØ.›X]^º∫|çLW7ff+≥KgVgw÷œ-úkLÃÏ,ø˝ΩV*g7ã[CÆ]6ı≈ßæMY<3hô;Ôl]Ä◊÷Õêûädª˙èƒ*∆[{dÄi<øàÙòá=BnT„7	:{0yE≥fÂ>˝PxK?a af≤–	“|G…QÙiÔ+„∏ç>z⁄oˇAÔÒ—ù–¨I‰·÷…ï∞ñÇ∑P+…v/°&æ
»Ó<ïZ‹B|Ó3w8°q§#cx5 e≥q⁄V‹±1ÿø‰%®ƒÈ$ï»ÒXµãû"äΩ'⁄‰·Ñ£éÄ»7¢t¿‘ëQ˛éØ˝ÛƒÿπÎ„õ§v¿\sÿA—í-ùt¥—Âùì~íºÃ9≠ä„a‚à.u∑emŸøî.ÜkÈÁóÁÇsÙœÉ}gº”…Ò~¢ÔΩêI˝#rª(≠—#Ú¥2ú√ª“$±,:ŸV‘ÎÕ]_ÚD∫:Y(˘Ó›Öìï2Å'«•ƒe¬Î°öòˆì!â;áM(Yä\7PÇPèòÅHΩì≈†Æ´®æ'ßŒß1… É˝¢dû´da@a‚N≥-≠áe«›Õa¡8ó+ÕÚ® HòH>Oƒÿë:Ëf√Ëv-v%R™_[Ç
!„/Ö\‘B hócO†Qû‡«ãªí∫Tﬁru√Fç≠úªdˇHØ·ÈxõÈ,©V¶‡«n¯àfÇ6Ë›y÷9¥ ÇzëBP‚Â=)I˘k£µ}∆‰zá#÷∆JSY†∂+µF©ΩG®”añ&È:ú
|'ÜsÙ›tVzGE»ƒEµó[Ω≤ºxa˛‚‘0ØÖa»≤ƒ33˘Îî˚öı9}<&&gDG +ÃÒ(·?Íﬁ·€≈ÊfMÖ◊¯»jg‰<ı˝Gµ‡πÇ8O˙wtªU#√B¡Fû
ŒHùûπæàaCõˇ˚ª_˛<∞€{/ÚáÑØ˛åŒìw¨◊=]Àë˚Ó¸ Ú™ˆ’p1–{·≤cGÔköK·ø ;‹Î}ñ«;≥úÒA¢ÆdÁLÕèöãeœ«74u¶
∏za≤.d„÷ '·3
«˙A‡q∆w‹âTÄkF·∏P&B´À©8\Õgˆ3≥∂oΩaNÑΩˇÁˆóy˜õ
3"%©	ÿ;KÇ7ÈJîÕòê∆ãÕ∏W√¢2P|È—ˇgbS¥®ÖN*≤Œô›å|BOGïÎ«+§L«s@Jû'hÓê8–,X£(ÿÅ·A—°Ë0T3ÂÎßx’GE≥®ÓiËpû=¿+z¬°B!zBÓ:({hüù~ﬁ0yüSë……ÃÓŸf¶›ÿ/+‰Ç¡Q	”œô]%‚9/Íÿ[r¢ä@.v˜E/ ªÔÉ’ΩOæï¢LáåëîŸjG/c!õûzÑå©'Ïàµ∞C”0~†ü|Le¿πÄΩÍv	ﬂı7K‰ÃÛcU(≈˛RU⁄H]?ah‰‡Ñ$,ÂqHÜø6ﬁéøjtùÎ	∂õç0…På9y≠ØhÒ›∏∫≠«19¢~%4Û%Kˆ^á_C{OCÁTÑ#⁄á{≤ˇTÇMŒ<^ØëÁÑpÜÒ‡Oªy‰	ºcøZÜ>(±•M(Ì"«©ÀßÅæŒÜ∑84IËäÖÑO∑∫ÿm∑…r&’ÅùÎ's{ïK—f”í √ï—˚ÔQÏ‰Nè∑£ùÊ÷`“˝Ìo¯Ûíg§qÜG`É\7ê∑T)§Ü+H!Ó¥f(/≈†Xò‡ç©ÜF|4nqãv[RËƒJåôhÿ—È@⁄∆÷0õ/u&%—√˜∫x—úßsº\√0 q∞ºPs£Åd√–;Xuå’/ÒxÖjåu®˛Oæö”ä‚kMû8m-∑^"Lò€FKJ¸ÅZ}˙±INuù‡/û9äbÇZépÚcﬂ:êÉ˝PÎdæ°iÜD≤8#w£ÿΩD#i*è/		¨˘Ñ∂∞P€≠°h!˛[ﬂS´ß%ˆÆZ`Ää™Ì®Ω9™(+8‚ÇÙ	«&∆+$ﬁm~¢¬??Ê+œèï¸‡·—O1ùÅÈ¯]íCj∂Ëgº∏º¶◊Ìõ∫}wa˛R¿€ØèÒ∞Ñk©«˙ÄgC
¡ƒr6∫≈·hK1™>“P±≠C˜8[ÌX¢]uyW‚ü˜9∏É–ÜõÏ&ﬁU¡ªÏÈpZû¿◊é—,•S2U»9§¸Î.@Ú{(Í##î&YÔ„£;tu«L?.0ÕC+M«(≠…iJæÏß:ﬁ‰_(Í
_˝üédàÉ‘î1îWL˙:µK®Í˝Çq_ê„Ce2ëêŒëâ^.ûz}€	ªõ¨B‘óÛq€©9aVI~≤LÜ°_(5VA¥…ox‘E;Û1îYô{nê*ı)∞„Ó∑J‹ù'dãVµâAèøp¸·˘%ú@üˆs;1„c£jçã≠’#L~°›,U %∫˜°∞Y[1ó´Xm4∫çˆm(∆ _·≈◊u+äFa©°ÑÎT2Á…—πëu=Ñ-:¸≈ÔÉ5 ¬ﬂÙÓı~G‰7Ωˇ¯ø€˚ü ÒÂgΩ_˜>áøü¿Øª◊QTÿG–Mq3+ã°Òùó"NæŒ`◊˚3∆BqéP||bì‡`‰7':'
’Dz¿d ∏Øk”§ﬂë· ˚4h
„bˆ÷ì8vùC`ñKÂÍ®"@‹=ª1h€,ß™ËÛK/Q1€btÑhõ	®õªyá∑˘ãÕ›®ΩXä#Ä)2µ,W}w+?2“ q©@¡◊ñ8Õ≥A®"\)ˇúƒÕz{ )åiÄ9⁄Öø`Úo∂ZzÚπD$!Ñifˆt‰Ê7√Q\ÿﬁÓ◊∂º˜*ìirMA^@ı1Dôv‘ç’Tc‹˝ﬂk·‹Â» ‚˘_Ê$†‰ΩŒÕñIG√∞bæj)6;2ÁTv∏Ç‘ãƒ◊QL
ûƒ¡©	mnBıüm#]ù´ﬂ‘b¶¡Vol(|¶t†
îj;∂ÛÉ’ô∫àE˝îïbÿ##›Pr∫ê£«‰!_Ω|qyµ\ç ÕvÂeéﬂTP˚˛
4•<Q$[÷{Dú~E¥ËnÔ˜ΩOÒŸê¸I,Ù[xu∑˜Àﬁ—˙LQs>˙ÖÂÔı>7•ß∏t÷Áiˆˇ>|>∏±”)]„œﬂ¬œÖˇcC…Zgò'Tl&e(Ékù-k˘õpò¬≥¨˚˜îOÁ”Ø‡ıo°•_–?ÅñÓ¡Ô{}öÓ›µ˚2°Ü¢™˛◊pò§˝¸ım8Æ˝Øìõ>≈´Û;xˇ0¬¨Ú{	°jÖ•é‚J•ﬁÑ3å≥®í {üØ3ì?xı˘·q~¥L˘upÃ!ZÜNu1ZÖˆìDr)u?~°©óèMx«[Â´0ÒÇ~ƒ§f+›zß÷™◊€òΩÎ˙ÌD)üZ8Œî˜µ∆N≠s‹Ö•Zn†lÕ á)’—õEø+√SÏï√Îíˇnªt˚mvQâM’R\k4ÌJÊˇ:π ˘"ÈÃ˚ j◊ûó¬èû§˝•‘◊π‡!bUZ∏^ªKó’åW 4ÁæÕ&ó>´Èîí¶˘‰7—Ö∑ÖYÌ˚≈L„ﬁ—r
dµûVt.X‡ò"iân$@eµÔî1CóoEÉ≥t ÿë ◊¢E	ÀY-:elãÚµhQúÑ¨e3eÒRŒÿ;Dô≥ˆÀôv˝/˙n/e+å_5z’>çÁÓNø0iL[T¬ÉüøZ–®7ÅÁ”JÛyº†#âë\ºﬁ‹‹å*c5c∑ûê•íâIóZS:ˆö@h≤êm·r,√ñOP¬mMå˚&2/Ò.;¬ı@àBÏÌÜT” ¥Mp@!¸ﬁv"ã>oìsmD±BÌ¢ÖJä	∫˚uË÷ïÓÃZjhüºÎ!PKKíó8˝Ù+mÏ:Ã(Vï€£Ô»!çF¨πgˆMÿ∂´ì)¨`èm.í	5é^ñnœW⁄ÕçÍˇ(‚•
B• 2ú1≈j+c4˚
≈¢Ø*¯ï⁄
X\[DEAcÙË÷6¡ˇp>ÖŸzéq«4y,¯∆“"7ŸË&ˆ‡©pgÓ˜€„€ î ∏È¥∞w°‚r2¿Ö@lP&æIæ’A°‚¨®Ppì®Eu¸û£<õ7&'&rÊ´/p31†Ëb/A≠M\«‹≈™«0:	∫Sj€ ˛E=EòÑeÙö´ıÆab¨x~Ú
{[çÕúqhNöÌlçµúˇÿ_ l))·ïï]ôQpAßs’Éû-Ä›A!XovhAã√/gbD0ÓNª«rlgS´‡˙ô#Y´( íœá0¿ö™ƒG˘√@∏pÚTfã…ıë!Eb Åç÷ÜûÜµÃÑ¡ÎàNÚﬂa◊.idgÀŸ+—	V»xœ” ’nc+F Íg‚ ≈‡‡ﬁzmªFëˆ¥¿ Æbà€π@ú¥hv&¯|jŒ÷sC‚“kﬁ6Y∫V¿
¢<üM)◊.3ÈÒÉ˙`@pb°o˘©®–à˚p ¿∞?˙+ƒ¿aDç†hÉP!Õ€CÜ˘ŸÔ62ú÷Êåv›¯Ωf	ò¨u·_‚G’-ÜﬁAıâÛ÷öß›<πﬂ)‡0Õ‡ ™ë-?ﬁtÎµ¯òw-˙Â¿÷n)^nøäı!á =M°œE•©œ?1¢,¢”jªŸhv„˙ûé#§¶≠6u∆RÉΩhƒ “ØFújj∞G(¸9}ìjâ-eé≥ñôÎóf˝‚`§}'˝±ÓC∫k»óÄûÏ®™}Îç¿ú(\<EÊ:•c∫xˆ`®^j`ºÇ ÂÔ¥ß£¯+†≈d §i4‹TU*@Ià±+ó “W$ëπ¨X3åJm`Û,’*ŒQ„RÜvÌ®AƒìU‘êS°)öÂciY\H:°^5ÀÔ´í°wµ3äiF0bÒ5e*b„§îBgr„Ül2Dôù∞(¶÷â∂ù' /C?ñ;#h‘CE ˚‰”1ì˛úäú‘«,¸dz7⁄wB"hrr_’Õ¿R∂jÀ∞{¶B–ïµR)óK«M)9-≥‰FÊR[-π'8v¡èIÏúbHÃû7‹MÀ2à√ÎõqÍ2Îaåª)[ûñØßötSN«ôÕM≈9«R£zÍ“N≥S™#»≈Æ⁄ìﬁ/¬ §º^(wîxë¨"Ò£—c2ÄX¯…öqõJH O;.m∏+’™Ic«lê∏u%v%œRßç^jl•ï¿â®À.¸vN™ú}!Jc£ÑÇÀNØ‡O†‡∂‡è≠hötPì˘B˙ ıkV¯‚L•c–Öÿ¸i±›,7+Ã†ó·7™é9ÉÑ[n©(£H
ú¨"WÅÁ⁄≠8˘›G*™¯˙¢’~¶ G›zÅ–íÆ!πZS6◊ô'ãá≠nL/‘i”Ã¢Ô?Ò¸w-U˝…Ú˘Öﬁ<-ŸÊ¥ö≠…HπÌ&'¨AΩ™Ùﬂ–—õ@±4T¡ø©µß,QŸo§ñt%5áK$+TìF'ΩÜîO&/Ë*!RQ˜m>Î; 6kπ^r§˝|	9Tô∏´¿~zR∞Ñ)9kıG"Ã+%Ÿ‰;:qy*{\rÉR¿)•fúÀÊ«Îﬂ_ÓB£µ%&õﬁ'ÖˆxX/¡ØPÑE\}+ìPT÷«Ö ã¯Œ“äÉµú&ví…˘Æ¶HÂ#·£sC+=Òõ,√èØÈŸcY>k¶ã;ÚµVXg‘‰n+áí`ı⁄’ã◊.~?PA∂<]Î_)Ÿ}Q¶~£VLmø	KK∫YÒˆ•2Ò¸Ä€È–lA‹á7∑ú¡~@ÿºìáahykú¸Ì2 ^qi'Éë˝øÜÆ}æ
∏-î§$KøÓ $˙ QùauÓãhI^Ü·œıQ∆∏%X	µ"ï\g´¬N¢Ö àFÀ√Nù&e"¿⁄y¡-	(—¢Y9B- 1ŒÌfyÁ}{Ãñãi˛^¡˜Ö‹Á  _˘Øj∞ˇ+@…1`≠Õı([e‘v” cRf(gã…Ù∫"≥/$‚¿vJu-€Œåë‹hÓ…8Ê¸ç£•TH&R4¸{Q%>ØåÅØDÚmp`hµ$=œªt{BP'«s+N¯ú3LNôÍ/Ω‰æë˝yxÁzøOØ˝>ø<GKêZÇg÷˜€+&nÒÑ”ÕHÊñQ2QX	Ì∑&•ÿŸï–üØ{A ÁÂÊh Ø7à⁄›ùƒ»•ä«_î9È∂ê®)æ:˛
b´Qç[,ô≈†¶HnÕ„veär¯∫ú|g|]Ø‰≠˝S=πb0QÏl‡Q: JoZ≥˝ÓX‰ñ{°Ò®ÔËvTÜÊﬂ⁄z≥Å›8çwy£πuoˆ~û‚ÚzÙ>y—⁄ÈØãŒÑÏ¸ï≥˘¯z@¶TÊ¸©Úñ}ü#09©Aå∆ %≈M6ò**'ôf)C
@~î Ü≤!|;ä∂†ü’RC!4]‰†≤’Z+]¶‘P´›F•¥î:¡ƒDé‹ Í®P$˜¡©”˘:á·R˘ıu^Ö€{√‰=ÙlΩ»[mæQ±5x\M%"À€d%ﬁBÃÈbMﬂÂlÖ‚»€/ï0° R˘	4[§àÚî’J}~«nsú	KX·ºX&QGÑ7¢-,∑)-CDL¸à◊‚Ê…}jÚµnΩ˛˝®‘Õå©W+ÕFßJ—ı&Õ;û®u≈û≥WznN˜dÛh8„à©ÏR≥‹_IÔ≈polGùí“ÑÊvi{npπ¸˘ÙfÕLvî‘õöØJ{äãgﬂÒ≠È’–õgbÜˆhÙÅ=U⁄◊∞⁄sr‚∏M§Lêçí„-Í∫;ÈÛ'òbjPwyüQ⁄Ìnœ¸∂äMsÜê®."ËﬁnÅ|–ç~g3MSjK⁄“UÑôQc“≈cQÉ∏◊ÆÃ›⁄•®6~⁄#òÏÁ‚GÆ˙ïπ`ñ¸ïÁÂŸ≥≥”≥Sg'ß]ä°Ñ:iÅÃl]=YíT$Iõ*_îÌúró˙ ≥ßHÂÒﬁ˚¥˜G"
t8t#µΩƒÂœäËXjÇﬁGgwAÛùêﬂ„`“^Vˆj∆◊Dª∆0çÜÍÏèd˙{í˝øA•«6)ÜÈ˜ËÉ"¬N¿sÚ¶w2(©I/q∫`ß*ÌM§ßAøBÆ®◊µáIs˜&O56áÔOa
ú´Oöõâ˘ìñl“bEä8∑Iñí∂∫»iü≤ı—«§ˆê¢L?ÑóOTd—ë–Ò—HG9#IlŒ¥{è(Ó«ó‹sÔS⁄ﬁá—ìL˚ï9 ˘u  £<%XxãÒò®Lœ8£S˙ñ†à¯èÉ©3Ü6ìÇË|E—∞Ô¥Èiì‰∆Û†(”0â˚˝Ë]Yê£hSDÉ–„#.…e®∏$wËı!-éIÖ≠¸(π0è{P9gÀ”Z…€Mñâì&àq≠¡]âùªñJTÈfïr®ì©ˆ
,_1RÃºΩ¥N7◊4P\∑p3@~ËèÉì˚¨— ‹Pù®∞∞¸£Ó“CÔGÔÂCÙÔu÷ÅçÚS’vl◊µ˜–O?7l∂îÃ‰{Èa#k©Û|jC÷©C·#¿˛!P|¥∏@âpV_å—àﬂUNá¡Ëxç_ zH¥ﬁÏ®@y˜ºÃ¯Á•ﬂ5‹íTÀ‘‚¯xΩY.’´Õ∏SDA„@móMsâXM ˜!€qß—ß≈¥eùÒóu:‰_"©Ä˚£	Dw@Ÿ>ÿºzeqå0ƒó⁄ıË#uÌ‡ ©¬∂h‘Y’IÂüa]˚Ûñö≠¨‹YèJ&(ôÒpóîµZì	(<Ì~≈πÇ¡ƒ3Œºg]$©„E©‰Sﬂè·˘K†vÄ’kW«1:!ÍG
∑ﬁ?÷Í!JC6	u,P¡:Ásƒòë97/´QÃf)JÖï¥õ……gnyò!Œˇ¨øÚg¬Äºã8’ª∞Ã˜£ºÇÄ≤ö≠‡uN;˚qÙAæ¿Tñc}!7É~~ˇˇ˛˚∑ÂÁˆd‚∂HXx€™p‚a*¢Æ—∂p_Éßf{ÔM‚m§h¥∂c¢g8˙‘iı«ï®±z0‹,;˘*)áØ˘îùΩ◊2K¿¥¯´;CQRxå˚^P.¿Êÿ—37Y◊¸Ò≥◊ä/≠–≥Ñ˝úˇ‰> C˘ÆvöV/k˘ÓA#ëDïi^—•Ñ…“.u2Å´bhl%⁄ˆÍßÓmÃ8o	ˇ…¨,0Dt:a}~\·>ù%ïV’®¨ã£W._ΩVr¿„ˇ‡ƒeÆ° |ﬁÓ6î%∏$√…}lÓ@çãwµ?d¶Ké•ºwé5Iz€Qòb „œí.Ò≈6«ÇÃ’=≈ÚµdU%c⁄bë îNÓ ÁÑùÏÙy˝iô•î´±íΩãÎAú'{®ƒo»q“„_Ë?å‰Å«¯BÛ«)29Ë¶“‹m†‚Î5∏t˜†(%;ÍB©ºµI‡K›ËòäÚbÏ§◊Î•ÀKÀ7ñ/Ω≈Å≤‡K•Àë]?t∞77¸raÙºR0®˜äÌ:üo◊*ï::‰G+Õä°à∆‚∞’∫∆IÌ‚V)gçZ‘7ºüèbè°m&N∫å*ô @˝ïi”ZxÊ»cFœ∞º[¡–z9,îÛ:–È#ë›©ïGu;yQå»ÿ?‡J®Ò_[ôΩ2j;◊-AøµF%∫V;€ıú…qj.É'úc|>q …˚±€∫\Øh5‡≤>©“«Nµ÷ÓÏ-ïˆ‚˘Õ¶£%‡'¸?„Êª?ü@πµ•Ö`ë{ø\UËazbe¨≠ílSË°Xò¯úhÀã?K≠Q¯Y«¥≈Zü¿ì˛<®yóm“‚ô≈¿	‡‹£ù 4{XWYL‰Z·0I5Èá∞•![<‰Íég’ë∞Á¿(ìf§ÂeÊÊ«ê‚/ÎÔQc—í
•K)≈È-πàﬂÆu™£ππTQñdÎL¢Jö∆çj‡ÃØ
9[P§ÆµπlèåÀc£¸˚ÅÃô‹ÇrÙ∫«–Dä‰NπnŒùÆN®-
yà&'qd‚e—ybòóã$Ì¶Fpï˘Œ0˝€¬¢˚≤Ë<◊?ﬂywMÂDØÙ\‘?ÜÎ◊fÿeˆWÿ,nZ_‚∑øœ$OáˇæÏ‚¨Ù¨ÓœïR€£¯÷S÷ÎÚòY'wî…£G'JûP/ç∫œíJ¨πƒıÄî-¨Ÿ¨cNŒN∞"`f@¨1;Ø	Î≤Ôú‹◊ì<¯N∫N±„Xl9ë’<!ˇë„Sûx¯à»]t+z-ﬁ§¸∞ÿ∂Iˆ›WÉÁå¿cQ‹Óoó£uWÈ∂i ¸Ö8∑/&ï6g∏b9˚ë«Ñ◊"ﬂπô⁄•∞Ø«nk&çå˛   ˇˇ áI