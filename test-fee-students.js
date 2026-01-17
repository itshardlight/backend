import mongoose from "mongoose";
import Student from "./models/Student.js";
import Profile from "./models/Profile.js";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testFeeStudents = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Get all students from Student collection
    const students = await Student.find({ status: 'active' })
      .populate('userId', 'username email role')
      .sort({ class: 1, section: 1, rollNumber: 1 });

    console.log(`\n📋 Found ${students.length} active students in Student collection:`);
    
    students.forEach((student, index) => {
      console.log(`\n${index + 1}. Student Details:`);
      console.log(`   ID: ${student._id}`);
      console.log(`   Name: ${student.firstName} ${student.lastName}`);
      console.log(`   Class: ${student.class}-${student.section}`);
      console.log(`   Roll: ${student.rollNumber}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   User ID: ${student.userId?._id || 'No user account'}`);
      console.log(`   Status: ${student.status}`);
    });

    // Get all profiles
    const profiles = await Profile.find({})
      .populate('userId', 'username email role');

    console.log(`\n📋 Found ${profiles.length} profiles in Profile collection:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Profile Details:`);
      console.log(`   ID: ${profile._id}`);
      console.log(`   Name: ${profile.firstName} ${profile.lastName}`);
      console.log(`   Class: ${profile.academic?.currentGrade}-${profile.academic?.section}`);
      console.log(`   Roll: ${profile.academic?.rollNumber}`);
      console.log(`   User ID: ${profile.userId?._id || 'No user account'}`);
      console.log(`   Fee Total: ₹${profile.feeInfo?.totalFee || 0}`);
      console.log(`   Fee Paid: ₹${profile.feeInfo?.paidAmount || 0}`);
    });

    // Test the merged logic
    console.log("\n🔄 Testing merged student-profile logic:");
    
    // Create a map of profiles by userId for quick lookup
    const profileMap = new Map();
    profiles.forEach(profile => {
      if (profile.userId) {
        profileMap.set(profile.userId._id.toString(), profile);
      }
    });

    // Merge student data with profile fee information
    const mergedStudents = students.map(student => {
      let profile = null;
      if (student.userId) {
        profile = profileMap.get(student.userId._id.toString());
      }
      
      // If no profile found, try to find by name match
      if (!profile) {
        profile = profiles.find(p => 
          p.firstName === student.firstName && 
          p.lastName === student.lastName &&
          p.academic?.currentGrade === student.class &&
          p.academic?.section === student.section
        );
      }

      const mergedStudent = {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        email: student.email,
        academic: {
          currentGrade: student.class,
          section: student.section,
          rollNumber: student.rollNumber
        },
        feeInfo: profile?.feeInfo || {
          totalFee: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paymentStatus: 'pending'
        },
        hasProfile: !!profile,
        profileId: profile?._id
      };

      return mergedStudent;
    });

    console.log(`\n✅ Merged ${mergedStudents.length} students with fee information:`);
    
    mergedStudents.forEach((student, index) => {
      console.log(`\n${index + 1}. ${student.firstName} ${student.lastName} (${student.academic.currentGrade}-${student.academic.section})`);
      console.log(`   Student ID: ${student._id}`);
      console.log(`   Has Profile: ${student.hasProfile ? 'Yes' : 'No'}`);
      console.log(`   Profile ID: ${student.profileId || 'None'}`);
      console.log(`   Fee Total: ₹${student.feeInfo.totalFee.toLocaleString()}`);
      console.log(`   Fee Paid: ₹${student.feeInfo.paidAmount.toLocaleString()}`);
      console.log(`   Fee Status: ${student.feeInfo.paymentStatus}`);
    });

    // Summary
    const studentsWithFee = mergedStudents.filter(s => s.feeInfo.totalFee > 0);
    const studentsWithoutProfile = mergedStudents.filter(s => !s.hasProfile);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total Students: ${mergedStudents.length}`);
    console.log(`   Students with Profiles: ${mergedStudents.length - studentsWithoutProfile.length}`);
    console.log(`   Students without Profiles: ${studentsWithoutProfile.length}`);
    console.log(`   Students with Fee Set: ${studentsWithFee.length}`);
    console.log(`   Students without Fee: ${mergedStudents.length - studentsWithFee.length}`);

  } catch (error) {
    console.error("❌ Error testing fee students:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

testFeeStudents();