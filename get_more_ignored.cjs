const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');
const search = '          actionStr = "Посмотрел(-а) список команд";';
const idx = orig.indexOf(search);
if (idx !== -1) {
  console.log(orig.substring(idx - 500, idx + 1000));
}
