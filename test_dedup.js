function getEventDeduplicationKeys(payload) {
  if (!payload) return [];
  const keys = new Set();
  const type = payload.type;
  if (type === "message_new" || type === "message_reply") {
    const msg = payload.object?.message || payload.object;
    if (msg) {
      if (msg.peer_id && msg.conversation_message_id) {
        keys.add(`msg_${msg.peer_id}_${msg.conversation_message_id}`);
      }
      if (msg.id && Number(msg.id) > 0) {
        keys.add(`msg_id_${msg.id}`);
      }
      if (msg.peer_id && msg.from_id && msg.date) {
        keys.add(`msg_${msg.peer_id}_${msg.from_id}_${msg.date}`);
      }
    }
  }
  return Array.from(keys);
}
console.log(getEventDeduplicationKeys({ type: "message_new", object: { message: { peer_id: 1, conversation_message_id: 2, from_id: 3, date: 4 } } }));
