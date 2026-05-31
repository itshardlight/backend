import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Profile from '../models/Profile.js';
import Result from '../models/Result.js';

dotenv.config();

const debugStudentResults = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all student users
    const studentUsers = await User.find({ role: 'student' });
    console.log(`\nFound ${studentUsers.length} student users\n`);

    for (const user of studentUsers) {
      console.log('='.repeat(80));
      console.log(`User: ${user.username} (${user._id})`);
      console.log('='.repeat(80));

      // Check Student model
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        console.log(`✓ Student record found: ${student._id}`);
        console.log(`  Name: ${student.firstName} ${student.lastName}`);
        console.log(`  Roll: ${student.rollNumber}, Class: ${student.class}-${student.section}`);
      } else {
        console.log('✗ No Student record found');
      }

      // Check Profile model
      const profile = await Profile.findOne({ userId: user._id });
      if (profile) {
        console.log(`✓ Profile record found: ${profile._id}`);
        console.log(`  Name: ${profile.firstName} ${profile.lastName}`);
        console.log(`  Roll: ${profile.academic?.rollNumber}, Class: ${profile.academic?.currentGrade}`);
      } else {
        console.log('✗ No Profile record found');
      }

      // Check Results - search by both Student and Profile IDs
      const studentIds = [];
      if (student) studentIds.push(student._id);
      if (profile) studentIds.push(profile._id);

      if (studentIds.length > 0) {
        const results = await Result.find({ studentId: { $in: studentIds } });
        console.log(`\n📊 Results found: ${results.length}`);
        
        if (results.length > 0) {
          results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.examType} (${result.academicYear})`);
            console.log(`     StudentId in Result: ${result.studentId}`);
            console.log(`     Percentage: ${result.percentage}%, Grade: ${result.overallGrade}`);
          });
        }
      }

      console.log('\n');
    }

    // Summary: Check all results and their studentId references
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(80));
    
    const allResults = await Result.find({}).populate('studentId', 'firstName lastName rollNumber');
    console.log(`Total results in database: ${allResults.length}`);
    
    const studentIdSet = new Set();
    allResults.forEach(result => {
      studentIdSet.add(result.studentId?._id?.toString() || result.studentId?.toString());
    });
    
    console.log(`Unique student IDs in results: ${studentIdSet.size}`);
    console.log('\nStudent IDs referenced in results:');
    for (const id of studentIdSet) {
      const isStudent = await Student.findById(id);
      const isProfile = await Profile.findById(id);
      console.log(`  ${id}: ${isStudent ? 'Student✓' : ''} ${isProfile ? 'Profile✓' : ''} ${!isStudent && !isProfile ? 'NOT FOUND✗' : ''}`);
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugStudentResults();
