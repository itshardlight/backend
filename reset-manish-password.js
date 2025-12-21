import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const resetManishPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Manish's user account
    const user = await User.findOne({ email: "manish11a891@gmail.com" });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("✅ Found user:", {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      requirePasswordChange: user.requirePasswordChange
    });

    // Reset password to the expected format
    const newPassword = "manish@11A891";
    user.password = newPassword;
    user.requirePasswordChange = true;
    
    await user.save();
    
    console.log("✅ Password reset successfully!");
    console.log(`   Username: ${user.username}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Require Password Change: ${user.requirePasswordChange}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

resetManishPassword();