const express = require("express");
const bcrypt = require("bcryptjs");
const { db, nowISO, logAudit } = require("../lib/db");
const router = express.Router();

router.get("/", (req,res)=>{
  const rows = db.prepare("SELECT id, name, username, role, is_active, created_at, updated_at FROM users ORDER BY id ASC").all();
  res.json({ data: rows });
});

router.post("/", (req,res)=>{
  const { name, username, password, role } = req.body || {};
  if(!name || !username || !password || !role) return res.status(400).json({ error:"BAD_REQUEST" });
  if(!["ADMIN","OPERATOR","PIMPINAN"].includes(role)) return res.status(400).json({ error:"BAD_ROLE" });

  const hash = bcrypt.hashSync(String(password), 12);
  const now = nowISO();
  try{
    const info = db.prepare(`INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(String(name), String(username), hash, role, now, now);

    const created = db.prepare("SELECT id, name, username, role, is_active, created_at, updated_at FROM users WHERE id=?").get(info.lastInsertRowid);
    logAudit(req.user.sub, "CREATE", "users", String(created.id), null, created);
    res.status(201).json({ data: created });
  }catch{
    res.status(409).json({ error:"USERNAME_EXISTS" });
  }
});

router.patch("/:id", (req,res)=>{
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id, name, username, role, is_active FROM users WHERE id=?").get(id);
  if(!existing) return res.status(404).json({ error:"NOT_FOUND" });

  const { name, role, is_active } = req.body || {};
  const newName = name !== undefined ? String(name) : existing.name;
  const newRole = role !== undefined ? String(role) : existing.role;
  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
  if(!["ADMIN","OPERATOR","PIMPINAN"].includes(newRole)) return res.status(400).json({ error:"BAD_ROLE" });

  const now = nowISO();
  db.prepare("UPDATE users SET name=?, role=?, is_active=?, updated_at=? WHERE id=?").run(newName, newRole, newActive, now, id);
  const after = db.prepare("SELECT id, name, username, role, is_active, created_at, updated_at FROM users WHERE id=?").get(id);
  logAudit(req.user.sub, "UPDATE", "users", String(id), existing, after);
  res.json({ data: after });
});

router.post("/:id/reset-password", (req,res)=>{
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if(!password) return res.status(400).json({ error:"BAD_REQUEST" });

  const existing = db.prepare("SELECT id, username FROM users WHERE id=?").get(id);
  if(!existing) return res.status(404).json({ error:"NOT_FOUND" });

  const hash = bcrypt.hashSync(String(password), 12);
  const now = nowISO();
  db.prepare("UPDATE users SET password_hash=?, updated_at=? WHERE id=?").run(hash, now, id);
  logAudit(req.user.sub, "RESET_PASSWORD", "users", String(id), null, { id, username: existing.username });
  res.json({ ok:true });
});

module.exports = router;
