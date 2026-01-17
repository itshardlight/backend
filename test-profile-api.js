import mongoose from "mongoose";
import Profile from "./models/Profile.js";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testProfileAPI = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Find all profiles
    const profiles = await Profile.find({})
      .populate('userId', 'username email role')
      .populate('createdBy', 'username fullName');

    console.log(`\n📋 Found ${profiles.length} profiles:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Profile Details:`);
      console.log(`   ID: ${profile._id}`);
      console.log(`   Name: ${profile.firstName} ${profile.lastName}`);
      console.log(`   User ID: ${profile.userId?._id}`);
      console.log(`   User Email: ${profile.userId?.email}`);
      console.log(`   User Role: ${profile.userId?.role}`);
      console.log(`   Academic: ${profile.academic?.currentGrade}-${profile.academic?.section} (Roll: ${profile.academic?.rollNumber})`);
      console.log(`   Fee Info: Total ₹${profile.feeInfo?.totalFee || 0}, Paid ₹${profile.feeInfo?.paidAmount || 0}`);
      console.log(`   Created: ${profile.createdAt}`);
    });

    // Test the specific profile API logic
    console.log("\n🔍 Testing profile API logic for students:");
    
    const studentUsers = await User.find({ role: 'student' });
    console.log(`Found ${studentUsers.length} student users`);
    
    for (const user of studentUsers) {
      console.log(`\n👤 Testing for user: ${user.username} (${user.email})`);
      
      // Try to find profile by userId
      let profile = await Profile.findOne({ userId: user._id })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
      
      if (profile) {
        console.log(`   ✅ Found profile: ${profile.firstName} ${profile.lastName}`);
        console.log(`   Academic: ${profile.academic?.currentGrade}-${profile.academic?.section}`);
        console.log(`   Fee Info exists: ${!!profile.feeInfo}`);
        if (profile.feeInfo) {
          console.log(`   Fee Total: ₹${profile.feeInfo.totalFee || 0}`);
          console.log(`   Fee Paid: ₹${profile.feeInfo.paidAmount || 0}`);
          console.log(`   Fee Status: ${profile.feeInfo.paymentStatus || 'unknown'}`);
        }
      } else {
        console.log(`   ❌ No profile found for this user`);
      }
    }

  } catch (error) {
    console.error("❌ Error testing profile API:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

testProfileAPI();