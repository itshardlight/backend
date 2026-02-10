import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { sendStudentCredentialsEmail } from "../utils/emailService.js";

const router = express.Router();

// Helper function to send email notification to parent
const sendParentNotification = async (student, loginCredentials) => {
  let emailSent = false;
  let emailError = null;
  
  if (student.parentEmail) {
    try {
      const emailResult = await sendStudentCredentialsEmail(
        student.parentEmail,
        {
          firstName: student.firstName,
          lastName: student.lastName,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section,
          email: student.email
        },
        loginCredentials
      );
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
      }
    } catch (error) {
      console.error("Error sending email notification:", error);
      emailError = error.message;
    }
  }
  
  return { emailSent, emailError };
};

// Test route (no authentication required)
router.get("/test", async (req, res) => {
  res.json({
    success: true,
    message: "Student routes are working!",
    timestamp: new Date().toISOString()
  });
});

// Public route to get basic statistics
router.get("/stats/public", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'active' });
    
    // Get new registrations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await Student.countDocuments({
      registrationDate: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        newThisMonth,
        totalClasses: 10 // Updated to reflect classes 1-10
      }
    });
  } catch (error) {
    console.error("Error fetching public statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
});

// Public route to get student counts by class and section
router.get("/counts/class-section", async (req, res) => {
  try {
    const counts = await Student.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.class': 1, '_id.section': 1 }
      }
    ]);

    // Transform the data into a more usable format
    const classSectionCounts = {};
    counts.forEach(item => {
      const { class: cls, section } = item._id;
      if (!classSectionCounts[cls]) {
        classSectionCounts[cls] = {};
      }
      classSectionCounts[cls][section] = item.count;
    });

    res.json({
      success: true,
      data: classSectionCounts
    });
  } catch (error) {
    console.error("Error fetching class-section counts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching class-section counts",
      error: error.message
    });
  }
});

// Public route to generate unique roll number
router.post("/generate-rollnumber", async (req, res) => {
  try {
    const { class: studentClass, section } = req.body;
    
    if (!studentClass || !section) {
      return res.status(400).json({
        success: false,
        message: "Class and section are required"
      });
    }

    let rollNumber;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      const randomNum = Math.floor(100 + Math.random() * 900);
      rollNumber = `${studentClass}${section}${randomNum}`;
      attempts++;
    } while (
      await Student.findOne({ rollNumber }) && 
      attempts < maxAttempts
    );
    
    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate unique roll number. Please try again."
      });
    }

    res.json({
      success: true,
      data: { rollNumber }
    });
  } catch (error) {
    console.error("Error generating roll number:", error);
    res.status(500).json({
      success: false,
      message: "Error generating roll number",
      error: error.message
    });
  }
});

// Public route to get basic student list (limited info)
router.get("/list/public", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Increased limit for attendance
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { status: 'active' };
    if (req.query.class) filter.class = req.query.class;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { rollNumber: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const students = await Student.find(filter)
      .sort({ rollNumber: 1 }) // Sort by roll number for attendance
      .skip(skip)
      .limit(limit)
      .select('firstName lastName rollNumber class section email phone admissionDate status');

    const total = await Student.countDocuments(filter);

    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalStudents: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching public student list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message
    });
  }
});

// Public route to create student (for registration form)
router.post("/register", async (req, res) => {
  try {
    // Auto-generate roll number if not provided or if it conflicts
    if (!req.body.rollNumber || req.body.rollNumber.includes('AUTO')) {
      const { class: studentClass, section } = req.body;
      if (studentClass && section) {
        let rollNumber;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          const randomNum = Math.floor(100 + Math.random() * 900);
          rollNumber = `${studentClass}${section}${randomNum}`;
          attempts++;
        } while (
          await Student.findOne({ rollNumber }) && 
          attempts < maxAttempts
        );
        
        if (attempts >= maxAttempts) {
          return res.status(500).json({
            success: false,
            message: "Unable to generate unique roll number. Please try again."
          });
        }
        
        req.body.rollNumber = rollNumber;
      }
    }

    // Auto-generate email: firstname + rollnumber + @gmail.com
    if (!req.body.email && req.body.firstName && req.body.rollNumber) {
      req.body.email = `${req.body.firstName.toLowerCase()}${req.body.rollNumber}@gmail.com`;
    }

    // Check if roll number already exists
    const existingRollNumber = await Student.findOne({ rollNumber: req.body.rollNumber });
    if (existingRollNumber) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists"
      });
    }

    // Check if email already exists in Student or User collections
    const existingStudentEmail = await Student.findOne({ email: req.body.email });
    if (existingStudentEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in student records"
      });
    }

    const existingUserEmail = await User.findOne({ email: req.body.email });
    if (existingUserEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in user accounts"
      });
    }

    // Create User account first
    const username = `${req.body.firstName.toLowerCase()}_${req.body.rollNumber}`;
    const defaultPassword = `${req.body.firstName.toLowerCase()}@${req.body.rollNumber}`;
    
    const user = new User({
      username,
      email: req.body.email,
      password: defaultPassword,
      fullName: `${req.body.firstName} ${req.body.lastName}`,
      role: "student",
      isVerified: true,
      requirePasswordChange: true // Force password change on first login
    });

    await user.save();

    // Create Student record with reference to User
    const studentData = {
      ...req.body,
      userId: user._id // Link student to user account
    };

    const student = new Student(studentData);
    await student.save();

    // Import Profile model
    const Profile = (await import("../models/Profile.js")).default;

    // Use guardian email from the form
    const guardianEmail = req.body.guardianEmail;

    // Create Profile record linked to User and Student
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
        country: "Nepal"
      },
      academic: {
        currentGrade: student.class,
        section: student.section,
        rollNumber: student.rollNumber,
        admissionDate: student.admissionDate,
        previousSchool: student.previousSchool
      },
      parentInfo: {
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        guardianName: student.guardianName || "",
        parentEmail: guardianEmail || ""
      },
      medicalInfo: {
        conditions: student.medicalConditions || ""
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

    // Send email notification to guardian with login credentials
    const loginCredentials = {
      username: username,
      temporaryPassword: defaultPassword
    };
    
    let emailSent = false;
    let emailError = null;
    
    if (guardianEmail) {
      try {
        const emailResult = await sendStudentCredentialsEmail(
          guardianEmail,
          {
            firstName: student.firstName,
            lastName: student.lastName,
            rollNumber: student.rollNumber,
            class: student.class,
            section: student.section,
            email: student.email
          },
          loginCredentials
        );
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
        emailError = error.message;
      }
    }

    res.status(201).json({
      success: true,
      message: "Student registered successfully - Student account and profile created",
      data: {
        student: student,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          requirePasswordChange: user.requirePasswordChange
        },
        profile: {
          id: profile._id,
          rollNumber: profile.academic.rollNumber,
          class: profile.academic.currentGrade,
          section: profile.academic.section
        },
        loginCredentials: {
          studentUsername: username,
          studentPassword: defaultPassword,
          studentEmail: req.body.email,
          note: "Student must change password on first login"
        },
        emailNotification: {
          sent: emailSent,
          guardianEmail: guardianEmail,
          error: emailError
        },
        linkedSystems: {
          userAccount: true,
          studentRecord: true,
          profile: true,
          readyForAttendance: true,
          readyForFees: true,
          readyForAchievements: true,
          readyForResults: true
        }
      }
    });
  } catch (error) {
    console.error("Error creating student:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating student",
      error: error.message
    });
  }
});

// Get all students with pagination and filtering (admin only)
router.get("/", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.class) filter.class = req.query.class;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { rollNumber: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Student.countDocuments(filter);

    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalStudents: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message
    });
  }
});

// Get student by ID (admin only)
router.get("/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-__v');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message
    });
  }
});

// Create new student (admin only)
router.post("/", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Import Profile model
    const Profile = (await import("../models/Profile.js")).default;

    // Auto-generate email if not provided
    if (!req.body.email && req.body.firstName && req.body.rollNumber) {
      req.body.email = `${req.body.firstName.toLowerCase()}${req.body.rollNumber}@gmail.com`;
    }

    // Check if roll number already exists
    const existingRollNumber = await Student.findOne({ rollNumber: req.body.rollNumber });
    if (existingRollNumber) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists"
      });
    }

    // Check if email already exists in Student or User collections
    const existingStudentEmail = await Student.findOne({ email: req.body.email });
    if (existingStudentEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in student records"
      });
    }

    const existingUserEmail = await User.findOne({ email: req.body.email });
    if (existingUserEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in user accounts"
      });
    }

    // Create User account first
    const username = `${req.body.firstName.toLowerCase()}_${req.body.rollNumber}`;
    const defaultPassword = `${req.body.firstName.toLowerCase()}@${req.body.rollNumber}`;
    
    const user = new User({
      username,
      email: req.body.email,
      password: defaultPassword,
      fullName: `${req.body.firstName} ${req.body.lastName}`,
      role: "student",
      isVerified: true,
      requirePasswordChange: true // Force password change on first login
    });

    await user.save();

    // Create Student record with reference to User
    const studentData = {
      ...req.body,
      userId: user._id // Link student to user account
    };

    const student = new Student(studentData);
    await student.save();

    // Use guardian email from the form
    const guardianEmail = req.body.guardianEmail;

    // Create Profile record linked to User and Student
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
        country: "Nepal"
      },
      academic: {
        currentGrade: student.class,
        section: student.section,
        rollNumber: student.rollNumber,
        admissionDate: student.admissionDate,
        previousSchool: student.previousSchool
      },
      parentInfo: {
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        guardianName: student.guardianName || "",
        parentEmail: guardianEmail || ""
      },
      medicalInfo: {
        conditions: student.medicalConditions || ""
      },
      feeInfo: {
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: 'pending'
      },
      achievements: [],
      createdBy: req.user._id
    });

    await profile.save();

    // Send email notification to guardian with login credentials
    const loginCredentials = {
      username: username,
      temporaryPassword: defaultPassword
    };
    
    let emailSent = false;
    let emailError = null;
    
    if (guardianEmail) {
      try {
        const emailResult = await sendStudentCredentialsEmail(
          guardianEmail,
          {
            firstName: student.firstName,
            lastName: student.lastName,
            rollNumber: student.rollNumber,
            class: student.class,
            section: student.section,
            email: student.email
          },
          loginCredentials
        );
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
        emailError = error.message;
      }
    }

    res.status(201).json({
      success: true,
      message: "Student registered successfully - Student account and profile created",
      data: {
        student: student,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          requirePasswordChange: user.requirePasswordChange
        },
        profile: {
          id: profile._id,
          rollNumber: profile.academic.rollNumber,
          class: profile.academic.currentGrade,
          section: profile.academic.section
        },
        loginCredentials: {
          studentUsername: username,
          studentPassword: defaultPassword,
          studentEmail: req.body.email,
          note: "Student must change password on first login"
        },
        emailNotification: {
          sent: emailSent,
          guardianEmail: guardianEmail,
          error: emailError
        },
        linkedSystems: {
          userAccount: true,
          studentRecord: true,
          profile: true,
          readyForAttendance: true,
          readyForFees: true,
          readyForAchievements: true,
          readyForResults: true
        }
      }
    });
  } catch (error) {
    console.error("Error creating student:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating student",
      error: error.message
    });
  }
});

// Update student (admin only)
router.put("/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Check if roll number already exists (excluding current student)
    if (req.body.rollNumber) {
      const existingRollNumber = await Student.findOne({ 
        rollNumber: req.body.rollNumber,
        _id: { $ne: studentId }
      });
      if (existingRollNumber) {
        return res.status(400).json({
          success: false,
          message: "Roll number already exists"
        });
      }
    }

    // Check if email already exists (excluding current student)
    if (req.body.email) {
      const existingEmail = await Student.findOne({ 
        email: req.body.email,
        _id: { $ne: studentId }
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
    }

    // Get the current student to find associated user
    const currentStudent = await Student.findById(studentId);
    if (!currentStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Update student record
    const student = await Student.findByIdAndUpdate(
      studentId,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    // Update associated user account if it exists
    if (currentStudent.userId) {
      const userUpdateData = {};
      
      if (req.body.email) userUpdateData.email = req.body.email;
      if (req.body.firstName || req.body.lastName) {
        userUpdateData.fullName = `${req.body.firstName || currentStudent.firstName} ${req.body.lastName || currentStudent.lastName}`;
      }
      
      if (Object.keys(userUpdateData).length > 0) {
        await User.findByIdAndUpdate(currentStudent.userId, userUpdateData);
      }
    }

    res.json({
      success: true,
      message: "Student updated successfully (user account also synchronized)",
      data: student
    });
  } catch (error) {
    console.error("Error updating student:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message
    });
  }
});

// Delete student (admin only)
router.delete("/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Delete associated user account if it exists
    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    // Delete the student record
    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Student and associated user account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting student",
      error: error.message
    });
  }
});

// Get student statistics (admin only)
router.get("/stats/overview", authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'active' });
    const inactiveStudents = await Student.countDocuments({ status: 'inactive' });
    
    // Get students by class
    const studentsByClass = await Student.aggregate([
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get new registrations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await Student.countDocuments({
      registrationDate: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        newThisMonth,
        studentsByClass
      }
    });
  } catch (error) {
    console.error("Error fetching student statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
});

export default router;