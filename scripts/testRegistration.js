import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';

dotenv.config();

const testRegistration = async () => {
  try {
    console.log('🧪 Testing Student Registration System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test data
    const testRollNumber = 'TEST123';
    const testEmail = `test${Date.now()}@example.com`;
    const testParentEmail = `parent${Date.now()}@example.com`;

    console.log('📝 Test Student Data:');
    console.log(`   Roll Number: ${testRollNumber}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Parent Email: ${testParentEmail}\n`);

    // Clean up any existing test data
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await Student.deleteMany({ rollNumber: testRollNumber });
    await Profile.deleteMany({ 'academic.rollNumber': testRollNumber });

    // Simulate registration
    console.log('🔄 Simulating registration process...\n');

    // 1. Create User Account
    console.log('1️⃣  Creating User Account...');
    const username = `test_${testRollNumber}`;
    const defaultPassword = `test@${testRollNumber}`;
    
    const user = new User({
      username,
      email: testEmail,
      password: defaultPassword,
      fullName: 'Test Student',
      role: 'student',
      isVerified: true,
      requirePasswordChange: true
    });

    await user.save();
    console.log(`   ✅ User created: ${user.username} (${user._id})\n`);

    // 2. Create Student Record
    console.log('2️⃣  Creating Student Record...');
    const student = new Student({
      firstName: 'Test',
      lastName: 'Student',
      email: testEmail,
      rollNumber: testRollNumber,
      class: '10',
      section: 'A',
      dateOfBirth: new Date('2008-01-01'),
      gender: 'male',
      bloodGroup: 'O+',
      phone: '9841234567',
      address: 'Test Address',
      city: 'Kathmandu',
      state: 'Bagmati',
      zipCode: '44600',
      parentName: 'Test Parent',
      parentPhone: '9847654321',
      parentEmail: testParentEmail,
      emergencyContact: '9847654321',
      admissionDate: new Date(),
      userId: user._id
    });

    await student.save();
    console.log(`   ✅ Student created: ${student.rollNumber} (${student._id})\n`);

    // 3. Create Profile Record
    console.log('3️⃣  Creating Profile Record...');
    const profile = new Profile({
      userId: user._id,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      bloodGroup: student.bloodGroup,
      phone: student.phone,
      address: {
        street: student.address,
        city: student.city,
        state: student.state,
        zipCode: student.zipCode,
        country: 'Nepal'
      },
      academic: {
        currentGrade: student.class,
        section: student.section,
        rollNumber: student.rollNumber,
        admissionDate: student.admissionDate
      },
      parentInfo: {
        fatherName: student.parentName,
        motherName: student.parentName,
        guardianName: student.parentName,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        emergencyContact: student.emergencyContact
      },
      feeInfo: {
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: 'pending'
      },
      achievements: [],
      createdBy: user._id
    });

    await profile.save();
    console.log(`   ✅ Profile created: ${profile._id}\n`);

    // 4. Create Parent Account
    console.log('4️⃣  Creating Parent Account...');
    const parentPassword = `parent@${testRollNumber}`;
    const parentUser = new User({
      username: `parent_${testRollNumber}`,
      email: testParentEmail,
      password: parentPassword,
      fullName: student.parentName,
      role: 'parent',
      isVerified: true,
      requirePasswordChange: true
    });

    await parentUser.save();
    console.log(`   ✅ Parent account created: ${parentUser.username} (${parentUser._id})\n`);

    // Verification
    console.log('🔍 Verifying Registration...\n');

    // Check User Account
    const verifyUser = await User.findById(user._id);
    console.log(`✅ User Account: ${verifyUser ? 'EXISTS' : 'MISSING'}`);
    console.log(`   - Username: ${verifyUser?.username}`);
    console.log(`   - Email: ${verifyUser?.email}`);
    console.log(`   - Role: ${verifyUser?.role}\n`);

    // Check Student Record
    const verifyStudent = await Student.findOne({ userId: user._id });
    console.log(`✅ Student Record: ${verifyStudent ? 'EXISTS' : 'MISSING'}`);
    console.log(`   - Roll Number: ${verifyStudent?.rollNumber}`);
    console.log(`   - Linked to User: ${verifyStudent?.userId?.toString() === user._id.toString() ? 'YES' : 'NO'}\n`);

    // Check Profile
    const verifyProfile = await Profile.findOne({ userId: user._id });
    console.log(`✅ Profile Record: ${verifyProfile ? 'EXISTS' : 'MISSING'}`);
    console.log(`   - Roll Number: ${verifyProfile?.academic?.rollNumber}`);
    console.log(`   - Linked to User: ${verifyProfile?.userId?.toString() === user._id.toString() ? 'YES' : 'NO'}`);
    console.log(`   - Fee Info: ${verifyProfile?.feeInfo ? 'INITIALIZED' : 'MISSING'}`);
    console.log(`   - Achievements: ${Array.isArray(verifyProfile?.achievements) ? 'READY' : 'MISSING'}\n`);

    // Check Parent Account
    const verifyParent = await User.findOne({ email: testParentEmail });
    console.log(`✅ Parent Account: ${verifyParent ? 'EXISTS' : 'MISSING'}`);
    console.log(`   - Username: ${verifyParent?.username}`);
    console.log(`   - Email: ${verifyParent?.email}`);
    console.log(`   - Role: ${verifyParent?.role}\n`);

    // System Readiness Check
    console.log('🎯 System Readiness Check:\n');
    const readiness = {
      userAccount: !!verifyUser,
      studentRecord: !!verifyStudent && verifyStudent.userId?.toString() === user._id.toString(),
      profile: !!verifyProfile && verifyProfile.userId?.toString() === user._id.toString(),
      parentAccount: !!verifyParent,
      readyForAttendance: !!verifyStudent && !!verifyUser,
      readyForFees: !!verifyProfile && !!verifyProfile.feeInfo,
      readyForAchievements: !!verifyProfile && Array.isArray(verifyProfile.achievements),
      readyForResults: !!verifyStudent
    };

    Object.entries(readiness).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${status} ${label}`);
    });

    const allReady = Object.values(readiness).every(v => v === true);
    console.log(`\n${allReady ? '🎉' : '⚠️'} Overall Status: ${allReady ? 'ALL SYSTEMS READY' : 'SOME SYSTEMS NOT READY'}\n`);

    // Login Credentials
    console.log('🔑 Login Credentials:\n');
    console.log('   Student:');
    console.log(`   - Username: ${username}`);
    console.log(`   - Password: ${defaultPassword}\n`);
    console.log('   Parent:');
    console.log(`   - Username: parent_${testRollNumber}`);
    console.log(`   - Password: ${parentPassword}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await User.deleteOne({ _id: user._id });
    await User.deleteOne({ _id: parentUser._id });
    await Student.deleteOne({ _id: student._id });
    await Profile.deleteOne({ _id: profile._id });
    console.log('   ✅ Test data cleaned up\n');

    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

testRegistration();
