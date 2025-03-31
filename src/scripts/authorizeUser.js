export default function authorizeUser(req, res, allowedUsers, ensureClientUserParity) {
  if (!(allowedUsers.includes(req.user.loginType))) {
    if (parseInt(req.params.id) !== parseInt(req.user.userId) || !(ensureClientUserParity)) {
      return false;
    }
  }
  return true;
}
