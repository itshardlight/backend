import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const updateAdminEmail = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    // Find admin user
    const admin = await User.findOne({ username: "admin" });
    
    if (!admin) {
      console.log("❌ Admin user not found");
      process.exit(1);
    }

    // Update email and verify status
    admin.email = "unishmhrjan@gmail.com";
    admin.isVerified = true;
    await admin.save();

    console.log("✅ Admin email updated successfully");
    console.log("   Username:", admin.username);
    console.log("   Email:", admin.email);
    console.log("   Role:", admin.role);
    console.log("   Verified:", admin.isVerified);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

updateAdminEmail();
