import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin only." 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
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

export default router;
