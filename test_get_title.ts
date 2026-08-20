import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.getConversationsById", {
    params: {
      access_token: process.env.VK_TOKEN,
      v: "5.199",
      peer_ids: 2000000001
    }
  });
  console.log(JSON.stringify(res.data, null, 2));
}
test();
