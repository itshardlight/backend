import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";
import User from "../models/User.js";

dotenv.config();

const migrateStudentsToUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all students without user accounts
    const studentsWithoutUsers = await Student.find({ 
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });

    console.log(`📊 Found ${studentsWithoutUsers.length} students without user accounts`);

    if (studentsWithoutUsers.length === 0) {
      console.log("🎉 All students already have user accounts!");
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const student of studentsWithoutUsers) {
      try {
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email: student.email });
        
        if (existingUser) {
          // Link existing user to student
          student.userId = existingUser._id;
          await student.save();
          
          // Update user's full name if needed
          if (!existingUser.fullName || existingUser.fullName !== student.fullName) {
            existingUser.fullName = student.fullName;
            await existingUser.save();
          }
          
          console.log(`🔗 Linked existing user to student: ${student.fullName} (${student.rollNumber})`);
        } else {
          // Create new user account
          const username = `${student.firstName.toLowerCase()}_${student.rollNumber}`;
          const defaultPassword = `${student.firstName.toLowerCase()}@${student.rollNumber}`;
          
          const user = new User({
            username,
            email: student.email,
            password: defaultPassword,
            fullName: student.fullName,
            role: "student",
            isVerified: true,
            requirePasswordChange: true
          });

          await user.save();

          // Link user to student
          student.userId = user._id;
          await student.save();

          console.log(`✅ Created user account for: ${student.fullName} (${student.rollNumber})`);
          console.log(`   Username: ${username}`);
          console.log(`   Password: ${defaultPassword}`);
        }

        successCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to create user for ${student.fullName} (${student.rollNumber}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`✅ Successfully processed: ${successCount} students`);
    console.log(`❌ Errors: ${errorCount} students`);

    if (errors.length > 0) {
      console.log("\n🚨 Error Details:");
      errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log("\n🎉 Migration completed!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📤 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run the migration
migrateStudentsToUsers();