const express = require("express");
const { db, nowISO, logAudit } = require("../lib/db");

const router = express.Router();
const CLASS_PREFIX = { OUTGOING:"OUT", CERTIFICATE:"KET" };
function pad(n,w=4){ const s=String(n); return s.length>=w?s:"0".repeat(w-s.length)+s; }
function yearFromDate(ymd){ return Number(String(ymd).slice(0,4)); }
function formatRegister(cls, year, no){ return `${CLASS_PREFIX[cls]}/${year}/${pad(no)}`; }

router.get("/", (req,res)=>{
  const cls = req.query.classification ? String(req.query.classification) : null;
  const year = req.query.year ? Number(req.query.year) : null;
  const q = req.query.q ? String(req.query.q).toLowerCase() : null;

  let rows = db.prepare("SELECT * FROM letters ORDER BY created_at DESC LIMIT 2000").all();
  if (cls && cls !== "ALL") rows = rows.filter(r=>r.classification===cls);
  if (year) rows = rows.filter(r=>r.year===year);
  if (q) rows = rows.filter(r=>`${r.register_display} ${r.letter_date} ${r.subject} ${r.party||""} ${r.status}`.toLowerCase().includes(q));
  res.json({ data: rows });
});

router.get("/counters/current", (req,res)=>{
  const rows = db.prepare("SELECT classification, year, last_number FROM letter_counters ORDER BY year DESC").all();
  res.json({ data: rows });
});

router.post("/", (req,res)=>{
  const { classification, letter_date, subject, party } = req.body || {};
  if(!classification || !letter_date || !subject) return res.status(400).json({ error:"BAD_REQUEST" });
  if(!["OUTGOING","CERTIFICATE"].includes(classification)) return res.status(400).json({ error:"BAD_CLASSIFICATION" });

  const year = yearFromDate(letter_date);
  const id = require("crypto").randomUUID();
  const createdBy = req.user.sub;

  const tx = db.transaction(()=>{
    const exists = db.prepare("SELECT id FROM letter_counters WHERE classification=? AND year=?").get(classification, year);
    if(!exists) db.prepare("INSERT INTO letter_counters (classification, year, last_number) VALUES (?, ?, 0)").run(classification, year);

    const current = db.prepare("SELECT last_number FROM letter_counters WHERE classification=? AND year=?").get(classification, year).last_number;
    const next = current + 1;
    db.prepare("UPDATE letter_counters SET last_number=? WHERE classification=? AND year=?").run(next, classification, year);

    const reg = formatRegister(classification, year, next);
    const now = nowISO();
    db.prepare(`INSERT INTO letters
      (id, classification, year, register_no, register_display, letter_date, subject, party, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?, ?, ?)
    `).run(id, classification, year, next, reg, letter_date, String(subject).trim(), party?String(party).trim():null, createdBy, now, now);

    const created = db.prepare("SELECT * FROM letters WHERE id=?").get(id);
    logAudit(createdBy, "CREATE", "letters", id, null, created);
    return created;
  });

  try{
    const created = tx();
    res.status(201).json({ data: created });
  }catch{
    res.status(500).json({ error:"SERVER_ERROR" });
  }
});

router.post("/:id/cancel", (req,res)=>{
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM letters WHERE id=?").get(id);
  if(!existing) return res.status(404).json({ error:"NOT_FOUND" });
  if(!["ADMIN","OPERATOR"].includes(req.user.role)) return res.status(403).json({ error:"FORBIDDEN" });
  if(existing.status==="BATAL") return res.json({ data: existing });

  const now = nowISO();
  db.prepare("UPDATE letters SET status='BATAL', updated_at=? WHERE id=?").run(now, id);
  const after = db.prepare("SELECT * FROM letters WHERE id=?").get(id);
  logAudit(req.user.sub, "CANCEL", "letters", id, existing, after);
  res.json({ data: after });
});

module.exports = router;
