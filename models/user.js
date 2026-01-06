const { name } = require('ejs');
const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://red55555boy:hG6hxumIGazZKuyr@booket-db.b41cx.mongodb.net/?retryWrites=true&w=majority&appName=booket-db");
const userSchema = new mongoose.Schema({
  name: String,
  phone: Number,
  email: String,
  password: String,
  pincode: Number,

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'   // 👈 IMPORTANT (old users safe)
  },

  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'postbook' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }]
});


module.exports = mongoose.model('user', userSchema);