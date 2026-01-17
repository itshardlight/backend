import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const checkAdminUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    console.log(`\n📋 Found ${adminUsers.length} admin users:`);
    
    adminUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. Admin User:`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Full Name: ${user.fullName}`);
      console.log(`   Is Verified: ${user.isVerified}`);
      console.log(`   Created: ${user.createdAt}`);
    });

    if (adminUsers.length === 0) {
      console.log('\n❌ No admin users found. Let me create one...');
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@school.com',
        password: 'admin123', // This will be hashed by the pre-save middleware
        role: 'admin',
        fullName: 'System Administrator',
        isVerified: true
      });

      await adminUser.save();
      console.log('✅ Created admin user:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@school.com');
    }

  } catch (error) {
    console.error("❌ Error checking admin users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
};

checkAdminUsers();