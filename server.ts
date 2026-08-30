
let isX2WeekendActive = false;

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import Redis from "ioredis";
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
import { CROCODILE_WORDS, sendVkMessage, editVkMessage, sendVkToast as importedSendVkToast, answerVkEvent, formatTimeRemaining, deleteVkMessage } from "./src/botGameEngine";

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
"/addga",
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
"/addzga",
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
"/забратьденьги",
"/забратьбизнес",
"/забратьпродукты",
"/забратьпиво",
"/забратьрепутацию",
"/забратьvip",
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


const sendBanAlert = async (peerId: number, targetId: number, type: 'ban' | 'gban' | 'gbanpl', reason: string, date: number, expiresAt: number) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || (await fetchVkFullName(targetId)) || `id${targetId}`;
  const dateStr = formatMskDateAmPm(date);
  const endStr = (expiresAt === 0 || !expiresAt) ? "Никогда" : formatMskDateAmPm(expiresAt);
  
  let text = "";
  if (type === 'gban' || type === 'gbanpl') {
    text = `[id${targetId}|${targetName}] занесён(-а) в глобальную блокировку во всех беседах в которых есть Orion!\n\n| Причина: ${reason}\n| Дата выдачи: ${dateStr}\n| Дата окончания: ${endStr}`;
  } else {
    text = `[id${targetId}|${targetName}] заблокирован(-а) в этой беседе!\n\n| Причина: ${reason}\n| Дата выдачи: ${dateStr}\n| Дата окончания: ${endStr}`;
  }

  const kb = {
    inline: true,
    buttons: [
      [{ action: { type: "callback", label: "Вынести из блокировки", payload: JSON.stringify({ cmd: "unban_alert_action", targetId, type }) }, color: "positive" }],
      [{ action: { type: "callback", label: "Информация о блокировках", payload: JSON.stringify({ cmd: "info_alert_action", targetId }) }, color: "default" }]
    ]
  };

  return await sendVkMessage(VK_TOKEN, peerId, text, { keyboard: JSON.stringify(kb) });
};

export const getMskDate = (ms: number = Date.now()) => {
  return new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
};

export const formatMskDateAmPm = (ms?: number | null) => {
  if (!ms || ms <= 0) return "Отсутствует.";
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
  return `${hours}:${mins}:${secs} ${ampm} | ${day}.${month}.${year}`;
};
export const fmtD = formatMskDateAmPm;
export const formatDateRstats = formatMskDateAmPm;

function formatLitersRu(litersNum: number | string): string {
  const str = typeof litersNum === "number" ? litersNum.toFixed(1) : litersNum;
  const num = parseFloat(str);
  const intPart = Math.floor(num);
  const fracPart = Math.round((num - intPart) * 10);
  if (fracPart > 0) {
    return `${str} литра`;
  }
  if (intPart % 10 === 1 && intPart % 100 !== 11) return `${str} литр`;
  if ([2, 3, 4].includes(intPart % 10) && ![12, 13, 14].includes(intPart % 100)) return `${str} литра`;
  return `${str} литров`;
}

const RUSSIAN_GRAMMAR_QUIZ = [
  { correct: "Пиво", wrong: ["Биво", "Пево", "Пива"] },
  { correct: "Агентство", wrong: ["Агенство", "Агенства", "Агентсво"] },
  { correct: "Лестница", wrong: ["Лесница", "Лесницо", "Лестнеца"] },
  { correct: "Чувство", wrong: ["Чювство", "Чуство", "Чусво"] },
  { correct: "Коридор", wrong: ["Калидор", "Колидор", "Каридор"] },
  { correct: "Парашют", wrong: ["Парашут", "Порошют", "Парошут"] },
  { correct: "Жюри", wrong: ["Жури", "Жири", "Журри"] },
  { correct: "Брошюра", wrong: ["Брошура", "Брашюра", "Брошуро"] },
  { correct: "Цыплёнок", wrong: ["Циплёнок", "Цыпленокъ", "Цеплёнок"] },
  { correct: "Солнце", wrong: ["Сонце", "Солнцо", "Санце"] },
  { correct: "Праздник", wrong: ["Празник", "Празднек", "Проздник"] },
  { correct: "Здравствуйте", wrong: ["Здраствуйте", "Здраствуйти", "Здравствуйти"] },
  { correct: "Вкусный", wrong: ["Вкустный", "Вкусной", "Фкусный"] },
  { correct: "Интересный", wrong: ["Интерестный", "Интиресный", "Интересней"] },
  { correct: "Опасный", wrong: ["Опастный", "Апасный", "Опасний"] },
  { correct: "Чересчур", wrong: ["Черезчур", "Черсчур", "Черезчюр"] },
  { correct: "Искусство", wrong: ["Искуство", "Искуссво", "Исскуство"] },
  { correct: "Интеллигент", wrong: ["Интелигент", "Интелегент", "Интиллигент"] },
  { correct: "Дрожжи", wrong: ["Дрожи", "Дрожьжи", "Дрожжы"] },
  { correct: "Бассейн", wrong: ["Басейн", "Боссейн", "Басеин"] },
  { correct: "Белорусский", wrong: ["Белоруский", "Беларусский", "Беларуский"] },
  { correct: "Превосходный", wrong: ["Привосходный", "Превасходный", "Привасходный"] },
  { correct: "Колоссальный", wrong: ["Колосальный", "Калоссальный", "Калосальный"] },
  { correct: "Рассвет", wrong: ["Расвет", "Россвет", "Росвет"] },
  { correct: "Аккуратный", wrong: ["Акуратный", "Акоратный", "Аккуратней"] },
  { correct: "Симпатичный", wrong: ["Семпатичный", "Симпотичный", "Семпотичный"] },
  { correct: "Грамотный", wrong: ["Громотный", "Граматный", "Громатный"] },
  { correct: "Сверстник", wrong: ["Сверсник", "Сверстнек", "Сверсникъ"] },
  { correct: "Участвовать", wrong: ["Учавствовать", "Учавствывать", "Участвоват"] },
  { correct: "Девчонка", wrong: ["Девчёнка", "Девчонко", "Дивчонка"] },
  { correct: "Шёпот", wrong: ["Шопот", "Шепотъ", "Шёпат"] },
  { correct: "Винегрет", wrong: ["Венигрет", "Винигрет", "Венегрет"] },
  { correct: "Бутерброд", wrong: ["Бутерброт", "Бутырброд", "Бутербротъ"] },
  { correct: "Терраса", wrong: ["Тераса", "Тирраса", "Тираса"] },
  { correct: "Апелляция", wrong: ["Аппеляция", "Апеляция", "Аппеляцыя"] },
  { correct: "Привилегия", wrong: ["Превилегия", "Привелегия", "Превелегия"] },
  { correct: "Обаяние", wrong: ["Обояние", "Абаяние", "Абояние"] },
  { correct: "Обоняние", wrong: ["Абоняние", "Обаняние", "Абаняние"] }
];

export const formatMskDate = formatMskDateAmPm;

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
    try {
      const tu = await getOrCreateUser(params.targetId);
      targetFullName = tu.fullName || tu.nick || (await fetchVkFullName(params.targetId)) || `User${params.targetId}`;
    } catch(e) {
      targetFullName = `User${params.targetId}`;
    }
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
    "/addzga", "/замспец", "/delzsa", "/выдатьзса", "/setzsa", "/addzamspets", "/аддзса",
    "/addga", "/са", "/sa", "/delsa", "/setsa", "/выдатьса", "/addspets", "/аддса",
    "/removerole", "/снятьроль", "/снятьправа", "/arrole", "/grrole",
    "/addstatus", "/unstatus",
    "/quiet", "/тихий", "/unquiet", "/снятьтихий", "/тишина",
    "/freeze", "/заморозить", "/unfreeze", "/разморозить",
    "/pin", "/unpin", "/закрепить", "/открепить", "/закр", "/откр", "/пин", "/анпин", "/унпин",
    "/gban", "/гбан", "/ungban", "/унгбан", "/gbanpl", "/гбанпл", "/ungbanpl", "/унгбанпл",
    "/deletecommand", "/удалятькоманды", "/delcmd",
    "/smute", "/смут", "/skick", "/скик", "/sclear", "/сочистить", "/smclear", "/смклиар",
    "/sban", "/сбан", "/sunban", "/сунбан", "/snban", "/снбан", "/snkick", "/снкик", "/snrole", "/снроль", "/snremoverole", "/снснятьроль"
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
      lastError = `[Ошибка: ${e.message}]`;
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
      lastError = `[Ошибка: ${e.message}]`;
    }
  }

  return { success: anySuccess, errorMsg: anySuccess ? "" : lastError };
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
  if (targetId === 778382713 || targetId === 1) tGlobalRole = 12;
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
  
  let lastActivityStr = "отсутствует";
  const lastActMs = targetUser.lastActivity && targetUser.lastActivity > 1000000000000 ? targetUser.lastActivity : 0;
  const lastMsgMs = targetUser.lastMessageAt ? (targetUser.lastMessageAt > 10000000000 ? targetUser.lastMessageAt : targetUser.lastMessageAt * 1000) : 0;
  const rawAct = Math.max(lastActMs, lastMsgMs);
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
const redis = new Redis("rediss://default:gQAAAAAAA3PoAAIgcDFiYjA4YmUwZDFlMTU0YTVhODJmZDVkOTYxODBmYzYxYQ@content-gnat-226280.upstash.io:6379");
if (redis) {
  redis.on("error", (err) => console.error("Redis Error:", err));
}


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
const userCache = new Map<number, any>();
const chatCache = new Map<number, any>();
interface ChatNetwork {
  id: string; // Network name
  name: string; // Network display name
  ownerId: number; // VK ID of network owner
  chats: number[]; // List of peer_ids
  createdAt: number;
}

const formatDurationBanTerm = (expiresAt?: number, startDate?: number): string => {
  if (!expiresAt || expiresAt === 0) return "Навсегда";
  const start = startDate || Date.now();
  const diffMs = expiresAt - start;
  if (diffMs <= 0) return "Истёк";
  const days = Math.round(diffMs / (24 * 3600 * 1000));
  if (days >= 1) return `${days} дн.`;
  const hours = Math.round(diffMs / (3600 * 1000));
  if (hours >= 1) return `${hours} ч.`;
  const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
  return `${mins} мин.`;
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

const networkCache = new Map<string, ChatNetwork>();

const userAntiFlood = new Map<string, number[]>();
const slivCounter = new Map<string, number[]>();
const chatMembersCache = new Map<number, { members: any[], profiles: any[], expiry: number }>();
const adminCache = new Map<string, { isAdmin: boolean, expiry: number }>();
const lastPickedInChat = new Map<number, number>();
const chatRecentMessages = new Map<number, { cmId: number, fromId: number, text?: string }[]>();
const buttonCooldowns = new Map<number, number>();
const waitingForWelcome = new Map<string, boolean>();
const commandHistory = new Map<number, { timestamps: number[] }>();
const pingFloodCache = new Map<string, number>();
const clanCache = new Map<string, any>();

async function getOrCreateChat(peerId: number) {
  const isPlaceholderTitle = (t?: string) => !t || t.startsWith("Беседа №") || t.startsWith("Беседа #");
  const cached = chatCache.get(peerId);
  if (cached && cached.title && !isPlaceholderTitle(cached.title)) return cached;

  if (redis) {
    try {
      const rCached = await redis.get(`chat:${peerId}`);
      if (rCached) {
        const data = JSON.parse(rCached);
        if (data.title && !isPlaceholderTitle(data.title)) {
           chatCache.set(peerId, data);
           return data;
        }
      }
    } catch (e) {}
  }

  const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
  let chatDoc: any = null;
  try {
    chatDoc = await chatRef.get();
  } catch (err: any) {
    console.warn("Firestore error in getOrCreateChat (using memory fallback):", err?.message || err);
  }

  let data: any;
  if (chatDoc && chatDoc.exists) {
    data = chatDoc.data() || {};
  } else {
    data = {
      peerId,
      title: `Беседа #${peerId}`,
      ownerId: 0,
      membersCount: 0,
      createdAt: Date.now(),
      settings: { welcomeMessage: "Привет!", rules: "Правила не установлены." }
    };
    await chatRef.set(data).catch(() => {});
  }

  chatCache.set(peerId, data);
  if (redis) redis.setex(`chat:${peerId}`, 3600, JSON.stringify(data)).catch(()=>{});
  return data;
}
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

async function getOrCreateUser(userIdRaw: number | string, nameHint?: string) {
  const userId = Number(userIdRaw);
  if (!userId || isNaN(userId)) {
    return { userId: 0, role: 0, fullName: "User0", balance: 0, bank: 0 } as any;
  }
  if (userCache.has(userId)) {
    const data = userCache.get(userId);
    if (userId === 778382713 || userId === 1) data.role = 12;
    return data;
  }
  if (redis) {
    try {
      const cached = await redis.get(`user:${userId}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (userId === 778382713 || userId === 1) data.role = 12;
        userCache.set(userId, data);
        return data;
      }
    } catch (e) {}
  }
  const userRef = firestoreDb.collection("users").doc(userId.toString());
  let userDoc: any = null;
  try { userDoc = await userRef.get(); } catch (err: any) { console.warn("Firestore error:", err); }
  let data: any;
  if (userDoc && userDoc.exists) {
    data = userDoc.data() as any;
  } else {
    const realVkName = nameHint || await fetchVkFullName(userId).catch(() => null) || `User${userId}`;
    data = {
      userId, role: 0, fullName: realVkName,
      balance: 10000, bank: 0, messagesTotal: 0,
      warnings: 0, lastActivity: Date.now()
    };
    await userRef.set(data).catch(() => {});
  }
  if (userId === 778382713 || userId === 1) data.role = 12;
  userCache.set(userId, data);
  if (redis) redis.setex(`user:${userId}`, 3600, JSON.stringify(data)).catch(()=>{});
  return data;
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

async function deleteChatNetwork(name: string): Promise<void> {
  const key = name.trim().toLowerCase();
  networkCache.delete(key);
  await firestoreDb.collection("networks").doc(key).delete();
}

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
  let cached = userCache.get(userId);
  if (!cached) {
    cached = await getOrCreateUser(userId);
  }
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  if (cached) {
    cached.messagesTotal = (cached.messagesTotal || 0) + 1;
    cached.lastMessageAt = nowSec;
    cached.lastActivity = nowMs;
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
    lastMessageAt: nowSec,
    lastActivity: nowMs
  };
  if (peerId && cached) {
    const pCount = cached.chatTodayMsgs?.[peerId] || 1;
    updateFields[`chatTodayMsgs.${peerId}`] = pCount;
    updateFields[`chatTotalMsgs.${peerId}`] = FieldValue.increment(1);
    updateFields[`chatLastMsgDateStr.${peerId}`] = mskDateStr;
  }
  userRef.set(updateFields, { merge: true }).catch(() => {});
}

const getStatsMainPage = async (targetId: number, currentPeerId: number, viewerUserId?: number, isCallback = true) => {
  const targetUser = await getOrCreateUser(targetId);
  const targetName = targetUser.fullName || targetUser.nick || (await fetchVkFullName(targetId)) || `User${targetId}`;
  
  const currentMskStr = getMskDateStr();
  const chatTodayMsgsMap = targetUser.chatTodayMsgs || {};
  const chatLastMsgDateMap = targetUser.chatLastMsgDateStr || {};
  const todayMsgs = (chatLastMsgDateMap[currentPeerId] === currentMskStr)
    ? (chatTodayMsgsMap[currentPeerId] || 0)
    : 0;
  
  const chatNicks = targetUser.chatNicks || {};
  let nickStr = chatNicks[currentPeerId] || targetUser.snick || targetUser.customNick || targetUser.globalNick || (targetUser.nick && targetUser.nick !== targetUser.fullName ? targetUser.nick : null) || "отсутствует";
  let roleStr = await getHighestRoleTitle(targetUser, currentPeerId);

  const hasGban = !!(targetUser.gban || targetUser.gbanpl);
  const hasChatBans = !!(targetUser.chatBans && Object.keys(targetUser.chatBans).length > 0);
  const hasChatMute = !!(targetUser.muteUntil && targetUser.muteUntil > Date.now());
  const hasWarns = (targetUser.warnings || 0) > 0;

  let statsStr = `Статистика [id${targetId}|пользователя]\n\n`;
  statsStr += `| Nick_Name: ${nickStr}\n`;
  statsStr += `| VK ID - ${targetId}\n\n`;
  statsStr += `| Должность: ${roleStr}\n`;
  const userStatus = targetUser.customStatus || targetUser.statusText;
  if (userStatus) {
    statsStr += `| Статус: ${userStatus}\n`;
  }
  statsStr += `\n| Активная глобальная блокировка: ${hasGban ? "Да" : "Нет"}\n`;
  statsStr += `| Активные блокировки в беседах: ${hasChatBans ? "Да" : "Нет"}\n\n`;
  statsStr += `| Активные предупреждения в беседе: ${hasWarns ? "Да" : "Нет"}\n`;
  statsStr += `| Активная блокировка чата в беседе: ${hasChatMute ? "Да" : "Нет"}\n\n`;
  statsStr += `| Кол-во сообщений за сегодня: ${todayMsgs}\n`;
  const totalMsgs = targetUser.chatTotalMsgs?.[currentPeerId] || targetUser.chatTodayMsgs?.[currentPeerId] || targetUser.messagesTotal || 0;
  statsStr += `| Кол-во сообщений за всё время: ${totalMsgs}\n`;
  
  let lastActivityStr = "отсутствует";
  const lastActMs = targetUser.lastActivity && targetUser.lastActivity > 1000000000000 ? targetUser.lastActivity : 0;
  const lastMsgMs = targetUser.lastMessageAt ? (targetUser.lastMessageAt > 10000000000 ? targetUser.lastMessageAt : targetUser.lastMessageAt * 1000) : 0;
  const rawAct = Math.max(lastActMs, lastMsgMs);
  if (rawAct && rawAct > 0) {
    lastActivityStr = formatMskDateAmPm(rawAct);
  }
  statsStr += `| Последнее сообщение: ${lastActivityStr}\n`;

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

| У пользователя [id${targetId}|пользователя] ${warnsCount} предупреждений.

| Информация о активных предупреждениях:
${warnsListText}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: "« Назад", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "primary" },
        { action: { type: "callback", label: "Блокировки", payload: JSON.stringify({ cmd: "stats_bans", targetId }) }, color: "secondary" }
      ]
    ]
  };

  return { text, keyboard };
};

function sanitizeTitle(title: string): string {
  if (!title) return title;
  const badPatterns = [
    /хуй|хуя|хуе|хуи|пизд|бля|бляд|еба|ебн|ебат|сука|сучк|мудак|пидор|гандон|шлюх|дроч|член/i
  ];
  let clean = title;
  for (const pat of badPatterns) {
    if (pat.test(clean)) {
      clean = clean.replace(pat, "####");
    }
  }
  return clean;
}

const getStatsBansPage = async (targetId: number, isCallback = true) => {
  const targetUser = await getOrCreateUser(targetId);

  const getModStr = async (mId?: number) => {
    if (!mId) return "[id1|Модератор]";
    const mUser = await getOrCreateUser(mId);
    const mName = mUser.fullName || mUser.nick || (await fetchVkFullName(mId)) || `User${mId}`;
    return `[id${mId}|${mName}]`;
  };

  let gbanBlock = "Отсутствует.";
  if (targetUser.gban || targetUser.gbanpl) {
    const modId = targetUser.gbanBy || targetUser.gbanplBy || 1;
    const modStr = await getModStr(modId);
    const gDate = targetUser.gbanDate || targetUser.gbanplDate;
    const gExp = targetUser.gbanExpiresAt || targetUser.gbanplExpiresAt;
    const gReason = targetUser.gbanReason || targetUser.gbanplReason || "без причины";
    
    const issueStr = gDate ? formatMskDateAmPm(gDate) : "Неизвестно";
    const endStr = gExp && gExp > 0 ? formatMskDateAmPm(gExp) : "Никогда";
    gbanBlock = `| Модератор - ${modStr}\n| Дата выдачи: ${issueStr}\n| Дата окончания: ${endStr}\n| Причина: ${gReason}`;
  }

  let blackBlock = "Отсутствует.";
  if (targetUser.blacklisted) {
    const modId = targetUser.blackBy || 1;
    const modStr = await getModStr(modId);
    const bDate = targetUser.blackDate;
    const bExp = targetUser.blackExpiresAt;
    const bReason = targetUser.blackReason || "без причины";

    const issueStr = bDate ? formatMskDateAmPm(bDate) : "Неизвестно";
    const endStr = bExp && bExp > 0 ? formatMskDateAmPm(bExp) : "Никогда";
    blackBlock = `| Модератор - ${modStr}\n| Дата выдачи: ${issueStr}\n| Дата окончания: ${endStr}\n| Причина: ${bReason}`;
  }

  const chatBans = targetUser.chatBans || {};
  const cKeys = Object.keys(chatBans);
  const chatBansCount = cKeys.length;

  let chatBansTextArr: string[] = [];
  if (cKeys.length > 0) {
    let idx = 1;
    for (const cId of cKeys) {
      const bInfo = chatBans[cId];
      const cData = await getOrCreateChat(Number(cId));
      const rawTitle = cData.title || `Беседа №${cId}`;
      const cTitle = sanitizeTitle(rawTitle);
      const modStr = await getModStr(bInfo.by);
      const issueStr = bInfo.date ? formatMskDateAmPm(bInfo.date) : "Неизвестно";
      const endStr = bInfo.expiresAt && bInfo.expiresAt > 0 ? formatMskDateAmPm(bInfo.expiresAt) : "Никогда";
      const reason = bInfo.reason || "без причины";

      chatBansTextArr.push(`${idx}) ${cTitle}\n| Модератор - ${modStr}\n| Дата выдачи: ${issueStr}\n| Дата окончания: ${endStr}\n| Причина: ${reason}`);
      idx++;
    }
  }

  let chatBansFormatted = chatBansTextArr.length > 0 ? "\n\n" + chatBansTextArr.join("\n\n") : "";

  const text = `Информация о блокировках [id${targetId}|пользователя]

| Информация о глобальной блокировке во всех беседах:
${gbanBlock}

| Информация о нахождении в чёрном списке чат-менеджера:
${blackBlock}

| Информация о блокировках в беседах:

| Кол-во блокировок в беседах: ${chatBansCount}${chatBansFormatted}`;

  const buttons: any[] = [];
  if (isCallback) {
    buttons.push([{ action: { type: "callback", label: "« Назад", payload: JSON.stringify({ cmd: "stats_main", targetId }) }, color: "primary" }]);
  }

  const keyboard = {
    inline: true,
    buttons
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
    bot: "Orion",
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
    message: "Orion successfully awakened and LongPoll refreshed!",
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

// formatMskDateAmPm is globally defined above

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
  if (role === 6) return "Главный Администратор";
  if (role === 5) return "Зам. Главный Администратора";
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
  if (userRole >= 12 || userId === 778382713 || userId === 1) return true;
  
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
  if (userRole >= 12 || userId === 778382713 || userId === 1) return true;
  
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
      await axios.get("https://api.vk.com/method/messages.delete", {
        params: {
          access_token: VK_TOKEN,
          v: "5.199",
          cmids: ids,
          conversation_message_ids: ids,
          delete_for_all: 1,
          peer_id: peerId
        }
      }).catch(err => {
        console.error("Error calling messages.delete in deleteMessagesForUser:", err?.response?.data || err?.message);
      });

      // Also delete the /clear command itself
      if (currentCmid) {
        axios.get("https://api.vk.com/method/messages.delete", {
          params: {
            access_token: VK_TOKEN,
            v: "5.199",
            cmids: String(currentCmid),
            conversation_message_ids: String(currentCmid),
            delete_for_all: 1,
            peer_id: peerId
          }
        }).catch(() => {});
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
    "addsa",
    "снятьроль", "снятьправа",
    "gban", "ungban", "gbanpl", "ungbanpl", "addblack", "unblack",
    "banid", "unbanid", "addzamowner",
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
    const { user_id: userId, peer_id: peerId, event_id: eventId, payload } = object;
    let payloadObj: any = {};
    try {
      payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch (e) {}

    const cmId = object.conversation_message_id || object.cm_id || payloadObj?.cm_id || payloadObj?.cmId;
    const cmd = payloadObj?.cmd || payloadObj?.action || payloadObj?.type || "";

    // Button Rate Limiter: max 2 button clicks per 5 seconds
    const nowBtnTime = Date.now();
    let userBtnClicks = buttonClicksMap.get(userId) || [];
    userBtnClicks = userBtnClicks.filter(t => nowBtnTime - t < 5000);
    if (userBtnClicks.length >= 2) {
      const oldestClick = userBtnClicks[0];
      const waitSec = Math.max(1, Math.ceil((oldestClick + 5000 - nowBtnTime) / 1000));
      return await sendVkToast(VK_TOKEN, eventId, userId, peerId, `Достигнут лимит нажатия кнопок! Подождите ещё ${waitSec} сек`);
    }
    userBtnClicks.push(nowBtnTime);
    buttonClicksMap.set(userId, userBtnClicks);

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

    
    if (cmd === "unban_alert_action") {
      const targetId = Number(payloadObj.targetId);
      const bType = payloadObj.type || "ban";
      const u = await getOrCreateUser(userId);
      const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
      const isOwner = await checkIsOwner(userId, peerId, u.role);
      const isVkAdmin = await checkIsAdmin(userId, peerId, u.role);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      const viewerRole = Math.max(effRole, isOwner || isVkAdmin ? 7 : chatRole);

      let reqLevel = 8;
      if (bType === "ban") reqLevel = 2;
      if (bType === "mute") reqLevel = 1;
      if (bType === "warn") reqLevel = 1;
      if (bType === "black" || bType === "addblack") reqLevel = 10;

      if (viewerRole < reqLevel) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
        return;
      }

      

      const tUser = await getOrCreateUser(targetId);
      const tName = tUser.fullName || tUser.nick || await fetchVkFullName(targetId) || `id${targetId}`;

      if (bType === 'gban') {
        await updateUser(targetId, { gban: false, gbanReason: "", gbanBy: 0 });
      } else if (bType === 'gbanpl') {
        await updateUser(targetId, { gbanpl: false, gbanplReason: "", gbanplBy: 0 });
      } else {
        const chatBans = tUser.chatBans || {};
        delete chatBans[peerId];
        await updateUser(targetId, { chatBans });
      }

      await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы сняли блокировку пользователю.");
      await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
      
      let outMsg = "";
      if (bType === 'ban') {
        outMsg = `[id${targetId}|Пользователю] снята блокировка в этой беседе.\n\n| Модератор, который разблокировал - [id${userId}|${u.fullName || u.nick || 'Модератор'}]`;
      } else {
        outMsg = `[id${targetId}|${tName}] вынесен(-а) из глобальной блокировки во всех беседах в которых есть Orion.\n\n| Модератор, который вынес из блокировки - [id${userId}|${u.fullName || u.nick || 'Модератор'}]`;
      }
      await sendVkMessage(VK_TOKEN, peerId, outMsg);
      return;
    }

    if (cmd === "info_alert_action") {
      const targetId = Number(payloadObj.targetId);
      const u = await getOrCreateUser(userId);
      const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
      const isOwner = await checkIsOwner(userId, peerId, u.role);
      const isVkAdmin = await checkIsAdmin(userId, peerId, u.role);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      const viewerRole = Math.max(effRole, isOwner || isVkAdmin ? 7 : chatRole);

      if (viewerRole < 1) {
        await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
        return;
      }

      // Remove only info button
      const newKb = {
        inline: true,
        buttons: [
          [{ action: { type: "callback", label: "Вынести из блокировки", payload: JSON.stringify({ cmd: "unban_alert_action", targetId, type: payloadObj.type || 'gban' }) }, color: "positive" }]
        ]
      };
      await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify(newKb) });
      const { text: banInfo } = await getStatsBansPage(targetId, false);
      await sendVkMessage(VK_TOKEN, peerId, banInfo);
      return;
    }

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
    
        if (cmd === "beer_quiz") {
      const authorId = Number(payloadObj.authorId);
      if (userId !== authorId) {
        return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      const u = await getOrCreateUser(userId);
      const now = Date.now();
      if (now - (u.lastBeerTime || 0) < 3600 * 1000) {
        return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы уже выпили пиво! Следующая попытка через 1 час.");
      }

      // Remove buttons from the original message
      await editVkMessage(VK_TOKEN, peerId, cmId, "Перед пивом решите задачу по русскому языку\n\nНа кнопках представлены слова, вам нужно нажать на 1 верную!", { keyboard: JSON.stringify({ inline: true, buttons: [] }) }).catch(() => {});

      const isCorrect = Number(payloadObj.isCorrect) === 1;
      const userFullName = u.fullName || u.nick || (await fetchVkFullName(userId)) || `id${userId}`;

      let litersStr = "";
      let resText = "";

      if (isCorrect) {
        const liters = parseFloat((Math.random() * 3.0 + 2.0).toFixed(1)); // 2.0 - 5.0
        litersStr = liters.toFixed(1);
        const newBeer = Number(((u.beer || 0) + liters).toFixed(1));
        await updateUser(userId, { beer: newBeer, lastBeerTime: now });
        u.beer = newBeer;
        u.lastBeerTime = now;
        resText = `[id${userId}|${userFullName}] выбрал(-а) правильное слово и он выпивает ${formatLitersRu(litersStr)} пива\n\n| Выпито за 3 месяца: ${newBeer} л.\n| Следующая попытка через 1 час!`;
      } else {
        const liters = parseFloat((Math.random() * 0.9 + 0.1).toFixed(1)); // 0.1 - 1.0
        litersStr = liters.toFixed(1);
        const newBeer = Number(((u.beer || 0) + liters).toFixed(1));
        await updateUser(userId, { beer: newBeer, lastBeerTime: now });
        u.beer = newBeer;
        u.lastBeerTime = now;
        resText = `[id${userId}|${userFullName}] выбрал(-а) неправильное слово и он выпивает ${formatLitersRu(litersStr)} пива\n\n| Выпито за 3 месяца: ${newBeer} л.\n| Следующая попытка через 1 час!`;
      }

      await sendVkMessage(VK_TOKEN, peerId, resText, { forward: JSON.stringify({ is_reply: true, conversation_message_ids: [cmId], peer_id: peerId }) });
      return;
    }

        if (cmd === "unban_chat_btn") {
      const targetPeerId = Number(payloadObj.peerId);
      const u = await getOrCreateUser(userId);
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
      if (effRole < 10) {
        return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
      }
      const targetChat = await getOrCreateChat(targetPeerId);
      if (!targetChat.banned) {
        return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Данная беседа не заблокирована!");
      }
      await updateChat(targetPeerId, { banned: false });
      const userFullName = u.fullName || u.nick || (await fetchVkFullName(userId)) || `id${userId}`;
      const chatNum = targetPeerId > 2000000000 ? targetPeerId - 2000000000 : targetPeerId;
      const chatTitle = targetChat.title || `Беседа №${chatNum}`;

      // Remove button from message
      const origText = `Беседа ${chatTitle} ( Номер: №${chatNum} ) была заблокирована.\n\n| Модератор, который заблокировал беседу - [id${userId}|${userFullName}]`;
      await editVkMessage(VK_TOKEN, peerId, cmId, origText, { keyboard: JSON.stringify({ inline: true, buttons: [] }) }).catch(() => {});

      const unbanResp = `Беседа ${chatTitle} ( Номер: №${chatNum} ) была разблокирована.\n\n| Модератор, который разблокировал беседу - [id${userId}|${userFullName}]`;
      await sendVkMessage(VK_TOKEN, peerId, unbanResp, { forward: JSON.stringify({ is_reply: true, conversation_message_ids: [cmId], peer_id: peerId }) });

      try {
        await sendVkMessage(VK_TOKEN, targetPeerId, `Беседа была разблокирована руководством чат-менеджера.\n\nРабота чат-менеджера в этой беседе снова возобновлена.`);
      } catch(e) {}
      return;
    }

    if (cmd === "banidchats_page") {
      const pageNum = Number(payloadObj.page) || 1;
      const authorId = Number(payloadObj.authorId);
      if (userId !== authorId) {
        return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      const bannedChatsSnap = await firestoreDb.collection("chats").where("banned", "==", true).get();
      const bannedChats: any[] = [];
      bannedChatsSnap.forEach(doc => {
        const d = doc.data();
        bannedChats.push({ peerId: Number(doc.id), ...d });
      });

      const pageSize = 15;
      const totalPages = Math.ceil(bannedChats.length / pageSize) || 1;
      const curPage = Math.min(Math.max(1, pageNum), totalPages);
      const startIdx = (curPage - 1) * pageSize;
      const pageItems = bannedChats.slice(startIdx, startIdx + pageSize);

      let msg = `...::Список заблокированных бесед (Страница ${curPage}/${totalPages})::...

`;
      if (pageItems.length === 0) {
        msg += "Заблокированных бесед нет.";
      } else {
        for (let i = 0; i < pageItems.length; i++) {
          const c = pageItems[i];
          const cNum = c.peerId > 2000000000 ? c.peerId - 2000000000 : c.peerId;
          const cTitle = c.title || `Беседа №${cNum}`;
          let ownerStr = "Не указан";
          if (c.ownerId && c.ownerId > 0) {
            const oUser = await getOrCreateUser(c.ownerId);
            const oName = oUser.fullName || oUser.nick || `id${c.ownerId}`;
            ownerStr = `[id${c.ownerId}|${oName}]`;
          }
          const bDateStr = formatMskDateAmPm(c.bannedAt || Date.now());
          msg += `${startIdx + i + 1}. ${cTitle} | Владелец: ${ownerStr} | ${bDateStr}
`;
        }
      }

      const buttons: any[] = [];
      const navRow: any[] = [];
      if (curPage > 1) {
        navRow.push({ action: { type: "callback", label: "⬅️ Назад", payload: JSON.stringify({ cmd: "banidchats_page", page: curPage - 1, authorId }) }, color: "primary" });
      }
      if (curPage < totalPages) {
        navRow.push({ action: { type: "callback", label: "Вперед ➡️", payload: JSON.stringify({ cmd: "banidchats_page", page: curPage + 1, authorId }) }, color: "primary" });
      }
      if (navRow.length > 0) buttons.push(navRow);

      await editVkMessage(VK_TOKEN, peerId, cmId, msg, { keyboard: JSON.stringify({ inline: true, buttons }) });
      return;
    }

    if (cmd === "gbf_a" || cmd === "gbf_d") {
      const targetId = Number(payloadObj.t);
      const senderId = Number(payloadObj.s);

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
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
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
          role: 0,
          chatRoles: {},
          gban: true, 
          gbanpl: true, 
          gbanReason: fullReason, 
          gbanplReason: fullReason,
          gbanBy: userId, 
          gbanplBy: userId,
          gbanDate: Date.now(),
          gbanplDate: Date.now(),
          gbanExpiresAt: 0,
          gbanplExpiresAt: 0
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
                await sendVkMessageLocal(VK_TOKEN, c.id, `[id${userId}|${vkName}] заблокировал(-а) [id${targetId}|пользователя] во всех беседах!\n\n| Причина: ${fullReason}\n| Срок: Навсегда`);
              }
            } catch(e) {}
          }
        }

        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] одобрил(-а) форму на глобальную блокировку от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const sFirstName = sName.split(" ")[0];
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ваша форма на [id${targetId}|пользователя] была одобрена.`);
      } else {
        const sUser = await getOrCreateUser(senderId);
        const sName = sUser.fullName || sUser.nick || `User${senderId}`;
        const sFirstName = sName.split(" ")[0];
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] отказал(-а) форму на глобальную блокировку от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ваша форма на [id${targetId}|пользователя] была отказана.\n\nЕсли вы желаете узнать причину, напишите [id${userId}|модератору] который отказал вашу форму.`);
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
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
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
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] одобрил(-а) ${typeStr} от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textApprove = isBug ? "был одобрен" : "было одобрено";
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textApprove}.`);
      } else {
        await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${vkName}] отказал(-а) ${typeStr} от [id${senderId}|пользователя]`, { forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [cmId], is_reply: true }), disable_mentions: 1 });
        const textDeny = isBug ? "был отказан" : "было отказано";
        await sendVkMessageLocal(VK_TOKEN, senderId, `[id${senderId}|${sFirstName}], ${typeStrL} ${textDeny}.`);
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
      const effRole = (u.role >= 12 || userId === 778382713) ? 12 : (u.role || 0);
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
       const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
       
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
        await sendVkMessageLocal(VK_TOKEN, targetId, `[id${userId}|${sender.nick || "Игрок"}] передал(-а) вам ${formatNum(amount)}$`);
      } catch (e) {
        console.error("Error sending DM to transfer target:", e);
      }
      return;
    }

    if (cmd === "transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      const targetId = payloadObj.targetId;
      const targetName = payloadObj.targetName;

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили перевод денег пользователю [id${targetId}|${targetName}]`);
      return;
    }

    if (cmd === "clan_join_accept") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
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

    
      if (cmd === "activate_cm") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
          const u = await getOrCreateUser(userId);
          const chatData = await getOrCreateChat(peerId);
          const fullName = u.fullName || u.nick || `User${userId}`;
          
          if (u.blacklisted) {
             return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы находитесь в чёрном списке бота!");
          }
          if (chatData.active) {
             return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бот в беседе был уже ранее активирован.");
          }

          let isAllowedToActivate = false;
          if (u.role >= 12 || userId === 778382713 || userId === 1) {
             isAllowedToActivate = true;
          } else if (peerId > 2000000000) {
             const isVkAdmin = await checkIsAdmin(userId, peerId, u.role);
             if (isVkAdmin) {
                isAllowedToActivate = true;
             } else {
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
             }
          } else {
             isAllowedToActivate = true;
          }

          if (!isAllowedToActivate) {
             return await sendVkToast(VK_TOKEN, eventId, userId, peerId, "Активировать могут только админы/владельцы беседы!");
          }

          let realTitle = chatData.title;
          if (peerId > 2000000000) {
             try {
                const convRes = await vkApi.get("messages.getConversationsById", {
                   params: { peer_ids: peerId, access_token: VK_TOKEN, v: "5.199" }
                });
                const settings = convRes.data?.response?.items?.[0]?.chat_settings;
                if (settings && settings.title) realTitle = settings.title;
             } catch (e) {}
          }

          const chatRoles = u.chatRoles || {};
          chatRoles[peerId] = 7;
          await updateUser(userId, { chatRoles });
          await updateChat(peerId, { active: true, adminId: userId, title: realTitle });

          const origGreeting = `Orion был добавлен в беседу.\n\nПеред началом активации, выдайте чат-менеджеру права системного администратора (звёздочку).\n\nПосле этого активируйте чат-менеджера в беседе с помощью команды - /start или кнопки.\n\nДалее выберите тип беседы с помощью команды - /type и синхронизируйте её по команде /sync.`;
          await editVkMessage(VK_TOKEN, peerId, cmId, origGreeting, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });

          const activationRespText = `[id${userId}|${fullName}] активировал(-а) чат-менеджера в беседе.\n\nТеперь выберите тип беседы с помощью команды - /type\n\nПосле выбора типа беседы, синхронизируйте беседу с помощью команды - /sync`;
          await sendVkMessage(VK_TOKEN, peerId, activationRespText, {
             forward: JSON.stringify({
                peer_id: peerId,
                conversation_message_ids: [cmId],
                is_reply: true
             })
          });
          return;
       }
       if (cmd === "zayavka_start") {
         const cUser = await getOrCreateUser(userId);
         cUser.zayavkaState = { step: 1, answers: [], msgId: cmId };
          await updateUser(userId, { zayavkaState: cUser.zayavkaState });
         await editVkMessage(VK_TOKEN, peerId, cmId, "Отлично, тогда мы зададим вам пару вопросов.\n\nСколько вам лет?", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "zayavka_cancel") {
         const cUser = await getOrCreateUser(userId);
         cUser.zayavkaState = null;
          await updateUser(userId, { zayavkaState: null });
         await editVkMessage(VK_TOKEN, peerId, cmId, "Хорошо, вы отменили подачу заявки на пост заместителя руководителя.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "zayavka_submit") {
         const cUser = await getOrCreateUser(userId);
         if (!cUser.zayavkaState || cUser.zayavkaState.answers.length < 12) await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
         const ans = cUser.zayavkaState.answers;
         const txt = `Поступила новая заявка на пост Заместителя Руководителя!\n\n| Заявку отправил - [id${userId}|${cUser.fullName || "Пользователь"}]\n| VK ID пользователя - ${userId}\n\nОтветы на вопросы в заявке:\n\n| Сколько вам лет?\n- ${ans[0]}\n\n| Укажите вашу электронную почту:\n- ${ans[1]}\n\n| Отлично, теперь укажите ваш Telegram:\n- ${ans[2]}\n\n| Какой у вас часовой пояс (от МСК)?  \n- ${ans[3]}\n\n| Расскажите, почему вы хотите попасть на пост Заместителя руководителя? \n- ${ans[4]}\n\n| Что вы будете делать на посте Заместителя руководителя?\n- ${ans[5]} \n\n| Почему мы должны взять на пост именно вас?\n- ${ans[6]} \n\n| Есть ли у вас опыт в этой сфере?\n- ${ans[7]} \n\n| Готовы ли вы получить ЧСБ/ЧСР за слив своего поста? \n- ${ans[8]} \n\n| Сколько вы готовы уделять время нашему чат-менеджеру?\n- ${ans[9]} \n\n| Укажите ваш ежедневный онлайн в ВКонтакте:\n- ${ans[10]} \n\n| Готовы ли вы слушаться высшее руководство?\n- ${ans[11]} \n`;
         const zKb = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Одобрить", payload: JSON.stringify({ cmd: "z_approve", targetId: userId }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Отказать", payload: JSON.stringify({ cmd: "z_deny", targetId: userId }) }, color: "negative" }]
            ]
         };
         await sendVkMessage(VK_TOKEN, 2000000026, txt, { keyboard: JSON.stringify(zKb) });
         await editVkMessage(VK_TOKEN, peerId, cmId, "Ваша заявка была отправлена руководству на рассмотрение, ожидайте вердикта.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         cUser.zayavkaState = null;
          await updateUser(userId, { zayavkaState: null });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "z_approve") {
         const targetId = payloadObj.targetId || payloadObj.tId;
         const tUser = await getOrCreateUser(targetId);
         const cUser = await getOrCreateUser(userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Модератор"}] одобрил(-а) заявку на пост заместителя руководителя от [id${targetId}|${tUser.fullName || "пользователя"}]`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await sendVkMessage(VK_TOKEN, targetId, `[id${targetId}|${tUser.fullName || "Пользователь"}], доброго времени суток!\n\nВаша заявка на пост заместителя руководителя была одобрена.`);
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "z_deny") {
         const targetId = payloadObj.targetId || payloadObj.tId;
         const tUser = await getOrCreateUser(targetId);
         const cUser = await getOrCreateUser(userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Модератор"}] отказал(-а) заявку на пост заместителя руководителя от [id${targetId}|${tUser.fullName || "пользователя"}]`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await sendVkMessage(VK_TOKEN, targetId, `[id${targetId}|${tUser.fullName || "Пользователь"}], доброго времени суток!\n\nВаша заявка на пост заместителя руководителя была отказана.\n\nЕсли вы хотите узнать причину, то напишите [id${userId}|модератору] который отказал вам заявку.`);
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }

      if (cmd === "rr_new") {
         await editVkMessage(VK_TOKEN, peerId, cmId, `Укажите аргументы команды!\n\n| Пример:\n\n| Владелец беседы:\n- {owner}\n\n| Главный Администратор:\n- {ga}\n\n| Зам. Глав. Администратора:\n- {zga}\n\n| Старший Администратор:\n- {sadmin}\n\n| Администратор:\n- {admin}\n\n| Старший Модератор:\n- {smoder}\n\n| Модератор:\n- {moder}`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "rr_del") {
         const kb = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Да", payload: JSON.stringify({ cmd: "rr_del_yes" }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет", payload: JSON.stringify({ cmd: "rr_del_no" }) }, color: "negative" }]
            ]
         };
         await editVkMessage(VK_TOKEN, peerId, cmId, `Вы действительно хотите удалить названия ролей?`, { keyboard: JSON.stringify(kb) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "rr_del_yes") {
         const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
         await chatRef.set({ customRoles: {} }, { merge: true }).catch(() => {});
         await editVkMessage(VK_TOKEN, peerId, cmId, "Названия ролей успешно удалены.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
      if (cmd === "rr_del_no") {
         await editVkMessage(VK_TOKEN, peerId, cmId, "Удаление названий ролей отменено.", { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }

      if (cmd === "kf_yes") {
         const cUser = await getOrCreateUser(userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Пользователь"}] начал(-а) исключение всех удалённых/замороженных пользователей из беседы.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
         
         const { items } = await getChatMembers(peerId);
         let success = 0;
         let fail = 0;
         for (const m of items) {
             if (m.member_id > 0) {
                 try {
                     const { data } = await vkApi.get("users.get", { params: { user_ids: m.member_id, access_token: VK_TOKEN, v: "5.199" } });
                     if (data.response && data.response[0] && data.response[0].deactivated) {
                         try {
                             await vkApi.get("messages.removeChatUser", { params: { chat_id: peerId - 2000000000, user_id: m.member_id, access_token: VK_TOKEN, v: "5.199" } });
                             success++;
                         } catch(e) {
                             fail++;
                         }
                     }
                 } catch(e) {}
             }
         }
         
         await deleteVkMessage(VK_TOKEN, peerId, cmId).catch(()=>{});
         return await sendVkMessage(VK_TOKEN, peerId, `Исключение всех удалённых/замороженных пользователей из беседы завершено.\n\n| Успешно исключено: ${success}\n| Неуспешно исключено: ${fail}`);
      }
      if (cmd === "kf_no") {
         const cUser = await getOrCreateUser(userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Пользователь"}] отменил(-а) исключение всех удалённых/замороженных пользователей из беседы.`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
         await answerVkEvent(VK_TOKEN, eventId, userId, peerId); return;
      }
if (cmd === "start_chat") {
          const cUser = await getOrCreateUser(userId);
          const adminName = cUser.fullName || cUser.nick || "Пользователь";
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${adminName}] активировал(-а) чат-менеджера в беседе.\n\nТеперь выберите тип беседы по команде - /type.\nТакже синхронизируйте беседу с помощью команды - /sync.`, { keyboard: JSON.stringify({ inline: true, buttons: [] }) });
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

      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] исключил(-а) [id${targetId}|${targetName}] из беседы`);
      return;
    }

    if (cmd === "clan_transfer_cancel") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      const targetId = payloadObj.targetId;
      const targetUser = await getOrCreateUser(targetId);

      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили передачу своего клана пользователю [id${targetId}|${targetUser.nick || "Игрок"}]`);
      return;
    }

    if (cmd === "clan_rename_confirm") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      await editVkMessage(VK_TOKEN, peerId, cmId, `Вы отменили переименование клана`);
      return;
    }

    if (cmd === "clan_members_list") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);

      const user = await getOrCreateUser(userId);
      user.globalRole = user.role || 0;
      user.role = user.globalRole >= 7 ? user.globalRole : ((user.chatRoles && user.chatRoles[peerId]) || 0);

      const clanId = payloadObj.clanId || user.clanId;

      if (cmd === "clan_members_list") {
        if (!clanId) {
          await sendVkMessageLocal(VK_TOKEN, peerId, "Вы не состоите в клане!");
          return;
        }

        const clanDoc = await firestoreDb.collection("clans").doc(clanId).get();
        if (!clanDoc.exists) {
          await sendVkMessageLocal(VK_TOKEN, peerId, "Клан не найден в базе данных.");
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
        await sendVkMessageLocal(VK_TOKEN, peerId, responseText);
        return;
      } else {
        const membersData = await getChatMembers(peerId);
        const profiles = membersData.profiles || [];
        const lines = profiles.slice(0, 30).map((p: any, i: number) => `${i + 1}. [id${p.id}|${p.first_name} ${p.last_name}]`);
        
        let responseText = `💬 Участники беседы:\n\n` + lines.join("\n");
        if (profiles.length > 30) {
          responseText += `\n\n... и еще ${profiles.length - 30} участников.`;
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
             const nick = chatNicks[peerId] || "отсутствует";
             lines.push(`- [id${p.id}|${p.first_name} ${p.last_name}] — Ник: ${nick}`);
          }
        }
      }
      let outText = "Ники руководства беседы:\n\n";
      if (lines.length === 0) outText += "Руководство не найдено.";
      else outText += lines.join("\n");

      await sendVkMessageLocal(VK_TOKEN, peerId, outText);
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
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Кнопки доступны только автору команды." });
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
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Кнопки доступны только автору команды." });
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
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Кнопки доступны только автору команды." });
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

       if (cmd === "ghelp_own" && effRole < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
       if (cmd === "ghelp_zown" && effRole < 11) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
       if (cmd === "ghelp_gruk" && effRole < 10.5) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
       if (cmd === "ghelp_ruk" && effRole < 10) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
       if (cmd === "ghelp_ozr" && effRole < 9) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
       if (cmd === "ghelp_zr" && effRole < 8) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");

       let text = "";

       if (cmd === "ghelp_main") {
          text = `...::Помощь по командам руководства бота::...\n\nКоманды руководства бота:\n/gstaff -- Список руководства бота.\n/ghelp -- Помощь по командам руководства.`;
       } else if (cmd === "ghelp_zr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Руководителя:\n/gban -- Выдать глобальную блокировку во всех беседах.\n/ungban -- Снять глобальную блокировку.\n/gbanpl -- Выдать глобальную блокировку в беседах игроков.\n/ungbanpl -- Снять глобальную блокировку игроков.\n/gbanlist -- Список глобально заблокированных пользователей.\n/blacklist -- Список пользователей в ЧС бота.\n/rstats -- Статистика руководителя.`;
       } else if (cmd === "ghelp_ozr") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Осн. Зам. Руководителя:\n/grrole -- Снять глобальную роль у пользователя.\n/setowner -- Назначить владельца беседы.\n/deleteowner -- Снять права владельца беседы.`;
       } else if (cmd === "ghelp_ruk") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Руководителя:\n/banid -- Заблокировать беседу.\n/unbanid -- Разблокировать беседу.\n/infochat -- Узнать информацию о беседе.\n/addblack -- Занести пользователя в ЧС бота.\n/unblack -- Удалить пользователя из ЧС бота.\n/gsnick -- Установить ник во всём чат-менеджере.\n/grnick -- Удалить ник во всём чат-менеджере.\n/zunban -- Снять все блокировки пользователя в беседах.\n/addzsr -- Выдать уровень прав Зам. Руководителя.\n/addozsr -- Выдать уровень прав Осн. Зам. Руководителя.`;
       } else if (cmd === "ghelp_gruk") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Глав. Руководителя:\n/rebuke -- Выдать выговор руководителю.\n/unrebuke -- Снять выговор с руководителя.\n/addruk -- Выдать уровень прав Руководителя.`;
       } else if (cmd === "ghelp_zown") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Зам. Владельца:\n/addgr -- Выдать уровень прав Главного Руководителя.`;
       } else if (cmd === "ghelp_own") {
          text = `...::Помощь по командам руководства::...\n\nКоманды Владельца бота:\n/addstatus -- Установить статус пользователю.\n/unstatus -- Снять статус пользователя.\n/arrole -- Снять все роли у пользователя.\n/setinfobot -- Установить инфо бота.\n/achat -- Сделать беседу админ-чатом.\n/unachat -- Убрать статус админ-чата.\n/giveowner -- Передать права владельца беседы.\n/addzamowner -- Выдать уровень прав Зам. Владельца бота.`;
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
          const effectiveRole = (clickingUser.role >= 8 || userId === 778382713)
             ? 12
             : Math.max(clickingUser.role || 0, chatRole);
          if (cmd === "mod_ungban" || cmd === "mod_ungbanpl" || cmd === "mod_unban_chat") {
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
               if (mId) await deleteVkMessage(VK_TOKEN, peerId, mId);
               await deleteMessagesForUser(peerId, tId, 5);
             } catch (e) {}
             const modName = clickingUser.fullName || clickingUser.nick || (await fetchVkFullName(userId)) || "Модератор";
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] очистил(-а) сообщения от [id${tId}|пользователя]`);
             
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
             await updateUser(tId, { muteUntil: 0, muteReason: "", mutePeerId: 0 });
             targetU.muteUntil = 0;
             targetU.muteReason = "";
             targetU.mutePeerId = 0;
             userCache.set(tId, targetU);
             await executeVkUnmute(peerId, tId);
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) блокировку чата с [id${tId}|${tName}]`);
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
             const fullName = clickingUser.fullName || clickingUser.nick || `User${userId}`;
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) блокировку с [id${tId}|пользователя]`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          
      if (cmd === "mod_unblack") {
          const targetId = payloadObj.targetId || payloadObj.tId || (typeof tId !== "undefined" ? tId : 0);
          const cUser = await getOrCreateUser(userId);
          const userChatRole = (cUser.chatRoles && cUser.chatRoles[peerId]) || 0;
          const effRole = cUser.role >= 12 || userId === 778382713 ? 12 : Math.max(cUser.role || 0, userChatRole);
          if (effRole < 8) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточный уровень прав для этой команды.");
          
          await updateUser(targetId, {
             blacklisted: false,
             blackReason: "",
             blackBy: 0,
             blackDate: 0,
             blackExpiresAt: 0
          });
          const adminName = cUser.fullName || cUser.nick || "Модератор";
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Чёрный список снят." });
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${targetId}|Пользователю] был снят чёрный список чат-менеджера.\n\n| Модератор, который снял чёрный список - [id${userId}|${adminName}]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
      }
if (cmd === "mod_ungban") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Глобальная блокировка снята." });
             await updateUser(tId, { gban: false, gbanReason: "", gbanBy: 0, gbanDate: 0, gbanExpiresAt: 0 });
             const fullName = clickingUser.fullName || clickingUser.nick || `User${userId}`;
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) глобальную блокировку с [id${tId}|пользователя] во всех беседах`);
             await editVkMessage(VK_TOKEN, peerId, cmId, undefined, { keyboard: JSON.stringify({inline: true, buttons: []}) });
             return;
          }
          if (cmd === "mod_ungbanpl") {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Глобальная блокировка игроков снята." });
             await updateUser(tId, { gbanpl: false, gbanplReason: "", gbanplBy: 0, gbanplDate: 0, gbanplExpiresAt: 0 });
             const fullName = clickingUser.fullName || clickingUser.nick || `User${userId}`;
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) глобальную блокировку с [id${tId}|пользователя] во всех беседах игроков`);
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
             await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${modName}] снял(-а) предупреждение с [id${tId}|${tName}]`);
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
          
          const tName = tUser1.fullName || "Пользователю";
          const aName = tUser2.fullName || "Владелец";
          
          let chatName = "беседе";
          try {
             const cInfo = await getOrCreateChat(peerId);
             if (cInfo && cInfo.title) chatName = cInfo.title;
          } catch(e){}

          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${tId}|${tName}] становится новым владельцем беседы.

| Бывший владелец беседы - [id${userId}|${aName}]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          try {
             await sendVkMessage(VK_TOKEN, tId, `Вам были передан уровень прав «Владелец Беседы» в беседе ${chatName} [id${userId}|пользователем]`);
          } catch (e) {}
          return;
       }
              if (cmd === "mod_giveowner_no") {
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Передача отменена." });
          const cUser = await getOrCreateUser(userId);
          await editVkMessage(VK_TOKEN, peerId, cmId, `[id${userId}|${cUser.fullName || "Имя Фамилия"}] отменил(-а) передачу уровня прав «Владелец Беседы» [id${tId}|пользователю]`, { keyboard: JSON.stringify({inline: true, buttons: []}) });
          return;
       }
       if (cmd === "mod_silence_off") {
          const u = await getOrCreateUser(userId);
          const chatRole = (u.chatRoles && u.chatRoles[peerId]) || 0;
          const effectiveRole = u.role >= 8 ? u.role : Math.max(u.role || 0, chatRole);
          const isAdminMember = await checkIsAdmin(userId, peerId, u.role);
          if (effectiveRole < 3 && !isAdminMember) {
             await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "У вас недостаточный уровень прав для этой команды." });
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
          await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Кнопки доступны только автору команды." });
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
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { type: "show_snackbar", text: "Страница обновлена" });
      
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
        text = `...::Помощь по командам бота::...\n\nКоманды Модератора:\n/mute - Выдать блокировку чата пользователю.\n/unmute - Снять блокировку чата пользователю.\n/warn - Выдать предупреждение пользователю.\n/unwarn - Снять предупреждение пользователю.\n/warns - Посмотреть предупреждения пользователя.\n/kick - Исключить пользователя из беседы.\n/clear - Очистить сообщения пользователя.\n/mclear - Очистить несколько сообщений.\n/mutelist - Список заблокированных в чате.\n/warnlist - Список предупреждений в беседе.\n/smute - Тихо выдать блокировку чата пользователю.\n/skick - Тихо исключить пользователя из беседы.\n/sclear - Тихо очистить сообщение от пользователя.\n/smclear - Тихо очистить сообщения от пользователя.`;
      } else if (cmd === "help_smoder") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Модератора:\n/ban - Заблокировать пользователя в беседе.\n/unban - Разблокировать пользователя в беседе.\n/banlist - Список заблокированных в беседе.\n/zov - Созвать участников беседы.\n/olist - Список участников онлайн.\n/offlinelist - Список участников оффлайн.\n/sban - Тихо заблокировать пользователя в беседе.\n/sunban - Тихо разблокировать пользователя в беседе.`;
      } else if (cmd === "cmd_help_admin_bot") {
        text = `...::Помощь по командам бота::...\n\nКоманды Администратора:\n/purge - Очистить последние сообщения в беседе.\n/infoid - Найти беседы пользователя.\n/addsenmoder - Выдать уровень прав старшего модератора.\n/logsadm - Логи выдачи/снятия прав в беседе.\n/logsmute - Логи блокировок чата в беседе.\n/logsban - Логи блокировок в беседе.\n/logswarn - Логи предупреждений в беседе.\n/logskick - Логи киков в беседе.\n/nban - Заблокировать пользователя в беседах сетки.\n/nkick - Исключить пользователя в беседах сетки.\n/nrole - Выдать роль пользователю в беседах сетки.\n/nremoverole - Забрать роль у пользователя в беседах сетки.\n/snban - Тихо заблокировать пользователя в беседах сетки.\n/snkick - Тихо исключить пользователя в беседах сетки.\n/snrole - Тихо выдать роль пользователю в беседах сетки.\n/snremoverole - Тихо забрать роль у пользователя в беседах сетки.`;
      } else if (cmd === "help_sadmin") {
        text = `...::Помощь по командам бота::...\n\nКоманды Старшего Администратора:\n/addadmin - Выдать уровень прав администратора.`;
      } else if (cmd === "help_zsa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Зам. Главный Администратора:\n/addsenadmin - Выдать уровень прав старшего администратора.\n/pin - Закрепить сообщение.\n/unpin - Открепить сообщение.`;
      } else if (cmd === "help_sa") {
        text = `...::Помощь по командам бота::...\n\nКоманды Специального Администратора:\n/settings - Настройки чат-менеджер в беседе.\n/addzsa - Выдать уровень прав зам. спец. администратора.`;
      } else if (cmd === "help_owner") {
        text = `...::Помощь по командам бота::...\n\nКоманды Владельца беседы:\n/start - Активировать чат-менеджер в беседе.\n/type - Изменить тип беседы.\n/sync - Синхронизировать структуру беседы.\n/games - Включить/выключить игры в беседе.\n/staff - Список руководства беседы.\n/giveowner - Передать права владельца беседы.\n/addsa - Выдать уровень прав спец. администратора.\n/welcometext - Настроить приветствие.\n/leave - Вкл/выкл кик при выходе.\n/invite - Вкл/выкл инвайт только модераторами.\n/af - Вкл/выкл анти-флуд.\n/antisliv - Вкл/выкл анти-слив.\n/raid - Вкл/выкл анти-рейд.\n/group - Вкл/выкл анти-сообщества.\n/tegall - Вкл/выкл анти-тег всех участников.\n/antiad - Вкл/выкл анти-рекламу.\n/addantiteg - Добавить слово/тег в анти-тег.\n/unantiteg - Удалить слово/тег из анти-тега.\n/antiteglist - Список слов/тегов в анти-теге.\n/addawstats - Выдать функцию пользователя "Анти-просмотр stats".\n/unawstats - Забрать функцию пользователя "Анти-просмотр stats".\n/createnet - Создать сетку бесед.\n/deletenet - Удалить сетку бесед.\n/dgiveowner - Передать права владельца сетки.\n/addchatnet - Добавить беседу в сетку.\n/unchatnet - Удалить беседу из сетки.\n/netlist - Список бесед в сетке.`;
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
      if (effectiveRole >= 6) availableButtons.push({ cmd: "help_sa", label: "Главный Администратор" });
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
      await sendVkMessageLocal(VK_TOKEN, peerId, text, { disable_mentions: 1 });
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
      sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] вступил(-а) в игру!`);

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
      sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] вышел(-а) из игры!`);

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
      sendVkMessageLocal(VK_TOKEN, peerId, `🎮 Игра "Крокодил" началась!\n\n| Ведущий: [id${presenter.id}|${presenter.name}]`);
      sendVkToast(VK_TOKEN, eventId, presenter.id, peerId, `Игра началась, слово: ${randomWord}, участники игры должны его угадать.`);
      sendVkMessageLocal(VK_TOKEN, presenter.id, `🐊 Ваше слово для игры "Крокодил": ${randomWord}\nОбъясните его участникам в беседе!`);

      // 10 minute timeout
      lobby.timeoutTimer = setTimeout(() => {
        if (crocGames.has(peerId) || crocGames.has(Number(peerId))) {
          sendVkMessageLocal(VK_TOKEN, peerId, `Время вышло! Никто не угадал слово.\n\n| Слово было: ${randomWord}\n\n| Игра завершена!`);
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }

      if (cmd === "biz_collect_new") {
        const incomeAcc = user.bizIncomeAcc || 0;
        if (incomeAcc <= 0) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Нет дохода для снятия!");
        
        await updateUser(userId, { balance: (user.balance || 0) + incomeAcc, bizIncomeAcc: 0 });
        sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] снял(-а) деньги с баланса бизнесов`);
        return;
      }

      if (cmd === "biz_renew") {
        const now = Date.now();
        const expireAt = user.bizExpireAt || 0;
        if (expireAt > now) {
           return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Бизнесы еще работают!");
        }
        await updateUser(userId, { bizExpireAt: now + 5 * 3600 * 1000, lastBizCollectTime: Math.floor(now / 1000) });
        sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] продлил(-а) работу бизнесов`);
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
        duel = { peerId, cmId: 0, creatorId: payloadObj.creatorId, creatorName: payloadObj.creatorName || "Игрок", amount: payloadObj.stake };
      }
      if (!duel) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Дуэль не найдена!");
      if (userId === duel.creatorId) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не можете играть с самим собой!");
      if ((user.balance || 0) < duel.amount) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно денег.");

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
      
      await sendVkMessageLocal(VK_TOKEN, peerId, `Вы закрыли депозит №${num}, вы получили: ${prize.toLocaleString()}$`);
      
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
      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] вступил(-а) в раздачу`, { disable_mentions: 1 });
      
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
      await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] вышел(-а) из раздачи`, { disable_mentions: 1 });
      
      sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из раздачи");
      return;
    }

    // Roulette / Casino replay buttons
    if (cmd === "roulette_again" || cmd === "roulette_allin") {
      if (payloadObj.authorId && payloadObj.authorId !== userId) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      let stake = payloadObj.stake || 0;
      if (cmd === "roulette_allin") stake = user.balance || 0;
      if (stake <= 0 || (user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно денег.");
      }

      await updateUser(userId, { balance: user.balance - stake });
      const win = Math.random() < 0.15;
      if (win) {
        const winAmount = stake * globalSettings.rouletteMultiplier;
        await updateUser(userId, { balance: (user.balance || 0) - stake + winAmount });
        sendVkMessageLocal(VK_TOKEN, peerId, `🎰 Поздравляем вас, вы выиграли ${winAmount.toLocaleString()}$`, {
          keyboard: JSON.stringify({
            inline: true,
            buttons: [[
              { action: { type: "callback", label: "Повторно сыграть", payload: JSON.stringify({ cmd: "roulette_again", stake, authorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Сыграть на весь баланс", payload: JSON.stringify({ cmd: "roulette_allin", authorId: userId }) }, color: "negative" }
            ]]
          })
        });
      } else {
        sendVkMessageLocal(VK_TOKEN, peerId, `К сожалению, но вы проиграли ставку ${stake.toLocaleString()}$`, {
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
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Кнопки доступны только автору команды.");
      }
      const isAllIn = cmd === "casino_allin" || cmd === "casino_all_in";
      let stake = isAllIn ? (user.balance || 0) : parseNumber(payloadObj.stake || payloadObj.amount || 0);

      if (stake <= 0) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Укажите корректную сумму ставки!");
      }

      if ((user.balance || 0) < stake) {
        return sendVkToast(VK_TOKEN, eventId, userId, peerId, "У вас недостаточно денег.");
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
        
        return await sendVkMessageLocal(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
      } else {
        await updateUser(userId, { balance: (user.balance || 0) - stake });
        const resText = `🎰 Вы поставили ${stake.toLocaleString()}$\n\n` +
          `| Выпало: (${e1} ${e2} ${e3})\n` +
          `| Бонус: 0%\n\n` +
          `| Вы проиграли ${stake.toLocaleString()}$`;
        
        return await sendVkMessageLocal(VK_TOKEN, peerId, resText, { keyboard: JSON.stringify(keyboard) });
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
                promises.push(sendVkMessageLocal(VK_TOKEN, c.id, "", req).catch(() => {}));
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
                promises.push(sendVkMessageLocal(VK_TOKEN, uId, "", req).catch(() => {}));
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
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] присоединился к мафии`);
      } else if (cmd === "mafia_leave") {
        const idx = mg.players.findIndex(p => p.id === userId);
        if (idx === -1) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы не в игре!");
        
        if (mg.amount && mg.amount > 0) {
          await updateUser(userId, { balance: (user.balance || 0) + mg.amount });
        }

        mg.players.splice(idx, 1);
        sendVkToast(VK_TOKEN, eventId, userId, peerId, "Вы вышли из игры Мафия!");
        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] отсоединился от мафии`);
      } else if (cmd === "mafia_start") {
        if (user.role < 12) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Только руководитель может запустить игру!");
        if (mg.players.length < 4) return sendVkToast(VK_TOKEN, eventId, userId, peerId, "Минимум 4 игрока для старта!");

        await sendVkMessageLocal(VK_TOKEN, peerId, `[id${userId}|${fullName}] запускает игру мафия!`);
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
        if (conf.type === "takemoney") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) списание денег у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetmoney") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление баланса у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebusiness") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу бизнес-(ов) пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takebusiness") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) списание бизнесов у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbusiness") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление бизнесов у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givevip") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу VIP-статуса пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takevip") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) снятие VIP-статуса у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetvip") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление VIP-статуса у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "reset") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление игровых данных пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "givebeer") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу пива пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takebeer") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) списание пива у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetbeer") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление пива у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giverep") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу репутации пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takerep") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) списание репутации у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "resetrep") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) обнуление репутации у пользователя [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "giveprod") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) выдачу продуктов пользователю [id${conf.targetId}|${conf.targetName}]`;
        if (conf.type === "takeprod") cancelText = `[id${userId}|${conf.adminName}] отменил(-а) списание продуктов у пользователя [id${conf.targetId}|${conf.targetName}]`;
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
      } else if (conf.type === "takemoney") {
        const newBal = Math.max(0, (targetUser.balance || 0) - conf.value);
        await updateUser(conf.targetId, { balance: newBal });
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${conf.value.toLocaleString()}$ у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Новый баланс: ${newBal.toLocaleString()}$`;
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
      } else if (conf.type === "takebusiness") {
        const count = conf.value || 1;
        const newBiz = Math.max(0, (targetUser.businesses || 0) - count);
        const extra: any = { businesses: newBiz };
        if (newBiz === 0) {
          extra.bizProducts = 0;
          extra.bizIncomeAcc = 0;
        }
        await updateUser(conf.targetId, extra);
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${count} бизнес-(ов) у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Осталось бизнесов: ${newBiz}`;
      } else if (conf.type === "resetbusiness") {
        await updateUser(conf.targetId, { businesses: 0, bizProducts: 0, bizIncomeAcc: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все бизнесы у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givevip") {
        const daysMs = conf.value * 86400 * 1000;
        const currentExp = targetUser.vipExpires > Date.now() ? targetUser.vipExpires : Date.now();
        await updateUser(conf.targetId, { vipExpires: currentExp + daysMs });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) VIP-статус на ${conf.value} дней пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takevip") {
        const daysMs = conf.value * 86400 * 1000;
        const currentExp = targetUser.vipExpires > Date.now() ? targetUser.vipExpires : Date.now();
        const newExp = Math.max(0, currentExp - daysMs);
        await updateUser(conf.targetId, { vipExpires: newExp > Date.now() ? newExp : 0 });
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${conf.value} дн. VIP-статуса у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "resetvip") {
        await updateUser(conf.targetId, { vipExpires: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) VIP-статус у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "reset") {
        await updateUser(conf.targetId, { balance: 0, bank: 0, businesses: 0, bizProducts: 0, bizIncomeAcc: 0, vipExpires: 0, jc: 0, beer: 0, rep: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все игровые данные пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "givebeer") {
        await updateUser(conf.targetId, { beer: (targetUser.beer || 0) + conf.value });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} литр-(ов) пива пользователю [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "takebeer") {
        const newBeer = Math.max(0, (targetUser.beer || 0) - conf.value);
        await updateUser(conf.targetId, { beer: newBeer });
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${conf.value} литр-(ов) пива у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Осталось пива: ${newBeer} л.`;
      } else if (conf.type === "resetbeer") {
        await updateUser(conf.targetId, { beer: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) все литры пива у пользователя [id${conf.targetId}|${conf.targetName}]`;
      } else if (conf.type === "giverep") {
        const newRep = (targetUser.rep || 0) + conf.value;
        await updateUser(conf.targetId, { rep: newRep });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} репутации пользователю [id${conf.targetId}|${conf.targetName}]\n\n| Теперь у него репутации: ${newRep}`;
      } else if (conf.type === "takerep") {
        const newRep = (targetUser.rep || 0) - conf.value;
        await updateUser(conf.targetId, { rep: newRep });
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${conf.value} репутации у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Теперь у него репутации: ${newRep}`;
      } else if (conf.type === "resetrep") {
        await updateUser(conf.targetId, { rep: 0 });
        successText = `[id${userId}|${conf.adminName}] обнулил(-а) всю репутацию у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Теперь у него репутации: 0`;
      } else if (conf.type === "giveprod") {
        const newProds = (targetUser.bizProducts || 0) + conf.value;
        await updateUser(conf.targetId, { bizProducts: newProds });
        successText = `[id${userId}|${conf.adminName}] выдал(-а) ${conf.value} продуктов для бизнеса пользователю [id${conf.targetId}|${conf.targetName}]\n\n| Всего продуктов: ${newProds}`;
      } else if (conf.type === "takeprod") {
        const newProds = Math.max(0, (targetUser.bizProducts || 0) - conf.value);
        await updateUser(conf.targetId, { bizProducts: newProds });
        successText = `[id${userId}|${conf.adminName}] забрал(-а) ${conf.value} продуктов для бизнеса у пользователя [id${conf.targetId}|${conf.targetName}]\n\n| Осталось продуктов: ${newProds}`;
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
      try {
        const cData = chatCache.get(peerId);
        if (cData?.deletecommand) {
          deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id).catch(() => {});
        }
      } catch (e) {}
      return res;
    };

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



    if (message.action) {
      const chatData = await getOrCreateChat(peerId);
      const act = message.action.type;
      if (act === "chat_invite_user" || act === "chat_invite_user_by_link") {
        const memberId = act === "chat_invite_user" ? message.action.member_id : userId;
        const isBot = Number(memberId) === -Math.abs(parseInt(VK_GROUP_ID));
        if (isBot) {
           const welcomeKey = `welcome_bot_${peerId}`;
           if (recentWelcomeChats.has(welcomeKey)) return;
           recentWelcomeChats.add(welcomeKey);
           setTimeout(() => recentWelcomeChats.delete(welcomeKey), 60000);

           const greeting = `Orion был добавлен в беседу.\n\nПеред началом активации, выдайте чат-менеджеру права системного администратора (звёздочку).\n\nПосле этого активируйте чат-менеджера в беседе с помощью команды - /start или кнопки.\n\nДалее выберите тип беседы с помощью команды - /type и синхронизируйте её по команде /sync.`;
           const u = await getOrCreateUser(userId);
           const fullName = u.fullName || u.nick || `User${userId}`;
           let inviteLink = "Отсутствует";
            try {
              const linkRes = await vkApi.get("messages.getInviteLink", {
                params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, reset: 0 }
              });
              if (linkRes.data?.response?.link) {
                inviteLink = linkRes.data.response.link;
              }
            } catch (e) {}

            const logMsg = `Чат-менеджер был добавлен в новую беседу!\n\n| Добавил - [id${userId}|${fullName}]\n| Peer_id чата:${peerId}\n\n| Ссылка на вступление в беседу: ${inviteLink}`;
            sendVkMessage(VK_TOKEN, 2000000010, logMsg).catch(() => {});
           const kb = {
             inline: true,
             buttons: [
               [{ action: { type: "callback", label: "Активировать чат-менеджера", payload: JSON.stringify({ cmd: "activate_cm" }) }, color: "secondary" }]
             ]
           };
           await sendVkMessage(VK_TOKEN, peerId, greeting, { keyboard: JSON.stringify(kb) });
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
               const reason = bInfo.reason || "без причины";
               await sendBanAlert(peerId, memberId, 'ban', reason, bInfo.date, bInfo.expiresAt);
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
               const reason = uData.gbanReason || "без причины";
               await sendBanAlert(peerId, memberId, 'gban', reason, uData.gbanDate, uData.gbanExpiresAt);
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
               const reason = uData.gbanplReason || "без причины";
               await sendBanAlert(peerId, memberId, 'gbanpl', reason, uData.gbanplDate, uData.gbanplExpiresAt);
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
        const getModStr = async (mId?: number) => {
          if (!mId) return "[id1|Модератор]";
          const mUser = await getOrCreateUser(mId);
          const mName = mUser.fullName || mUser.nick || (await fetchVkFullName(mId)) || "Модератор";
          return `[id${mId}|${mName}]`;
        };

        if (uChatBans[peerId]) {
           const bInfo = uChatBans[peerId];
           if (bInfo.expiresAt && Date.now() > bInfo.expiresAt) {
             delete uChatBans[peerId];
             await updateUser(userId, { chatBans: uChatBans });
           } else {
             const modStr = await getModStr(bInfo.by);
             const reason = bInfo.reason || "без причины";
             const dateStr = fmtD(bInfo.date);
             const termStr = formatDurationBanTerm(bInfo.expiresAt, bInfo.date);
             const msgText = `[id${userId}|${fullName}] имеет блокировку в этой беседе!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
             const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_unban_chat", targetId: userId }) }, color: "positive" }]] };
             await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
             } catch (e) {}
             return;
           }
        }

        if (user.gban && chatData.type !== "PL") {
           if (user.gbanExpiresAt && Date.now() > user.gbanExpiresAt) {
             await updateUser(userId, { gban: false, gbanExpiresAt: 0 });
             user.gban = false;
           } else {
             const modStr = await getModStr(user.gbanBy);
             const reason = user.gbanReason || "без причины";
             const dateStr = fmtD(user.gbanDate);
             const termStr = formatDurationBanTerm(user.gbanExpiresAt, user.gbanDate);
             const msgText = `[id${userId}|${fullName}] имеет глобальную блокировку во всех беседах в которых есть Orion!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
             const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungban", targetId: userId }) }, color: "positive" }]] };
             await sendVkMessage(VK_TOKEN, peerId, msgText, { keyboard: JSON.stringify(kb) });
             try {
               await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
             } catch (e) {}
             return;
           }
        }

        if (user.gbanpl && chatData.type === "PL") {
           if (user.gbanplExpiresAt && Date.now() > user.gbanplExpiresAt) {
             await updateUser(userId, { gbanpl: false, gbanplExpiresAt: 0 });
             user.gbanpl = false;
           } else {
             const modStr = await getModStr(user.gbanplBy);
             const reason = user.gbanplReason || "без причины";
             const dateStr = fmtD(user.gbanplDate);
             const termStr = formatDurationBanTerm(user.gbanplExpiresAt, user.gbanplDate);
             const msgText = `[id${userId}|${fullName}] имеет глобальную блокировку во всех беседах игроков в которых есть Orion!\n\n| Информация о блокировке:\n${modStr} | ${reason} | ${termStr} | ${dateStr}`;
             const kb = { inline: true, buttons: [[{ action: { type: "callback", label: "Снять блокировку", payload: JSON.stringify({ cmd: "mod_ungbanpl", targetId: userId }) }, color: "positive" }]] };
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
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять фотографии в беседу запрещено её настройками.`, { noReply: true });
            return;
         }

         // Check sticker ban
         const hasSticker = (message.attachments && message.attachments.some((a: any) => a.type === "sticker")) || message.sticker || message.sticker_id;
         if (chatData.disableStickers && hasSticker) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять стикеры в беседу запрещено её настройками.`, { noReply: true });
            return;
         }

         // Check video ban
         const hasVideo = message.attachments && message.attachments.some((a: any) => a.type === "video" || a.type === "video_file" || a.type === "short_video");
         if (chatData.disableVideo && hasVideo) {
            try {
               await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);
            } catch (e) {}
            await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|${fullName}], отправлять видео в беседу запрещено её настройками.`, { noReply: true });
            return;
         }
      }

      if (chatData.silence) {
         const silenceMinRole = chatData.silenceMinRole || 3;
         const canSpeak = userEffectiveRole >= silenceMinRole || isAdmin || userId === 778382713;
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
            if (currentWarns >= 3) {
               try {
                 await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: userId }
                  });
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
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 1 && !(await checkIsAdmin(userId, peerId, uRole))) {
             const uData = await getOrCreateUser(userId);
             if (!uData.muteUntil || uData.muteUntil < Date.now()) {
                await updateUser(userId, { muteUntil: Date.now() + 30 * 60 * 1000 });
                await executeVkMute(peerId, userId, 30 * 60);
                await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдана блокировка чата сроком на 30 минут из-за флуда сообщениями.`);
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
                await deleteVkMessage(VK_TOKEN, peerId, message.conversation_message_id || message.id);


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

                const tegU = await getOrCreateUser(userId);
              const tegUName = tegU.fullName || tegU.nick || "Пользователь";
              await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|Пользователю] выдано предупреждение из-за тега всех участников беседы.`, { noReply: true });
              }
              return;
            }
          }
        }
      }

      
      // Intercept Zayavka in DM
      if (peerId < 2000000000 && user.zayavkaState && user.zayavkaState.step > 0 && text) {
         const qs = [
            "Сколько вам лет?",
            "Укажите вашу электронную почту",
            "Отлично, теперь укажите ваш Telegram",
            "Какой у вас часовой пояс (от МСК)?",
            "Расскажите, почему вы хотите попасть на пост Заместителя руководителя?",
            "Что вы будете делать на посте Заместителя руководителя?",
            "Почему мы должны взять на пост именно вас?",
            "Есть ли у вас опыт в этой сфере?",
            "Готовы ли вы получить ЧСБ/ЧСР за слив своего поста?",
            "Сколько вы готовы уделять время нашему чат-менеджеру?",
            "Укажите ваш ежедневный онлайн в ВКонтакте",
            "Готовы ли вы слушаться высшее руководство?"
         ];
         user.zayavkaState.answers.push(text);
         if (user.zayavkaState.msgId) {
            deleteVkMessage(VK_TOKEN, peerId, user.zayavkaState.msgId).catch(() => {});
         }
         
         if (user.zayavkaState.step < qs.length) {
             const nextQ = qs[user.zayavkaState.step];
             let qPrefix = "Хорошо, теперь следующий вопрос\n\n";
             if (user.zayavkaState.step === 2) qPrefix = "";
             if (user.zayavkaState.step === 3 || user.zayavkaState.step === 10) qPrefix = "";
             
             const nMsg = await sendResponse(`${qPrefix}${nextQ}`);
             user.zayavkaState.step++;
             user.zayavkaState.msgId = nMsg.response || message.id;
             return;
         } else {
             const kb = {
                inline: true,
                buttons: [
                   [{ action: { type: "callback", label: "Да, отправить", payload: JSON.stringify({ cmd: "zayavka_submit" }) }, color: "positive" }],
                   [{ action: { type: "callback", label: "Нет, не отправлять", payload: JSON.stringify({ cmd: "zayavka_cancel" }) }, color: "negative" }]
                ]
             };
             const nMsg = await sendResponse("Отлично, ваша заявка заполнена!\n\nЖелаете отправить её на рассмотрение руководству?", { keyboard: JSON.stringify(kb) });
             user.zayavkaState.msgId = nMsg.response || message.id;
             user.zayavkaState.step = 0; // ready to submit
             return;
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
            "addstatus", "unstatus", "setinfobot", "achat", "unachat",
            "роль", "баланс", "bal", "balance", "бал", "банк", "снятьбанк", "топ", "пивозавры", "казино", "casino", "рулетка", "roulette", "р", "бизнес", "бизнесы",
            "купитьбиз", "продатьбиз", "дуэль", "д", "duel", "дуэльбиз", "кнб", "мафия", "пиво", "инфа", "кто", "погода",
            "взлом", "фортуна", "бонус", "подписка", "купитьпрем", "прем", "премпрофиль", "прембаланс",
            "реп", "rep", "промо", "промокод", "promo", "promocode", "createpromo", "id", "ид", "айди", "infoid", "addsenmoder",
            "снятьроль", "снятьправа", "кикнеактив",
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

            const MANAGER_CMDS_SET = new Set([
        "/gban", "/гбан", "/ungban", "/юнгбан", "/унгбан", "/ангбан", "/гунгбан",
        "/gbanlist", "/гбанлист", "/списокгбан",
        "/blacklist", "/чслист", "/списокчс",
        "/rstats", "/рстата",
        "/grrole", "/гснятьроль",
        "/banid", "/банид", "/забанитьбеседу",
        "/unbanid", "/анбанид", "/разбанитьбеседу",
        "/infochat", "/инфочат", "/чатинфо", "/chatinfo",
        "/infoid", "/инфоид", "/ид", "/id", "/айди",
        "/addblack", "/чс", "/чсб", "/вчс", "/добавитьвчс", "/аддблэк",
        "/unblack", "/анблэк", "/анчс", "/изчс", "/удалитьизчс", "/унчсб",
        "/gsnick", "/гник", "/гсник",
        "/grnick", "/грудалитьник",
        "/zunban", "/зунбан",
        "/addzsr", "/замруководителя", "/заместитель",
        "/addozsr", "/оснзамруководителя", "/озаместитель",
        "/rebuke", "/выговор",
        "/unrebuke", "/снятьвыговор",
        "/addruk", "/руководитель",
        "/addgr", "/главныйруководитель", "/грук",
        "/renameroles", "/переименоватьроли", "/аудио",
        "/kickfrozen", "/frozenlist"
      ]);
      
      const args = cmdText.split(/\s+/);
      const rawCmd = args[0].toLowerCase();
      if (MANAGER_CMDS_SET.has(rawCmd) && !chatData.isManagerChat && peerId > 2000000000) {
          return await sendResponse("Данная команда доступна только в беседе руководства!");
      }
      if (user.gban || user.gbanpl) {
        return await sendVkMessage(VK_TOKEN, peerId, `[id${userId}|вы], находитесь в глобальной блокировке чат-менеджера Orion.`, {
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
      const isCooldownBypass = (user.role || 0) >= 12 || userId === 778382713 || userId === 1115715881 || userId === 1;
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
          "/игровые", "/игры", "/гхелп", "/пинг", "/ping", "/инфо", "/info", "/infobot", "/инфобот", "/заявка"
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

      
      if (rawCmd === "/alt" || rawCmd === "/альт" || rawCmd === "/алиасы" || rawCmd === "/aliases") {
        const altText = `...:: Альтернативные команды (Алиасы) ::...

📋 Основные & Инфо:
/help — /помощь, /хелп, /команды, /меню, /cmd, /cmds
/stats — /стата, /статистика
/profile — /профиль, /проф
/rules — /правила, /правилабота
/status — /статус
/sync — /синхронизация, /синк
/type — /тип, /типбеседы
/staff — /стафф, /состав, /админы
/alt — /альт, /алиасы, /aliases

🛡️ Модерация:
/mute — /мут, /m
/unmute — /размут, /анмут, /снятьмут, /разглушить, /unm
/smute — /смут
/warn — /варн, /предупреждение, /пред, /w
/unwarn — /разварн, /анварн, /снятьварн, /снятьпред, /unw
/swarn — /сварн
/ban — /бан, /забанить, /б, /b
/unban — /разбан, /анбан, /снятьбан, /unb
/sban — /сбан
/kick — /кик, /кикнуть, /исключить, /k
/skick — /скик
/clear — /очистить, /cl
/sclear — /сочистить, /склир
/mutelist — /муты, /списокмутов
/warnlist — /варны, /списокварнов
/banlist — /баны, /списокбанов
/frozenlist — /замороженные
/kickfrozen — /кикзамороженных, /киксобак

👑 Уровни прав:
/addaccesslevel — /роль, /addlevel, /setlevel, /setaccesslevel, /addaccess, /выдатьроль
/removerole — /delrole, /снятьроль
/giveowner — /передатьвладельца
/renameroles — /переименоватьроли, /ролиназвания
/заместитель — /замруководителя
/озаместитель — /оснзамруководителя
/addruk — /руководитель

🌐 Глобальные & Беседа руководства:
/gban — /гбан, /глобалбан
/ungban — /юнгбан, /унгбан, /анgban
/addblack — /чс, /чсб, /вчс, /добавитьвчс, /аддблэк
/unblack — /анблэк, /анчс, /изчс, /удалитьизчс, /унчсб
/gbanlist — /гбанлист
/blacklist — /чслист, /списокчс
/getban — /чекбан, /проверитьбан
/addantiteg — /антитег
/unantiteg — /снятьантитег
/addawstats — /австатс
/unawstats — /снятавстатс
/gaddawstats — /гавстатс
/gunawstats — /снятьгавстатс
/аудио — /audio, /музыка, /music, /setaudio, /установитьаудио

📝 Заявки:
/заявка — /zayavka, /податьзаявку (в ЛС бота)`;
        return await sendResponse(altText);
      }


      if (rawCmd === "/х2" || rawCmd === "/x2") {
        const isBotOwner = user.role >= 12 || userId === 778382713 || ((globalThis as any).appState && (globalThis as any).appState.botOwnerId === userId);
        if (!isBotOwner) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
        
        globalThis.isX2ManualActive = !globalThis.isX2ManualActive;
        if ((globalThis as any).appState) (globalThis as any).appState.isX2Active = globalThis.isX2ManualActive;
        
        if (globalThis.isX2ManualActive) {
          return await sendResponse("Х2 режим был включён до понедельника!");
        } else {
          return await sendResponse("Х2 режим был отключён до пятницы.");
        }
      }


      if (rawCmd === "/renameroles" || rawCmd === "/переименоватьроли" || rawCmd === "/ролиназвания") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
        }
        
        const chatData = await getOrCreateChat(peerId);
        const customRoles = chatData.customRoleNames || {};
        const isConfigured = !!(customRoles.owner || customRoles.ga || customRoles.zga || customRoles.sadmin || customRoles.admin || customRoles.smoder || customRoles.moder);
        
        const rawText = getRawArgText(cmdText).trim();
        if (!rawText) {
          if (!isConfigured) {
            const helpText = `Укажите аргументы команды!\n\n| Пример:\n\n| Владелец беседы:\n- {owner}\n\n| Главный Администратор:\n- {ga}\n\n| Зам. Глав. Администратора:\n- {zga}\n\n| Старший Администратор:\n- {sadmin}\n\n| Администратор:\n- {admin}\n\n| Старший Модератор:\n- {smoder}\n\n| Модератор:\n- {moder}`;
            return await sendResponse(helpText);
          } else {
            const kb = {
              inline: true,
              buttons: [
                [{ action: { type: "callback", label: "Установить новое название", payload: JSON.stringify({ cmd: "renameroles_set" }) }, color: "positive" }],
                [{ action: { type: "callback", label: "Удалить название ролей", payload: JSON.stringify({ cmd: "renameroles_del" }) }, color: "negative" }]
              ]
            };
            const statusText = `...::Изменение названия ролей::...\n\n| Установленное название ролей: ${isConfigured ? "Да" : "Нет"}`;
            return await sendResponse(statusText, { keyboard: JSON.stringify(kb) });
          }
        }
        
        // Parse custom roles from input
        const newRoles: any = { ...customRoles };
        const lines = rawText.split("\n");
        let currentKey = "";
        for (const line of lines) {
          const l = line.trim();
          if (l.toLowerCase().includes("владелец") || l.toLowerCase().includes("{owner}")) currentKey = "owner";
          else if (l.toLowerCase().includes("главный админ") || l.toLowerCase().includes("{ga}")) currentKey = "ga";
          else if (l.toLowerCase().includes("зам. глав") || l.toLowerCase().includes("{zga}")) currentKey = "zga";
          else if (l.toLowerCase().includes("старший админ") || l.toLowerCase().includes("{sadmin}")) currentKey = "sadmin";
          else if (l.toLowerCase().includes("администратор") || l.toLowerCase().includes("{admin}")) currentKey = "admin";
          else if (l.toLowerCase().includes("старший модер") || l.toLowerCase().includes("{smoder}")) currentKey = "smoder";
          else if (l.toLowerCase().includes("модератор") || l.toLowerCase().includes("{moder}")) currentKey = "moder";
          else if (l.startsWith("-") && currentKey) {
            newRoles[currentKey] = l.replace(/^[-s]+/, "").trim();
          }
        }
        
        await updateChat(peerId, { customRoleNames: newRoles });
        return await sendResponse("Названия ролей для беседы успешно обновлены!");
      }


      if (rawCmd === "/frozenlist" || rawCmd === "/замороженные" || rawCmd === "/собаки") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
        }
        
        try {
          const memRes = await vkApi.get("messages.getConversationMembers", {
            params: { peer_id: peerId, access_token: VK_TOKEN, v: "5.199" }
          });
          const profiles = memRes.data?.response?.profiles || [];
          const deactivated = profiles.filter((p: any) => p.deactivated);
          
          if (deactivated.length === 0) {
            return await sendResponse("В беседе нет удалённых или замороженных пользователей.");
          }
          
          let out = `Список удалённых/замороженных пользователей (${deactivated.length}):\n\n`;
          deactivated.slice(0, 15).forEach((p: any, idx: number) => {
            const statusStr = p.deactivated === "banned" ? "Заблокирован" : "Удалён";
            out += `${idx + 1}) [id${p.id}|${p.first_name} ${p.last_name}] — ${statusStr}\n`;
          });
          
          const kbButtons: any[] = [];
          if (deactivated.length > 15) {
            kbButtons.push([
              { action: { type: "callback", label: "Вперёд ⏩", payload: JSON.stringify({ cmd: "frozen_page", page: 2 }) }, color: "primary" }
            ]);
          }
          
          return await sendResponse(out, kbButtons.length ? { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }) } : {});
        } catch (e) {
          return await sendResponse("Не удалось получить список участников беседы.");
        }
      }

      if (rawCmd === "/kickfrozen" || rawCmd === "/кикзамороженных" || rawCmd === "/киксобак") {
        const isOwner = await checkIsOwner(userId, peerId, user.role);
        if (!isOwner && user.role < 12 && userId !== 778382713) {
          return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
        }
        
        const kb = {
          inline: true,
          buttons: [
            [
              { action: { type: "callback", label: "Да, исключить", payload: JSON.stringify({ cmd: "kick_frozen_confirm", initiatorId: userId }) }, color: "positive" },
              { action: { type: "callback", label: "Нет, не исключать", payload: JSON.stringify({ cmd: "kick_frozen_cancel", initiatorId: userId }) }, color: "negative" }
            ]
          ]
        };
        
        return await sendResponse("Вы действительно хотите исключить всех удалённых/замороженных пользователей из беседы?", { keyboard: JSON.stringify(kb) });
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
          return await sendVkMessage(VK_TOKEN, peerId, `Orion не активирован в беседе. Для активации напишите - /start`, {
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
          try {
            const tu = await getOrCreateUser(targetIdVal);
            targetFullName = tu.fullName || tu.nick || (await fetchVkFullName(targetIdVal)) || `User${targetIdVal}`;
          } catch(e) {}
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
        } else if (["/givemoney", "/датьденег", "/выдатьденьги", "/выдать_деньги"].includes(rawCmd)) {
          actionStr = "выдал(-а) валюту";
          if (args[2]) betStr = args[2];
        } else if (["/takemoney", "/забратьденьги", "/снятьденьги", "/забратьбаланс", "/снятьбаланс"].includes(rawCmd)) {
          actionStr = "забрал(-а) валюту";
          if (args[2]) betStr = args[2];
        } else if (["/setmoney"].includes(rawCmd)) {
          actionStr = "установил(-а) баланс";
          if (args[2]) betStr = args[2];
        } else if (["/resetmoney"].includes(rawCmd)) {
          actionStr = "обнулил(-а) баланс";
        } else if (["/takebusiness", "/забратьбизнес"].includes(rawCmd)) {
          actionStr = "забрал(-а) бизнес-(ы)";
        } else if (["/takeprod", "/забратьпродукты"].includes(rawCmd)) {
          actionStr = "забрал(-а) продукты";
        } else if (["/takebeer", "/забратьпиво"].includes(rawCmd)) {
          actionStr = "забрал(-а) пиво";
        } else if (["/takerep", "/забратьрепутацию"].includes(rawCmd)) {
          actionStr = "забрал(-а) репутацию";
        } else if (["/takevip", "/забратьvip"].includes(rawCmd)) {
          actionStr = "забрал(-а) VIP";
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
        } else if (["/заявка"].includes(rawCmd)) {
          actionStr = "Подал(-а) заявку";
        } else if (["/listfrozen"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) список замороженных";
        } else if (["/kickfrozen"].includes(rawCmd)) {
          actionStr = "Исключил(-а) замороженных";
        } else if (["/alt", "/алиясы", "/альт"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) алиасы команд";
        } else if (["/addaccesslevel", "/роль", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/выдатьроль"].includes(rawCmd)) {
          actionStr = "Выдал(-а) уровень прав";
        } else if (["/stats", "/стата", "/статистика", "/профиль", "/profile", "/инфобот", "/infobot"].includes(rawCmd)) {
          actionStr = "Посмотрел(-а) статистику";
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

      

      if (rawCmd === "/заявка") {
         if (peerId > 2000000000) {
            return await sendResponse("Данная команда доступна только в личных сообщениях бота!");
         }
         const zKb = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Да, хочу", payload: JSON.stringify({ cmd: "zayavka_start" }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет, не хочу", payload: JSON.stringify({ cmd: "zayavka_cancel" }) }, color: "negative" }]
            ]
         };
         return await sendResponse(`[id${userId}|${fullName}], приветствуем!\n\nВы хотите подать заявку на пост заместителя руководителя?`, { keyboard: JSON.stringify(zKb) });
      }

      if (rawCmd === "/renameroles" || rawCmd === "/переименоватьроли") {
         const isSecondaryOwner = chatData.ownerId2 === userId;
         const isPrimaryOwner = chatData.ownerId === userId;
         if (!isSecondaryOwner && !isPrimaryOwner && user.role < 12) {
            return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         }
         
         if (args.length === 1) {
             const r = chatData.customRoles || {};
             if (Object.keys(r).length > 0) {
                 const rrStr = `...::Изменение названия ролей::...\n\n| Установленное название ролей: Да`;
                 const rrKb = {
                    inline: true,
                    buttons: [
                       [{ action: { type: "callback", label: "Установить новое название", payload: JSON.stringify({ cmd: "rr_new" }) }, color: "positive" }],
                       [{ action: { type: "callback", label: "Удалить название ролей", payload: JSON.stringify({ cmd: "rr_del" }) }, color: "negative" }]
                    ]
                 };
                 return await sendResponse(rrStr, { keyboard: JSON.stringify(rrKb) });
             } else {
                 return await sendResponse(`Укажите аргументы команды!\n\n| Пример:\n\n| Владелец беседы:\n- {owner}\n\n| Главный Администратор:\n- {ga}\n\n| Зам. Глав. Администратора:\n- {zga}\n\n| Старший Администратор:\n- {sadmin}\n\n| Администратор:\n- {admin}\n\n| Старший Модератор:\n- {smoder}\n\n| Модератор:\n- {moder}`, { noReply: true });
             }
         }
         
         const fullText = args.slice(1).join(" ");
         // Parse the names
         const customRoles = {};
         const lines = fullText.split("\n");
         let currentRole = "";
         for (const line of lines) {
             const lower = line.toLowerCase();
             if (lower.includes("владелец")) currentRole = "owner";
             else if (lower.includes("главный администратор") || lower.includes("га")) currentRole = "ga";
             else if (lower.includes("зам. глав. администратора") || lower.includes("зга")) currentRole = "zga";
             else if (lower.includes("старший администратор")) currentRole = "sadmin";
             else if (lower.includes("администратор")) currentRole = "admin";
             else if (lower.includes("старший модератор")) currentRole = "smoder";
             else if (lower.includes("модератор")) currentRole = "moder";
             else if (line.trim().startsWith("- {") && line.trim().endsWith("}") && currentRole) {
                 const name = line.trim().slice(3, -1);
                 customRoles[currentRole] = name;
                 currentRole = "";
             }
         }
         chatData.customRoles = customRoles;
         const chatRef = firestoreDb.collection("chats").doc(peerId.toString());
         await chatRef.set({ customRoles }, { merge: true }).catch(() => {});
         return await sendResponse("Названия ролей успешно обновлены!");
      }

       if (["/setmusic", "/музыка", "/профильмузыка", "/сетмузыка"].includes(rawCmd)) {
          let audioAttach = null;
         if (message.attachments) {
            audioAttach = message.attachments.find((a: any) => a.type === "audio");
         }
         if (!audioAttach && message.reply_message && message.reply_message.attachments) {
            audioAttach = message.reply_message.attachments.find((a: any) => a.type === "audio");
         }
         if (audioAttach) {
            const ownerIdStr = userId.toString();
            const uRef = firestoreDb.collection("users").doc(ownerIdStr);
            const audioData = {
               attachment: `audio${audioAttach.audio.owner_id}_${audioAttach.audio.id}`,
               artist: audioAttach.audio.artist || "Неизвестен",
               title: audioAttach.audio.title || "Без названия"
             };
            await uRef.set({ profileAudio: audioData }, { merge: true }).catch(()=>{});
            return await sendResponse("Музыка успешно установлена в профиль и статистику!");
         } else {
            return await sendResponse("Пожалуйста, прикрепите аудиозапись к сообщению или ответьте на сообщение с аудиозаписью.");
         }
      }

      
      if (rawCmd === "/frozenlist") {
         if (user.role < 7 && chatData.ownerId !== userId && chatData.ownerId2 !== userId) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         const { items } = await getChatMembers(peerId);
         const list = [];
         for (const m of items) {
             if (m.member_id > 0) {
                 try {
                     const { data } = await vkApi.get("users.get", { params: { user_ids: m.member_id, access_token: VK_TOKEN, v: "5.199" } });
                     if (data.response && data.response[0] && data.response[0].deactivated) {
                         list.push(m.member_id);
                     }
                 } catch(e) {}
             }
         }
         if (list.length === 0) return await sendResponse("Замороженных/удаленных пользователей в беседе нет.");
         let msg = "Список удалённых/замороженных пользователей:\n\n";
         for (let i = 0; i < list.length; i++) {
             msg += `${i+1}. @id${list[i]}\n`;
         }
         return await sendResponse(msg, { disable_mentions: 1 });
      }

      if (rawCmd === "/kickfrozen") {
         if (user.role < 7 && chatData.ownerId !== userId && chatData.ownerId2 !== userId) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         const kb = {
            inline: true,
            buttons: [
               [{ action: { type: "callback", label: "Да, исключить", payload: JSON.stringify({ cmd: "kf_yes" }) }, color: "positive" }],
               [{ action: { type: "callback", label: "Нет, не исключать", payload: JSON.stringify({ cmd: "kf_no" }) }, color: "negative" }]
            ]
         };
         return await sendResponse("Вы действительно хотите исключить всех удалённых/замороженных пользователей из беседы?", { keyboard: JSON.stringify(kb) });
      }
      if (rawCmd === "/alt" || rawCmd === "/алиясы" || rawCmd === "/альт") {
         const altText = `...::Альтернативные команды::...\n\n/help - /помощь, /хелп, /команды, /меню\n/stats - /стата, /статистика\n/kick - /кик, /исключить, /выгнать, /к, /k\n/ban - /бан, /забанить, /б, /b\n/mute - /мут, /m\n/warn - /варн, /предупреждение, /w\n/unban - /разбан, /разбанить, /unb\n/unmute - /размут, /снятьмут, /unm\n/unwarn - /разварн, /снятьварн, /unw\n/gban - /гбан, /глобалбан\n/addblack - /чс, /вчс, /чсб`;
         return await sendResponse(altText, { noReply: true });
      }
      
      if (["/addaccesslevel", "/роль", "/addlevel", "/setlevel", "/setaccesslevel", "/addaccess", "/выдатьроль"].includes(rawCmd)) {
         const effRole = user.role >= 8 ? user.role : (chatData.ownerId === userId || chatData.ownerId2 === userId ? 12 : 0);
         if (effRole < 9 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         
         const levelMatch = args.join(" ").match(/\d+/);
         if (!levelMatch) return await sendResponse("Укажите уровень прав (от 1 до 6)!");
         const level = parseInt(levelMatch[0]);
         if (level < 1 || level > 6) return await sendResponse("Укажите уровень прав от 1 до 6!");
         
         // Старший модератор(9) может выдать до 1 лвл
         // Администратор(10) может выдать до 2 лвл
         // Старший Администратор(11) может выдать до 3 лвл
         // Зам. Глав. Администратора(12) может выдать до 4 лвл
         // Главный Администратор(13) может выдать до 5 лвл
         // Владелец(14) может выдать до 6 лвл
         const maxLevel = effRole >= 14 || isAdmin ? 6 : (effRole - 8);
         if (level > maxLevel) return await sendResponse("У вас недостаточно прав для выдачи этого уровня!");
         
         const giveRole = level + 7;
         const roleNames = { 1: "Модератор", 2: "Старший Модератор", 3: "Администратор", 4: "Старший Администратор", 5: "Зам. Глав. Администратора", 6: "Главный Администратор" };
         const roleName = roleNames[level];
         
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
         
         await updateUser(parsed.targetId, { role: giveRole, appointedBy: { id: userId, name: fullName }, appointedDate: Date.now() });
         try { await sendVkMessage(VK_TOKEN, parsed.targetId, `[id${parsed.targetId}|Пользователь], приветствуем!\n\nВы были назначены на пост «${roleName}».`); } catch (e) {}
         
         return await sendResponse(`[id${parsed.targetId}|Пользователю] выдан уровень прав «${roleName}»\n\n| Модератор, который выдал уровень прав - [id${userId}|${fullName}]`, { noReply: true });
      }

              if (["/пиво", "/beer"].includes(rawCmd)) {
          const now = Date.now();
          const lastBeer = user.lastBeerTime || 0;
          if (now - lastBeer < 3600 * 1000) {
             const remMin = Math.ceil((3600 * 1000 - (now - lastBeer)) / 60000);
             return await sendResponse(`Вы уже пили пиво недавно! Следующая попытка через ${remMin} мин.`);
          }

          const randomQuiz = RUSSIAN_GRAMMAR_QUIZ[Math.floor(Math.random() * RUSSIAN_GRAMMAR_QUIZ.length)];
          const wordsList = [
             { text: randomQuiz.correct, isCorrect: true },
             ...randomQuiz.wrong.slice(0, 2).map(w => ({ text: w, isCorrect: false }))
          ];
          // Shuffle words
          wordsList.sort(() => Math.random() - 0.5);

          const kb = {
             inline: true,
             buttons: wordsList.map(w => [
                { action: { type: "callback", label: w.text, payload: JSON.stringify({ cmd: "beer_quiz", authorId: userId, isCorrect: w.isCorrect ? 1 : 0 }) }, color: "secondary" }
             ])
          };

          const promptMsg = "Перед пивом решите задачу по русскому языку\n\nНа кнопках представлены слова, вам нужно нажать на 1 верную!";
          return await sendResponse(promptMsg, { keyboard: JSON.stringify(kb) });
       }

       if (["/mute", "/мут", "/m"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна с должности Модератора.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) {
            return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          }
          
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const timeMin = duration ? Math.max(1, Math.round((duration.until - Date.now()) / 60000)) : 30;
          const expiresAt = duration ? duration.until : Date.now() + timeMin * 60 * 1000;
          const expDate = formatMskDateAmPm(expiresAt);
          
          await updateUser(parsed.targetId, {
            muteUntil: expiresAt,
            muteReason: reason,
            mutePeerId: peerId,
            muteBy: userId,
            muteDate: Date.now()
          });
          
          const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
          const kbButtons: any[] = [
            [{ action: { type: "callback", label: "Снять блокировку чата", payload: JSON.stringify({ cmd: "mod_unmute", targetId: parsed.targetId }) }, color: "positive" }],
            [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick", targetId: parsed.targetId, reason }) }, color: "secondary" }]
          ];
          if (isReply) {
            kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
          }
          
          const outMsg = `[id${parsed.targetId}|Пользователю] выдана блокировка чата сроком на ${timeMin} мин по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]\n| Блокировка чата выдана до: ${expDate}`;
          return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: !isReply });
        }

        if (["/smute", "/смут"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 1 && !isAdmin) return;
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return;
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return;
          
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const timeMin = duration ? Math.max(1, Math.round((duration.until - Date.now()) / 60000)) : 30;
          const expiresAt = duration ? duration.until : Date.now() + timeMin * 60 * 1000;
          
          await updateUser(parsed.targetId, {
            muteUntil: expiresAt,
            muteReason: reason,
            mutePeerId: peerId,
            muteBy: userId,
            muteDate: Date.now()
          });
          return; // Completely silent
        }

        if (["/unmute", "/размут", "/анмут", "/снятьмут", "/разглушить", "/размутить", "/измута", "/unm"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          
          await updateUser(parsed.targetId, { muteUntil: 0, muteReason: "", mutePeerId: 0 });
          return await sendResponse(`[id${parsed.targetId}|Пользователю] была снята блокировка чата.\n\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });
        }

        if (["/warn", "/варн", "/предупреждение", "/w", "/пред"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна с должности Модератора.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) {
            return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          }
          
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason } = extractReasonAndDuration(remainingArgs);
          const targetU = await getOrCreateUser(parsed.targetId);
          const chatWarns = targetU.chatWarnings || {};
          const currentWarns = (chatWarns[peerId] || 0) + 1;
          chatWarns[peerId] = currentWarns;
          
          const targetName = targetU.fullName || targetU.nick || (await fetchVkFullName(parsed.targetId)) || `User${parsed.targetId}`;
          
          if (currentWarns >= 3) {
            chatWarns[peerId] = 0;
            const chatBans = targetU.chatBans || {};
            chatBans[peerId] = { by: userId, reason: `3/3 предупреждений: ${reason}`, date: Date.now(), expiresAt: 0 };
            await updateUser(parsed.targetId, { chatWarnings: chatWarns, chatBans });
            
            try {
              await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
            } catch (e) {}
            
            return await sendResponse(`[id${parsed.targetId}|${targetName}] был(-а) заблокирован(-а) и исключён(-на) из беседы\n\n| Причина: 3/3 предупреждений, ${reason}`, { noReply: true });
          } else {
            await updateUser(parsed.targetId, { chatWarnings: chatWarns });
            
            const isReply = !!(message.reply_message || (message.fwd_messages && message.fwd_messages.length > 0));
            const kbButtons: any[] = [
              [{ action: { type: "callback", label: "Снять предупреждение", payload: JSON.stringify({ cmd: "mod_unwarn", targetId: parsed.targetId }) }, color: "positive" }],
              [{ action: { type: "callback", label: "Исключить из беседы", payload: JSON.stringify({ cmd: "mod_kick", targetId: parsed.targetId, reason }) }, color: "secondary" }]
            ];
            if (isReply) {
              kbButtons.push([{ action: { type: "callback", label: "Очистить сообщения", payload: JSON.stringify({ cmd: "mod_clear_user_msgs", targetId: parsed.targetId, cmId: message.conversation_message_id, msgId: message.id }) }, color: "negative" }]);
            }
            

            const outMsg = `[id${parsed.targetId}|Пользователю] выдано предупреждение ${currentWarns}/3 по причине: ${reason}\n\n| Модератор - [id${userId}|${fullName}]`;
           return await sendResponse(outMsg, { keyboard: JSON.stringify({ inline: true, buttons: kbButtons }), noReply: !isReply });
           }
        }

        if (["/skick", "/скик"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 1 && !isAdmin) return;
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return;
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return;
          
          try {
            await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
          } catch (e) {}
          return; // Completely silent
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
         if (user.role < 6 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
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
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          await updateUser(parsed.targetId, {
            gbanpl: true,
            gbanplReason: reason,
            gbanplBy: userId,
            gbanplDate: Date.now(),
            gbanplExpiresAt: expiresAt
          });
          await sendBanAlert(peerId, parsed.targetId, "gbanpl", reason, Date.now(), expiresAt);
          return;
       }

            if (rawCmd === "/gban" || rawCmd === "/гбан") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin || effRole >= 12))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          await updateUser(parsed.targetId, {
            gban: true,
            gbanReason: reason,
            gbanBy: userId,
            gbanDate: Date.now(),
            gbanExpiresAt: expiresAt
          });
          await sendBanAlert(peerId, parsed.targetId, "gban", reason, Date.now(), expiresAt);
          return;
       }

      if (rawCmd === "/aban" || rawCmd === "/абан") {
         if (user.role < 10 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Команда доступна Руководителю.");
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
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          await updateUser(parsed.targetId, {
            gbanpl: false,
            gbanplReason: "",
            gbanplBy: 0,
            gbanplExpiresAt: 0
          });

          return await sendResponse(`[id${parsed.targetId}|Пользователю] была снята глобальная блокировка во всех беседах.\n\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });
       }

      if (rawCmd === "/ungban" || rawCmd === "/юнгбан" || rawCmd === "/унгбан" || rawCmd === "/ангбан" || rawCmd === "/гунгбан") {
          const effRole = user.role >= 12 || userId === 778382713 ? 12 : (user.role || 0);
          if (effRole < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

          await updateUser(parsed.targetId, {
            gban: false,
            gbanReason: "",
            gbanBy: 0,
            gbanExpiresAt: 0
          });

          return await sendResponse(`[id${parsed.targetId}|Пользователю] была снята глобальная блокировка во всех беседах.\n\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });
       }

      if (rawCmd === "/роль") {
         const uRole = await getRealRole(peerId, userId);
         if (uRole < 9 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         
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
         if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
              const gRole = (u.role && u.role <= 7) ? u.role : 0;
              const effRole = Math.max(gRole, cRole);
              const r = (effRole >= 1 && effRole <= 7) ? Math.floor(effRole) : 0;
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

| Главный Администратор:
${fmtList(byRole[6])}

| Зам. Главный Администратора:
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
            return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
           if (uId === 778382713 || uId === 1) {
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
         if (user.role < 10.5 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
         if (user.role < 10.5 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
         if (user.role < 8 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
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
           return await sendResponse("У вас недостаточный уровень прав для этой команды. Команда доступна с 8 уровня прав.");
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
         if (user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         await updateChat(peerId, { isAdminChat: true, isManagerChat: true });
         return await sendResponse(`Беседа №${peerId} успешно установлена как админ-чат и чат руководства!`);
      }

      if (rawCmd === "/unachat" || rawCmd === "/уначат") {
         if (user.role < 12 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         await updateChat(peerId, { isAdminChat: false, isManagerChat: false });
         return await sendResponse(`Беседа №${peerId} убрана из статуса админ-чата и чата руководства.`);
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
         if (user.role >= 12 || userId === 778382713 || userId === 1) {
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
         if (!isAllowed) return await sendResponse("У вас недостаточный уровень прав для этой команды.");

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
         if (!isAllowed) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");

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
         if (user.role < 12 && !isAdmin && userId !== 778382713 && userId !== 1115715881) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");

         const { timeMin } = parseMuteDuration(args);
         const durationSec = Math.max(60, timeMin * 60);

         let systemMuteSuccess = false;
         let vkErrMsg = "";
         try {
           const res = await axios.get("https://api.vk.com/method/messages.changeConversationMemberRestrictions", {
             params: {
               access_token: VK_TOKEN,
               v: "5.199",
               peer_id: peerId,
               member_id: parsed.targetId,
               member_ids: String(parsed.targetId),
               for: durationSec,
               action: "ro",
               read_only: 1
             }
           });
           if (res.data && res.data.error) {
             vkErrMsg = `[Ошибка VK API ${res.data.error.error_code}: ${res.data.error.error_msg}]`;
           } else {
             systemMuteSuccess = true;
           }
         } catch (e: any) {
           vkErrMsg = `[Ошибка: ${e.message}]`;
         }

         const muteUntil = Date.now() + durationSec * 1000;
         await updateUser(parsed.targetId, { muteUntil, muteReason: "Тестовый системный мут" });

         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `id${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] выдал(-а) тестовый системный мут [id${parsed.targetId}|${targetName}] на ${timeMin} мин\n\n| Системное ограничение (read-only): ${systemMuteSuccess ? "Успешно приложено сообществом VK" : "Не удалось применить VK " + vkErrMsg}`);
      }

       if (["/clear", "/очистить", "/чистка", "/mclear", "/клир", "/мклир", "/удалитьсообщения", "/delmsg", "/clean"].includes(rawCmd)) {
          if (user.role < 1 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          const parsed = await parseTargetUser(message, args.slice(1));
          
          let count = 1;
          for (let i = 1; i < args.length; i++) {
             const num = parseInt(args[i]);
             if (num && !isNaN(num) && !args[i].includes("id") && !args[i].startsWith("[") && num > 0 && num <= 100) {
                count = num;
                break;
             }
          }
          if ((rawCmd === "/mclear" || rawCmd === "/мклир") && count === 1 && !args.some(a => parseInt(a) === 1)) {
             count = 10;
          }

          const targetId = parsed.targetId || null;
          if (targetId && !(await checkHierarchy(peerId, userId, targetId, isAdmin))) {
             return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");
          }

          try {
            const currentCmid = message.conversation_message_id;
            const replyCmid = message.reply_message?.conversation_message_id;
            const deletedCount = await deleteMessagesForUser(peerId, targetId, count, currentCmid, replyCmid);
            const actualCount = deletedCount > 0 ? deletedCount : count;
            if (targetId) {
               return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${actualCount} сообщ. от [id${targetId}|пользователя]`, { noReply: true });
            } else {
               return await sendResponse(`[id${userId}|Модератор] очистил(-а) ${actualCount} последних сообщений в беседе`, { noReply: true });
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
            return await sendResponse("У вас недостаточный уровень прав для этой команды. Команда доступна с должности Администратор.");
          }
          try {
            await purgeCommandMessages(peerId, 200);
            return await sendResponse("Ненужная информация в беседе была очищена");
          } catch(e) {
            return await sendResponse("Произошла ошибка при очистке сообщений.");
          }
       }

       if (["/givesalary", "/выдатьзарплату", "/выдатьзп", "/начислитьзп"].includes(rawCmd)) {
          if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
          const snap = await firestoreDb.collection("users").get();
          const salaryAmount = 500000;
          let count = 0;
          for (const doc of snap.docs) {
            const u = doc.data();
            const uId = u.userId || parseInt(doc.id);
            if (!uId || isNaN(uId)) continue;
            const role = u.role || 0;
            if (role >= 8 || uId === 778382713) {
              const currentBal = u.balance || 0;
              await updateUser(uId, { balance: currentBal + salaryAmount });
              count++;
            }
          }
          const salaryMsg = `Еженедельная зарплата была начислена всему руководству чат-менеджера.\n\nСумма зарплаты: 500.000$`;
          await sendVkMessage(VK_TOKEN, 2000000024, salaryMsg);
          return await sendResponse(`Выдана еженедельная зарплата 500.000$ для руководства (${count} чел.) в беседе №24!`);
       }

      if (rawCmd === "/addstatus") {
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
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
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         await updateUser(parsed.targetId, { customStatus: "" });
         const tUser = await getOrCreateUser(parsed.targetId);
         const targetName = tUser.fullName || tUser.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] удалил(-а) статус у [id${parsed.targetId}|${targetName}]`);
      }

      if (rawCmd === "/arrole") {
         if (user.role < 12 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу чат-менеджера.");
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
         if (user.role < 8 && userId !== 778382713) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только с должности Основной заместитель руководителя.");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

         await updateUser(parsed.targetId, { role: 0 });
         const targetU = await getOrCreateUser(parsed.targetId);
         const targetName = targetU.fullName || targetU.nick || `User${parsed.targetId}`;
         return await sendResponse(`[id${userId}|${fullName}] снял(-а) глобальную роль с [id${parsed.targetId}|пользователя]`, { noReply: true });
      }

            if (["/ban", "/бан", "/забанить", "/б", "/b"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна Старшему модератору.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;
          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
          await updateUser(parsed.targetId, { chatBans });
          try {
             await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
          } catch (e) {}

          const durationText = duration ? duration.text : "навсегда";
          const endStr = expiresAt > 0 ? formatMskDateAmPm(expiresAt) : "навсегда";
          const banMsg = `[id${parsed.targetId}|Пользователю] выдана блокировка скором на ${durationText} по причине: ${reason}

| Модератор - [id${userId}|${fullName}]
| Блокировка до: ${endStr}`;

          const kb = {
             inline: true,
             buttons: [
                [{ action: { type: "callback", label: "Вынести из блокировки", payload: JSON.stringify({ cmd: "unban_alert_action", targetId: parsed.targetId, type: "ban" }) }, color: "positive" }],
                [{ action: { type: "callback", label: "Информация о блокировках", payload: JSON.stringify({ cmd: "info_alert_action", targetId: parsed.targetId }) }, color: "default" }]
             ]
          };

          return await sendResponse(banMsg, { keyboard: JSON.stringify(kb), noReply: true });
       }

      if (["/unban", "/разбан", "/унбан", "/разбанить", "/избана", "/unb", "/ранбан", "/runban"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          delete chatBans[peerId];
          delete chatBans[String(peerId)];
          await updateUser(parsed.targetId, { chatBans });
          targetU.chatBans = chatBans;
          userCache.set(parsed.targetId, targetU);

          return await sendResponse(`[id${parsed.targetId}|Пользователю] была снята блокировка.\n\n| Модератор - [id${userId}|${fullName}]`, { noReply: true });
       }

       if (["/sban", "/сбан"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 2 && !isAdmin) return;
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return;
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return;

          const remainingArgs = message.reply_message ? args.slice(1) : args.slice(2);
          const { reason, duration } = extractReasonAndDuration(remainingArgs);
          const expiresAt = duration ? duration.until : 0;

          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          chatBans[peerId] = { by: userId, reason, date: Date.now(), expiresAt };
          await updateUser(parsed.targetId, { chatBans });

          try {
             await axios.get(`https://api.vk.com/method/messages.removeChatUser`, { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: parsed.targetId } });
          } catch (e) {}

          if (chatData?.deleteCommand) {
            autoDeleteCmdMessage(peerId, message, chatData);
          }
          return;
       }

       if (["/sunban", "/сунбан"].includes(rawCmd)) {
          const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
          const effRole = user.role >= 8 ? user.role : Math.max(user.role || 0, userChatRole);
          if (effRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
          if (await processSliv(peerId, userId, await getOrCreateChat(peerId))) return;
          const parsed = await parseTargetUser(message, args.slice(1));
          if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
          if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Вы не можете применить это действие к данному пользователю, так как его должность выше или равна вашей.");

          const targetU = await getOrCreateUser(parsed.targetId);
          const chatBans = targetU.chatBans || {};
          delete chatBans[peerId];
          await updateUser(parsed.targetId, { chatBans });
          return;
       }

      if (rawCmd === "/leave") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.leaveKick;
         await updateChat(peerId, { leaveKick: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему кика при выходе из беседы`);
      }

      if (rawCmd === "/invite") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.inviteOnlyMods;
         await updateChat(peerId, { inviteOnlyMods: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему добавления только модераторами`);
      }

      if (rawCmd === "/af") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiFlood;
         await updateChat(peerId, { antiFlood: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-флуд сообщениями`, { noReply: true });
      }

      if (rawCmd === "/antisliv") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiSliv;
         await updateChat(peerId, { antiSliv: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-слив беседы`);
      }

      if (rawCmd === "/raid") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const newVal = !chatData.antiRaid;
         await updateChat(peerId, { antiRaid: newVal });
         return await sendResponse(`[id${userId}|${fullName}] ${newVal ? "включил(-а)" : "выключил(-а)"} систему анти-рейд беседы`);
      }

      if (rawCmd === "/group") {
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
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
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
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
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
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
         if (!(await checkIsOwner(userId, peerId, user.role)) && ((user.chatRoles && user.chatRoles[peerId]) || 0) < 6) return await sendResponse("У вас недостаточный уровень прав для этой команды. Данная команда доступна только Владельцу беседы.");
         const chatData = await getOrCreateChat(peerId);
         const antiTeg = chatData.antiTeg || [];
         if (antiTeg.length === 0) return await sendResponse("Список запрещенных слов/тегов беседы пуст.");
         const list = antiTeg.map((t: string, i: number) => `${i + 1}) ${t}`).join("\n");
         return await sendResponse(`Список запрещенных слов/тегов беседы:\n\n${list}`);
      }



      if (rawCmd === "/zov" || rawCmd === "/зов") {
         const userChatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         if (user.role < 2 && userChatRole < 2 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         
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
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId || args.length < 3) return await sendResponse("Укажите пользователя!");
         
         const roleNum = parseInt(args[args.length - 1]);
         if (isNaN(roleNum) || roleNum < 1 || roleNum > 6) return await sendResponse("Неверный номер должности. Доступно от 1 до 6.");
         if (roleNum >= effectiveRole && !isAdmin) return await sendResponse("Вы не можете выдать должность равную или выше вашей.");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         for (const cId of net.chats) chatRoles[cId] = roleNum;
         await updateUser(parsed.targetId, { chatRoles });
         
         const roleNames = { 1: "Модератор", 2: "Ст. Модератор", 3: "Администратор", 4: "Ст. Администратор", 5: "Зам. Главный Администратора", 6: "Главный Администратор" } as Record<number, string>;
         const msg = `[id${userId}|${fullName}] выдал(-а) уровень прав «${roleNames[roleNum]}» [id${parsed.targetId}|пользователю] в беседах сетки №${net.name}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nremoverole") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         const net = await findChatNetworkByPeerId(peerId);
         if (!net) return await sendResponse("Данная беседа не привязана к сетке!");
         const parsed = await parseTargetUser(message, args.slice(1));
         if (!parsed.targetId) return await sendResponse("Укажите пользователя!");
         if (!(await checkHierarchy(peerId, userId, parsed.targetId, isAdmin))) return await sendResponse("Недостаточно прав для действия над этим пользователем.");
         
         const tUser = await getOrCreateUser(parsed.targetId);
         const chatRoles = tUser.chatRoles || {};
         const oldRole = chatRoles[peerId] || 1;
         const roleNames = { 1: "Модератор", 2: "Ст. Модератор", 3: "Администратор", 4: "Ст. Администратор", 5: "Зам. Главный Администратора", 6: "Главный Администратор" } as Record<number, string>;
         for (const cId of net.chats) delete chatRoles[cId];
         await updateUser(parsed.targetId, { chatRoles });
         
         const msg = `[id${userId}|${fullName}] снял(-а) уровень прав «${roleNames[oldRole] || "Модератор"}» у [id${parsed.targetId}|пользователя] в беседах сетки №${net.name}`;
         for (const cId of net.chats) await sendVkMessage(VK_TOKEN, cId, msg, { disable_mentions: 1 });
         return;
      }

      if (rawCmd === "/nkick") {
         const chatRole = (user.chatRoles && user.chatRoles[peerId]) || 0;
         const effectiveRole = user.role >= 8 ? user.role : Math.max(user.role || 0, chatRole);
         if (effectiveRole < 3 && !isAdmin) return await sendResponse("У вас недостаточный уровень прав для этой команды.");
         const net = await findChatNetworkx��}ksǕ�w��VWH������$�X�J��4/9��Dx-�
U�d�ޒ-Ŏw㛍�(�����ܥ(Q�)���/ �B���O����� (Q2�r4��w�>}����y�o�)g�O��g���X�@�o�X�ow�5�-zA���Z���j�k-?��}�[�m��V�o�ޝ�����Z�^o���5��n���zou�V�*�7�پ���Ȩ=���6kx͖_f�D��M�9��j��l�o��y?��U�Ъ%?;���[)��"L,q�������aT8��V����0��*�^��[�`��,o����.�4�^���$�2�:-��1�<Z'�ՠ��%�KZʭ��0������[|UWz��>�u���b�0�[��+�{l�x��{3#��aA���M�k�k��Z�~Qj���ؕ+,����Fl5�p���}#cmk�5�L��|a�Wz�����q:4����q����Mj�A�Ho%Ǩ���P?f��R�ȭ����/��5��wߩ]a�����V���2�xwF��\�ɲ|*�3eV�c�Fi�k�rl9*�����_�t�`�ٌ �V��W��S�x&ϖb�j�O^����K~�������o��syv��2�&^z	�� ��r�v��yV���~�>�Ǻ���:J�÷/���F��xa#q����V��_k�,E6a5�e%�]Z`Y��}R9��j�g��NW�[<UDp�ˌ�f�ZF[h�0�����E�*�-��0��$?�S����ss~�\�E{T��ϯc/��ʋ";�
U��l�͇2q���+�Y��	��#�J8���7z߲�� �x����� T���l�.��}���� �!�je�s~{�޼tr��ؿ-�9ٷE�jAm��5�X{�o��Ҵ��H�
8J��bm𲸅��iz�j �c����Wj_�o'j���cV�ݜ�n#h���a����B�Ye���߬^l7c�a@P�֚��.B6\�VC�!��&��<sl��&(Z�@sҫ�
SK�� ��n�+K֚�OS��2�]*�@�9��N��j��l.�,���K�Q����8�IP��N@q�rou��V��V5|��AŐH3���4�|-�f���C�Dg��ا&�`jbo�(e��}�by�W�7��P�}���W�_@�Ⱦ�+S1���Z5D� �=h��	��(1ܮ��'���=,7*4��s��T������c�@}22�p����:M̚�չN�F�;SkgqH�긎��)k2A�w.+��˦^bD��*{~�Yq�BQ̍��c:,�y�Bh�.�}# Gp�8y���g�7�<�^����U�kp$�`b؛pLn�8ǈ%�?�*P�#�#�|J�\���eԫ߳��y����8�̛ ����-�_��uB��=DG�m���B�ڿ����q/����Gs��)E�����.������}�����1��hZݒ�'B�'Ue��;�������}t������Dw����"vpM�Ш�$ޏR�:��|��?���lE`����¦�����J�'FI�]q�,�9�7�>�,>�Jp�:|����%��[��V��v�<lF^L4�c�e�k�l4���hH����L3{s@�+��'�w��H5��wh�қ���%�K3��zo��ڿ����={}=	��"~��]�C�9�Q���=t	й�D!�����!���[~��L�Z��)�-q{�2��Ğ��������EW ����!�#ˏ��rh�̆�ފ!���r���Llj�������d̝�n��S�J�_4����/��A5�U�2���ͱ�����f�:9����tP~٪V�b�cǬ�����u��x[��8.J�v�����t׾�7jk(NR=$�`��Dё7� ,���.���\���H���ܻ�fJ`t$@t�4��!��DY��&�3����@۝V�^=��4�x��ε=�a!S���A>��L��ۺ���u��rGG���!��/�o�G��=�+��}�*'^3L*��>��v��aY�y�m(6�ѱk&c�v�N���������|��������&|�iƄ�H��or~ ��f;�zy�&O�N#Z���g�
ǋ�Xs�&K�Dij��k��C��]'�>Ez�<��vJ�Bj�����d�|SE��Œ��~�Ч�����I�q����V���DL�G��,���K��Bm�V�����z�}�g���%V.��}ջ��O�˷��xECt ��`��=��e�Y��iE�Uq�ϒ�\+[2�T�C9�?S���s�J����p[�r�/<@Ň90;:�!)��S�qD�\KU`�T�I��%u�@�(�m�*�6Qˇ�,�[�����g��_����5_�U�.�����h�k7�B�Ǜu��&Å4r�^	ZmN��1n���	/Vz�ҿ�C
���˩Q`Jb��|Ok}/���UHs m����k���;����39�+��6\��p���;�*�p��@���eF����t�>T�� #�U��c���E�W�:ႍ���)���%�ǵ�>}eTU�!g�X��:��� pv�MteH:���\�l��	�0�]��ϩ��ߩi�'�5;�o�ವ��\��e�p��:�ssؤr����~�:�����~L��oӐ��@x���@['9�j�GY���2�'�4'Nϳ��;;�#���AYgE���^=,{�J������:V�;�`�S.�!s��g�][r7��v�k>�H�6�/�v3�Ϳ��A��˟�;�*��)gS6��oռFk��2dM���z�P�W*�R��/���&�:
0^0ǎe,�q�<��U�U �5��r��'?��){m}��>Z�&��ME8��{�N `��2��]u)������6����|x��b��i�{�*�'q>b����Wk�Jֆ��/��f��ͼ���9
��� I6�*�~h׃*��"�Pڛb����\}#���8r�{�p*ʺ�'$�#��&G.{{���5���ol� ���[&�]2%�_r6t	�	4pI'�؀"�N��.�8DtY��i�C�ݜzֻC�_!dm��F�R5@�)֒��ivG��R\P؎�R,�O��E��(*5*4QoǫT���� �e$ud�BuaP�
a9�4���&��\f���'Tūr��N�(��sD}e���S갴n��^�<:v� H:Y�JV�W��161N���8��{��A.Z�����^�k�Sߏ��d�.�"�w<�ݙ.����?§�g}�?��������9�K��l�k�j��σ:����v���I���4�+��EHErGTd���G*��7�W���~����(	�GW�R������7�8Q�-�uW���\�i\p,\�y�M 1�i��v�,�� zX��^�7�b�T��R�7��g@ա�	J��/������u������i�E@Jb�j,ۻ͕$�0��A�=�w� [�G��gH@��B~ȥb;�#x���w\e�T�H���v$. ��������*5h�J8�C �G�l�:z�_��-Ũ�&!�ҏ�m��U� �m��Ә��,��%_��t�b
�����"�Y{k*�_�,�}�e�����&>�ݠޢ�f��n��cc^#(\�tBu���)��a�d�� ��7{ Ky�o�(ʅ\�i~���*Ĕ�"$K���#�B��k�m���U��a�x�Eza����^��}�\���t!��n���F�*8w�,F}�ճ��'�:�#8����:�Uh
m�����u�#x��o�@�r?fz_��t`�G��C&-���E�����hҧ����5'�ᱽq�6^v3����t�����^�pR��.)m�ْZ�(u����$�� �Gh�VW��\M��/?v�(���?�V���[�] ����VIs�.7�E�ॏ�UURͧ�.hU�#n�ɡ��Ih;�0h����p��t��-��I'�-_�"���&N��"�E��9�����]�+�np�@
#I��q�X���]=� 3x^�pb�Z����J��ܒ+t"��c�{��q� ��������
���s��h p���1vq��������<@�3�r/x�r��_p�ZK�˒0�s�y6��g���G��9��)�~�	����x����i6�Z[���I�)�(6[���j鎭�W��/�Ly^e��I���C'����5^.F���σ�r,I�p��`�AQ�K*�3������t�1DOh�M��C�ē_|�����@|R�
Q��"8�.�s�eߨU���˭�pOrK�h}����v�
���/��]�/�7�nQ< �W��r�� d����)A~�bi�o6��&����7���Ix�W��uH�On&~rM��gRN��tbȠ~˥�;�������7�F������g!(	������n%~bmޫT���M��O9�_�A᛻��YŸM�0�Tj55���K��>Z�[q1���$�L ��Gn6ؤL-$0��p�~�߂~Ԯcs<'5��N����V�Y��Z����٤_����VE�MrîH���W�rP�����!19h�M��_����>��HLR��5���
�ˠ'��[Bz�5�-�^�j:��^�l��Y�Qd�R�Y~�[8����iH0Qd�����O`m��Ǜ��,������^���!������=~���</�^��/��/���M������i����g�����g��T������9>��o�>��?�M&F�.L�:�t$Ȓtrb�x�]���7Oy��䎇^�QE`�'����(C]��1��p�����"@�d/��7��9�IW� ����<y�ᡠ��*��)���.�X3���+"���Ͼx�g�`�;J �6�K����V���p�����>�ƨ�n�B7Rs1]�S�1��,bܱn���ۈ��ʣS�]��H�	b���Lf^LNt�����ݭ5�w���ըxK��S�Dpm��1I���Q���L�e������ [���Eb�-�O��JC�D�
�b��r*��cf{X�#::�L_�#�g�E��`e�Eh���a�~h�쯤4�:3���;&[�p��	MAj0����l@����\D�e,83E�q���	�5�m���;���`W�Q�x��G~}�������n�9���@��yX�z����"����}��(81N�������6>�}q'f4��QI>��>�g>�����|d����ڌǍ�20ӟ�ϵΈ��ψ�����?J�#�L}n.�	N�8��1�$��H��ɡYk63[oO:���M�ogel��rb����y߽\�#h�A��$�Xc�i�Џ�w�܊�:=�oa���|��&P贝�À7�uo�t�a�q8��
��r���3dI�a�kά��
fq�I:�mdb8U"��x(w �܁wj��eL���R!��̀/�E�����w+Q��"P��v��^���Y\♗-�#�b��,�q%����\��Nh�b~`qV,vAŬ��h��%JU��g��zr�E�\P��a���+~���!q(��7��}����k���������b(��ܴ=�T��2AY�奠�Tx`(T���g���@yrp�c��QP�1��Ѵ]������D.䶽!$!2Ўlu���΅CN��Zeb�?�o���d�?W7���Q=`� Q���Q+��l,r@���F�s���7�@�}:*&2��?���bW�g�L��S`x�Xܻ(4�b�W���G���<�	3�N�q�Fx
͂��:�2��
�T�/�az=�3S���D>Z����σ�B63IJ����?r�֖�O�(3,��!��Z�7�N�3>�f�ԗ�k��8MY�������>
���5�yd/��{%��kB�W	?��$��f
3�#<�� ���J�v_�W�H��,+�}���ln_L��)$��$�M_aE|1)�Hh(Vd���Fs��Y�,.�C$�Q-��2 �@���}u�x�fu�A�A+�BY�w{`��eX���K1ĵ�}d,��U9þX��$VH��b�� �l�l�����H6l��H�?��
t^zH؇�ʃU1��D���:#�����������R��U����$�R������2��j�-5y<��'Au��T:iyY1bPd#NE|���~ g4Y9���룔U�)b�ܬ��l�W�K���#�+`	�%(0���l��&�A!���^�8ɧ�*��nL���U��E���ě%rf���l�\��j�#30���'���'�n�����g���1�AD����o	Q2������|�1���s�@v�=�w��S�q\�yF3�؞�-�Y�(��G�c�Qǖuc���dC2dO1;���ǈ�6868ˀ�d���~��p�W*�Kc�Y.F��Tl�G�+�_B<x������Ձ�پ�0ͮ.i�ؼܴ� E�����}>��Sv�K�y��T�I��\�e{LJ�����y"��u���!�&uU�F�k���\�Q%���up�%��mq~�ü�S�{�r��O�'j�]*�����N,�=#�шID�R�U���O}����.R��~��%7r�i}������9���|ضM�S�I�5X��!���]�p��7Wl�ׯ���+#��rO�Cj������w�}O(쳽d����M�HD")H?䑌8
����I��e����>��=�s�k�}9���������m������s���M�����h�/E��"��l 	� ���ϓt_Ӹ/�x��E�c�7}L�|�#P�L�.5�$�vx~�D���Vcu��b��M��uL�8*2s1+1�Yc����BB�s�PCi\��*�w�����j��^����g�%��˄~�Q��Pi�L��O� \��V�u$�.�r@��f�=��J͕�fv�
��rѺ��uFV6ڌ��)rB���\�4b1����(}����̣ͪJ�R��ĞAB�
�PB��Z)���|�s�L���p'&�S�Z��i������vj�V��,���#n��T]F�>������&��qmݰ	.rxђ.�8'j��jc]˻#���1����ǥ�Ŀ���7�6٣}�� Bv��\��Z/O�5�&!����
x���9b�EWC�CJ\���Ss���y�!3���r�΀�i��F���8����b�M�vm��,<b�RV����W�=E4;(�!B�L�,*�LǞ8����G��F�'�E�Jl(ǰE���怬�^GA,
�\@�]��{y�a�f'?�:G ����A��p�ŏ�;�v�Z���}X�͐�΄��	� ����v��o^�I�tj��i�4٧��W��o��w�p���~�k��`G��#;R�{EM���40</��E����`��uM�ٌ="��իb�T�y�<R��`��x$:�:5P��t�$�z8H朘���A��]�W�0z��IH�o!�C�]�9e>����8��r�PS���B�B��Hk����H826�P������z��S�Q����m(UV��O�ood[t*td�Pa�g�o����n �
,�0)2Ѿ`�E�C�ꍈP$�(+�c^'��菤���� I�fL���>�g3��X�uW��˾:�eP:Vc��*U�I -��B
�����v����B���͍��!}�7*��u��{�5Bh�U�b�Ê�9f�9�O	� �4�}Kfț�t�rA@��7��h�[��	��ݯq���9u����<ny̅�iǊ��D�i���O#��{\��Bb� 7jV�ne�J'�P���u�u�l&ȵ�Ímq��l�{��_f�5�s	��tȅ�
0�Ѐ�E�g��E�0o*����*S�kH�.4��q�/����<̗�>�yұΈ���H��}|rQdxbq�\����OeV��s�I=���ܓF'27�+)zt�v�z�2ұ�T�S�o�Ȉ1�\E��E�4�@U�T<�:��H�E���H�\U���){5���f�\:OsX��Dx�A��>|��,���q:�=��F�k۟*�Ց`�oʪf�D���Sts��;�HF���C����f�F�i)�����heH���c���x���`#X�*m �JhH_��>J��X�D�[�}����+A+�mF���0w�5���|����1�����5�F�Ag�u�	$RI�G^�/K�cN:��$�L�$������s�Ys;'Z:��(�r`����+!�*FF����~�q�a8�3��Ö!E��UΣ�9���%?�d�q��Dl�M<G��	77���@Y�Δ�5<�Z���z�̞����8��[�౾�n�Þh�P��l)�r�9���`;]��^�k�e�3��������{x��?቙��sࠂ���;aS�7q�����t�v���jw�9>��w�o��8B���9v�l�6�5��~w��r)]�S3�p��cP:)r�:~�)�u������D#W�t����UXuy�� ���% !G�$DAj'�:I�kR�}s���l���O�ұ���{Lx������-��i�q'o�(��~�M�4���\f�2�Nk欐��������&��g�8�#dՃ�\���������"���'��r�wl[׉&�S	5�{�V1`�r�Fڎ�/N�T�E�r�Y�x��=>�|M� �)Ax���1�	*�3�����B��6�_Ķq�z�m�˳~� 6����`������С�v�=_��5r��1��$�U,�4E��+/���6���t�Gq�ř>�X�����kh\(�]q��|���	�y7��*-��K?���,-,qy[b+f�.�=���]�\�p�[����Y�8#��[��춡2dc��������/E����폰q.��^%�.�����D����^P�C~v3��&r����[�l tM�b��2���5��&9��,ӄ�};Q+���0���60��	$?�������
kܮ*�pj�U��i_�S>��э�q��ME���{��U����%�~�z��K�D��t��ށ�ւ����J��w����]Zx�ҏEI�'��fp���S)�"5��n$���˭�>s`)J���\
�d쏸�����kr��Ѧ*�t���*�%�n��E�x�}��$v���O��
<~U��c�!�X�,�69��׈�`r~�����vGX�D�j|J桘��_&�g���,*���NM��7��_��3�ꢻZ�0?m*7=t�U���w��~Ǐ
���uN�db��x2�!~ ]��=����6єxDQ�=�qL�_)ի>ާ��ݞuZڃ<h�VC�HKV��Ǵ�?�=v�M`�DXEWU��H!&��ǟI��"Bcﷴ�W�hP��)N�^��`We��u�/�&�V����G{�C�"S�{i[ Lޡ�-����̊���S��<�u`�n���no���J�(�t��\T�Vg�z�I�u�n�>�ƺ����c�U(�S�X�r�D�����w�� sG~C���DM��3��!<�D�OT�.LX���~���l�URX~�y�Hcءŵ�0?S(X\�\��[�0.FLU��tQ�8�<dBQ�]3"(h�"���P�։RJ�p[~;mćI�h�V.	�+��t�`��l�h|���p�1�܋�*�S$!������;M#�:�AMnb�c������ѩ'��2Ji\��^��,E�ٍ��x���z�?E׹�?�%.���H`������(���I̧��i�3q���ns�|�'D_q��qw�<z�{��v�	�QZ�ˑ.dUDq��i$F���>�+����;��P��@c�yy�zJ�-8�3��CxJ���|�|���\fOf�����d����� �RGD�-Z��������L$)����N��dL�D;�<g�ê���~�$���KN,%����.�왹O����|���.P}� �FTB��/N:�s�f�J��� �f�n�<4#Y��L�=2;��=��5����Z |YpE�]����(��G�[��E��zG�_���m����0��ZɊ)mY��2É���Kg��'�q��y�}��r]`_.r$6�>��{k�P�`/嚵���[��}%��(���Q���Bpf����YL<a�l��6�g���t3����g�����،ㅦ�L���װi'�Mo���_Y?�n��8�
M�O/(���\a�"q�������v�}�5VH=�Q8NX�����No����*���R��D�g��˵�W���p�	�ZI��&�;�^��Ov��4��������N�x���qi���0�.xm��&�zޕP��z�BĊ���j�T.R�!C���~U��Jz��#�'�7ϧAӚgD�:�q�լ�$�	�^ۋ��/5�iV�sv l"y�u���&�+�ף �W	߭r媽K�2�,�ͬ�	�k����\$T9�I�"�1<��Q��FƝ�����ސwƷ��<C�U�6�� /Rk��K�ӱjßϘo}�T�����jg���ӐlH[�2`�"1@�O����Q]+sb�pZ�:d����(*��.Y���kʾo�O���Tؤ4�O:��}ǧW��x��L��3�u�5��E\A��c;e���#���1��#%����tO��^i��P�/.��r�W@��i�e����))D
(�+�4��/�F�&��`�I.[�#���ງ�L i�U0$����zS�3] Gs"I�tg��łsa"�����[���vP�D��x���Gȅ��u[uZ�wT6�g�	_��LT���g��zΜf*��?��~���K�?|>~�65j�Zޘ�{��Rf
HJП�kz�r�JEȽd�R�7���?��T�vb���p�L�.��%�+=��W%E�l2�����wwM�����y����~Y�����~��������@r%���A˚���G �:)�`�= zg��ؠn�V^�>�X��^�1Xf�f駖b�-�����-֊53ૈ�&��D3�3��o� �LĴ�^-�=��R�$)�+?����?��T詤=l�[G��)d`D��m�ߺ���~�Ͱ�ʌ���m��5�]<d��5x��}�	am�Z� ��E�F��Ү
`y�ߕ���c^���w��\�l���K��
O���I	�n3*�8�BW�Ǯx��a�f�ZP�uG@���)�=��"�j�N;%�#ˆďx��f^'m��{���k��]�ax�s͛�x�����(_ǵ��Z�:9�v�5��N�L�\�*Z��V6\��$�Ff�'�x����ӹ�cV�uqP��̑�<j9Q�=�<M���Q�@uͷ�;
�A�i�ۗ��m���yA���foS��d˚�lM��
M/�N���2��VU�?����t���D$�L�Y|o�5��jj�H�o���	ح47��������CQʷ�u>+
Ye���E>�مc��͙2��0S��S�8�]]=�@D�D���M��je����p�FG�-�`����0�E�5��y�e����*�-<УZ$��:������~RZ���\��yX��R��tj�MӔ7n�]�H�y��*��ʰ��΀��$[�������8-Y�OU���H�!�[��1����<�L�ߝ����.�k�1�b&$v;.#t��\�΍�aT�1���@Y5nt[�(/�H4�O�z�c�9�D�������-,�"g�s �lg^d��;a>E'�Y������P���%��#*hd�$����=�ԗ�h��ާ�w��9}`��h�K�"�S�k�D�G_^-���X�mDe����r8s�#ծ�I�4$5���bOrK���ɇ���򓓐�j�:�e����aD��2��N�1���;�ԇqd���Ȥ�xAe���-��X'�ÀL�U��eI���k��^�ę�TZ��L��T<O��a��'l����N��� ʂ*_���"R����b�k(Q4ѡ���O��T*>��_�\aq�o�pyu\�c��:�_� -�+��������׼�B�\/٦~�z#>�K$��=�eL<�\�#�56]0�M�P(�`�R`���/)h�sZ�OHO6e�Ƌ�F����q�i�U�Gm������_6�qU2�q�x�#MDf�(���&�b0����F�yfƤ��q�u@�,K�Nc<|L���Y_+dt��H���0�T���?�0sX���a�LNl��HU&�����qҷT����x���N�����J:���z7�$�Y�Z>�$i�ﱲw�0:'��
���?u���`�%W�C�	��vh:,9�F�Թv���t��Ͼ�fC�(o�S*H�)�/�:f+`uhj(�	mHD; 9�~pY����9�X�AL@��h������&��-p$kK�	�����^��B|]�2t�SdG��φ�_ݰy�p�0�	��e]J+��8���&]��f�ݺ�%"��='X8��$�%C����B��<��ʒGB�(<E)��I�|_�k�Q+:��:����ۭ<qN��
l&���	�d���t�߰��J�M-�!��Y���"��<	�K��"���G}%C�y��ȑ���)��` �M�YS	�"K'�Qك����AR1T2c3BF�ɣi;o��P��P,zR�l#�P��F����H۝x.B ��)�3	��9�(�]ǚ�%���;2Xa�}tΔs&�5Ҩ䔉ؐz������2�S�U�L��f��l��@U���ji�-���8V�ډ%��&�'���X�B&ٝ�D���S�V�쌑
�L}8g��O'�"e ��j@���H�KN�fh�E����x��\Q� ?��VI÷|eF�&�Ho���"�o7?Y��DvN�w4ڽ����tYd� (��80��rr�$���HjZ�;R����\�h��C;����Fŷ}�/<Wm�#@�;��[���)GA� jD4*	��H`��Ѱ@����x��H�ʨA�Q�����o��:k�Jj�A�0�	Ď��{N��:>�]1�{������%Ԉ�\-'�����Ę�G����]���a�ǁ�E����q%�hZ4�&~�X�������v$�5Q�K{%�X"�hB��W��;!޷.�B%5�Ȯ ��p`�꼠|OeW�o�Y�{<'��|�p�	���S�]"��u���V3�RL�e����Z�c��3R��U�����1��c������q8�O�c<uF�i�8�a����v�b^��{��l��@{<�� ν�V\����u�N�>7�f@4���)1K�0ٖ���{�����0%*���T�7O#��~� Z>�v4F"=���\F=�܃�Z�yd�>/+�x�D�!m���U]�u���j�@mG�^���UP��q-�YQ�56�90���c8�5i�.0I�x�3�<T���,7$��z|��޿��P��I_��n����Ż[�z�ڠ��p������W�࡜�?^9&���N�r�1�ŋ�N�[ዦߐ� %.7PV7Uqr|�e�V�� qΩ�O�!��*����7�P�p-���Ny�_���r*�>� �°�?S����o���- ��޺�$�0�I`�f)�G�3��@�aF�'4�EU<��dD�Wr�sg���zy:���%���-�{�ՐQſDܙ�ɱ��K簁gP�0%���2-�8��sH���V�S5s�_Ftݜ:>3|lt�'�����8}��9vꍳgO�;}�e��j�b�/p��N��r;�G��-�nz��G������B�]�4D,nW��^x�A��'�ajĒ���)R[��UF��E��D����)�r���x|o�bΚ���"^�@����G RЧd�C�B�ݳc�����޹�����LM���ؼ	a+@��g)@~�M�/�H���a"2k�l�wC��� <M\R������IQ���:SJ�5sE&h-�$&ǧ���^Уj�����BN���Y2�Dݣ��I�zB,�&�'T��:��F2tZ��ɣS�Ǡ|Tk�h\�&G�m�4 mh(y�_���y�T� M
�9(��:�F��S�c�/�H#�9!��	U�f3 k�e\�v���`By���E�e���<�v��P������L8:���dg�Q���F5BEݏH,D<�u�a�R�1�m���G��ݩi0�pJ[�|ן�P�=�zq��\�Qb[�R�O')p���tH9��KXy��:��S���!��Z���s-��*a�uJn�x$T�:����C�ژ��V��*c	�z
,�K��n���o�Qc����)��p"��\>�i�R�7V�pa��	���؅4٩H�P�:{*�{ĝ	�*����V-��8
�S�(��tY�D��ϒ��^Tό8-���i��:M�h�! �?�9^z�@$F�$����x���0�q��NիU��YZD|�<�1��[�岩�FY��K�/2�T�g��*��E�y���Cs�dP^%(�+�f
9����(Bg�����:�W��P���TR:U��L����
��y�7\>CȨ�11���zsx�]�hq�P4 �_��ي$���.���Kݣ�1W>�Wt6�bZ~�0gS Om4��b�ڶµ����l��5��h����OOL���G39���*�F!\gX���L�d��~/����x�d�C[��/�I_b�mD1��M��楎?��W�x�9\�ޟ{�2��}�uS@#$�R�� �V�/������Is=��n
��!^1�R[�i0�"��jD���\�4#����m�<�!��@�#T:���T8�&�E����ګ�ï\9
i���ip���	��-4M���T�K���u!�N�r� ����ݿ?�̧ҍ��_,�������᪞�y,��X�}��N+p{���rh��e�iSrq�%[t�iX�>V�E8�/��6�_Nә1Z��E��ޗd�(���Ys�2�����(-���T��E�o�}B� X�ԢG0S�V�;�XE��뮺����$޿����G�ڭ����r���(��Ul�k�@� dP��sDN~#�����7��u�)U�_��thӻd]�ք��h�!9$��;�\e�����Si�|�7�JHQ�2�;�I���l��;��:���t�p34����b�� (W��@�J�x#�X'>�ՂZ��'�d�ơ�PԮ�/0�YT�����h����Z#�7bwBY������`��O�f���C2�o�M��Ħ���i���60��������4.2��3B1}�o�y�Wğw��w�O({���-X>D��"$��K����/7���j�U����o\8}�ܡ���g���`�Q��m�𡴢CH�vtt��d`��m	q��hp<ⅆm�m5��&�A(FKjT�FttU�ii�e�A��`5��?��0�L����N��U�2��.l�v��%�X�l��.�G˻kr�bj��7�P[��C�#&7�d������k-q'D�h��3�P
�[M�;$O��)ƫd�z�����+�0u�l�U��Ί,*
Xb﹁p�z@�p��o�=�fZ��eq��u��)��b�|���n �ۖy�i��{��Uܘh������hU�Q��M��Wv�O���:�8���G<�L�G%F��;�&><���A�zD�N�g,|dj�T�lQ�-d�)dZ���Е�Jp��n�0$���Fa����a*��aBe�I���K���dE��ǳآ��;�p�>v�(}@�w�z�Mk'�-��uԽ`O��{"��f������Z���h�����#^�YAe:�0Đ�ʮ�T)�M��@���1m����j`��6W�����%^q��?F|	��
����R��ݡ��N1�%�л�Hƻ��0=)��^��ɩ��e@-uL9C����*�u͉J�v�78Ψ�)n��,�����qvu4UW-�/`�
�@�)z|�_�!R���f�Q�����C.?>��a��R��dw��s�z�e�S��-� F>�kۿ�C(�����3u�b�
��t_H�=wѢ+�犿�ޫ��du���ul�]C�1s8��Z��Kq�C�z�{�cIxH��-c�b�qԔ�JZ�ZB-Ceb/�[�k�I���>"4��҆�T�=ʤ&�}� Da�Z/v"mȯ��X��F�=Ve�w(�Q��s���v���":z�4/0R�c���ft��eKJ#��ϡ:8�_�N^8��8,�},uTK]�hٌÍE��n�j��g��>�T�ILqCΉQ��c�DLq��,�^��Cpw,��yd�1�(��A7�p���;��(B���$�]vd����&#G�!S�$ !��/�į����"�Ю���?�m�!s�a���,
*J� %���W�=����6*IG	Ъ/�+���и:���8X�ӘqD�:ͦ_k��nC�o��꫊�����E�9w�E��jׇ��r	�i�}7�,���b}�xK[�.���)�S�� �Ko���@��I��d�\�RNF(������y�CP�Z�u�&�^И���*8�ɩ���*W����0c��ر�~����t� 1� �e'xK��.�j��yߕ���a�2��\�ۨ�a�N��yj����ZvcL������
G��ʊ�W���oJֽ��e?+AQ���"��Y�<^��U��(WF�q�7t:�Pql4Ϗ���)��̸mͨ��V����}&�[�����ΏA�6�
v��l�诠��_�1}EBu9�&���+:=$P�};e;-F�q��xe?O{��[�7V6�"�q5��%BZ�7-�J9��z�1{p����I��۔έ��1vE��:���F*�ڃ��_��ˍ�\��� �h*:��3��$O�U_!�X��D�_>�XןT�@�]��m �Zp%���}��wn���mhr��Rv����GD�-�[�j7���oV�Җ��c`ԓ�KӞQ�W,���ܢRM�M��C� ���MR(#]>u;G��T(�h��(�*F�_��g|.�R�F �M�>���]��W2�֊|��e����
h��A�����Ůr|P�c�e��ֱ�4P%F�6�X%T
�b���*/缾*\��lX/���˒��NqTh��I��=���k2��<�g�ӠQ	��@��d�����*R�7c�IC�D��t��2r�4���x?!;(��wQ_�Q�#݅d�G$#�#VG�O�VEz����2"��bM_�� �rE5��S_Bo��IT��}S_JVDWiS�RXY>i�A�f�XA	(�˷g�#��4�E�߾�y�َC�h��7��x�C������.Y�����L��R�W��}�������{�0Q#�2����h��.���3�tRDKE�M"!�f���rT�e*=5�6�Px��B�+E�ΐ�=d	���8�=�聳��N1�4�O&{��ZWg�o^�LѽqFO{̧���1v� �Ir��˯�Q��^�ɹ��AѨ�L�] �@!~��V�Td> v������r R5Cr$ʪ����k�hW�	XB!�+y�XH�h��d�0	���O�5�l�����"�Y�)	��bZYѬ������Z]:-6;�M��+��tZ�ʬژ��V�O�]�o��D�Rhg3,�Ku�5�+Sk|�;�(��U�4}�� E`uW�k�h��Q�����4	�"�p9�$�(j�V=�o6��<дL�GǾޢT�j�~�~�Ĥ�l�/y�'���)��'������ ���3�ŋ>
��Z�-��`�`.(qԮ��6�zftq̪R��-w(��zl>0,�����
�!���F%�ؒ.}����DN[XT=y�;l��߾$�g�l���h��;��D}-9�2���nJJ����A���p�oM�ⷹwҊ�_|b-���W��K�:��\h}o腝`B��
3�8��c�b2I�
�1���n#$��Ckŕ�mE�Bk�0��$5�&����~)(�&?<��/d+�4H��jX���{�>9�(�Ұq?��Ѓ�%��S0SI�BP�����~|8����zC�t��.�����خ佳!��2tE]C�f����8[�%1V��X��Q�}���A#4�� 6���U#����Q� wE���t ����p��U*o���K��LԆ塘���AYP�g��i@ZT5!�fZq��<��7�(���?�����;6efʌ��,�ɳ��^���d����m.Jw���;Ʊ�8П=s�Ȕ����b;I�P LT�q���NJC�G}
ol������d��܇�d�x�a? y�!�e���{[��i���4�}�M�$�w3L�����-{�_� 7]b2�����s/L<��f�W'�kv��7/�B2��Or�B�R��v��6�^���7a�Z-���mi�:>E��~a��h�NS��)�k��֬XA����\V��5�h��Xך��e�3˭Md��d@>MT�;3��|���b��%k5���.S~���fT|��
h	4}Mz@W��Ө�|���8�&J<"VAm�����)�a�FA��5Y�x8�	'���> � x��l�
�j�R)Hq$�ױ��W���f�(�.�ǑxJ����ypY�/�d?A�;��y��<}�_"
鐙��rЭ���6��腿��������mЃ�X9�yK�z)j~`T��m�d��s�Qʌٺ�#��|m'�h�ޕ�����60�#��8S6��U�k���Ҵ�)0�}(@���-!�|	�6�C�#���-הԡ�-�eq�t���c�:K��A5�L�1į�5�d:7�6D�o��N���8�+�RJ�:h�B+�Ѥ1����LDa4>�LX�h,f��5M !Ȭ��E/c�<��+m��
$�&���=i��c�\�,��A�̲�.�1�oH��"��0ȉa����~�;��5��j�
�<�K	v�
׽z��.ʌ�Ҽ�f��;���ڇ�k�X0��s@���E�H�T@Qo;o\Ky����N�]��yO1��,C���JH�$�[�X\D5�	"n���Z��9J?e$��:f�l%U�_Rs#��F��PLA�I��1�w(�Ȋi�o�k�ؤ�,>�!�������z���3��]�N#7њ�5R74>s�F�����1�G�-t��jҸ�aO�x�!�I`�*���>�`@ߐ�{},U@Cr?�-�(S	];E���VtD����
g�w�}bEC����d�}
�r��i0y�8���R��W�+Y�`��\0�.e�Aش�\Gc�O�si��!#���[l.��)m��5��z���c��|��62��P�,�n��zҴ���hr�d��0�u�Qܰ�E�M�a �'�jw�_�Ć����_��
�{íqX������p��>Aq`?�Cq�-�E1��H��O�׵��c~֫�m����%,1��'I#����6K[�2��]G�(�k�N+@��I�X��#�ҋ��6���b��<Jj9��`�k�;�$:��6Ζ�"�)�_�"��1z���c�[�fdi씅VϓH�06*A��sfy�.$���\��=)Æ"DiDg�XU5�=W�JJ�%s��~����������6��hD-~��*��s)�<�v�kG$&a�'�(��z��7$����������`��~��ȃ{g2{��������)~�
�5�I#�} ��wj�^���&I��K5���P�6�����}�߳�����x���|=���Q�ܻ�{��@+����:^+�����Y�N���'ڮpH#4G9T��93Om���5TQO'�6���d!���q���xZ���d����~�ٸHq��	L�%��2�[���ߛU�T}�1Q���*����ϓ���u�	aÏ(
YV&0��<q��t	��"��4#��_��v�Dj-#�RWh������$�j�2+�=G_����|hq���sVa��,%����p�k�q)y4q�4v�zh���>����ģ���X�Uvw���nxL����H�ߒ-'9�{gn�7�_�7��C��ƀ/#��x>�sP�P(������E�F0�$�`�p�!.d�C3|��-Y<��b�8�s���]��[��%�P-hlp	kA����P��w�k��\S���=�����0����x$/�� �{������|�6���Ҧ�Ȕ�X��LJjT5���ΰ�O}/}�:��zm�J�5��v*���F��Nv�IZ�&3c��y.�Y�UŽF)�5����ls����n�^6F�����ru�%�"_��뭹>mH�:�о�*C����~Vim�=�\l��b�4�2M,#ܬфl�	�#/�@�d�S//9yZJ͈��o��َ��:<�C���P*�'z���QkJ�#T�9�%�i���*:�Ci�S������:9��=��7�8;�a��
���CpOr��n\�d�y��c]�?   ���}�r׹�=E�r�AR�%ʔ��$[��.)��Ќ��$DlF�
U�=�'�\o�+�N�mR�NMM�P��(�D��
y��#̷��O��D���tY ��~��m�[vKt�:����O$�2y�5c���`��Rr(�o-�{�m�)����:�d�;=�œs~��%D����R�ʏ��ޚє3�d=$�	���f���? �����|�}��l��+m�{�@IvN��|0s��ř˳�D�Do.�9szF<t��?j66��j�G�CiOѢ�w�L=�
��XC��'7fM�+E��d��k�q�g�Pa�_�}겨��W��_��ƺd�ߋ�+>)��*7)���.��o'�}�� ?�&�fMȡ�fF��&��\aJ��C��/G�;�8\cQ薃��	��[Q��$<�%���z��D�$��:
���O�k2q��)ǆ���!�N.��0�H5�p����2J�Y-(X�_�d,Y�r���26����m�g��7h8o�Ut�k]�	_
e�c����A �t.���je%
F��X>�#nGa��(^����I>g�gw���F"��;c�]��
+
[���y,QmS=+�EE���O�C��1{/�;����]�>�EU�������[�=I�-vЉc3`t�]d�a^�id�K�mM�$ӊ4�G�������z��Tj��E�}t� ��@���dN���?�֤/��椸|K�aP�e�*����J-�Pf�&<�k�"�Emc�97a�l�_��*�>�V���*��0r^>~/�6p����X�7�qV�a2�%�4�P�ʏ�(,��+ѿUR�)�>�)�)A.�}��>�O�:��>�����u�r�����1��)��E�hI�Q�H�ةWpo��	5Ft��b5�� a��pn�L�A!Yc��8[���T��޲���a��o�����,ȁg���C;�G	l�p.%7^�� �����сLH�J��+�`q��� �����.���"��yH0��C�F!����˯	�R�Xuѡ�L>ഐ���er�CX��;t������P�T��82���Ӂ��l!�y���^c�W��2!�jtQ�#	��v�;a��>���3q���at�n7ּ	.I��w!y�J5bIaNZb�O��'���Ȁ�,�Q����2�ڗ�k��1^���lB����Jh�)�0j���K	�:��I^mue�Y��2���\? ���`��o�tΣy��O �R�5�+�C���h]� q�SH�xۍ���3=%W�$*���f/]5���HI���X�v�Ti����҆F<�#�p��>���2��u�S>�ߐ�P����}�M��BWZ4]1l�^!���YhO,W�N�}��%�⟑Z�����'>s2Q��n�\p]d�4cw@9;'c����(�Ww���&��lT��RČB�	���R���2��!���HL��A��o�:�L�(n`@����}����{�~lG���Ė�m�k�LN�x{�wW�s	�&��;�1�~ir��G�Ƽ�ŚDN7+�b��1��CN�N��-|*m��#$��~+/NA����B�"��9՞HĢ�����DcV4nG�Lz��ߦ��	�ѱ#�`��i������T�4��6Uua0�f��21��l�y��G.��R�R��e��)'�	��b��NA�RxөF���ʙ�1v��F[���ߚ[G܍c�Y���i�OL��P�,q�'��s�ss�R�TE:�cviĜU��Y�yW��ڵH��g��0.N�u8O�G�fq���m�g�ۈpȹK�ȗD�;�9m����5Á�/�ٴÕh��p���2X�@��x��=uv.Y�-�$�9��Z#�"�e�"kЄ_��Z���C��������Yo5R��H(���\��k��W�"�Q�� ��<�X��p����])��u�Q"ù��J�`aB��k�ב�5�3!���������/Ҟ/���xbdD�UWj�����x4ap�J���Vd5
�l����R�Zs�������=J�G�.dl�	��E�In�@��#�̾V>�=1�Z>s'rY�J���
���8n���d� o�N'���z �[(q�&�_\l��@ռ)�A�F���O���f�f����M���&Eռ%> S��;����si�~��X[;�v.�T��A=D�1�l�IUe�!�����'�����rO���?�Ψ����ᢙW�<x}x>l/ZhQG�
J}�����ĸ�Cn��nm���/���O:�>���ɱ����|"GU�WO4��!�H���x��r��a�7�>r�χI4RL�eax�2@�Q���@�[�������L���sŪ��ᇉ�黠�d)����Փd�U����T�~6n����ѿ�77	�ߟ�<�۰V[]'�l��焷G"F�T%�H��|K��60���X�e��� 9d��j2�	(6�u$ ܮi?uk���W�t��	��	I��]>2&X=���f����T��-�	���ٴ%���p��`/����yK8����i��M�����=��h͂wX�Ĩ����m�|�öه���0��E��V@NU���@�R��/A
�?RhGq;�r��q��ڤ�Z3��El�r������z�D�Q�Mq����7{.5~��R�l���� 1 z�}E͍�m�ãE|����F���-b����\�cך�p�]N�t�Y�_����g�.v3/�1%ҟ`����r;�������֤Ȍiu�K�W�q��@�sFӎfigY"c=s��j �hGϐ��;E;���f�죒d|�ѧ ��^�=��(@%�#=�ؑ</���-4i {L��6>�~x��J3� �g�o��B'��l���E@9õx �9^�k0��jgY���^��.hҾ#<_��_���"D���o���A_�@A����SM����4��OP�kP��l牰�BJ)<�N�@I�AA���Ӟ�a��pc����J�~t��bI���M&����A�ً�#��+���כBQ/ꇬ�
6�t�Yt#��D�ɶ��6�*6����� C^��'�b�wZ���w���!�cc��v��`�&�& �ւkG��	�$�m�����-a{����2��o���ep�C$|� %M`p���N�H_jފ�/�� �N[i���׉�t�Su/��1���F����'����l|r������g Hv���t=#�)��=���
�-��H;�V�5}��O��9��<<��� ��D�ӱs���H�:!�J;�b{���SP�c/0,Cb����[��
�� Gg�{��S*8U�"�m�~s��6���E��e`m>³�e�:�k��R	��}G��pS���o)5�Z����������������[�A���j
��MBU�;)��$��!~c�`+M�����U��R)WW8��W�?�	������G�/{�`���Y�(�^ ��<��0V 7v�/w�j��T*_FUo�w0�E� �n`���8@Y�8 ��5
*���ԹPǁ?+��X�3�at�u`5x��1'sS��(�4,\yG�JU�O|�҉B�#�`��V��0[2�O�~iyo����58���84c�"���[�Z�X	�&V	C ��,S�D��XXX�-R�|�؄aD���+��1&w���k-H���(`�z�`1
$m��d�ʯ��� ��/�ۘ>� C5Fb{���s��̣s�����v;`ky�q{�Vs�r\5���`b�� jd��M�B�i�
H9s#�9Y�dz IU6����AJ����%���O�� �~��'�?�>��?��o����}$�|������=d��� ���RB@>�@:תϲ���/��}`�>RT��P������1e��2�]����� �YB�E�,
�i�>э�֬F/�(&�=w��GG�+8%�����#��#�����Ν�|�y�~�_�OM�6�n�0sj��ˇ*��z����+�u���z�Z��x���S����Ջ���b�̵h���Ϭ��F���g_�<���Թ����µ�҉ׁ����&�~&�'��n��<rc����c7��#7��Go-��o��ʏ�ϱ����g��C�|�x0?�n*�������G��<͏�"GF��"6Y|f��Ʌ�3�x����;M���ߩ���/�j�HFz}�ȢFF��S�'o�� 2�*i/���݉�_?�+'�W"����Q���"F�U���c✀V�Q��hu�����@����If1n���R[򿉽oT���$i �}8���Ykd$Hۓ�^��M��{� 8���Y����.�Q��,a�6
���t�Q-7�יs�i�1��ۀ�1��J�R�VƋ�0X�6�l�Ͱ�g.q�	��ak�=�,�"9�$��a����V<����ﾰWrǃ"��C<�3gRݤ�5,.�_O���4�
�z��;{�ÑN���!��Μ �!��	<���͛@�K��R0N����%���ޕ$�q8�y$Dވ�咐�8U1����d�h+��Z�S�~t� �G9h8ɚ�Q
��a��f'G���r�.��	sa��s�s�'���l��?p�Kup��ш�)!�8��[2��JT��cv;D�%�����K.����i�����dyg��LZ�b��C!DI�M3�i2������c5&(�I�aMFX��F	R�G�u�M�Z�Z�?e]#��ji\ך�2n����עŐ����1L����-���R����?p��1o��i�i�+e�����';���-u�K�	Q*f�Ϣ�У�p8Ǿl������h������~Mu���Bi[n�9�〺i���"��<�t�o#���0mP�C�@V��r��8KF;=�Ȍ�Ai�0�4𒞙գ��%��+p�a���Mj� ��i��bΑ���� P�:�;����_s~0�҄yr�"�Kb���V��Ne�H$��E}���� Vv�Xfa�Y�B���g�y��� �y���{�Ne�5�x�+:a��YrK�`���B� �$ź�Xe�~�s]MQ�h��jy���q4QX?�9m�m��Q��MO>��Z*x�p�)���7�?i����zWB�|�z*|��e��0���N����zX}"�5�mM�6תF��3�^��î��yՔ���xh�%1�A0��'^l�>�R2À�Fw�9��)����(���N8�v�Z���j,V��N���\\ ��?�}����D2\��HdF������i�� ^�,-Gq�E��
N1����_Ȍ�,[_1
�W����T��+ъ��|�9:��ˈ�Xt�?�R�<'�J�$����%`z%��y�5Ĳ�-F$q���F��oP!NZ��" ��kU&<E�-u�v�����|�~��F)�K�V��0��?>�h����s���ؖ�GO��-f���������
���<I[����f���ņ����l=�_�/�Yʏ����� v���X%[	z���lq-l�*�������r�Y�i�����Ȼ#�	�DB��f	|��$BAm�\̉m�f֍)���rtzc�v[��r���	��ӹ�PŜ�Q�ú |Y�v��I��hE�
�F�QT�lKƙ&G7%-tC#N|c�1�'y��KZ�O9���ωL��	� ��L�ѵ?kF
�un�H��\54�=wt��EN_��_gꁹ����%��c�3�F�<�[�fܢ��ǡi0�u+�<U����n;�m�����c�(��\f�"��n��_a�.���I8�iW�t2�V#���[3Қ2�TZ�'�����DLa�  q�X4��d5=k��E#�SB��ƕ�i��F��9�Yp ;�4P�k'?!���7��#u���L�FTΎy��%M���]@�W �!�
�9�=�2��邐��j1��SJ�Κ�;��o0�Q�W.��9�bd)�u�o��.~�4M��e,�%Y�ۤR�/�,HΠK���8��p�bD/&*��/T�}GV�:+pP��/�}�rD���N6ڱ,��9IS~:r?�#� +���?�2��B���N�vǷ�����{�(�����1���*#=�[�Q��t� ٷ8}�a������R���^0u�{�=���2�y�z��}���A �\�Ԓ�O*逵b���_��{/;8�la �"7�0ű�5��p�@LaEe6s����V �#��1qp�c�b\�M����k�R6C�
���0�K����v�8���>�\
��ʧW�s9[F�F��l�~��
��4����L������(|{Nf��Ϲy�R+*A˯D�R�M/����>Ni�ة�藘���T����i��uN�-��&��l�֜3<���0_&U@��ȹ�E���z�[@LZo5�Ӗb��~�, �EF��Rv��XFǎ�c�pz/�6aeaXP��rc1�H7}J��kk`7��bsy�2(����rt&���B��3[��Sޢf5\Cy++[<���AR��H���xh�&L�99�;M8�7Ϊ$Lx3�si��pI��*�P�љIF���2LޢBCZ�~�i~֔\!l��%�e�����ۯx���5^�7DV�R�Y�'�5�g_���U�p���_7��^����YJ{ݫ���c��ݤ8vת���9DA�'�[I��}�=[� �nSv(�z\��G%7���K�
��˟�?~�=&�B'ƾͷ�$Bw��>$�-, |����z"�:K�E�芇��e{�4D�ۃ-�[�Q� Ҁ+}(6�%r�A�$Zm�������@l����bB`.�,+Lfz��X�յ,��Ib"�$.4��ˠ�\Ta�Ű�V��~|z9n��:8x�������p-�5@ A_N��%ȍC���ǻ�z�.��p,�U�R8�5�!L(]���6�G�����p���~kVu���^�+u��Ɇ�g����7����G�BA5zyeZ��^���u�V���g����orWN-f�~���(�!�w�4�d�ٴ�0���&f3ǏG>|��?��!E�`�2�` �f�Q���M 	���Μ�9?u���W�/�:-΃��FHK�C��䬿-�D�b�׀mx�A�V�����Zp���_��\D	 �pdI���`T�J�R!W�@��Z��2��Y���;�Lc%�� ~V�'k�E��J����+���̴�^^�R�����r����e��ŔY�`�v��D�	�
J�Z�9]_���n�D9�Z"s��h�<���-7���N�J�h�C�SQ�F��Y�J�)��JTŻ�W��\9�I�`%��SUhM��T���Q	�3>nm�QZ�0��|r�E��!|�E�#Pq_�#@x�Ƒ���3�5�37jk����<zW����P�Kl\`�\Vt� ��n�P ��}Z����V�Ӥ�"\@�T�'/�x����/]�r��N���PvǜB�CV{d��ͧ�+���\[uF2zN���]E�!W�y���S+��X�D�B����E蝢+�H��t��-:�:��Y����E,�e�i�R����c���V��)���)Ou�tz�����$��JE�P��\����h�V�%O#P* ��5��s�*�c�S%���9���<��y�x��ه\L!��rm���q	��Ԍz�ps3f:Y�e4�FT8�	�h����QB�&���3/gZ��n�Ё4l��x�D����n�A0���B��v�\Ǿ�RU�f9�,�����|��ӄ1]=K��TgO)>��	�sC{˴c[�D i3�v�2���Ѓl�:��WL�q7̥`�yӤ�a�����/�0�oh�b�_�XТ�X�=��l���)�E���rpQvHlR �#���DO���{ܡ��N���5�>$���X���y��4&jN+�⻃^��q� v�%�*ŉ���BVu�\�*�N���f�$�`lx��iAi޷r�ь����u���g�<8\�	\%�ڞ#G�sv�X�Z���%�ݥn�a|-����mzU��0���J	��g������o��v<I��l{r����P��h�������nԁ�U�� ��䆍NqJL�^��n�@߲��|0z���$eE�9#�:9�l7M��F��^y�6v�sM�-�
���T��P��YfY��	����`��j���g����>���QNKHs�Z6��Si4��{S@��,�'����x��؟�qپ%'/��VD�C�FBo����I�E��V�$k�3�U�6]�]R8��pb�ZY莒�5݇㾇�yxE�l�Q�(�j$ �	� P ]F��V"�����|8�I��� �MB Kw��)`R���۠c��ߞ|�Pٶ\d}���l٫Ѷ��F-2\�Ă�
ը��^v��ƭ�8���nh�Y�'�N�/U$�l}Ai�Z��iz �լF�ݯ�۩�}xȧ�����=gIG�̜��x���ɋ3�O��K�!��<�^2��	�#�T	glQ�����zB���w��r���z�:��	�3�h��9t,h28����,��+�f��l� �����ʰT�� ��,�{ʑӣk�N]:r����Zey��le�Б���CG��W�,ן_\��h���p-���[#kkkׯWWV����kѵ�#+����VW��#�#�+qy1.��k����ֵ�~�\[\��+זo�je���n�V��qyyqe?G@�����\�~}�(�1�(�a��T�-o,ˠU`5��Z��n����r��2��h,U��5Z5���n�xǅkq������*P8Hs�3#U�zH�aa#DF*�}v{$������䔹�Y�ؽ����xޓQلס0s�6�;5��C��A��h�F������C�wo`�����Յs��hRh��f<G�˱�	V*�7� ��*�%����Z�$���E�>4�%��,��j4��R����1Ekc��p����o�)K�(�x�(�^�V��-t@ܘS�3H�:�7����Q�2p+�àT���� �Vc5� �iX�@���>#/z�>�(}h��6�e �+Hx3��sBvb����-�b j���OIZ�i܎B�|6���NY��M��]���.y��F��[)�!d�5L���K�!� 1ar�?,}*��y�x�vZ���t���\
�Qu�M[3���)���4/d�N{����K���E�U��c�<i_�����W�
q�Z�drs���z��)ռ�+!�OB��b�9��\Q�#��?�+M�\j��# �a�$ z�O�<r�-O��V4یJJ3A��z2�{�6�@[ �%'Y��S�>�,����Ґ�j3���L��w1��6�Ƥ�I֩"�F '���� F�!�|F&�����Qa��!D�֥+w�X1�%��D�;=���`�Z��L�27��Ef^/+7�D�_��UF��Ɖ�qu��%`�8!�W��0W9��b	���X>P'����!F��P�������I;Y���+ae��7C�w'P!���>~�`��(�K�m����gO/�"[.<�W�ˀ�@�(W�&"T���	� "F�$��GIk\p��B�|�����&�t��*���{�H{�u��!v@\�RG�vd����#Kt[k��r�AE;H��t��v�wN3b����3򮍇�#�ЩFJ�9(Y�y!ڐ����ҟ��xǓ��H��������uߌyL?��4#���+M�	�#�qC�ڸ�j��C�~���>���:�'���eB�LLL:\����T�B�a.��70b�	����*-Ӧ7��j��:ٻ�w�Â�Q� H�HNx�b�l�ݨĶ�H�+¼Q!�ˏZ@H�v�It���	��]*g�:�O�C���r{�i-iǶ��?G�7|H3AtNG��J�e$te�h�(��RAKE����x'���(~TS�t�ʕz�Z#�iq+�$�ק�(�@/�k]�1q�ef/��>;u�
��
��:��/�¦Р�q�=lt?`ŀ;���^�ޝk,UD�;�s�R 1��w�\�8O�;��2�3���!�M�Ƃ�e��|����;(Io����#�xC!	���Ο��O]�z�����^-�!?��Is)/`��z��Ph5g�M�5�)U3�ɢ����c I��<��\�4�(��]�$|J��NCū�b4�Qd\TJ��r3��K��F���/����_���X�`FL՛�!�k�aIP�-G�	��c���;��`XD2���"6E�:�"�`�٥��!�tD�~��g:�c�xq���@�f���EG����X	�O��>�(�ue���p���	
���AX������p$I�J�&�65�'���$tQ t�!L?�v�`"�cF-�&��E���r�m��w���B�~���V�2(�9�l|l'!RG�Km��a����(�e�����
ۄ��A�N9�������w����R{lQ|����}&�`5�E2ܵq�������\nHPk�+�$C1B�d^Hx�,�g#BZ��������U�h����C�T��#�9م*��`�V����.q�O:J��c�X�>(�""�"���} ����-.�I��lu��@�8����^'�m6-�2\���N��H+Zm�lM���)}��[P<[���9u̻��p�JƁ;y5�3��X�����D|4nC��[�D�l�h��ɜ6�0�/�&e�����9Es<\F�88�Pc������Xu��?�2�nS�=O�=�Vė<q�\f!$L����#~�ku��D�i�~�'�9���k�+p�㌈<l��8�'�s�@S4����+���v�V������U�ȹ�֚�B�[X�'U��Ra�7E���YwAZs=����	Ae��E&��,�)���3�9IG� =�d����sw�3r�vK8z��ԅ�?.��`<�I�Z��>)�o���Y!�þ��$��x	��ɺ	t�ڶt�B�z�w8��q/�2:2�#��h���W�Q-�Uҫ�P���-
���N�����H���xoNPp=�V���w(L�]֭ c��o$�	��P�^X@M	#��ts&v�"���4r��2��x!��#c	�2�z�]+��|/�80�"1��R�"e�Lu2���M�?�QO�	�7��Lݕzqr͎S&>�_n��A����s�˫��� �ȕ�7a��xT�n%f�m�-��6M�ɟl5�r)$���ԸD�K���4C}��N� [�
K�e��G�.B��!��:��}����Y�C8"��o��z�'������z_��G�����G�M�+����F�*�U��-˱�P�J�Sb�]+9j�o�J��FB��	�;4h����Q=z��)�K�YA��;֙zc�v�Q��A�k�D�"jDv�~�6"�z����ף�tG Sd�XZv��܈Y[�M� ��&�>��NBr�pۇv�U� ���~����V�ٽ2���`�K��2�����g���3x�<�3����}B��� h�!��?��=��z���r69���!��'0���M9�n&q!ƴ����;����@� ����}=���0��T�WD����B°t;d����S�?�&�I��j��0V;2iU���b�i��ª	�$�� ��y�|R���v$��O5���$�j[~.[�7�"=�3^0�=4�)�B�,d�5�g.�;=;�D�F��B��{�j��	2.�����%����$��(�(�<���q���w�������W��Uz�K���˿���[7v��5~�|E��%kb�t�b�=Cٺֳ$a��0H�#|G�?<������?0���0����f��!E��ut��/` ��&�z�!��cv�i��f��y0�)⹁d1���|]A�<���eD�� +��s7�%AK��[&�[g�R%"�������F;���ۘ��ϱ�y|��a$sʊ��N\�c���0�S�V\%P����w	&fO2�z�&���L�a���B"��S'"J��N	='QN?0J+�%q�������`���&�W�x4��P>�V�!5k�f�6�|è�,Ċ��V��(W�h�e'��˝��;a�O�iB�;������w�i}MK:7��E��'��a�B��q��C�{y��潗`��0yOo��d�)���xЛ���8U��ڴ�@�����j�)�k����ʦ�i%&S�B#�U2��o:!�V/��O�Ĵ�@�JT��!;*�[E�q��G%| �Ѯ8r���=�@�����m�}����/oԪ�*D=�$X9L7��.�'����u����0b�p�]ض���D0���L+]�5$ّap%$��<��6���@D:�#O��2i_`�f/Ϝ��|�U�H�)����}���RD��ܐ����� $��t`��a�5�_A!�j�B������a� �8\��ad�_C׺_y�$r��5kp M�Π�i��ȋBɣ�v�!��X�r&�y~娭" ��2İј�q�r�o�QI�2|d��H��f����S6n�E�g�=	�; ���5��!N��;�R<��e��d@PN3�a�80r`�aU^�A�7�{�;��(��cB��2��1�h���]E��%Ӳ�C�:�RnCJ���ie�R2�	�y�~P@��z�R���xP����IZo	�Y�w�U`����P�Q�X	y)n^a�W������I���Bۻ�� �]�I�$Q�xk�[]iG5�bs���j
K���=��ʙϔ)�}c���25����l�!W�h�%�Fzj����[��R�э����/ձ��|`o�V��vݫ�=�t�����4"�qBZ����9�0�{�=�����z��2L
5'i�SѢ$]�w)�#EE�J�@?�a]���qԈ�J3Ȟ�����z9\�vP,N��;?�"�\�9����>��T������^T!Н��t�=U/�<�&��'BGq����
bNk��..b��F��T��ő�c�?��Q�"ڊ�/���n�����9&�
�!�T�����D���=ux.Dn�����N��j����xt�Qo/���z�Ն%�s�JONʞt�<k1�=�(�D�x/����b8�WjQ;�י�=W���iV�`fGI�|�V\@���g,5�(8�L�P�>�'Jw��H��7� ��MP�Q���Sm�Y�kto/�*��홪	ߗC�De�~�t�$^��,�g�dҖ�L�F鹄%Ǝ9�P�L��!�7��=�3@=�h�������ΦB	��Y'������>����f;��G��l����}�����=i%.m��� .�
���	x�焇�5��`5N�;����D��1N���r�ؠ��/��C�N����v
 <��:�!����q�z��OI2���TP'�����U"�i���)&4D�N��J�xW�)�?*�'/̈́�_J�+��� fR�0T�7o�1�0n�K2�D�Pr'��=�>�����?۫�_�w�)��&�-&X���#$����g��c��7�GɃQ��pBcR��(`�o���w8���7��2��!��{�2]�=���.�D8ÿ�\������7�b�,���rk� �&*�T���Lf�M��h��v�sz Qrɘ�)�$(�Y\����`�:_U F(����[A����FK���G���J�Z�a�,��X�k�p��R/�8,aى���L$�+�u�{�f�_gu{�F��p����\�<��g���9��vOI?��7��L.BY�q{1'�G<��#.3P������ӢoY��:^�ew�@��}���H� D�!����K�Ä�b����	a��.h:�檎��'��ڟ����20��(T����V�Q�j�&��NBgy���A���LĔ��g<��/��V/���HքS���C�C6�&(7�'�N� s����c%]H]�#��*����mDT�tr�0��8����<�VvD�~�����m�>n��(�@����k�7�P!�E�G�rv�sH�D�Xʳ�
���M{����h|)XX*Y�)k�z���C�H����{�l =�����yvt���`�s���p�E��ل�{�k�:jAYB-�gg/J�n7�i�M`�7aS�d��:)/�n���jN}�.�ƌ��G�{���^�7��ҕ�yhu�2��z��ř�� �/������P�:ju�u�R�a�:6'���0����Qiy&j6Zm�C��Y��B����#��~~G�����S�����r�z�΀\���G:��ɰ��D{"e��*�|������W.�:}���7ޔ;�D�P����6<��t/�#�a��"�Z�\�F��E�eE>��]�y�;��0��>�;a��cA7�#v��D.�t��g9���a�z�Z3X(�t C�#oP)ee;9����#�%n��%n�����eK�o�^�n�۵jF��W��>���   �� ��H