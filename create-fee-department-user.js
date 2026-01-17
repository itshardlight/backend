import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const createFeeDepartmentUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Check all users with fee_department role
    const existingUsers = await User.find({ role: "fee_department" });
    console.log("Existing fee department users:", existingUsers.length);
    
    existingUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Username: ${user.username}`);
    });

    // Check if our specific fee department user exists
    const specificUser = await User.findOne({ email: "fee@school.com" });
    if (specificUser) {
      console.log("Fee department user with email fee@school.com already exists:");
      console.log("Email:", specificUser.email);
      console.log("Username:", specificUser.username);
      console.log("Role:", specificUser.role);
      return;
    }

    // Create fee department user
    const hashedPassword = await bcrypt.hash("feedept123", 10);
    
    const feeDepartmentUser = new User({
      username: "fee_department",
      email: "fee@school.com",
      password: hashedPassword,
      role: "fee_department",
      fullName: "Fee Department",
      isVerified: true
    });

    await feeDepartmentUser.save();

    console.log("✅ Fee department user created successfully!");
    console.log("Login credentials:");
    console.log("Email: fee@school.com");
    console.log("Password: feedept123");
    console.log("Role: fee_department");

  } catch (error) {
    console.error("❌ Error creating fee department user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

createFeeDepartmentUser();