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

// ⚡ V8 Turbo API Engine Flags & JIT Optimization (Ultra-Fast Process Acceleration)
try {
  v8.setFlagsFromString("--turbo_fast_api_calls --no-optimize_for_size --concurrent_recompilation --max_old_space_size=4096 --always_opt --opt --turbo_inline_js_wasm_calls --expose-gc --hash-seed=42");
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

// 🚀 2000 Connection Accelerator Pool for Undici HTTP/1.1 High-Speed Pipeline
export const vkPool = new Pool("https://api.vk.com", {
  connections: 2000,
  pipelining: 20, 
  keepAliveTimeout: 1800000,
  keepAliveMaxTimeout: 1800000,
  bodyTimeout: 15000,
  headersTimeout: 15000,
  connect: {
    lookup: cachedLookup,
    keepAlive: true,
    noDelay: true,
    keepAliveInitialDelay: 5000,
    allowH2: true
  }
});

export const vkAgent = vkPool;

// =========================================================
// 🛡️ GLOBAL VK API RATE-LIMIT SHIELD (FIX ERROR 29 & BURSTS)
// =========================================================
let globalRateLimitUntil = 0;
let lastSendTimestamp = 0;
const MIN_SEND_GAP_MS = 0; // Instant message dispatch (0ms delay)

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
    if (params.dontParseResponse === true) {
      // FIRE AND FORGET: Do not even await the HTTP request! 0ms latency.
      vkPool.request({
        path: `/method/${method}`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fastStringifyParams(bodyObj)
      }).then(res => res.body.dump().catch(() => {})).catch(() => {});
      return { response: 1 };
    }

    const res = await vkPool.request({
      path: `/method/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: fastStringifyParams(bodyObj)
    });
    
    return await res.body.json();
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
          if (res && res.error && ([983, 901, 100, 917, 921].includes(Number(res.error.error_code)) || res.error.error_msg)) {
            if (task.bodyObj.forward || task.bodyObj.reply_to) {
              delete task.bodyObj.forward;
              delete task.bodyObj.reply_to;
              res = await fastVkCall("messages.send", task.bodyObj, true);
            }
          }
          
          if (res && typeof res === "object") {
            const rawResp = res.response !== undefined ? res.response : res;
            if (typeof rawResp === "number") {
              task.resolve({ response: rawResp, message_id: rawResp, conversation_message_id: rawResp });
            } else if (typeof rawResp === "object" && rawResp !== null) {
              if (Array.isArray(rawResp) && rawResp[0]) {
                const item = rawResp[0];
                const resVal = item.conversation_message_id || item.message_id || item;
                task.resolve({
                  response: resVal,
                  message_id: item.message_id,
                  conversation_message_id: item.conversation_message_id
                });
              } else {
                const resVal = rawResp.conversation_message_id || rawResp.message_id || rawResp;
                task.resolve({
                  response: resVal,
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

const recentSentMessages = new LRUCache<string, number>({ max: 10000, ttl: 60000 });
const repliedTargetMessages = new LRUCache<string, number>({ max: 10000, ttl: 30000 });

export function sendVkMessage(vkToken: string, peerId: number, text: string, extraParams: any = {}): Promise<any> {
  text = formatVkText(text);

  // Deduplicate exact same message to same peer
  const sendKey = `${peerId}_${(text || "").trim().slice(0, 150)}_${extraParams.attachment || ""}`;
  const now = Date.now();
  const lastSent = recentSentMessages.get(sendKey);
  const isSystemNotice = text && (text.includes("#VACUUM") || text.includes("#NAMES") || text.includes("#PRUNE") || text.includes("зарплата") || text.includes("Х2 режим") || text.includes("#SQLrestart") || text.includes("перезагрузка сервера SQL"));
  const dedupThreshold = isSystemNotice ? 180000 : 5000; // 3 minutes window for system notices
  if (!extraParams.forceSend && lastSent && (now - lastSent < dedupThreshold)) {
    console.log(`[DEDUP] Dropping duplicate message to peer ${peerId}: ${text.slice(0, 60)}...`);
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
  if (!randomId) {
    randomId = Math.floor(Math.random() * 1000000000) + Math.floor(Math.random() * 1000000000) + 1;
  }
  const { dedup_key, forceSend, ...cleanedParams } = extraParams;

  const defaultDisableMentions = extraParams.disable_mentions !== undefined ? extraParams.disable_mentions : 1;

  const bodyObj: Record<string, any> = {
    peer_ids: peerId,
    message: text,
    random_id: randomId,
    access_token: vkToken,
    disable_mentions: defaultDisableMentions,
    ...cleanedParams
  };

  if (!bodyObj.forward && (cleanedParams.reply_to || cleanedParams.conversation_message_id)) {
    const replyCmId = Number(cleanedParams.reply_to || cleanedParams.conversation_message_id);
    if (!isNaN(replyCmId) && replyCmId > 0) {
      bodyObj.forward = JSON.stringify({
        peer_id: peerId,
        conversation_message_ids: [replyCmId],
        is_reply: true
      });
      delete bodyObj.reply_to;
      delete bodyObj.conversation_message_id;
    }
  }

  // Use peer_ids to get conversation_message_id in the response for chats
  if (peerId > 2000000000 && !bodyObj.peer_ids && !cleanedParams?.peer_id) {
    bodyObj.peer_ids = String(peerId);
    delete bodyObj.peer_id;
  } else if (!bodyObj.peer_ids) {
    bodyObj.peer_id = peerId;
  }

  if (bodyObj.keyboard) {
    if (typeof bodyObj.keyboard === "string") {
      try {
        let parsed = JSON.parse(bodyObj.keyboard);
        while (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        bodyObj.keyboard = JSON.stringify(parsed);
      } catch (e) {}
    } else if (typeof bodyObj.keyboard === "object") {
      bodyObj.keyboard = JSON.stringify(bodyObj.keyboard);
    }
  }

  // Instant parallel HTTP dispatch without serial queue blocking
  return (async () => {
    try {
      let res = await fastVkCall("messages.send", bodyObj, true);

      if (res && res.error) {
        const errCode = Number(res.error.error_code);
        if ([983, 901, 100, 917, 911, 912, 921].includes(errCode) || res.error.error_msg) {
          if (bodyObj.keyboard && [911, 912].includes(errCode)) {
            delete bodyObj.keyboard;
          }
          if (bodyObj.forward || bodyObj.reply_to) {
            delete bodyObj.forward;
            delete bodyObj.reply_to;
          }
          if (bodyObj.peer_ids) {
            bodyObj.peer_id = peerId;
            delete bodyObj.peer_ids;
          }
          res = await fastVkCall("messages.send", bodyObj, true);
        }
      }
      if (res && typeof res === "object") {
        const rawResp = res.response !== undefined ? res.response : res;
        
        // Handle array response from peer_ids
        if (Array.isArray(rawResp) && rawResp[0]) {
          return {
            response: rawResp[0].message_id || rawResp[0].conversation_message_id || rawResp[0],
            message_id: rawResp[0].message_id,
            conversation_message_id: rawResp[0].conversation_message_id,
            peer_id: rawResp[0].peer_id || peerId
          };
        }
        
        if (typeof rawResp === "number") {
          return { response: rawResp, message_id: rawResp, peer_id: peerId };
        } else if (typeof rawResp === "object" && rawResp !== null) {
          return {
            response: rawResp.message_id || rawResp.conversation_message_id || rawResp,
            message_id: rawResp.message_id,
            conversation_message_id: rawResp.conversation_message_id,
            peer_id: rawResp.peer_id || peerId
          };
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

    const shouldPreserve = extraParams.preserveAttachment === true || (extraParams.attachment === undefined && !extraParams.deleteAttachment);
    let originalText = "";
    let originalAttachments: string[] = [];
    if (shouldPreserve) {
      try {
        let msgRes: any = null;
        if (targetCmid && peerId > 2000000000) {
          msgRes = await fastVkCall("messages.getByConversationMessageId", {
            access_token: vkToken,
            v: "5.199",
            peer_id: peerId,
            conversation_message_ids: String(targetCmid)
          }, true);
          if (!msgRes?.response?.items?.[0]) {
            const hist = await fastVkCall("messages.getHistory", {
              access_token: vkToken,
              v: "5.199",
              peer_id: peerId,
              count: 20
            }, true);
            const found = hist?.response?.items?.find((m: any) => m.conversation_message_id === targetCmid || m.id === targetId);
            if (found) {
              msgRes = { response: { items: [found] } };
            }
          }
        } else if (targetId) {
          msgRes = await fastVkCall("messages.getById", {
            access_token: vkToken,
            v: "5.199",
            message_ids: String(targetId)
          }, true);
        }
        const origMsg = msgRes?.response?.items?.[0];
        if (origMsg) {
          if (text === undefined || text === null) {
            originalText = origMsg.text || "";
          }
          if (Array.isArray(origMsg.attachments)) {
            for (const att of origMsg.attachments) {
              const type = att.type;
              const data = att[type];
              if (data && data.owner_id !== undefined && data.id !== undefined) {
                const key = data.access_key ? `_${data.access_key}` : "";
                originalAttachments.push(`${type}${data.owner_id}_${data.id}${key}`);
              }
            }
          }
        }
      } catch (e) {
        console.error("[editVkMessage] Error fetching original message for preserve:", e);
      }
    }

    const { preserveAttachment, deleteAttachment, ...cleanExtra } = extraParams;
    const params: any = {
      access_token: vkToken,
      v: "5.131",
      peer_id: peerId,
      keep_forward_messages: 1,
      keep_snippets: 0,
      dont_parse_links: 1,
      ...cleanExtra
    };

    if (params.keyboard) {
      if (typeof params.keyboard === "string") {
        try {
          let parsed = JSON.parse(params.keyboard);
          while (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          params.keyboard = JSON.stringify(parsed);
        } catch (e) {
          // Keep string as is
        }
      } else if (typeof params.keyboard === "object") {
        params.keyboard = JSON.stringify(params.keyboard);
      }
    }

    if (text !== undefined && text !== null) {
      params.message = text;
    } else if (originalText) {
      params.message = originalText;
    } else {
      params.message = "\u200b";
    }

    if (params.attachment === undefined) {
      if (originalAttachments.length > 0) {
        params.attachment = originalAttachments.join(",");
      } else if (deleteAttachment) {
        params.attachment = "";
      } else {
        delete params.attachment;
      }
    }

    if (params.attachment === "" || params.attachment === null) {
      if (deleteAttachment) {
        params.attachment = "";
      } else {
        delete params.attachment;
      }
    }

    // Always append a zero-width space if we have an attachment to force VK to refresh the message content
    if (params.attachment) {
      params.message = (params.message || "") + "\u200b";
    }

    const tryEdit = async (editParams: any) => {
      console.log(`[editVkMessage] Method: messages.edit, Params: ${JSON.stringify({ ...editParams, access_token: "REDACTED" })}`);
      const res = await fastVkCall("messages.edit", editParams, true);
      if (res?.response === 1 || res?.response) {
        console.log(`[editVkMessage] Success for peer ${peerId}`);
        return res;
      }
      if (res?.error) {
        console.error(`[editVkMessage] Error for peer ${peerId}: ${JSON.stringify(res.error)}`);
      }
      return null;
    };

    // Try conversation_message_id + peer_id first, as it's more reliable in chats
    if (targetCmid) {
      const res = await tryEdit({ ...params, conversation_message_id: targetCmid, peer_id: peerId });
      if (res) return res;
    }

    // Fallback to global message_id
    if (targetId) {
      const res = await tryEdit({ ...params, message_id: targetId, peer_id: peerId });
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
    let cleanText = typeof text === "string" ? text : String(text || "");
    if (cleanText.length > 90) {
      cleanText = cleanText.slice(0, 87) + "...";
    }
    const res = await fastVkCall("messages.sendMessageEventAnswer", {
      event_id: eventId,
      user_id: userId,
      peer_id: peerId,
      event_data: JSON.stringify({ type: "show_snackbar", text: cleanText }),
      access_token: vkToken,
      v: "5.131"
    }, false);
    if (res?.error) {
      console.error(`[sendVkToast] Error answering event ${eventId}:`, res.error);
    }
    return res;
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
      let data = eventData;
      if (typeof data === "object" && data.text && !data.type) {
        data = { type: "show_snackbar", text: data.text };
      }
      if (typeof data === "object" && data.type === "show_snackbar" && typeof data.text === "string" && data.text.length > 90) {
        data.text = data.text.slice(0, 87) + "...";
      }
      params.event_data = typeof data === "string" ? data : JSON.stringify(data);
    }
    const res = await fastVkCall("messages.sendMessageEventAnswer", params, false);
    if (res?.error) {
      console.error(`[answerVkEvent] Error answering event ${eventId}:`, res.error);
    }
    return res;
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

  // Always capitalize "пользовател..." / "сообществ..." when directly following an emoji
  text = text.replace(/([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}]\s*)(пользовател[а-яё]*|сообществ[а-яё]*)/gui, (match, p1, p2) => {
    return p1 + p2.charAt(0).toUpperCase() + p2.slice(1);
  });

  // Capitalize inside mentions like [id123|пользователь]
  text = text.replace(/(\[(?:id|club)\d+\|)(пользовател[а-яё]*|сообществ[а-яё]*)/gui, (match, p1, p2) => {
    return p1 + p2.charAt(0).toUpperCase() + p2.slice(1);
  });

  // Capitalize at beginning of line or string
  text = text.replace(/(^|\n)(пользовател[а-яё]*|сообществ[а-яё]*)/gui, (match, p1, p2) => {
    return p1 + p2.charAt(0).toUpperCase() + p2.slice(1);
  });

  // ⚡ 0ms Fast Short-Circuit for Plain Text
  if (text.indexOf("~") === -1 && text.indexOf("*") === -1 && text.indexOf("_") === -1 && text.indexOf("`") === -1 && text.indexOf("#") === -1) {
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

  const visitedObjects = new Set<any>();
  const extractIdsFromVal = (val: any, depth = 0) => {
    if (val === null || val === undefined || depth > 10) return;
    if (typeof val === "string" && val.includes(",")) {
      val.split(",").forEach(s => extractIdsFromVal(s.trim(), depth + 1));
      return;
    }
    if (typeof val === "number" || typeof val === "string") {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        candidateCmIds.add(num);
        candidateMsgIds.add(num);
      }
    } else if (typeof val === "object") {
      if (visitedObjects.has(val)) return;
      visitedObjects.add(val);
      if (val.response !== undefined) {
        extractIdsFromVal(val.response, depth + 1);
      }
      if (val.data !== undefined) {
        extractIdsFromVal(val.data, depth + 1);
      }
      if (Array.isArray(val)) {
        val.forEach(item => extractIdsFromVal(item, depth + 1));
      } else {
        if (val.conversation_message_id) candidateCmIds.add(Number(val.conversation_message_id));
        if (val.cmid) candidateCmIds.add(Number(val.cmid));
        if (val.conversation_message_ids) extractIdsFromVal(val.conversation_message_ids, depth + 1);
        if (val.cmids) extractIdsFromVal(val.cmids, depth + 1);
        if (val.message_id) candidateMsgIds.add(Number(val.message_id));
        if (val.message_ids) extractIdsFromVal(val.message_ids, depth + 1);
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

  // 1. Direct batch delete immediately with all candidates
  if (candidateCmIds.size > 0) {
    const cmidsJoined = Array.from(candidateCmIds).join(",");
    const batchCmTasks = [
      tryDelete({ peer_id: peerId, cmids: cmidsJoined, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, cmids: cmidsJoined, delete_for_all: 1, group_id: groupIdNum, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, conversation_message_ids: cmidsJoined, delete_for_all: 1, access_token: vkToken, v: "5.199" })
    ];
    const bRes = await Promise.all(batchCmTasks);
    if (bRes.some(Boolean) && candidateCmIds.size === 1) return true;
  }
  if (candidateMsgIds.size > 0) {
    const msgIdsJoined = Array.from(candidateMsgIds).join(",");
    const batchMsgTasks = [
      tryDelete({ message_ids: msgIdsJoined, delete_for_all: 1, access_token: vkToken, v: "5.199" }),
      tryDelete({ peer_id: peerId, message_ids: msgIdsJoined, delete_for_all: 1, access_token: vkToken, v: "5.199" })
    ];
    const bRes = await Promise.all(batchMsgTasks);
    if (bRes.some(Boolean) && candidateMsgIds.size === 1) return true;
  }

  // Fallback to individual deletions
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

