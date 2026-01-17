import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const recreateFeeUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Delete existing fee department user
    await User.deleteOne({ username: 'fee_department' });
    console.log("🗑️ Deleted existing fee department user");

    // Create new fee department user
    const feeUser = new User({
      username: 'fee_department',
      email: 'fee@school.com',
      password: 'feedept123', // This will be hashed by the pre-save middleware
      role: 'fee_department',
      fullName: 'Fee Department',
      isVerified: true
    });

    await feeUser.save();
    console.log("✅ Created new fee department user");

    // Test the password immediately
    const isMatch = await feeUser.comparePassword('feedept123');
    console.log("Password test result:", isMatch);

    console.log("\n🎉 Fee department user credentials:");
    console.log("Username: fee_department");
    console.log("Password: feedept123");
    console.log("Email: fee@school.com");

  } catch (error) {
    console.error("❌ Error recreating fee user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

recreateFeeUser();