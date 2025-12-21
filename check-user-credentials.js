import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Student from "./models/Student.js";

dotenv.config();

const checkUserCredentials = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Search for users with 'manish' in username or email
    console.log("🔍 Searching for users with 'manish'...\n");
    
    const users = await User.find({
      $or: [
        { username: { $regex: 'manish', $options: 'i' } },
        { email: { $regex: 'manish', $options: 'i' } },
        { fullName: { $regex: 'manish', $options: 'i' } }
      ]
    });

    if (users.length === 0) {
      console.log("❌ No users found with 'manish' in username, email, or name");
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. User Details:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Full Name: ${user.fullName}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Verified: ${user.isVerified}`);
        console.log(`   Account Status: ${user.accountStatus || 'active'}`);
        console.log(`   Require Password Change: ${user.requirePasswordChange}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log("");
      });
    }

    // Also check students collection
    console.log("🔍 Searching for students with 'manish'...\n");
    
    const students = await Student.find({
      $or: [
        { firstName: { $regex: 'manish', $options: 'i' } },
        { lastName: { $regex: 'manish', $options: 'i' } },
        { email: { $regex: 'manish', $options: 'i' } },
        { rollNumber: { $regex: '11a891', $options: 'i' } }
      ]
    });

    if (students.length === 0) {
      console.log("❌ No students found with 'manish' or roll number '11a891'");
    } else {
      console.log(`✅ Found ${students.length} student(s):\n`);
      students.forEach((student, index) => {
        console.log(`${index + 1}. Student Details:`);
        console.log(`   ID: ${student._id}`);
        console.log(`   Roll Number: ${student.rollNumber}`);
        console.log(`   Name: ${student.firstName} ${student.lastName}`);
        console.log(`   Email: ${student.email}`);
        console.log(`   Class: ${student.class}`);
        console.log(`   Section: ${student.section}`);
        console.log(`   Status: ${student.status}`);
        console.log(`   User ID: ${student.userId}`);
        console.log(`   Created: ${student.createdAt}`);
        console.log("");
      });
    }

    // Check if there's a specific user with email manish11a891@gmail.com
    console.log("🔍 Checking specific email: manish11a891@gmail.com\n");
    
    const specificUser = await User.findOne({ email: "manish11a891@gmail.com" });
    const specificStudent = await Student.findOne({ email: "manish11a891@gmail.com" });
    
    if (specificUser) {
      console.log("✅ Found user with email manish11a891@gmail.com:");
      console.log(`   Username: ${specificUser.username}`);
      console.log(`   Password: [HASHED - Cannot display]`);
      console.log(`   Role: ${specificUser.role}`);
      console.log(`   Verified: ${specificUser.isVerified}`);
      console.log(`   Require Password Change: ${specificUser.requirePasswordChange}`);
    } else {
      console.log("❌ No user found with email manish11a891@gmail.com");
    }
    
    if (specificStudent) {
      console.log("✅ Found student with email manish11a891@gmail.com:");
      console.log(`   Roll Number: ${specificStudent.rollNumber}`);
      console.log(`   Name: ${specificStudent.firstName} ${specificStudent.lastName}`);
      console.log(`   Expected Username: ${specificStudent.firstName.toLowerCase()}_${specificStudent.rollNumber}`);
      console.log(`   Expected Password: ${specificStudent.firstName.toLowerCase()}@${specificStudent.rollNumber}`);
    } else {
      console.log("❌ No student found with email manish11a891@gmail.com");
    }

  } catch (error) {
    console.error("❌ Error checking user credentials:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

checkUserCredentials();