import urllib.request
import urllib.parse
import json
import base64

hf_token = "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"

dockerfile_content = """FROM postgres:16-alpine
RUN apk add --no-cache nodejs npm su-exec
WORKDIR /app

ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=my_super_secret_password
ENV POSTGRES_DB=bot_database
ENV PGDATA=/var/lib/postgresql/data
EXPOSE 7860

RUN cat << 'INNEREOF' > server.js
const express = require("express");
const { Pool } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");
const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

let pool = null;
function getPool(dbName) {
  const db = dbName || process.env.POSTGRES_DB || "bot_database";
  if (!pool) {
    pool = new Pool({
      user: process.env.POSTGRES_USER || "admin",
      password: process.env.POSTGRES_PASSWORD || "my_super_secret_password",
      host: "127.0.0.1",
      port: 5432,
      database: db,
      max: 100,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000
    });
    pool.on("error", (err) => console.warn("[PG Pool Error]", err?.message || err));
  }
  return pool;
}

function checkAuth(req) {
  const token = req.body?.key || req.body?.secret || req.headers?.authorization?.replace(/^Bearer\\s+/i, "") || req.query?.key;
  return token === (process.env.POSTGRES_PASSWORD || "my_super_secret_password");
}

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Ultra-Fast PostgreSQL HTTP Proxy", time: new Date().toISOString() });
});

app.get("/status", (req, res) => {
  try {
    const db = process.env.POSTGRES_DB || "bot_database";
    const isReady = execSync("su-exec postgres pg_isready -h 127.0.0.1 -p 5432 -U " + (process.env.POSTGRES_USER || "admin") + " -d " + db).toString().trim();
    const log = fs.existsSync("/tmp/postgres.log") ? fs.readFileSync("/tmp/postgres.log", "utf8").slice(-2000) : "no log";
    res.json({ status: "ok", isReady, log });
  } catch (err) {
    const log = fs.existsSync("/tmp/postgres.log") ? fs.readFileSync("/tmp/postgres.log", "utf8").slice(-2000) : "no log";
    res.status(500).json({ status: "error", error: err.message, log });
  }
});

app.post("/query", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { sql, params, database } = req.body;
  try {
    const p = getPool(database);
    const result = await p.query(sql, params || []);
    res.json({ success: true, rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    console.error("SQL Error on query:", err && (err.message || err));
    const errorMsg = (err && (err.message || err.detail || err.code || String(err))) || "Unknown error";
    res.status(500).json({ success: false, error: errorMsg, code: err && err.code });
  }
});

app.post("/batch", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { queries, database } = req.body;
  if (!Array.isArray(queries)) {
    return res.status(400).json({ error: "queries must be an array" });
  }
  const p = getPool(database);
  const client = await p.connect();
  try {
    await client.query("BEGIN;");
    for (const q of queries) {
      if (typeof q === "string") {
        await client.query(q);
      } else if (q.sql) {
        await client.query(q.sql, q.params || []);
      }
    }
    await client.query("COMMIT;");
    res.json({ success: true, executedCount: queries.length });
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Batch error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

app.post("/clean_schema", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const p = getPool();
    const tablesRes = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    const validTables = ["firestore_collections", "messages", "users", "chats", "clans"];
    const dropped = [];
    for (const row of tablesRes.rows) {
      if (!validTables.includes(row.table_name)) {
        await p.query('DROP TABLE IF EXISTS "' + row.table_name + '" CASCADE;');
        dropped.push(row.table_name);
      }
    }
    await p.query('REINDEX SCHEMA public;');
    res.json({ success: true, droppedTables: dropped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/vacuum", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  try {
    const db = req.body.database || process.env.POSTGRES_DB || "bot_database";
    const p = getPool(db);
    const beforeRes = await p.query("SELECT pg_database_size(current_database()) as bytes;");
    const bytesBefore = Number(beforeRes.rows[0]?.bytes || 0);
    
    await p.query("VACUUM (ANALYZE);");
    await p.query('REINDEX SCHEMA public;');
    await p.query("CHECKPOINT;");
    
    const afterRes = await p.query("SELECT pg_database_size(current_database()) as bytes, pg_size_pretty(pg_database_size(current_database())) as pretty;");
    const bytesAfter = Number(afterRes.rows[0]?.bytes || 0);
    const pretty = afterRes.rows[0]?.pretty || "N/A";
    const freedBytes = Math.max(0, bytesBefore - bytesAfter);
    res.json({
      success: true,
      bytesBefore,
      bytesAfter,
      freedBytes,
      freedMb: (freedBytes / 1024 / 1024).toFixed(2),
      formattedSize: pretty
    });
  } catch (err) {
    console.error("Vacuum error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 7860;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Ultra-Fast PostgreSQL Proxy running on port " + PORT);
});
INNEREOF

RUN npm init -y && npm install express pg

RUN cat << 'INNEREOF' > /app/start.sh
#!/bin/sh

echo "=== Starting Clean High-Performance PostgreSQL Cluster ==="
DATA_DIR="/var/lib/postgresql/data"

mkdir -p "$DATA_DIR" /var/run/postgresql
chmod 777 "$DATA_DIR" /var/run/postgresql

# Clear corrupted WAL or broken state from previous runs
rm -rf "$DATA_DIR"/* "$DATA_DIR"/.* 2>/dev/null || true
chown -R postgres:postgres "$DATA_DIR" /var/run/postgresql

echo "Initializing pristine PostgreSQL database..."
su-exec postgres initdb -D "$DATA_DIR" --auth-host=trust --auth-local=trust -U admin -E UTF8

su-exec postgres postgres -D "$DATA_DIR" \
  -c listen_addresses='*' \
  -c port=5432 \
  -c max_connections=100 \
  -c synchronous_commit=off \
  -c shared_buffers=128MB \
  -c work_mem=16MB \
  -c maintenance_work_mem=64MB \
  -c effective_cache_size=256MB \
  -c wal_level=minimal \
  -c max_wal_senders=0 \
  -c wal_keep_size=0 \
  -c max_wal_size=128MB \
  -c min_wal_size=32MB \
  -c checkpoint_completion_target=0.9 \
  -c wal_recycle=on \
  -c archive_mode=off > /tmp/postgres.log 2>&1 &

echo "Waiting for PostgreSQL to accept connections..."
for i in $(seq 1 30); do
    if pg_isready -h 127.0.0.1 -p 5432 -U admin >/dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    sleep 1
done

su-exec postgres psql -U admin -h 127.0.0.1 -d postgres -c "CREATE DATABASE bot_database;" 2>/dev/null || true

su-exec postgres psql -U admin -h 127.0.0.1 -d bot_database -c "
CREATE TABLE IF NOT EXISTS firestore_collections (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_firestore_collection ON firestore_collections(collection);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id BIGINT,
  chat_id BIGINT,
  date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON messages(user_id, chat_id);

REINDEX SCHEMA public;
" 2>/dev/null || true

echo "Starting Node.js Proxy Server on port 7860..."
exec node /app/server.js
INNEREOF

RUN chmod +x /app/start.sh
ENTRYPOINT ["/bin/sh", "/app/start.sh"]
"""

commit_payload = json.dumps({
    "summary": "Fix ENTRYPOINT [/bin/sh, /app/start.sh] and force clean initdb",
    "operations": [
        {
            "op": "upsert",
            "path": "Dockerfile",
            "content": base64.b64encode(dockerfile_content.encode("utf-8")).decode("utf-8"),
            "encoding": "base64"
        }
    ]
}).encode("utf-8")

req = urllib.request.Request(
    "https://huggingface.co/api/spaces/RomanJordansky/BOT_JORDANS/commit/main",
    data=commit_payload,
    headers={
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as response:
        print("Commit response:", response.status, response.read().decode("utf-8")[:200])
except Exception as e:
    print("Commit failed:", e)

# Restart space
req2 = urllib.request.Request(
    "https://huggingface.co/api/spaces/RomanJordansky/BOT_JORDANS/restart",
    data=b"{}",
    headers={
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req2) as response:
        print("Restart response:", response.status, response.read().decode("utf-8")[:200])
except Exception as e:
    print("Restart failed:", e)
