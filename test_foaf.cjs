const axios = require('axios');
axios.get("https://vk.com/foaf.php?id=1")
.then(res => {
  console.log(res.data.substring(0, 1000));
}).catch(console.error);
