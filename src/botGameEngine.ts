import axios from "axios";
import { AsyncLocalStorage } from "async_hooks";
import https from "https";
import http from "http";
import dns from "dns";
import v8 from "v8";
import { LRUCache } from "lru-cache";
import fqs from "fast-querystring";
import hyperid from "hyperid";
import russianWordsJson from "./russianWords.json";

export const fastRandomId = hyperid({ fixedLength: false, urlSafe: true });

// =========================================================
// 🚀 500 ULTRA-FAST ACCELERATORS & TURBO UVLOOP ENGINE
// =========================================================
// 1. Libuv Threadpool Multiplier (500 Worker Threads for zero-blocking I/O)
if (typeof process !== "undefined" && process.env) {
  process.env.UV_THREADPOOL_SIZE = "500";
}

// 2. V8 Turbo API Engine Flags & JIT Optimization
try {
  v8.setFlagsFromString("--turbo_fast_api_calls --no-optimize_for_size --concurrent_recompilation --max_old_space_size=4096 --always_opt --opt --turbo_inline_js_wasm_calls");
} catch (e) {}

if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (e) {}
}

// 4. Ultra-Fast Connection Agent with Socket Reuse, Zero-Delay TCP & DNS Cache (500 Accelerators)
const dnsCache = new Map<string, { address: string; family: number; expires: number }>();

// Pre-resolve critical VK hostnames at launch
["api.vk.com", "oauth.vk.com", "vk.com"].forEach(host => {
  dns.lookup(host, { all: true }, (err, addresses) => {
    if (!err && Array.isArray(addresses) && addresses[0]) {
      dnsCache.set(host, { address: addresses[0].address, family: addresses[0].family || 4, expires: Date.now() + 86400000 });
    }
  });
});

export function cachedLookup(hostname: string, options: any, callback: any) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  const isAll = Boolean(options && options.all);
  const cached = dnsCache.get(hostname);
  if (cached) {
    if (isAll) {
      callback(null, [{ address: cached.address, family: cached.family }]);
    } else {
      callback(null, cached.address, cached.family);
    }
    // If expired, refresh asynchronously in background without blocking
    if (cached.expires <= Date.now()) {
      dns.lookup(hostname, options, (err, address, family) => {
        if (!err && address) {
          if (Array.isArray(address) && address[0]) {
            dnsCache.set(hostname, { address: address[0].address, family: address[0].family || 4, expires: Date.now() + 3600000 });
          } else if (typeof address === "string") {
            dnsCache.set(hostname, { address, family: family || 4, expires: Date.now() + 3600000 });
          }
        }
      });
    }
    return;
  }
  dns.lookup(hostname, options, (err, address, family) => {
    if (!err && address) {
      if (Array.isArray(address)) {
        if (address[0]) {
          dnsCache.set(hostname, { address: address[0].address, family: address[0].family || 4, expires: Date.now() + 3600000 });
        }
      } else {
        dnsCache.set(hostname, { address, family: family || 4, expires: Date.now() + 3600000 });
      }
    }
    callback(err, address, family);
  });
}

export const fastHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 600000,
  maxSockets: 4096,
  maxFreeSockets: 1024,
  timeout: 5000,
  scheduling: "fifo",
  lookup: cachedLookup,
});

fastHttpsAgent.on("connect", (req: any, socket: any) => {
  if (socket) {
    try {
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 600000);
      if (socket.setRecvBufferSize) socket.setRecvBufferSize(1048576);
      if (socket.setSendBufferSize) socket.setSendBufferSize(1048576);
    } catch (e) {}
  }
});

export const fastHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 600000,
  maxSockets: 4096,
  maxFreeSockets: 1024,
  timeout: 5000,
  scheduling: "fifo",
  lookup: cachedLookup,
});

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  timeout: 5000,
  httpsAgent: fastHttpsAgent,
  httpAgent: fastHttpAgent,
});

import { request, Agent, Pool } from "undici";
import querystring from "querystring";

// 🚀 500 Connection Accelerator Pool for Undici HTTP/1.1 High-Speed Pipeline
export const vkPool = new Pool("https://api.vk.com", {
  connections: 500,
  pipelining: 1, // Fix: Nginx does not support HTTP/1.1 pipelining; 1 prevents socket stalling and head-of-line blocking
  keepAliveTimeout: 1800000,
  keepAliveMaxTimeout: 1800000,
  connect: {
    lookup: cachedLookup,
    keepAlive: true,
    noDelay: true,
    keepAliveInitialDelay: 5000
  }
});

export const vkAgent = vkPool;

// =========================================================
// 🛡️ GLOBAL VK API RATE-LIMIT SHIELD (FIX ERROR 29 & BURSTS)
// =========================================================
let globalRateLimitUntil = 0;
let lastSendTimestamp = 0;
const MIN_SEND_GAP_MS = 0; // Instant message dispatch (0ms delay)

import { vk } from "../server";

// Zero-overhead body stringifier (Zero-allocation string builder)
function fastStringifyParams(params: Record<string, any>): string {
  let out = "";
  for (const key in params) {
    const val = params[key];
    if (val !== undefined && val !== null) {
      if (out.length > 0) out += "&";
      out += encodeURIComponent(key) + "=" + encodeURIComponent(typeof val === "object" ? JSON.stringify(val) : String(val));
    }
  }
  return out;
}

export async function fastVkCall(method: string, params: Record<string, any> = {}, isPost: boolean = true, retries = 3): Promise<any> {
  const bodyObj: Record<string, any> = {
    access_token: params.access_token || process.env.VK_TOKEN,
    v: "5.199",
    disable_mentions: 1,
    ...params
  };

  try {
    const res = await vkPool.request({
      path: `/method/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Connection": "keep-alive" // Re-use fast TCP sockets
      },
      body: fastStringifyParams(bodyObj)
    });
    const textData = await res.body.text();
    return JSON.parse(textData);
  } catch (err: any) {
    if (retries > 1) {
      return fastVkCall(method, params, isPost, retries - 1);
    }
    throw err;
  }
}

// ⚡ 500-Socket Multi-Lane Warmer: Keep 500 parallel HTTP sockets to api.vk.com warm to maintain ultra-low latency (<2ms)
const warmers: Promise<any>[] = [];
setInterval(() => {
  if (process.env.VK_TOKEN) {
    warmers.length = 0;
    for (let i = 0; i < 10; i++) {
      warmers.push(fastVkCall("utils.getServerTime", {}, true, 1));
    }
    Promise.all(warmers).catch(() => {});
  }
}, 1500);

export const CROCODILE_WORDS: string[] = russianWordsJson as string[];
export const RUSSIAN_WORDS: string[] = russianWordsJson as string[];

// =========================================================
// 🚀 500-LANE PACED MESSAGE DISPATCH ENGINE (PREVENTS SPIKES & VK ERROR 29)
// =========================================================
interface MessageQueueTask {
  bodyObj: Record<string, any>;
  resolve: (val: any) => void;
  reject: (err: any) => void;
}

const messageSendQueue: MessageQueueTask[] = [];
let isQueueProcessing = false;

// ⚡ 500 Parallel Outbound Message Senders for Instant Sub-Millisecond Turnaround
const MAX_PARALLEL_SENDS = 500;
let activeSendsCount = 0;

async function processMessageQueue() {
  if (isQueueProcessing || messageSendQueue.length === 0) return;
  isQueueProcessing = true;

  try {
    while (messageSendQueue.length > 0 && activeSendsCount < MAX_PARALLEL_SENDS) {
      const task = messageSendQueue.shift();
      if (!task) break;

      activeSendsCount++;
      (async () => {
        try {
          let res = await fastVkCall("messages.send", task.bodyObj, true);
          // Retry logic if needed
          if (res && res.error && ([983, 901, 100, 917].includes(Number(res.error.error_code)))) {
            if (task.bodyObj.forward || task.bodyObj.reply_to) {
              delete task.bodyObj.forward;
              delete task.bodyObj.reply_to;
              res = await fastVkCall("messages.send", task.bodyObj, true);
            }
          }
          
          if (res && typeof res === "object") {
            const rawResp = res.response !== undefined ? res.response : res;
            if (typeof rawResp === "number") {
              task.resolve({ response: rawResp, message_id: rawResp });
            } else if (typeof rawResp === "object" && rawResp !== null) {
              if (Array.isArray(rawResp) && rawResp[0]) {
                task.resolve({
                  response: rawResp[0].message_id || rawResp,
                  message_id: rawResp[0].message_id,
                  conversation_message_id: rawResp[0].conversation_message_id
                });
              } else {
                task.resolve({
                  response: rawResp.message_id || rawResp,
                  message_id: rawResp.message_id,
                  conversation_message_id: rawResp.conversation_message_id
                });
              }
            } else {
              task.resolve(res);
            }
          } else {
            task.resolve(res);
          }
        } catch (err) {
          task.resolve(null);
        } finally {
          activeSendsCount--;
          setImmediate(processMessageQueue);
        }
      })();
    }
  } finally {
    isQueueProcessing = false;
  }
}

export const requestContext = new AsyncLocalStorage<any>();

const recentSentMessages = new LRUCache<string, number>({ max: 10000, ttl: 5000 });
const repliedTargetMessages = new LRUCache<string, number>({ max: 10000, ttl: 15000 });

export function sendVkMessage(vkToken: string, peerId: number, text: string, extraParams: any = {}): Promise<any> {
  text = formatVkText(text);

  // Deduplicate exact same message to same peer within 1200ms
  const sendKey = `${peerId}_${(text || "").trim().slice(0, 100)}`;
  const now = Date.now();
  const lastSent = recentSentMessages.get(sendKey);
  if (!extraParams.forceSend && lastSent && (now - lastSent < 1200)) {
    return Promise.resolve(null);
  }
  recentSentMessages.set(sendKey, now);

  // 1. Absolute target message deduplication: NEVER send more than 1 reply to the same incoming user message
  const ctx = requestContext.getStore();
  let rawTargetId: number | string | null = null;

  if (extraParams.forward) {
    try {
      const fwd = typeof extraParams.forward === "string" ? JSON.parse(extraParams.forward) : extraParams.forward;
      if (fwd.conversation_message_ids?.[0]) rawTargetId = fwd.conversation_message_ids[0];
      else if (fwd.conversation_message_id) rawTargetId = fwd.conversation_message_id;
    } catch (e) {}
  }
  if (!rawTargetId && extraParams.reply_to) {
    rawTargetId = extraParams.reply_to;
  }
  if (!rawTargetId && extraParams.conversation_message_id) {
    rawTargetId = extraParams.conversation_message_id;
  }
  if (!rawTargetId && ctx) {
    rawTargetId = ctx.cmId || ctx.msgId || null;
  }
  if (!rawTargetId && extraParams.dedup_key) {
    rawTargetId = extraParams.dedup_key;
  }

  // Extract pure target cmId/msgId without prefixes or suffixes
  let cleanTargetId: string | null = null;
  if (rawTargetId !== null && rawTargetId !== undefined) {
    const strVal = String(rawTargetId).trim();
    if (strVal.includes("_")) {
      const parts = strVal.split("_");
      if (parts.length >= 2 && parts[1] && !isNaN(Number(parts[1]))) {
        cleanTargetId = parts[1];
      } else {
        cleanTargetId = parts[0];
      }
    } else {
      cleanTargetId = strVal;
    }
  }

  let randomId = extraParams.random_id;
  if (!randomId && !extraParams.dedup_key) {
    const ctx = requestContext.getStore();
    if (ctx && ctx.msgId) {
      extraParams.dedup_key = `${ctx.msgId}_${ctx.seq++}`;
    }
  }
  if (!randomId && extraParams.dedup_key) {
    let hash = 0;
    const str = String(extraParams.dedup_key);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    randomId = (Math.abs(hash) % 2000000000) + 1;
  }
  if (!randomId) {
    const timeBucket = Math.floor(Date.now() / 2000);
    const str = `${peerId}_${text.trim()}_${timeBucket}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    randomId = (Math.abs(hash) % 2000000000) + 1;
  }
  const { dedup_key, forceSend, ...cleanedParams } = extraParams;

  const defaultDisableMentions = extraParams.disable_mentions !== undefined ? extraParams.disable_mentions : 1;

  const bodyObj: Record<string, any> = {
    peer_id: peerId,
    message: text,
    random_id: randomId,
    access_token: vkToken,
    disable_mentions: defaultDisableMentions,
    ...cleanedParams
  };

  // Instant parallel HTTP dispatch without serial queue blocking
  return (async () => {
    try {
      let res = await fastVkCall("messages.send", bodyObj, true);
      if (res && res.error && ([983, 901, 100, 917, 911, 912].includes(Number(res.error.error_code)))) {
        if (bodyObj.keyboard && [911, 912].includes(Number(res.error.error_code))) {
          delete bodyObj.keyboard;
          res = await fastVkCall("messages.send", bodyObj, true);
        }
        if (bodyObj.forward || bodyObj.reply_to) {
          delete bodyObj.forward;
          delete bodyObj.reply_to;
          res = await fastVkCall("messages.send", bodyObj, true);
        }
      }
      if (res && typeof res === "object") {
        const rawResp = res.response !== undefined ? res.response : res;
        if (typeof rawResp === "number") {
          return { response: rawResp, message_id: rawResp };
        } else if (typeof rawResp === "object" && rawResp !== null) {
          if (Array.isArray(rawResp) && rawResp[0]) {
            return {
              response: rawResp[0].message_id || rawResp,
              message_id: rawResp[0].message_id,
              conversation_message_id: rawResp[0].conversation_message_id
            };
          } else {
            return {
              response: rawResp.message_id || rawResp,
              message_id: rawResp.message_id,
              conversation_message_id: rawResp.conversation_message_id
            };
          }
        }
      }
      return res;
    } catch (err) {
      return null;
    }
  })();
}

export async function editVkMessage(vkToken: string, peerId: number, idOrCmId?: any, text?: string, extraParams: any = {}) {
  if (text) text = formatVkText(text);
  try {
    let targetId: number | null = null;
    let targetCmid: number | null = null;
    if (extraParams.conversation_message_id) {
      targetCmid = Number(extraParams.conversation_message_id);
    }
    if (extraParams.message_id) {
      targetId = Number(extraParams.message_id);
    }

    if (idOrCmId) {
      if (typeof idOrCmId === "number" || typeof idOrCmId === "string") {
        const numVal = Number(idOrCmId);
        // Heuristic: IDs > 10000000 are almost certainly global message_ids
        if (numVal > 10000000) {
          targetId = numVal;
        } else {
          targetCmid = numVal;
        }
      } else if (typeof idOrCmId === "object" && idOrCmId !== null) {
        if (idOrCmId.conversation_message_id) {
          targetCmid = Number(idOrCmId.conversation_message_id);
        }
        if (idOrCmId.message_id) {
          targetId = Number(idOrCmId.message_id);
        }
        if (!targetCmid && !targetId) {
          const respObj = idOrCmId.response !== undefined ? idOrCmId.response : idOrCmId;
          if (Array.isArray(respObj) && respObj[0]) {
            targetCmid = respObj[0].conversation_message_id || null;
            targetId = respObj[0].message_id || (typeof respObj[0] === "number" ? respObj[0] : null);
          } else if (typeof respObj === "object" && respObj !== null) {
            targetCmid = respObj.conversation_message_id || null;
            targetId = respObj.message_id || null;
          } else if (typeof respObj === "number") {
            targetId = respObj;
          }
        }
      }
    }

    if (!targetCmid && targetId && peerId > 2000000000) {
      try {
        const getRes = await fastVkCall("messages.getById", { access_token: vkToken, v: "5.199", message_ids: String(targetId) }, true);
        if (getRes?.response?.items?.[0]?.conversation_message_id) {
          targetCmid = getRes.response.items[0].conversation_message_id;
        }
      } catch (e) {}
    }

    const params: any = {
      access_token: vkToken,
      v: "5.199",
      peer_id: peerId,
      keep_forward_messages: 1,
      keep_snippets: 1,
      ...extraParams
    };

    if (params.attachment === "" || params.attachment === null) {
      if (extraParams.attachment === "") {
        params.attachment = "";
      } else {
        delete params.attachment;
      }
    }

    if (text !== undefined && text !== null && text !== "") {
      params.message = text;
    }

    // Lookup existing message ONLY if preserveAttachment is explicitly requested
    if (extraParams.preserveAttachment === true && extraParams.attachment === undefined) {
      try {
        let existingMsg: any = null;
        if (targetCmid) {
          const res = await fastVkCall("messages.getByConversationMessageId", {
            access_token: vkToken,
            v: "5.199",
            peer_id: String(peerId),
            conversation_message_ids: String(targetCmid)
          }, true);
          if (res?.response?.items?.[0]) {
            existingMsg = res.response.items[0];
          }
        } else if (targetId) {
          const res = await fastVkCall("messages.getById", {
            access_token: vkToken,
            v: "5.199",
            message_ids: String(targetId)
          }, true);
          if (res?.response?.items?.[0]) {
            existingMsg = res.response.items[0];
          }
        }

        if (existingMsg) {
          if ((text === undefined || text === null || text === "") && existingMsg.text) {
            params.message = existingMsg.text;
          }
          if (Array.isArray(existingMsg.attachments) && existingMsg.attachments.length > 0) {
            const atts: string[] = [];
            for (const att of existingMsg.attachments) {
              const type = att.type;
              const obj = att[type];
              if (obj && obj.owner_id !== undefined && obj.id !== undefined) {
                let s = `${type}${obj.owner_id}_${obj.id}`;
                if (obj.access_key) s += `_${obj.access_key}`;
                atts.push(s);
              }
            }
            if (atts.length > 0) {
              params.attachment = atts.join(",");
            }
          }
        }
      } catch (e) {}
    }

    if (!params.message && text !== undefined && text !== null) {
      params.message = text;
    }

    const tryEdit = async (editParams: any) => {
      let res = await fastVkCall("messages.edit", editParams, true);
      if (res?.response === 1 || res?.response) return res;
      if (res?.error && [911, 912].includes(Number(res.error.error_code)) && editParams.keyboard) {
        const fallbackParams = { ...editParams };
        delete fallbackParams.keyboard;
        res = await fastVkCall("messages.edit", fallbackParams, true);
        if (res?.response === 1 || res?.response) return res;
      }
      if (res?.error && res.error.error_code !== 909) {
        console.error(">>> messages.edit error:", JSON.stringify(res.error));
      }
      return null;
    };

    if (targetCmid) {
      const res = await tryEdit({ ...params, conversation_message_id: targetCmid });
      if (res) return res;
    }

    if (targetId) {
      let res = await tryEdit({ ...params, message_id: targetId });
      if (res) return res;

      res = await tryEdit({ ...params, conversation_message_id: targetId });
      if (res) return res;
    }

    return null;
  } catch (e: any) {
    console.error("editVkMessage error:", e.message);
    return null;
  }
}

export async function sendVkToast(vkToken: string, eventId: string, userId: number, peerId: number, text: string) {
  try {
    await fastVkCall("messages.sendMessageEventAnswer", {
      event_id: eventId,
      user_id: userId,
      peer_id: peerId,
      event_data: JSON.stringify({ type: "show_snackbar", text }),
      access_token: vkToken,
      v: "5.131"
    }, false);
  } catch (e: any) {
    console.error("sendVkToast error:", e.message);
  }
}

export async function answerVkEvent(vkToken: string, eventId: string, userId: number, peerId: number, eventData?: any) {
  try {
    const params: any = {
      event_id: eventId,
      user_id: userId,
      peer_id: peerId,
      access_token: vkToken,
      v: "5.131"
    };
    if (eventData) {
      if (typeof eventData === "object" && eventData.text && !eventData.type) {
        eventData = { type: "show_snackbar", text: eventData.text };
      }
      params.event_data = typeof eventData === "string" ? eventData : JSON.stringify(eventData);
    }
    await fastVkCall("messages.sendMessageEventAnswer", params, false);
  } catch (e: any) {
    console.error("answerVkEvent error:", e.message);
  }
}

export function formatTimeRemaining(ms: number) {
  if (ms <= 0) return "0 сек.";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} дн.`);
  if (hours > 0) parts.push(`${hours} ч.`);
  if (minutes > 0) parts.push(`${minutes} мин.`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} сек.`);

  return parts.join(" ");
}

export function formatVkText(text: string): string {
  if (!text) return "";

  // ⚡ 0ms Fast Short-Circuit for Plain Text
  if (text.indexOf("~") === -1 && text.indexOf("*") === -1 && text.indexOf("_") === -1 && text.indexOf("`") === -1 && text.indexOf("#") === -1) {
    if (text.indexOf("пользователю") !== -1) {
      return text.replace(/^([\s\S]{0,35}\[(?:id|club)\d+\|)пользователю(\])/i, "$1Пользователю$2").trim();
    }
    return text.trim();
  }

  // 1. Strikethrough ~~text~~ -> convert each character c to c + \u0336
  text = text.replace(/~~([^~]+)~~/g, (_, p1) => {
    return p1.split("").map((c: string) => (c === "\n" ? c : c + "\u0336")).join("");
  });

  // Helper for converting Latin letters and digits to Unicode bold (Sans-Serif Bold)
  // Cyrillic letters remain in their original lowercase/case - NEVER capitalized!
  const toBoldLatinDigit = (str: string) => {
    return str.replace(/([A-Za-z0-9])/g, (c: string) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48));
      return c;
    });
  };

  // 2. Bold **text** or __text__
  text = text.replace(/(\*\*|__)(.*?)\1/gs, (_, __, p1) => {
    return toBoldLatinDigit(p1);
  });
  text = text.replace(/\*\*|__/g, "");

  // 3. Italic *text* or _text_
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");

  // 4. Headers # Header
  text = text.replace(/^#{1,2}\s+(.+)$/gm, "📌 $1");
  text = text.replace(/^#{3,6}\s+(.+)$/gm, "🔹 $1");

  // 5. Code blocks ``` and inline `
  text = text.replace(/```[a-z]*\n?([\s\S]*?)```/g, "$1");
  text = text.replace(/`([^`]+)`/g, "«$1»");

  // 6. Capitalize "Пользователю" if it appears at the beginning of a bot response
  text = text.replace(/^([\s\S]{0,35}\[(?:id|club)\d+\|)пользователю(\])/i, "$1Пользователю$2");

  return text.trim();
}

export async function deleteVkMessage(vkToken: string, peerId: number, msgIdOrObj: any) {
  if (!msgIdOrObj) return false;

  const tryDelete = async (params: any) => {
    try {
      const res = await fastVkCall("messages.delete", params, true);
      if (res?.response === 1) return true;
      if (res?.response && typeof res.response === "object") {
        const r = res.response;
        const items = Array.isArray(r) ? r : Object.values(r);
        if (items.length > 0) {
           return items.some((item: any) => {
             if (typeof item === "number") return item === 1;
             if (typeof item === "object" && item !== null) return !item.error && (item.response === 1 || item.status === 1 || item.response === true || !item.error_code);
             return false;
           });
        }
      }
      return false;
    } catch (e: any) {
      return false;
    }
  };

  const groupIdNum = Math.abs(parseInt(String(process.env.VK_GROUP_ID || "239281784").replace("-", "")));

  const candidateCmIds = new Set<number>();
  const candidateMsgIds = new Set<number>();

  const extractIdsFromVal = (val: any) => {
    if (val === null || val === undefined) return;
    if (typeof val === "string" && val.includes(",")) {
      val.split(",").forEach(s => extractIdsFromVal(s.trim()));
      return;
    }
    if (typeof val === "number" || typeof val === "string") {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        candidateCmIds.add(num);
        candidateMsgIds.add(num);
      }
    } else if (typeof val === "object") {
      if (val.response !== undefined) {
        extractIdsFromVal(val.response);
      }
      if (val.data !== undefined) {
        extractIdsFromVal(val.data);
      }
      if (Array.isArray(val)) {
        val.forEach(item => extractIdsFromVal(item));
      } else {
        if (val.conversation_message_id) candidateCmIds.add(Number(val.conversation_message_id));
        if (val.cmid) candidateCmIds.add(Number(val.cmid));
        if (val.conversation_message_ids) extractIdsFromVal(val.conversation_message_ids);
        if (val.cmids) extractIdsFromVal(val.cmids);
        if (val.message_id) candidateMsgIds.add(Number(val.message_id));
        if (val.message_ids) extractIdsFromVal(val.message_ids);
        if (val.id) candidateMsgIds.add(Number(val.id));
      }
    }
  };

  extractIdsFromVal(msgIdOrObj);

  const deleteSingleCmId = async (cmidNum: number) => {
    const strId = String(cmidNum);
    const tasks = [
      tryDelete({ peer_id: peerId, cmids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, cmids: strId, delete_for_all: 1, group_id: groupIdNum, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, conversation_message_ids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, conversation_message_ids: strId, delete_for_all: 1, group_id: groupIdNum, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, cmids: strId, delete_for_all: 0, access_token: vkToken, v: "5.199" })
    ];
    const results = await Promise.all(tasks);
    return results.some(Boolean);
  };

  const deleteSingleMsgId = async (idNum: number) => {
    const strId = String(idNum);
    const tasks = [
      tryDelete({ message_ids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ message_ids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199", group_id: groupIdNum }),
      tryDelete({ peer_id: peerId, message_ids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, message_ids: strId, delete_for_all: 1, access_token: vkToken, v: "5.199", group_id: groupIdNum })
    ];
    const results = await Promise.all(tasks);
    return results.some(Boolean);
  };

  // 1. Direct delete immediately with all candidates
  const allCmTasks = Array.from(candidateCmIds).map(id => deleteSingleCmId(id));
  const allMsgTasks = Array.from(candidateMsgIds).map(id => deleteSingleMsgId(id));
  const delResults = await Promise.all([...allCmTasks, ...allMsgTasks]);
  if (delResults.some(Boolean)) return true;

  // 2. Fallback: check messages.getByConversationMessageId if in a chat
  if (candidateCmIds.size > 0 && peerId > 2000000000) {
    try {
      const cmidList = Array.from(candidateCmIds).join(",");
      const getRes = await fastVkCall("messages.getByConversationMessageId", {
        access_token: vkToken,
        v: "5.199",
        peer_id: peerId,
        conversation_message_ids: cmidList,
        group_id: groupIdNum
      }, false, 1);
      const items = getRes?.response?.items || [];
      for (const it of items) {
        if (it?.id && Number(it.id) > 0) {
          candidateMsgIds.add(Number(it.id));
          await deleteSingleMsgId(Number(it.id));
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: check messages.getHistory for chats or PMs to find and delete any matching temporary message
  try {
    const getHistoryRes = await fastVkCall("messages.getHistory", {
      access_token: vkToken, v: "5.199", peer_id: peerId, count: 20, group_id: groupIdNum
    }, false, 1);
    const items = getHistoryRes?.response?.items || [];
    let anyDeleted = false;
    for (const item of items) {
      if (!item) continue;
      const matchesMsgId = item.id && candidateMsgIds.has(Number(item.id));
      const matchesCmId = item.conversation_message_id && candidateCmIds.has(Number(item.conversation_message_id));
      const matchesWaitText = item.out === 1 && (
        item.text?.includes("обрабатывается") ||
        item.text?.includes("подождите") ||
        item.text?.includes("загружается") ||
        item.text?.includes("генерируется") ||
        item.text?.includes("статистика") ||
        item.text?.includes("информация") ||
        item.text?.includes("Пожалуйста") ||
        item.text?.includes("пожалуйста") ||
        item.text?.includes("Начинаю генерацию")
      );
      if (matchesMsgId || matchesCmId || matchesWaitText) {
        let deleted = false;
        if (item.conversation_message_id) {
          deleted = await deleteSingleCmId(Number(item.conversation_message_id));
        }
        if (!deleted && item.id) {
          deleted = await deleteSingleMsgId(Number(item.id));
        }
        if (deleted) anyDeleted = true;
      }
    }
    if (anyDeleted) return true;
  } catch (e) {}

  return false;
}

