require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const moment = require('moment');
const User = require('../models/User');
const { generateOTP } = require('../middleware/otpMiddleware');

// Helper: Create and return a nodemailer transporter
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Helper: Send verification email with a rich HTML template
const sendVerificationEmail = async (
  email,
  verificationCode,
  userName,
  userLocation,
  userIp,
  date,
  time
) => {
  try {
    const transporter = createTransporter();

    // Example icons (replace with your own if desired)
    const locationIcon = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
    const ipIcon = "https://cdn-icons-png.flaticon.com/512/841/841364.png";
    const calendarIcon = "https://cdn-icons-png.flaticon.com/512/747/747310.png";
    const timeIcon = "https://cdn-icons-png.flaticon.com/512/2911/2911643.png";

    const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mail Verification - Korpor</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15); }
    .header { background-color: #4c51bf; color: #ffffff; text-align: center; padding: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content h2 { margin-top: 0; font-size: 20px; color: #333333; }
    p { line-height: 1.6; color: #555555; margin-bottom: 15px; }
    .info-table { width: 100%; margin: 25px 0; border-collapse: separate; border-spacing: 15px; }
    .info-table td { background-color: #f9fafb; border-radius: 6px; padding: 12px; vertical-align: middle; }
    .info-content { display: flex; align-items: center; gap: 10px; }
    .info-content img { width: 22px; height: 22px; }
    .code { font-size: 36px; font-weight: bold; letter-spacing: 2px; color: #4c51bf; text-align: center; margin: 25px 0; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #888888; }
    .button-container { text-align: center; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 25px; background-color: #4c51bf; color: rgb(178, 149, 149); text-decoration: none; border-radius: 4px; font-weight: bold; }
    .button:hover { opacity: 0.9; }
    .small { font-size: 12px; color: #aaaaaa; text-align: center; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Korpor - Mail Verification</h1>
    </div>
    <div class="content">
      <h2>Hi ${userName},</h2>
      <p>
        You recently requested a mail verification (OTP) for your <strong>Korpor</strong> account.
        Please use the code below to complete your verification:
      </p>
      <table class="info-table">
        <tr>
          <td>
            <div class="info-content">
              <img src="${locationIcon}" alt="Location" />
              <span><strong>Location:</strong> ${userLocation}</span>
            </div>
          </td>
          <td>
            <div class="info-content">
              <img src="${ipIcon}" alt="IP" />
              <span><strong>IP Address:</strong> ${userIp}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="info-content">
              <img src="${calendarIcon}" alt="Date" />
              <span><strong>Date:</strong> ${date}</span>
            </div>
          </td>
          <td>
            <div class="info-content">
              <img src="${timeIcon}" alt="Time" />
              <span><strong>Time:</strong> ${time}</span>
            </div>
          </td>
        </tr>
      </table>
      <p>Please enter this OTP to verify your account:</p>
      <div class="code">${verificationCode}</div>
      <p class="small"><em>Note: This code is valid for 15 minutes.</em></p>
      <p>If you did not request this code, please secure your account immediately.</p>
      <div class="button-container">
        <a href="https://your-app.com/secure-account" class="button">Secure</a>
      </div>
      <p>Thank you for choosing <strong>Korpor</strong>.</p>
      <p>
        Make sure this email is from <strong>Korpor</strong>:
        <a href="mailto:support@your-app.com">support@your-app.com</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Korpor Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification Code",
      html: emailTemplate,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

// Stub: Send approval request to admins
const sendApprovalRequestToAdmins = async (user) => {
  // Implement your admin notification logic here.
  console.log(`Admin approval requested for user: ${user.email}`);
};

// ======================= Controller Endpoints =======================

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
    // Generate a 4-digit OTP valid for 10 minutes
    const { otp: verificationCode, expiry: expiryTime } = generateOTP({ digits: 4, expiryMinutes: 10 });

    // Determine new account number
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

    // Send simple email verification message
    const transporter = createTransporter();
    const textTemplate = `Please use the following code to verify your email: ${verificationCode}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification Code",
      html: textTemplate,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Sign-up request submitted successfully. Check your email for the verification code.",
      accountNo: newUser.accountNo,
    });
  } catch (error) {
    console.error("SignUp Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.verifysign = async (req, res) => {
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

    // Approve user
    user.approvalStatus = "approved";
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully. Your account is now active!" });
  } catch (error) {
    console.error("verifySign Error:", error);
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
    console.error("SignIn Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, surname, email, password, userIp, userLocation } = req.body;
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      // Re-register expired or unverified user
      if (existingUser.expired || (existingUser.approvalStatus === 'unverified' && !existingUser.isVerified)) {
        console.log("Re-registering expired/unverified user...");
        existingUser.name = name;
        existingUser.surname = surname;
        existingUser.password = await bcrypt.hash(password, 10);
        existingUser.isVerified = false;
        existingUser.approvalStatus = "unverified";
        existingUser.expired = false;
        // Generate a 6-digit OTP valid for 5 minutes
        const { otp: verificationCode, expiry: expirationTime } = generateOTP({ digits: 6, expiryMinutes: 5 });
        existingUser.resetCode = verificationCode;
        existingUser.resetCodeExpires = expirationTime;
        await existingUser.save();

        const finalUserIp = userIp || '0.0.0.0';
        const finalUserLocation = userLocation || 'Unknown Location';
        await sendVerificationEmail(
          email,
          verificationCode,
          `${existingUser.name} ${existingUser.surname}`,
          finalUserLocation,
          finalUserIp,
          moment().format("dddd, MMMM Do YYYY"),
          moment().format("h:mm:ss A")
        );

        return res.status(200).json({
          message: "User re-registered. Check your email for the verification code.",
          accountNo: existingUser.accountNo,
        });
      }
      if (existingUser.approvalStatus === 'approved' && !existingUser.expired) {
        return res.status(400).json({ message: "User already exists" });
      }
    }

    console.log("Registering new user...");
    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp: verificationCode, expiry: expirationTime } = generateOTP({ digits: 6, expiryMinutes: 5 });
    const lastUser = await User.findOne().sort({ accountNo: -1 });
    const newAccountNo = lastUser && lastUser.accountNo ? lastUser.accountNo + 1 : 1000;

    const newUser = new User({
      accountNo: newAccountNo,
      name,
      surname,
      email,
      password: hashedPassword,
      role: "user",
      approvalStatus: "unverified",
      isVerified: false,
      resetCode: verificationCode,
      resetCodeExpires: expirationTime,
    });

    await newUser.save();
    console.log("New user registered:", newUser);

    const finalUserIp = userIp || '0.0.0.0';
    const finalUserLocation = userLocation || 'Unknown Location';
    const date = moment().format("dddd, MMMM Do YYYY");
    const time = moment().format("h:mm:ss A");
    const userName = `${name} ${surname}`;

    await sendVerificationEmail(
      email,
      verificationCode,
      userName,
      finalUserLocation,
      finalUserIp,
      date,
      time
    );

    res.status(201).json({
      message: "Registration request submitted. Check your email for the verification code.",
      accountNo: newUser.accountNo,
    });
  } catch (error) {
    console.error("Registration Error:", error);
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

    user.isVerified = true;
    user.resetCode = null;
    user.resetCodeExpires = null;
    user.approvalStatus = "pending";
    await user.save();

    await sendApprovalRequestToAdmins(user);

    res.json({ message: "Email verified successfully. Waiting for admin approval." });
  } catch (error) {
    console.error("verifyRegister Error:", error);
    res.status(500).json({ message: "Server error", error });
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
    if (user.resetCode) {
      return res.status(403).json({ message: "Email verification required. Check your email for the OTP." });
    }
    if (user.approvalStatus !== "approved") {
      return res.status(403).json({ message: "Registration pending admin approval" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      user: {
        id: user._id,
        accountNo: user.accountNo || "12345",
        email: user.email,
        role: user.role || "user",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Generate a 6-digit reset code valid for 10 minutes
    const { otp: resetCode, expiry: expiryTime } = generateOTP({ digits: 6, expiryMinutes: 10 });
    user.resetCode = resetCode;
    user.resetCodeExpires = expiryTime;
    await user.save();

    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Verification code sent to email" });
  } catch (error) {
    console.error("ForgotPassword Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.verifyCode = async (req, res) => {
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

    res.json({ message: "Code verified successfully" });
  } catch (error) {
    console.error("VerifyCode Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    if (Date.now() > user.resetCodeExpires) {
      return res.status(400).json({ message: "Verification code has expired" });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("ResetPassword Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
