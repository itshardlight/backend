import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists");
      process.exit(0);
    }

    // Create default admin
    const admin = new User({
      username: "admin",
      email: "unishmhrjan@gmail.com",
      password: "pass123",
      role: "admin",
      isVerified: true
    });

    await admin.save();
    console.log("✅ Default admin created successfully");
    console.log("   Username: admin");
    console.log("   Email: unishmhrjan@gmail.com");
    console.log("   Password: pass123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createDefaultAdmin();
