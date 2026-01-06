const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  id: { type: String, required: true }, // Book ID (not unique globally)
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  isPurchased: {
    type: Boolean,
    default: false,
  },
});

// 🔑 Compound index → Same user cannot add same book twice,
// but different users can add the same book in their carts
cartSchema.index({ user: 1, id: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
