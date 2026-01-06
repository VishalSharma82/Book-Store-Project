function isAdmin(req, res, next) {
  if (!req.user || !req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).send("Admin access only");
  }

  next();
}

module.exports = isAdmin;
