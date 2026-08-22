import axios from "axios";
const VK_TOKEN = process.env.VK_TOKEN;
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.getConversationMembers", {
    params: { peer_id: 2000000001, access_token: VK_TOKEN, v: "5.199" }
  });
  console.log(res.data.response.profiles.map(p => ({ id: p.id, d: p.deactivated })).filter(p => p.d));
}
test().catch(console.error);
