export default function authorizeUser(allowedUsers, ensureClientUserParity) {
  return function (req, res, next) {
    if (!allowedUsers.includes(req.user.loginType)) {
      if (parseInt(req.params.id) !== parseInt(req.user.userId) || !ensureClientUserParity) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }
    }
    next();
  };
}