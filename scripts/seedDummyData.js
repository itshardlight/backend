import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Result from '../models/Result.js';
import Attendance from '../models/Attendance.js';
import Profile from '../models/Profile.js';
import bcrypt from 'bcrypt';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Student names pool
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Reyansh', 'Aadhya', 'Ananya', 'Pari', 'Anika', 'Ira',
  'Diya', 'Navya', 'Saanvi', 'Myra', 'Sara', 'Kiara', 'Riya', 'Prisha', 'Avni', 'Anvi',
  'Rohan', 'Kabir', 'Dhruv', 'Karan', 'Yash', 'Tanvi', 'Nisha', 'Pooja', 'Sneha', 'Priya'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Rao', 'Nair', 'Iyer',
  'Joshi', 'Mehta', 'Shah', 'Desai', 'Kulkarni', 'Agarwal', 'Bansal', 'Malhotra', 'Kapoor', 'Chopra',
  'Bhatia', 'Sethi', 'Khanna', 'Arora', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Jain'
];

// Subject configurations by class
const subjectsByClass = {
  '1': [
    { name: 'English', code: 'ENG1', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH1', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN1', maxMarks: 100 },
    { name: 'EVS', code: 'EVS1', maxMarks: 100 }
  ],
  '2': [
    { name: 'English', code: 'ENG2', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH2', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN2', maxMarks: 100 },
    { name: 'EVS', code: 'EVS2', maxMarks: 100 }
  ],
  '3': [
    { name: 'English', code: 'ENG3', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH3', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN3', maxMarks: 100 },
    { name: 'EVS', code: 'EVS3', maxMarks: 100 }
  ],
  '4': [
    { name: 'English', code: 'ENG4', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH4', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN4', maxMarks: 100 },
    { name: 'Science', code: 'SCI4', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST4', maxMarks: 100 }
  ],
  '5': [
    { name: 'English', code: 'ENG5', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH5', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN5', maxMarks: 100 },
    { name: 'Science', code: 'SCI5', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST5', maxMarks: 100 }
  ],
  '6': [
    { name: 'English', code: 'ENG6', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH6', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN6', maxMarks: 100 },
    { name: 'Science', code: 'SCI6', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST6', maxMarks: 100 },
    { name: 'Computer Science', code: 'CS6', maxMarks: 100 }
  ],
  '7': [
    { name: 'English', code: 'ENG7', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH7', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN7', maxMarks: 100 },
    { name: 'Science', code: 'SCI7', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST7', maxMarks: 100 },
    { name: 'Computer Science', code: 'CS7', maxMarks: 100 }
  ],
  '8': [
    { name: 'English', code: 'ENG8', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH8', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN8', maxMarks: 100 },
    { name: 'Science', code: 'SCI8', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST8', maxMarks: 100 },
    { name: 'Computer Science', code: 'CS8', maxMarks: 100 }
  ],
  '9': [
    { name: 'English', code: 'ENG9', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH9', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN9', maxMarks: 100 },
    { name: 'Science', code: 'SCI9', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST9', maxMarks: 100 },
    { name: 'Computer Science', code: 'CS9', maxMarks: 100 }
  ],
  '10': [
    { name: 'English', code: 'ENG10', maxMarks: 100 },
    { name: 'Mathematics', code: 'MATH10', maxMarks: 100 },
    { name: 'Hindi', code: 'HIN10', maxMarks: 100 },
    { name: 'Science', code: 'SCI10', maxMarks: 100 },
    { name: 'Social Studies', code: 'SST10', maxMarks: 100 },
    { name: 'Computer Science', code: 'CS10', maxMarks: 100 }
  ]
};

// Exam types for the academic year
const examTypes = [
  { type: 'unit_test_1', month: 4 },  // April
  { type: 'unit_test_2', month: 6 },  // June
  { type: 'mid_term', month: 8 },     // August
  { type: 'unit_test_1', month: 10 }, // October (second cycle)
  { type: 'final_term', month: 12 }   // December
];

// Generate random marks based on student performance level
const generateMarks = (maxMarks, performanceLevel) => {
  let min, max;
  switch (performanceLevel) {
    case 'excellent':
      min = 85;
      max = 98;
      break;
    case 'good':
      min = 70;
      max = 84;
      break;
    case 'average':
      min = 50;
      max = 69;
      break;
    case 'below_average':
      min = 35;
      max = 49;
      break;
    case 'poor':
      min = 20;
      max = 34;
      break;
    default:
      min = 50;
      max = 85;
  }
  
  const percentage = min + Math.random() * (max - min);
  return Math.round((percentage / 100) * maxMarks);
};

// Generate attendance status based on student attendance pattern
const generateAttendanceStatus = (attendancePattern) => {
  const rand = Math.random() * 100;
  
  switch (attendancePattern) {
    case 'excellent':
      return rand < 95 ? 'present' : (rand < 98 ? 'late' : 'absent');
    case 'good':
      return rand < 85 ? 'present' : (rand < 92 ? 'late' : 'absent');
    case 'average':
      return rand < 75 ? 'present' : (rand < 85 ? 'late' : 'absent');
    case 'poor':
      return rand < 60 ? 'present' : (rand < 70 ? 'late' : 'absent');
    default:
      return rand < 80 ? 'present' : (rand < 90 ? 'late' : 'absent');
  }
};

// Main seeding function
const seedData = async () => {
  try {
    console.log('Starting data seeding...');

    // Get or create admin user for entering results
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@school.com',
        password: hashedPassword,
        role: 'admin',
        fullName: 'System Administrator'
      });
      console.log('Admin user created');
    }

    const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    const sections = ['A', 'B', 'C'];
    const academicYear = '2024-25';

    let totalStudents = 0;
    let totalResults = 0;
    let totalAttendance = 0;

    // Loop through each class and section
    for (const className of classes) {
      for (const section of sections) {
        console.log(`\nProcessing Class ${className}-${section}...`);

        // Create 15 students per section
        const studentsPerSection = 15;
        const students = [];

        for (let i = 1; i <= studentsPerSection; i++) {
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const rollNumber = `${className}${section}${String(i).padStart(3, '0')}`;
          
          // Assign performance and attendance patterns
          const performanceLevels = ['excellent', 'good', 'average', 'below_average', 'poor'];
          const attendancePatterns = ['excellent', 'good', 'average', 'poor'];
          
          const performanceLevel = performanceLevels[Math.floor(Math.random() * performanceLevels.length)];
          const attendancePattern = attendancePatterns[Math.floor(Math.random() * attendancePatterns.length)];

          // Create user account for student
          const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`;
          const email = `${username}@student.school.com`;
          const hashedPassword = await bcrypt.hash('student123', 10);

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              username,
              email,
              password: hashedPassword,
              role: 'student',
              fullName: `${firstName} ${lastName}`
            });
          }

          // Create student record
          let student = await Student.findOne({ rollNumber });
          if (!student) {
            student = await Student.create({
              userId: user._id,
              firstName,
              lastName,
              dateOfBirth: new Date(2010 + parseInt(className), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
              gender: Math.random() > 0.5 ? 'male' : 'female',
              email,
              phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
              address: `${Math.floor(Math.random() * 100) + 1} Main Street, Sector ${Math.floor(Math.random() * 50) + 1}`,
              city: 'Mumbai',
              state: 'Maharashtra',
              class: className,
              section,
              rollNumber,
              admissionDate: new Date(2024, 3, 1), // April 1, 2024
              status: 'active',
              guardianName: `Mr. ${lastName}`,
              guardianContact: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
              guardianEmail: `parent.${username}@gmail.com`,
              guardianType: 'Father',
              fatherName: `Mr. ${lastName}`,
              fatherContact: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
              motherName: `Mrs. ${lastName}`,
              motherContact: `98${Math.floor(10000000 + Math.random() * 90000000)}`
            });

            students.push({ student, performanceLevel, attendancePattern });
            totalStudents++;
          } else {
            students.push({ student, performanceLevel, attendancePattern });
          }
        }

        console.log(`  Created ${students.length} students`);

        // Create exam results for each student
        for (const { student, performanceLevel } of students) {
          for (const exam of examTypes) {
            // Check if result already exists
            const existingResult = await Result.findOne({
              studentId: student._id,
              examType: exam.type,
              academicYear
            });

            if (!existingResult) {
              const subjects = subjectsByClass[className];
              const subjectsWithMarks = subjects.map(subject => ({
                subjectName: subject.name,
                subjectCode: subject.code,
                maxMarks: subject.maxMarks,
                obtainedMarks: generateMarks(subject.maxMarks, performanceLevel),
                remarks: ''
              }));

              const examDate = new Date(2024, exam.month - 1, Math.floor(Math.random() * 20) + 5);

              await Result.create({
                studentId: student._id,
                rollNumber: student.rollNumber,
                class: className,
                section,
                examType: exam.type,
                academicYear,
                subjects: subjectsWithMarks,
                enteredBy: adminUser._id,
                teacherName: adminUser.fullName,
                examDate
              });

              totalResults++;
            }
          }
        }

        console.log(`  Created exam results for ${students.length} students`);

        // Create attendance records (last 90 days)
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);

        for (const { student, attendancePattern } of students) {
          const currentDate = new Date(startDate);

          while (currentDate <= today) {
            // Skip weekends
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              const dateStr = currentDate.toISOString().split('T')[0];

              // Check if attendance already exists
              const existingAttendance = await Attendance.findOne({
                studentId: student._id,
                date: dateStr
              });

              if (!existingAttendance) {
                const status = generateAttendanceStatus(attendancePattern);

                await Attendance.create({
                  studentId: student._id,
                  date: dateStr,
                  status,
                  markedBy: adminUser._id,
                  remarks: status === 'absent' ? 'Absent without notice' : ''
                });

                totalAttendance++;
              }
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        console.log(`  Created attendance records for ${students.length} students`);
      }
    }

    console.log('\n=================================');
    console.log('Data Seeding Completed!');
    console.log('=================================');
    console.log(`Total Students Created: ${totalStudents}`);
    console.log(`Total Results Created: ${totalResults}`);
    console.log(`Total Attendance Records: ${totalAttendance}`);
    console.log('\nDefault Credentials:');
    console.log('  Admin: admin@school.com / admin123');
    console.log('  Students: [firstname].[lastname][number]@student.school.com / student123');
    console.log('  Example: aarav.sharma1@student.school.com / student123');
    console.log('=================================\n');

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

// Run the seeding
const run = async () => {
  try {
    await connectDB();
    await seedData();
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

run();
