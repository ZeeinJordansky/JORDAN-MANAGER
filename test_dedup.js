const payload1 = {
  "type": "message_new",
  "event_id": "webhook_event_1",
  "object": {
    "message": {
      "id": 100,
      "peer_id": 2000000001,
      "conversation_message_id": 1234
    }
  }
};
const payload2 = {
  "type": "message_new",
  "object": {
    "message": {
      "id": 100,
      "peer_id": 2000000001,
      "conversation_message_id": 1234
    }
  }
};

function getEventDeduplicationKey(payload) {
  if (!payload) return null;

  if (payload.type === "message_new" || payload.type === "message_reply") {
    const msg = payload.object?.message || payload.object;
    if (msg) {
      if (msg.conversation_message_id && msg.peer_id) {
        return `msg_${msg.peer_id}_${msg.conversation_message_id}`;
      }
      if (msg.id && msg.id > 0) {
        return `msg_id_${msg.id}`;
      }
    }
  }
  return null;
}

console.log("Webhook:", getEventDeduplicationKey(payload1));
console.log("LongPoll:", getEventDeduplicationKey(payload2));
