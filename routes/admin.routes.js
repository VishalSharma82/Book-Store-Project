const express = require("express");
const router = express.Router();
const postModel = require("../models/postbook");
const userModel = require("../models/user");
// const postModel = require("../../Book-Store-Project/models/postbook");
// const userModel = require("../../Book-Store-Project/models/user");
// this is used for local run purpose
const isLoggedIn = require("../middleware/isLoggedIn");
const isAdmin = require("../middleware/isAdmin");

// 🧠 Dashboard Home
router.get("/dashboard", isLoggedIn, isAdmin, async (req, res) => {
  const totalBooks = await postModel.countDocuments();
  const adminBooks = await postModel.countDocuments({ addedBy: "admin" });
  const users = await userModel.countDocuments({ role: "user" });

  res.render("admin/dashboard", {
    totalBooks,
    adminBooks,
    users
  });
});

// ➕ Add Book Page
router.get("/add-book", isLoggedIn, isAdmin, (req, res) => {
  res.render("admin/add-book");
});

// 📚 Save New Book (ADMIN)
router.post("/add-book", isLoggedIn, isAdmin, async (req, res) => {
  const { title, price, quantity } = req.body;

  await postModel.create({
    title,
    price,
    quantity,
    bookType: "new",
    addedBy: "admin",
    source: "manual"
  });

  res.redirect("/admin/manage-books");
});

// 📦 Manage Books
router.get("/manage-books", isLoggedIn, isAdmin, async (req, res) => {
  const books = await postModel.find({ addedBy: "admin" }).lean();
  res.render("admin/manage-books", { books });
});

// ✏ Edit Book
router.get("/edit-book/:id", isLoggedIn, isAdmin, async (req, res) => {
  const book = await postModel.findById(req.params.id).lean();
  res.render("admin/edit-book", { book });
});

// 💾 Update Book
router.post("/edit-book/:id", isLoggedIn, isAdmin, async (req, res) => {
  await postModel.findByIdAndUpdate(req.params.id, req.body);
  res.redirect("/admin/manage-books");
});

// ❌ Delete Book
router.post("/delete-book/:id", isLoggedIn, isAdmin, async (req, res) => {
  await postModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin/manage-books");
});

module.exports = router;
