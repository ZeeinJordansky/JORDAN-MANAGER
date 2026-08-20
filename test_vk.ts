import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.getByConversationMessageId", {
    params: {
      access_token: process.env.VK_TOKEN,
      v: "5.199",
      peer_id: 2000000001,
      conversation_message_ids: "1"
    }
  });
  console.log(res.data);
}
test();
