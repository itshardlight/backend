import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const checkAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find admin user
    const adminUser = await User.findOne({ role: "admin" });
    if (adminUser) {
      console.log("👤 Admin User Found:");
      console.log("ID:", adminUser._id);
      console.log("Username:", adminUser.username);
      console.log("Email:", adminUser.email);
      console.log("Full Name:", adminUser.fullName);
      console.log("Role:", adminUser.role);
      console.log("Account Status:", adminUser.accountStatus);
      console.log("Is Verified:", adminUser.isVerified);
      console.log("Login Method:", adminUser.loginMethod);
      console.log("Created At:", adminUser.createdAt);
      
      // Try to test password
      console.log("\n🔐 Testing common passwords...");
      const testPasswords = ["admin123", "password", "123456", "admin"];
      
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await adminUser.comparePassword(testPassword);
          if (isMatch) {
            console.log(`✅ Password found: "${testPassword}"`);
            break;
          } else {
            console.log(`❌ Not: "${testPassword}"`);
          }
        } catch (err) {
          console.log(`❌ Error testing "${testPassword}":`, err.message);
        }
      }
    } else {
      console.log("❌ No admin user found");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
};

checkAdminUser();