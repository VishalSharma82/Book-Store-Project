const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require("../../Book-Store-Project/models/user");

// ===============================
// ADMIN LOGIN PAGE
// ===============================
router.get("/login", (req, res) => {
  res.render("admin/login");
});

// ===============================
// ADMIN LOGIN HANDLER
// ===============================
router.post("/login", async (req, res) => {
  try {
    // console.log("ADMIN LOGIN BODY:", req.body); // 👈 debug

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.redirect("/admin/login?error=missing");
    }

    const admin = await userModel.findOne({ email, role: "admin" });
    if (!admin) return res.redirect("/admin/login?error=notadmin");

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.redirect("/admin/login?error=invalid");

    req.session.user = {
      _id: admin._id.toString(),
      email: admin.email,
      role: "admin"
    };

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.redirect("/admin/login?error=server");
  }
});


// ===============================
// ADMIN LOGOUT
// ===============================
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

module.exports = router;
