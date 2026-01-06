const express = require("express");
const app = express();
const session = require("express-session");
const mongoose = require("mongoose");
const userModel = require("./models/user");
const postModel = require("./models/postbook");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
// const cartFile = path.join(__dirname, "cart.json");
const Cart = require("./models/cartModel");
const multer = require("multer");
const upload = multer(); // Initialize multer to handle form data
const Razorpay = require("razorpay"); // Require Razorpay
const shortid = require("shortid");
require("dotenv").config();
const isLoggedIn = require("./middleware/isLoggedIn");
const adminAuthRoutes = require("./routes/admin.auth");
const adminApiRoutes = require("./routes/admin.api");


const adminRoutes = require("./routes/admin.routes");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
// Session setup
app.use(
  session({
    secret: "shailen", // Change this to a more secure secret in production
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true, // Secure cookies in production
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
app.use("/admin", adminRoutes);
app.use("/admin", adminAuthRoutes);
app.use("/admin/api", adminApiRoutes);
app.use((req, res, next) => {
  // If the user is logged in, make their profile available in all views
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ... (Your existing routes: /, /account, /signup, /login, etc.) ...

app.get("/", (req, res) => {
  res.render("index"); // Render the index.ejs file
});

// ✅ Route to view account & cart details
app.get("/account", isLoggedIn, async (req, res) => {
  try {
    console.log("Fetching Account Data for:", req.user);
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const user = await userModel
      .findOne({ email: req.user.email })
      .populate("posts")
      .populate("cart") // 🛠️ Ensure cart is populated
      .lean();

    if (!user) {
      return res.redirect("/login");
    }

    // ✅ **Use `req.user._id` instead of `req.user.id`**

    const cartItems = await Cart.find({ user: userId }).lean();
    console.log("Cart Items Fetched:", cartItems);

    const totalItems = cartItems.length;
    const totalPrice = cartItems.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    res.render("account", {
      user: user,
      cartItems: cartItems,
      totalItems: totalItems,
      totalPrice: totalPrice.toFixed(2),
    });
  } catch (error) {
    console.error("Error fetching account data:", error.message);
    res.status(500).send("Server Error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/addbook", isLoggedIn, upload.none(), async (req, res) => {
  const {
    title,
    bookPurpose,
    bookType,
    bookCondition,
    quantity,
    price,
    shippingCharges,
    sellerName,
    sellerEmail,
    sellerAddress,
    sellerPhone,
    freeShipping, // Get value of the shipping
  } = req.body;

  const userId = req.user ? req.user.userId : null;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const newBook = new postModel({
      seller: userId,
      title,
      bookPurpose,
      bookType,
      bookCondition: bookType === "used" ? bookCondition : undefined, // Conditionally set bookCondition
      quantity: Number(quantity),
      price: Number(price),
      shippingCharges: Number(shippingCharges) || 0,
      freeShipping: freeShipping === "on", // Check if the box is checked
      sellerDetails: {
        name: sellerName,
        email: sellerEmail,
        address: sellerAddress,
        phone: sellerPhone,
      },
    });

    await newBook.save();

    await userModel.findByIdAndUpdate(userId, {
      $push: { posts: newBook._id },
    });

    res.redirect("/account");
  } catch (error) {
    console.error("Error saving book:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/signup", async (req, res) => {
  const { name, phone, email, password, pincode } = req.body;

  try {
    let existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.redirect("/signup?error=User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await userModel.create({
      name,
      phone,
      email,
      password: hash,
      pincode,
    });

    // ✅ redirect to login with success message
    res.redirect("/login?success=1");

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.redirect("/login?error=invalid");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirect("/login?error=invalid");
    }

    const token = jwt.sign(
      { email: user.email, userId: user._id.toString() },
      "shailen",
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    req.session.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      pincode: user.pincode,
    };

    res.redirect("/account");
  } catch (error) {
    console.error("Login Error:", error);
    res.redirect("/login?error=server");
  }
});


app.get("/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) }); // Properly clear the cookie
  req.session.destroy(); // Destroy session
  res.redirect("/login");
});

app.get("/about", (req, res) => {
  res.render("about");
});
// function isLoggedIn(req, res, next) {
//   try {
//     const token = req.cookies.token;
//     console.log("Token Received:", token);

//     if (token) {
//       let data = jwt.verify(token, "shailen");
//       console.log("JWT Verified Data:", data);
//       req.user = data;
//       req.session.user = req.session.user || {
//         _id: data.userId,
//         email: data.email,
//       };
//     } else if (req.session.user) {
//       console.log("Session User Found:", req.session.user);
//       req.user = req.session.user;
//     } else {
//       console.log("No token or session. Redirecting to login.");
//       return res.redirect("/login");
//     }

//     next();
//   } catch (err) {
//     console.error("JWT Verification Error:", err.message);
//     return res.redirect("/login");
//   }
// }
app.get("/addbook", (req, res) => {
  res.render("addbook");
});
// ✅ Route to view a single book post
app.get("/bookpost/:id", isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await postModel.findById(postId).lean();

    if (!post) {
      return res.status(404).send("Post not found");
    }

    res.render("bookpost_view", { post: post, user: req.user }); // Create bookpost_view.ejs
  } catch (error) {
    console.error("Error viewing book post:", error);
    res.status(500).send("Server Error");
  }
});

// ✅ Route to display the edit form
app.get("/bookpost/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await postModel.findById(postId).lean();

    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Verify that the logged-in user is the owner of the post
    if (post.seller.toString() !== req.user.userId) {
      return res.status(403).send("Unauthorized");
    }

    res.render("bookpost_edit", { post: post, user: req.user }); // Create bookpost_edit.ejs
  } catch (error) {
    console.error("Error displaying edit form:", error);
    res.status(500).send("Server Error");
  }
});

// ✅ Route to handle the edit form submission
app.post("/bookpost/edit/:id", isLoggedIn, upload.none(), async (req, res) => {
  try {
    const postId = req.params.id;

    // Verify that the logged-in user is the owner of the post
    const post = await postModel.findById(postId);
    if (post.seller.toString() !== req.user.userId) {
      return res.status(403).send("Unauthorized");
    }

    // Update the post
    await postModel.findByIdAndUpdate(postId, req.body);

    res.redirect("/account"); // Redirect to the account page
  } catch (error) {
    console.error("Error updating book post:", error);
    res.status(500).send("Server Error");
  }
});

// ✅ Route to delete a book post
app.post("/bookpost/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;

    // Verify that the logged-in user is the owner of the post
    const post = await postModel.findById(postId);
    if (post.seller.toString() !== req.user.userId) {
      return res.status(403).send("Unauthorized");
    }

    // Delete the post
    await postModel.findByIdAndDelete(postId);

    // Remove the post ID from the user's `posts` array
    await userModel.findByIdAndUpdate(req.user.userId, {
      $pull: { posts: postId },
    });

    res.redirect("/account"); // Redirect to the account page
  } catch (error) {
    console.error("Error deleting book post:", error);
    res.status(500).send("Server Error");
  }
});

app.get("/booksbrowse", async (req, res) => {
  try {
    const books = await postModel.find().populate("seller"); // Optional: populate seller info
    res.render("bookstore", { books });
  } catch (err) {
    console.error("Error loading bookstore:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/bookpost/view/:id", async (req, res) => {
  try {
    const book = await postModel.findById(req.params.id).populate("seller");
    if (!book) {
      return res.status(404).send("Book not found");
    }
    res.render("bookview", { book });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// Route to view the car
app.get("/cart", isLoggedIn, async (req, res) => {
  try {
    console.log("Fetching cart for user:", req.user._id);

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const cartItems = await Cart.find({ user: userId }).lean();

    console.log("Cart Items Fetched:", cartItems);

    res.render("account", {
      user: req.user, // 🛠️ Ensure user is passed
      cartItems: cartItems,
      totalItems: cartItems.length,
      totalPrice: cartItems
        .reduce((sum, item) => sum + parseFloat(item.price), 0)
        .toFixed(2),
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    res.status(500).send("Server Error");
  }
});

// ✅ Route to add an item to the cart (Structured like addbook)
app.post("/add-to-cart", isLoggedIn, upload.none(), async (req, res) => {
  const { bookId, name, price, image } = req.body;
  console.log("Received Data:", req.body);

  const userId = new mongoose.Types.ObjectId(req.user.userId);

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  if (!bookId) {
    return res.status(400).json({ error: "Book ID is required" });
  }

  try {
    // ✅ **Check if the book is already in the user's cart**
    const existingCartItem = await Cart.findOne({ user: userId, id: bookId });

    if (existingCartItem) {
      return res.status(400).json({ error: "Book is already in your cart" });
    }

    // ✅ **If book is not in cart, then add it**
    const newCartItem = new Cart({
      user: userId,
      id: bookId,
      name,
      price: Number(price),
      image,
    });

    await newCartItem.save();

    await userModel.findByIdAndUpdate(
      userId,
      { $push: { cart: newCartItem._id } },
      { new: true }
    );

    console.log("✅ Item added to cart:", newCartItem);

    res.redirect("/account");
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/remove-item/:id", isLoggedIn, async (req, res) => {
  try {
    const itemId = req.params.id; // Get item ID from URL
    console.log("Deleting item:", itemId);

    // Find and delete the cart item
    const deletedItem = await Cart.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).send("Item not found");
    }

    console.log("Deleted item:", deletedItem);

    res.redirect("/account"); // Redirect to account page after deleting
  } catch (error) {
    console.error("Error deleting cart item:", error.message);
    res.status(500).send("Server Error");
  }
});

// ✅ Checkout route
app.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const cartItems = await Cart.find({ user: userId }).lean();
    const totalPrice = cartItems.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    // Create Razorpay order
    const amountInPaise = totalPrice * 100; // Razorpay expects amount in paise
    const currency = "INR";
    const receiptId = shortid.generate(); // Generate a unique receipt ID

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: receiptId,
      payment_capture: 1, // Auto capture payment
    });

    console.log("Razorpay Order:", order);

    // Render checkout page with order details
    res.render("checkout", {
      user: req.user,
      cartItems: cartItems,
      totalPrice: totalPrice.toFixed(2),
      order: order,
      key_id: process.env.RAZORPAY_KEY_ID, // Pass Key ID to frontend
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).send("Checkout Failed");
  }
});
app.post("/checkout/book", isLoggedIn, async (req, res) => {
  try {
    const bookId = req.body.bookId;
    const book = await Book.findById(bookId).lean();

    if (!book) {
      return res.status(404).send("Book not found");
    }

    const amountInPaise = book.price * 100;
    const currency = "INR";
    const receiptId = shortid.generate();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receiptId,
      payment_capture: 1,
    });

    res.render("checkout", {
      user: req.user,
      book,
      totalPrice: book.price.toFixed(2),
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error during single book checkout:", error);
    res.status(500).send("Checkout Failed");
  }
});

// ✅ Payment verification route
app.post(
  "/payment/verification",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) // Replace with your Key Secret
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        // Payment is successful
        console.log("✅ Payment successful");
        res.send("Payment Successful!"); // Or redirect to a success page
      } else {
        // Payment failed
        console.log("❌ Payment failed - Signature mismatch");
        res.status(400).send("Payment Failed - Signature Mismatch");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).send("Payment Verification Error");
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(3000, () =>
  console.log(`Server running on http://localhost:${3000}`)
);
