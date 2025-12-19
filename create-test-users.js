import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const testUsers = [
      {
        username: "admin",
        email: "admin@school.com",
        password: "admin123",
        fullName: "School Administrator",
        role: "admin",
        isVerified: true,
        accountStatus: "active"
      },
      {
        username: "teacher1",
        email: "teacher1@school.com",
        password: "teacher123",
        fullName: "John Teacher",
        role: "teacher",
        isVerified: true,
        accountStatus: "active"
      },
      {
        username: "staff1",
        email: "staff1@school.com",
        password: "staff123",
        fullName: "Jane Staff",
        role: "fee_department",
        isVerified: true,
        accountStatus: "active"
      },
      {
        username: "student1",
        email: "student1@school.com",
        password: "student123",
        fullName: "Mike Student",
        role: "student",
        isVerified: true,
        accountStatus: "active"
      },
      {
        username: "parent1",
        email: "parent1@school.com",
        password: "parent123",
        fullName: "Sarah Parent",
        role: "parent",
        isVerified: true,
        accountStatus: "active"
      }
    ];

    console.log("🔄 Creating test users...\n");

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists`);
        continue;
      }

      // Create new user
      const user = new User(userData);
      await user.save();
      
      console.log(`✅ Created ${userData.role}: ${userData.username}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Full Name: ${userData.fullName}\n`);
    }

    console.log("🎉 Test users creation completed!");
    console.log("\n📋 LOGIN CREDENTIALS SUMMARY:");
    console.log("================================");
    console.log("👑 ADMIN (Full Access):");
    console.log("   Username: admin | Password: admin123");
    console.log("   Username: testadmin | Password: admin123");
    console.log("");
    console.log("👨‍🏫 TEACHER (Edit/Delete Access):");
    console.log("   Username: teacher1 | Password: teacher123");
    console.log("");
    console.log("👩‍💼 STAFF (Edit/Delete Access):");
    console.log("   Username: staff1 | Password: staff123");
    console.log("");
    console.log("👨‍🎓 STUDENT (View Only):");
    console.log("   Username: student1 | Password: student123");
    console.log("");
    console.log("👩‍👧‍👦 PARENT (View Only):");
    console.log("   Username: parent1 | Password: parent123");

  } catch (error) {
    console.error("❌ Error creating test users:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

createTestUsers();