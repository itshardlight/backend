import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if test admin user already exists
    const existingTestAdmin = await User.findOne({ username: "testadmin" });
    if (existingTestAdmin) {
      console.log("⚠️  Test admin user already exists");
      console.log("Username:", existingTestAdmin.username);
      console.log("Email:", existingTestAdmin.email);
      console.log("Role:", existingTestAdmin.role);
      return;
    }

    // Create test admin user
    const adminUser = new User({
      username: "testadmin",
      email: "testadmin@school.com",
      password: "admin123", // This will be hashed automatically
      fullName: "Test Administrator",
      role: "admin",
      isVerified: true,
      accountStatus: "active"
    });

    await adminUser.save();
    console.log("✅ Test admin user created successfully!");
    console.log("Username: testadmin");
    console.log("Email: testadmin@school.com");
    console.log("Password: admin123");
    console.log("Role: admin");
    console.log("\n🔑 You can now login with these credentials to test delete/edit functionality");

  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }
};

createAdminUser();