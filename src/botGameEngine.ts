import axios from "axios";
import https from "https";
import http from "http";
import dns from "dns";
import russianWordsJson from "./russianWords.json";

if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (e) {}
}

const fastHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 300000,
  maxSockets: 1024,
  maxFreeSockets: 256,
  timeout: 6000,
  scheduling: "fifo"
});

// TLS Multi-Socket Warmup & Hot Connection Pool (Mega-Accelerator)
// Keeps multiple TCP/TLS sockets continuously warm to eliminate DNS and SSL handshake latency
function warmSockets() {
  for (let i = 0; i < 3; i++) {
    const req = https.request({
      hostname: 'api.vk.com',
      path: '/method/utils.getServerTime?v=5.199&access_token=1', 
      method: 'GET',
      agent: fastHttpsAgent
    }, (res) => {
      res.on('data', () => {}); 
    });
    req.on('socket', (socket) => {
      socket.setNoDelay(true);
    });
    req.on('error', () => {});
    req.end();
  }
}
setInterval(warmSockets, 8000); // Every 8s
warmSockets();

const fastHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 120000,
  maxSockets: 512,
  maxFreeSockets: 128,
  timeout: 8000,
  scheduling: "fifo",
  noDelay: true
});

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  timeout: 6000,
  httpsAgent: fastHttpsAgent,
  httpAgent: fastHttpAgent,
});

import querystring from "querystring";

export const CROCODILE_WORDS: string[] = russianWordsJson as string[];
export const RUSSIAN_WORDS: string[] = russianWordsJson as string[];

function generateDeterministicRandomId(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 2147483600) + 1;
}

export function sendVkMessage(vkToken: string, peerId: number, text: string, extraParams: any = {}): Promise<any> {
  return new Promise((resolve) => {
    text = formatVkText(text);
    let randomId = extraParams.random_id;
    if (!randomId) {
      if (extraParams.dedup_key) {
        randomId = generateDeterministicRandomId(String(extraParams.dedup_key));
      } else {
        randomId = (Math.random() * 1000000000) | 0;
      }
    }
    const { dedup_key, ...cleanedParams } = extraParams;

    const bodyObj: Record<string, string | number> = {
      peer_id: peerId,
      message: text,
      random_id: randomId,
      access_token: vkToken,
      v: "5.199",
      disable_mentions: 1
    };

    if (cleanedParams) {
      for (const [k, v] of Object.entries(cleanedParams)) {
        if (k !== "peer_id" && k !== "peer_ids" && v !== undefined && v !== null) {
          bodyObj[k] = typeof v === "object" ? JSON.stringify(v) : (v as string | number);
        }
      }
    }

    const postData = querystring.stringify(bodyObj);
    const req = https.request({
      hostname: 'api.vk.com',
      path: '/method/messages.send',
      method: 'POST',
      agent: fastHttpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ response: 1 });
        }
      });
    });
    
    req.on('socket', (socket) => {
      socket.setNoDelay(true);
    });

    req.on('error', (e) => {
      console.error("sendVkMessage network/request error:", e.message);
      resolve(null);
    });
    
    req.write(postData);
    req.end();
  });
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
        if (peerId > 2000000000) {
          if (!targetCmid) targetCmid = numVal;
        } else {
          if (!targetId) targetId = numVal;
        }
      } else if (typeof idOrCmId === "object" && idOrCmId !== null) {
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

    const params: any = {
      access_token: vkToken,
      v: "5.199",
      peer_id: peerId,
      disable_mentions: 1,
      keep_forward_messages: 1,
      keep_snippets: 1,
      dont_parse_links: 1,
      ...extraParams
    };

    if (text !== undefined && text !== null && text !== "") {
      params.message = text;
    }

    // Only lookup existing message if preserveAttachment is explicitly requested and no attachment provided
    if (extraParams.preserveAttachment === true && extraParams.attachment === undefined) {
      try {
        let existingMsg: any = null;
        if (targetCmid && peerId > 2000000000) {
          const res = await vkApi.post("messages.getByConversationMessageId", new URLSearchParams({
            access_token: vkToken,
            v: "5.199",
            peer_id: String(peerId),
            conversation_message_ids: String(targetCmid)
          }));
          if (res.data?.response?.items?.[0]) {
            existingMsg = res.data.response.items[0];
          }
        } else if (targetId) {
          const res = await vkApi.post("messages.getById", new URLSearchParams({
            access_token: vkToken,
            v: "5.199",
            message_ids: String(targetId)
          }));
          if (res.data?.response?.items?.[0]) {
            existingMsg = res.data.response.items[0];
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

    const tryEdit = async (editParams: any) => {
      try {
        const bodyObj: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(editParams)) {
          if (v !== undefined && v !== null) {
            bodyObj[k] = typeof v === "object" ? JSON.stringify(v) : (v as string | number);
          }
        }
        const res = await vkApi.post("messages.edit", querystring.stringify(bodyObj), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        if (res.data?.response === 1 || res.data?.response) return res.data;
        return null;
      } catch (e) {
        return null;
      }
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
    await vkApi.get("messages.sendMessageEventAnswer", {
      params: {
        event_id: eventId,
        user_id: userId,
        peer_id: peerId,
        event_data: JSON.stringify({ type: "show_snackbar", text }),
        access_token: vkToken,
        v: "5.131"
      }
    });
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
    await vkApi.get("messages.sendMessageEventAnswer", { params });
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

  // 1. Strikethrough ~~text~~ -> convert each character c to c + \u0336
  text = text.replace(/~~([^~]+)~~/g, (_, p1) => {
    return p1.split("").map((c: string) => (c === "\n" ? c : c + "\u0336")).join("");
  });

  // Helper for converting Latin letters and digits to Unicode bold (Sans-Serif Bold)
  // And Cyrillic letters to UPPERCASE as an alternative since Unicode has no Cyrillic bold
  const toBoldLatinDigit = (str: string) => {
    return str.replace(/([A-Za-z0-9А-Яа-яЁё])/g, (c: string) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48));
      return c.toUpperCase(); // For Cyrillic and others, just make it uppercase
    });
  };

  // 2. Bold **text** or __text__ -> convert Latin/digits to unicode bold and Cyrillic to UPPERCASE
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

  return text.trim();
}

export async function deleteVkMessage(vkToken: string, peerId: number, msgIdOrObj: any) {
  if (!msgIdOrObj) return false;

  const tryDelete = async (params: any) => {
    try {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const res = await vkApi.post("messages.delete", searchParams);
      if (res.data?.response === 1) return true;
      if (res.data?.response && typeof res.data.response === "object") {
        const r = res.data.response;
        const items = Array.isArray(r) ? r : Object.values(r);
        if (items.length > 0) {
           return items.some((item: any) => {
             if (typeof item === "number") return item === 1;
             if (typeof item === "object" && item !== null) return !item.error && (item.response === 1 || item.status === 1 || !item.error_code);
             return false;
           });
        }
      }
      return false;
    } catch (e: any) {
      return false;
    }
  };

  const baseParams = { peer_id: peerId, delete_for_all: 1, access_token: vkToken, v: "5.199" };

  const candidateCmIds = new Set<number>();
  const candidateMsgIds = new Set<number>();

  const extractIdsFromVal = (val: any) => {
    if (val === null || val === undefined) return;
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
      if (Array.isArray(val)) {
        val.forEach(item => extractIdsFromVal(item));
      } else {
        if (val.conversation_message_id) candidateCmIds.add(Number(val.conversation_message_id));
        if (val.cmid) candidateCmIds.add(Number(val.cmid));
        if (val.message_id) candidateMsgIds.add(Number(val.message_id));
        if (val.id) candidateMsgIds.add(Number(val.id));
      }
    }
  };

  extractIdsFromVal(msgIdOrObj);

  // 1. If in chat (peerId >= 2000000000), try candidate CMIDs FIRST
  if (peerId >= 2000000000 && candidateCmIds.size > 0) {
    for (const cmid of candidateCmIds) {
      if (!cmid) continue;
      const strCmid = String(cmid);
      let ok = await tryDelete({ ...baseParams, conversation_message_ids: strCmid });
      if (ok) return true;
      ok = await tryDelete({ ...baseParams, cmids: strCmid });
      if (ok) return true;
    }
  }

  // 2. Try candidate MSGIDs
  if (candidateMsgIds.size > 0) {
    for (const msgId of candidateMsgIds) {
      if (!msgId) continue;
      const strMsgId = String(msgId);
      let ok = await tryDelete({ ...baseParams, message_ids: strMsgId });
      if (ok) return true;
      ok = await tryDelete({ peer_id: peerId, message_ids: strMsgId, access_token: vkToken, v: "5.199" });
      if (ok) return true;
    }
  }

  // 3. Fallback CMIDs for non-chat if any
  if (peerId < 2000000000 && candidateCmIds.size > 0) {
    for (const cmid of candidateCmIds) {
      if (!cmid) continue;
      const strCmid = String(cmid);
      let ok = await tryDelete({ ...baseParams, conversation_message_ids: strCmid });
      if (ok) return true;
      ok = await tryDelete({ ...baseParams, cmids: strCmid });
      if (ok) return true;
    }
  }

  // 3. Fallback: check messages.getHistory for chats
  if (peerId >= 2000000000) {
    try {
      const getHistoryRes = await vkApi.get("messages.getHistory", {
        params: { access_token: vkToken, v: "5.199", peer_id: peerId, count: 15 }
      });
      const items = getHistoryRes.data?.response?.items || [];
      for (const item of items) {
        if (!item) continue;
        const matchesMsgId = candidateMsgIds.has(item.id);
        const matchesCmId = item.conversation_message_id && candidateCmIds.has(item.conversation_message_id);
        const matchesWaitText = item.out === 1 && (
          item.text?.includes("обрабатывается") ||
          item.text?.includes("подождите") ||
          item.text?.includes("загружается") ||
          item.text?.includes("генерируется")
        );
        if (matchesMsgId || matchesCmId || matchesWaitText) {
          if (item.id) {
            let ok = await tryDelete({ ...baseParams, message_ids: String(item.id) });
            if (ok) return true;
          }
          if (item.conversation_message_id) {
            let ok = await tryDelete({ ...baseParams, cmids: String(item.conversation_message_id) });
            if (ok) return true;
          }
        }
      }
    } catch (e) {}
  }

  return false;
}

