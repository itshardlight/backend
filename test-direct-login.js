import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testDirectLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Test the exact login logic
    const username = 'fee_department';
    const password = 'feedept123';
    
    console.log(`🔍 Testing login for username: ${username}`);
    
    // Find user by username or email
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }
    
    console.log("✅ User found:");
    console.log("Username:", user.username);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    
    // Check password using the model method
    const isMatch = await user.comparePassword(password);
    console.log("Password match result:", isMatch);
    
    if (isMatch) {
      console.log("✅ Login would succeed!");
    } else {
      console.log("❌ Password doesn't match");
    }

  } catch (error) {
    console.error("❌ Error testing login:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

testDirectLogin();