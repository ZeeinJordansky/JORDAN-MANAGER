import urllib.request
import urllib.parse
import json
import base64
import time

hf_token = "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"
build_ts = int(time.time())

dockerfile_content = """FROM postgres:16-alpine

# Cache Buster TS: __BUILD_TS__
ENV CACHE_BUSTER="__BUILD_TS__"

RUN apk add --no-cache nodejs npm su-exec bash

WORKDIR /app

ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=my_super_secret_password
ENV POSTGRES_DB=bot_database
ENV PGDATA=/tmp/pgdata
EXPOSE 7860

RUN cat << 'INNEREOF' > /app/server.js
const express = require("express");
const { Pool } = require("pg");
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

app.get("/status", async (req, res) => {
  const db = process.env.POSTGRES_DB || "bot_database";
  let poolConnected = false;
  let serverTime = null;
  let pgVersion = null;
  let queryError = null;

  try {
    const p = getPool(db);
    const qRes = await p.query("SELECT NOW() as now, version() as v;");
    if (qRes && qRes.rows && qRes.rows[0]) {
      poolConnected = true;
      serverTime = qRes.rows[0].now;
      pgVersion = qRes.rows[0].v;
    }
  } catch (poolErr) {
    queryError = poolErr?.message || String(poolErr);
  }

  let pgLog = "";
  if (fs.existsSync("/tmp/postgres.log")) {
    try { pgLog = fs.readFileSync("/tmp/postgres.log", "utf-8").slice(-1500); } catch (e) {}
  }

  if (poolConnected) {
    return res.json({ status: "ok", isReady: "127.0.0.1:5432 - accepting connections", serverTime, pgVersion, log: pgLog });
  }

  return res.status(500).json({ status: "error", error: queryError || "PostgreSQL server starting...", log: pgLog });
});

app.post("/query", async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { sql, params, database } = req.body;
  const p = getPool(database);

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await p.query(sql, params || []);
      return res.json({ success: true, rows: result.rows, rowCount: result.rowCount });
    } catch (err) {
      lastErr = err;
      if ((err.code === "ECONNREFUSED" || err.code === "57P03") && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      break;
    }
  }

  console.error("SQL Error on query:", lastErr && (lastErr.message || lastErr));
  const errorMsg = (lastErr && (lastErr.message || lastErr.detail || lastErr.code || String(lastErr))) || "Unknown error";
  return res.status(500).json({ success: false, error: errorMsg, code: lastErr && lastErr.code });
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

RUN cat << 'INNEREOF' > /entrypoint.sh
#!/bin/bash
set -e
echo "=== Starting Ultra-Reliable PostgreSQL Space (__BUILD_TS__) ==="

# Clean any residual pid and initialize local fast /tmp/pgdata
mkdir -p /tmp/pgdata /run/postgresql /var/run/postgresql /tmp
chmod 777 /run/postgresql /var/run/postgresql /tmp 2>/dev/null || true
rm -rf /tmp/pgdata/* /tmp/pgdata/.* /run/postgresql/* 2>/dev/null || true

chown -R postgres:postgres /tmp/pgdata /run/postgresql /var/run/postgresql 2>/dev/null || true
chmod 700 /tmp/pgdata 2>/dev/null || true

echo "Initializing clean database cluster in /tmp/pgdata..."
su-exec postgres initdb -D /tmp/pgdata -U admin -A trust -E UTF8 --no-sync

echo "Starting PostgreSQL background daemon..."
su-exec postgres postgres -D /tmp/pgdata -c listen_addresses='*' -c port=5432 -c fsync=off -c synchronous_commit=off -c full_page_writes=off > /tmp/postgres.log 2>&1 &

echo "Waiting for PostgreSQL 127.0.0.1:5432..."
for i in $(seq 1 40); do
  if su-exec postgres pg_isready -h 127.0.0.1 -p 5432 -U admin 2>/dev/null; then
    echo "PostgreSQL is accepting connections!"
    su-exec postgres psql -U admin -h 127.0.0.1 -d postgres -c "CREATE DATABASE bot_database;" 2>/dev/null || true
    su-exec postgres psql -U admin -d bot_database -h 127.0.0.1 -c "
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
" 2>/dev/null || true
    echo "bot_database tables initialized successfully."
    break
  fi
  sleep 0.5
done

echo "Starting Node.js Proxy Server on port 7860..."
exec node /app/server.js
INNEREOF

RUN chmod +x /entrypoint.sh
RUN cp /entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
""".replace("__BUILD_TS__", str(build_ts))

commit_payload = json.dumps({
    "summary": f"Definitive entrypoint override with /tmp/pgdata ({build_ts})",
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

# Trigger restart
req2 = urllib.request.Request(
    "https://huggingface.co/api/spaces/RomanJordansky/BOT_JORDANS/restart?factory=true",
    data=json.dumps({"factory": True}).encode("utf-8"),
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
