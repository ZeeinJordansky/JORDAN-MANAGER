import sqlite3 from "sqlite3";
const db = new sqlite3.Database("bot_database.db");
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Tables in bot_database.db:");
  console.log(rows.map(r => r.name).join(", "));
  db.close();
});
