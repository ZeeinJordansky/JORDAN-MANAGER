import axios from "axios";
import https from "https";
import russianWordsJson from "./russianWords.json";

const vkApi = axios.create({
  baseURL: "https://api.vk.com/method/",
  timeout: 8000,
  httpsAgent: new https.Agent({ 
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 100,
    maxFreeSockets: 25,
  }),
});

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

export async function sendVkMessage(vkToken: string, peerId: number, text: string, extraParams: any = {}) {
  try {
    let randomId = extraParams.random_id;
    if (!randomId) {
      if (extraParams.dedup_key) {
        randomId = generateDeterministicRandomId(String(extraParams.dedup_key));
      } else {
        randomId = Math.floor(Math.random() * 1000000000);
      }
    }
    const { dedup_key, ...cleanedParams } = extraParams;

    const params: any = {
      peer_id: peerId,
      message: text,
      random_id: randomId,
      access_token: vkToken,
      v: "5.199",
      disable_mentions: 1,
      ...cleanedParams
    };

    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
    }

    const res = await vkApi.post("messages.send", searchParams);
    if (res.data?.error) {
      console.error(`[VK API ERROR] messages.send for peer ${peerId}:`, res.data.error);
    }
    return res.data;
  } catch (e: any) {
    console.error("sendVkMessage network/request error:", e.message);
    return null;
  }
}

export async function editVkMessage(vkToken: string, peerId: number, idOrCmId?: number, text?: string, extraParams: any = {}) {
  try {
    const params: any = {
      peer_id: peerId,
      access_token: vkToken,
      v: "5.199",
      disable_mentions: 1,
      keep_forward_messages: 1,
      keep_snippets: 1,
      ...extraParams
    };
    if (extraParams.conversation_message_id) {
      params.conversation_message_id = extraParams.conversation_message_id;
      delete params.message_id;
    } else if (extraParams.message_id) {
      params.message_id = extraParams.message_id;
      delete params.conversation_message_id;
    } else if (idOrCmId) {
      if (peerId >= 2000000000) {
        params.conversation_message_id = idOrCmId;
        delete params.message_id;
      } else {
        params.message_id = idOrCmId;
        delete params.conversation_message_id;
      }
    }
    if (text !== undefined && text !== null && text !== "") {
      params.message = text;
    } else if (!params.message && !params.attachment) {
      try {
        const formatAttachments = (attachments: any[]) => attachments.map((a: any) => {
          if (a.photo) return `photo${a.photo.owner_id}_${a.photo.id}${a.photo.access_key ? '_' + a.photo.access_key : ''}`;
          if (a.video) return `video${a.video.owner_id}_${a.video.id}${a.video.access_key ? '_' + a.video.access_key : ''}`;
          if (a.audio) return `audio${a.audio.owner_id}_${a.audio.id}`;
          if (a.doc) return `doc${a.doc.owner_id}_${a.doc.id}${a.doc.access_key ? '_' + a.doc.access_key : ''}`;
          return "";
        }).filter(x => x).join(",");

        if (params.conversation_message_id) {
          const getRes = await vkApi.get("messages.getByConversationMessageId", {
            params: {
              access_token: vkToken,
              v: "5.199",
              peer_id: peerId,
              conversation_message_ids: params.conversation_message_id
            }
          });
          const items = getRes.data?.response?.items;
          if (items && items.length > 0) {
            if (items[0].text !== undefined) params.message = items[0].text;
            if (items[0].attachments && items[0].attachments.length > 0) {
              params.attachment = formatAttachments(items[0].attachments);
            }
          }
        } else if (params.message_id) {
          const getRes = await vkApi.get("messages.getById", {
            params: {
              access_token: vkToken,
              v: "5.199",
              message_ids: params.message_id
            }
          });
          const items = getRes.data?.response?.items;
          if (items && items.length > 0) {
            if (items[0].text !== undefined) params.message = items[0].text;
            if (items[0].attachments && items[0].attachments.length > 0) {
              params.attachment = formatAttachments(items[0].attachments);
            }
          }
        }
      } catch (e) {}
    }

    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
    }

    const res = await vkApi.post("messages.edit", searchParams);
    if (res.data?.error) {
      console.error(`[VK API ERROR] messages.edit for peer ${peerId}:`, res.data.error);
    }
    return res.data;
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

export async function deleteVkMessage(vkToken: string, peerId: number, msgIdOrObj: any) {
  if (!msgIdOrObj) return false;

  const tryDelete = async (params: any) => {
    try {
      const res = await vkApi.get("messages.delete", { params });
      if (res.data?.response === 1) return true;
      if (res.data?.response && typeof res.data.response === "object") {
        const r = res.data.response;
        const items = Array.isArray(r) ? r : Object.values(r);
        if (items.length > 0) {
           return items.some((item: any) => item && !item.error);
        }
      }
      return false;
    } catch (e: any) {
      return false;
    }
  };

  const baseParams = { peer_id: peerId, delete_for_all: 1, access_token: vkToken, v: "5.199" };

  if (typeof msgIdOrObj === "number" || typeof msgIdOrObj === "string") {
    const ids = String(msgIdOrObj).split(",").map(x => x.trim()).filter(x => x && !isNaN(Number(x)));
    if (ids.length > 0) {
      const idsStr = ids.join(",");
      let success = false;
      if (peerId >= 2000000000) {
        success = await tryDelete({ ...baseParams, peer_id: peerId, cmids: idsStr, conversation_message_ids: idsStr });
      }
      if (!success) {
        success = await tryDelete({ ...baseParams, message_ids: idsStr });
      }
      if (!success && peerId >= 2000000000 && ids.length === 1) {
        // Fallback: lookup cmid
        try {
          const getRes = await vkApi.get("messages.getById", { params: { access_token: vkToken, v: "5.199", message_ids: idsStr } });
          const fetchedCmId = getRes.data?.response?.items?.[0]?.conversation_message_id;
          if (fetchedCmId) {
            success = await tryDelete({ ...baseParams, cmids: String(fetchedCmId), conversation_message_ids: String(fetchedCmId) });
            if (success) return true;
          }
        } catch (e) {}
        success = await tryDelete({ ...baseParams, cmids: idsStr, conversation_message_ids: idsStr });
      }
      return success;
    }
  }

  let cmId: number | undefined;
  let msgId: number | undefined;

  if (typeof msgIdOrObj === "object") {
    const resp = msgIdOrObj.response !== undefined ? msgIdOrObj.response : msgIdOrObj;
    if (Array.isArray(resp) && resp.length > 0) {
      const first = resp[0];
      if (typeof first === "object" && first !== null) {
        cmId = Number(first.conversation_message_id) || undefined;
        msgId = Number(first.message_id) || undefined;
      } else if (typeof first === "number" && first > 0) {
        if (peerId >= 2000000000) cmId = first;
        else msgId = first;
      }
    } else if (typeof resp === "object" && resp !== null) {
      cmId = Number(resp.conversation_message_id) || undefined;
      msgId = Number(resp.message_id) || undefined;
    } else if (typeof resp === "number" && resp > 0) {
      if (peerId >= 2000000000) cmId = resp;
      else msgId = resp;
    }
  }

  if (msgId && msgId > 0) {
      let success = await tryDelete({ ...baseParams, message_ids: String(msgId) });
      if (!success && peerId >= 2000000000) {
        try {
          const getRes = await vkApi.get("messages.getById", { params: { access_token: vkToken, v: "5.199", message_ids: String(msgId) } });
          const fetchedCmId = getRes.data?.response?.items?.[0]?.conversation_message_id;
          if (fetchedCmId) {
            success = await tryDelete({ ...baseParams, cmids: String(fetchedCmId), conversation_message_ids: String(fetchedCmId) });
          }
        } catch (e) {}
      }
      if (success) return true;
  }
  if (cmId && cmId > 0 && peerId >= 2000000000) {
      return await tryDelete({ ...baseParams, cmids: String(cmId), conversation_message_ids: String(cmId) });
  }

  return false;
}

