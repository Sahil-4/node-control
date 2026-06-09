function verifyAuth(req, res) {
  res.json({ ok: true, user: req.auth.user });
}

module.exports = {
  verifyAuth
};
