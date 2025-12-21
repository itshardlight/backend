import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Student from "./models/Student.js";

dotenv.config();

const updateManishCredentials = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Manish's student record
    const manishStudent = await Student.findOne({ 
      firstName: { $regex: /manish/i }
    });

    if (!manishStudent) {
      console.log("❌ Manish student not found");
      return;
    }

    console.log("👤 Found Manish student:");
    console.log(`   Name: ${manishStudent.firstName} ${manishStudent.lastName}`);
    console.log(`   Student ID: ${manishStudent._id}`);
    console.log(`   User ID: ${manishStudent.userId}`);
    console.log(`   Roll Number: ${manishStudent.rollNumber}`);

    // Find and update his user account
    if (manishStudent.userId) {
      const userAccount = await User.findById(manishStudent.userId);
      
      if (userAccount) {
        console.log("\n🔄 Updating user credentials...");
        console.log(`   Old username: ${userAccount.username}`);
        
        // Update credentials
        userAccount.username = "manish";
        userAccount.password = "manish"; // This will be hashed automatically by the pre-save middleware
        userAccount.requirePasswordChange = false; // Remove password change requirement
        
        await userAccount.save();
        
        console.log("✅ User credentials updated successfully!");
        console.log("🔑 New login credentials:");
        console.log("   Username: manish");
        console.log("   Password: manish");
        console.log(`   Email: ${userAccount.email}`);
        console.log(`   Role: ${userAccount.role}`);
      } else {
        console.log("❌ User account not found for this student");
      }
    } else {
      console.log("❌ No user ID linked to this student record");
    }

  } catch (error) {
    console.error("❌ Error updating credentials:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
};

updateManishCredentials();