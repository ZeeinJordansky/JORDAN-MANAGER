const fs = require('fs');
const orig = fs.readFileSync('server.ts.clean_real', 'utf8');

const regex = /if \(\["\/профиль", "\/profile".*?\{/g;
const m = regex.exec(orig);
if (m) {
  console.log(orig.substring(m.index, m.index + 800));
} else {
  console.log("NOT FOUND in clean_real");
}
