import express from "express";
import mongoose from "mongoose";
import Profile from "./models/Profile.js";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testProfileRoute = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Test the profile route logic for a specific student
    const testUserId = "694fbf71c1b612b6cbe1ff18"; // Manish's user ID
    const testUser = await User.findById(testUserId);
    
    if (!testUser) {
      console.log("❌ Test user not found");
      return;
    }
    
    console.log(`\n👤 Testing profile route for user: ${testUser.username} (${testUser.role})`);
    
    // Simulate the profile route logic
    let profile;
    
    if (testUser.role === "parent") {
      // For parents, find their child's profile
      profile = await Profile.findOne({ "parentInfo.parentEmail": testUser.email })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
    } else if (testUser.role === "student") {
      // For students, find their profile by userId
      profile = await Profile.findOne({ userId: testUserId })
        .populate('userId', 'username email role lastLogin')
        .populate('achievements.addedBy', 'username fullName');
    }
    
    if (profile) {
      console.log("✅ Profile found!");
      console.log("Profile data structure:");
      console.log({
        _id: profile._id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        academic: profile.academic,
        feeInfo: profile.feeInfo ? {
          totalFee: profile.feeInfo.totalFee,
          paidAmount: profile.feeInfo.paidAmount,
          pendingAmount: profile.feeInfo.pendingAmount,
          paymentStatus: profile.feeInfo.paymentStatus,
          feeHistoryCount: profile.feeInfo.feeHistory?.length || 0
        } : null,
        userId: profile.userId
      });
      
      // Apply role-based filtering (same logic as in profileRoutes.js)
      let filteredProfile = profile.toObject();
      
      switch (testUser.role) {
        case "student":
          // Students can see their fee information but with limited details
          if (filteredProfile.feeInfo) {
            filteredProfile.feeInfo = {
              totalFee: filteredProfile.feeInfo.totalFee,
              tuitionFee: filteredProfile.feeInfo.tuitionFee,
              admissionFee: filteredProfile.feeInfo.admissionFee,
              examFee: filteredProfile.feeInfo.examFee,
              libraryFee: filteredProfile.feeInfo.libraryFee,
              sportsFee: filteredProfile.feeInfo.sportsFee,
              otherFees: filteredProfile.feeInfo.otherFees,
              paidAmount: filteredProfile.feeInfo.paidAmount,
              pendingAmount: filteredProfile.feeInfo.pendingAmount,
              dueDate: filteredProfile.feeInfo.dueDate,
              paymentStatus: filteredProfile.feeInfo.paymentStatus,
              feeHistory: filteredProfile.feeInfo.feeHistory,
              lastPaymentDate: filteredProfile.feeInfo.lastPaymentDate
            };
          }
          if (filteredProfile.parentInfo) {
            filteredProfile.parentInfo = {
              fatherName: filteredProfile.parentInfo.fatherName,
              motherName: filteredProfile.parentInfo.motherName,
              guardianName: filteredProfile.parentInfo.guardianName
            };
          }
          break;
          
        case "parent":
          if (filteredProfile.feeInfo) {
            filteredProfile.feeInfo = {
              totalFee: filteredProfile.feeInfo.totalFee,
              paidAmount: filteredProfile.feeInfo.paidAmount,
              pendingAmount: filteredProfile.feeInfo.pendingAmount
            };
          }
          break;
      }
      
      console.log("\n📋 Filtered profile (what API would return):");
      console.log({
        _id: filteredProfile._id,
        firstName: filteredProfile.firstName,
        lastName: filteredProfile.lastName,
        fullName: filteredProfile.fullName,
        academic: filteredProfile.academic,
        feeInfo: filteredProfile.feeInfo,
        userId: filteredProfile.userId
      });
      
    } else {
      console.log("❌ No profile found");
    }

  } catch (error) {
    console.error("❌ Error testing profile route:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
};

testProfileRoute();