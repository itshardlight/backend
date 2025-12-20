import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Register route (default role: student)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Username or email already exists" 
      });
    }

    // Create user with default role "student"
    const user = new User({
      username,
      email,
      password,
      role: "student",
      isVerified: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful! You can now login.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }

    // Find user by username or email
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginMethod = "email";
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
        loginMethod: user.loginMethod,
        requirePasswordChange: user.requirePasswordChange,
        createdAt: user.createdAt
      },
      requirePasswordChange: user.requirePasswordChange
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Google login route
router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        success: false, 
        message: "Google credential is required" 
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update googleId and profile picture if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
      }
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
      }
      user.lastLogin = new Date();
      user.loginMethod = "google";
      await user.save();

      // User exists, allow login
      const token = generateToken(user._id);
      
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          accountStatus: user.accountStatus,
          lastLogin: user.lastLogin,
          loginMethod: user.loginMethod,
          createdAt: user.createdAt
        }
      });
    } else {
      // New user - create account
      user = new User({
        username: email.split('@')[0] + '_' + Date.now(),
        email,
        googleId,
        profilePicture: picture,
        role: "student",
        isVerified: true,
        lastLogin: new Date(),
        loginMethod: "google"
      });
      await user.save();

      const token = generateToken(user._id);
      
      return res.json({
        success: true,
        message: "Account created successfully!",
        token,
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          accountStatus: user.accountStatus,
          lastLogin: user.lastLogin,
          loginMethod: user.loginMethod,
          createdAt: user.createdAt
        }
      });
    }
  } catch (error) {
    console.error("❌ Google login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Google authentication failed" 
    });
  }
});

// Forgot password route
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "No account found with this email" 
      });
    }

    if (user.googleId) {
      return res.status(400).json({ 
        success: false, 
        message: "This account uses Google login. Please sign in with Google." 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken, user.username);

    res.json({
      success: true,
      message: "Password reset link sent to your email"
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Reset password route
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: "Password is required" 
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired reset token" 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully! You can now login."
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Change password route (for authenticated users)
router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Check current password (skip for first-time password change)
    if (!user.requirePasswordChange) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect"
        });
      }
    }

    // Update password
    user.password = newPassword;
    user.requirePasswordChange = false;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully!"
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
