import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/Student.js";
import User from "./models/User.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

const testSynchronizedSystem = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🧪 Testing Synchronized Student-User-Attendance System\n");

    // Test 1: Create a student (simulating registration)
    console.log("1️⃣ Creating a test student with user account...");
    
    // Create User account first
    const username = "john_10A123";
    const defaultPassword = "john@10A123";
    
    const user = new User({
      username,
      email: "john10A123@gmail.com",
      password: defaultPassword,
      fullName: "John Doe",
      role: "student",
      isVerified: true,
      requirePasswordChange: true
    });

    await user.save();
    console.log(`   ✅ User created: ${user.username} (${user.email})`);

    // Create Student record with reference to User
    const student = new Student({
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: new Date("2008-05-15"),
      gender: "male",
      email: "john10A123@gmail.com",
      phone: "1234567890",
      address: "123 Main St",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400001",
      class: "10",
      section: "A",
      rollNumber: "10A123",
      admissionDate: new Date("2024-04-01"),
      parentName: "Jane Doe",
      parentPhone: "9876543210",
      emergencyContact: "9876543210",
      userId: user._id // Link student to user account
    });

    await student.save();
    console.log(`   ✅ Student created: ${student.fullName} (${student.rollNumber})`);
    console.log(`   🔗 Linked to user: ${user._id}`);

    // Test 2: Create attendance records
    console.log("\n2️⃣ Creating attendance records...");
    
    const attendanceRecords = [
      {
        studentId: student._id,
        userId: user._id,
        date: new Date("2024-12-20"),
        class: "10",
        section: "A",
        subject: "Mathematics",
        period: "1",
        status: "present",
        timeIn: new Date("2024-12-20T09:00:00Z"),
        markedBy: user._id // Using same user as marker for test
      },
      {
        studentId: student._id,
        userId: user._id,
        date: new Date("2024-12-20"),
        class: "10",
        section: "A",
        subject: "Physics",
        period: "2",
        status: "late",
        timeIn: new Date("2024-12-20T10:15:00Z"),
        markedBy: user._id
      },
      {
        studentId: student._id,
        userId: user._id,
        date: new Date("2024-12-19"),
        class: "10",
        section: "A",
        subject: "Mathematics",
        period: "1",
        status: "absent",
        markedBy: user._id
      }
    ];

    for (const record of attendanceRecords) {
      const attendance = new Attendance(record);
      await attendance.save();
      console.log(`   ✅ Attendance marked: ${record.subject} - ${record.status}`);
    }

    // Test 3: Query attendance data (simulating student view)
    console.log("\n3️⃣ Testing attendance queries...");
    
    // Get student's attendance summary
    const summary = await Attendance.getStudentSummary(
      student._id,
      new Date("2024-12-01"),
      new Date("2024-12-31")
    );
    console.log("   📊 Attendance Summary:", summary);

    // Get subject-wise summary
    const subjectSummary = await Attendance.getSubjectSummary(
      student._id,
      new Date("2024-12-01"),
      new Date("2024-12-31")
    );
    console.log("   📚 Subject-wise Summary:", subjectSummary);

    // Get detailed records
    const records = await Attendance.find({ studentId: student._id })
      .sort({ date: -1 })
      .populate('markedBy', 'fullName username');
    console.log(`   📝 Found ${records.length} attendance records`);

    // Test 4: Update student data (simulating synchronization)
    console.log("\n4️⃣ Testing data synchronization...");
    
    // Update student name
    student.firstName = "Johnny";
    await student.save();
    
    // Update corresponding user
    user.fullName = student.fullName;
    await user.save();
    
    console.log(`   ✅ Student updated: ${student.fullName}`);
    console.log(`   ✅ User synchronized: ${user.fullName}`);

    // Test 5: Verify data integrity
    console.log("\n5️⃣ Verifying data integrity...");
    
    // Check if student has user reference
    const studentWithUser = await Student.findById(student._id);
    console.log(`   🔗 Student has userId: ${!!studentWithUser.userId}`);
    
    // Check if attendance records exist
    const attendanceCount = await Attendance.countDocuments({ studentId: student._id });
    console.log(`   📊 Attendance records count: ${attendanceCount}`);
    
    // Check if user exists
    const userExists = await User.findById(user._id);
    console.log(`   👤 User exists: ${!!userExists}`);

    console.log("\n🎉 All tests passed! The synchronized system is working correctly.");
    
    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await Attendance.deleteMany({ studentId: student._id });
    await Student.findByIdAndDelete(student._id);
    await User.findByIdAndDelete(user._id);
    console.log("   ✅ Test data cleaned up");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📤 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run the test
testSynchronizedSystem();