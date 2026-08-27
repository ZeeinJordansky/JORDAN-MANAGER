import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

more_endpoints = """
app.post("/api/panel/economy/mass-currency", express.json(), requirePanelAuth, requireRoot, async (req: any, res: any) => {
  const { action, amount } = req.body; // 'give' | 'take'
  if (!amount || typeof amount !== 'number') return res.status(400).json({ error: "Неверная сумма" });
  try {
    const all = await getAllUsers();
    let count = 0;
    for (const u of all) {
      const current = u.balance || 0;
      let newBal = current;
      if (action === 'give') newBal += amount;
      if (action === 'take') newBal = Math.max(0, newBal - amount);
      if (newBal !== current) {
        await updateUser(u.userId, { balance: newBal });
        count++;
      }
    }
    res.json({ success: true, affectedCount: count });
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

app.post("/api/panel/broadcasts/send", express.json(), requirePanelAuth, requireRoot, async (req: any, res: any) => {
  const { title, text, target } = req.body;
  if (!text) return res.status(400).json({ error: "Текст обязателен" });
  try {
    let sentCount = 0;
    const msg = `🔔 РАССЫЛКА: ${title || 'Уведомление'}\\n\\n${text}`;
    if (target === 'all_chats') {
      const snap = await firestoreDb.collection("chats").get();
      for (const d of snap.docs) {
        try { await sendVkMessage(VK_TOKEN, Number(d.id), msg); sentCount++; await new Promise(r=>setTimeout(r,50)); } catch(e){}
      }
    } else {
      const all = await getAllUsers();
      for (const u of all) {
        try { await sendVkMessage(VK_TOKEN, u.userId, msg); sentCount++; await new Promise(r=>setTimeout(r,50)); } catch(e){}
      }
    }
    // Log broadcast
    await firestoreDb.collection("panel_broadcasts").add({ title, text, target, sentCount, timestamp: Date.now() });
    res.json({ success: true, sentCount });
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

app.get("/api/panel/bot-users/search", requirePanelAuth, async (req: any, res: any) => {
  const q = (req.query.q || "").toLowerCase();
  try {
    const all = await getAllUsers();
    const results = all.filter(u => 
      String(u.userId) === q || 
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.nick && u.nick.toLowerCase().includes(q))
    ).slice(0, 50);
    res.json(results);
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

"""

# Insert before startServer
end_marker = 'async function startServer()'
idx = code.find(end_marker)
new_code = code[:idx] + more_endpoints + '\n' + code[idx:]

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Added more endpoints")
