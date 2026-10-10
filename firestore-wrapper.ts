import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { uploadFiles, downloadFile } from "@huggingface/hub";
import sqlite3 from "sqlite3";

// Промисифицированный SQLite клиент
export class SqlitePromiseDb {
  db: sqlite3.Database;
  filename: string;

  constructor(filename: string) {
    this.filename = filename;
    this.db = new sqlite3.Database(filename);
    this.initPragmas();
  }

  private initPragmas() {
    this.db.run("PRAGMA journal_mode = WAL;");
    this.db.run("PRAGMA synchronous = NORMAL;");
    this.db.run("PRAGMA cache_size = -16000;"); // Lean 16MB cache per DB
    this.db.run("PRAGMA temp_store = MEMORY;");
    this.db.run("PRAGMA foreign_keys = ON;");
    // Limit WAL growth so it does not consume unnecessary space
    this.db.run("PRAGMA wal_autocheckpoint = 25;");
    this.db.run("PRAGMA journal_size_limit = 65536;");
    this.db.run("PRAGMA auto_vacuum = INCREMENTAL;");
    this.db.run("PRAGMA secure_delete = FAST;");
    this.db.run("PRAGMA mmap_size = 134217728;"); // 128MB mmap
    this.db.run("PRAGMA page_size = 4096;");
    this.db.run("PRAGMA busy_timeout = 5000;");
    this.db.run("PRAGMA threads = 2;");
    this.db.run("CREATE TABLE IF NOT EXISTS firestore_collections (collection TEXT, id TEXT, data TEXT, PRIMARY KEY (collection, id));");
    this.db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, chat_id INTEGER, date TEXT, UNIQUE(user_id, chat_id));");
  }

  recreateDb() {
    try {
      this.db.close(() => {});
    } catch (e) {}
    try {
      // Защита: не удаляем существующую базу данных если её размер больше 50 Кб!
      if (fs.existsSync(this.filename)) {
        const sz = fs.statSync(this.filename).size;
        if (sz < 50000) {
          fs.unlinkSync(this.filename);
          if (fs.existsSync(this.filename + "-wal")) fs.unlinkSync(this.filename + "-wal");
          if (fs.existsSync(this.filename + "-shm")) fs.unlinkSync(this.filename + "-shm");
        } else {
          console.warn(`>>> [SQLite] Защита от сброса: Файл ${this.filename} имеет размер ${sz} байт, не удаляем.`);
        }
      }
    } catch (e) {}
    this.db = new sqlite3.Database(this.filename);
    this.initPragmas();
    this.db.run(`
      CREATE TABLE IF NOT EXISTS firestore_collections (
        collection TEXT,
        id TEXT,
        data TEXT,
        PRIMARY KEY (collection, id)
      )
    `);
    console.log(`>>> [SQLite] Recreated database structure: ${this.filename}`);
  }

  private isCorruptError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message || err);
    return msg.includes("malformed") || msg.includes("CORRUPT") || msg.includes("disk image");
  }

  private queryCache = new Map<string, { value: any; expiresAt: number }>();
  private readonly maxCacheSize = 2000;

  public clearCache() {
    this.queryCache.clear();
  }

  private isCacheable(sql: string): boolean {
    const s = sql.trim().toUpperCase();
    return s.startsWith("SELECT") || s.startsWith("PRAGMA") || s.startsWith("WITH");
  }

  private makeCacheKey(prefix: string, sql: string, params: any[] = []): string {
    return `${prefix}:${sql}:::${JSON.stringify(params)}`;
  }

  private pruneCacheIfNeeded() {
    if (this.queryCache.size > this.maxCacheSize) {
      const now = Date.now();
      for (const [k, v] of this.queryCache.entries()) {
        if (now > v.expiresAt || this.queryCache.size > this.maxCacheSize * 0.7) {
          this.queryCache.delete(k);
        }
      }
    }
  }

  run(sql: string, params: any[] = []): Promise<void> {
    // Invalidate cached reads on any write operation
    this.queryCache.clear();

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) {
          if (this.isCorruptError(err)) {
            console.error(`>>> [SQLite Error] ${this.filename} is corrupt (${err.message}). Recreating database...`);
            try {
              this.recreateDb();
              this.db.run(sql, params, () => resolve());
            } catch (rErr) {
              resolve();
            }
            return;
          }
          reject(err);
        } else resolve();
      });
    });
  }

  get(sql: string, params: any[] = [], ttlMs: number = 2500): Promise<any> {
    const cacheable = this.isCacheable(sql);
    const key = cacheable ? this.makeCacheKey("GET", sql, params) : "";

    if (cacheable) {
      const cached = this.queryCache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        return Promise.resolve(cached.value);
      }
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          if (this.isCorruptError(err)) {
            console.error(`>>> [SQLite Error] ${this.filename} is corrupt (${err.message}). Recreating database...`);
            try {
              this.recreateDb();
            } catch (rErr) {}
            resolve(null);
            return;
          }
          reject(err);
        } else {
          if (cacheable && ttlMs > 0) {
            this.pruneCacheIfNeeded();
            this.queryCache.set(key, { value: row, expiresAt: Date.now() + ttlMs });
          }
          resolve(row);
        }
      });
    });
  }

  all(sql: string, params: any[] = [], ttlMs: number = 2500): Promise<any[]> {
    const cacheable = this.isCacheable(sql);
    const key = cacheable ? this.makeCacheKey("ALL", sql, params) : "";

    if (cacheable) {
      const cached = this.queryCache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        return Promise.resolve(cached.value);
      }
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          if (this.isCorruptError(err)) {
            console.error(`>>> [SQLite Error] ${this.filename} is corrupt (${err.message}). Recreating database...`);
            try {
              this.recreateDb();
            } catch (rErr) {}
            resolve([]);
            return;
          }
          reject(err);
        } else {
          const res = rows || [];
          if (cacheable && ttlMs > 0) {
            this.pruneCacheIfNeeded();
            this.queryCache.set(key, { value: res, expiresAt: Date.now() + ttlMs });
          }
          resolve(res);
        }
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        resolve();
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
  static delete() { return new FieldValue('delete', null); }
}

function applyFieldValue(targetValue: any, operation: any): any {
  if (operation instanceof FieldValue) {
    if (operation.type === 'delete') {
      return undefined;
    }
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
export let sqliteDb: SqlitePromiseDb | null = null;
export let logsDb: SqlitePromiseDb | null = null;

const LOGS_COLLECTIONS = ["bot_logs", "botlogs", "reports", "bot_logs_test", "vk_processed_events"];

export const docStore = new Map<string, Map<string, any>>();
let readyPromise: Promise<void> | null = null;
let isReady = false;

let isDirty = false;
let isLogsDirty = false;
let isSyncing = false;
let isLogsSyncing = false;
let hfRateLimitedUntil = 0;

export function scheduleSync(collectionName?: string) {
  if (collectionName && LOGS_COLLECTIONS.includes(collectionName)) {
    isLogsDirty = true;
  } else {
    isDirty = true;
  }
}

// Фоновый интервал очистки/сжатия WAL каждые 60 секунд + инкрементальный вакуум
setInterval(() => {
  if (sqliteDb) {
    sqliteDb.run("PRAGMA wal_checkpoint(TRUNCATE);").catch(() => {});
    sqliteDb.run("PRAGMA incremental_vacuum(50);").catch(() => {});
  }
  if (logsDb) {
    logsDb.run("PRAGMA wal_checkpoint(TRUNCATE);").catch(() => {});
    logsDb.run("PRAGMA incremental_vacuum(50);").catch(() => {});
  }
}, 60 * 1000);

// Фоновый интервал отправки в HuggingFace раз в 15 минут
setInterval(() => {
  if (isDirty && !isSyncing) {
    performHFSync().catch(() => {});
  }
  if (isLogsDirty && !isLogsSyncing) {
    performLogsSync().catch(() => {});
  }
}, 15 * 60 * 1000);

export async function performHFSync() {
  if (!isDirty || isSyncing) return;
  
  const now = Date.now();
  if (now < hfRateLimitedUntil) return;

  isSyncing = true;

  try {
    const dbPath = path.join(process.cwd(), "bot_database.db");
    if (!fs.existsSync(dbPath)) {
      isSyncing = false;
      return;
    }

    console.log(">>> [HuggingFace Sync] Отправка bot_database.db в Hugging Face...");
    
    if (sqliteDb) {
      try {
        await sqliteDb.run("PRAGMA wal_checkpoint(TRUNCATE);");
      } catch (vErr) {
        console.error(">>> [HuggingFace Sync] Ошибка при WAL checkpoint:", vErr);
      }
    }

    const fileContent = await fs.promises.readFile(dbPath);
    if (fileContent.byteLength < 50000) {
      console.warn(`>>> [HuggingFace Sync] Предупреждение: Отмена отправки, размер локальной базы (${fileContent.byteLength} B) слишком мал.`);
      isSyncing = false;
      return;
    }

    const blob = new Blob([fileContent]);

    const hfToken = process.env.HF_TOKEN || "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";
    const hfBucketRepo = process.env.HF_BUCKET_REPO || "RomanJordansky/DATABASE-ORION-MANAGER";
    const hfDatasetRepo = process.env.HF_DATASET_REPO || "RomanJordansky/BOT_JORDANS-storage";

    // 1. Попытка отправки в основной Bucket
    let uploadedSuccessfully = false;
    try {
      await uploadFiles({
        accessToken: hfToken,
        repo: {
          type: "bucket",
          name: hfBucketRepo,
        },
        files: [
          {
            path: "bot_data/bot_database.db",
            content: blob,
          },
        ],
      });
      console.log(`>>> [HuggingFace Sync] Файл bot_database.db успешно сохранен в основной Bucket (${hfBucketRepo})!`);
      uploadedSuccessfully = true;
    } catch (bErr: any) {
      console.warn(">>> [HuggingFace Sync] Ошибка записи в основной Bucket, пробую резервный Dataset:", bErr.message);
    }

    // 2. Резервная отправка в Dataset (ТОЛЬКО если к основному бакету подключиться не удалось)
    if (!uploadedSuccessfully) {
      try {
        await uploadFiles({
          accessToken: hfToken,
          repo: {
            type: "dataset",
            name: hfDatasetRepo,
          },
          files: [
            {
              path: "bot_data/bot_database.db",
              content: blob,
            },
          ],
        });
        console.log(`>>> [HuggingFace Sync] Файл bot_database.db сохранен в резервный Dataset ${hfDatasetRepo}!`);
      } catch (dErr: any) {
        console.warn(">>> [HuggingFace Sync] Ошибка сохранения в резервный Dataset:", dErr.message);
      }
    }

    isDirty = false;
  } catch (err: any) {
    handleHFError(err);
  } finally {
    isSyncing = false;
  }
}

export async function performLogsSync() {
  if (!isLogsDirty || isLogsSyncing) return;
  
  const now = Date.now();
  if (now < hfRateLimitedUntil) return;

  isLogsSyncing = true;

  try {
    const dbPath = path.join(process.cwd(), "bot_logs.db");
    if (!fs.existsSync(dbPath)) {
      isLogsSyncing = false;
      return;
    }

    console.log(">>> [HuggingFace Logs Sync] Отправка bot_logs.db в Hugging Face (LOGSBASE)...");
    
    if (logsDb) {
      try {
        await logsDb.run("PRAGMA wal_checkpoint(TRUNCATE);");
      } catch (vErr) {
        console.error(">>> [HuggingFace Logs Sync] Ошибка при WAL checkpoint:", vErr);
      }
    }

    const fileContent = await fs.promises.readFile(dbPath);
    const blob = new Blob([fileContent]);

    const hfToken = process.env.HF_TOKEN || "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";
    const hfLogsRepo = process.env.HF_LOGS_REPO || "RomanJordansky/LOGSBASE";

    await uploadFiles({
      accessToken: hfToken,
      repo: {
        type: "dataset",
        name: hfLogsRepo,
      },
      files: [
        {
          path: "bot_logs/bot_logs.db",
          content: blob,
        },
      ],
    });
    console.log(`>>> [HuggingFace Logs Sync] Файл bot_logs.db успешно сохранен в ${hfLogsRepo}!`);
    isLogsDirty = false;
  } catch (err: any) {
    handleHFError(err);
  } finally {
    isLogsSyncing = false;
  }
}

function handleHFError(err: any) {
  const msg = err?.message || String(err);
  if (msg.includes("rate limit") || msg.includes("128 per hour") || msg.includes("429")) {
    hfRateLimitedUntil = Date.now() + 30 * 60 * 1000;
    console.warn(">>> [HuggingFace Sync] Превышен лимит коммитов Hugging Face (128/час). Пауза синхронизации на 30 минут.");
  } else {
    console.error(">>> [HuggingFace Sync] Ошибка отправки в Hugging Face:", msg);
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

function isValidSqliteBuffer(buf: Buffer | null): boolean {
  if (!buf || buf.byteLength < 50000) return false;
  try {
    const header = buf.toString("utf8", 0, 16);
    return header.startsWith("SQLite format 3");
  } catch (e) {
    return false;
  }
}

async function initDatabase() {
  const dbPath = path.join(process.cwd(), "bot_database.db");
  const logsPath = path.join(process.cwd(), "bot_logs.db");
  
  const hfToken = process.env.HF_TOKEN || "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";
  const hfBucketRepo = process.env.HF_BUCKET_REPO || "RomanJordansky/DATABASE-ORION-MANAGER";
  const hfDatasetRepo = process.env.HF_DATASET_REPO || "RomanJordansky/BOT_JORDANS-storage";
  const hfLogsRepo = process.env.HF_LOGS_REPO || "RomanJordansky/LOGSBASE";

  // 1. Скачивание базы данных из HF Bucket
  let downloadedBuf: Buffer | null = null;
  try {
    console.log(`>>> [Database] Загрузка bot_database.db из Hugging Face Bucket (${hfBucketRepo})...`);
    const bucketFile = await downloadFile({
      accessToken: hfToken,
      repo: { type: "bucket", name: hfBucketRepo },
      path: "bot_data/bot_database.db",
    });
    if (bucketFile) {
      const arrayBuf = await bucketFile.arrayBuffer();
      const tempBuf = Buffer.from(arrayBuf);
      if (isValidSqliteBuffer(tempBuf)) {
        downloadedBuf = tempBuf;
        console.log(`>>> [Database] Скачано из Bucket (валидный SQLite): ${downloadedBuf.byteLength} байт.`);
      } else {
        console.warn(`>>> [Database] Файл из Bucket поврежден или не является валидным SQLite (${tempBuf.byteLength} B), пробую Dataset...`);
      }
    }
  } catch (bErr: any) {
    console.warn(">>> [Database] Ошибка скачивания из Bucket, пробуем Dataset:", bErr.message);
  }

  if (!downloadedBuf) {
    try {
      console.log(`>>> [Database] Загрузка bot_database.db из Hugging Face Dataset (${hfDatasetRepo})...`);
      const url = `https://huggingface.co/datasets/${hfDatasetRepo}/resolve/main/bot_data/bot_database.db`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${hfToken}` },
        responseType: "arraybuffer",
        timeout: 20000,
      });
      if (res.data) {
        const tempBuf = Buffer.from(res.data);
        if (isValidSqliteBuffer(tempBuf)) {
          downloadedBuf = tempBuf;
          console.log(`>>> [Database] Скачано из Dataset (валидный SQLite): ${downloadedBuf.byteLength} байт.`);
        } else {
          console.warn(">>> [Database] Файл из Dataset не прошел валидацию SQLite.");
        }
      }
    } catch (err: any) {
      console.error(">>> [Database] Ошибка загрузки базы из Dataset:", err.message);
    }
  }

  const downloadedSize = downloadedBuf ? downloadedBuf.byteLength : 0;
  const localSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 50000) {
    if (downloadedBuf && downloadedSize > 50000) {
      if (fs.existsSync(dbPath + "-wal")) try { fs.unlinkSync(dbPath + "-wal"); } catch (e) {}
      if (fs.existsSync(dbPath + "-shm")) try { fs.unlinkSync(dbPath + "-shm"); } catch (e) {}
      fs.writeFileSync(dbPath, downloadedBuf);
      console.log(`>>> [Database] Успешно загружена и применена база с HF (${downloadedSize} байт)!`);
    } else {
      console.warn(">>> [Database] ВНИМАНИЕ: Не удалось загрузить базу данных ни из HF, ни из локального файла!");
    }
  } else {
    console.log(`>>> [Database] Используется локальный оптимизированный файл базы данных (${localSize} байт).`);
    // Ensure clean optimized DB is backed up to HF
    isDirty = true;
    setTimeout(() => { performHFSync().catch(() => {}); }, 10000);
  }

  // 1b. Скачивание базы данных логов из HF
  try {
    console.log(`>>> [Database] Загрузка bot_logs.db из Hugging Face Dataset (${hfLogsRepo})...`);
    const url = `https://huggingface.co/datasets/${hfLogsRepo}/resolve/main/bot_logs/bot_logs.db`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${hfToken}` },
      responseType: "arraybuffer",
    });
    if (res.data && res.data.byteLength > 1000) {
      if (fs.existsSync(logsPath + "-wal")) fs.unlinkSync(logsPath + "-wal");
      if (fs.existsSync(logsPath + "-shm")) fs.unlinkSync(logsPath + "-shm");
      fs.writeFileSync(logsPath, Buffer.from(res.data));
      console.log(`>>> [Database] Успешно загружен bot_logs.db (${res.data.byteLength} байт)!`);
    }
  } catch (err: any) {
    console.warn(">>> [Database] Предупреждение: Не удалось загрузить базу данных логов из Hugging Face.");
  }

  // 2. Открытие баз данных Sqlite
  sqliteDb = new SqlitePromiseDb(dbPath);
  logsDb = new SqlitePromiseDb(logsPath);

  // 3. Создание таблиц
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS firestore_collections (
      collection TEXT,
      id TEXT,
      data TEXT,
      PRIMARY KEY (collection, id)
    )
  `;
  await sqliteDb.run(createTableSql);
  await logsDb.run(createTableSql);

  // 4. Инициализация таблиц завершена
  // Миграция/Очистка: удаляем vk_processed_events из основной БД, так как теперь они в БД логов
  await sqliteDb.run("DELETE FROM firestore_collections WHERE collection = 'vk_processed_events'");
  
  const countRow = await sqliteDb.get("SELECT count(*) as count FROM firestore_collections");
  const logsCountRow = await logsDb.get("SELECT count(*) as count FROM firestore_collections");
  console.log(`>>> [Database] Загружены SQLite таблицы. Записей в основной БД: ${countRow?.count || 0}, записей в логах: ${logsCountRow?.count || 0}`);

  // 5. Загрузка данных из ОБОИХ SQLite в кэш-память docStore
  const dbs = [sqliteDb, logsDb];
  for (const db of dbs) {
    const rows = await db!.all("SELECT collection, id, data FROM firestore_collections");
    for (const row of rows) {
      if (!docStore.has(row.collection)) {
        docStore.set(row.collection, new Map());
      }
      docStore.get(row.collection)!.set(row.id, JSON.parse(row.data));
    }
  }
  
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
    const targetDb = LOGS_COLLECTIONS.includes(this.collectionName) ? logsDb : sqliteDb;
    if (targetDb) {
      await targetDb.run(
        "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
        [this.collectionName, this.id, JSON.stringify(updated)]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync(this.collectionName);
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
    const targetDb = LOGS_COLLECTIONS.includes(this.collectionName) ? logsDb : sqliteDb;
    if (targetDb) {
      await targetDb.run(
        "INSERT OR REPLACE INTO firestore_collections (collection, id, data) VALUES (?, ?, ?)",
        [this.collectionName, this.id, JSON.stringify(updated)]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync(this.collectionName);
  }

  async delete() {
    await ensureReady();
    if (docStore.get(this.collectionName)?.has(this.id)) {
      docStore.get(this.collectionName)!.delete(this.id);
    }

    // Удаление локально в SQLite
    const targetDb = LOGS_COLLECTIONS.includes(this.collectionName) ? logsDb : sqliteDb;
    if (targetDb) {
      await targetDb.run(
        "DELETE FROM firestore_collections WHERE collection = ? AND id = ?",
        [this.collectionName, this.id]
      );
    }

    // Запуск фоновой синхронизации с Hugging Face
    scheduleSync(this.collectionName);
  }
}
