import mongoose from "mongoose";
import Profile from "./models/Profile.js";
import dotenv from "dotenv";

dotenv.config();

const addSampleFeeData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management");
    console.log("Connected to MongoDB");

    // Find all student profiles
    const profiles = await Profile.find({});
    console.log(`Found ${profiles.length} profiles`);

    if (profiles.length === 0) {
      console.log("No profiles found. Please create some student profiles first.");
      return;
    }

    // Add sample fee data to each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      
      // Generate random fee amounts based on class
      const grade = profile.academic?.currentGrade || '10';
      let baseFee = 0;
      
      switch (grade) {
        case '9':
          baseFee = 25000;
          break;
        case '10':
          baseFee = 30000;
          break;
        case '11':
          baseFee = 35000;
          break;
        case '12':
          baseFee = 40000;
          break;
        default:
          baseFee = 30000;
      }

      const tuitionFee = baseFee * 0.7;
      const admissionFee = baseFee * 0.1;
      const examFee = baseFee * 0.1;
      const libraryFee = baseFee * 0.05;
      const sportsFee = baseFee * 0.03;
      const otherFees = baseFee * 0.02;

      // Random payment status
      const paymentScenarios = ['paid', 'partial', 'pending'];
      const scenario = paymentScenarios[Math.floor(Math.random() * paymentScenarios.length)];
      
      let paidAmount = 0;
      let feeHistory = [];
      
      if (scenario === 'paid') {
        paidAmount = baseFee;
        feeHistory = [
          {
            amount: baseFee,
            paymentDate: new Date(2024, 3, 15), // April 15, 2024
            paymentMethod: 'online',
            receiptNumber: `RCP-${Date.now()}-${i}`,
            description: 'Full fee payment',
            enteredAt: new Date()
          }
        ];
      } else if (scenario === 'partial') {
        paidAmount = baseFee * 0.6; // 60% paid
        feeHistory = [
          {
            amount: baseFee * 0.4,
            paymentDate: new Date(2024, 3, 10), // April 10, 2024
            paymentMethod: 'cash',
            receiptNumber: `RCP-${Date.now()}-${i}-1`,
            description: 'First installment',
            enteredAt: new Date()
          },
          {
            amount: baseFee * 0.2,
            paymentDate: new Date(2024, 4, 15), // May 15, 2024
            paymentMethod: 'upi',
            receiptNumber: `RCP-${Date.now()}-${i}-2`,
            description: 'Second installment',
            enteredAt: new Date()
          }
        ];
      }

      const pendingAmount = baseFee - paidAmount;
      const paymentStatus = pendingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      // Update profile with fee information
      profile.feeInfo = {
        totalFee: baseFee,
        tuitionFee: Math.round(tuitionFee),
        admissionFee: Math.round(admissionFee),
        examFee: Math.round(examFee),
        libraryFee: Math.round(libraryFee),
        sportsFee: Math.round(sportsFee),
        otherFees: Math.round(otherFees),
        paidAmount: Math.round(paidAmount),
        pendingAmount: Math.round(pendingAmount),
        dueDate: new Date(2024, 5, 30), // June 30, 2024
        paymentStatus,
        feeHistory,
        lastPaymentDate: feeHistory.length > 0 ? feeHistory[feeHistory.length - 1].paymentDate : null,
        updatedAt: new Date()
      };

      await profile.save();
      
      console.log(`✅ Updated fee data for ${profile.firstName} ${profile.lastName} (${profile.academic?.currentGrade}-${profile.academic?.section})`);
      console.log(`   Total Fee: ₹${baseFee.toLocaleString()}, Paid: ₹${Math.round(paidAmount).toLocaleString()}, Status: ${paymentStatus}`);
    }

    console.log(`\n🎉 Successfully added sample fee data to ${profiles.length} profiles!`);

  } catch (error) {
    console.error("❌ Error adding sample fee data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

addSampleFeeData();