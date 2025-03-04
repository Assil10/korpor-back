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
      { expiresIn: "4h" } // Token valid for 4 hours
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
    const { name, surname, email, password } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const expirationTime = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Find last registered user and get highest accountNo
    const lastUser = await User.findOne().sort({ accountNo: -1 });
    const newAccountNo = lastUser && lastUser.accountNo ? lastUser.accountNo + 1 : 1000; // Start from 1000

    const newUser = new User({
      accountNo: newAccountNo,
      name,
      surname,
      email,
      password: hashedPassword,
      role: "user",
      approvalStatus: "pending",
      resetCode: verificationCode.toString(),
      resetCodeExpires: expirationTime
    });

    await newUser.save();

    // Send email with verification code
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
      text: `Your email verification code is: ${verificationCode}. It will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Registration request submitted successfully. Check your email for the verification code.",
      accountNo: newUser.accountNo,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};




exports.verifyregister = async (req, res) => {
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

    // Clear the verification code
    user.resetCode = null;
    user.resetCodeExpires = null;

    // Send request to admin for approval
    await sendApprovalRequestToAdmins(user);

    res.json({ message: "Email verified successfully. Waiting for admin approval." });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Function to notify admins & super admins about new approval request
const sendApprovalRequestToAdmins = async (user) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "super admin"] } });

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (let admin of admins) {
      let mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: "New User Approval Request",
        text: `A new user (${user.name} ${user.surname} - ${user.email}) has completed email verification and is awaiting approval.`,
      };

      await transporter.sendMail(mailOptions);
    }

  } catch (error) {
    console.error("Error sending approval request emails:", error);
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if OTP verification is incomplete
    if (user.resetCode) {
      return res.status(403).json({ message: "Email verification required. Check your email for the OTP." });
    }

    // Check if the account is still waiting for admin approval
    if (user.approvalStatus !== "approved") {
      return res.status(403).json({ message: "Registration pending admin approval" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      user: {
        id: user._id,  // Include user ID in response
        accountNo: user.accountNo || "12345",
        email: user.email,
        role: user.role || ["user"],
        exp: Math.floor(Date.now() / 1000) + 3600, // Token expiry time
      },
      token: token
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



exports.checkUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.approvalStatus !== 'approved') {
      await User.deleteOne({ email });
      return res.json({ message: 'User was not approved and has been deleted' });
    }

    res.json({ message: 'User is approved' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
