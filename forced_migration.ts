import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { uploadFiles } from "@huggingface/hub";

class SqlitePromiseDb {
  db: sqlite3.Database;
  constructor(filename: string) {
    this.db = new sqlite3.Database(filename);
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

async function run() {
  const dbPath = path.join(process.cwd(), "bot_database.db");
  console.log(">>> [Forced Migration] Opening SQLite at:", dbPath);
  const sqliteDb = new SqlitePromiseDb(dbPath);

  // Re-create the firestore_collections table if not exists
  await sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS firestore_collections (
      collection TEXT,
      id TEXT,
      data TEXT,
      PRIMARY KEY (collection, id)
    )
  `);

  console.log(">>> [Forced Migration] Initializing Firestore...");
  const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const fbApp = initializeApp(config);
  const fbDatabase = getFirestore(fbApp, config.firestoreDatabaseId);

  // All collections accessed in server.ts
  const collectionsToMigrate = [
    "users",
    "chats",
    "clans",
    "settings",
    "bot_settings",
    "networks",
    "chat_user_stats",
    "promocodes",
    "panel_logs"
  ];

  for (const colName of collectionsToMigrate) {
    console.log(`>>> [Forced Migration] Fetching "${colName}" from Firestore...`);
    try {
      const colRef = collection(fbDatabase, colName);
      const snap = await getDocs(colRef);
      console.log(`>>> [Forced Migration] Found ${snap.size} documents in "${colName}". Migrating...`);
      let count = 0;
      for (const doc of snap.docs) {
        const docId = doc.id;
        const docData = doc.data();
        await sqliteDb.run(
          "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
          [colName, docId, JSON.stringify(docData)]
        );
        count++;
      }
      console.log(`>>> [Forced Migration] Successfully migrated ${count} documents for "${colName}"!`);
    } catch (err: any) {
      console.error(`>>> [Forced Migration] Error migrating "${colName}":`, err.stack || err.message || err);
    }
  }

  console.log(">>> [Forced Migration] Closing SQLite connection...");
  await sqliteDb.close();

  console.log(">>> [Forced Migration] Uploading updated database to Hugging Face...");
  const fileContent = fs.readFileSync(dbPath);
  const blob = new Blob([fileContent]);
  await uploadFiles({
    accessToken: "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",
    repo: {
      type: "dataset",
      name: "RomanJordansky/BOT_JORDANS-storage",
    },
    files: [
      {
        path: "bot_data/bot_database.db",
        content: blob,
      },
    ],
  });
  console.log(">>> [Forced Migration] Successfully uploaded migrated database to Hugging Face!");
  console.log(">>> [Forced Migration] All done!");
}

run().catch(console.error);
