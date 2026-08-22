import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const VK_TOKEN = process.env.VK_TOKEN;
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.getConversationMembers", {
    params: { peer_id: 2000000001, access_token: VK_TOKEN, v: "5.199" }
  });
  console.log(res.data);
}
test().catch(console.error);
