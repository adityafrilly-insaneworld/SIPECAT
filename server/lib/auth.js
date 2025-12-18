const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change-me-please";

function signToken(user){
  return jwt.sign(
    { sub:user.id, role:user.role, username:user.username, name:user.name },
    JWT_SECRET,
    { expiresIn:"12h" }
  );
}

function authMiddleware(req,res,next){
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error:"UNAUTHORIZED" });
  try{
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  }catch{
    return res.status(401).json({ error:"UNAUTHORIZED" });
  }
}

function requireRole(roles){
  return (req,res,next)=>{
    if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error:"FORBIDDEN" });
    next();
  };
}

module.exports = { signToken, authMiddleware, requireRole };
