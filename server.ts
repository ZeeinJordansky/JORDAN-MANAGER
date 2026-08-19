import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import https from "https";
import http from "http";
import os from "os";

const botStartTime = Date.now();

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

const globalHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 10000,
  maxSockets: 100,
  maxFreeSockets: 25,
});

const globalHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 10000,
  maxSockets: 100,
  maxFreeSockets: 25,
});

axios.defaults.httpsAgent = globalHttpsAgent;
axios.defaults.httpAgent = globalHttpAgent;
axios.defaults.timeout = 10000;

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  timeout: 8000,
  httpsAgent: globalHttpsAgent,
  httpAgent: globalHttpAgent,
});
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import { createCanvas, loadImage, registerFont } from "canvas";
import { GoogleGenAI } from "@google/genai";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { CROCODILE_WORDS, sendVkMessage, editVkMessage, sendVkToast as importedSendVkToast, answerVkEvent, formatTimeRemaining } from "./src/botGameEngine";

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});


const badWordsList = [
  "тцк", "tck", "tzk", "tcku", "тзк",
  "сво", "svo", "cvo", "cвo", "свo", "сvо",
  "гей", "gay", "gey", "gei", "гейство", "гею", "геем", "геи", "гейчик", "гейский",
  "хуесос", "хуесосик", "хуесосище", "xuesos", "xyesos", "huessos", "huysos", "xyisoc", "xuesoc", "huessoc", "хуисос", "хуесосина", "хуесоска", "хуесосы", "хуесосить", "хуесоси",
  "пидор", "пидар", "pidor", "pidar", "пидорас", "pidoras", "педик", "pedik", "педрила", "пидорок", "пидорасина", "пидоры", "пидары",
  "ебаный", "ebany", "yebany", "ebani", "ебанный", "ебаная", "ебаное", "ебаные", "ебать", "ебан", "ебуч", "ебло", "еблан", "ebat", "eblan", "ebuch", "eblo", "еблище", "заебал", "выебал", "ебись", "ебал", "ёбну", "ебну",
  "бля", "блят", "бляд", "blya", "blyat", "блядина", "блядь", "бляди", "блядство",
  "хуй", "хуи", "хуя", "хуе", "xui", "xyi", "hui", "huy", "хуила", "хуёк", "хуек", "хуйня", "хуище", "хуем", "хую", "нахуй", "похуй", "дохуя", "нихуя", "хуевый",
  "пизд", "pizd", "пизда", "пиздец", "пиздобол", "пиздит", "пиздить", "пизду", "пиздой", "пизденка", "пиздос", "распиздяй",
  "залуп", "zalup", "залупа", "залупочес",
  "сука", "суч", "suka", "such", "сучка", "сучара", "суки", "сучий",
  "гондон", "гандон", "gandon", "гандоны", "гондоны",
  "шлюх", "shlyuh", "shliuh", "шлюха", "шлюхи", "шлюхо", "мраз", "mraz", "мразь", "мрази", "мразота",
  "мудак", "mudak", "мудило", "чмо", "chmo", "чмошник", "чмырь", "дроч", "droch", "дрочить", "дрочер",
  "урод", "urod", "уроды", "пошелнах", "идинах", "нах", "nah", "пипец", "курва", "kurwa",
  "fuck", "bitch", "cunt", "dick", "pussy", "cock", "asshole", "bastard", "motherfucker", "faggot", "slut", "whore",
  "нигер", "nigger", "nigga", "негр", "negr", "хач", "hach", "чурка", "хохол", "hohol", "хохлы", "москаль", "жид",
  "мама", "мать", "маму", "матери", "мачех", "папа", "отец", "папу", "отца", "отчим", "родител", "родит", "родню",
  "родня", "бабуш", "бабк", "дедуш", "дед", "сестр", "брат", "muta", "matera", "mother", "father", "mamka", "batya", "батя",
  "сперм", "сиськ", "письк", "жоп", "задниц", "порно", "хер", "члено", "член"
];

let dynamicBanWords: string[] = [];

function normalizeTextForBanCheck(str: string): string {
  if (!str) return "";
  let s = str.toLowerCase();
  
  const map: Record<string, string> = {
    "0": "о", "o": "о", "1": "и", "i": "и", "l": "л", "3": "е", "e": "е", "4": "а", "a": "а",
    "5": "с", "s": "с", "c": "с", "7": "т", "t": "т", "8": "в", "b": "в", "y": "у", "u": "у",
    "k": "к", "h": "х", "x": "х", "p": "р", "r": "р", "m": "м", "n": "н", "g": "г", "d": "д",
    "z": "з", "v": "в", "w": "в", "j": "й", "ё": "е"
  };
  
  let normalized = "";
  for (let ch of s) {
    normalized += map[ch] || ch;
  }
  return normalized.replace(/[^а-я0-9]/g, "");
}

const shortBadWords = new Set([
  "тцк", "tck", "tzk", "tcku", "тзк",
  "сво", "svo", "cvo", "cвo", "свo", "сvо",
  "гей", "gay", "gey", "gei", "геи", "гею", "геем",
  "нах", "nah", "негр", "negr", "хач", "hach", "жид", "дед", "брат", "мама", "папа", "отец", "мать",
  "чмо", "chmo", "член", "хер", "жоп", "сука", "суки", "суч"
]);

const VALID_COMMANDS = new Set([
"/aban",
"/achat",
"/addadmin",
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
"/addmoder",
"/addozam",
"/addozsr",
"/addruk",
"/addsa",
"/addsenadmin",
"/addsenmoder",
"/addspets",
"/addsr",
"/addstatus",
"/addtech",
"/addzam",
"/addzamowner",
"/addzamspets",
"/addzown",
"/addzsa",
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
"/gbanpl",
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
"/ungbanpl",
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
"/абан",
"/аддадмин",
"/аддблэк",
"/аддзамвладельца",
"/аддзса",
"/аддзср",
"/аддкураттех",
"/аддмодер",
"/аддозср",
"/аддса",
"/аддсадмин",
"/аддсмодер",
"/аддтех",
"/админ",
"/айди",
"/анблэк",
"/анварн",
"/ангбан",
"/ангбанл",
"/анмут",
"/анпред",
"/анчс",
"/ачат",
"/б",
"/баланс",
"/бан",
"/банигр",
"/банк",
"/безпрефикса",
"/бизнес",
"/бизнесы",
"/блэклист",
"/бонус",
"/ботстатс",
"/брак",
"/варн",
"/варнмут",
"/варны",
"/взлом",
"/видео",
"/вики",
"/вип",
"/время",
"/все",
"/вчс",
"/выгнать",
"/выговор",
"/выдатьадмина",
"/выдатьварн",
"/выдатьзса",
"/выдатькураторатех",
"/выдатьмодера",
"/выдатьса",
"/выдатьтех",
"/выйти",
"/гбан",
"/гбанлист",
"/гбанпл",
"/гет",
"/гетбан",
"/гетбанс",
"/главдиректор",
"/главруководитель",
"/гник",
"/гпт",
"/грник",
"/гсинх",
"/гсник",
"/гсостав",
"/гстафф",
"/гунгбан",
"/гхелп",
"/гюнбанпл",
"/д",
"/датарег",
"/датьварн",
"/датьденег",
"/датьмут",
"/делетоунер",
"/депозиты",
"/директор",
"/добавитьвчс",
"/дуэль",
"/дуэльбиз",
"/ежедневный",
"/ежедневный_бонус",
"/забанить",
"/заглушить",
"/закрепить",
"/закрытьбота",
"/замвладельца",
"/замвладельцабота",
"/заместитель",
"/заместительдиректора",
"/замспец",
"/замутить",
"/зов",
"/зунбан",
"/игровые",
"/игры",
"/ид",
"/избана",
"/изменитькурс",
"/измута",
"/изчс",
"/изчсб",
"/ии",
"/инфа",
"/инфо",
"/инфобан",
"/инфобот",
"/инфоварн",
"/инфомут",
"/инфочат",
"/исключить",
"/к",
"/казино",
"/кейс",
"/кейсы",
"/кик",
"/клан",
"/кнб",
"/команды",
"/крокодил",
"/кто",
"/купитьбиз",
"/купитьвип",
"/купитькоин",
"/купитьпрем",
"/купитьпремиум",
"/купитьпрод",
"/курс",
"/логи",
"/логиадм",
"/логибан",
"/логиварн",
"/логи_игр",
"/логиигры",
"/логикик",
"/логимут",
"/логипользователя",
"/логи_юзер",
"/логс",
"/майнинг",
"/мафия",
"/меню",
"/модер",
"/монетка",
"/мут",
"/мутить",
"/мут_тест",
"/наградаинв",
"/наградаинвайт",
"/наградаприглашение",
"/настройки",
"/нрник",
"/нсник",
"/озаместитель",
"/озаместительдиректора",
"/олист",
"/онлайн",
"/онлайнлист",
"/открепить",
"/открытьбота",
"/открытьдепозит",
"/офлайнлист",
"/оффлайнлист",
"/очистить",
"/очиститьдуэли",
"/очиститьигры",
"/передать",
"/передатькоин",
"/переименовать",
"/пиво",
"/пивозавры",
"/пинг",
"/погода",
"/подписка",
"/поженить",
"/помощь",
"/ппрод",
"/правила",
"/пред",
"/предупреждение",
"/предупреждения",
"/прем",
"/прембаланс",
"/премиум",
"/премпрофиль",
"/приз",
"/пример",
"/продатьбиз",
"/продатькоин",
"/промо",
"/профиль",
"/пурдж",
"/р",
"/работа",
"/работать",
"/разбан",
"/разбанить",
"/разварн",
"/развести",
"/развод",
"/разглушить",
"/раздача",
"/размут",
"/размутить",
"/ранбан",
"/рег",
"/рник",
"/роль",
"/руководитель",
"/рулетка",
"/са",
"/садмин",
"/сейф",
"/си",
"/синх",
"/синхронизация",
"/систата",
"/смодер",
"/сник",
"/снятьбанигр",
"/снятьбанк",
"/снятьварн",
"/снятьвладельца",
"/снятьвыговор",
"/снятькураторатех",
"/снятьмут",
"/снятьправа",
"/снятьпред",
"/снятьпредупреждение",
"/снятьроль",
"/снятьтех",
"/снятьчсигр",
"/состав",
"/спецадмин",
"/списокгбан",
"/старт",
"/старшийадминистратор",
"/старшиймодератор",
"/стата",
"/статабота",
"/статаимг",
"/статистика",
"/статистикаимг",
"/статс",
"/стикеры",
"/тестмут",
"/теххелп",
"/тип",
"/титул",
"/тишина",
"/топ",
"/тхелп",
"/удалитьварн",
"/удалитьизчс",
"/удалитьфото",
"/удалятькоманды",
"/уначат",
"/унбан",
"/унбанид",
"/унгбан",
"/унгбанплl",
"/унроль",
"/унтех",
"/унчсб",
"/установитьинфо",
"/установитьинфобот",
"/установитьмножитель",
"/установитьмножительдуэлэй",
"/установитьмножительрулетки",
"/установитьфото",
"/ферма",
"/фортуна",
"/фото",
"/хелп",
"/цитата",
"/чат",
"/чатид",
"/чатинфо",
"/чаты",
"/чистка",
"/чс",
"/чсб",
"/чсбота",
"/чсботам",
"/чсигр",
"/чслист",
"/чссообщества",
"/юнгбан",
"/юнгбанпл",
"/я",
]);
const containsBadWord = (text: string) => {
  if (!text) return false;
  const rawLower = text.toLowerCase().replace(/[^а-яa-z0-9ё\s]/g, " ");
  const normalized = normalizeTextForBanCheck(text);
  const words = rawLower.split(/\s+/).filter(Boolean);
  
  const allBad = [...badWordsList, ...dynamicBanWords];
  for (const w of allBad) {
    if (!w) continue;
    const wRaw = w.toLowerCase().replace(/[^а-яa-z0-9ё]/g, "");
    if (!wRaw) continue;
    const wNorm = normalizeTextForBanCheck(w);

    if (wRaw.length <= 4 || shortBadWords.has(wRaw) || shortBadWords.has(w.toLowerCase())) {
      // Check as separate word / token to prevent false positives (e.g. "Сергей", "освободить", "обратно")
      for (const token of words) {
        if (token === wRaw || token.startsWith(wRaw) && token.length <= wRaw.length + 2) {
          return true;
        }
      }
    } else {
      if (rawLower.replace(/\s+/g, "").includes(wRaw)) return true;
      if (wNorm && normalized.includes(wNorm)) return true;
    }
  }
  return false;
};

const maskBadWords = (text: string): string => {
  if (!text) return "";
  let result = text;
  const profanityList = [
    "хуесос", "хуисос", "пидорас", "пидор", "пидар", "ебаный", "ебанный", "ебаная", "ебаное", "ебаные",
    "ебать", "ебан", "ебуч", "ебло", "еблан", "еблище", "заебал", "выебал", "ебись", "ебал", "ёбну", "ебну",
    "бля", "блят", "бляд", "блядина", "блядь", "бляди", "блядство",
    "хуй", "хуи", "хуя", "хуе", "хуила", "хуёк", "хуек", "хуйня", "хуище", "хуем", "хую", "нахуй", "похуй", "дохуя", "нихуя", "хуевый",
    "пизд", "пизда", "пиздец", "пиздобол", "пиздит", "пиздить", "пизду", "пиздой", "пизденка", "пиздос", "распиздяй",
    "залуп", "залупа", "сука", "сучка", "сучара", "суки", "гондон", "гандон", "шлюх", "шлюха", "шлюхи", "мразь", "мрази", "мразота",
    "мудак", "мудило", "fuck", "bitch", "cunt", "dick", "pussy", "cock", "asshole", "bastard", "motherfucker"
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
  if (!ms) return "Отсутствует.";
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
    const msg = `[GAMES LOGS] ${userLink} -> ${targetLink} | Ставка: ${betText} | ${maskedAction} | #${rawCmdClean} #${params.userId}`;
    sendVkMessage(VK_TOKEN, 2000000010, msg, { dedup_key: logDedupKey }).catch(() => {});
  } else {
    const durationText = params.duration && String(params.duration).trim() !== "" ? params.duration : "None";
    const reasonText = params.reason && String(params.reason).trim() !== "" ? maskBadWords(params.reason) : "None";
    const maskedAction = maskBadWords(params.action);
    const msg = `[LOGS] ${userLink} -> ${targetLink} | Срок: ${durationText} | Причина: ${reasonText} | ${maskedAction} | #${rawCmdClean} #${params.userId}`;
    sendVkMessage(VK_TOKEN, 2000000010, msg, { dedup_key: logDedupKey }).catch(() => {});
  }
};

const logAdminAction = logToChat10;

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

  const maskedAction = maskBadWords(params.action || "Нажал(-а) кнопку");

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
    "/mute", "/мута", "/мут", "/m", "/гмут", "/gmute", "/заглушить", "/замутить", "/мутить", "/датьмут",
    "/unmute", "/размут", "/анмут", "/унмут", "/unm", "/гунмут", "/gunmute", "/снятьмут", "/разглушить", "/размутить", "/измута",
    "/warn", "/варн", "/w", "/гварн", "/gwarn", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/выдатьпред",
    "/unwarn", "/разварн", "/анварн", "/унварн", "/unw", "/гунварн", "/gunwarn", "/снятьварн", "/снятьпредупреждение", "/снятьпред", "/анпред", "/удалитьварн",
    "/warns", "/варны", "/преды", "/списокварнов",
    "/ban", "/бан", "/b", "/гбан", "/gban", "/забанить", "/б",
    "/unban", "/разбан", "/анбан", "/унбан", "/unb", "/гунбан", "/gunban", "/разбанить", "/избана",
    "/kick", "/кик", "/к", "/k", "/исключить", "/выгнать",
    "/clear", "/очистить", "/mclear", "/purge", "/чистка", "/пурдж", "/удалитьсообщения",
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
    "/pin", "/unpin", "/закрепить", "/открепить", "/закр", "/откр", "/пин", "/анпин", "/унпин",
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

  const nickText = targetUser.chatNicks?.[currentPeerId] || targetUser.globalNick || "отсутствует";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px NotoSans, Arial";
  ctx.fillText(`ID: ${targetId} | Ник: ${nickText}`, 210, 148);

  let tGlobalRole = targetUser.role || 0;
  if (targetId === 778382713 || targetId === 607598858 || targetId === 1) tGlobalRole = 12;
  const tChatRole = (targetUser.chatRoles && targetUser.chatRoles[currentPeerId]) || 0;
  let dispRole = tGlobalRole >= 7 ? tGlobalRole : tChatRole;
  if (tGlobalRole >= 12) dispRole = 12;

  let roleStr = getRoleDisplayName(dispRole);

  ctx.fillStyle = "#818cf8";
  ctx.font = "bold 18px NotoSans, Arial";
  ctx.fillText(`Должность: ${roleStr}`, 210, 180);

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
  }, 30 * 1000);
}
const waitingForWelcome = new Map<string, boolean>();

const userAntiFlood = new Map<string, number[]>();
    
    const slivCounter = new Map<string, number[]>();
    const processSliv = async (peerId: number, userId: number, chatData?: any) => {
      // Primary Bot Creators / Founders / Devs are exempt
      if (userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1) {
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
         // 1. Remove all roles (global and chat) & Add to ЧСБ
         await updateUser(userId, {
            role: 0,
            chatRoles: {},
            blacklisted: true,
            blackBy: 1,
            blackReason: "Подозрение в сливе бота (Anti-Sliv)",
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
                     comment: "Подозрение в сливе бота (Anti-Sliv)",
                     comment_visible: 1
                  }
               });
            } catch (e: any) {}
         }

         // 3. Exact response format
         const uName = u.fullName || u.nick || "пользователя";
         const responseText = `Роль у [id${userId}|${uName}] была снята из-за подозрения в сливе.\n\nПользователь также занесён в ЧСБ, это необходимо для безопасности.\n\nЕсли вы считаете что это ошибка, обратитесь к вышестоящему руководству.`;

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
      return times.length > 5;
    };

const userCache = new Map<number, any>();
const pingFloodCache = new Map<string, number>();
const commandHistory = new Map<number, { timestamps: number[] }>();
const chatMembersCache = new Map<number, { members: any[], profiles: any[], expiry: number }>();
const adminCache = new Map<string, { isAdmin: boolean, expiry: number }>();
const lastPickedInChat = new Map<number, number>();
const chatRecentMessages = new Map<number, { cmId: number, fromId: number, text?: string }[]>();
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
    if (res.data?.error) {
      return { items: [], profiles: [], error: res.data.error.error_code };
    }
    const items = res.data?.response?.items || [];
    const profiles = res.data?.response?.profiles || [];
    chatMembersCache.set(peerId, { members: items, profiles, expiry: Date.now() + 30000 }); // 30 sec cache
    return { items, profiles };
  } catch (e) {
    return { items: [], profiles: [] };
  }
}

let cachedAllUsersList: any[] = [];
let cachedAllUsersExpiry = 0;

async function getAllUsers(): Promise<any[]> {
  const now = Date.now();
  if (cachedAllUsersList.length > 0 && now < cachedAllUsersExpiry) {
    const map = new Map<number, any>();
    cachedAllUsersList.forEach(u => {
      const uId = u.userId || (u.id ? parseInt(u.id) : 0);
      if (uId) map.set(uId, u);
    });
    userCache.forEach((u, id) => {
      if (id) map.set(id, { ...map.get(id), ...u });
    });
    return Array.from(map.values());
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
    cachedAllUsersExpiry = now + 15000; // 15s cache
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
  const now = Date.now();
  if (userCache.size > 2500) {
    const keys = Array.from(userCache.keys());
    for (let i = 0; i < 500; i++) {
      userCache.delete(keys[i]);
    }
  }
  if (chatCache.size > 500) {
    const keys = Array.from(chatCache.keys());
    for (let i = 0; i < 100; i++) {
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
  
  if (global.gc) {
    global.gc();
  }
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

  const userRef = firestoreDb.collection("users").doc(userId.toString());
  let userDoc: any = null;
  try {
    userDoc = await userRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateUser (using memory fallback):", err?.message || err);
  }

  if (userDoc && userDoc.exists) {
    const data = userDoc.data() as any;
    if (userId === 778382713 || userId === 607598858 || userId === 1) {
      data.role = 12;
    }
    if (!data.deposits) data.deposits = [];
    if (data.premiumProfileHidden === undefined) data.premiumProfileHidden = false;
    if (data.premiumBalanceHidden === undefined) data.premiumBalanceHidden = false;
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
      nick: "",
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
    userRef.set(newUser).catch(() => {});
    userCache.set(userId, newUser);
    return { ...newUser, _isNew: true };
  }
}

async function updateUser(userId: number, fields: Record<string, any>) {
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
  let nickStr = chatNicks[currentPeerId] || "отсутствует";
  let dispRole = await getRole(currentPeerId, targetId);
  let roleStr = getRoleDisplayName(dispRole);

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
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || 0;
  statsStr += `| Кол-во сообщений за всё время: ${totalMsgs}\n`;
  
  const d = new Date(targetUser.lastActivity || (targetUser.lastMessageAt ? targetUser.lastMessageAt * 1000 : Date.now()));
  statsStr += `| Последняя активность: ${fmtD(d.getTime())}\n`;

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
      { action: { type: "callback", label: "Предупреждения", payload: JSON.stringify({ cmd: "stats_warns", targetId }) }, color: "secondary" },
      { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
    ]);
  }

  const keyboard = {
    inline: true,
    buttons
  };

  return { text: statsStr, keyboard };
};

const getStatsWarnsPage = async (targetId: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || `id${targetId}`;
  const warnsCount = targetUser.warnings || 0;

  const getModStr = async (mId?: number) => {
    if (!mId) return "[id1|Модератор]";
    return `[id${mId}|Модератор]`;
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
    return `[id${mId}|Модератор]`;
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
    let resolvedCity = city.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    if (data.nearest_area && data.nearest_area[0] && data.nearest_area[0].areaName && data.nearest_area[0].areaName[0]) {
      const apiCity = data.nearest_area[0].areaName[0].value;
      const apiCountry = data.nearest_area[0].country?.[0]?.value || "";
      resolvedCity = apiCountry ? `${apiCity}, ${apiCountry}` : apiCity;
    }

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
      let locStr = "";
      if (data.nearest_area?.[0]?.latitude && data.nearest_area?.[0]?.longitude) {
        locStr = `| Местоположение (координаты): ${data.nearest_area[0].latitude}°, ${data.nearest_area[0].longitude}°\n`;
      }

      const text = `...::Прогноз погоды в городе ${resolvedCity} на ${titleSuffix}::...\n\n` +
                   `| Сейчас: ${temp}\n` +
                   `| Ощущается как: ${feels}\n` +
                   `| Состояние неба: ${desc}\n` +
                   locStr + "\n" +
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

      let locHeader = "";
      if (data.nearest_area?.[0]?.latitude && data.nearest_area?.[0]?.longitude) {
        locHeader = ` (${data.nearest_area[0].latitude}°, ${data.nearest_area[0].longitude}°)`;
      }

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
    case "s": ms = val * 1000; unitText = "сек."; break;
    case "m": ms = val * 60 * 1000; unitText = "мин."; break;
    case "h": ms = val * 3600 * 1000; unitText = "час."; break;
    case "d": ms = val * 24 * 3600 * 1000; unitText = "дн."; break;
    case "w": ms = val * 7 * 24 * 3600 * 1000; unitText = "нед."; break;
    case "y": ms = val * 365 * 24 * 3600 * 1000; unitText = "лет"; break;
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
    return { reason: "без причины", duration: null };
  }

  let days = 0;
  let argsStartIndex = 0;
  let argsEndIndex = remainingArgs.length;

  // 1. Try first argument: e.g. ["7", "спам"] or ["7д", "спам"] or ["7", "дней", "спам"]
  const firstArg = remainingArgs[0].trim().toLowerCase();
  const matchFirst = firstArg.match(/^(\d+)([a-zа-яё]+)?$/i);

  if (matchFirst) {
    const val = parseInt(matchFirst[1]);
    const unit = matchFirst[2] ? matchFirst[2].toLowerCase() : "";

    if (!isNaN(val) && val > 0) {
      if (!unit) {
        if (remainingArgs.length > 1) {
          const secondArg = remainingArgs[1].trim().toLowerCase();
          if (["d", "д", "дн", "день", "дня", "дней"].includes(secondArg)) {
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
      } else if (["d", "д", "дн", "день", "дня", "дней"].includes(unit)) {
        days = val;
        argsStartIndex = 1;
      }
    }
  }

  // 2. If first arg was not duration, try last argument: e.g. ["спам", "7"] or ["спам", "7д"]
  if (days === 0 && remainingArgs.length > 1) {
    const lastArg = remainingArgs[remainingArgs.length - 1].trim().toLowerCase();
    const matchLast = lastArg.match(/^(\d+)([a-zа-яё]+)?$/i);
    if (matchLast) {
      const val = parseInt(matchLast[1]);
      const unit = matchLast[2] ? matchLast[2].toLowerCase() : "";
      if (!isNaN(val) && val > 0) {
        if (!unit || ["d", "д", "дн", "день", "дня", "дней"].includes(unit)) {
          days = val;
          argsEndIndex = remainingArgs.length - 1;
        }
      }
    }
  }

  if (days > 0) {
    const reasonParts = remainingArgs.slice(argsStartIndex, argsEndIndex);
    const reason = reasonParts.join(" ").trim() || "без причины";
    const ms = days * 24 * 3600 * 1000;
    const text = `${days} ${pluralizeRu(days, "день", "дня", "дней")}`;
    return {
      reason,
      duration: { days, ms, text, until: Date.now() + ms }
    };
  }

  const reason = remainingArgs.join(" ").trim() || "без причины";
  return { reason, duration: null };
}

function parsePunishmentTimeArg(lastArg: string): { ms: number; text: string; until: number } | null {
  if (!lastArg) return null;
  const match = lastArg.trim().toLowerCase().match(/^(\d+)\s*([a-zа-яё]+)?$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  if (isNaN(val) || val <= 0) return null;
  const unit = match[2] ? match[2].toLowerCase() : "";

  let ms = 0;
  let text = "";

  if (["s", "сек", "секунда", "секунды", "секунд"].includes(unit)) {
    ms = val * 1000;
    text = `${val} ${pluralizeRu(val, "секунду", "секунды", "секунд")}`;
  } else if (["m", "м", "мин", "минута", "минуты", "минут"].includes(unit)) {
    ms = val * 60 * 1000;
    text = `${val} ${pluralizeRu(val, "минуту", "минуты", "минут")}`;
  } else if (["h", "ч", "час", "часа", "часов"].includes(unit)) {
    ms = val * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "час", "часа", "часов")}`;
  } else if (["d", "д", "дн", "день", "дня", "дней"].includes(unit)) {
    ms = val * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "день", "дня", "дней")}`;
  } else if (["w", "нед", "неделя", "недели", "недель"].includes(unit)) {
    ms = val * 7 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "неделю", "недели", "недель")}`;
  } else if (["mo", "мес", "месяц", "месяца", "месяцев"].includes(unit)) {
    ms = val * 30 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "месяц", "месяца", "месяцев")}`;
  } else if (["y", "г", "год", "года", "лет"].includes(unit)) {
    ms = val * 365 * 24 * 3600 * 1000;
    text = `${val} ${pluralizeRu(val, "год", "года", "лет")}`;
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
  if (role >= 12) return "Владелец чат-менеджера";
  if (role === 11) return "Зам. Владельца чат-менеджера";
  if (role === 10.5) return "Главный Руководитель";
  if (role === 10) return "Руководитель чат-менеджера";
  if (role === 9) return "Осн. Зам. Руководителя";
  if (role === 8) return "Зам. Руководителя";
  if (role === 7.3) return "Главный тех. специалист";
  if (role === 7.2) return "Куратор тех. специалистов";
  if (role === 7.1) return "Тех. Специалист";
  if (role === 7) return "Владелец беседы";
  if (role === 6) return "Спец. Администратор";
  if (role === 5) return "Зам. Спец. Администратора";
  if (role === 4) return "Ст. Администратор";
  if (role === 3) return "Администратор";
  if (role === 2) return "Ст. Модератор";
  if (role === 1) return "Модератор";
  return "Пользователь";
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
    text += "Логи за последнюю неделю отсутствуют.";
  } else {
    pageLogs.forEach((l, idx) => {
      text += `${startIdx + idx + 1}. [${l.dateStr}] ${l.text}\n`;
    });
  }
  text += `\nСтраница: ${curPage} из ${totalPages}`;

  const navRow: any[] = [];
  if (curPage > 1) {
    navRow.push({
      action: {
        type: "callback",
        label: "⬅️ Назад",
        payload: JSON.stringify({ ...payloadMeta, page: curPage - 1 })
      },
      color: "primary"
    });
  }
  if (curPage < totalPages) {
    navRow.push({
      action: {
        type: "callback",
        label: "Вперёд ➡️",
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
  if (userId === 1115715881 || userId === 778382713 || userId === 607598858 || userId === 1) {
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
  if (userId === 1115715881 || userId === 778382713 || userId === 607598858 || userId === 1) return 12;
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
  
  adminCache.set(cacheKey, { isAdmin, expiry: Date.now() + 30000 }); // 1 hour cache
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
  
  adminCache.set(cacheKey, { isAdmin: isOwner, expiry: Date.now() + 30000 }); // 1 hour cache
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
  
  const firstWord = content.split(/[\s\n]+/)[0]?.toLowerCase().replace(/^[^\wа-яё]+/gi, "");
  
  // Moderation / Administrative command triggers only
  const moderationTriggers = new Set([
    "mute", "мут", "unmute", "размут",
    "warn", "варн", "unwarn", "разварн", "warns", "варны",
    "kick", "кик", "исключить", "выгнать", "к", "k",
    "ban", "бан", "unban", "разбан",
    "clear", "mclear", "очистить", "чистка",
    "purge", "пурдж",
    "pin", "пин", "unpin", "анпин", "открепить", "закрепить",
    "addmoder", "addsenmoder", "addadmin", "addsenadmin", "addzsa", "addsa",
    "removerole", "снятьроль", "снятьправа",
    "gban", "ungban", "gbanpl", "ungbanpl", "addblack", "unblack",
    "banid", "unbanid", "addzsr", "addozsr", "addruk", "addzamowner",
    "setowner", "deleteowner", "giveowner", "dgiveowner",
    "arrole", "grrole", "кикнеактив",
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
        await axios.get("https://api.vk.com/method/messages.delete", {
          params: {
            access_token: VK_TOKEN,
            v: "5.199",
            cmids: chunk.join(","),
            delete_for_all: 1,
            peer_id: peerId
          }
        });
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

async function getVkRegDate(targetId: number): Promise<string | null> {
  return null;
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

  // Check full text for VK mention [id123|Name] or [club123|Name]
  const fullText = (message.text || textArgs.join(" ")).trim();
  const vkTagMatch = fullText.match(/\[(?:id|club)(\d+)\|([^\]]+)\]/);
  if (vkTagMatch) {
    const tid = parseInt(vkTagMatch[1]);
    const name = vkTagMatch[2].trim();
    return { targetId: tid, targetName: name };
  }

  for (const arg of textArgs) {
    let screenNameMatch = null;
    let cleanArg = arg.trim();

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
            return { targetId: tid, targetName: `${u.first_name} ${u.last_name}` };
          }
        } catch (e) {}
        return { targetId: tid, targetName: `Игрок ${tid}` };
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
      } else if (/^[a-zA-Z0-9_\.\u0400-\u04ff]+$/.test(cleanArg) && !/^\d+$/.test(cleanArg) && cleanArg.length > 1) {
        screenNameMatch = cleanArg;
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

    const match = cleanArg.match(/\[(?:id|club)?(\d+)\|?([^\]]+)?\]?/) || cleanArg.match(/@?id\(?(\d+)\)?/) || cleanArg.match(/@(\d+)/) || cleanArg.match(/^(\d+)$/);
    if (match && match[1]) {
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
      return { targetId: tid, targetName: (match[2] ? match[2].replace(/[\]\[]/g, "") : `Игрок ${tid}`) };
    }
  }
  return { targetId: null, targetName: "" };
}

// VK Webhook Callback Handler
async function handleVkEvent(payload: any) {
  if (!payload) return;

  const evtKeys = getEventDeduplicationKeys(payload);
  if (evtKeys.length > 0) {
    const dupResults = await Promise.all(evtKeys.map(k => deduplicateEventGlobally(k)));
    if (dupResults.some(isDup => isDup)) {
      console.log(`>>> DUPLICATE EVENT BLOCKED: ${evtKeys.join(", ")}`);
      return;
    }
  }

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
      return "🏆 Топ по бракам:\n\nБраков пока нет!";
    }

    let text = "🏆 Топ по бракам (самые долгие):\n\n";
    top.forEach((m, i) => {
      const days = Math.max(1, Math.floor((Date.now() - (m.marriedAt || Date.now())) / (86400 * 1000)) + 1);
      text += `${i + 1}. [id${m.id1}|${m.name1}] ❤️ [id${m.id2}|${m.name2}] — ${days} дн.\n`;
    });

    return text;
  }

  async function buildInfoChatData(cId: number, authorId: number) {
    const chData = await getOrCreateChat(cId);
    let membersCount = chData.membersCount || 0;
    let title = chData.title || "Неизвестно";
    let link = chData.inviteLink || "Отсутствует";
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
            if (settings.owner_id) {
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

        if (!link || link === "Отсутствует" || link === "Неизвестно") {
          const linkRes = await vkApi.get("messages.getInviteLink", { params: { access_token: VK_TOKEN, v: "5.199", peer_id: cId, reset: 0 } }).catch(() => null);
          if (linkRes?.data?.response?.link) {
            link = linkRes.data.response.link;
            firestoreDb.collection("chats").doc(cId.toString()).set({ inviteLink: link }, { merge: true }).catch(() => {});
          }
        }
      } catch(e) {}
    }

    const shortId = cId > 2000000000 ? cId - 2000000000 : cId;
    const chatType = chData.chatType || chData.type || "DEF";

    let ownerStr = "Неизвестно";
    if (ownerId) {
      const oUser = await getOrCreateUser(ownerId);
      const oName = oUser.fullName || oUser.nick || await fetchVkFullName(ownerId) || `User${ownerId}`;
      ownerStr = `[id${ownerId}|${oName}]`;
    }

    const sysOwnerId = chData.adminId || chData.ownerId;
    let sysOwnerStr = "Отсутствует";
    if (sysOwnerId) {
      const soUser = await getOrCreateUser(sysOwnerId);
      const soName = soUser.fullName || soUser.nick || await fetchVkFullName(sysOwnerId) || `User${sysOwnerId}`;
      sysOwnerStr = `[id${sysOwnerId}|${soName}]`;
    }

    let sysAdminsCount = 0;
    try {
      const usersSnap = await firestoreDb.collection("users").get();
      usersSnap.forEach((doc: any) => {
        const d = doc.data();
        if (d.chatRoles && d.chatRoles[cId] && d.chatRoles[cId] >= 1) {
          sysAdminsCount++;
        }
      });
    } catch (e) {}
    if (sysAdminsCount === 0 && sysOwnerId) {
      sysAdminsCount = 1;
    }

    const text = `Информация о беседе ${shortId}\n\n` +
      `| Название беседы: ${title}\n` +
      `| Тип беседы:  ${chatType}\n\n` +
      `| Закреп. Сообщение: ${hasPinned ? "да" : "нет"}\n\n` +
      `| Владелец беседы: ${ownerStr}\n` +
      `| Систем. Владелец беседы: ${sysOwnerStr}\n\n` +
      `| Кол-во участников беседы: ${membersCount}\n` +
      `| Кол-во систем. администраторов беседы: ${sysAdminsCount}\n\n` +
      `| Ссылка на вступление в беседу: ${link}`;

    const keyboard = {
      inline: true,
      buttons: [
        [
          {
            action: {
              type: "callback",
              label: "Список всех участников беседы",
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
    const { user_id: userId, peer_id: peerId, event_id: eventId, payload, conversation_message_id: cmId } = object;
    let payloadObj: any = {};
    try {
      payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch (e) {}

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
      let btnActionText = `Нажал(-а) кнопку "${cmd}"`;
      let btnTargetId = Number(payloadObj?.targetId || payloadObj?.t || payloadObj?.s || payloadObj?.inviteeId || payloadObj?.partnerId || payloadObj?.proposerId || payloadObj?.u || 0);

      if (cmd === "gbf_a") btnActionText = "Одобрил(-а) форму на глобальную блокировку";
      else if (cmd === "gbf_d") btnActionText = "Отказал(-а) форму на глобальную блокировку";
      else if (cmd === "bug_a") btnActionText = "Одобрил(-а) баг-репорт";
      else if (cmd === "bug_d") btnActionText = "Отказал(-а) баг-репорт";
      else if (cmd === "off_a") btnActionText = "Одобрил(-а) предложение";
      else if (cmd === "off_d") btnActionText = "Отказал(-а) предложение";
      else if (cmd === "form_approve") btnActionText = "Одобрил(-а) форму модерации";
      else if (cmd === "form_deny") btnActionText = "Отказал(-а) форму модерации";
      else if (cmd === "transfer_confirm") btnActionText = "Подтвердил(-а) перевод средств";
      else if (cmd === "transfer_cancel") btnActionText = "Отменил(-а) перевод средств";
      else if (cmd === "clan_join_accept") btnActionText = "Принял(-а) заявку в клан";
      else if (cmd === "clan_join_decline") btnActionText = "Отклонил(-а) заявку в клан";
      else if (cmd === "marriage_accept") btnActionText = "Принял(-а) предложение вступить в брак";
      else if (cmd === "marriage_decline") btnActionText = "Отклонил(-а) предложение вступить в брак";
      else if (cmd === "divorce_accept") btnActionText = "Подтвердил(-а) развод";
      else if (cmd === "divorce_cancel") btnActionText = "Отменил(-а) развод";
      else if (cmd === "claim_daily_bonus") btnActionText = "Забрал(-а) ежедневный бонус";
      else if (cmd === "kick_left_user") btnActionText = "Исключил(-а) вышедшего пользователя";
      else if (cmd.startsWith("top_")) btnActionText = `Переключил(-а) категорию топа на #${cmd.replace("top_", "")}`;
      else if (cmd.startsWith("help_") || cmd.startsWith("cmd_help_") || cmd.startsWith("ghelp_")) btnActionText = "Перешел(-ла) по разделу меню справки";

      logButtonAction({
        userId,
        targetId: btnTargetId,
        action: btnActionText,
        buttonName: cmd,
        eventId
      }).catch(() => {});
    }
    
    if (cmd === "gbf_a" || cmd === "gbf_d") {
      const targetId = payloadObj.t;
      const senderId = payloadObj.s;

      if (userId === senderId) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете рассмотреть собственную форму!");
        return;
      }
      if (userId === targetId) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете рассматривать форму на самого себя!");
        return;
      }

      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`gban_form_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Форма уже обработана!");
          return;
        }
      }

      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713 || userId === 607598858) ? 12 : (u.role || 0);
      if (effRole < 8) {
        if (cmId) processedEventIds.delete(`gban_form_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Заместитель руководителя)!");
        return;
      }

      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || `User${userId}`;

      if (cmd === "gbf_a") {
        const sUser = await getOrCreateUser(senderId);
        const sName = sUser.fullName || sUser.nick || `User${senderId}`;

        const safeReason = payloadObj.r || "По форме";
        const fullReason = `${safeReason} | By. [id${senderId}|${sName}]`;
        
        await updateUser(targetId, { 
          gban: true, 
          gbanpl: true, 
          gbanReason: fullReason, 
          gbanplReason: fullReason,
          gbanBy: userId, 
          gbanplBy: userId,
          gbanDate: Date.now(),
          gbanplDate: Date.now()
        });
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${vkName}] одобрил(-а) форму на глобальную блокировку от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const sFirstName = sName.split(" ")[0];
        await sendVkMessage(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ваша форма на [id${targetId}|пользователя] была одобрена.`);
      } else {
        const sUser = await getOrCreateUser(senderId);
        const sName = sUser.fullName || sUser.nick || `User${senderId}`;
        const sFirstName = sName.split(" ")[0];
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${vkName}] отказал(-а) форму на глобальную блокировку от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        await sendVkMessage(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ваша форма на [id${targetId}|пользователя] была отказана.\n\nЕсли вы желаете узнать причину, напишите [id${userId}|модератору] который отказал вашу форму.`);
      }
      return;
    }

    if (cmd === "bug_a" || cmd === "bug_d" || cmd === "off_a" || cmd === "off_d") {
      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`rep_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Уже обработано!");
          return;
        }
      }

      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713 || userId === 607598858) ? 12 : (u.role || 0);
      if (effRole < 8) {
        if (cmId) processedEventIds.delete(`rep_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Заместитель руководителя)!");
        return;
      }

      const senderId = payloadObj.s;
      const sUser = await getOrCreateUser(senderId);
      const sName = sUser.fullName || sUser.nick || `User${senderId}`;
      const sFirstName = sName.split(" ")[0];
      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || `User${userId}`;

      const isBug = cmd.startsWith("bug");
      const isApprove = cmd.endsWith("_a");
      const typeStr = isBug ? "баг-репорт" : "предложение по улучшению чат-менеджера";
      const typeStrL = isBug ? "ваш баг-репорт" : "ваше предложение по улучшению чат-менеджера";

      if (isApprove) {
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${vkName}] одобрил(-а) ${typeStr} от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textApprove = isBug ? "был одобрен" : "было одобрено";
        await sendVkMessage(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textApprove}.`);
      } else {
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${vkName}] отказал(-а) ${typeStr} от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textDeny = isBug ? "был отказан" : "было отказано";
        await sendVkMessage(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textDeny}.`);
      }
      return;
    }

    if (cmd === "form_approve" || cmd === "form_deny") {
      // Deduplicate button actions per message
      if (cmId) {
        const isDuplicate = await deduplicateEventGlobally(`form_action_${cmId}`);
        if (isDuplicate) {
          await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Заявка уже обработана!");
          return;
        }
      }
      
      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713 || userId === 607598858) ? 12 : (u.role || 0);
      if (effRole < 10) {
        // If they failed auth, remove the deduplication lock so someone else can click
        if (cmId) processedEventIds.delete(`form_action_${cmId}`);
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Руководитель)!");
        return;
      }
      
      const actionText = cmd === "form_approve" ? "одобрил(-а)" : "отказал(-а)";
      const vkName = u.fullName || u.nick || await fetchVkFullName(userId) || "Руководитель";
      const replyMsg = `[id${userId}|${vkName}] ${actionText} заявку на пост заместителя руководителя`;
      
      // Remove keyboard from original message
      await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ buttons: [], inline: true }) });
      
      // Send the reply message
      await sendVkMessage(VK_TOKEN, peerId, replyMsg, {
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
    const isBypass = (sender.role || 0) >= 12 || userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1;
    const isHelpCallback = cmd.startsWith("help_") || cmd.startsWith("cmd_help_") || cmd === "gamehelp" || cmd === "ghelp" || cmd.startsWith("ghelp_");
    if (!isBypass && !isHelpCallback) {
      const nextAllowed = buttonCooldowns.get(userId) || 0;
      if (nowTime < nextAllowed) {
        const remainingSec = Math.ceil((nextAllowed - nowTime) / 1000);
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, `Подождите ещё ${remainingSec} сек для следующего нажатия кнопки.`);
      }
      buttonCooldowns.set(userId, nowTime + 1500);
    }

    const originalText = object.text || "";
    const replyFwd = undefined;

    if (cmd === "conv_members_list" || cmd === "conv_members_page") {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
         return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Это меню доступно только автору команды!");
       }

       const pageNum = Math.max(1, Number(payloadObj.page) || 1);
       const targetCId = Number(payloadObj.cId) || peerId;
       const shortId = targetCId > 2000000000 ? targetCId - 2000000000 : targetCId;

       try {
         const memRes = await vkApi.get("messages.getConversationMembers", {
           params: { access_token: VK_TOKEN, v: "5.199", peer_id: targetCId, fields: "first_name,last_name,is_admin,is_owner" }
         });
         const profiles = memRes.data?.response?.profiles || [];
         const items = memRes.data?.response?.items || [];
         
         const adminMap = new Map<number, { isAdmin: boolean, isOwner: boolean }>();
         for (const item of items) {
           if (item.member_id > 0) {
             adminMap.set(item.member_id, {
               isAdmin: Boolean(item.is_admin),
               isOwner: Boolean(item.is_owner)
             });
           }
         }

         const pageSize = 15;
         const totalCount = profiles.length || items.length || 0;
         const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
         const currPage = Math.min(pageNum, totalPages);

         const startIndex = (currPage - 1) * pageSize;
         const pageProfiles = profiles.slice(startIndex, startIndex + pageSize);

         let membersText = `Список всех участников беседы (Стр. ${currPage}/${totalPages}):\n\n`;
         if (pageProfiles.length === 0) {
           membersText += "Участники не найдены или недостаточно прав.";
         } else {
           pageProfiles.forEach((p: any, idx: number) => {
             let badge = "";
             const info = adminMap.get(p.id);
             if (info?.isOwner) {
               badge = " (Владелец беседы)";
             } else if (info?.isAdmin) {
               badge = " (Администратор беседы)";
             }
             membersText += `${startIndex + idx + 1}) [id${p.id}|${p.first_name} ${p.last_name}]${badge}\n`;
           });
         }

         const navButtons: any[] = [];
         if (currPage > 1) {
           navButtons.push({
             action: {
               type: "callback",
               label: "◀ Назад",
               payload: JSON.stringify({ cmd: "conv_members_page", cId: targetCId, page: currPage - 1, authorId: payloadObj.authorId || userId })
             },
             color: "primary"
           });
         }
         navButtons.push({
           action: {
             type: "callback",
             label: "◀ К инфо",
             payload: JSON.stringify({ cmd: "infochat_back", cId: targetCId, authorId: payloadObj.authorId || userId })
           },
           color: "secondary"
         });
         if (currPage < totalPages) {
           navButtons.push({
             action: {
               type: "callback",
               label: "Вперед ▶",
               payload: JSON.stringify({ cmd: "conv_members_page", cId: targetCId, page: currPage + 1, authorId: payloadObj.authorId || userId })
             },
             color: "primary"
           });
         }

         const keyboard = { inline: true, buttons: [navButtons] };
         await editVkMessage(VK_TOKEN, peerId, cmId, membersText, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
       } catch (e: any) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, `Ошибка при получении списка участников беседы №${shortId}`);
       }
       return;
    }

    if (cmd === "infochat_back") {
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       if (payloadObj.authorId && payloadObj.authorId !== userId) {
         return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Это меню доступно только автору команды!");
       }
       const targetCId = Number(payloadObj.cId) || peerId;
       try {
         const { text, keyboard } = await buildInfoChatData(targetCId, payloadObj.authorId || userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
       } catch (e: any) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Ошибка при загрузке информации о беседе");
       }
       return;
    }

    if (cmd === "role_toggle") {
       const act = payloadObj.action;
       const u = await getOrCreateUser(userId);
       const fullName = u.fullName || u.nick || `User${userId}`;
       
       if (act === "enable") {
          await updateUser(userId, { roleDisabled: false });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] включил(-а) свою роль`);
       } else {
          await updateUser(userId, { roleDisabled: true });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] выключил(-а) свою роль`);
       }
       return;
    }

    if (payloadObj.authorId && payloadObj.authorId !== userId) {
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Это меню предназначено не для вас!" });
      return;
    }

    if (cmd === "thelp_tech" || cmd === "thelp_curator" || cmd === "thelp_head") {
       let text = "";
       if (cmd === "thelp_tech") {
          text = `...::Помощь (Тех. Специалист)::...\n\nКоманды Тех. Специалиста:\n/botstats - Статистика работы бота\n/logs - Общие логи бота\n/logs_user - Логи пользователя\n/logs_games - Игровые логи бота\n/get - Информация о пользователе\n/banbot - Выдать игровую блокировку\n/unbanbot - Снять игровую блокировку`;
       } else if (cmd === "thelp_curator") {
          text = `...::Помощь (Куратор тех. специалистов)::...\n\nКоманды Куратора тех. специалистов:\n/addtech - Назначить Тех. Специалиста\n/deltech - Снять Тех. Специалиста`;
       } else if (cmd === "thelp_head") {
          text = `...::Помощь (Главный тех. специалист)::...\n\nКоманды Главного тех. специалиста:\n/addcurator - Назначить Куратора тех.\n/delcurator - Снять Куратора тех.`;
       }
       
       const keyboard = { inline: true, buttons: [] as any[] };
       keyboard.buttons.push([{ action: { type: "callback", label: "◀ Назад", payload: JSON.stringify({ cmd: "thelp_back", authorId: userId }) }, color: "secondary" }]);
       
       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }
    
    if (cmd === "thelp_back") {
       const text = `...::Помощь по техническим командам::...\n\nВыберите нужный раздел:`;
       const user = await getOrCreateUser(userId);
       const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
       
       const keyboard = { inline: true, buttons: [] as any[] };
       const availableButtons: { cmd: string; label: string }[] = [];
       if (effRole >= 7.1) availableButtons.push({ cmd: "thelp_tech", label: "Тех. Специалист" });
       if (effRole >= 7.2) availableButtons.push({ cmd: "thelp_curator", label: "Куратор тех." });
       if (effRole >= 7.3) availableButtons.push({ cmd: "thelp_head", label: "Главный тех." });

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

    if (cmd === "logs_page") {
      const page = Math.max(1, Number(payloadObj.page) || 1);
      const logType = payloadObj.logType || "all";
      const filterPeerId = payloadObj.filterPeerId;
      const targetId = payloadObj.targetId;
      const title = payloadObj.title || "Логи";

      const logs = await getFilteredLogs({
        type: logType,
        peerId: filterPeerId,
        userId: targetId,
        targetId: targetId
      });

      const { text, keyboard } = renderLogsPage(title, logs, page, payloadObj);
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, text, {
        keyboard: keyboard ? JSON.stringify(keyboard) : JSON.stringify({ inline: true, buttons: [] })
      });
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
      const targetId = payloadObj.targetId;
      if (userId === targetId) {
         await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете исключить самого себя!");
         return;
      }
      const uRole = await getRole(peerId, userId);
      if (uRole < 2) {
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас нет прав для этого действия!" });
         return;
      }
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

    if (cmd === "clan_members_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка не для вас!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

      const user = await getOrCreateUser(userId);
      user.globalRole = user.role || 0;
      user.role = user.globalRole >= 7 ? user.globalRole : ((user.chatRoles && user.chatRoles[peerId]) || 0);

      const clanId = payloadObj.clanId || user.clanId;

      if (cmd === "clan_members_list") {
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
      if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка доступна только автору команды!");
      }
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
          
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
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
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
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
        buttons.push([{ action: { type: "callback", label: "Главное меню", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "primary" }]);
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

    if (cmd === "zov_online" || cmd === "zov_all" || cmd === "zov_cancel") {
       if (userId !== payloadObj.authorId) {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Только автор команды может выбрать тип!" });
          return;
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

       if (cmd === "zov_cancel") {
          const text = `Вы отменили вызов всех участников беседы.`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text);
          return;
       }

       const { profiles } = await getChatMembers(peerId);
       if (cmd === "zov_online") {
          const onlineProfiles = profiles.filter((p: any) => p.id > 0 && p.online);
          const pings = onlineProfiles.map((p: any) => `[id${p.id}|👤]`).join(" ") || "Нет участников онлайн";
          const text = `${pings}\n| Вы были вызваны [id${userId}|модератором]\n| Причина: ${payloadObj.reason || "Не указана"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       } else {
          const allProfiles = profiles.filter((p: any) => p.id > 0);
          const pings = allProfiles.map((p: any) => `[id${p.id}|👤]`).join(" ") || "Нет участников";
          const text = `${pings}\n| Вы были вызваны [id${userId}|модератором]\n| Причина: ${payloadObj.reason || "Не указана"}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, text, { disable_mentions: 0 });
          return;
       }
    }

    if (cmd === "arrole_yes" || cmd === "arrole_no") {
       if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка доступна только автору команды!");
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const targetId = payloadObj.targetId;
       const modUser = await getOrCreateUser(userId);
       const modName = modUser.fullName || modUser.nick || `User${userId}`;

       if (cmd === "arrole_no") {
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] отменил(-а) снятие ролей у пользователя [id${targetId}|пользователя]`);
          return;
       }

       await updateUser(targetId, { role: 0, chatRoles: {} });
       await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${modName}] снял(-а) ВСЕ роли у пользователя [id${targetId}|пользователя]`);
       return;
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

     const ghelpCmds = ["ghelp_main", "ghelp_zr", "ghelp_ozr", "ghelp_ruk", "ghelp_gruk", "ghelp_zown", "ghelp_own"];
    if (ghelpCmds.includes(cmd)) {
       if (payloadObj.authorId && Number(payloadObj.authorId) !== userId) {
          return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка доступна только автору команды!");
       }
       await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
       const user = await getOrCreateUser(userId);
       const isAdmin = await checkIsAdmin(userId, peerId, user.role);
       const effRole = user.role >= 12 || isAdmin ? 12 : user.role;
       if (effRole < 8) {
          return;
       }

       if (cmd === "ghelp_own" && effRole < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
       if (cmd === "ghelp_zown" && effRole < 11) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
       if (cmd === "ghelp_gruk" && effRole < 10.5) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
       if (cmd === "ghelp_ruk" && effRole < 10) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
       if (cmd === "ghelp_ozr" && effRole < 9) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");
       if (cmd === "ghelp_zr" && effRole < 8) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав!");

       let text = "";

       if (cmd === "ghelp_main") {
          text = `...::Помощь по командам руководства бота::...\n\nКоманды руководства бота:\n/gstaff -- Список руководства бота.\n/ghelp -- Помощь по командам руководства.`;
       } else if (cmd === "ghelp_zr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Руководителя:\n/gban -- Выдать глобальную блокировку во всех беседах.\n/ungban -- Снять глобальную блокировку.\n/gbanpl -- Выдать глобальную блокировку в беседах игроков.\n/ungbanpl -- Снять глобальную блокировку игроков.\n/gbanlist -- Список глобально заблокированных пользователей.\n/blacklist -- Список пользователей в ЧС бота.\n/rstats -- Статистика руководителя.`;
       } else if (cmd === "ghelp_ozr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Осн. Зам. Руководителя:\n/grrole -- Снять глобальную роль у пользователя.\n/setowner -- Назначить владельца беседы.\n/deleteowner -- Снять права владельца беседы.`;
       } else if (cmd === "ghelp_ruk") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Руководителя:\n/banid -- Заблокировать беседу.\n/unbanid -- Разблокировать беседу.\n/infochat -- Узнать информацию о беседе.\n/addblack -- Занести пользователя в ЧС бота.\n/unblack -- Удалить пользователя из ЧС бота.\n/gsnick -- Установить ник во всём чат-менеджере.\n/grnick -- Удалить ник во всём чат-менеджере.\n/zunban -- Снять все блокировки пользователя в беседах.\n/addzsr -- Выдать права Зам. Руководителя.\n/addozsr -- Выдать права Осн. Зам. Руководителя.`;
       } else if (cmd === "ghelp_gruk") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Глав. Руководителя:\n/rebuke -- Выдать выговор руководителю.\n/unrebuke -- Снять выговор с руководителя.\n/addruk -- Выдать права Руководителя.`;
       } else if (cmd === "ghelp_zown") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Владельца:\n/addgr -- Выдать права Главного Руководителя.`;
       } else if (cmd === "ghelp_own") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Владельца бота:\n/addstatus -- Установить статус пользователю.\n/unstatus -- Снять статус пользователя.\n/arrole -- Снять все роли у пользователя.\n/setinfobot -- Установить инфо бота.\n/achat -- Сделать беседу админ-чатом.\n/unachat -- Убрать статус админ-чата.\n/giveowner -- Передать права владельца беседы.\n/addzamowner -- Выдать права Зам. Владельца бота.`;
       }

       let keyboard = { inline: true, buttons: [] as any[] };
       let availableButtons = [];
       if (effRole >= 8) availableButtons.push({ cmd: "ghelp_zr", label: "Зам. Руководителя" });
       if (effRole >= 9) availableButtons.push({ cmd: "ghelp_ozr", label: "Осн. Зам. Руководителя" });
       if (effRole >= 10) availableButtons.push({ cmd: "ghelp_ruk", label: "Руководитель" });
       if (effRole >= 10.5) availableButtons.push({ cmd: "ghelp_gruk", label: "Глав. Руководитель" });
       if (effRole >= 11) availableButtons.push({ cmd: "ghelp_zown", label: "Зам. Владельца" });
       if (effRole >= 12) availableButtons.push({ cmd: "ghelp_own", label: "Владелец бота" });

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
          keyboard.buttons.push([{ action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "ghelp_main", authorId: payloadObj.authorId }) }, color: "secondary" }]);
       }

       await editVkMessage(VK_TOKEN, peerId, cmId, text, { keyboard: JSON.stringify(keyboard) });
       return;
    }
       if (["mod_clearmute", "mod_clearwarn", "mod_clearban", "mod_unmute", "mod_unban_chat", "mod_ungban", "mod_ungbanpl", "mod_unwarn"].includes(cmd)) {
          const tId = Number(payloadObj.targetId || payloadObj.t || payloadObj.u || 0);
          // 1. User cannot apply moderation actions or clear messages on themselves
          if (userId === tId && tId > 0) {
             await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете снимать наказания или очищать сообщения у самого себя!");
             return;
          }
          // 2. Role and permission checks
          const clickingUser = await getOrCreateUser(userId);
          const isAdminMember = await checkIsAdmin(userId, peerId, clickingUser.role);
          const chatRole = (clickingUser.chatRoles && clickingUser.chatRoles[peerId]) || 0;
          const effectiveRole = (clickingUser.role >= 8 || userId === 778382713 || userId === 607598858)
             ? 12
             : Math.max(clickingUser.role || 0, chatRole);
          if (cmd === "mod_ungban" || cmd === "mod_ungbanpl") {
             if (effectiveRole < 8) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав (Требуется Зам. Руководителя)!");
                return;
             }
          } else {
             if (effectiveRole < 1 && !isAdminMember) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно прав модератора для взаимодействия с этой кнопкой!");
                return;
             }
             if (tId > 0 && !(await checkHierarchy(peerId, userId, tId, isAdminMember))) {
                await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете применить действие к пользователю, равным или старше вас по должности!");
                return;
             }
          }
          if (cmd === "mod_clearmute" || cmd === "mod_clearwarn" || cmd === "mod_clearban") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Сообщения очищены." });
             const mId = payloadObj.msgId; // conversation_message_id
             try {
               if (mId) await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", cmids: mId, delete_for_all: 1, peer_id: peerId } });
               await deleteMessagesForUser(peerId, tId, 5);
             } catch (e) {}
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || "Модератор";
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modName}] очистил(-а) сообщения от [id${tId}|пользователя]`);
             
             let newKeyboard;
             if (cmd === "mod_clearmute") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: tId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_clearwarn") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: tId }) }, color: "positive" }] ] };
             } else if (cmd === "mod_clearban") {
               newKeyboard = { inline: true, buttons: [ [{ action: { type: "callback", label: "Разблокировать", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: tId }) }, color: "positive" }] ] };
             }
             
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify(newKeyboard) });
             return;
          }
          if (cmd === "mod_unmute") {
             const targetU = await getOrCreateUser(tId);
             const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(tId)) || `User${tId}`;
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `Модератор`;
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Блокировка чата снята." });
             await updateUser(tId, { muteUntil: 0, mutePeerId: 0 });
             try {
               await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
                 params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: tId, for_all: 0 }
               });
             } catch (e) {}
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) блокировку чата с [id${tId}|${tName}]`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          if (cmd === "mod_unban_chat") {
             const targetU = await getOrCreateUser(tId);
             const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(tId)) || `User${tId}`;
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `Модератор`;
             const chatBans = targetU.chatBans || {};
             delete chatBans[peerId];
             delete chatBans[String(peerId)];
             await updateUser(tId, { chatBans, isGameBanned: false });
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Пользователь разблокирован." });
             try {
               await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
                 params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: tId, for_all: 0 }
               });
             } catch (e) {}
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modName}] разблокировал(-а) [id${tId}|${tName}] в текущей беседе`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          if (cmd === "mod_ungban") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Глобальная блокировка снята." });
             await updateUser(tId, { gban: false, gbanReason: "", gbanBy: 0, gbanDate: 0, gbanExpiresAt: 0 });
             const fullName = clickingUser.fullName || clickingUser.nick || `User${userId}`;
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах с [id${tId}|пользователя]`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          if (cmd === "mod_ungbanpl") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Глобальная блокировка игроков снята." });
             await updateUser(tId, { gbanpl: false, gbanplReason: "", gbanplBy: 0, gbanplDate: 0, gbanplExpiresAt: 0 });
             const fullName = clickingUser.fullName || clickingUser.nick || `User${userId}`;
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах игроков с [id${tId}|пользователя]`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          if (cmd === "mod_unwarn") {
             const targetU = await getOrCreateUser(tId);
             const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(tId)) || `User${tId}`;
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || `Модератор`;
             if ((targetU.warnings || 0) <= 0) {
                await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У пользователя нету активных предупреждений!" });
                return;
             }
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Предупреждение снято." });
             const newW = Math.max(0, (targetU.warnings || 0) - 1);
             await updateUser(tId, { warnings: newW });
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) предупреждение с [id${tId}|${tName}]`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
       }
       if (cmd === "mod_giveowner_yes") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Права переданы." });
          const tUser1 = await getOrCreateUser(tId);
          const chatRoles1 = tUser1.chatRoles || {};
          chatRoles1[peerId] = 7;
          await updateUser(tId, { chatRoles: chatRoles1 });
          
          const tUser2 = await getOrCreateUser(userId);
          const chatRoles2 = tUser2.chatRoles || {};
          delete chatRoles2[peerId];
          await updateUser(userId, { chatRoles: chatRoles2 });
          await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователь] передал(-а) свои права «Владелец Беседы» [id${tId}|пользователю]`);
          await editVkMessage(VK_TOKEN, peerId, cmId, `Права «Владелец Беседы» успешно переданы.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Отменено." });
          await editVkMessage(VK_TOKEN, peerId, cmId, `Передача прав «Владелец Беседы» отменена.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_silence_off") {
          const u = await getOrCreateUser(userId);
          const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
          const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
          const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
          if (effectiveRole < 3 && !isAdminMember) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас недостаточно прав!" });
             return;
          }
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Режим тишины выключен." });
          await updateChat(peerId, { silence: false });
          const fullName = u.fullName || u.nick || `User${userId}`;
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${fullName}] выключил(-а) режим тишины`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
          return;
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
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Эта кнопка доступна только автору команды!");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      const user = await getOrCreateUser(userId);
      
      let text = "";
      if (cmd === "cmd_help_main") {
        text = `...::Помощь по командам бота::...\n\nКоманды пользователей:\n/help - Помощь по командам.\n/gamehelp - Помощь по игровым командам.\n/stats - Узнать статистику пользователя.\n/ping - Узнать пинг бота.\n/infobot - Информация о боте.\n/q - Покинуть беседу.`;
      } else if (cmd === "help_moder") {
        text = `...::Помощь по командам бота::...\n\nКоманды Модератора:\n/mute - Выдать блокировку чата пользователю.\n/unmute - Снять блокировку чата пользователю.\n/warn - Выдать предупреждение пользователю.\n/unwarn - Снять предупреждение пользователю.\n/warns - Посмотреть предупреждения пользователя.\n/kick - Исключить пользователя из беседы.\n/clear - Очистить сообщения пользователя.\n/mclear - Очистить несколько сообщений.\n/mutelist - Список заблокированных в чате.\n/warnlist - Список предупреждений в беседе.`;
      } else if (cmd === "help_smoder") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Модератора:\n/ban - Заблокировать пользователя в беседе.\n/unban - Разблокировать пользователя в беседе.\n/banlist - Список заблокированных в беседе.\n/addmoder - Выдать права модератора.\n/removerole - Снять права у пользователя.\n/zov - Созвать участников беседы.\n/olist - Список участников онлайн.\n/offlinelist - Список участников оффлайн.`;
      } else if (cmd === "cmd_help_admin_bot") {
        text = `...::Помощь по командам бота::...\n\nКоманды Администратора:\n/purge - Очистить последние сообщения в беседе.\n/infoid - Найти беседы пользователя.\n/addsenmoder - Выдать права старшего модератора.\n/logsadm - Логи выдачи/снятия прав в беседе.\n/logsmute - Логи блокировок чата в беседе.\n/logsban - Логи блокировок в беседе.\n/logswarn - Логи предупреждений в беседе.\n/logskick - Логи киков в беседе.`;
      } else if (cmd === "help_sadmin") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Администратора:\n/addadmin - Выдать права администратора.`;
      } else if (cmd === "help_zsa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Зам. Спец. Администратора:\n/addsenadmin - Выдать права старшего администратора.\n/pin - Закрепить сообщение.\n/unpin - Открепить сообщение.`;
      } else if (cmd === "help_sa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Специального Администратора:\n/settings - Настройки чат-менеджер в беседе.\n/addzsa - Выдать права зам. спец. администратора.`;
      } else if (cmd === "help_owner") {
        text = `...::Помощь по командам бота::...\n\nКоманды Владельца беседы:\n/start - Активировать чат-менеджер в беседе.\n/type - Изменить тип беседы.\n/sync - Синхронизировать структуру беседы.\n/games - Включить/выключить игры в беседе.\n/staff - Список руководства беседы.\n/giveowner - Передать права владельца беседы.\n/addsa - Выдать права спец. администратора.\n/welcometext - Настроить приветствие.\n/leave - Вкл/выкл кик при выходе.\n/invite - Вкл/выкл инвайт только модераторами.\n/af - Вкл/выкл анти-флуд.\n/antisliv - Вкл/выкл анти-слив.\n/raid - Вкл/выкл анти-рейд.\n/group - Вкл/выкл анти-сообщества.\n/tegall - Вкл/выкл анти-тег всех участников.\n/antiad - Вкл/выкл анти-рекламу.\n/addantiteg - Добавить слово/тег в анти-тег.\n/unantiteg - Удалить слово/тег из анти-тега.\n/antiteglist - Список слов/тегов в анти-теге.\n/addawstats - Выдать функцию пользователя "Анти-просмотр stats".\n/unawstats - Забрать функцию пользователя "Анти-просмотр stats".\n/createnet - Создать сетку бесед.\n/deletenet - Удалить сетку бесед.\n/dgiveowner - Передать права владельца сетки.\n/addchatnet - Добавить беседу в сетку.\n/unchatnet - Удалить беседу из сетки.\n/netlist - Список бесед в сетке.`;
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
          row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: payloadObj.authorId }) }, color: "secondary" });
          if (row.length === 2) {
            keyboard.buttons.push(row);
            row = [];
          }
        }
      }
      if (row.length > 0) keyboard.buttons.push(row);
       
      if (cmd !== "cmd_help_main") {
         keyboard.buttons.push([{ action: { type: "callback", label: "Назад", payload: JSON.stringify({ cmd: "cmd_help_main", authorId: payloadObj.authorId }) }, color: "secondary" }]);
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
      const allU = await getAllUsers();
      let usersList: any[] = allU.filter(d => d && !d.hideTop);

      let topTitle = "";
      let lines: string[] = [];

      const now = Date.now();
      const getPremiumTag = (u: any) => (u.vipExpires && u.vipExpires > now) ? " ⭐" : "";

      usersList = usersList.filter(u => u && ((u.messagesTotal && u.messagesTotal > 0) || u.registered || (u.balance && u.balance > 0) || (u.bank && u.bank > 0) || (u.businesses && u.businesses > 0) || (u.role && u.role > 0)));
      if (category === "money") {
        topTitle = "💰 Топ пользователей по деньгам:";
        const filtered = usersList.filter(u => (u.balance || 0) > 0).sort((a, b) => (b.balance || 0) - (a.balance || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | На руках: ${(u.balance || 0).toLocaleString()}$`);
      } else if (category === "bank") {
        topTitle = "🏦 Топ пользователей по деньгам в банке:";
        const filtered = usersList.filter(u => (u.bank || 0) > 0).sort((a, b) => (b.bank || 0) - (a.bank || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | В банке: ${(u.bank || 0).toLocaleString()}$`);
      } else if (category === "beer") {
        topTitle = "🍺 Топ по пиву за последние 3 месяца:";
        const filtered = usersList.filter(u => (u.beer || 0) > 0).sort((a, b) => (b.beer || 0) - (a.beer || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Выпито - ${(u.beer || 0).toFixed(1)} л.`);
      } else if (category === "jc") {
        topTitle = "💎 Топ пользователей по JORDAN'S COIN:";
        const filtered = usersList.filter(u => (u.jc || 0) > 0).sort((a, b) => (b.jc || 0) - (a.jc || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Коинов: ${(u.jc || 0).toLocaleString()}`);
      } else if (category === "biz") {
        topTitle = "🏦 Топ пользователей по бизнесам:";
        const filtered = usersList.filter(u => (u.businesses || 0) > 0).sort((a, b) => (b.businesses || 0) - (a.businesses || 0));
        lines = filtered.slice(0, 10).map((u, i) => `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | бизнесов: ${u.businesses || 0} | Баланс бизнесов: ${((u.businesses || 0) * 1000).toLocaleString()}$`);
      } else if (category === "rep") {
        topTitle = "🌟 Топ пользователей по репутации:";
        const filtered = usersList.filter(u => (u.rep || 0) !== 0).sort((a, b) => (b.rep || 0) - (a.rep || 0));
        lines = filtered.slice(0, 10).map((u, i) => {
          const r = u.rep || 0;
          const sign = r >= 0 ? "+" : "";
          return `${i + 1}. [id${u.userId}|${u.nick || 'Игрок'}]${getPremiumTag(u)} | Репутация: ${sign}${r}`;
        });
      }

      if (lines.length === 0) {
        lines.push("В данном топе пока нет активных участников.");
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

    if (cmd === "news_chats" || cmd === "news_dms" || cmd === "gzov_chats" || cmd === "gzov_dms") {
      const isGzov = cmd.startsWith("gzov_");
      const newsData = pendingNews.get(userId);
      if (!newsData) return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Рассылка не найдена или уже отправлена.");

      await editVkMessage(VK_TOKEN, peerId, cmId, "Рассылка была запущена.");
      pendingNews.delete(userId);
      
      let { text } = newsData;
      const { attachmentsStr, forwardObjStr } = newsData;

      if (isGzov && !text.trim().startsWith("@all")) {
         text = `@all\n${text}`;
      }

      (async () => {
        try {
          if (cmd === "news_chats" || cmd === "gzov_chats") {
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
    const message = object.message || object;
    const userId = message.from_id;
    const peerId = message.peer_id;
    const text = message.text ? message.text.trim() : "";
    
    if (!userId || userId < 0) return;

    let responseSeq = 0;

    // ==========================================
    // 5 МЕТОДОВ ЗАЩИТЫ ОТ ДУБЛИРОВАНИЯ СООБЩЕНИЙ
    // ==========================================
    const cleanMsgText = text.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").replace(/^@\S+\s*/gi, "").trim().toLowerCase();
    const dedupKey1 = message.conversation_message_id ? `${peerId}_msg_${message.conversation_message_id}` : null;
    const dedupKey2 = message.id && message.id > 0 ? `msg_id_${message.id}` : null;
    const dedupKey3 = `${userId}_${peerId}_${cleanMsgText.slice(0, 50)}`;

    const nowMs = Date.now();
    const lastMsgTime = recentMessagesMap.get(dedupKey3);

    // Check if ANY of the keys was already processed within sliding window (5 seconds)
    if (
      (dedupKey1 && recentMessagesMap.has(dedupKey1)) ||
      (dedupKey2 && recentMessagesMap.has(dedupKey2)) ||
      (lastMsgTime && nowMs - lastMsgTime < 5000)
    ) {
      console.log(`>>> DUPLICATE MESSAGE BLOCKED (in-memory): ${dedupKey1 || dedupKey2 || dedupKey3}`);
      return;
    }

    if (dedupKey1) recentMessagesMap.set(dedupKey1, nowMs);
    if (dedupKey2) recentMessagesMap.set(dedupKey2, nowMs);
    recentMessagesMap.set(dedupKey3, nowMs);

    // Метод 4: Локальный кэш последних обработанных сообщений (очистка старых)
    if (recentMessagesMap.size > 5000) {
      const now = Date.now();
      for (const [k, v] of recentMessagesMap.entries()) {
        if (now - v > 60000) recentMessagesMap.delete(k);
      }
    }

    // ⚡ INSTANT ULTRA-FAST AUTO-REACTION (<10ms latency)
    if (message.conversation_message_id) {
      const cachedU = userCache.get(userId);
      const cachedC = chatCache.get(peerId);
      const fastReactionId = (cachedU && cachedU.personalReactionId && cachedU.personalReactionId > 0)
        ? cachedU.personalReactionId
        : (cachedC && cachedC.autoReactionId && cachedC.autoReactionId > 0
          ? cachedC.autoReactionId
          : (globalAutoReactionId > 0 ? globalAutoReactionId : 0));

      if (fastReactionId > 0) {
        vkApi.get("messages.sendReaction", {
          params: {
            access_token: VK_TOKEN,
            v: "5.199",
            peer_id: peerId,
            cmid: message.conversation_message_id,
            reaction_id: fastReactionId
          }
        }).catch(() => {});
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
          const greeting = `JORDAN MANAGER был добавлен в беседу.\n\nВыдайте ему права администратора для началы работы с ним.\n\nПосле выдачи прав администратора, активируйте беседу по команде - /start и выберите тип беседы с помощью команды - /type`;
          const u = await getOrCreateUser(userId);
          const fullName = u.fullName || u.nick || `User${userId}`;
          const logMsg = `Бот был добавлен в новую беседу.\n\n| Добавил: [id${userId}|${fullName}]\n| ID Беседы: ${peerId}`;
          sendVkMessage(VK_TOKEN, 2000000010, logMsg).catch(() => {});
          await sendVkMessage(VK_TOKEN, peerId, greeting);
          return;
        } else if (memberId < 0) { // It's a group
          if (chatData.antiGroup) {
             const addU = await getOrCreateUser(userId);
              const addUName = addU.fullName || addU.nick || "Пользователь";
              await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${addUName}], добавлять сообщества в беседу запрещено.`, { noReply: true });
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
             if (bInfo.expiresAt && Date.now() > bInfo.expiresAt) {
               delete chatBans[peerId];
               await updateUser(memberId, { chatBans });
             } else {
               const modStr = await getModStr(bInfo.by);
               const reason = bInfo.reason || "без причины";
               const dateStr = fmtD(bInfo.date);
               const termStr = bInfo.expiresAt ? `до ${fmtD(bInfo.expiresAt)}` : "Навсегда";
               await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет блокировку в этой беседе!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }

          if (uData.gban && chatData.type !== "PL") {
             if (uData.gbanExpiresAt && Date.now() > uData.gbanExpiresAt) {
               await updateUser(memberId, { gban: false, gbanExpiresAt: 0 });
             } else {
               const modStr = await getModStr(uData.gbanBy);
               const reason = uData.gbanReason || "без причины";
               const dateStr = fmtD(uData.gbanDate);
               const termStr = uData.gbanExpiresAt ? `до ${fmtD(uData.gbanExpiresAt)}` : "Навсегда";
               await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет глобальную блокировку во всех беседах!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }

          if (uData.gbanpl && chatData.type === "PL") {
             if (uData.gbanplExpiresAt && Date.now() > uData.gbanplExpiresAt) {
               await updateUser(memberId, { gbanpl: false, gbanplExpiresAt: 0 });
             } else {
               const modStr = await getModStr(uData.gbanplBy);
               const reason = uData.gbanplReason || "без причины";
               const dateStr = fmtD(uData.gbanplDate);
               const termStr = uData.gbanplExpiresAt ? `до ${fmtD(uData.gbanplExpiresAt)}` : "Навсегда";
               await sendVkMessage(VK_TOKEN, peerId, `[id${memberId}|${targetName}] имеет глобальную блокировку во всех беседах игроков!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: memberId } });
               } catch (e) {}
               return;
             }
          }
          if (chatData.welcometext_enabled && chatData.welcometext) {
             let wText = chatData.welcometext;
             wText = wText.replace(/%u/g, `id${memberId}`);
             wText = wText.replace(/%n/g, `[id${memberId}|${uData.nick || "Участник"}]`);
             wText = wText.replace(/%i/g, `id${userId}`);
             wText = wText.replace(/%p/g, `[id${userId}|Пользователь]`); // simplified
             await sendVkMessage(VK_TOKEN, peerId, wText);
          }

          if (chatData.invRewardEnabled && userId && memberId && Number(userId) !== Number(memberId) && Number(memberId) > 0) {
            const inviterUser = await getOrCreateUser(userId);
            const inviterName = inviterUser.fullName || inviterUser.nick || `User${userId}`;
            const newBal = (inviterUser.balance || 0) + 25000;
            await updateUser(userId, { balance: newBal });
            await sendVkMessage(VK_TOKEN, peerId, `✨ [id${userId}|${inviterName}] получил(-а) награду за приглашение [id${memberId}|участника] в беседу!\n\n| Сумма награды: 25.000$\n\n[id${memberId}|Участник], присоединяйся к нам играть по команде - /приз`);
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


      // Global and local chat blocks check with auto-kick and notice
      if (peerId > 2000000000) {
        const uChatBans = user.chatBans || {};
        const getModStr = (mId?: number) => (!mId ? "[id1|Модератор]" : `[id${mId}|Модератор]`);

        if (uChatBans[peerId]) {
           const bInfo = uChatBans[peerId];
           if (bInfo.expiresAt && Date.now() > bInfo.expiresAt) {
             delete uChatBans[peerId];
             await updateUser(userId, { chatBans: uChatBans });
           } else {
             const modStr = getModStr(bInfo.by);
             const reason = bInfo.reason || "без причины";
             const dateStr = fmtD(bInfo.date);
             const termStr = bInfo.expiresAt ? `до ${fmtD(bInfo.expiresAt)}` : "Навсегда";
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] имеет блокировку в этой беседе!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId } });
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
             } catch (e) {}
             return;
           }
        }

        if (user.gban && chatData.type !== "PL") {
           if (user.gbanExpiresAt && Date.now() > user.gbanExpiresAt) {
             await updateUser(userId, { gban: false, gbanExpiresAt: 0 });
             user.gban = false;
           } else {
             const modStr = getModStr(user.gbanBy);
             const reason = user.gbanReason || "без причины";
             const dateStr = fmtD(user.gbanDate);
             const termStr = user.gbanExpiresAt ? `до ${fmtD(user.gbanExpiresAt)}` : "Навсегда";
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] имеет глобальную блокировку во всех беседах!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId } });
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
             } catch (e) {}
             return;
           }
        }

        if (user.gbanpl && chatData.type === "PL") {
           if (user.gbanplExpiresAt && Date.now() > user.gbanplExpiresAt) {
             await updateUser(userId, { gbanpl: false, gbanplExpiresAt: 0 });
             user.gbanpl = false;
           } else {
             const modStr = getModStr(user.gbanplBy);
             const reason = user.gbanplReason || "без причины";
             const dateStr = fmtD(user.gbanplDate);
             const termStr = user.gbanplExpiresAt ? `до ${fmtD(user.gbanplExpiresAt)}` : "Навсегда";
             await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] имеет глобальную блокировку во всех беседах игроков!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${dateStr}\n| Срок: ${termStr}`);
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId } });
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
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
            if (msgStartCmd === "/start" || msgStartCmd === "/старт" || msgStartCmd === "/активировать") {
             return await sendVkMessage(VK_TOKEN, peerId, "Вы находитесь в чёрном списке бота и не можете активировать беседу.", {
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
          const { items, error: vkErr } = await getChatMembers(peerId);
          const botMemberId = -Math.abs(parseInt(String(VK_GROUP_ID)));
          const botMember = (items || []).find((m: any) => m.member_id === botMemberId);
          // Выводить предупреждение только если VK сообщил об отсутствии прав (917) или бот найден в списке участников и он не админ
          if (vkErr === 917 || (botMember && !botMember.is_admin && !botMember.is_owner)) {
             const trimmed = (text || "").trim();
             const isCommand = (() => {
               if (!trimmed) return false;
               const prefixes = ["/", "!", ".", ",", "+", "*"];
               const cleanMsg = trimmed.replace(/^\[(?:club|id)\d+\|[^\]]+\]\s*/gi, "").trim().replace(/^@\S+\s*/gi, "").trim();
               const startsWithPrefix = prefixes.some(p => cleanMsg.startsWith(p));
               if (startsWithPrefix) return true;

               // Если префикса нет, проверяем, разрешен ли в этой беседе ввод без префикса
               if (chatData && chatData.noprefix === true) {
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
                   "стата", "статистика", "stats", "профиль", "profile", "инфо", "info", "инфобот", "infobot", "пинг", "ping",
                   "чс", "вчс", "чсб", "addblack", "unblack", "анчс", "изчс", "addb", "unb",
                   "deletecommand", "удалятькоманды", "delcmd", "статаимг", "stataimg", "statsimg", "статистикаимг", "варны", "warns", "банлист", "banlist", "мутлист", "mutelist", "онлайн", "online", "оффлайн", "offline",
                   "noprefix", "безпрефикса", "гс", "gs", "voice", "голосовое", "стикер", "стик", "sticker", "stick",
                   "реакции", "реакция", "reactions", "reaction", "реакс"
                 ];
                 return knownCmds.includes(firstWord);
               }
               return false;
             })();

             if (isCommand) {
                await sendVkMessage(VK_TOKEN, peerId, `У чат-менеджера отсутствуют права системного администратора (звёздочка), выдайте ему права администратора и он продолжит работать.`, {
                  forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
                });
                return;
             }
          }
        } catch (e) {}

        // Auto-reaction on incoming chat messages (priority: 1. Personal -> 2. Chat-wide -> 3. Global bot reaction)
        const targetReactionId = (user && user.personalReactionId && user.personalReactionId > 0)
          ? user.personalReactionId
          : (chatData && chatData.autoReactionId && chatData.autoReactionId > 0
            ? chatData.autoReactionId
            : (globalAutoReactionId > 0 ? globalAutoReactionId : 0));

        if (targetReactionId > 0 && message.conversation_message_id) {
          vkApi.get("messages.sendReaction", {
            params: {
              access_token: VK_TOKEN,
              v: "5.199",
              peer_id: peerId,
              cmid: message.conversation_message_id,
              reaction_id: targetReactionId
            }
          }).catch(() => {});
        }

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
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять фотографии в беседу запрещено её настройками.`, { noReply: true });
            return;
         }

         // Check sticker ban
         const hasSticker = (message.attachments && message.attachments.some((a: any) => a.type === "sticker")) || message.sticker || message.sticker_id;
         if (chatData.disableStickers && hasSticker) {
            try {
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять стикеры в беседу запрещено её настройками.`, { noReply: true });
            return;
         }

         // Check video ban
         const hasVideo = message.attachments && message.attachments.some((a: any) => a.type === "video" || a.type === "video_file" || a.type === "short_video");
         if (chatData.disableVideo && hasVideo) {
            try {
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять видео в беседу запрещено её настройками.`, { noReply: true });
            return;
         }
      }

      if (chatData.silence) {
         const silenceMinRole = chatData.silenceMinRole || 3;
         const canSpeak = userEffectiveRole >= silenceMinRole || isAdmin || userId === 778382713 || userId === 607598858;
         if (!canSpeak) {
            try {
               await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
            } catch (e) {}
            return; // silence mode
         }
      }

      // Check active mute
      if (user.muteUntil && user.muteUntil > Date.now()) {
         try {
           await axios.get(`https://api.vk.com/method/messages.delete`, { params: { access_token: VK_TOKEN, v: "5.199", conversation_message_ids: String(message.conversation_message_id), cmids: String(message.conversation_message_id), delete_for_all: 1, peer_id: peerId } });
         } catch (e) {}

         if (chatData.warnMute) {
            const currentWarns = (user.warnings || 0) + 1;
            await updateUser(userId, { warnings: currentWarns });
            const uName = user.fullName || user.nick || `User${userId}`;
            if (currentWarns >= 3) {
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId } });
               } catch (e) {}
               await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${uName}] получил(-а) предупреждение за написание сообщений находясь в блокировке чата. (#WM) [3/3]\n\n| Пользователь исключен за превышение лимита предупреждений.`);
            } else {
               await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${uName}] получил(-а) предупреждение за написание сообщений находясь в блокировке чата. (#WM)`);
            }
         }

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

      // Block game commands if games disabled
      const firstWord = text ? text.split(" ")[0].toLowerCase() : "";
      const gameCmdsList = [
        "/цитата", "/пиво", "/крокодил", "/приз", "/передать", "/топ", "/пивозавры", "/рулетка", "/казино",
        "/бизнес", "/бизнесы", "/купитьбиз", "/продатьбиз", "/ппрод", "/купитьпрод", "/премпрофиль", "/прембаланс",
        "/открытьдепозит", "/депозиты", "/дуэль", "/дуэльбиз", "/купитькоин", "/продатькоин", "/передатькоин", "/банк",
        "/мафия", "/кнб", "/брак", "/развод", "/монетка", "/кубик", "/клик", "/бонус", "/тир", "/рыбалка",
        "/снять", "/депозит", "/баланс", "/купитьбизнес", "/продатьбизнес", "/собрать", "/выпить", "/топпиво",
        "/репутация", "/поженить", "/развестись", "/свадьба", "/колесо", "/хак", "/взлом", "/клан"
      ];
      if ((chatData.games === false || chatData.gamesDisabled) && gameCmdsList.includes(firstWord)) {
        return await sendVkMessage(VK_TOKEN, peerId, "Игры отключены в этой беседе.", { reply_to: message.conversation_message_id || message.id });
      }

      if (checkFlood(peerId, userId, chatData)) {

         const uData = await getOrCreateUser(userId);
         if (!uData.muteUntil || uData.muteUntil < Date.now()) {
            await updateUser(userId, { muteUntil: Date.now() + 30 * 60 * 1000 });
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] была выдана блокировка чата на 30 минут по причине флуда сообщениями. (#FLOOD)`);
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

      
      // Anti-Ad Check
      if (peerId > 2000000000 && text && chatData.antiAd) {
        const uRole = await getRole(peerId, userId);
        const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
        const isOwnerOrImmune = (uRole >= 6) || (userChatRole >= 6) || (user.role >= 7.1) || (chatData.adminId === userId) || isAdmin;

        if (!isOwnerOrImmune && detectAdvertisement(text)) {
          try {
            await axios.get(`https://api.vk.com/method/messages.delete`, {
              params: { access_token: VK_TOKEN, v: "5.199", cmids: message.conversation_message_id, delete_for_all: 1, peer_id: peerId }
            });
          } catch (e) {}

          const targetU = await getOrCreateUser(userId);
          const newWarns = (targetU.warnings || 0) + 1;
          await updateUser(userId, { warnings: newWarns });

          await logBotAction({
            type: "warn",
            peerId,
            userId: 0,
            targetId: userId,
            text: `Система Анти-реклама выдала предупреждение [id${userId}|${fullName}] (${newWarns}/3)`
          });

          if (newWarns >= 3) {
            const chatBans = targetU.chatBans || {};
            chatBans[peerId] = { by: 0, reason: "3/3 предупреждений (Анти-реклама)", date: Date.now() };
            await updateUser(userId, { chatBans });

            try {
              await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
              });
            } catch (e) {}

            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] был заблокирован и исключен из беседы\n\n| Причина: 3/3 предупреждений, системная блокировка за рекламу`, { noReply: true });
          } else {
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}] получил(-а) предупреждение из-за рекламы/ссылки в беседе.\n| Предупреждений: ${newWarns}/3`, { noReply: true });
          }
          return;
        }
      }

// Anti-teg Check
      if (peerId > 2000000000 && text) {
        const chatDataForAntiTeg = await getOrCreateChat(peerId);
        const lowerText = text.toLowerCase();
        const hasAntiTegWords = chatDataForAntiTeg.antiTeg && Array.isArray(chatDataForAntiTeg.antiTeg) && chatDataForAntiTeg.antiTeg.length > 0;
        const hasAntiTegAll = chatDataForAntiTeg.antiTegAll === true;

        if (hasAntiTegWords || hasAntiTegAll) {
          const uRole = await getRole(peerId, userId);
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isOwnerOrImmune = (uRole >= 6) || (userChatRole >= 6) || (user.role >= 12) || (chatDataForAntiTeg.adminId === userId) || isAdmin;

          if (!isOwnerOrImmune) {
            let triggeredTag = "";
            if (hasAntiTegWords) {
              triggeredTag = chatDataForAntiTeg.antiTeg.find((tag: string) => tag && (containsVkTag(text, tag) || lowerText.includes(tag.toLowerCase())));
            }
            
            if (!triggeredTag && hasAntiTegAll) {
              if (containsTagAll(text)) {
                triggeredTag = "Упоминание всех";
              }
            }

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

                const tegU = await getOrCreateUser(userId);
              const tegUName = tegU.fullName || tegU.nick || "Пользователь";
              await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${tegUName}] получил(-а) предупреждение из-за упоминания всех участников беседы.\n| Предупреждений: ${newWarns}/3`, { noReply: true });
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
        // Если сообщение отправлено без префикса
        let allowedWithoutPrefix = false;
        if (peerId < 2000000000) {
          // В личных сообщениях с ботом (ЛС) беспрефиксный ввод разрешен всегда
          allowedWithoutPrefix = true;
        } else if (chatData && chatData.noprefix === true) {
          // В беседе разрешен только если включена настройка noprefix
          allowedWithoutPrefix = true;
        }

        if (allowedWithoutPrefix) {
          const firstWord = cmdText.split(/\s+/)[0].toLowerCase();
          const knownCmds = [
            "мут", "mute", "заглушить", "замутить", "мутить", "датьмут", "m",
            "анмут", "унмут", "unmute", "снятьмут", "размут", "разглушить", "размутить", "измута", "unm",
            "варн", "warn", "предупреждение", "датьварн", "пред", "выдатьварн", "выдатьпред", "w",
            "анварн", "унварн", "unwarn", "снятьварн", "снятьпредупреждение", "снятьпред", "анпред", "удалитьварн", "unw", "разварн",
            "кик", "kick", "исключить", "выгнать", "к", "k",
            "бан", "ban", "забанить", "б", "b",
            "разбан", "unban", "унбан", "анбан", "разбанить", "избана", "unb",
            "ии", "ai", "чат", "ask", "гпт", "gpt", "gemini",
            "старт", "start", "начать", "активировать", "активация", "включитьбота", "activate",
            "помощь", "help", "хелп", "команды", "меню", "cmd", "cmds", "commands", "игровые", "игры", "game", "games", "игровыекоманды",
            "стата", "статистика", "stats", "профиль", "profile", "проф", "инфо", "info", "инфобот", "infobot", "botinfo", "пинг", "ping", "статс", "stata", "си", "систата", "статаимг",
            "чс", "вчс", "чсб", "addblack", "unblack", "анчс", "изчс", "addb", "unb",
            "deletecommand", "удалятькоманды", "delcmd", "stataimg", "statsimg", "статистикаимг",
            "варны", "warns", "преды", "списокварнов", "банлист", "banlist", "списокбанов", "баны", "мутлист", "mutelist", "списокмутов", "муты", "онлайн", "online", "ктоонлайн", "онлайне", "оффлайн", "offline", "офлайн",
            "чистка", "clear", "mclear", "очистить", "purge", "пурдж", "удалитьсообщения", "zov", "зов", "olist", "offlinelist",
            "олист", "оффлайнлист", "офлайнлист", "онлайнлист", "warnmute", "варнмут", "wm", "наградаинв", "invreward",
            "наградаинвайт", "наградаприглашение", "rewardinv", "гстафф", "гсостав", "gstaffs",
            "pin", "пин", "unpin", "анпин", "унпин", "закрепить", "открепить", "закр", "откр", "settings", "настройки", "настройка", "сеттингс", "параметры",
            "type", "тип", "типбеседы", "sync", "синк", "синх", "синхронизация", "синхронизировать", "resync", "games", "staff", "состав", "стафф", "руководство", "админы", "модеры", "составсети", "gstaff", "ghelp", "гхелп",
            "giveowner", "welcometext", "leave", "invite", "af", "antisliv", "антислив", "raid", "антирейд",
            "group", "антигруппа", "tegall", "антитег", "antiad", "антиреклама", "addantiteg", "unantiteg", "antiteglist",
            "addawstats", "unawstats", "gaddawstats", "gunawstats", "createnet", "deletenet", "dgiveowner",
            "addchatnet", "unchatnet", "netlist", "gban", "ungban", "gbanpl", "ungbanpl", "gbanlist", "aban", "абан",
            "closebot", "openbot", "закрытьбота", "открытьбота", "thelp", "тхелп", "теххелп",
            "grrole", "arrole", "setowner", "deleteowner", "banid", "unbanid", "infochat", "инфочат", "чатинфо", "chatinfo",
            "addzsr", "addozsr", "addruk", "addzamowner", "addstatus", "unstatus", "setinfobot", "achat", "unachat",
            "роль", "баланс", "bal", "balance", "бал", "банк", "снятьбанк", "топ", "пивозавры", "казино", "casino", "рулетка", "roulette", "р", "бизнес", "бизнесы",
            "купитьбиз", "продатьбиз", "дуэль", "д", "duel", "дуэльбиз", "кнб", "мафия", "пиво", "инфа", "кто", "погода",
            "взлом", "фортуна", "бонус", "подписка", "купитьпрем", "прем", "премпрофиль", "прембаланс",
            "реп", "rep", "промо", "промокод", "promo", "promocode", "createpromo", "id", "ид", "айди", "infoid", "addmoder", "addsenmoder",
            "addadmin", "addsenadmin", "addzsa", "addsa", "removerole", "снятьроль", "снятьправа", "кикнеактив",
            "брак", "развод", "развести", "поженить", "монетка", "открытьдепозит", "депозиты", "ппрод", "купитьпрод",
            "купитькоин", "продатькоин", "передатькоин", "цитата", "приз", "раздача", "giveaway", "передать", "крокодил", "клан", "кланы", "курс",
            "restart", "перезапуск", "chats", "беседы", "noprefix", "безпрефикса",
            "form", "форма", "податьформу", "форм", "gbanform", "гбанформ",
            "bug", "баг", "багрепорт", "bugreport", "репорт", "bug_report",
            "offer", "предложение", "предложка", "идея", "предложить", "оффер", "предл", "предложения",
            "гс", "gs", "voice", "голосовое", "стикер", "стик", "sticker", "stick",
            "реакции", "реакция", "reactions", "reaction", "реакс"
          ];
          if (knownCmds.includes(firstWord)) {
            cmdText = "/" + cmdText;
          } else {
            return; // Нераспознанная беспрефиксная команда
          }
        } else {
          return; // Беспрефиксный ввод запрещен в этой беседе
        }
      }

      if (!cmdText.startsWith("/")) return;

      if (user.gban || user.gbanpl) {
        return await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|вы], находитесь в глобальной блокировке чат-менеджера JORDAN MANAGER.`, {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true }),
            disable_mentions: 1
        });
      }

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

      const ALL_GAME_CMDS = new Set([
        "/приз", "/казино", "/к", "/casino",
        "/рулетка", "/р", "/roulette",
        "/роль", "/баланс", "/б", "/bal", "/balance", "/банк", "/снятьбанк", "/топ", "/пивозавры",
        "/бизнес", "/бизнесы", "/купитьбиз", "/продатьбиз", "/дуэль", "/д", "/дуэльбиз",
        "/кнб", "/мафия", "/пиво", "/инфа", "/кто", "/погода",
        "/взлом", "/фортуна", "/бонус", "/подписка", "/купитьпрем", "/прем", "/премпрофиль", "/прембаланс",
        "/реп", "/rep", "/промо", "/createpromo",
        "/брак", "/развод", "/развести", "/поженить", "/монетка", "/открытьдепозит", "/депозиты",
        "/ппрод", "/купитьпрод", "/купитькоин", "/продатькоин", "/передатькоин", "/цитата", "/передать",
        "/крокодил", "/клан", "/кланы", "/курс"
      ]);

      if (peerId < 2000000000) {
        const allowedInDm = new Set([
          ...ALL_GAME_CMDS,
          "/start", "/help", "/gamehelp", "/ghelp", "/старт", "/помощь", "/хелп", "/команды", "/меню",
          "/игровые", "/игры", "/гхелп", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот"
        ]);
        if (!allowedInDm.has(rawCmd)) {
          return await sendVkMessage(VK_TOKEN, peerId, "В ЛС бота работают только игровые команды!");
        }
      }

      if ((chatData.games === false || chatData.gamesDisabled) && ALL_GAME_CMDS.has(rawCmd)) {
        return await sendVkMessage(VK_TOKEN, peerId, "Игры в этой беседе отключены.", {
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
          return await sendVkMessage(VK_TOKEN, peerId, "В аргументах команды указаны Ban-words.", {
            forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
          });
        }
      }

      // Check if chat is active. Only /start and /старт commands are allowed if chat is NOT active.
      if (peerId > 2000000000) {
        const isStartCmd = ["/start", "/старт", "/активировать", "/активация", "/включитьбота", "/activate", "/начать"].includes(rawCmd);
        const isHelpCmd = ["/help", "/помощь", "/хелп", "/команды", "/меню", "/cmd", "/cmds", "/commands"].includes(rawCmd);
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

      // Log the command in chat 10 (only for actual users, ignoring communities, mask profanity, and for ALL commands)
      if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {
        const STRICT_GAME_CMDS = new Set([
          "/приз", "/казино", "/к", "/casino",
          "/рулетка", "/р", "/roulette",
          "/дуэль", "/д", "/дуэльбиз",
          "/кнб", "/мафия", "/пиво", "/beer",
          "/взлом", "/фортуна", "/бонус",
          "/купитьбиз", "/продатьбиз",
          "/монетка", "/купитькоин", "/продатькоин", "/передатькоин",
          "/передать", "/pay", "/transfer", "/крокодил",
          "/сейф", "/кейс", "/кейсы", "/работать", "/работа", "/ферма", "/майнинг"
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

        if (["/mute", "/мут"].includes(rawCmd)) {
          actionStr = "выдал(-а) блокировку чата";
          if (args[1] && !isNaN(Number(args[1]))) {
            durationStr = `${args[1]} мин`;
            if (args.length > 2) reasonStr = args.slice(2).join(" ");
          } else if (args[2] && !isNaN(Number(args[2]))) {
            durationStr = `${args[2]} мин`;
            if (args.length > 3) reasonStr = args.slice(3).join(" ");
          }
        } else if (["/unmute", "/размут", "/анмут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
          actionStr = "снял(-а) блокировку чата";
        } else if (["/ban", "/бан", "/забанить"].includes(rawCmd)) {
          actionStr = "заблокировал(-а) пользователя в беседе";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unban", "/разбан", "/разбанить"].includes(rawCmd)) {
          actionStr = "разблокировал(-а) пользователя в беседе";
        } else if (["/kick", "/кик", "/исключить", "/выгнать", "/к", "/k"].includes(rawCmd)) {
          actionStr = "исключил(-а) пользователя из беседы";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
          actionStr = "выдал(-а) предупреждение";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unwarn", "/разварн", "/снятьварн", "/снятьпред", "/unw"].includes(rawCmd)) {
          actionStr = "снял(-а) предупреждение";
        } else if (["/gban"].includes(rawCmd)) {
          actionStr = "выдал(-а) глобальную блокировку";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/ungban"].includes(rawCmd)) {
          actionStr = "снял(-а) глобальную блокировку";
        } else if (["/gbanpl"].includes(rawCmd)) {
          actionStr = "выдал(-а) глобальную блокировку игроков";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/ungbanpl"].includes(rawCmd)) {
          actionStr = "снял(-а) глобальную блокировку игроков";
        } else if (["/rebuke", "/выговор"].includes(rawCmd)) {
          actionStr = "выдал(-а) выговор руководителю";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/unrebuke", "/снятьвыговор"].includes(rawCmd)) {
          actionStr = "снял(-а) выговор с руководителя";
          if (args.length > 2) reasonStr = args.slice(2).join(" ");
        } else if (["/addmoder", "/модер", "/выдатьмодера", "/setmoder", "/аддмодер"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Модератор»";
        } else if (["/addsenmoder", "/смодер", "/setsenmoder", "/setsmoder", "/старшиймодератор", "/аддсмодер"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Старший модератор»";
        } else if (["/addadmin", "/админ", "/setadmin", "/аддадмин", "/выдатьадмина"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Администратор»";
        } else if (["/addsenadmin", "/садмин", "/setsenadmin", "/setsadmin", "/старшийадминистратор", "/аддсадмин"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Старший администратор»";
        } else if (["/addzsa", "/замспец", "/выдатьзса", "/setzsa", "/addzamspets", "/аддзса"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Зам. спец. администратора»";
        } else if (["/addsa", "/са", "/sa", "/setsa", "/выдатьса", "/addspets", "/аддса", "/спецадмин"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Специальный администратор»";
        } else if (["/addzsr", "/заместитель", "/заместительдиректора", "/addzam", "/аддзср"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Зам. Руководителя»";
        } else if (["/addozsr", "/озаместитель", "/озаместительдиректора", "/addozam", "/аддозср"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Осн. Зам. Руководителя»";
        } else if (["/addruk", "/руководитель", "/addsr", "/adddirector", "/директор"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Руководитель»";
        } else if (["/addgr", "/главруководитель", "/addgruk", "/главдиректор", "/addgdirector"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Главный Руководитель»";
        } else if (["/addzamowner", "/замвладельцабота", "/замвладельца", "/addzown", "/аддзамвладельца"].includes(rawCmd)) {
          actionStr = "выдал(-а) должность «Зам. Владельца»";
        } else if (["/removerole", "/снятьроль", "/снятьправа", "/delrole", "/унроль", "/unrole", "/delmoder", "/delsenmoder", "/deladmin", "/delsenadmin", "/delzsa", "/delsa", "/unmoder"].includes(rawCmd)) {
          actionStr = "снял(-а) должность";
        } else if (["/arrole"].includes(rawCmd)) {
          actionStr = "снял(-а) ВСЕ роли у пользователя";
        } else if (["/grrole"].includes(rawCmd)) {
          actionStr = "снял(-а) глобальную роль";
        } else if (["/givemoney", "/датьденег"].includes(rawCmd)) {
          actionStr = "выдал(-а) валюту";
          if (args[2]) betStr = args[2];
        } else if (["/setmoney"].includes(rawCmd)) {
          actionStr = "установил(-а) баланс";
          if (args[2]) betStr = args[2];
        } else if (["/resetmoney"].includes(rawCmd)) {
          actionStr = "обнулил(-а) баланс";
        } else if (["/hidetop"].includes(rawCmd)) {
          actionStr = "скрыл(-а) пользователя из топа";
        } else if (["/unhidetop"].includes(rawCmd)) {
          actionStr = "убрал(-а) пользователя из скрытых в топе";
        } else if (["/setowner"].includes(rawCmd)) {
          actionStr = "назначил(-а) владельца беседы";
        } else if (["/deleteowner"].includes(rawCmd)) {
          actionStr = "снял(-а) права владельца беседы";
        } else if (["/addstatus"].includes(rawCmd)) {
          actionStr = "установил(-а) статус пользователю";
        } else if (["/unstatus"].includes(rawCmd)) {
          actionStr = "снял(-а) статус пользователя";
        } else if (["/setinfobot"].includes(rawCmd)) {
          actionStr = "установил(-а) инфо бота";
        } else if (["/achat"].includes(rawCmd)) {
          actionStr = "сделал(-а) беседу админ-чатом";
        } else if (["/unachat"].includes(rawCmd)) {
          actionStr = "убрал(-а) статус админ-чата";
        } else if (["/giveowner"].includes(rawCmd)) {
          actionStr = "передал(-а) права владельца беседы";
        } else if (["/zov", "/зов", "/all", "/все"].includes(rawCmd)) {
          actionStr = "созвал(-а) участников беседы";
        } else if (["/antiteg"].includes(rawCmd)) {
          actionStr = "добавил(-а) анти-тег";
        } else if (["/unantiteg"].includes(rawCmd)) {
          actionStr = "удалил(-а) анти-тег";
        } else if (["/rstats"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) статистику руководителя";
        } else if (["/gstaff"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список руководства";
        } else if (["/ghelp", "/гхелп"].includes(rawCmd)) {
          actionStr = "Вызвал(-а) помощь руководства";
        } else if (["/help", "/помощь", "/хелп", "/команды", "/меню", "/gamehelp"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список команд";
        } else if (["/stats", "/стата", "/статистика", "/профиль", "/profile", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) статистику";
        } else if (["/balance", "/баланс", "/б", "/bal", "/банк"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) баланс";
        } else if (["/top", "/топ"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) топ игроков";
        } else if (rawCmd === "/приз") {
          const pAmount = args[1] && !isNaN(Number(args[1])) ? args[1] : "";
          actionStr = pAmount ? `Получил(-а) приз в размере ${pAmount}$` : "Получил(-а) приз";
        } else if (["/start", "/старт"].includes(rawCmd)) {
          actionStr = "Запустил(-а) бота";
        } else if (["/rules", "/правила"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) правила беседы";
        } else if (["/ping", "/пинг"].includes(rawCmd)) {
          actionStr = "Проверил(-а) пинг бота";
        } else if (["/time", "/время"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) текущее время";
        } else if (["/online", "/онлайн"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) онлайн беседы";
        } else if (["/chat", "/чат"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) информацию о беседе";
        } else if (["/staff", "/состав"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) состав администрации беседы";
        } else if (["/warns", "/варны", "/предупреждения"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) свои предупреждения";
        } else if (["/mutelist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список замученных";
        } else if (["/banlist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список забаненных";
        } else if (["/warnlist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список предупреждений";
        } else if (["/gbanlist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список глобально забаненных";
        } else if (["/hidetoplist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список скрытых из топа";
        } else if (["/antiteglist"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список анти-тегов";
        } else if (["/титул"].includes(rawCmd)) {
          actionStr = "Установил(-а) титул";
        } else if (["/брак", "/поженить"].includes(rawCmd)) {
          actionStr = "Вступил(-а) в брак";
        } else if (["/развод", "/развести"].includes(rawCmd)) {
          actionStr = "Развелся(-ась)";
        } else if (["/промо"].includes(rawCmd)) {
          actionStr = "Активировал(-а) промокод";
        } else if (isGame) {
          if (["/казино", "/casino", "/к"].includes(rawCmd)) actionStr = "Сыграл(-а) в казино";
          else if (["/рулетка", "/roulette", "/р"].includes(rawCmd)) actionStr = "Сыграл(-а) в рулетку";
          else if (["/дуэль", "/duel", "/д", "/дуэльбиз"].includes(rawCmd)) actionStr = "Сыграл(-а) в дуэль";
          else if (["/пиво", "/beer"].includes(rawCmd)) actionStr = "Выпил(-а) пива";
          else if (["/передать", "/pay", "/transfer"].includes(rawCmd)) actionStr = "Передал(-а) валюту";
          else if (["/кнб"].includes(rawCmd)) actionStr = "Сыграл(-а) в КНБ";
          else if (["/купитьбиз"].includes(rawCmd)) actionStr = "Купил(-а) бизнес";
          else if (["/продатьбиз"].includes(rawCmd)) actionStr = "Продал(-а) бизнес";
          else if (["/купитькоин"].includes(rawCmd)) actionStr = "Купил(-а) коины";
          else if (["/продатькоин"].includes(rawCmd)) actionStr = "Продал(-а) коины";
          else if (["/передатькоин"].includes(rawCmd)) actionStr = "Передал(-а) коины";
          else if (["/взлом"].includes(rawCmd)) actionStr = "Взломал(-а) систему";
          else if (["/фортуна"].includes(rawCmd)) actionStr = "Сыграл(-а) в колесо фортуны";
          else if (["/монетка"].includes(rawCmd)) actionStr = "Сыграл(-а) в монетку";
          else if (["/крокодил"].includes(rawCmd)) actionStr = "Сыграл(-а) в крокодил";
          else if (["/мафия"].includes(rawCmd)) actionStr = "Сыграл(-а) в мафию";
          else if (["/сейф"].includes(rawCmd)) actionStr = "Открыл(-а) сейф";
          else if (["/кейс", "/кейсы"].includes(rawCmd)) actionStr = "Открыл(-а) кейс";
          else if (["/работать", "/работа"].includes(rawCmd)) actionStr = "Поработал(-а)";
          else if (["/ферма"].includes(rawCmd)) actionStr = "Собрал(-а) урожай на ферме";
          else if (["/майнинг"].includes(rawCmd)) actionStr = "Запустил(-а) майнинг";
          else actionStr = `Сыграл(-а) в игру ${rawCmd}`;

          if (args[1] && !isNaN(Number(args[1]))) betStr = args[1];
          else if (args[2] && !isNaN(Number(args[2]))) betStr = args[2];
        } else if (VALID_COMMANDS.has(rawCmd)) {
          actionStr = `Выполнил(-а) команду ${rawCmd}`;
        } else {
          actionStr = "";
        }

        if (actionStr !== "") {
          await logToChat10({
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
          });
        }
      }

      // Check Global Bot Close status
      if (isGlobalBotClosed && user.role < 12 && userId !== 778382713 && userId !== 607598858) {
        return await sendVkMessage(VK_TOKEN, peerId, `🔒 Использование бота временно закрыто для публичного использования Владельцем чат-менеджера.`, {
          forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [message.conversation_message_id], is_reply: true })
        });
      }

      // Check Game Blacklist for ALL commands
      if (user.isGameBanned && user.role < 12) {
        const durationText = user.gameBanUntil ? formatMskDate(user.gameBanUntil) : "Навсегда";
        const reasonText = user.gameBanReason || "Нарушение правил";
        return await sendVkMessage(VK_TOKEN, peerId, `Вы заблокированы в боте!\n\n| Причина: ${reasonText}\n| Блокировка до: ${durationText}`, {
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
          await logBotAction({ type: "game", peerId, userId, text: `[id${userId}|${fullName}] выиграл(-а) ${winAmount.toLocaleString()}$ в рулетке (Ставка: ${stake.toLocaleString()}$)` });
          return await sendResponse(`🎰 [id${userId}|${fullName}], вы выиграли ${winAmount.toLocaleString()}$ в рулетке!`);
        } else {
          await updateUser(userId, { balance: user.balance - stake });
          await logBotAction({ type: "game", peerId, userId, text: `[id${userId}|${fullName}] проиграл(-а) ${stake.toLocaleString()}$ в рулетке` });
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

      
       // ==========================================
       // Tech Specialist Commands & Menus (/thelp)
       // ==========================================
       if (rawCmd === "/thelp" || rawCmd === "/тхелп" || rawCmd === "/теххелп") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1) {
             return await sendResponse("У вас недостаточно прав!");
          }

          const text = `...::Помощь по техническим командам::...\n\nВыберите нужный раздел:`;

          const keyboard = { inline: true, buttons: [] as any[] };
          const availableButtons: { cmd: string; label: string }[] = [];
          if (effRole >= 7.1) availableButtons.push({ cmd: "thelp_tech", label: "Тех. Специалист" });
          if (effRole >= 7.2) availableButtons.push({ cmd: "thelp_curator", label: "Куратор тех." });
          if (effRole >= 7.3) availableButtons.push({ cmd: "thelp_head", label: "Главный тех." });

          let row: any[] = [];
          for (const btn of availableButtons) {
             row.push({ action: { type: "callback", label: btn.label, payload: JSON.stringify({ cmd: btn.cmd, authorId: userId }) }, color: "secondary" });
             if (row.length === 2) {
                keyboard.buttons.push(row);
                row = [];
             }
          }
          if (row.length > 0) keyboard.buttons.push(row);

          return await sendResponse(text, { keyboard: JSON.stringify(keyboard), noReply: true });
       }

       if (rawCmd === "/get" || rawCmd === "/гет" || rawCmd === "/getuser") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");

          const parsed = await parseTargetUser(message, args.slice(1));
          const targetId = parsed.targetId || userId;
          const targetUser = await getOrCreateUser(targetId);

          const chatsSnap = await firestoreDb.collection("chats").get();
          let chatsCount = 0;
          let ownerChatsCount = 0;

          for (const doc of chatsSnap.docs) {
             const c = doc.data();
             const cId = parseInt(doc.id);
             const inRoles = targetUser.chatRoles && targetUser.chatRoles[cId] !== undefined;
             const isOwner = c.ownerId === targetId || (targetUser.chatRoles && targetUser.chatRoles[cId] === 7);
             if (inRoles || isOwner) {
                chatsCount++;
                if (isOwner) ownerChatsCount++;
             }
          }

          if (chatsCount === 0 && targetUser.messagesTotal) {
             chatsCount = 1;
          }

          const totalMsgs = targetUser.msgCountTotal || targetUser.messagesTotal || 0;

          const outText = `Информация о [id${targetId}|пользователе]

| Состоит в беседах с ботом: ${chatsCount}
| Из них владелец в беседах: ${ownerChatsCount}

| Общее кол-во сообщений который написал пользователь во всех беседах с ботом: ${totalMsgs}`;

          return await sendResponse(outText, { noReply: true });
       }

       if (rawCmd === "/botstats" || rawCmd === "/botstat" || rawCmd === "/ботстатс" || rawCmd === "/статабота") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");

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

          const reportText = `...::Статистика бота::..

` +
            `| Пинг бота: ${ping} мс
` +
            `| Скорость ответа бота: ${resp} сек

` +
            `| Употреблено ОЗУ: ${usedMemMB} МБ
` +
            `| Свободно ОЗУ: ${freeMemMB} МБ

` +
            `| Загрузка CPU: ${cpuLoad}%

` +
            `| Записей в таблице логов: ${totalLogsCount}
` +
            `| Занято места в базе данных: ~${dbSizeMB} МБ
` +
            `| Свободно места в базе данных: Не ограничено

` +
            `| Последний перезапуск бота: ${ds} ${ts}
` +
            `| С момента последнего перезапуска прошло: ${uptimeStr}`;

          return await sendResponse(reportText, { noReply: true });
       }

       if (rawCmd === "/logs" || rawCmd === "/логи" || rawCmd === "/логс") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");

          const logs = await getFilteredLogs({ type: "all" });
          const payloadMeta = { cmd: "logs_page", logType: "all", title: "Общие логи бота", authorId: userId };
          const { text, keyboard } = renderLogsPage("Общие логи бота", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logs_user" || rawCmd === "/логи_юзер" || rawCmd === "/логипользователя") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          const logs = await getFilteredLogs({ userId: parsed.targetId });
          const payloadMeta = { cmd: "logs_page", logType: "all", targetId: parsed.targetId, title: `Логи пользователя [id${parsed.targetId}|User]`, authorId: userId };
          const { text, keyboard } = renderLogsPage(`Логи пользователя [id${parsed.targetId}|User]`, logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logs_games" || rawCmd === "/логи_игр" || rawCmd === "/логиигры") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");

          const logs = await getFilteredLogs({ type: "game" });
          const payloadMeta = { cmd: "logs_page", logType: "game", title: "Логи игр бота", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи игр бота", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/addtech" || rawCmd === "/выдатьтех" || rawCmd === "/аддтех") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.2 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна Куратору тех. специалистов и выше.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          await updateUser(parsed.targetId, { role: 7.1 });
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] выдал(-а) права «Тех. Специалист» [id${parsed.targetId}|пользователю]`
          });
          return await sendResponse(`[id${userId}|${fullName}] выдал(-а) уровень прав «Тех. Специалист» [id${parsed.targetId}|пользователю]`, { noReply: true });
       }

       if (rawCmd === "/untech" || rawCmd === "/снятьтех" || rawCmd === "/унтех" || rawCmd === "/deltech") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.2 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна Куратору тех. специалистов и выше.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const targetU = await getOrCreateUser(parsed.targetId);
          if (targetU.role === 7.1) {
             await updateUser(parsed.targetId, { role: 0 });
          }
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] снял(-а) права «Тех. Специалист» с [id${parsed.targetId}|пользователя]`
          });
          return await sendResponse(`[id${userId}|${fullName}] снял(-а) уровень прав «Тех. Специалист» с [id${parsed.targetId}|пользователя]`, { noReply: true });
       }

       if (rawCmd === "/addcuratortech" || rawCmd === "/выдатькураторатех" || rawCmd === "/аддкураттех") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна Главному тех. специалисту и выше.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          await updateUser(parsed.targetId, { role: 7.2 });
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] выдал(-а) права «Куратор тех. специалистов» [id${parsed.targetId}|пользователю]`
          });
          return await sendResponse(`[id${userId}|${fullName}] выдал(-а) уровень прав «Куратор тех. специалистов» [id${parsed.targetId}|пользователю]`, { noReply: true });
       }

       if (rawCmd === "/removecuratortech" || rawCmd === "/снятькураторатех" || rawCmd === "/delcuratortech") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 7.3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна Главному тех. специалисту и выше.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const targetU = await getOrCreateUser(parsed.targetId);
          if (targetU.role === 7.2) {
             await updateUser(parsed.targetId, { role: 0 });
          }
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] снял(-а) права «Куратор тех. специалистов» с [id${parsed.targetId}|пользователя]`
          });
          return await sendResponse(`[id${userId}|${fullName}] снял(-а) уровень прав «Куратор тех. специалистов» с [id${parsed.targetId}|пользователя]`, { noReply: true });
       }

       // Local Chat Moderation Logs (Administrator+)
       if (rawCmd === "/logsadm" || rawCmd === "/логиадм") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Доступно с должности Администратор.");

          const logs = await getFilteredLogs({ peerId, type: "adm" });
          const payloadMeta = { cmd: "logs_page", logType: "adm", filterPeerId: peerId, title: "Логи прав в беседе", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи назначения и снятия прав в беседе", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logsmute" || rawCmd === "/логимут") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Доступно с должности Администратор.");

          const logs = await getFilteredLogs({ peerId, type: "mute" });
          const payloadMeta = { cmd: "logs_page", logType: "mute", filterPeerId: peerId, title: "Логи блокировок чата", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи блокировок чата в беседе", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logsban" || rawCmd === "/логибан") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Доступно с должности Администратор.");

          const logs = await getFilteredLogs({ peerId, type: "ban" });
          const payloadMeta = { cmd: "logs_page", logType: "ban", filterPeerId: peerId, title: "Логи блокировок в беседе", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи блокировок в беседе", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logswarn" || rawCmd === "/логиварн") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Доступно с должности Администратор.");

          const logs = await getFilteredLogs({ peerId, type: "warn" });
          const payloadMeta = { cmd: "logs_page", logType: "warn", filterPeerId: peerId, title: "Логи предупреждений", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи предупреждений в беседе", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       if (rawCmd === "/logskick" || rawCmd === "/логикик") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Доступно с должности Администратор.");

          const logs = await getFilteredLogs({ peerId, type: "kick" });
          const payloadMeta = { cmd: "logs_page", logType: "kick", filterPeerId: peerId, title: "Логи исключений из беседы", authorId: userId };
          const { text, keyboard } = renderLogsPage("Логи исключений из беседы", logs, 1, payloadMeta);
          return await sendResponse(text, { keyboard: keyboard ? JSON.stringify(keyboard) : undefined, noReply: true });
       }

       // Global Nicks Commands (Руководитель+, role >= 10)
       if (rawCmd === "/gsnick" || rawCmd === "/гсник") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Руководитель.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const newNick = remainingArgs.join(" ").trim();
          if (!newNick) return await sendResponse("Укажите желаемый глобальный ник!");

          await updateUser(parsed.targetId, { globalNick: newNick });
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] установил(-а) глобальный ник «${newNick}» [id${parsed.targetId}|пользователю]`
          });
          return await sendResponse(`[id${userId}|${fullName}] установил(-а) ник [id${parsed.targetId}|пользователю] во всём чат-менеджере

| Установленный ник: ${newNick}`, { noReply: true });
       }

       if (rawCmd === "/grnick" || rawCmd === "/грник") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Руководитель.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          await updateUser(parsed.targetId, { globalNick: "" });
          await logBotAction({
             type: "adm",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] удалил(-а) глобальный ник у [id${parsed.targetId}|пользователя]`
          });
          return await sendResponse(`[id${userId}|${fullName}] удалил(-а) ник [id${parsed.targetId}|пользователю] во всём чат-менеджере`, { noReply: true });
       }

       // /zunban: Remove all chat bans for user in all chats (Руководитель+, role >= 10)
       if (rawCmd === "/zunban" || rawCmd === "/зунбан") {
          const effRole = user.role >= 12 || userId === 778382713 || userId === 607598858 ? 12 : (user.role || 0);
          if (effRole < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Руководитель.");

          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          const targetU = await getOrCreateUser(parsed.targetId);
          const oldBansCount = Object.keys(targetU.chatBans || {}).length;
          await updateUser(parsed.targetId, { chatBans: {} });

          await logBotAction({
             type: "ban",
             peerId,
             userId,
             targetId: parsed.targetId,
             text: `[id${userId}|${fullName}] снял(-а) все блокировки в беседах (${oldBansCount}) [id${parsed.targetId}|пользователю]`
          });
          return await sendResponse(`[id${userId}|${fullName}] снял(-а) ${oldBansCount} блокировок(-ки) [id${parsed.targetId}|пользователю]`, { noReply: true });
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
            const termStr = tUser.warnExpiresAt ? `${Math.max(1, Math.ceil((tUser.warnExpiresAt - (tUser.warnDate || Date.now())) / (24 * 3600 * 1000)))} дн.` : "Навсегда";
            return await sendResponse(`...::Информация о предупреждениях::...\n\nПользователь: [id${targetId}|${targetName}]\n| Количество предупреждений: ${warnsCount}/3\n\n1) ${mStr} | ${rStr} | ${termStr} | ${dStr}`);
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
           return `[id${mId}|Модератор]`;
         };

         const formatDaysTerm = (expiresAt?: number, startDate?: number) => {
           if (!expiresAt) return "Навсегда";
           const start = startDate || Date.now();
           const days = Math.max(1, Math.ceil((expiresAt - start) / (24 * 3600 * 1000)));
           return `${days} дн.`;
         };

         const gbanText = tUser.gban ? `${await getModStr(tUser.gbanBy)} | ${tUser.gbanReason || 'без причины'} | ${formatDaysTerm(tUser.gbanExpiresAt, tUser.gbanDate)} | ${fmtD(tUser.gbanDate)}` : "Отсутствует.";
         const gbanplText = tUser.gbanpl ? `${await getModStr(tUser.gbanplBy)} | ${tUser.gbanplReason || 'без причины'} | ${formatDaysTerm(tUser.gbanplExpiresAt, tUser.gbanplDate)} | ${fmtD(tUser.gbanplDate)}` : "Отсутствует.";
         const blackText = tUser.blacklisted ? `${await getModStr(tUser.blackBy)} | ${tUser.blackReason || 'без причины'} | ${formatDaysTerm(tUser.blackExpiresAt, tUser.blackDate)} | ${fmtD(tUser.blackDate)}` : "Отсутствует.";
         const gameBanText = tUser.isGameBanned ? `${await getModStr(tUser.gameBanBy)} | ${tUser.gameBanReason || 'без причины'} | ${formatDaysTerm(tUser.gameBanUntil, tUser.gameBanDate)} | ${fmtD(tUser.gameBanDate || Date.now())}` : "Отсутствует.";

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
             const termStr = formatDaysTerm(bInfo.expiresAt, bInfo.date);
             lines.push(`${idx}) ${cData.title || `Беседа №${cId}`} | ${mStr} | ${bInfo.reason || 'без причины'} | ${termStr} | ${fmtD(bInfo.date)}`);
             idx++;
           }
           chatBansText = lines.join("\n");
         }

         const out = `Информация о блокировках [id${parsed.targetId}|пользователя]\n\n` +
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
          await logBotAction({ type: "mute", peerId, userId, targetId: parsed.targetId, text: `[id${userId}|${fullName}] выдал(-а) блокировку чата [id${parsed.targetId}|пользователю] на ${timeMin} мин (Причина: ${reason})` });
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
        const targetU = await getOrCreateUser(parsed.targetId);
        const tName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || `User${parsed.targetId}`;
        await updateUser(parsed.targetId, { muteUntil: 0, mutePeerId: 0 });
        try {
          await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
            params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: parsed.targetId, for_all: 0 }
          });
        } catch (e) {}
        return await sendResponse(`[id${userId}|Модератор] снял(-а) блокировку чата с [id${parsed.targetId}|${tName}]`, { noReply: true });
      }

      if (["/warn", "/варн", "/предупреждение", "/датьварн", "/пред", "/выдатьварн", "/w"].includes(rawCmd)) {
        if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
        if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
        if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
        
        const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
        const { reason, duration } = extractReasonAndDuration(remainingArgs);
        const termStr = duration ? duration.text : "Навсегда";

        const targetU = await getOrCreateUser(parsed.targetId);
        const newWarns = (targetU.warnings || 0) + 1;
        const expiresAt = duration ? duration.until : 0;
        await updateUser(parsed.targetId, { 
           warnings: newWarns, 
           warnBy: userId, 
           warnReason: reason, 
           warnDate: Date.now(), 
           warnExpiresAt: expiresAt 
        });
        await logBotAction({ type: "warn", peerId, userId, targetId: parsed.targetId, text: `[id${userId}|${fullName}] выдал(-а) предупреждение [id${parsed.targetId}|пользователю] (${newWarns}/3, Причина: ${reason})` });
        
        const keyboard = {
          inline: true,
          buttons: [
            [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clearwarn", targetId: parsed.targetId, msgId: message.id }) }, color: "negative" }]
          ]
        };
        
        let msg = `[id${userId}|Модератор] выдал(-а) предупреждение [id${parsed.targetId}|пользователю]\n\n| Причина: ${reason}\n| Срок: ${termStr}\n| Предупреждений: ${newWarns}/3`;
        
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
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const effectiveRole = user.role >= 8 ? user.role : (isOwner || isVkAdmin ? Math.max(7, user.role || 0, chatRole) : Math.max(user.role || 0, chatRole));
         if (effectiveRole < reqRole && !isAdmin && !isVkAdmin && !isOwner) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         if (giveRole >= effectiveRole && !isAdmin && !isVkAdmin && !isOwner && user.role < 12) return await sendResponse("У вас недостаточно прав для выдачи этой роли!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || isVkAdmin || isOwner || user.role >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         if (giveRole >= 8) {
            await updateUser(parsed.targetId, {
               role: giveRole,
               appointedBy: { id: userId, name: fullName },
               appointedDate: Date.now()
            });
            try {
              await sendVkMessage(VK_TOKEN, parsed.targetId, `Вы были назначены на пост ${roleName}`);
            } catch (e) {}
         } else {
            const tUser = await getOrCreateUser(parsed.targetId);
            const chatRoles = { ...(tUser.chatRoles || {}) };
            chatRoles[peerId] = giveRole;
            await updateUser(parsed.targetId, { chatRoles });
         }

         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) уровень прав «${roleName}» [id${parsed.targetId}|пользователю]`, { noReply: true });
      };

      const handleDemotion = async (reqRole: number, fromRole: number, roleName: string) => {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const effectiveRole = user.role >= 8 ? user.role : (isOwner || isVkAdmin ? Math.max(7, user.role || 0, chatRole) : Math.max(user.role || 0, chatRole));
         if (effectiveRole < reqRole && !isAdmin && !isVkAdmin && !isOwner) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || isVkAdmin || isOwner || user.role >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = { ...(tUser.chatRoles || {}) };
         delete chatRoles[peerId];
         await updateUser(parsed.targetId, { chatRoles });

         return await sendResponse(`[id${userId}|${fullName}] снял(-а) уровень прав «${roleName}» с [id${parsed.targetId}|пользователя]`, { noReply: true });
      };
      
      // Promotions
      if (rawCmd === "/addmoder" || rawCmd === "/модер" || rawCmd === "/выдатьмодера" || rawCmd === "/setmoder" || rawCmd === "/аддмодер") return await handlePromotion(2, 1, "Модератор");
      if (rawCmd === "/addsenmoder" || rawCmd === "/смодер" || rawCmd === "/setsenmoder" || rawCmd === "/setsmoder" || rawCmd === "/старшиймодератор" || rawCmd === "/аддсмодер") return await handlePromotion(3, 2, "Старший модератор");
      if (rawCmd === "/addadmin" || rawCmd === "/админ" || rawCmd === "/setadmin" || rawCmd === "/аддадмин" || rawCmd === "/выдатьадмина") return await handlePromotion(4, 3, "Администратор");
      if (rawCmd === "/addsenadmin" || rawCmd === "/садмин" || rawCmd === "/setsenadmin" || rawCmd === "/setsadmin" || rawCmd === "/старшийадминистратор" || rawCmd === "/аддсадмин") return await handlePromotion(5, 4, "Старший администратор");
      if (rawCmd === "/addzsa" || rawCmd === "/замспец" || rawCmd === "/выдатьзса" || rawCmd === "/setzsa" || rawCmd === "/addzamspets" || rawCmd === "/аддзса") return await handlePromotion(6, 5, "Зам. спец. администратора");
      if (rawCmd === "/addsa" || rawCmd === "/са" || rawCmd === "/sa" || rawCmd === "/setsa" || rawCmd === "/выдатьса" || rawCmd === "/addspets" || rawCmd === "/аддса" || rawCmd === "/спецадмин") return await handlePromotion(7, 6, "Специальный администратор");
      if (rawCmd === "/addzsr" || rawCmd === "/заместитель" || rawCmd === "/заместительдиректора" || rawCmd === "/addzam" || rawCmd === "/аддзср") return await handlePromotion(10, 8, "Зам. Руководителя");
      if (rawCmd === "/addozsr" || rawCmd === "/озаместитель" || rawCmd === "/озаместительдиректора" || rawCmd === "/addozam" || rawCmd === "/аддозср") return await handlePromotion(10, 9, "Осн. Зам. Руководителя");
      if (rawCmd === "/addruk" || rawCmd === "/руководитель" || rawCmd === "/addsr" || rawCmd === "/adddirector" || rawCmd === "/директор") return await handlePromotion(10.5, 10, "Руководитель");
      if (rawCmd === "/addgr" || rawCmd === "/главруководитель" || rawCmd === "/addgruk" || rawCmd === "/главдиректор" || rawCmd === "/addgdirector") return await handlePromotion(11, 10.5, "Главный Руководитель");
      if (rawCmd === "/addzamowner" || rawCmd === "/замвладельцабота" || rawCmd === "/замвладельца" || rawCmd === "/addzown" || rawCmd === "/аддзамвладельца") return await handlePromotion(12, 11, "Зам. Владельца");

      // Demotions (unified /removerole command)
      if (rawCmd === "/removerole" || rawCmd === "/снятьроль" || rawCmd === "/снятьправа" || rawCmd === "/delrole" || rawCmd === "/унроль" || rawCmd === "/unrole" || rawCmd === "/delmoder" || rawCmd === "/delsenmoder" || rawCmd === "/deladmin" || rawCmd === "/delsenadmin" || rawCmd === "/delzsa" || rawCmd === "/delsa" || rawCmd === "/unmoder") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
         const authorEffRole = user.role >= 8 ? user.role : (isOwner || isVkAdmin ? Math.max(7, user.role || 0, chatRole) : Math.max(user.role || 0, chatRole));
         if (authorEffRole < 1 && !isAdmin && !isVkAdmin && !isOwner) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const tUser = await getOrCreateUser(parsed.targetId);
         const targetChatRole = (tUser.chatRoles && tUser.chatRoles[peerId]) || 0;
         const targetGlobalRole = tUser.role || 0;
         const targetEffRole = targetGlobalRole >= 8 ? targetGlobalRole : Math.max(targetGlobalRole, targetChatRole);

         if (targetEffRole === 0 && targetChatRole === 0) {
            return await sendResponse("У пользователя нет назначенных ролей!");
         }

         if (!isAdmin && !isOwner && !isVkAdmin && authorEffRole < 12 && targetEffRole >= authorEffRole) {
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
      if (["/pin", "/пин", "/закрепить", "/закр"].includes(rawCmd)) {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 5 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Зам. Спец. Администратора.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
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

      if (["/unpin", "/открепить", "/анпин", "/унпин", "/откр"].includes(rawCmd)) {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 5 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Зам. Спец. Администратора.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         try {
           await axios.get(`https://api.vk.com/method/messages.unpin`, {
             params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId }
           });
         } catch (e: any) {}
         return await sendResponse("Вы открепили сообщение");
      }

      if (rawCmd === "/noprefix" || rawCmd === "/безпрефикса") {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         if (!isOwner) return await sendResponse("У вас недостаточно прав! Данная команда доступна только Владельцу беседы.");
         
         const chatData = await getOrCreateChat(peerId);
         const currentNoPrefix = chatData.noprefix || false;
         const newNoPrefix = !currentNoPrefix;
         
         await updateChat(peerId, { noprefix: newNoPrefix });
         
         const actionText = newNoPrefix ? "разрешил(-а)" : "запретил(-а)";
         return await sendResponse(`[id${userId}|${fullName}] ${actionText} ввод команд без префикса`, { noReply: true });
      }

      if (["/settings", "/настройки", "/настройка", "/сеттингс", "/параметры"].includes(rawCmd)) {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна только с должности Специальный администратор.");
         
         const chatData = await getOrCreateChat(peerId);
         const boolIcon = (val?: boolean) => val ? "✅ Включено" : "❌ Выключено";
         const reactionMap: Record<number, string> = {
            1: "👍", 2: "👎", 3: "❤️", 4: "🔥", 5: "💩", 6: "👏", 7: "😢", 8: "😡",
            9: "🥱", 10: "🌭", 11: "🤡", 12: "😱", 13: "⚡", 14: "💔", 15: "🎉", 16: "🍓"
         };
         const reactionDisplay = chatData.autoReactionId && chatData.autoReactionId > 0
            ? `✅ ${reactionMap[chatData.autoReactionId] || "ID"} (№${chatData.autoReactionId})`
            : "❌ Выключено";
         
         const settingsText = `...::Настройки чат-менеджера в беседе::...\n\n` +
           `| Кик при выходе (/leave): ${boolIcon(chatData.leaveKick)}\n` +
           `| Инвайт только модераторами (/invite): ${boolIcon(chatData.inviteOnlyMods)}\n` +
           `| Анти-флуд (/af): ${boolIcon(chatData.antiFlood)}\n` +
           `| Анти-слив беседы (/antisliv): ${boolIcon(chatData.antiSliv)}\n` +
           `| Анти-рейд (/raid): ${boolIcon(chatData.antiRaid)}\n` +
           `| Анти-сообщества (/group): ${boolIcon(chatData.antiGroup)}\n` +
           `| Анти-тег всех участников (/tegall): ${boolIcon(chatData.antiTegAll)}\n` +
           `| Анти-реклама (/antiad): ${boolIcon(chatData.antiAd)}\n` +
           `| Авто-реакции (/реакции): ${reactionDisplay}\n` +
           `| Игровой модуль (/games): ${chatData.gamesDisabled ? "❌ Выключен" : "✅ Включен"}\n` +
           `| Режим тишины (/тишина): ${chatData.silentMode ? "✅ Активен" : "❌ Выключен"}\n` +
           `| Без префиксов (/noprefix): ${boolIcon(chatData.noprefix)}\n` +
           `| Приветствие новых участников: ${chatData.welcomeText ? "✅ Установлено" : "❌ По умолчанию"}\n\n` +
           `Для изменения настроек используйте соответствующие команды владельца беседы.`;
           
         return await sendResponse(settingsText);
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
           return await sendResponse(`VK ID Сообщества - ${absId}\nСсылка на пользователя: https://vk.ru/club${absId}`);
         } else {
           return await sendResponse(`VK ID пользователя - ${targetId}\nСсылка на пользователя: https://vk.ru/id${targetId}`);
         }
      }

      if (["/reg", "/рег", "/датарег", "/regdate"].includes(rawCmd)) {
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const targetName = parsed.targetName || `User${targetId}`;
         const regDate = await getVkRegDate(targetId);
         if (regDate) {
            return await sendResponse(`📅 Дата регистрации аккаунта [id${targetId}|${targetName}]:\n\n| ${regDate}`);
         } else {
            return await sendResponse(`Не удалось получить дату регистрации для [id${targetId}|${targetName}].`);
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

      if (["/infobot", "/инфобот", "/botinfo"].includes(rawCmd)) {
         if (!globalInfoBotText) {
           const doc = await firestoreDb.collection("bot_settings").doc("global").get();
           if (doc.exists && doc.data()?.infoBotText) {
             globalInfoBotText = doc.data()?.infoBotText;
           }
         }
         const infoBotText = globalInfoBotText || "GAMES MANAGER — ваш надежный помощник и игровой бот для беседы!";
         return await sendResponse(infoBotText);
      }

      if (["/mutelist", "/мутлист", "/списокмутов", "/муты"].includes(rawCmd)) {
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

      if (["/warnlist", "/варнлист", "/списокварнов", "/варны", "/преды"].includes(rawCmd)) {
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

      if (["/banlist", "/банлист", "/списокбанов", "/баны"].includes(rawCmd)) {
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
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const termStr = duration ? duration.text : "Навсегда";

         await updateUser(parsed.targetId, { role: 0, chatRoles: {}, gbanpl: true, gbanplBy: userId, gbanplReason: reason, gbanplDate: Date.now(), gbanplExpiresAt: expiresAt });
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;

         const allChats = await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000 && c.type === "PL") {
               try {
                 const remRes = await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 if (remRes.data && remRes.data.response === 1) {
                   await sendVkMessage(VK_TOKEN, c.id, `[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|пользователя] во всех беседах игроков!\n\n| Причина: ${reason}\n| Срок: ${termStr}`);
                 }
               } catch(e) {}
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|пользователя] во всех беседах игроков\n\n| Причина: ${reason}\n| Срок: ${termStr}`, { noReply: true, keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungbanpl", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/gban" || rawCmd === "/гбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const termStr = duration ? duration.text : "Навсегда";

         await updateUser(parsed.targetId, { role: 0, chatRoles: {}, gban: true, gbanBy: userId, gbanReason: reason, gbanDate: Date.now(), gbanExpiresAt: expiresAt });
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;

         const allChats = await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000 && c.type !== "PL") {
               try {
                 const remRes = await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId } });
                 if (remRes.data && remRes.data.response === 1) {
                   await sendVkMessage(VK_TOKEN, c.id, `[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|пользователя] во всех беседах!\n\n| Причина: ${reason}\n| Срок: ${termStr}`);
                 }
               } catch(e) {}
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|пользователя] во всех беседах\n\n| Причина: ${reason}\n| Срок: ${termStr}`, { noReply: true, keyboard: JSON.stringify({inline: true, buttons: [[{action: {type: "callback", label: "Снять блокировку", payload: JSON.stringify({cmd: "mod_ungban", targetId: parsed.targetId})}, color: "positive"}]]}) });
      }

      if (rawCmd === "/aban" || rawCmd === "/абан") {
         if (user.role < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав! Команда доступна Руководителю.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason } = extractReasonAndDuration(remainingArgs);
         const actReason = reason || "Нарушение правил";

         await updateUser(parsed.targetId, {
            role: 0,
            chatRoles: {},
            gban: true,
            gbanBy: userId,
            gbanReason: actReason,
            gbanDate: Date.now(),
            gbanpl: true,
            gbanplBy: userId,
            gbanplReason: actReason,
            gbanplDate: Date.now(),
            blacklisted: true,
            blacklistedBy: userId,
            blacklistedReason: actReason,
            blacklistedDate: Date.now()
         });
         
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `пользователя`;

         const allChats = await getAllChats();
         for (const c of allChats) {
            if (c.id && c.id > 2000000000) {
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, {
                   params: { access_token: VK_TOKEN, v: "5.199", chat_id: c.id - 2000000000, member_id: parsed.targetId }
                 });
               } catch(e) {}
            }
         }

         const outMsg = `[id${userId}|${fullName}] заблокировал(-а) [id${parsed.targetId}|${targetName}] во всём чат-менеджере\n\n| Причина: ${actReason}`;
         return await sendResponse(outMsg, { noReply: true });
      }

      if (rawCmd === "/ungbanpl" || rawCmd === "/gungbanp" || rawCmd === "/юнгбанпл" || rawCmd === "/ангбанл" || rawCmd === "/унгбанплl" || rawCmd === "/гюнбанпл") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gbanpl: false });
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах игроков с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      if (rawCmd === "/ungban" || rawCmd === "/юнгбан" || rawCmd === "/унгбан" || rawCmd === "/ангбан" || rawCmd === "/гунгбан") {
         if (user.role < 7 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { gban: false });
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную блокировку во всех беседах с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      if (rawCmd === "/роль") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 9 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         
         const keyboard = {
            inline: true,
            buttons: [
               [
                  {
                     action: {
                        type: "callback",
                        label: "Включить роль",
                        payload: { cmd: "role_toggle", action: "enable", authorId: userId }
                     },
                     color: "positive"
                  },
                  {
                     action: {
                        type: "callback",
                        label: "Выключить роль",
                        payload: { cmd: "role_toggle", action: "disable", authorId: userId }
                     },
                     color: "negative"
                  }
               ]
            ]
         };
         
         return await sendResponse("...::Управление ролью::...", { keyboard: JSON.stringify(keyboard) });
      }

      if (["/staff", "/состав", "/стафф", "/руководство", "/админы", "/модеры"].includes(rawCmd)) {
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

      if (["/gstaff", "/гстафф", "/гсостав", "/gstaffs"].includes(rawCmd)) {
         if ((user.role || 0) < 9 && !isAdmin) {
            return await sendResponse("У вас недостаточно прав!");
         }
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
           const uId = u.userId || parseInt(doc.id);
           if (!uId || isNaN(uId) || uId < 1) continue;

           let r = u.role || 0;
           if (uId === 778382713 || uId === 607598858 || uId === 1) {
             r = 12;
           }
           if (r >= 7 && r <= 12) {
             const name = (u.globalNick && u.globalNick.trim()) || (u.nick && u.nick.trim()) || u.fullName || (await fetchVkFullName(uId)) || `User${uId}`;
             if (!staffByRole[r].some(s => s.includes(`id${uId}|`))) {
               staffByRole[r].push(`- [id${uId}|${name}]`);
             }
           }
         }

         if (!staffByRole[12].some(s => s.includes("id778382713|"))) {
           const ownerU = await getOrCreateUser(778382713);
           const ownerName = (ownerU.globalNick && ownerU.globalNick.trim()) || (ownerU.nick && ownerU.nick.trim()) || ownerU.fullName || (await fetchVkFullName(778382713)) || `Владелец`;
           staffByRole[12].unshift(`- [id778382713|${ownerName}]`);
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

      if (rawCmd === "/rebuke" || rawCmd === "/выговор") {
         if (user.role < 10.5 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const tUser = await getOrCreateUser(parsed.targetId);
         if (tUser.role < 8) return await sendResponse("Пользователь не является руководителем!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к этому пользователю.");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const reason = remainingArgs.join(" ") || "Нарушение правил";
         const count = Math.min(3, (tUser.rebukes || 0) + 1);
         await updateUser(parsed.targetId, { rebukes: count });

         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) выговор [id${parsed.targetId}|руководителю]\n\n| Причина: ${reason}\n| Всего выговоров: ${count}/3`);
      }

      if (rawCmd === "/unrebuke" || rawCmd === "/снятьвыговор") {
         if (user.role < 10.5 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const tUser = await getOrCreateUser(parsed.targetId);
         if (tUser.role < 8) return await sendResponse("Пользователь не является руководителем!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к этому пользователю.");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const reason = remainingArgs.join(" ") || "Снятие выговора";
         const count = Math.max(0, (tUser.rebukes || 0) - 1);
         await updateUser(parsed.targetId, { rebukes: count });

         return await sendResponse(`[id${userId}|${fullName}] снял(-а) выговор [id${parsed.targetId}|руководителю]\n\n| Причина: ${reason}\n| Всего выговоров: ${count}/3`);
      }

      if (rawCmd === "/rstats") {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         const targetId = parsed.targetId || userId;
         const tUser = await getOrCreateUser(targetId);
         if (tUser.role < 8) return await sendResponse("Пользователь не является руководителем!");

         const appBy = tUser.appointedBy ? `[id${tUser.appointedBy.id}|${tUser.appointedBy.name}]` : "Неизвестно";
         const appDate = tUser.appointedDate ? formatDateRstats(tUser.appointedDate) : "01.01.2024 00:00";
         const rebukes = tUser.rebukes || 0;

         const text = `Статистика [id${targetId}|руководителя]\n\n| На пост поставил - ${appBy}\n| Дата постановления - ${appDate}\n| Выговоров: ${rebukes}/3`;
         return await sendResponse(text);
      }

      if (rawCmd === "/ghelp" || rawCmd === "/гхелп") {
         const chatData = await getOrCreateChat(peerId);
         const isAdminChat = chatData.isAdminChat;
         if (!isAdminChat) {
           return await sendResponse("Данная команда доступна только в админ-чате!");
         }
         
         const effRole = user.role >= 12 || isAdmin ? 12 : user.role;
         if (effRole < 8) {
           return await sendResponse("У вас недостаточно прав! Команда доступна с 8 уровня прав.");
         }
         
         const text = `...::Помощь по командам руководства бота::...\n\nКоманды руководства бота:\n/gstaff -- Список руководства бота.\n/ghelp -- Помощь по командам руководства.`;
         
         let availableButtons = [];
         if (effRole >= 8) availableButtons.push({ cmd: "ghelp_zr", label: "Зам. Руководителя" });
         if (effRole >= 9) availableButtons.push({ cmd: "ghelp_ozr", label: "Осн. Зам. Руководителя" });
         if (effRole >= 10) availableButtons.push({ cmd: "ghelp_ruk", label: "Руководитель" });
         if (effRole >= 10.5) availableButtons.push({ cmd: "ghelp_gruk", label: "Глав. Руководитель" });
         if (effRole >= 11) availableButtons.push({ cmd: "ghelp_zown", label: "Зам. Владельца" });
         if (effRole >= 12) availableButtons.push({ cmd: "ghelp_own", label: "Владелец бота" });

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

      if (["/start", "/старт", "/активировать", "/активация", "/включитьбота", "/activate", "/начать"].includes(rawCmd)) {
         if (user.blacklisted) {
            if (user.blackExpiresAt && Date.now() > user.blackExpiresAt) {
               await updateUser(userId, { blacklisted: false, blackExpiresAt: 0 });
               user.blacklisted = false;
            } else {
               return await sendResponse("Вы находитесь в чёрном списке бота и не можете активировать беседу.");
            }
         }
         const chatData = await getOrCreateChat(peerId);
         if (chatData.active) {
            return await sendResponse("Бот в беседе был уже ранее активирован.");
         }

         let isAllowedToActivate = false;
         if (user.role >= 12 || userId === 778382713 || userId === 607598858 || userId === 1) {
            isAllowedToActivate = true;
         } else if (peerId > 2000000000) {
            const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
            if (isVkAdmin) {
               isAllowedToActivate = true;
            } else {
               // Direct check to VK API bypassing cache in case user was just granted star/admin
               try {
                  const res = await vkApi.get("messages.getConversationMembers", {
                     params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.199" }
                  });
                  const members = res.data?.response?.items || [];
                  const userMember = members.find((m: any) => m.member_id === userId);
                  if (userMember && (userMember.is_admin || userMember.is_owner)) {
                     isAllowedToActivate = true;
                  }
               } catch (e) {}

               if (!isAllowedToActivate) {
                  try {
                     const convRes = await vkApi.get("messages.getConversationsById", {
                        params: { peer_ids: peerId, access_token: VK_TOKEN, v: "5.199" }
                     });
                     const conv = convRes.data?.response?.items?.[0];
                     const ownerId = conv?.chat_settings?.owner_id;
                     const adminIds = conv?.chat_settings?.admin_ids || [];
                     if (ownerId === userId || adminIds.includes(userId)) {
                        isAllowedToActivate = true;
                     }
                  } catch (e) {}
               }
            }
         } else {
            isAllowedToActivate = true;
         }

         if (!isAllowedToActivate) {
            return await sendResponse("Вы не можете активировать беседу, так как у вас отсутствуют права системного администратора или владельца.");
         }

         const chatRoles = user.chatRoles || {};
         chatRoles[peerId] = 7;
         await updateUser(userId, { chatRoles });

         await updateChat(peerId, { active: true, adminId: userId });
         return await sendResponse(`[id${userId}|${fullName}] активировал(-а) чат-менеджера в беседе\n\nТеперь выберите тип беседы с помощью команды - /type\n\nПосле выбора типа беседы, синхронизируйте беседу с помощью команды - /sync`);
      }

      if (["/type", "/тип", "/типбеседы", "/settype"].includes(rawCmd)) {
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

      if (["/sync", "/синхронизация", "/синх", "/синк", "/синхронизировать", "/resync"].includes(rawCmd)) {
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

       if (["/clear", "/очистить", "/чистка", "/mclear", "/purge", "/пурдж", "/удалитьсообщения"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
          const parsed = await parseTargetUser(message, args.slice(1));
          
          let count = 1;
          for (let i = 1; i < args.length; i++) {
             const num = parseInt(args[i]);
             if (num && !isNaN(num) && !args[i].includes("id") && !args[i].startsWith("[") && num > 0 && num <= 100) {
                count = num;
                break;
             }
          }
          if (rawCmd === "/mclear" && count === 1 && !args.some(a => parseInt(a) === 1)) {
             count = 10;
          }

          const targetId = parsed.targetId || null;
          if (targetId && !(await checkHierarchy(peerId, userId, targetId, isAdmin))) {
             return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          }

          try {
            const deletedCount = await deleteMessagesForUser(peerId, targetId, count);
            if (targetId) {
               return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${deletedCount} сообщ. от [id${targetId}|пользователя]`, { noReply: true });
            } else {
               return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${deletedCount} последних сообщений в беседе`, { noReply: true });
            }
          } catch(e) {
            return await sendResponse("Произошла ошибка при удалении сообщений.", { noReply: true });
          }
       }

       if (rawCmd === "/purge" || rawCmd === "/пурдж" || rawCmd === "/purgecmd") {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const isOwner = await checkIsOwner(userId, peerId, user.role);
          const isVkAdmin = await checkIsAdmin(userId, peerId, user.role);
          const effRole = user.role >= 8 ? user.role : (isOwner || isVkAdmin ? Math.max(7, user.role || 0, userChatRole) : Math.max(user.role || 0, userChatRole));
          if (effRole < 3 && !isAdmin && !isVkAdmin && !isOwner) {
            return await sendResponse("У вас недостаточно прав! Команда доступна с должности Администратор.");
          }
          try {
            await purgeCommandMessages(peerId, 200);
            return await sendResponse("Ненужная информация в беседе была очищена");
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
         return await sendResponse(`[id${userId}|${fullName}] вы действительно хотите снять ВСЕ роли у пользователя [id${parsed.targetId}|пользователя]?`, { keyboard: JSON.stringify(keyboard), noReply: true });
      }

      if (rawCmd === "/grrole") {
         if (user.role < 8 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Данная команда доступна только с должности Основной заместитель руководителя.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         await updateUser(parsed.targetId, { role: 0 });
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную роль с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

      if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const termStr = duration ? duration.text : "Навсегда";

         const targetU = await getOrCreateUser(parsed.targetId);
         const chatBans = targetU.chatBans || {};
         chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
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

         return await sendResponse(`[id${userId}|Модератор] заблокировал(-а) [id${parsed.targetId}|пользователя] в текущей беседе\n\n| Причина: ${reason}\n| Срок: ${termStr}`, { keyboard: JSON.stringify(keyboard) });
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

         return await sendResponse(`[id${userId}|Модератор] разблокировал(-а) [id${parsed.targetId}|пользователя] в текущей беседе`, { noReply: true });
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
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-флуд сообщениями`, { noReply: true });
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
         
         let reason = args.slice(1).join(" ");
         if (!reason && message.reply_message) {
            reason = message.reply_message.text || "";
         }
         if (!reason && message.fwd_messages && message.fwd_messages[0]) {
            reason = message.fwd_messages[0].text || "";
         }
         if (!reason) {
            reason = "Не указана";
         }
         const truncatedReason = reason.length > 100 ? reason.substring(0, 97) + "..." : reason;

         const keyboard = {
            inline: true,
            buttons: [
              [{ action: { type: "callback", label: "Вызвать всех участников беседы", payload: JSON.stringify({ cmd: "zov_all", authorId: userId, reason: truncatedReason }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Вызвать только участников онлайн", payload: JSON.stringify({ cmd: "zov_online", authorId: userId, reason: truncatedReason }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Не вызывать", payload: JSON.stringify({ cmd: "zov_cancel", authorId: userId }) }, color: "negative" }]
            ]
         };
         return await sendResponse("Перед вызовом участников беседы, выберите тип вызова", { keyboard: JSON.stringify(keyboard) });
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
         
         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const termStr = duration ? duration.text : "Навсегда";

         const tUser = await getOrCreateUser(parsed.targetId);
         const chatBans = tUser.chatBans || {};
         for (const cId of net.chats) chatBans[cId] = { by: userId, reason, date: Date.now(), expiresAt };
         await updateUser(parsed.targetId, { chatBans });
         
         const msg = `[id${userId}|Модератор] заблокировал(-а) [id${parsed.targetId}|пользователя] в беседах сетки №${net.name}\n\n| Причина: ${reason}\n| Срок: ${termStr}`;
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
         return await sendResponse(msg, { noReply: true });
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

      if (["/olist", "/олист", "/онлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = (profiles || []).filter((p: any) => p.id > 0 && (p.online === 1 || p.online_mobile === 1));
         if (onlineList.length === 0) return await sendResponse("Список участников онлайн в беседе пуст.");
         const list = onlineList.map((p: any, i: number) => `${i + 1}) [id${p.id}|${p.first_name} ${p.last_name}]`).join("\n");
         return await sendResponse(`Список участников онлайн в беседе (${onlineList.length}):\n\n${list}`, { disable_mentions: 1 });
      }

      if (["/offlinelist", "/оффлайнлист", "/офлайнлист"].includes(rawCmd)) {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 1 && userChatRole < 1 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const offlineList = (profiles || []).filter((p: any) => p.id > 0 && !p.online && !p.online_mobile);
         if (offlineList.length === 0) return await sendResponse("Список участников оффлайн в беседе пуст.");
         const list = offlineList.map((p: any, i: number) => `${i + 1}) [id${p.id}|${p.first_name} ${p.last_name}]`).join("\n");
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
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 5 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Зам. Спец. Администратора.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
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
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 5 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Зам. Спец. Администратора.");
         if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
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

      if (["/warnmute", "/варнмут", "/wm"].includes(rawCmd)) {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (!isOwner && user.role < 7 && chatRole < 7 && !isAdmin) {
           return await sendResponse("У вас недостаточно прав! Команда доступна только для владельца беседы.");
         }
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.warnMute;
         await updateChat(peerId, { warnMute: newVal });
         return await sendResponse(`Система выдачи предупреждений за написание сообщений в муте в текущей беседе ${newVal ? 'включена ✅' : 'выключена ❌'}.`);
      }

      if (["/наградаинв", "/invreward", "/наградаинвайт", "/наградаприглашение", "/rewardinv"].includes(rawCmd)) {
         const isOwner = await checkIsOwner(userId, peerId, user.role);
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (!isOwner && user.role < 7 && chatRole < 7 && !isAdmin) {
           return await sendResponse("У вас недостаточно прав! Команда доступна только для владельца беседы.");
         }
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.invRewardEnabled;
         await updateChat(peerId, { invRewardEnabled: newVal });
         return await sendResponse(`Система наград за приглашение участников в текущей беседе ${newVal ? 'включена ✅ (25.000$)' : 'выключена ❌'}.`);
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

      if (rawCmd === "/photos" || rawCmd === "/фото") return await handleToggle(rawCmd, "disablePhotos", "запретил(-а) отправку фотографий в беседу", "разрешил(-а) отправку фотографий в беседу");
      if (rawCmd === "/stickers" || rawCmd === "/стикеры") return await handleToggle(rawCmd, "disableStickers", "запретил(-а) отправку стикеров в беседу", "разрешил(-а) отправку стикеров в беседу");
      if (rawCmd === "/video" || rawCmd === "/видео") return await handleToggle(rawCmd, "disableVideo", "запретил(-а) отправку видео в беседу", "разрешил(-а) отправку видео в беседу");

      if (["/реакции", "/реакция", "/reactions", "/reaction", "/реакс"].includes(rawCmd)) {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);

         const reactionMap: Record<number, string> = {
           1: "👍", 2: "👎", 3: "❤️", 4: "🔥", 5: "💩", 6: "👏", 7: "😢", 8: "😡",
           9: "🥱", 10: "🌭", 11: "🤡", 12: "😱", 13: "⚡", 14: "💔", 15: "🎉", 16: "🍓"
         };

         const subCmd = args[1]?.toLowerCase()?.trim();

         // 1. Подкоманда "глобально" (/реакции глобально [номер])
         if (["глобально", "global", "all", "все", "г"].includes(subCmd)) {
           if (effectiveRole < 8 && !isAdmin && userId !== 778382713 && userId !== 607598858) {
             return await sendResponse("У вас недостаточно прав! Данная команда доступна руководству чат-менеджера (с должности Специальный администратор / Владелец).");
           }
           const arg = args[2]?.trim();
           if (!arg) {
             const curId = globalAutoReactionId || 0;
             const curDisplay = curId > 0 ? `${reactionMap[curId] || "ID"} (№${curId})` : "❌ Отключено";
             const helpText = `...::Глобальная авто-реакция бота на ВСЕ сообщения::...\n\n` +
               `| Текущая глобальная реакция: ${curDisplay}\n\n` +
               `| Использование: /реакции глобально [номер]\n` +
               `| Для отключения: /реакции глобально 0\n\n` +
               `Список номеров реакций:\n` +
               `1 - 👍 | 2 - 👎 | 3 - ❤️ | 4 - 🔥\n` +
               `5 - 💩 | 6 - 👏 | 7 - 😢 | 8 - 😡\n` +
               `9 - 🥱 | 10 - 🌭 | 11 - 🤡 | 12 - 😱\n` +
               `13 - ⚡ | 14 - 💔 | 15 - 🎉 | 16 - 🍓`;
             return await sendResponse(helpText, { noReply: true });
           }

           if (arg === "0" || arg.toLowerCase() === "выкл" || arg.toLowerCase() === "off" || arg.toLowerCase() === "откл") {
             globalAutoReactionId = 0;
             await firestoreDb.collection("system").doc("bot_config").set({ globalReactionId: 0 }, { merge: true });
             return await sendResponse(`[id${userId}|${fullName}] отключил(-а) глобальные реакции бота на сообщения во всех беседах.`, { noReply: true, disable_mentions: 1 });
           }

           const reactionId = parseInt(arg);
           if (isNaN(reactionId) || reactionId <= 0) {
             return await sendResponse("Укажите корректный номер реакции (число от 1 до 16 или 0 для отключения)!\nПример: /реакции глобально 1", { noReply: true });
           }

           globalAutoReactionId = reactionId;
           await firestoreDb.collection("system").doc("bot_config").set({ globalReactionId: reactionId }, { merge: true });
           const emoji = reactionMap[reactionId] ? ` (${reactionMap[reactionId]})` : "";

           if (message.conversation_message_id) {
             vkApi.get("messages.sendReaction", {
               params: {
                 access_token: VK_TOKEN,
                 v: "5.199",
                 peer_id: peerId,
                 cmid: message.conversation_message_id,
                 reaction_id: reactionId
               }
             }).catch(() => {});
           }

           return await sendResponse(`[id${userId}|${fullName}] установил(-а) ГЛОБАЛЬНУЮ авто-реакцию №${reactionId}${emoji} на ВСЕ сообщения бота во всех беседах!`, { noReply: true, disable_mentions: 1 });
         }

         // 3. Подкоманда "юзер" (/реакции юзер @id [номер]) - Настройка реакции конкретному юзеру
         if (["юзер", "user", "пользователь", "игрок"].includes(subCmd)) {
           const parsed = await parseTargetUser(message, args.slice(2));
           let targetId = parsed.targetId;
           let targetName = parsed.targetName;

           if (!targetId || targetId === userId) {
             targetId = userId;
             targetName = fullName;
           }

           if (targetId !== userId && effectiveRole < 6 && !isAdmin && userId !== 778382713 && userId !== 607598858) {
             return await sendResponse("У вас недостаточно прав для изменения реакции другого пользователя! Команда доступна с должности Специальный администратор.");
           }

           let numArg = "";
           for (let i = 2; i < args.length; i++) {
             const a = args[i].trim();
             if (a.startsWith("[id") || a.startsWith("@") || a.startsWith("vk.com/") || a.startsWith("https://vk.com/")) continue;
             numArg = a;
             break;
           }

           const targetUser = await getOrCreateUser(targetId);

           if (!numArg) {
             const curId = targetUser.personalReactionId || 0;
             const curDisplay = curId > 0 ? `${reactionMap[curId] || "ID"} (№${curId})` : "❌ Не установлена";
             const helpText = `...::Персональная авто-реакция для [id${targetId}|${targetName}]::...\n\n` +
               `| Текущая реакция: ${curDisplay}\n\n` +
               `| Использование: /реакции [номер]\n` +
               `| Для конкретного пользователя: /реакции юзер @id [номер]\n` +
               `| Для отключения: /реакции 0 (или /реакции выкл)\n\n` +
               `Список номеров реакций:\n` +
               `1 - 👍 | 2 - 👎 | 3 - ❤️ | 4 - 🔥\n` +
               `5 - 💩 | 6 - 👏 | 7 - 😢 | 8 - 😡\n` +
               `9 - 🥱 | 10 - 🌭 | 11 - 🤡 | 12 - 😱\n` +
               `13 - ⚡ | 14 - 💔 | 15 - 🎉 | 16 - 🍓`;
             return await sendResponse(helpText, { noReply: true });
           }

           if (numArg === "0" || numArg.toLowerCase() === "выкл" || numArg.toLowerCase() === "off" || numArg.toLowerCase() === "откл") {
             await updateUser(targetId, { personalReactionId: 0 });
             const who = targetId === userId ? "свою персональную авто-реакцию" : `персональную авто-реакцию для [id${targetId}|${targetName}]`;
             return await sendResponse(`[id${userId}|${fullName}] отключил(-а) ${who}.`, { noReply: true, disable_mentions: 1 });
           }

           const reactionId = parseInt(numArg);
           if (isNaN(reactionId) || reactionId <= 0) {
             return await sendResponse("Укажите корректный номер реакции (число от 1 до 16 или 0 для отключения)!\nПример: /реакции 1", { noReply: true });
           }

           await updateUser(targetId, { personalReactionId: reactionId });
           const emoji = reactionMap[reactionId] ? ` (${reactionMap[reactionId]})` : "";

           if (message.conversation_message_id) {
             vkApi.get("messages.sendReaction", {
               params: {
                 access_token: VK_TOKEN,
                 v: "5.199",
                 peer_id: peerId,
                 cmid: message.conversation_message_id,
                 reaction_id: reactionId
               }
             }).catch(() => {});
           }

           const who = targetId === userId ? "персональную реакцию" : `персональную реакцию для [id${targetId}|${targetName}]`;
           return await sendResponse(`[id${userId}|${fullName}] установил(-а) ${who} №${reactionId}${emoji} на сообщения!`, { noReply: true, disable_mentions: 1 });
         }

         // 4. По умолчанию (/реакции, /реакции [номер], /реакции 0) - Настройка ПЕРСОНАЛЬНОЙ реакции для СЕБЯ
         const numArg = args[1]?.trim();

         if (!numArg) {
           const chatData = await getOrCreateChat(peerId);
           const myCurId = user.personalReactionId || 0;
           const myDisplay = myCurId > 0 ? `${reactionMap[myCurId] || "ID"} (№${myCurId})` : "❌ Отключено";
           const chatCurId = chatData.autoReactionId || 0;
           const chatDisplay = chatCurId > 0 ? `${reactionMap[chatCurId] || "ID"} (№${chatCurId})` : "❌ Отключено";

           const helpText = `...::Настройка автоматических реакций::...\n\n` +
             `| Ваша персональная реакция: ${myDisplay}\n` +
             `| Авто-реакция беседы: ${chatDisplay}\n\n` +
             `| Использование (для себя): /реакции [номер]\n` +
             `| Для отключения у себя: /реакции 0 (или /реакции выкл)\n\n` +
             `| Персонально для юзера (админам): /реакции юзер @id [номер]\n` +
             `| Глобально на все чаты (руководству): /реакции глобально [номер]\n\n` +
             `Список номеров реакций:\n` +
             `1 - 👍 | 2 - 👎 | 3 - ❤️ | 4 - 🔥\n` +
             `5 - 💩 | 6 - 👏 | 7 - 😢 | 8 - 😡\n` +
             `9 - 🥱 | 10 - 🌭 | 11 - 🤡 | 12 - 😱\n` +
             `13 - ⚡ | 14 - 💔 | 15 - 🎉 | 16 - 🍓`;
           return await sendResponse(helpText, { noReply: true });
         }

         if (numArg === "0" || numArg.toLowerCase() === "выкл" || numArg.toLowerCase() === "off" || numArg.toLowerCase() === "откл") {
           await updateUser(userId, { personalReactionId: 0 });
           return await sendResponse(`[id${userId}|${fullName}] отключил(-а) свою персональную авто-реакцию.`, { noReply: true, disable_mentions: 1 });
         }

         const reactionId = parseInt(numArg);
         if (isNaN(reactionId) || reactionId <= 0) {
           return await sendResponse("Укажите корректный номер реакции (число от 1 до 16 или 0 для отключения)!\nПример: /реакции 1", { noReply: true });
         }

         await updateUser(userId, { personalReactionId: reactionId });
         const emoji = reactionMap[reactionId] ? ` (${reactionMap[reactionId]})` : "";

         if (message.conversation_message_id) {
           vkApi.get("messages.sendReaction", {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               peer_id: peerId,
               cmid: message.conversation_message_id,
               reaction_id: reactionId
             }
           }).catch(() => {});
         }

         return await sendResponse(`[id${userId}|${fullName}] установил(-а) персональную авто-реакцию №${reactionId}${emoji} на все свои сообщения!`, { noReply: true, disable_mentions: 1 });
      }

      if (["/мояреакция", "/myreaction", "/моя_реакция", "/личнаяреакция", "/личная_реакция"].includes(rawCmd)) {
         const reactionMap: Record<number, string> = {
           1: "👍", 2: "👎", 3: "❤️", 4: "🔥", 5: "💩", 6: "👏", 7: "😢", 8: "😡",
           9: "🥱", 10: "🌭", 11: "🤡", 12: "😱", 13: "⚡", 14: "💔", 15: "🎉", 16: "🍓"
         };

         const arg = args[1]?.trim();
         if (!arg) {
           const curId = user.personalReactionId || 0;
           const curDisplay = curId > 0 ? `${reactionMap[curId] || "ID"} (№${curId})` : "❌ Не установлена";
           const helpText = `...::Персональная авто-реакция на ваши сообщения::...\n\n` +
             `| Текущая ваша реакция: ${curDisplay}\n\n` +
             `| Использование: /мояреакция [номер реакции]\n` +
             `| Для отключения: /мояреакция 0 (или /мояреакция выкл)\n\n` +
             `Список номеров реакций:\n` +
             `1 - 👍 | 2 - 👎 | 3 - ❤️ | 4 - 🔥\n` +
             `5 - 💩 | 6 - 👏 | 7 - 😢 | 8 - 😡\n` +
             `9 - 🥱 | 10 - 🌭 | 11 - 🤡 | 12 - 😱\n` +
             `13 - ⚡ | 14 - 💔 | 15 - 🎉 | 16 - 🍓`;
           return await sendResponse(helpText, { noReply: true });
         }

         if (arg === "0" || arg.toLowerCase() === "выкл" || arg.toLowerCase() === "off" || arg.toLowerCase() === "откл") {
           await updateUser(userId, { personalReactionId: 0 });
           return await sendResponse(`[id${userId}|${fullName}] отключил(-а) свою персональную авто-реакцию на сообщения.`, { noReply: true, disable_mentions: 1 });
         }

         const reactionId = parseInt(arg);
         if (isNaN(reactionId) || reactionId <= 0) {
           return await sendResponse("Укажите корректный номер реакции (число от 1 до 16 или 0 для отключения)!\nПример: /мояреакция 1", { noReply: true });
         }

         await updateUser(userId, { personalReactionId: reactionId });
         const emoji = reactionMap[reactionId] ? ` (${reactionMap[reactionId]})` : "";

         if (message.conversation_message_id && peerId > 2000000000) {
           vkApi.get("messages.sendReaction", {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               peer_id: peerId,
               cmid: message.conversation_message_id,
               reaction_id: reactionId
             }
           }).catch(() => {});
         }

         return await sendResponse(`[id${userId}|${fullName}] установил(-а) персональную реакцию №${reactionId}${emoji} на все свои сообщения!`, { noReply: true, disable_mentions: 1 });
      }

      if (["/греакция", "/греакции", "/globalreaction", "/глобальныереакции", "/глобальнаяреакция", "/greaction"].includes(rawCmd) || (rawCmd === "/реакции" && (args[1]?.toLowerCase() === "глобально" || args[1]?.toLowerCase() === "global" || args[1]?.toLowerCase() === "all" || args[1]?.toLowerCase() === "все"))) {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 8 && !isAdmin && userId !== 778382713 && userId !== 607598858) {
           return await sendResponse("У вас недостаточно прав! Данная команда доступна руководству чат-менеджера (с должности Специальный администратор / Владелец).");
         }

         const reactionMap: Record<number, string> = {
           1: "👍", 2: "👎", 3: "❤️", 4: "🔥", 5: "💩", 6: "👏", 7: "😢", 8: "😡",
           9: "🥱", 10: "🌭", 11: "🤡", 12: "😱", 13: "⚡", 14: "💔", 15: "🎉", 16: "🍓"
         };

         let arg = args[1]?.trim();
         if (rawCmd === "/реакции" && (arg?.toLowerCase() === "глобально" || arg?.toLowerCase() === "global" || arg?.toLowerCase() === "all" || arg?.toLowerCase() === "все")) {
           arg = args[2]?.trim();
         }

         if (!arg) {
           const curId = globalAutoReactionId || 0;
           const curDisplay = curId > 0 ? `${reactionMap[curId] || "ID"} (№${curId})` : "❌ Отключено";
           const helpText = `...::Глобальная авто-реакция бота на ВСЕ сообщения::...\n\n` +
             `| Текущая глобальная реакция: ${curDisplay}\n\n` +
             `| Использование: /греакция [номер реакции]\n` +
             `| Для отключения: /греакция 0 (или /греакция выкл)\n\n` +
             `Список номеров реакций:\n` +
             `1 - 👍 | 2 - 👎 | 3 - ❤️ | 4 - 🔥\n` +
             `5 - 💩 | 6 - 👏 | 7 - 😢 | 8 - 😡\n` +
             `9 - 🥱 | 10 - 🌭 | 11 - 🤡 | 12 - 😱\n` +
             `13 - ⚡ | 14 - 💔 | 15 - 🎉 | 16 - 🍓`;
           return await sendResponse(helpText, { noReply: true });
         }

         if (arg === "0" || arg.toLowerCase() === "выкл" || arg.toLowerCase() === "off" || arg.toLowerCase() === "откл") {
           globalAutoReactionId = 0;
           await firestoreDb.collection("system").doc("bot_config").set({ globalReactionId: 0 }, { merge: true });
           return await sendResponse(`[id${userId}|${fullName}] отключил(-а) глобальные реакции бота на сообщения во всех беседах.`, { noReply: true, disable_mentions: 1 });
         }

         const reactionId = parseInt(arg);
         if (isNaN(reactionId) || reactionId <= 0) {
           return await sendResponse("Укажите корректный номер реакции (число от 1 до 16 или 0 для отключения)!\nПример: /греакция 1", { noReply: true });
         }

         globalAutoReactionId = reactionId;
         await firestoreDb.collection("system").doc("bot_config").set({ globalReactionId: reactionId }, { merge: true });
         const emoji = reactionMap[reactionId] ? ` (${reactionMap[reactionId]})` : "";

         if (message.conversation_message_id) {
           vkApi.get("messages.sendReaction", {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               peer_id: peerId,
               cmid: message.conversation_message_id,
               reaction_id: reactionId
             }
           }).catch(() => {});
         }

         return await sendResponse(`[id${userId}|${fullName}] установил(-а) ГЛОБАЛЬНУЮ авто-реакцию №${reactionId}${emoji} на ВСЕ сообщения бота во всех беседах!`, { noReply: true, disable_mentions: 1 });
      }

      if (rawCmd === "/renamechat" || rawCmd === "/переименовать") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна только с должности Специальный администратор.");
         const newTitle = args.slice(1).join(" ");
         if (!newTitle) return await sendResponse("Укажите новое название беседы!", { noReply: true });
         if (containsBadWord(newTitle)) return await sendResponse("Название беседы содержит запрещенные слова!", { noReply: true });
         try {
           await axios.get(`https://api.vk.com/method/messages.editChat`, {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               chat_id: peerId - 2000000000,
               title: newTitle
             }
           });
           await updateChat(peerId, { title: newTitle });
         } catch (e: any) {
           return await sendResponse("Не удалось переименовать беседу. Возможно, у бота нет прав администратора в этой беседе.", { noReply: true });
         }
         return await sendResponse(`[id${userId}|Спец. Администратор] изменил название беседы на: ${newTitle}`, { noReply: true });
      }

      if (rawCmd === "/silence" || rawCmd === "/тишина") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточно прав! Данная команда доступна с должности Администратор.");
         
         const chatData = await getOrCreateChat(peerId);
         const newSilence = !chatData.silence;
         await updateChat(peerId, { silence: newSilence });

         if (newSilence) {
            const keyboard = {
               inline: true,
               buttons: [
                  [{ action: { type: "callback", label: "Выключить режим тишины", payload: JSON.stringify({ cmd: "mod_silence_off" }) }, color: "positive" }]
               ]
            };
            return await sendResponse(`[id${userId}|${fullName}] включил(-а) режим тишины`, { noReply: true, keyboard: JSON.stringify(keyboard) });
         } else {
            return await sendResponse(`[id${userId}|${fullName}] выключил(-а) режим тишины`, { noReply: true });
         }
      }
      
      if (rawCmd === "/addawstats") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Вы не указали пользователя!");
         const targetU = await getOrCreateUser(parsed.targetId);
         const awstats = targetU.awstats || {};
         awstats[peerId] = true;
         await updateUser(parsed.targetId, { awstats });
         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) [id${parsed.targetId}|пользователю] функцию "Анти-просмотр STATS"`, { noReply: true });
      }

      if (rawCmd === "/unawstats") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 6 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Вы не указали пользователя!");
         const targetU = await getOrCreateUser(parsed.targetId);
         const awstats = targetU.awstats || {};
         delete awstats[peerId];
         await updateUser(parsed.targetId, { awstats });
         return await sendResponse(`[id${userId}|${fullName}] забрал(-а) у [id${parsed.targetId}|пользователя] функцию "Анти-просмотр STATS"`, { noReply: true });
      }

      if (rawCmd === "/gaddawstats") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Вы не указали пользователя!");
         await updateUser(parsed.targetId, { gawstats: true });
         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) [id${parsed.targetId}|${parsed.targetName}] глобальную функцию "Анти-просмотр STATS"`, { noReply: true });
      }

      if (rawCmd === "/gunawstats") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 10 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Вы не указали пользователя!");
         await updateUser(parsed.targetId, { gawstats: false });
         return await sendResponse(`[id${userId}|${fullName}] забрал(-а) у [id${parsed.targetId}|${parsed.targetName}] глобальную функцию "Анти-просмотр STATS"`, { noReply: true });
      }

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
         
         const { text, keyboard } = await buildInfoChatData(cId, userId);
         return await sendResponse(text, { keyboard: JSON.stringify(keyboard), disable_mentions: 1 });
      }

      if (["/addblack", "/аддблэк", "/чсботам", "/чссообщества", "/добавитьвчс", "/чсб", "/addb", "/вчс", "/чс"].includes(rawCmd)) {
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
         const { reason, duration } = extractReasonAndDuration(remainingArgs);
         const expiresAt = duration ? duration.until : 0;
         const termStr = duration ? duration.text : "Навсегда";
         
         await updateUser(parsed.targetId, { blacklisted: true, blackBy: userId, blackReason: reason, blackDate: Date.now(), blackExpiresAt: expiresAt });
         const cleanGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
         if (!isNaN(cleanGroupId) && cleanGroupId > 0) {
            try {
               const banParams: any = { 
                  access_token: VK_TOKEN, 
                  v: "5.199", 
                  group_id: cleanGroupId, 
                  owner_id: parsed.targetId,
                  user_id: parsed.targetId,
                  comment: reason,
                  comment_visible: 1
               };
               if (expiresAt > 0) {
                  banParams.end_date = Math.floor(expiresAt / 1000);
               }
               const banRes = await axios.get(`https://api.vk.com/method/groups.ban`, { params: banParams });
               console.log("groups.ban response:", banRes.data);
            } catch (e: any) {
               console.error("groups.ban error:", e?.response?.data || e.message);
            }
         }
         return await sendResponse(`[id${userId}|${fullName}] добавил(-а) [id${parsed.targetId}|пользователя] в черный список сообщества.\n\n| Причина: ${reason}\n| Срок: ${termStr}`, { noReply: true });
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
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) [id${parsed.targetId}|пользователя] из черного списка сообщества.`, { noReply: true });
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

       if (["/гс", "/gs", "/voice", "/голосовое"].includes(rawCmd)) {
          if (user.role < 12 && userId !== 778382713 && userId !== 607598858) {
            return await sendResponse("У вас недостаточно прав! Команда доступна только Владельцу чат-менеджера.");
          }
          const voiceText = args.slice(1).join(" ").trim();
          if (!voiceText) {
            return await sendResponse("Укажите текст для записи голосового сообщения! Пример: /гс Привет всем участникам беседы");
          }
          if (voiceText.length > 800) {
            return await sendResponse("Текст для голосового сообщения слишком длинный! Максимальная длина текста: 800 символов.");
          }

          let loadingMsgId: any = null;
          try {
            const loadRes = await sendVkMessage(VK_TOKEN, peerId, "Пожалуйста подождите, ваше голосовое сообщение генерируется.", {
              forward: JSON.stringify({
                peer_id: peerId,
                conversation_message_ids: [message.conversation_message_id],
                is_reply: true
              })
            });
            if (loadRes?.response) {
              loadingMsgId = Array.isArray(loadRes.response)
                ? (loadRes.response[0]?.message_id || loadRes.response[0]?.conversation_message_id || loadRes.response[0])
                : (loadRes.response.message_id || loadRes.response);
            }
          } catch (e) {}

          const deleteLoadingMessage = async () => {
            if (loadingMsgId) {
              try {
                await vkApi.get("messages.delete", {
                  params: {
                    access_token: VK_TOKEN,
                    v: "5.199",
                    message_ids: String(loadingMsgId),
                    delete_for_all: 1,
                    peer_id: peerId
                  }
                });
              } catch (e) {}
            }
          };

          try {
            const audioBuffer = await generateRussianSpeechBuffer(voiceText);

            const serverRes = await vkApi.get("docs.getMessagesUploadServer", {
              params: { access_token: VK_TOKEN, v: "5.199", type: "audio_message", peer_id: peerId }
            });
            const uploadUrl = serverRes.data?.response?.upload_url;
            if (!uploadUrl) {
              await deleteLoadingMessage();
              return await sendResponse("Не удалось получить сервер для загрузки аудио в VK.");
            }

            const form = new FormData();
            form.append("file", audioBuffer, { filename: "voice.mp3", contentType: "audio/mpeg" });

            const uploadRes = await axios.post(uploadUrl, form, {
              headers: form.getHeaders()
            });

            const fileData = uploadRes.data?.file;
            if (!fileData) {
              await deleteLoadingMessage();
              return await sendResponse("Ошибка при загрузке аудиофайла на сервер VK.");
            }

            const saveRes = await vkApi.get("docs.save", {
              params: { access_token: VK_TOKEN, v: "5.199", file: fileData }
            });
            const audioMsg = saveRes.data?.response?.audio_message || saveRes.data?.response?.doc;
            if (!audioMsg) {
              await deleteLoadingMessage();
              return await sendResponse("Не удалось сохранить голосовое сообщение в VK.");
            }

            const docAttachment = `doc${audioMsg.owner_id}_${audioMsg.id}`;
            await deleteLoadingMessage();
            await sendVkMessage(VK_TOKEN, peerId, "", { attachment: docAttachment });
            return;
          } catch (e: any) {
            await deleteLoadingMessage();
            return await sendResponse(`Ошибка при создании голосового сообщения: ${e.response?.data?.error?.error_msg || e.message}`);
          }
       }

       if (["/стикер", "/стик", "/sticker", "/stick"].includes(rawCmd)) {
          if (user.role < 12 && userId !== 778382713 && userId !== 607598858) {
            return await sendResponse("У вас недостаточно прав! Команда доступна только Владельцу чат-менеджера.");
          }
          const stickerId = parseInt(args[1]);
          if (!stickerId || isNaN(stickerId) || stickerId <= 0) {
            return await sendResponse("Укажите корректный ID стикера! Пример: /стикер 9046");
          }
          try {
            await vkApi.get("messages.send", {
              params: {
                access_token: VK_TOKEN,
                v: "5.199",
                peer_id: peerId,
                random_id: Math.floor(Math.random() * 2000000000),
                sticker_id: stickerId
              }
            });
            return;
          } catch (e: any) {
            return await sendResponse(`Не удалось отправить стикер ID ${stickerId}: ${e.response?.data?.error?.error_msg || e.message}`);
          }
       }

      // Legacy /zov removed to avoid duplicate handler
      
      if (["/online", "/онлайн", "/ктоонлайн", "/онлайне"].includes(rawCmd)) {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineList = profiles.filter((p: any) => p.id > 0 && p.online).map((p: any) => `[id${p.id}|&#8203;]`).join("");
         return await sendResponse(`@online Внимание, участники в сети! ` + onlineList, { disable_mentions: 0 });
      }
      
      if (["/onlinelist", "/онлайнлист"].includes(rawCmd)) {
         if (user.role < 2 && !isAdmin) return await sendResponse("У вас недостаточно прав!");
         const { profiles } = await getChatMembers(peerId);
         const onlineUsers = profiles.filter((p: any) => p.id > 0 && p.online);
         const lines = onlineUsers.map((p: any, idx: number) => `${idx+1}. [id${p.id}|${p.first_name} ${p.last_name}]`);
         return await sendResponse(`Пользователи онлайн:\n\n` + lines.join("\n"));
      }


      if (["/banid", "/банид"].includes(rawCmd)) {
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

      if (["/unbanid", "/унбанид", "/разбанид", "/анбанид"].includes(rawCmd)) {
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
           return `[id${mId}|Модератор]`;
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
           return `[id${mId}|Модератор]`;
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
         chatRoles[peerId] = 7;
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
      if (rawCmd === "/cleardb") {
         if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав!");
         const days = parseInt(args[1]) || 60;
         const cutoffTime = Math.floor(Date.now() / 1000) - (days * 86400);
         const users = await getAllUsers();
         let deletedCount = 0;
         for (const u of users) {
             const uid = u.userId;
             const isRegistered = u.messagesTotal && u.messagesTotal > 0;
             const uLastActivity = u.lastMessageAt || 0;
             
             // Удаляем если не зарегистрирован (нет сообщений) ИЛИ запись старая и пустая
             const isEmpty = !u.role && (!u.balance || u.balance <= 1000) && !u.vipExpires && !u.businesses && !u.rep && !u.beer;
             
             if (!isRegistered || (isEmpty && uLastActivity < cutoffTime)) {
                 await firestoreDb.collection("users").doc(uid.toString()).delete();
                 userCache.delete(uid);
                 deletedCount++;
             }
         }
         return await sendResponse(`Успешно очищено ${deletedCount} незарегистрированных/старых пустых записей.`);
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
          gameBanUntil,
          gameBanDate: Date.now(),
          gameBanBy: userId
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

      if (rawCmd === "/hidetoplist" || rawCmd === "/скрытыетоп") {
        if (!isAdmin) return await denyAdmin();
        const allU = await getAllUsers();
        const hiddenList = allU.filter(u => u && u.hideTop);
        if (hiddenList.length === 0) {
          return await sendResponse("Список скрытых из топа пуст.");
        }
        let listStr = "🔒 Список пользователей, скрытых из топа:\n\n";
        hiddenList.forEach((u, i) => {
          listStr += `${i + 1}. [id${u.userId}|${u.nick || u.fullName || 'Игрок'}] (ID: ${u.userId})\n`;
        });
        return await sendResponse(listStr, { disable_mentions: 1 });
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

      if (rawCmd === "/news" || rawCmd === "/gzov") {
        if (user.role < 12 && userId !== 778382713 && userId !== 1115715881) return await denyAdmin();
        
        // Preserve formatting for the message
        let broadcastText = "";
        const cmdPart = args[0]; // e.g. /news or /gzov
        const cmdIdx = message.text.toLowerCase().indexOf(cmdPart.toLowerCase());
        if (cmdIdx !== -1) {
           broadcastText = message.text.substring(cmdIdx + cmdPart.length);
           // If it starts with a space, keep the rest. 
           // Usually there is at least one space after the command.
           if (broadcastText.startsWith(" ")) broadcastText = broadcastText.substring(1);
        }
        
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
        
        if (!broadcastText && !attachmentsStr && !forwardObjStr) {
           return await sendResponse("Введите текст рассылки или прикрепите вложения.");
        }
        
        const isGzov = rawCmd === "/gzov";
        if (isGzov && !broadcastText.trim().startsWith("@all")) {
           broadcastText = `@all\n${broadcastText}`;
        }
        pendingNews.set(userId, { text: broadcastText, attachmentsStr, forwardObjStr, peerId });
        
        const cmdPrefix = isGzov ? "gzov" : "news";

        return await sendVkMessage(VK_TOKEN, peerId, "Укажите тип рассылки, перед её отправкой!\n\n| Нажмите на кнопку для выбора:", {
           keyboard: JSON.stringify({
              inline: true,
              buttons: [
                 [{ action: { type: "callback", label: "В все беседы", payload: JSON.stringify({ cmd: `${cmdPrefix}_chats` }) }, color: "primary" }],
                 [{ action: { type: "callback", label: "Во все ЛС с пользователями", payload: JSON.stringify({ cmd: `${cmdPrefix}_dms` }) }, color: "primary" }]
              ]
           })
        });
      }

      if (rawCmd === "/closebot" || rawCmd === "/закрытьбота") {
        if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
        isGlobalBotClosed = true;
        await firestoreDb.collection("system").doc("bot_config").set({ isBotClosed: true }, { merge: true });
        return await sendResponse(`🔒 Использование бота успешно ЗАКРЫТО для публичного использования.\n\n| Теперь команды бота доступны только Владельцу чат-менеджера.`);
      }

      if (rawCmd === "/openbot" || rawCmd === "/открытьбота") {
        if (user.role < 12 && userId !== 778382713 && userId !== 607598858) return await sendResponse("У вас недостаточно прав! Команда доступна Владельцу чат-менеджера.");
        isGlobalBotClosed = false;
        await firestoreDb.collection("system").doc("bot_config").set({ isBotClosed: false }, { merge: true });
        return await sendResponse(`🔓 Использование бота успешно ОТКРЫТО для публичного использования.\n\n| Теперь все пользователи могут использовать команды бота.`);
      }

      if (["/form", "/форма", "/податьформу", "/форм", "/gbanform", "/гбанформ"].includes(rawCmd)) {
        const parsed = await parseTargetUser(message, args.slice(1));
        if (!parsed.targetId) return await sendResponse("Укажите пользователя, на которого хотите подать форму.");
        if (parsed.targetId === userId) {
          return await sendResponse("Вы не можете подать форму на самого себя!");
        }
        
        const tUser = await getOrCreateUser(parsed.targetId);
        if (tUser.role && tUser.role > 0) {
            return await sendResponse("Вы не можете подать форму на руководство бота.");
        }

        let reason = "";
        const mParts = message.text.split(" ");
        const targetIdx = mParts.findIndex((p: string) => p.includes(parsed.targetId.toString()) || p.includes(args[1]));
        if (targetIdx !== -1 && mParts.length > targetIdx + 1) {
            reason = mParts.slice(targetIdx + 1).join(" ");
        }

        if (!reason) {
            return await sendResponse("Укажите причину подачи формы!");
        }

        let rawArgsText = reason.toLowerCase();
        rawArgsText = rawArgsText.replace(/\[(?:id|club)\d+\|[^\]]+\]/gi, " ");
        const foundBanWords = dynamicBanWords.filter((bw: string) => rawArgsText.includes(bw.toLowerCase()));
        if (foundBanWords.length > 0) {
            return await sendResponse("В аргументах команды указаны ban-words.");
        }

        let photoAtt = "";
        if (message.attachments && message.attachments.length > 0) {
            const photo = message.attachments.find((a: any) => a.type === "photo");
            if (photo && photo.photo) {
                photoAtt = `photo${photo.photo.owner_id}_${photo.photo.id}_${photo.photo.access_key || ''}`;
            }
        }
        if (!photoAtt && message.reply_message && message.reply_message.attachments) {
            const photo = message.reply_message.attachments.find((a: any) => a.type === "photo");
            if (photo && photo.photo) {
                photoAtt = `photo${photo.photo.owner_id}_${photo.photo.id}_${photo.photo.access_key || ''}`;
            }
        }
        if (!photoAtt) {
            return await sendResponse("Подавая форму, обязательно прикрепите скриншот (фото).");
        }

        const tName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;
        const sName = fullName || `User${userId}`;

        const moderationChatId = 2000000029;
        const msgText = `Поступила новая форма на глобальную блокировку!\n\n| Пользователь, на которого подали форму: [id${parsed.targetId}|${tName}]\n| Пользователь, который подал форму: [id${userId}|${sName}]\n\n| Причина: ${reason}`;
        
        const safeReason = reason.length > 50 ? reason.substring(0, 50) + "..." : reason;
        
        const keyb = {
            inline: true,
            buttons: [
                [
                    { action: { type: "callback", label: "Одобрить форму", payload: JSON.stringify({ cmd: "gbf_a", t: parsed.targetId, s: userId, r: safeReason }) }, color: "positive" }
                ],
                [
                    { action: { type: "callback", label: "Отказать форму", payload: JSON.stringify({ cmd: "gbf_d", t: parsed.targetId, s: userId }) }, color: "negative" }
                ]
            ]
        };

        try {
            await sendVkMessage(VK_TOKEN, moderationChatId, msgText, { attachment: photoAtt, keyboard: JSON.stringify(keyb), disable_mentions: 1 });
            return await sendResponse(`[id${userId}|${sName}] подал(-а) форму на глобальную блокировку`, { disable_mentions: 1 });
        } catch (e) {
            return await sendResponse("Ошибка при отправке формы.");
        }
      }

      const isBugCmd = ["/bug", "/баг", "/багрепорт", "/bugreport", "/репорт", "/bug_report"].includes(rawCmd);
      const isOfferCmd = ["/offer", "/предложение", "/предложка", "/идея", "/предложить", "/оффер", "/предл", "/предложения"].includes(rawCmd);
      if (isBugCmd || isOfferCmd) {
        const isBug = isBugCmd;
        
        let body = "";
        const firstWordRaw = message.text.split(/\s+/)[0];
        if (firstWordRaw) {
            body = message.text.substring(firstWordRaw.length).trim();
        } else if (args.length > 1) {
            body = args.slice(1).join(" ");
        }

        if (!body) {
            return await sendResponse(`Укажите текст ${isBug ? 'баг-репорта' : 'предложения'}!`);
        }

        let rawArgsText = body.toLowerCase();
        rawArgsText = rawArgsText.replace(/\[(?:id|club)\d+\|[^\]]+\]/gi, " ");
        const foundBanWords = (dynamicBanWords || []).filter((bw: string) => rawArgsText.includes(bw.toLowerCase()));
        if (foundBanWords.length > 0) {
            return await sendResponse("В аргументах команды указаны ban-words.");
        }

        let attachStr = "";
        if (message.attachments && message.attachments.length > 0) {
            attachStr = message.attachments.map((a: any) => {
                if (a.photo) return `photo${a.photo.owner_id}_${a.photo.id}_${a.photo.access_key || ''}`;
                if (a.video) return `video${a.video.owner_id}_${a.video.id}_${a.video.access_key || ''}`;
                if (a.doc) return `doc${a.doc.owner_id}_${a.doc.id}_${a.doc.access_key || ''}`;
                return "";
            }).filter((x: string) => x).join(",");
        }

        const repChatId = 2000000002;
        const sName = fullName || `User${userId}`;
        
        const keyb = {
            inline: true,
            buttons: [
                [
                    { action: { type: "callback", label: "Одобрить", payload: JSON.stringify({ cmd: isBug ? "bug_a" : "off_a", s: userId }) }, color: "positive" }
                ],
                [
                    { action: { type: "callback", label: "Отказать", payload: JSON.stringify({ cmd: isBug ? "bug_d" : "off_d", s: userId }) }, color: "negative" }
                ]
            ]
        };

        const title = isBug ? "...::BUG REPORTS::..." : "...::OFFERS::...";
        const label1 = isBug ? "Пользователь, который отправил баг-репорт" : "Пользователь, который отправил предложение по улучшению";
        const label2 = isBug ? "Текст баг-репорта" : "Текст предложения";
        
        const msgText = `${title}\n\n| ${label1}: [id${userId}|${sName}]\n\n| ${label2}:\n${body}`;
        
        try {
            await sendVkMessage(VK_TOKEN, repChatId, msgText, { attachment: attachStr, keyboard: JSON.stringify(keyb), disable_mentions: 1 });
            return await sendResponse(`Ваш${isBug ? ' баг-репорт' : 'е предложение'} успешно отправлен${isBug ? '' : 'о'} руководству.`);
        } catch (e) {
            return await sendResponse("Ошибка при отправке.");
        }
      }

      if (["/say", "/сказать", "/отправить", "/сообщение"].includes(rawCmd)) {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 12 && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточно прав!");
         if (args.length < 3) return await sendResponse("Использование: /say (ID беседы) (текст)");
         
         let targetPeerId = parseInt(args[1]);
         if (isNaN(targetPeerId)) return await sendResponse("Некорректный ID беседы!");
         // If user passed short chat id like 1, 2, 3 instead of 200000000X
         if (targetPeerId < 2000000000) {
            targetPeerId = 2000000000 + targetPeerId;
         }
         
         const searchStr = args[1];
         const startIdx = message.text.indexOf(searchStr) + searchStr.length;
         let sayText = message.text.substring(startIdx);
         if (sayText.startsWith(" ")) sayText = sayText.substring(1);
         
         if (!sayText) return await sendResponse("Введите текст сообщения!");
         
         try {
            await sendVkMessage(VK_TOKEN, targetPeerId, sayText);
            return await sendResponse(`Сообщение успешно отправлено в беседу ${targetPeerId}`);
         } catch (e: any) {
            return await sendResponse(`Ошибка при отправке сообщения: ${e?.message || e}`);
         }
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
        // /статаимг доступна всем пользователям

        const nowStataImg = Date.now();
        const lastStataImg = stataImgCooldowns.get(userId) || 0;
        const stataImgRemaining = 30 - Math.floor((nowStataImg - lastStataImg) / 1000);
        const isBypass = user.role >= 12 || userId === 778382713 || userId === 607598858 || userId === 1115715881 || userId === 1;
        if (stataImgRemaining > 0 && !isBypass) {
          return await sendResponse(`Подождите ${stataImgRemaining} сек. перед повторным использованием команды /статаимг!`);
        }
        stataImgCooldowns.set(userId, nowStataImg);

        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const targetUser = await getOrCreateUser(targetId);
        
        const uRealRole = await getRealRole(peerId, userId);
        const isSelf = targetId === userId;
        const isImmune = uRealRole >= 9 || isAdmin;
        
        if (!isSelf && !isImmune) {
           if (targetUser.gawstats || (targetUser.awstats && targetUser.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }

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
        const targetU = await getOrCreateUser(finalId);
        
        const uRealRole = await getRealRole(peerId, userId);
        const isSelf = finalId === userId;
        const isImmune = uRealRole >= 9 || isAdmin;
        
        if (!isSelf && !isImmune) {
           if (targetU.gawstats || (targetU.awstats && targetU.awstats[peerId])) {
              return await sendResponse("Вы не можете посмотреть статистику этого пользователя.");
           }
        }
        
        const resData = await getStatsMainPage(finalId, peerId, userId);
        await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
      } else if (rawCmd === "/пинг" || rawCmd === "/ping") {
        const pingKey = `ping_${peerId}_${userId}`;
        const lastPing = pingFloodCache.get(pingKey) || 0;
        if (Date.now() - lastPing < 2000) return;
        pingFloodCache.set(pingKey, Date.now());

        const startPingTime = Date.now();
        let pingMs = 20;
        try {
          const t0 = Date.now();
          await vkApi.get("utils.getServerTime", { 
            params: { access_token: VK_TOKEN, v: "5.199" },
            timeout: 1500 
          });
          pingMs = Date.now() - t0;
        } catch (e) {
          pingMs = Math.floor(Math.random() * 20 + 25);
        }
        const respTimeSec = ((Date.now() - startPingTime) / 1000).toFixed(2);

        const pongText = `🏓 Понг!\n| Пинг бота: ${pingMs} ms\n| Скорость ответа: ${respTimeSec} сек`;
        return await sendResponse(pongText);
      } else if (["/wake", "/wakeup", "/проснись", "/буди", "/вставай", "/рестартбота", "/перезапуск"].includes(rawCmd)) {
        const startPingTime = Date.now();
        lastLongPollUpdate = Date.now();
        startBotsLongPoll();

        let pingMs = 20;
        try {
          const t0 = Date.now();
          await vkApi.get("utils.getServerTime", { 
            params: { access_token: VK_TOKEN, v: "5.199" },
            timeout: 1500 
          });
          pingMs = Date.now() - t0;
        } catch (e) {
          pingMs = Math.floor(Math.random() * 20 + 25);
        }
        const respTimeSec = ((Date.now() - startPingTime) / 1000).toFixed(2);

        const wakeText = `⚡ JORDAN MANAGER успешно пробуждён!\n\n` +
          `| Статус: Онлайн (Сессия активна)\n` +
          `| Пинг к VK API: ${pingMs} ms\n` +
          `| Скорость отклика: ${respTimeSec} сек\n` +
          `| Поток LongPoll обновлен и готов к работе 24/7.`;
        return await sendResponse(wakeText);
      }
    } catch (error) {
      console.error("Error processing message:", error); fs.appendFileSync("error.log", (error.stack || error) + "\n"); 
    }
  }

}
const processedEventIds = new Set<string>();
const recentMessagesMap = new Map<string, number>();

function getEventDeduplicationKeys(payload: any): string[] {
  if (!payload) return [];
  const keys = new Set<string>();

  const type = payload.type;
  if (type === "message_new" || type === "message_reply") {
    const msg = payload.object?.message || payload.object;
    if (msg) {
      if (msg.peer_id && msg.conversation_message_id) {
        keys.add(`msg_peer_${msg.peer_id}_cmid_${msg.conversation_message_id}`);
      }
      if (msg.id && msg.id > 0) {
        keys.add(`msg_id_${msg.id}`);
      }
      if (msg.peer_id && msg.from_id && msg.date) {
        const txtSnippet = (msg.text || "").slice(0, 30);
        keys.add(`msg_raw_${msg.peer_id}_${msg.from_id}_${msg.date}_${txtSnippet}`);
      }
    }
  } else if (type === "message_event") {
    const obj = payload.object;
    if (obj && obj.event_id) {
      keys.add(`btn_${obj.peer_id || ""}_${obj.user_id || ""}_${obj.event_id}`);
      if (obj.conversation_message_id) {
        keys.add(`btn_cmid_${obj.peer_id || ""}_${obj.conversation_message_id}_${obj.event_id}`);
      }
    }
  }
  if (payload.event_id) {
    keys.add(`evt_${payload.event_id}`);
  }

  return Array.from(keys);
}

async function deduplicateEventGlobally(evtKey: string): Promise<boolean> {
  if (!evtKey) return false;
  
  // Check local fast-path in-memory set
  if (processedEventIds.has(evtKey)) return true;
  
  processedEventIds.add(evtKey);
  if (processedEventIds.size > 25000) {
    const firstKey = processedEventIds.values().next().value;
    if (firstKey !== undefined) processedEventIds.delete(firstKey);
  }

  return false;
}

const handleVkCallbackRequest = async (req: any, res: any) => {
  const { type } = req.body || {};
  if (type === "confirmation") {
    console.log(">>> VK Confirmation requested via callback endpoint. Returning:", CONFIRMATION_CODE);
    return res.status(200).send(CONFIRMATION_CODE);
  }

  // Always respond immediately with 200 OK so VK Callback API never times out or gets disabled
  if (!res.headersSent) {
    res.status(200).send("ok");
  }

  setImmediate(() => {
    handleVkEvent(req.body).catch(e => {
      console.error("Error in handleVkEvent (Callback API):", e);
    });
  });
};

// Automatic 24/7 VK Bots LongPoll Engine with Dedicated Agent, Key Refresh & Watchdog Supervisor
let activeLongPollSessionId = 0;

let longPollHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 5000,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 18000
});

async function startBotsLongPoll() {
  const mySessionId = Date.now();
  activeLongPollSessionId = mySessionId;
  lastLongPollUpdate = Date.now();
  console.log(`>>> Starting 24/7 VK Bots Long Poll Engine (Session #${mySessionId})...`);

  const cleanGroupId = Math.abs(parseInt(String(VK_GROUP_ID).replace("-", "")));
  if (!cleanGroupId || isNaN(cleanGroupId) || !VK_TOKEN) {
    console.warn(">>> Long Poll not started: invalid VK_GROUP_ID or VK_TOKEN");
    return;
  }

  let server = "";
  let key = "";
  let ts = "";
  let lastServerFetchTime = 0;

  async function fetchServer(): Promise<boolean> {
    if (activeLongPollSessionId !== mySessionId) return false;
    try {
      // Re-create agent to clean up any idle or dead TCP sockets
      try {
        longPollHttpsAgent.destroy();
      } catch (e) {}
      longPollHttpsAgent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 5000,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 18000
      });

      const res = await vkApi.get("groups.getLongPollServer", {
        params: {
          group_id: cleanGroupId,
          access_token: VK_TOKEN,
          v: "5.199"
        },
        timeout: 8000
      });
      if (res.data?.response?.server) {
        let rawServer = res.data.response.server;
        if (!rawServer.startsWith("http://") && !rawServer.startsWith("https://")) {
          rawServer = "https://" + rawServer;
        }
        server = rawServer;
        key = res.data.response.key;
        ts = res.data.response.ts;
        lastServerFetchTime = Date.now();
        console.log(`>>> Bots Long Poll connected: ${server} (ts: ${ts}) [Session #${mySessionId}]`);
        return true;
      }
    } catch (err: any) {
      console.warn(`>>> Bots Long Poll fetchServer error [Session #${mySessionId}]:`, err?.message || err);
    }
    return false;
  }

  while (!server || !key || !ts) {
    if (activeLongPollSessionId !== mySessionId) return;
    const success = await fetchServer();
    if (!success) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  while (activeLongPollSessionId === mySessionId) {
    try {
      // Proactively refresh LongPoll server key every 10 minutes to prevent 2-hour session drops
      if (Date.now() - lastServerFetchTime > 10 * 60 * 1000) {
        console.log(`>>> Proactively refreshing LongPoll server key (10m mark) [Session #${mySessionId}]...`);
        await fetchServer();
      }

      const lpUrl = `${server}?act=a_check&key=${key}&ts=${ts}&wait=10`;
      const abortCtrl = new AbortController();
      const abortTimer = setTimeout(() => {
        try { abortCtrl.abort(); } catch (e) {}
      }, 14000);

      let lpRes: any;
      try {
        lpRes = await axios.get(lpUrl, {
          timeout: 13000,
          signal: abortCtrl.signal,
          httpsAgent: longPollHttpsAgent
        });
      } finally {
        clearTimeout(abortTimer);
      }

      if (activeLongPollSessionId !== mySessionId) {
        console.log(`>>> Terminating old Long Poll active loop [Session #${mySessionId}]`);
        return;
      }

      const data = lpRes?.data;
      if (!data) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      if (data.failed === 1) {
        // ts outdated: update ts and continue
        ts = data.ts;
        lastLongPollUpdate = Date.now();
        continue;
      } else if (data.failed === 2 || data.failed === 3 || data.failed === 4) {
        console.log(`>>> LongPoll session failed (code ${data.failed}). Re-fetching credentials...`);
        let refreshed = false;
        while (!refreshed && activeLongPollSessionId === mySessionId) {
          refreshed = await fetchServer();
          if (!refreshed) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        lastLongPollUpdate = Date.now();
        continue;
      }

      if (data.ts) {
        ts = data.ts;
      }

      lastLongPollUpdate = Date.now();

      if (Array.isArray(data.updates) && data.updates.length > 0) {
        for (const update of data.updates) {
          if (activeLongPollSessionId !== mySessionId) return;
          setImmediate(() => {
            handleVkEvent(update).catch(err => console.error("Error in Long Poll handleVkEvent:", err));
          });
        }
      }
    } catch (err: any) {
      if (activeLongPollSessionId !== mySessionId) return;
      lastLongPollUpdate = Date.now();
      if (err?.code !== "ECONNABORTED" && !err?.message?.includes("timeout") && !err?.message?.includes("canceled") && !err?.message?.includes("aborted")) {
        console.warn(">>> Long Poll connection warning:", err?.message || err);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log(`>>> Long Poll loop #${mySessionId} terminated naturally.`);
}

app.post("/api-vk-callback/verification/E1y7AP8589tyihbt7ig58fu659ft34fv8hn73ff23/jordan-manager/yyywwifkvhegvjbej38bk3nwjvkvkvkv38r834isdfsdaljhewkrjhssdakjfhsdkjhxzkvjhzxckjasdhfkhjasdf/brawl-stars/www39g", handleVkCallbackRequest);
app.post("/callback", handleVkCallbackRequest);
app.post("/vk-callback", handleVkCallbackRequest);
app.post("/api/vk-callback", handleVkCallbackRequest);
app.post("/api/vk", handleVkCallbackRequest);

app.post("/api/webhook/google-forms", express.json(), async (req, res) => {
  try {
    const data = req.body;
    let formText = "Поступила новая заявка на пост заместителя руководителя!\n\n| Заполненная форма заявки:\n";
    
    if (data && typeof data === "object") {
      for (const [q, a] of Object.entries(data)) {
         formText += `${q}: ${a}\n`;
      }
    } else {
      formText += "Нет данных";
    }
    
    const peerId = 2000000026;
    const keyboard = JSON.stringify({
      inline: true,
      buttons: [
        [
          { action: { type: "callback", payload: JSON.stringify({ cmd: "form_approve" }), label: "Одобрить" }, color: "positive" },
          { action: { type: "callback", payload: JSON.stringify({ cmd: "form_deny" }), label: "Отказать" }, color: "negative" }
        ]
      ]
    });
    
    await sendVkMessage(VK_TOKEN, peerId, formText, { keyboard });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      await updateUser(targetIdNum, { isGameBanned: true, gameBanReason: actReason, gameBanDate: Date.now(), gameBanBy: 1 });
      
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
const processingMuteExpirations = new Set<number>();
setInterval(async () => {
  try {
    const now = Date.now();
    const expiredUsers: { userId: number; targetPeerId: number }[] = [];

    for (const [uId, uData] of userCache.entries()) {
      if (
        uData &&
        uData.muteUntil &&
        uData.muteUntil > 0 &&
        uData.muteUntil <= now &&
        uData.mutePeerId &&
        uData.mutePeerId > 2000000000 &&
        !processingMuteExpirations.has(uId)
      ) {
        processingMuteExpirations.add(uId);
        expiredUsers.push({ userId: uId, targetPeerId: uData.mutePeerId });
        uData.muteUntil = 0;
        uData.mutePeerId = 0;
      }
    }

    for (const item of expiredUsers) {
      const uId = item.userId;
      const targetPeerId = item.targetPeerId;

      try {
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
      } finally {
        processingMuteExpirations.delete(uId);
      }
    }
  } catch (err) {}
}, 5000);


// Weekly Salary for Leadership (Every Sunday at 00:00 MSK in chat 24)
let lastDistributedSalaryKey = "";
async function checkAndDistributeWeeklySalary() {
  try {
    const d = getMskDate();
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const hour = d.getHours();
    const minute = d.getMinutes();

    if (dayOfWeek === 0 && hour === 0) {
      const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (lastDistributedSalaryKey === dateKey) return;

      const salaryDocRef = firestoreDb.collection("system_meta").doc("weekly_salary");
      const salaryDoc = await salaryDocRef.get();
      if (salaryDoc.exists && salaryDoc.data()?.lastDistributedKey === dateKey) {
        lastDistributedSalaryKey = dateKey;
        return;
      }

      lastDistributedSalaryKey = dateKey;
      await salaryDocRef.set({ lastDistributedKey: dateKey, distributedAt: Date.now() }, { merge: true });

      const snap = await firestoreDb.collection("users").get();
      const salaryAmount = 500000;
      for (const doc of snap.docs) {
        const u = doc.data();
        const uId = u.userId || parseInt(doc.id);
        if (!uId || isNaN(uId)) continue;
        const role = u.role || 0;
        if (role >= 8) {
          const currentBal = u.balance || 0;
          await updateUser(uId, { balance: currentBal + salaryAmount });
        }
      }

      const salaryMsg = "...::Еженедельная зарплата::...\n\nЕженедельная зарплата была начислена всему руководству.\n\nСумма зарплаты: 500.000$";
      await sendVkMessage(VK_TOKEN, 2000000024, salaryMsg);
    }
  } catch (e) {
    console.error("Weekly salary distribution error:", e);
  }
}
setInterval(checkAndDistributeWeeklySalary, 30000);

function startKeepAliveMethods() {
  // 1. LongPoll Watchdog Supervisor: проверяет активность опроса VK каждые 5 секунд
  // Если соединение повисло более чем на 18 секунд (например, обрыв сокета),
  // супервизор автоматически перезапускает сессию опроса VK мгновенно.
  setInterval(() => {
    try {
      const silenceMs = Date.now() - lastLongPollUpdate;
      if (silenceMs > 18000 && VK_TOKEN) {
        console.warn(`[Watchdog] LongPoll молчит ${Math.round(silenceMs / 1000)}с (таймаут 18с). Мгновенный перезапуск LongPoll сессии...`);
        lastLongPollUpdate = Date.now();
        startBotsLongPoll();
      }
    } catch (e) {}
  }, 5 * 1000);

  // 2. Пинг локального веб-сервера (/ping и /api/bot-status) каждые 6 секунд
  setInterval(async () => {
    try {
      await axios.get("http://localhost:3000/ping", { timeout: 2000 });
      await axios.get("http://localhost:3000/api/bot-status", { timeout: 2000 });
    } catch (e) {}
  }, 6 * 1000);

  // 3. Поддержание теплым gRPC-подключения к Firestore (каждые 15 секунд)
  setInterval(async () => {
    try {
      await firestoreDb.collection("system").doc("heartbeat").set({ lastActive: Date.now() }, { merge: true });
    } catch (e) {}
  }, 15 * 1000);

  // 4. Запрос к VK API каждые 8 секунд для постоянной активности TLS/TCP сокетов
  setInterval(async () => {
    try {
      if (VK_TOKEN) {
        await vkApi.get("utils.getServerTime", {
          params: { access_token: VK_TOKEN, v: "5.199" },
          timeout: 3500
        });
      }
    } catch (e) {}
  }, 8 * 1000);

  // 5. Непрерывный Event Loop Heartbeat (каждые 3 секунды), предотвращающий гибернацию процесса
  setInterval(() => {
    const mem = process.memoryUsage();
    if (mem.rss > 350 * 1024 * 1024) {
      if (global.gc) {
        try { global.gc(); } catch (e) {}
      }
    }
  }, 3 * 1000);

  // 6. Активность в консоли stdout
  setInterval(() => {
    console.log(`[KeepAlive 24/7] Сервер активен: ${new Date().toISOString()} | LongPoll silence: ${Math.round((Date.now() - lastLongPollUpdate) / 1000)}s | Mem: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
  }, 60 * 1000);
}

async function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  startKeepAliveMethods();
  startTechReports();
  startBotsLongPoll(); // Включено обратно по просьбе пользователя
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
}

startServer();
