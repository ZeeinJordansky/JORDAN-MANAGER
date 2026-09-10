import sys

def apply_log_fix():
    with open("server.ts", "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add log execution variables and function
    orig1 = """    }

    const sendResponse = async (responseText: string, extraParams: any = {}) => {"""
    repl1 = """    }

    let doCommandLog: (() => Promise<void>) | null = null;
    let commandLogExecuted = false;

    const executeCommandLogOnce = async () => {
      if (doCommandLog && !commandLogExecuted) {
        commandLogExecuted = true;
        const fn = doCommandLog;
        doCommandLog = null;
        await fn().catch(()=>{});
      }
    };

    const sendResponse = async (responseText: string, extraParams: any = {}) => {"""
    
    if orig1 in content:
        content = content.replace(orig1, repl1)
    else:
        print("Failed to find orig1")
    
    # 2. Add execution of log inside sendResponse
    orig2 = """      const res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });
      try {"""
    repl2 = """      const res = await sendVkMessage(VK_TOKEN, peerId, responseText, { ...replyParams, ...rest });
      executeCommandLogOnce();
      try {"""
    if orig2 in content:
        content = content.replace(orig2, repl2)
    else:
        print("Failed to find orig2")
    
    # 3. Modify setTimeout to doCommandLog
    orig3 = """      // Log the command in chat 10 (only for actual users, ignoring communities, mask profanity, and for ALL commands)
      if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {
        setTimeout(async () => {
          try {"""
    repl3 = """      // Log the command in chat 10 (only for actual users, ignoring communities, mask profanity, and for ALL commands)
      if (userId > 0 && /^[\/+!\.,]/.test(rawCmd)) {
        doCommandLog = async () => {
          try {"""
    if orig3 in content:
        content = content.replace(orig3, repl3)
    else:
        print("Failed to find orig3")
    
    # 4. End of setTimeout -> end of function
    orig4 = """          });
        }
      } catch (e) { console.error("Async log error:", e); }
        }, 1000);
      }"""
    repl4 = """          });
        }
      } catch (e) { console.error("Async log error:", e); }
        };
        setTimeout(executeCommandLogOnce, 2500);
      }"""
    if orig4 in content:
        content = content.replace(orig4, repl4)
    else:
        print("Failed to find orig4")

    # 5. Speed up bot
    orig5 = """      const cached = userCache.get(userId);
      if (cached && cached.nick && !cached.nick.startsWith("User")) {
        fullName = cached.nick;"""
    repl5 = """      const cached = userCache.get(userId);
      if (cached && (cached.fullName || cached.nick) && !(cached.fullName || cached.nick).startsWith("User")) {
        fullName = cached.fullName || cached.nick;"""
    if orig5 in content:
        content = content.replace(orig5, repl5)
    else:
        print("Failed to find orig5")

    with open("server.ts", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Patched logging and API delay.")

apply_log_fix()
