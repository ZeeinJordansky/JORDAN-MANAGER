const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `async function executeVkUnmute(peerId: number, targetId: number): Promise<{ success: boolean; errorMsg: string }> {`;
const replacement1 = `async function executeVkSetMemberRole(peerId: number, targetId: number, role: "admin" | "member"): Promise<{ success: boolean; errorMsg: string; errorCode: number }> {
  try {
    const res = await fastVkCall("messages.setMemberRole", { access_token: VK_TOKEN, v: "5.199", peer_id: peerId, member_id: targetId, role: role }, true);
    if (res && res.error) {
      return { success: false, errorMsg: res.error.error_msg || "Неизвестная ошибка VK", errorCode: res.error.error_code || -1 };
    }
    if (res && res.response === 1) {
      return { success: true, errorMsg: "", errorCode: 0 };
    }
    return { success: false, errorMsg: "Неизвестный ответ от VK API", errorCode: -1 };
  } catch (err: any) {
    return { success: false, errorMsg: err?.message || String(err), errorCode: -1 };
  }
}

async function executeVkUnmute(peerId: number, targetId: number): Promise<{ success: boolean; errorMsg: string }> {`;

code = code.replace(target1, replacement1);
fs.writeFileSync('server.ts', code);
console.log("executeVkSetMemberRole added.");
