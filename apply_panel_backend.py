import re

with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

# Define boundaries
start_marker = '// ==========================================\n// Dashboard API Endpoints for Control Panel\n// =========================================='
end_marker = 'async function startServer()'

start_idx = code.find(start_marker)
end_idx = code.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_panel_api = """// ==========================================
// New Control Panel API
// ==========================================

export const panelFailedLogins = new Map<string, { attempts: number, lockUntil: number }>();
export const panelSessions = new Map<string, { token: string; vkId: number; login: string; isRoot: boolean; ip: string; provider: string; city: string; loginTime: number; lastActive: number; expiresAt: number }>();
const PANEL_OWNER_ID = 1115715881;
const PANEL_ROOT_LOGIN = "1231285835859344248";
const PANEL_ROOT_PASS = "1434848392948ё2372358";

function getClientIp(req: any) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
}

app.post("/api/panel/auth/step1", express.json(), async (req, res) => {
  const { vkId, captchaResponse } = req.body;
  if (!vkId || !/^\d+$/.test(vkId)) return res.status(400).json({ error: "VK ID должен состоять только из цифр." });
  if (!captchaResponse) return res.status(400).json({ error: "Капча не пройдена." });

  const ip = getClientIp(req);
  let provider = "Unknown", city = "Unknown";
  try {
    const geoRes = await axios.get(`http://ip-api.com/json/${ip}?lang=ru`, { timeout: 2000 });
    if (geoRes.data && geoRes.data.status === 'success') {
      provider = geoRes.data.isp || "Unknown";
      city = geoRes.data.city || "Unknown";
    }
  } catch(e) {}

  res.json({ success: true, requiresCredentials: true, ip, city, provider });
});

app.post("/api/panel/auth/login", express.json(), async (req, res) => {
  const { vkId, login, password } = req.body;
  if (!vkId || !login || !password) return res.status(400).json({ error: "Не все поля заполнены." });

  const ip = getClientIp(req);
  const failData = panelFailedLogins.get(ip);
  if (failData && failData.lockUntil > Date.now()) {
    return res.status(403).json({ error: "IP временно заблокирован за превышение попыток входа. Попробуйте позже." });
  }

  // Send notification about login attempt
  try {
    const msg = `...::Управление панелью управления::...\\n\\nПользователь ${login} пытается войти в панель управления.`;
    const keyboard = {
      inline: true,
      buttons: [
        [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_revoke_attempt", login, ip }), label: "Завершить сессию" }, color: "negative" } ],
        [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_del_user_prompt", login }), label: "Удалить пользователя" }, color: "negative" } ]
      ]
    };
    await sendVkMessage(VK_TOKEN, PANEL_OWNER_ID, msg, { keyboard: JSON.stringify(keyboard) });
  } catch(e) {}

  let isRoot = false;
  let authSuccess = false;

  if (login === PANEL_ROOT_LOGIN && password === PANEL_ROOT_PASS) {
    isRoot = true;
    authSuccess = true;
  } else {
    // Check in firestore panel_users
    try {
      const snap = await firestoreDb.collection("panel_users").where("login", "==", login).limit(1).get();
      if (!snap.empty) {
        const u = snap.docs[0].data();
        if (u.password === password) {
          authSuccess = true;
        }
      }
    } catch(e) {}
  }

  if (!authSuccess) {
    const fd = panelFailedLogins.get(ip) || { attempts: 0, lockUntil: 0 };
    fd.attempts++;
    if (fd.attempts >= 3) {
      fd.lockUntil = Date.now() + 3 * 3600 * 1000; // 3 hours block
    }
    panelFailedLogins.set(ip, fd);
    return res.status(401).json({ error: "Неверный логин или пароль." });
  }

  // Auth Success
  if (failData) panelFailedLogins.delete(ip);

  const token = "ptok_" + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  
  let provider = "Unknown", city = "Unknown";
  try {
    const geoRes = await axios.get(`http://ip-api.com/json/${ip}?lang=ru`, { timeout: 2000 });
    if (geoRes.data && geoRes.data.status === 'success') {
      provider = geoRes.data.isp || "Unknown";
      city = geoRes.data.city || "Unknown";
    }
  } catch(e) {}

  const session = {
    token, vkId: parseInt(vkId), login, isRoot, ip, provider, city,
    loginTime: Math.floor(Date.now() / 1000),
    lastActive: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600 // 60 mins
  };
  panelSessions.set(token, session);

  // Send success notification
  try {
    const msg = `...::Управление панелью управления::...\\n\\nПользователь ${login} вошёл(-ла) в панель управления.`;
    const keyboard = {
      inline: true,
      buttons: [
        [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_revoke_session", login, token }), label: "Завершить сессию" }, color: "negative" } ],
        [ { action: { type: "callback", payload: JSON.stringify({ cmd: "p_del_user_prompt", login }), label: "Удалить пользователя" }, color: "negative" } ]
      ]
    };
    await sendVkMessage(VK_TOKEN, PANEL_OWNER_ID, msg, { keyboard: JSON.stringify(keyboard) });
  } catch(e) {}

  res.json({ success: true, token, isRoot, login, ip, provider, city, expiresAt: session.expiresAt });
});

function getPanelSession(req: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  const session = panelSessions.get(token);
  if (session) {
    if (session.expiresAt * 1000 < Date.now()) {
      panelSessions.delete(token);
      return null;
    }
    const currentIp = getClientIp(req);
    if (session.ip !== currentIp) {
      panelSessions.delete(token); // IP changed, force re-login
      return null;
    }
    session.lastActive = Math.floor(Date.now() / 1000);
    return session;
  }
  return null;
}

app.get("/api/panel/auth/session", (req, res) => {
  const session = getPanelSession(req);
  if (!session) return res.status(401).json({ error: "Session invalid or expired" });
  res.json({ valid: true, session, login: session.login, isRoot: session.isRoot });
});

app.post("/api/panel/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token) panelSessions.delete(token);
  res.json({ success: true });
});

// Require Auth Middleware equivalent
function requirePanelAuth(req: any, res: any, next: any) {
  const session = getPanelSession(req);
  if (!session) return res.status(401).json({ error: "Неавторизован. Требуется вход." });
  req.panelSession = session;
  next();
}

app.get("/api/panel/dashboard/stats", requirePanelAuth, async (req: any, res: any) => {
  try {
    const allUsers = await getAllUsers();
    let totalEconomy = 0;
    let activeChatMutesCount = 0;
    let usersWithActiveWarnsCount = 0;
    let usersInActiveGbanCount = 0;
    let usersInBotBlacklistCount = 0;

    let cashTotal = 0;
    let bankTotal = 0;
    
    allUsers.forEach(u => {
      totalEconomy += (u.balance || 0) + (u.bankBalance || 0);
      cashTotal += (u.balance || 0);
      bankTotal += (u.bankBalance || 0);
      
      if (u.warnsCount && u.warnsCount > 0) usersWithActiveWarnsCount++;
      if (u.isGameBanned) usersInActiveGbanCount++;
      if (u.isBlacklisted) usersInBotBlacklistCount++;
    });

    const mutesSnap = await firestoreDb.collection("mutes").get();
    activeChatMutesCount = mutesSnap.size;

    let clansTotal = 0;
    for (const clan of clanCache.values()) {
      clansTotal += (clan.treasury || 0);
      totalEconomy += (clan.treasury || 0);
    }
    
    const chatsSnap = await firestoreDb.collection("chats").get();

    const topUsers = allUsers.map(u => ({ vkId: u.userId, name: u.fullName || u.nick || "User", totalWealth: (u.balance || 0) + (u.bankBalance || 0) }))
      .sort((a,b) => b.totalWealth - a.totalWealth)
      .slice(0, 5);

    res.json({
      totalEconomy,
      activeChatMutesCount,
      usersWithActiveMuteCount: activeChatMutesCount, // roughly
      usersWithActiveWarnsCount,
      usersInActiveGbanCount,
      usersInBotBlacklistCount,
      economyBreakdown: {
        cashTotal, bankTotal, clansTotal, topUsers
      },
      totalUsersCount: allUsers.length,
      totalChatsCount: chatsSnap.size,
      uptimeSeconds: process.uptime()
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Root-only endpoints
function requireRoot(req: any, res: any, next: any) {
  if (!req.panelSession.isRoot) return res.status(403).json({ error: "Доступно только главному аккаунту." });
  next();
}

app.get("/api/panel/sessions", requirePanelAuth, requireRoot, (req: any, res: any) => {
  const sessions = Array.from(panelSessions.values()).map(s => ({
    id: s.token,
    login: s.login,
    ip: s.ip,
    provider: s.provider,
    city: s.city,
    loginTime: s.loginTime,
    lastActive: s.lastActive,
    expiresAt: s.expiresAt,
    isRoot: s.isRoot,
    isCurrent: s.token === req.panelSession.token
  }));
  res.json(sessions);
});

app.post("/api/panel/sessions/revoke", express.json(), requirePanelAuth, requireRoot, (req: any, res: any) => {
  const { sessionId } = req.body;
  if (panelSessions.has(sessionId)) {
    panelSessions.delete(sessionId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Сессия не найдена" });
  }
});

"""

new_code = code[:start_idx] + new_panel_api + '\n' + code[end_idx:]

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Saved server.ts successfully!")

extra_endpoints = """
// Get Panel Users (Root only)
app.get("/api/panel/users", requirePanelAuth, requireRoot, async (req: any, res: any) => {
  try {
    const snap = await firestoreDb.collection("panel_users").get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Also include root conceptually
    users.unshift({ id: "root", login: PANEL_ROOT_LOGIN, role: "root", createdAt: 0 });
    res.json(users);
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

app.post("/api/panel/users/create", express.json(), requirePanelAuth, requireRoot, async (req: any, res: any) => {
  const { login, password, role } = req.body;
  if (!login || !password || !role) return res.status(400).json({ error: "Не все поля" });
  try {
    await firestoreDb.collection("panel_users").doc(login).set({ login, password, role, createdAt: Date.now() });
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

app.post("/api/panel/users/delete", express.json(), requirePanelAuth, requireRoot, async (req: any, res: any) => {
  const { userId } = req.body;
  if (userId === "root" || userId === PANEL_ROOT_LOGIN) return res.status(403).json({ error: "Нельзя удалить root" });
  try {
    await firestoreDb.collection("panel_users").doc(userId).delete();
    res.json({ success: true });
  } catch(e: any) { res.status(500).json({error: e.message}); }
});

// Chats management
app.get("/api/panel/chats", requirePanelAuth, async (req: any, res: any) => {
  try {
    const snap = await firestoreDb.collection("chats").limit(100).get();
    const chats = snap.docs.map(d => ({ peerId: Number(d.id), ...d.data() }));
    res.json(chats);
  } catch(e: any) { res.status(500).json({error: e.message}); }
});
"""

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()
    
# Replace the old end_marker (which was async function startServer()) by inserting before it
# wait, the first python script already replaced the whole block.
