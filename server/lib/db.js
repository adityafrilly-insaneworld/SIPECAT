const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const DB_PATH = process.env.DB_PATH || "./data/app.sqlite";
function ensureDir(p){ const d = path.dirname(p); if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
ensureDir(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

function nowISO(){ return new Date().toISOString(); }

function initDb(){
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN','OPERATOR','PIMPINAN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS letter_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classification TEXT NOT NULL CHECK(classification IN ('OUTGOING','CERTIFICATE')),
      year INTEGER NOT NULL,
      last_number INTEGER NOT NULL DEFAULT 0,
      UNIQUE(classification, year)
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      classification TEXT NOT NULL CHECK(classification IN ('OUTGOING','CERTIFICATE')),
      year INTEGER NOT NULL,
      register_no INTEGER NOT NULL,
      register_display TEXT NOT NULL,
      letter_date TEXT NOT NULL,
      subject TEXT NOT NULL,
      party TEXT,
      status TEXT NOT NULL CHECK(status IN ('AKTIF','BATAL')) DEFAULT 'AKTIF',
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id),
      UNIQUE(classification, year, register_no)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}

function seedAdminIfNeeded(){
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  const name = process.env.SEED_ADMIN_NAME || "Administrator";

  const existing = db.prepare("SELECT id FROM users WHERE username=?").get(username);
  if (existing) return;

  const hash = bcrypt.hashSync(password, 12);
  const now = nowISO();
  db.prepare(`
    INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'ADMIN', 1, ?, ?)
  `).run(name, username, hash, now, now);

  console.log(`[seed] Admin created: ${username}`);
}

function logAudit(userId, action, entity, entityId, beforeObj, afterObj){
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, before_json, after_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    action,
    entity,
    entityId || null,
    beforeObj ? JSON.stringify(beforeObj) : null,
    afterObj ? JSON.stringify(afterObj) : null,
    nowISO()
  );
}

module.exports = { db, initDb, seedAdminIfNeeded, nowISO, logAudit };
