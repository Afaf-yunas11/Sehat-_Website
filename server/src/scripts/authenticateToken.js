import jwt from "jsonwebtoken";

function authenticateToken(req, res, next) {
  const token = req.cookies.token;    
  if (!token) {
    return res.status(401).json({ error: "INVALID TOKEN FORMAT" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "INVALID OR EXPIRED TOKEN" });
  }
}

export default authenticateToken;