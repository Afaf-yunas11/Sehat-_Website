import jwt from "jsonwebtoken";

function authenticateToken(req, res, next) {
  const token = req.cookies.token;    /*req has alot of things url cookies data*/
  if (!token) {
    return res.status(401).json({ error: "INVALID TOKEN FORMAT" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //verify key
    req.user = decoded;     //can use req.user.name
    next();   //next middleware
  } catch (error) {
    return res.status(403).json({ error: "INVALID OR EXPIRED TOKEN" });
  }
}

export default authenticateToken;