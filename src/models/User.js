const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String },
  surname: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  birthdate: { type: Date },
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  role: { type: String, enum: ['super admin', 'admin', 'user'], default: 'user' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  profilePicture: { type: String, default: '' },
  cloudinaryPublicId: { type: String, default: '' }
});

module.exports = mongoose.model('User', userSchema);
