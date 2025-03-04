const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  accountNo: { type: Number, unique: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  birthdate: { type: Date },
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['super admin', 'admin', 'user'], default: 'user' },
  approvalStatus: { type: String, enum: ['unverified', 'pending', 'approved', 'rejected'], default: 'unverified' },
  profilePicture: { type: String, default: '' },
  cloudinaryPublicId: { type: String, default: '' },
  expired: { type: Boolean, default: false } // 🔥 NEW FIELD
});

module.exports = mongoose.model('User', userSchema);
