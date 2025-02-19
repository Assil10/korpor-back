const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


exports.signUp = async (req, res) => {
  try {
    const { name, surname, email, password, birthdate } = req.body;

    if (!name || !surname || !email || !password || !birthdate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a new 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000; // Code expires in 10 minutes

    // Find the last registered user and get the highest accountNo
    const lastUser = await User.findOne().sort({ accountNo: -1 });
    const newAccountNo = lastUser && lastUser.accountNo ? lastUser.accountNo + 1 : 1000;

    const newUser = new User({
      accountNo: newAccountNo,
      name,
      surname,
      email,
      password: hashedPassword,
      birthdate,
      approvalStatus: "pending",
      resetCode: verificationCode,
      resetCodeExpires: expiryTime,
    });

    await newUser.save();

    // Send the verification code via email
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification Code",
      text: `Your email verification code is: ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Sign-up request submitted successfully. Check your email for verification code.",
      accountNo: newUser.accountNo,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



exports.verifysign= async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });

    if (!user || user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    if (Date.now() > user.resetCodeExpires) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    //  Approve the user
    user.approvalStatus = "approved";
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully. Your account is now active!" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



exports.signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: "Your account is not approved yet" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET, // Use a strong secret key from .env
      { expiresIn: "7d" } // Token valid for 7 days
    );

    res.json({
      message: "Sign-in successful",
      token,
      user: {
        accountNo: user.accountNo,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};




exports.register = async (req, res) => {
  try {
    const { name, surname, email, password, birthdate } = req.body;

    if (!name || !surname || !email || !password || !birthdate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Find the last registered user and get the highest accountNo
    const lastUser = await User.findOne().sort({ accountNo: -1 });
    const newAccountNo = lastUser && lastUser.accountNo ? lastUser.accountNo + 1 : 1000; // Start from 1000

    const newUser = new User({
      accountNo: newAccountNo,
      name,
      surname,
      email,
      password: hashedPassword,
      birthdate,
      role: 'user',
      approvalStatus: 'pending'
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration request submitted successfully. Await admin approval.",
      accountNo: newUser.accountNo
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (user.approvalStatus !== 'approved')
      return res.status(403).json({ message: "Registration pending admin approval" });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );

    res.json({
      user: {
        accountNo: user.accountNo || "12345", // Default value if accountNo is missing
        email: user.email,
        role: user.role || ["user"], // Default role if missing
        exp: Math.floor(Date.now() / 1000) + 3600, // Token expiry time
      },
      token: token
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


/*exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000;
    user.resetCode = resetCode;
    user.resetCodeExpires = expiryTime;
    await user.save();
    // In a real application, send the email via nodemailer
    console.log(`Password reset code for ${email}: ${resetCode}`);
    res.json({ message: "Verification code sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};*/
require('dotenv').config();  // Ensure you load .env variables
const nodemailer = require('nodemailer');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate the reset code and set its expiry time
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000;
    user.resetCode = resetCode;
    user.resetCodeExpires = expiryTime;
    await user.save();

    // Create a Nodemailer transporter using credentials from .env
    let transporter = nodemailer.createTransport({
      service: 'gmail', // You can replace 'gmail' with your email provider
      auth: {
        user: process.env.EMAIL_USER, // Your email from .env
        pass: process.env.EMAIL_PASS, // Your email password from .env
      },
    });

    // Email content
    let mailOptions = {
      from: process.env.EMAIL_USER,  // Sender's email from .env
      to: email,                    // Recipient's email
      subject: 'Password Reset Code', // Email subject
      text: `Your password reset code is: ${resetCode}`, // Email body
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.json({ message: "Verification code sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code are required" });
    const user = await User.findOne({ email });
    if (!user || user.resetCode !== code)
      return res.status(400).json({ message: "Invalid or expired verification code" });
    if (Date.now() > user.resetCodeExpires)
      return res.status(400).json({ message: "Verification code has expired" });
    res.json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ message: "All fields are required" });
    const user = await User.findOne({ email });
    if (!user || user.resetCode !== code)
      return res.status(400).json({ message: "Invalid or expired verification code" });
    if (Date.now() > user.resetCodeExpires)
      return res.status(400).json({ message: "Verification code has expired" });
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
