require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { initDb, seedAdminIfNeeded } = require("./lib/db");
const { authMiddleware, requireRole } = require("./lib/auth");
const authRoutes = require("./routes/auth");
const lettersRoutes = require("./routes/letters");
const usersRoutes = require("./routes/users");

const app = express();
const PORT = Number(process.env.PORT || 8080);

initDb();
seedAdminIfNeeded();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

app.use("/api/auth", authRoutes);
app.use("/api/letters", authMiddleware, lettersRoutes);
app.use("/api/users", authMiddleware, requireRole(["ADMIN"]), usersRoutes);

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get(["/app", "/app/*"], (req, res) => res.sendFile(path.join(publicDir, "app.html")));
app.get("/", (req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
