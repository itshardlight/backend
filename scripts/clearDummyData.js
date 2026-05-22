import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Result from '../models/Result.js';
import Attendance from '../models/Attendance.js';
import readline from 'readline';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Clear all dummy data
const clearData = async () => {
  try {
    console.log('\n⚠️  WARNING: This will delete ALL student data, results, and attendance records!');
    console.log('This action CANNOT be undone!\n');

    const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      rl.close();
      process.exit(0);
    }

    console.log('\nDeleting data...');

    // Count before deletion
    const studentCount = await Student.countDocuments();
    const resultCount = await Result.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    const studentUserCount = await User.countDocuments({ role: 'student' });

    console.log(`\nFound:`);
    console.log(`  - ${studentCount} students`);
    console.log(`  - ${resultCount} results`);
    console.log(`  - ${attendanceCount} attendance records`);
    console.log(`  - ${studentUserCount} student user accounts`);

    // Delete all data
    await Result.deleteMany({});
    console.log('✓ Deleted all results');

    await Attendance.deleteMany({});
    console.log('✓ Deleted all attendance records');

    await Student.deleteMany({});
    console.log('✓ Deleted all students');

    await User.deleteMany({ role: 'student' });
    console.log('✓ Deleted all student user accounts');

    console.log('\n=================================');
    console.log('Data Clearing Completed!');
    console.log('=================================');
    console.log(`Deleted:`);
    console.log(`  - ${studentCount} students`);
    console.log(`  - ${resultCount} results`);
    console.log(`  - ${attendanceCount} attendance records`);
    console.log(`  - ${studentUserCount} student user accounts`);
    console.log('\nNote: Admin and teacher accounts were preserved.');
    console.log('=================================\n');

    rl.close();
  } catch (error) {
    console.error('Error clearing data:', error);
    rl.close();
    throw error;
  }
};

// Run the clearing
const run = async () => {
  try {
    await connectDB();
    await clearData();
    console.log('Clearing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Clearing failed:', error);
    process.exit(1);
  }
};

run();
