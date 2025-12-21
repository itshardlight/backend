import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Profile from "./models/Profile.js";

dotenv.config();

const testManishProfile = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Manish's user account
    const user = await User.findOne({ email: "manish11a891@gmail.com" });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("✅ Found user:", {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Find Manish's student record
    const student = await Student.findOne({ email: "manish11a891@gmail.com" });
    if (!student) {
      console.log("❌ Student record not found");
      return;
    }

    console.log("✅ Found student:", {
      id: student._id,
      rollNumber: student.rollNumber,
      name: `${student.firstName} ${student.lastName}`,
      class: student.class,
      section: student.section,
      userId: student.userId
    });

    // Check if profile exists
    let profile = await Profile.findOne({ userId: user._id });
    
    if (!profile) {
      console.log("⚠️ No profile found, creating one from student data...");
      
      // Create profile from student data
      profile = new Profile({
        userId: user._id,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth || new Date('2000-01-01'),
        gender: student.gender || 'male',
        bloodGroup: student.bloodGroup,
        phone: student.phone,
        address: {
          street: student.address,
          city: student.city,
          state: student.state,
          zipCode: student.zipCode
        },
        academic: {
          currentGrade: student.class,
          section: student.section,
          rollNumber: student.rollNumber,
          admissionDate: student.admissionDate
        },
        parentInfo: {
          fatherName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          emergencyContact: student.emergencyContact
        },
        medicalInfo: {
          conditions: student.medicalConditions
        },
        achievements: [],
        createdBy: user._id
      });

      await profile.save();
      console.log("✅ Profile created successfully");
    } else {
      console.log("✅ Profile already exists");
    }

    // Display profile info
    const populatedProfile = await Profile.findById(profile._id)
      .populate('userId', 'username email role')
      .populate('achievements.addedBy', 'username fullName');

    console.log("\n📋 PROFILE SUMMARY:");
    console.log("==================");
    console.log(`Name: ${populatedProfile.fullName}`);
    console.log(`Email: ${populatedProfile.userId.email}`);
    console.log(`Roll Number: ${populatedProfile.academic.rollNumber}`);
    console.log(`Class: ${populatedProfile.currentClass}`);
    console.log(`Phone: ${populatedProfile.phone || 'Not provided'}`);
    console.log(`Achievements: ${populatedProfile.achievements.length}`);
    
    if (populatedProfile.achievements.length > 0) {
      console.log("\n🏆 ACHIEVEMENTS:");
      populatedProfile.achievements.forEach((achievement, index) => {
        console.log(`${index + 1}. ${achievement.title} (${achievement.category})`);
        if (achievement.description) {
          console.log(`   Description: ${achievement.description}`);
        }
        console.log(`   Date: ${new Date(achievement.date).toLocaleDateString()}`);
      });
    }

    console.log("\n🔑 LOGIN CREDENTIALS:");
    console.log(`Username: ${user.username}`);
    console.log(`Password: manish@11A891 (temporary - must change on first login)`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

testManishProfile();