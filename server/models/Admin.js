const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  contact: { type: Number, unique:true, required: true },
  emailId: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  verificationPassword: { type: String, required: true },
});

module.exports = mongoose.model("Admin", adminSchema);
