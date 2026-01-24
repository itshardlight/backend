import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Cleanup script for payment transactions
 * This script removes all pending payment transactions to fix duplicate errors
 */

async function cleanupPayments() {
  try {
    console.log('🔧 Starting payment cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management');
    console.log('✅ Connected to MongoDB');

    // Get count of pending payments before cleanup
    const beforeCount = await Payment.countDocuments({ status: 'pending' });
    console.log(`📊 Found ${beforeCount} pending payment transactions`);

    if (beforeCount === 0) {
      console.log('✅ No pending payments to clean up');
      return;
    }

    // Remove all pending payments
    const result = await Payment.deleteMany({ status: 'pending' });
    console.log(`🗑️  Deleted ${result.deletedCount} pending payment transactions`);

    // Verify cleanup
    const afterCount = await Payment.countDocuments({ status: 'pending' });
    console.log(`📊 Remaining pending payments: ${afterCount}`);

    if (afterCount === 0) {
      console.log('✅ Payment cleanup completed successfully!');
      console.log('🚀 You can now make payments without duplicate errors');
    } else {
      console.log('⚠️  Some pending payments remain. You may need to run this again.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanupPayments();