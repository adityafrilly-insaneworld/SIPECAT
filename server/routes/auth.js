const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../lib/db");
const { signToken } = require("../lib/auth");

const router = express.Router();

router.post("/login", (req,res)=>{
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error:"BAD_REQUEST" });

  const user = db.prepare("SELECT * FROM users WHERE username=?").get(String(username));
  if(!user || user.is_active !== 1) return res.status(401).json({ error:"INVALID_CREDENTIALS" });

  const ok = bcrypt.compareSync(String(password), user.password_hash);
  if(!ok) return res.status(401).json({ error:"INVALID_CREDENTIALS" });

  const token = signToken(user);
  res.json({ token, user:{ id:user.id, name:user.name, username:user.username, role:user.role }});
});

router.get("/health", (req,res)=>res.json({ ok:true }));

module.exports = router;
