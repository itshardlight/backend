import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import Profile from '../models/Profile.js';
import connectDB from '../config/db.js';

dotenv.config();

// Configuration
const STUDENTS_PER_CLASS_SECTION = 20;
const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SECTIONS = ['A', 'B', 'C'];
const ATTENDANCE_DAYS = 30; // 1 month

// Sample data
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
  'Aadhya', 'Ananya', 'Diya', 'Isha', 'Kavya', 'Kiara', 'Navya', 'Pari', 'Saanvi', 'Sara',
  'Rohan', 'Kabir', 'Reyansh', 'Shaurya', 'Atharv', 'Advait', 'Dhruv', 'Kian', 'Rudra', 'Shivansh',
  'Aanya', 'Myra', 'Riya', 'Shanaya', 'Tara', 'Zara', 'Anika', 'Avni', 'Prisha', 'Siya'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Rao', 'Nair', 'Iyer',
  'Joshi', 'Mehta', 'Shah', 'Desai', 'Kulkarni', 'Agarwal', 'Bansal', 'Malhotra', 'Chopra', 'Kapoor',
  'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Shukla', 'Saxena', 'Srivastava', 'Jain', 'Agrawal', 'Goyal'
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat'];

const SUBJECTS_BY_CLASS = {
  '1': ['English', 'Hindi', 'Mathematics', 'EVS', 'Drawing'],
  '2': ['English', 'Hindi', 'Mathematics', 'EVS', 'Drawing'],
  '3': ['English', 'Hindi', 'Mathematics', 'EVS', 'Computer'],
  '4': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  '5': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  '6': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
  '7': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
  '8': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
  '9': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
  '10': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer']
};

const EXAM_TYPES = ['unit_test_1', 'unit_test_2', 'mid_term'];

// Helper functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateEmail = (firstName, lastName, rollNumber) => {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${rollNumber}@school.edu`.replace(/\s/g, '');
};

const generatePhone = () => {
  return `9${getRandomInt(100000000, 999999999)}`;
};

// Generate student data
const generateStudent = (classNum, section, index) => {
  const firstName = getRandomElement(FIRST_NAMES);
  const lastName = getRandomElement(LAST_NAMES);
  const rollNumber = `2024${classNum}${section}${String(index + 1).padStart(3, '0')}`;
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  
  // Generate date of birth based on class (approximate age)
  const currentYear = new Date().getFullYear();
  const age = 5 + parseInt(classNum); // Class 1 = ~6 years old
  const dobYear = currentYear - age;
  const dob = new Date(dobYear, getRandomInt(0, 11), getRandomInt(1, 28));

  return {
    firstName,
    lastName,
    dateOfBirth: dob,
    gender,
    bloodGroup: getRandomElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
    email: generateEmail(firstName, lastName, rollNumber),
    phone: generatePhone(),
    address: `${getRandomInt(1, 999)} ${getRandomElement(['MG Road', 'Park Street', 'Main Road', 'Station Road'])}`,
    city: getRandomElement(CITIES),
    state: getRandomElement(STATES),
    class: classNum,
    section,
    rollNumber,
    admissionDate: new Date(currentYear, 3, getRandomInt(1, 30)), // April admission
    previousSchool: Math.random() > 0.3 ? `${getRandomElement(['St.', 'Modern', 'Delhi', 'Cambridge'])} ${getRandomElement(['Public', 'International', 'High'])} School` : undefined,
    fatherName: `${getRandomElement(FIRST_NAMES)} ${lastName}`,
    fatherContact: generatePhone(),
    motherName: `${getRandomElement(['Priya', 'Anjali', 'Kavita', 'Sunita', 'Meera'])} ${lastName}`,
    motherContact: generatePhone(),
    guardianName: `${getRandomElement(FIRST_NAMES)} ${lastName}`,
    guardianContact: generatePhone(),
    guardianEmail: `${firstName.toLowerCase()}.parent@email.com`,
    guardianType: getRandomElement(['Father', 'Mother', 'Other']),
    medicalConditions: Math.random() > 0.8 ? getRandomElement(['Asthma', 'Allergies', 'None']) : undefined,
    status: 'active'
  };
};

// Generate attendance for a student
const generateAttendance = (studentId, userId, classNum, teacherId, days = ATTENDANCE_DAYS) => {
  const attendanceRecords = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }
    
    // Normalize to midnight UTC
    date.setHours(0, 0, 0, 0);
    
    // Random attendance with 85% present rate
    const rand = Math.random();
    let status;
    if (rand < 0.85) status = 'present';
    else if (rand < 0.92) status = 'absent';
    else if (rand < 0.97) status = 'late';
    else status = 'excused';
    
    attendanceRecords.push({
      studentId,
      userId,
      date,
      class: classNum,
      status,
      remarks: status === 'absent' ? getRandomElement(['Sick', 'Family emergency', 'No reason provided', '']) : '',
      markedBy: teacherId,
      markedAt: new Date(date.getTime() + getRandomInt(8, 10) * 60 * 60 * 1000) // Marked between 8-10 AM
    });
  }
  
  return attendanceRecords;
};

// Generate results for a student
const generateResults = (studentId, rollNumber, classNum, teacherId, teacherName) => {
  const results = [];
  const subjects = SUBJECTS_BY_CLASS[classNum];
  const academicYear = '2024-2025';
  
  for (const examType of EXAM_TYPES) {
    const subjectResults = subjects.map(subjectName => {
      const maxMarks = classNum <= 5 ? 50 : 100;
      // Generate marks with some variation (40-95% range)
      const percentage = getRandomInt(40, 95);
      const obtainedMarks = Math.round((percentage / 100) * maxMarks);
      
      return {
        subjectName,
        subjectCode: subjectName.substring(0, 3).toUpperCase(),
        maxMarks,
        obtainedMarks,
        remarks: obtainedMarks >= maxMarks * 0.9 ? 'Excellent' : 
                 obtainedMarks >= maxMarks * 0.75 ? 'Very Good' :
                 obtainedMarks >= maxMarks * 0.6 ? 'Good' : 
                 obtainedMarks >= maxMarks * 0.4 ? 'Satisfactory' : 'Needs Improvement'
      };
    });
    
    results.push({
      studentId,
      rollNumber,
      class: classNum,
      examType,
      academicYear,
      subjects: subjectResults,
      enteredBy: teacherId,
      teacherName,
      status: 'published',
      remarks: 'Keep up the good work!'
    });
  }
  
  return results;
};

// Generate user account for student
const generateUserAccount = async (student) => {
  const username = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}`.replace(/\s/g, '');
  const password = 'student123'; // Default password
  
  const user = new User({
    username,
    email: student.email,
    password, // Will be hashed by pre-save hook
    role: 'student',
    isVerified: true
  });
  
  return user;
};

// Generate profile for student
const generateProfile = (userId, student) => {
  const totalFee = getRandomInt(20000, 50000);
  const paidAmount = Math.random() > 0.3 ? getRandomInt(5000, totalFee) : 0;
  const pendingAmount = totalFee - paidAmount;
  
  return {
    userId,
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
      country: 'India'
    },
    academic: {
      currentGrade: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      admissionDate: student.admissionDate,
      previousSchool: student.previousSchool
    },
    parentInfo: {
      fatherName: student.fatherName,
      motherName: student.motherName,
      guardianName: student.guardianName,
      parentPhone: student.guardianContact,
      parentEmail: student.guardianEmail,
      emergencyContact: student.guardianContact
    },
    feeInfo: {
      totalFee,
      tuitionFee: Math.round(totalFee * 0.7),
      admissionFee: Math.round(totalFee * 0.1),
      examFee: Math.round(totalFee * 0.1),
      libraryFee: Math.round(totalFee * 0.05),
      sportsFee: Math.round(totalFee * 0.05),
      paidAmount,
      pendingAmount,
      paymentStatus: paidAmount >= totalFee ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
      dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      feeHistory: paidAmount > 0 ? [{
        amount: paidAmount,
        paymentDate: getRandomDate(new Date(2024, 3, 1), new Date()),
        paymentMethod: getRandomElement(['cash', 'online', 'upi', 'esewa']),
        receiptNumber: `REC${Date.now()}${getRandomInt(1000, 9999)}`,
        description: 'Fee payment'
      }] : []
    },
    medicalInfo: {
      conditions: student.medicalConditions || 'None',
      allergies: Math.random() > 0.9 ? getRandomElement(['Peanuts', 'Dust', 'None']) : 'None'
    },
    achievements: [],
    createdBy: userId
  };
};

// Main seeding function
const seedData = async () => {
  try {
    console.log('🚀 Starting comprehensive data seeding...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Find or create a teacher/admin user for marking attendance and results
    let teacher = await User.findOne({ role: 'admin' });
    if (!teacher) {
      console.log('⚠️  No admin found. Creating default admin...');
      teacher = new User({
        username: 'admin',
        email: 'admin@school.edu',
        password: 'admin123',
        role: 'admin',
        isVerified: true
      });
      await teacher.save();
      console.log('✅ Admin created\n');
    }
    
    const teacherId = teacher._id;
    const teacherName = teacher.username;
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing student data...');
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await Result.deleteMany({});
    // Note: Not deleting all users/profiles to preserve admin accounts
    console.log('✅ Existing data cleared\n');
    
    let totalStudents = 0;
    let totalAttendance = 0;
    let totalResults = 0;
    
    // Iterate through each class and section
    for (const classNum of CLASSES) {
      for (const section of SECTIONS) {
        console.log(`📚 Processing Class ${classNum}-${section}...`);
        
        // Generate students for this class-section
        for (let i = 0; i < STUDENTS_PER_CLASS_SECTION; i++) {
          try {
            // Generate student data
            const studentData = generateStudent(classNum, section, i);
            
            // Create user account
            const user = await generateUserAccount(studentData);
            await user.save();
            
            // Link user to student
            studentData.userId = user._id;
            
            // Create student
            const student = new Student(studentData);
            await student.save();
            totalStudents++;
            
            // Create profile
            const profileData = generateProfile(user._id, studentData);
            const profile = new Profile(profileData);
            await profile.save();
            
            // Generate attendance
            const attendanceRecords = generateAttendance(
              student._id,
              user._id,
              classNum,
              teacherId,
              ATTENDANCE_DAYS
            );
            
            if (attendanceRecords.length > 0) {
              await Attendance.insertMany(attendanceRecords);
              totalAttendance += attendanceRecords.length;
            }
            
            // Generate results
            const results = generateResults(
              student._id,
              student.rollNumber,
              classNum,
              teacherId,
              teacherName
            );
            
            if (results.length > 0) {
              await Result.insertMany(results);
              totalResults += results.length;
            }
            
            process.stdout.write(`  ✓ Student ${i + 1}/${STUDENTS_PER_CLASS_SECTION} created\r`);
          } catch (error) {
            console.error(`\n  ❌ Error creating student ${i + 1}:`, error.message);
          }
        }
        
        console.log(`\n  ✅ Class ${classNum}-${section} completed (${STUDENTS_PER_CLASS_SECTION} students)\n`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total Students Created: ${totalStudents}`);
    console.log(`   • Total Attendance Records: ${totalAttendance}`);
    console.log(`   • Total Result Records: ${totalResults}`);
    console.log(`   • Classes: ${CLASSES.join(', ')}`);
    console.log(`   • Sections per Class: ${SECTIONS.join(', ')}`);
    console.log(`   • Students per Class-Section: ${STUDENTS_PER_CLASS_SECTION}`);
    console.log('='.repeat(60));
    console.log('\n💡 Default student login credentials:');
    console.log('   Username: firstname.lastname (e.g., aarav.sharma)');
    console.log('   Password: student123');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seeding
seedData();
