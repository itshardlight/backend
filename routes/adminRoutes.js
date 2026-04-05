import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    console.log("🔍 isAdmin middleware - Full request body:", JSON.stringify(req.body, null, 2));
    const { userId } = req.body;
    console.log("🔍 Extracted userId:", userId, "Type:", typeof userId);
    
    if (!userId) {
      console.log("❌ No userId provided");
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }
    
    const user = await User.findById(userId);
    console.log("🔍 Database lookup result:", user ? { id: user._id, role: user.role, username: user.username } : "null");
    
    if (!user || user.role !== "admin") {
      console.log("❌ Access denied - User not found or not admin");
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin only." 
      });
    }
    
    console.log("✅ Admin access granted");
    next();
  } catch (error) {
    console.error("❌ isAdmin middleware error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
};

// Get all users (Admin only)
router.post("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -verificationOTP -resetPasswordToken")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Update user role (Admin only)
router.post("/update-role", isAdmin, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;

    if (!targetUserId || !newRole) {
      return res.status(400).json({ 
        success: false, 
        message: "Target user ID and new role are required" 
      });
    }

    if (!["admin", "teacher", "student", "parent", "fee_department"].includes(newRole)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role" 
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    user.role = newRole;
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${newRole}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Update role error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Delete user (Admin only)
router.post("/delete-user", isAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ 
        success: false, 
        message: "Target user ID is required" 
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Cannot delete admin users" 
      });
    }

    await User.findByIdAndDelete(targetUserId);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// Create user account (Admin only)
router.post("/create-user", isAdmin, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      role, 
      phone,
      department,
      subject 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "First name, last name, email, and role are required" 
      });
    }

    // Validate role
    if (!["admin", "teacher", "fee_department"].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role. Must be admin, teacher, or fee_department" 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already exists" 
      });
    }

    // Generate username and password
    let username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
    
    // Check if username already exists and make it unique
    let existingUsername = await User.findOne({ username });
    let counter = 1;
    while (existingUsername) {
      username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${counter}`;
      existingUsername = await User.findOne({ username });
      counter++;
    }
    
    const defaultPassword = `${firstName.toLowerCase()}@123`;

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: defaultPassword,
      fullName: `${firstName} ${lastName}`,
      role,
      isVerified: true,
      requirePasswordChange: true
    });

    await user.save();

    // Return user data and credentials
    res.json({
      success: true,
      message: "User account created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      },
      credentials: {
        email: user.email,
        password: defaultPassword,
        username: user.username
      }
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
});

export default router;
