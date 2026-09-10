import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { uploadFiles } from "@huggingface/hub";
import sqlite3 from "sqlite3";

// Промисифицированный SQLite клиент
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

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
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

export class FieldValue {
  type: string;
  value: any;
  constructor(type: string, value: any) {
    this.type = type;
    this.value = value;
  }
  static increment(n: number) { return new FieldValue('increment', n); }
  static arrayUnion(...elements: any[]) { return new FieldValue('arrayUnion', elements); }
  static arrayRemove(...elements: any[]) { return new FieldValue('arrayRemove', elements); }
  static serverTimestamp() { return new FieldValue('serverTimestamp', null); }
}

function applyFieldValue(targetValue: any, operation: any): any {
  if (operation instanceof FieldValue) {
    if (operation.type === 'increment') {
      const base = typeof targetValue === 'number' ? targetValue : 0;
      return base + operation.value;
    }
    if (operation.type === 'arrayUnion') {
      const base = Array.isArray(targetValue) ? targetValue : [];
      const newArr = [...base];
      for (const el of operation.value) {
        if (!newArr.includes(el)) {
          newArr.push(el);
        }
      }
      return newArr;
    }
    if (operation.type === 'arrayRemove') {
      const base = Array.isArray(targetValue) ? targetValue : [];
      return base.filter(el => !operation.value.includes(el));
    }
    if (operation.type === 'serverTimestamp') {
      return Date.now();
    }
  }
  return operation;
}

function processObjectWithFieldValues(currentObj: any, updates: any): any {
  const result = { ...(currentObj || {}) };
  for (const key of Object.keys(updates)) {
    const val = updates[key];
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
          cur[parts[i]] = {};
        } else {
          cur[parts[i]] = { ...cur[parts[i]] };
        }
        cur = cur[parts[i]];
      }
      const lastKey = parts[parts.length - 1];
      cur[lastKey] = (val instanceof FieldValue) ? applyFieldValue(cur[lastKey], val) : val;
    } else if (val instanceof FieldValue) {
      result[key] = applyFieldValue(result[key], val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = processObjectWithFieldValues(result[key] || {}, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function getNestedValue(obj: any, pathStr: string): any {
  if (!obj) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object') {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

// Глобальное состояние SQLite
let sqliteDb: SqlitePromiseDb | null = null;
const docStore = new Map<string, Map<string, any>>();
let readyPromise: Promise<void> | null = null;
let isReady = false;

let isDirty = false;
let isSyncing = false;
let hfRateLimitedUntil = 0;

function scheduleSync() {
  isDirty = true;
}

// Фоновый интервал отправки в HuggingFace раз в 2 минуты
setInterval(() => {
  if (isDirty && !isSyncing) {
    performHFSync().catch(() => {});
  }
}, 2 * 60 * 1000);

async function performHFSync() {
  if (!isDirty || isSyncing) return;
  
  const now = Date.now();
  if (now < hfRateLimitedUntil) {
    // Еще действует таймаут ограничения скорости от Hugging Face
    return;
  }

  isSyncing = true;

  try {
    const dbPath = path.join(process.cwd(), "bot_database.db");
    if (!fs.existsSync(dbPath)) {
      isSyncing = false;
      return;
    }

    console.log(">>> [HuggingFace Sync] Отправка bot_database.db в Hugging Face...");
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
    console.log(">>> [HuggingFace Sync] Файл bot_database.db успешно сохранен в Hugging Face!");
    isDirty = false; // Успешно выгружено
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("rate limit") || msg.includes("128 per hour") || msg.includes("429")) {
      hfRateLimitedUntil = Date.now() + 30 * 60 * 1000; // Пауза на 30 минут
      console.warn(">>> [HuggingFace Sync] Превышен лимит коммитов Hugging Face (128/час). Пауза синхронизации на 30 минут.");
    } else {
      console.error(">>> [HuggingFace Sync] Ошибка отправки в Hugging Face:", msg);
    }
  } finally {
    isSyncing = false;
  }
}

// Синхронизация при мягком завершении процесса
process.on("SIGTERM", async () => {
  console.log(">>> Получен сигнал SIGTERM, выполняем финальную синхронизацию с Hugging Face...");
  await performHFSync();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log(">>> Получен сигнал SIGINT, выполняем финальную синхронизацию с Hugging Face...");
  await performHFSync();
  process.exit(0);
});

async function ensureReady() {
  if (isReady) return;
  if (!readyPromise) {
    readyPromise = initDatabase();
  }
  await readyPromise;
}

async function initDatabase() {
  const dbPath = path.join(process.cwd(), "bot_database.db");
  
  // 1. Скачивание базы данных из HF
  try {
    console.log(">>> [Database] Загрузка bot_database.db из Hugging Face...");
    const url = "https://huggingface.co/datasets/RomanJordansky/BOT_JORDANS-storage/resolve/main/bot_data/bot_database.db";
    const res = await axios.get(url, {
      headers: {
        Authorization: "Bearer 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",
      },
      responseType: "arraybuffer",
    });
    fs.writeFileSync(dbPath, Buffer.from(res.data));
    console.log(">>> [Database] Успешно загружен bot_database.db!");
  } catch (err: any) {
    console.warn(">>> [Database] Предупреждение: Не удалось загрузить базу данных из Hugging Face (проверяем или создаем локальный файл):", err.message);
  }

  // 2. Открытие базы данных Sqlite
  sqliteDb = new SqlitePromiseDb(dbPath);

  // 3. Создание таблицы, если она не существует
  await sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS firestore_collections (
      collection TEXT,
      id TEXT,
      data TEXT,
      PRIMARY KEY (collection, id)
    )
  `);

  // 4. Одноразовая проверка миграции
  const countRow = await sqliteDb.get("SELECT count(*) as count FROM firestore_collections");
  if (!countRow || countRow.count === 0) {
    console.log(">>> [Database] Таблица SQLite firestore_collections пуста. Запускаем миграцию из Firestore...");
    try {
      const { initializeApp: fbInit } = await import("firebase/app");
      const { getFirestore: fbGet, collection: fbCol, getDocs: fbGetDocs } = await import("firebase/firestore");
      
      const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
      const fbApp = fbInit(config);
      const fbDatabase = fbGet(fbApp, config.firestoreDatabaseId);

      const collectionsToMigrate = ["users", "chats", "clans", "settings", "bot_settings", "networks"];
      for (const colName of collectionsToMigrate) {
        console.log(`>>> [Migration] Извлечение и миграция "${colName}" из Firestore...`);
        try {
          const snap = await fbGetDocs(fbCol(fbDatabase, colName));
          let colCount = 0;
          for (const doc of snap.docs) {
            const docId = doc.id;
            const docData = doc.data();
            await sqliteDb.run(
              "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
              [colName, docId, JSON.stringify(docData)]
            );
            colCount++;
          }
          console.log(`>>> [Migration] Мигрировано документов для "${colName}": ${colCount}`);
        } catch (colErr: any) {
          console.error(`>>> [Migration] Не удалось мигрировать "${colName}":`, colErr.message);
        }
      }
      
      // Немедленная выгрузка мигрированной базы данных
      console.log(">>> [Migration] Отправка мигрированной базы данных в Hugging Face...");
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
      console.log(">>> [Migration] Мигрированная база данных успешно сохранена в Hugging Face!");
    } catch (migErr: any) {
      console.error(">>> [Migration] Одноразовая миграция из Firestore не удалась или была пропущена:", migErr.message);
    }
  }

  // 5. Загрузка данных из SQLite в кэш-память docStore
  const rows = await sqliteDb.all("SELECT collection, id, data FROM firestore_collections");
  for (const row of rows) {
    if (!docStore.has(row.collection)) {
      docStore.set(row.collection, new Map());
    }
    docStore.get(row.collection)!.set(row.id, JSON.parse(row.data));
  }
  console.log(`>>> [Database] Загружено документов из SQLite: ${rows.length}`);
  
  isReady = true;
}

export function getFirestoreWrapper() {
  return new FirestoreWrapper();
}

class FirestoreWrapper {
  collection(path: string) {
    return new CollectionReferenceWrapper(path);
  }

  async runTransaction(cb: (transaction: any) => Promise<any>) {
    await ensureReady();
    const transaction = {
      get: async (docRef: DocumentReferenceWrapper) => await docRef.get(),
      set: async (docRef: DocumentReferenceWrapper, data: any) => await docRef.set(data),
      update: async (docRef: DocumentReferenceWrapper, data: any) => await docRef.update(data),
      delete: async (docRef: DocumentReferenceWrapper) => await docRef.delete()
    };
    return await cb(transaction);
  }
}

class DocumentSnapshot {
  id: string;
  private docData: any;
  exists: boolean;

  constructor(id: string, docData: any) {
    this.id = id;
    this.docData = docData;
    this.exists = docData !== undefined && docData !== null;
  }

  data() {
    return this.docData ? { ...this.docData } : undefined;
  }
}

class CollectionReferenceWrapper {
  path: string;
  private queries: Array<(docs: any[]) => any[]> = [];

  constructor(path: string, queries: Array<(docs: any[]) => any[]> = []) {
    this.path = path;
    this.queries = queries;
  }

  doc(id?: string) {
    const docId = id || crypto.randomUUID();
    return new DocumentReferenceWrapper(this.path, docId);
  }

  where(field: string, op: string, value: any) {
    const filterFn = (docs: any[]) => {
      return docs.filter(doc => {
        const val = getNestedValue(doc.data, field);
        switch (op) {
          case "==":
          case "=":
            return val === value;
          case "!=":
            return val !== value;
          case ">":
            return val > value;
          case ">=":
            return val >= value;
          case "<":
            return val < value;
          case "<=":
            return val <= value;
          case "array-contains":
            return Array.isArray(val) && val.includes(value);
          case "in":
            return Array.isArray(value) && value.includes(val);
          default:
            return false;
        }
      });
    };
    return new CollectionReferenceWrapper(this.path, [...this.queries, filterFn]);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    const sortFn = (docs: any[]) => {
      return [...docs].sort((a, b) => {
        const valA = getNestedValue(a.data, field);
        const valB = getNestedValue(b.data, field);

        if (valA === undefined && valB === undefined) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;

        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    };
    return new CollectionReferenceWrapper(this.path, [...this.queries, sortFn]);
  }

  limit(n: number) {
    const limitFn = (docs: any[]) => {
      return docs.slice(0, n);
    };
    return new CollectionReferenceWrapper(this.path, [...this.queries, limitFn]);
  }

  async get() {
    await ensureReady();
    const colMap = docStore.get(this.path) || new Map<string, any>();
    
    // Преобразование мапы в формат массива, ожидаемый обертками запросов
    let results: Array<{ id: string; data: any }> = [];
    colMap.forEach((val, key) => {
      results.push({ id: key, data: val });
    });

    // Применение всех стадий запроса (фильтры, сортировка, лимиты)
    for (const qFn of this.queries) {
      results = qFn(results);
    }

    const docs = results.map(r => new DocumentSnapshot(r.id, r.data));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (cb: (doc: DocumentSnapshot) => void) => docs.forEach(cb)
    };
  }

  async add(data: any) {
    await ensureReady();
    const docId = crypto.randomUUID();
    const docRef = new DocumentReferenceWrapper(this.path, docId);
    await docRef.set(data);
    return { id: docId };
  }
}

class DocumentReferenceWrapper {
  private collectionName: string;
  private id: string;

  constructor(collectionName: string, id: string) {
    this.collectionName = collectionName;
    this.id = id;
  }

  async get() {
    await ensureReady();
    const current = docStore.get(this.collectionName)?.get(this.id);
    return new DocumentSnapshot(this.id, current);
  }

  async create(data: any) {
    await ensureReady();
    const current = docStore.get(this.collectionName)?.get(this.id);
    if (current !== undefined && current !== null) {
      const err: any = new Error(`Документ уже существует по пути ${this.collectionName}/${this.id}`);
      err.code = 6;
      throw err;
    }
    await this.set(data);
  }

  async set(data: any, options?: { merge?: boolean }) {
    await ensureReady();
    let current = docStore.get(this.collectionName)?.get(this.id);
    let updated: any;
    if (options?.merge && current) {
      updated = processObjectWithFieldValues(current, data);
    } else {
      updated = processObjectWithFieldValues({}, data);
    }

    // Сохранение во внутренней памяти
    if (!docStore.has(this.collectionName)) {
      docStore.set(this.collectionName, new Map());
    }
    docStore.get(this.collectionName)!.set(this.id, updated);

    // Сохранение локально в SQLite
    if (sqliteDb) {
      await sqliteDb.run(
        "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
        [this.collectionName, this.id, JSON.stringify(updated)]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync();
  }

  async update(data: any) {
    await ensureReady();
    let current = docStore.get(this.collectionName)?.get(this.id);
    if (!current) {
      throw new Error(`Документ ${this.collectionName}/${this.id} не существует для обновления.`);
    }
    const updated = processObjectWithFieldValues(current, data);

    // Сохранение во внутренней памяти
    docStore.get(this.collectionName)!.set(this.id, updated);

    // Сохранение локально в SQLite
    if (sqliteDb) {
      await sqliteDb.run(
        "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
        [this.collectionName, this.id, JSON.stringify(updated)]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync();
  }

  async delete() {
    await ensureReady();
    if (docStore.get(this.collectionName)?.has(this.id)) {
      docStore.get(this.collectionName)!.delete(this.id);
    }

    // Удаление локально в SQLite
    if (sqliteDb) {
      await sqliteDb.run(
        "DELETE FROM firestore_collections WHERE collection = ? AND id = ?",
        [this.collectionName, this.id]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync();
  }
}
