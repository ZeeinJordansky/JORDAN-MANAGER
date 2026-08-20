import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.send", {
    params: {
      access_token: process.env.VK_TOKEN,
      v: "5.199",
      peer_id: 2000000001,
      message: "Test message peer_id",
      random_id: 0
    }
  });
  console.log(JSON.stringify(res.data, null, 2));
}
test();
