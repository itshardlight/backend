import express from "express";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
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
      await user.save();

      // User exists, allow login
      return res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture
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
        isVerified: true
      });
      await user.save();

      return res.json({
        success: true,
        message: "Account created successfully!",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture
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

export default router;
