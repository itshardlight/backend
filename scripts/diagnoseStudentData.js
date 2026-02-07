import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Attendance from '../models/Attendance.js';

dotenv.config();

const diagnoseStudentData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Check Users with student role
    const studentUsers = await User.find({ role: 'student' });
    console.log(`=== USERS (role: student) ===`);
    console.log(`Total: ${studentUsers.length}`);
    
    if (studentUsers.length > 0) {
      console.log('\nSample student users:');
      studentUsers.slice(0, 3).forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ID: ${user._id}`);
      });
    }

    // Check Student records
    const students = await Student.find();
    console.log(`\n=== STUDENT RECORDS ===`);
    console.log(`Total: ${students.length}`);
    
    const studentsWithUserId = students.filter(s => s.userId);
    const studentsWithoutUserId = students.filter(s => !s.userId);
    
    console.log(`With userId: ${studentsWithUserId.length}`);
    console.log(`Without userId: ${studentsWithoutUserId.length}`);
    
    if (studentsWithoutUserId.length > 0) {
      console.log('\n⚠️  Students WITHOUT userId:');
      studentsWithoutUserId.forEach(student => {
        console.log(`  - ${student.firstName} ${student.lastName} (${student.email})`);
      });
    }

    // Check Profile records
    const profiles = await Profile.find();
    console.log(`\n=== PROFILE RECORDS ===`);
    console.log(`Total: ${profiles.length}`);
    
    const studentProfiles = profiles.filter(p => p.userId);
    console.log(`Linked to users: ${studentProfiles.length}`);

    // Check Attendance records
    const attendanceRecords = await Attendance.find();
    console.log(`\n=== ATTENDANCE RECORDS ===`);
    console.log(`Total: ${attendanceRecords.length}`);
    
    const attendanceWithUserId = attendanceRecords.filter(a => a.userId);
    const attendanceWithoutUserId = attendanceRecords.filter(a => !a.userId);
    
    console.log(`With userId: ${attendanceWithUserId.length}`);
    console.log(`Without userId: ${attendanceWithoutUserId.length}`);

    // Cross-reference check
    console.log(`\n=== CROSS-REFERENCE CHECK ===`);
    
    for (const user of studentUsers.slice(0, 3)) {
      console.log(`\nUser: ${user.username} (${user.email})`);
      
      const student = await Student.findOne({ 
        $or: [
          { userId: user._id },
          { email: user.email }
        ]
      });
      console.log(`  Student record: ${student ? '✓ Found' : '✗ Not found'}`);
      if (student) {
        console.log(`    - Has userId: ${student.userId ? '✓' : '✗'}`);
        console.log(`    - Class: ${student.class}-${student.section}`);
        console.log(`    - Roll: ${student.rollNumber}`);
      }
      
      const profile = await Profile.findOne({ userId: user._id });
      console.log(`  Profile record: ${profile ? '✓ Found' : '✗ Not found'}`);
      
      if (student) {
        const attendance = await Attendance.findOne({ studentId: student._id });
        console.log(`  Attendance records: ${attendance ? '✓ Found' : '✗ Not found'}`);
      }
    }

    // Recommendations
    console.log(`\n=== RECOMMENDATIONS ===`);
    
    if (studentsWithoutUserId.length > 0) {
      console.log(`⚠️  Run: node backend/scripts/linkStudentUsers.js`);
      console.log(`   This will link ${studentsWithoutUserId.length} student records to their user accounts`);
    }
    
    if (studentUsers.length > students.length) {
      console.log(`⚠️  ${studentUsers.length - students.length} users have student role but no Student record`);
    }
    
    if (studentUsers.length > profiles.length) {
      console.log(`⚠️  ${studentUsers.length - profiles.length} users have student role but no Profile record`);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

diagnoseStudentData();
