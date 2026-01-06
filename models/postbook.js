const mongoose = require('mongoose');
const bookPostSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false   // 👈 admin books ke liye optional
  },

  addedBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  source: {
    type: String,
    enum: ['manual', 'api'],
    default: 'manual'
  },

  title: String,
  bookPurpose: {
    type: String,
    enum: ['sell'],
    default: 'sell'
  },

  bookType: {
    type: String,
    enum: ['new', 'used'],
    required: true
  },

  bookCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair'],
    required: function () {
      return this.bookType === 'used';
    }
  },

  quantity: Number,
  price: Number,
  shippingCharges: Number,
  freeShipping: Boolean,

  sellerDetails: {
    name: String,
    email: String,
    address: String,
    phone: String
  }
});


module.exports = mongoose.model('postbook', bookPostSchema);
