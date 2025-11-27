import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const fixUserAccount = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find the user
    const user = await User.findOne({ email: "unishmhrjan@gmail.com" });
    
    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("Current user status:");
    console.log("- Email:", user.email);
    console.log("- Username:", user.username);
    console.log("- Has Google ID:", !!user.googleId);
    console.log("- Has Password:", !!user.password);
    console.log("");

    // Remove googleId to allow password reset
    user.googleId = undefined;
    
    // Set a default password if none exists
    if (!user.password) {
      user.password = "admin123"; // Will be hashed automatically
      console.log("✅ Set default password: admin123");
    }
    
    await user.save();
    
    console.log("✅ User account updated!");
    console.log("You can now:");
    console.log("1. Login with email/password");
    console.log("2. Use forgot password feature");
    console.log("3. Login with Google (will re-link Google account)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixUserAccount();
