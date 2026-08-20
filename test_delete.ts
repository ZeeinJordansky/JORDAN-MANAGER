import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
async function test() {
  const res = await axios.get("https://api.vk.com/method/messages.delete", {
    params: {
      access_token: process.env.VK_TOKEN,
      v: "5.199",
      peer_id: 2000000001,
      cmids: "1",
      delete_for_all: 1
    }
  });
  console.log(JSON.stringify(res.data, null, 2));
}
test();
