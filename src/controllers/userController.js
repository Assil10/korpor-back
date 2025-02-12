const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -resetCode -resetCodeExpires');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ ...user.toObject(), role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.cloudinaryPublicId) await cloudinary.uploader.destroy(user.cloudinaryPublicId);
    
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'profile_pictures' },
      async (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Cloudinary upload error", error });
        }
        user.profilePicture = result.secure_url;
        user.cloudinaryPublicId = result.public_id;
        await user.save();
        return res.json({ message: "Profile picture updated", profilePicture: user.profilePicture });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
