const express = require("express");
const router = express.Router();
const postModel = require("../models/postbook");
// const postModel = require("../../Book-Store-Project/models/postbook");
// this is for local run purpose
const { searchGoogleBooks } = require("../services/googleBooks.service");
const isLoggedIn = require("../middleware/isLoggedIn");
const isAdmin = require("../middleware/isAdmin");

// 🔍 Search Google Books
router.get("/google-books", isLoggedIn, isAdmin, async (req, res) => {
  const { q } = req.query;

  console.log("🔍 Google Books search query:", q); // 👈 ADD THIS

  if (!q) return res.json([]);

  const books = await searchGoogleBooks(q);
  console.log("📚 Books found:", books.length); // 👈 ADD THIS

  res.json(books);
});


// ⬇ Import Book
router.post("/import-google-book", isLoggedIn, isAdmin, async (req, res) => {
  const { title, thumbnail, description } = req.body;

  const book = await postModel.create({
    title,
    price: 299,              // default price (admin can edit later)
    quantity: 10,             // default stock
    bookType: "new",
    addedBy: "admin",
    source: "api",
    image: thumbnail,
    description
  });

  res.json({ success: true });
});

module.exports = router;
