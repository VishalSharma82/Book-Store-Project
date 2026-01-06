const jwt = require("jsonwebtoken");

function isLoggedIn(req, res, next) {
  try {
    const token = req.cookies.token;

    if (token) {
      const data = jwt.verify(token, "shailen");
      req.user = data;
      req.session.user = req.session.user || {
        _id: data.userId,
        email: data.email,
      };
      return next();
    }

    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }

    return res.redirect("/login");
  } catch (err) {
    return res.redirect("/login");
  }
}

module.exports = isLoggedIn;
