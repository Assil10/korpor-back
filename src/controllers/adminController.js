const bcrypt = require('bcryptjs');
const User = require('../models/User');

// For demonstration, we log email sending instead of sending via nodemailer.
const sendEmail = async (email, subject, text) => {
  console.log(`Email sent to ${email}: ${subject} - ${text}`);
};

exports.getRegistrationRequests = async (req, res) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: 'pending' });
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    if (!['user', 'admin', 'super admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.approvalStatus !== 'pending')
      return res.status(400).json({ message: "User has already been processed" });
    user.approvalStatus = 'approved';
    user.role = role;
    await user.save();
    res.json({ message: "User approved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.approvalStatus !== 'pending')
      return res.status(400).json({ message: "User has already been processed" });
    user.approvalStatus = 'rejected';
    await user.save();
    await sendEmail(user.email, "Registration Rejected", "Your registration has been rejected.");
    res.json({ message: "User rejected successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, surname, email, password, birthdate, role } = req.body;
    if (!name || !surname || !email || !password || !birthdate || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      surname,
      email,
      password: hashedPassword,
      birthdate,
      role,
      approvalStatus: 'approved'
    });
    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, surname, email, password, birthdate, role, approvalStatus } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (name) user.name = name;
    if (surname) user.surname = surname;
    if (email) user.email = email;
    if (birthdate) user.birthdate = birthdate;
    if (role) user.role = role;
    if (approvalStatus) user.approvalStatus = approvalStatus;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
