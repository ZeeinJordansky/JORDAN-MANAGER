const axios = require("axios");

async function run() {
  try {
    const res = await axios.get("https://vk.com/foaf.php?id=1");
    const xml = res.data;
    const match = xml.match(/<ya:created dc:date="([^"]+)"/);
    if (match) {
      console.log("Registration date:", match[1]);
    } else {
      console.log("Not found in XML");
    }
  } catch(e) {
    console.error(e.message);
  }
}
run();
