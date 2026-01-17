import mongoose from "mongoose";
import User from "./models/User.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const checkFeeUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Find the fee department user
    const feeUser = await User.findOne({ username: 'fee_department' });
    
    if (!feeUser) {
      console.log("❌ Fee department user not found");
      
      // List all users with fee_department role
      const feeUsers = await User.find({ role: 'fee_department' });
      console.log(`Found ${feeUsers.length} users with fee_department role:`);
      feeUsers.forEach(user => {
        console.log(`- Username: ${user.username}, Email: ${user.email}`);
      });
      
      return;
    }
    
    console.log("✅ Fee department user found:");
    console.log("Username:", feeUser.username);
    console.log("Email:", feeUser.email);
    console.log("Role:", feeUser.role);
    console.log("Is Verified:", feeUser.isVerified);
    
    // Test password
    const testPassword = 'feedept123';
    const isPasswordValid = await bcrypt.compare(testPassword, feeUser.password);
    console.log("Password test result:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("❌ Password is incorrect. Let me reset it...");
      
      // Reset password
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      feeUser.password = hashedPassword;
      await feeUser.save();
      
      console.log("✅ Password reset successfully!");
    }

  } catch (error) {
    console.error("❌ Error checking fee user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

checkFeeUser();