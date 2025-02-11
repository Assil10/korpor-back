require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const setupSwagger = require('./swaggerConfig');
 

const app = express(); 

app.use(express.json());
app.use(cors());


setupSwagger(app)

// MongoDB Connection
mongoose.connect("mongodb+srv://korpor:korpor123@cluster0.dg69q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// User Schema & Model
const userSchema = new mongoose.Schema({
    name: String,
    surname: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    birthdate: Date,
    resetCode: String,
    resetCodeExpires: Date,
    role: { type: String, enum: ['super admin', 'admin', 'user'], default: 'user' } // Add role field
});


const User = mongoose.model('User', userSchema);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    host: "mail.korpor.com",
    port: 465, // Secure SSL port
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});


// Email Sending Function
const sendEmail = async (email, subject, text) => {
    try {
        const mailOptions = {
            from: `"Korpor Support" <${process.env.EMAIL_USER}>`, // Sender info
            to: email,
            subject,
            text
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.messageId);
    } catch (error) {
        console.error("Email sending error:", error);
    }
};

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user with a hashed password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *               role:
 *                 type: string
 *                 enum: [super admin, admin, user]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists or missing fields
 */

// User Registration Route
app.post('/register', async (req, res) => {
    try {
        const { name, surname, email, password, birthdate, role } = req.body; // Add role to request
        if (!name || !surname || !email || !password || !birthdate) {
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
            role: role || 'user' // Set role, default to 'user'
        });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns a token
 *       400:
 *         description: Invalid credentials
 */

// User Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        

        res.json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Middleware for Authentication
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: "Access denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token" });
    }
};


/**
 * @swagger
 * /protected:
 *   get:
 *     summary: Access a protected route
 *     description: Requires authentication via JWT.
 *     tags: [Protected]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Unauthorized
 */

// Protected Route Example
app.get('/protected', authenticate, (req, res) => {
    res.json({ message: "This is a protected route", user: req.user });
});


/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset verification code to the user's email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification code sent to email
 *       400:
 *         description: User not found
 */

// Forgot Password Route
app.post('/forgot-password', async (req, res) => {
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

        await sendEmail(user.email, "Password Reset Code", `Your password reset code is: ${resetCode}`);

        res.json({ message: "Verification code sent to email" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});


/**
 * @swagger
 * /verify-code:
 *   post:
 *     summary: Verify password reset code
 *     description: Validates the verification code for password reset.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code verified successfully
 *       400:
 *         description: Invalid or expired verification code
 */

// Verify Reset Code
app.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Invalid or expired verification code" });

        if (Date.now() > user.resetCodeExpires) return res.status(400).json({ message: "Verification code has expired" });

        res.json({ message: "Code verified successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});



/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Allows a user to reset their password using a verification code.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired verification code
 */

// Reset Password
app.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) return res.status(400).json({ message: "All fields are required" });

        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Invalid or expired verification code" });

        if (Date.now() > user.resetCodeExpires) return res.status(400).json({ message: "Verification code has expired" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetCode = null;
        user.resetCodeExpires = null;
        await user.save();

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});



/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves the profile information of the authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */

// ** get User Profile **
app.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -resetCode -resetCodeExpires');
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ ...user.toObject(), role: user.role }); 
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});



// ** Upload Profile Picture Configuration **
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profile_pictures';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });




/**
 * @swagger
 * /upload-profile-picture:
 *   post:
 *     summary: Upload user profile picture
 *     description: Allows an authenticated user to upload a profile picture.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: No file uploaded
 */

// ** Upload Profile Picture **
app.post('/upload-profile-picture', authenticate, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Remove old profile picture if it exists
        if (user.profilePicture) {
            const oldImagePath = `uploads/profile_pictures/${user.profilePicture}`;
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        user.profilePicture = req.file.filename;
        await user.save();

        res.json({ message: "Profile picture updated", profilePicture: `/uploads/profile_pictures/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});




// Role-based access control middleware
const checkRole = (roles) => {
    return (req, res, next) => {
        const userRole = req.user.role;  // Extract the user's role from the decoded JWT

        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: "Access denied: Insufficient privileges" });
        }

        next();  // Allow access to the next route
    };
};



// Example of a route accessible only by super admins and admins
app.get('/admin-dashboard', authenticate, checkRole(['super admin', 'admin']), (req, res) => {
    res.json({ message: "Welcome to the admin dashboard" });
});

// Example of a route accessible only by super admins
app.get('/super-admin-dashboard', authenticate, checkRole(['super admin']), (req, res) => {
    res.json({ message: "Welcome to the super admin dashboard" });
});



// Admin can view all users
app.get('/admin/users', authenticate, checkRole(['admin', 'super admin']), async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Super admin can create or modify any user
app.post('/admin/create-user', authenticate, checkRole(['super admin']), async (req, res) => {
    
});

// Super admin can delete users
app.delete('/admin/delete-user/:id', authenticate, checkRole(['super admin']), async (req, res) => {
    
});





/**
 * @swagger
 * /delete-user/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Allows a super admin to delete a user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */

//delete profile
app.delete('/delete-user/:id', authenticate, checkRole(['super admin']), async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndDelete(userId);  // Keep this method
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});




// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
