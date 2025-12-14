import express from "express";
import Student from "../models/Student.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

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
        totalClasses: 8 // Static for now
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

// Public route to get basic student list (limited info)
router.get("/list/public", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const students = await Student.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('firstName lastName rollNumber class section email phone admissionDate status');

    const total = await Student.countDocuments({ status: 'active' });

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
    // Check if roll number already exists
    const existingRollNumber = await Student.findOne({ rollNumber: req.body.rollNumber });
    if (existingRollNumber) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists"
      });
    }

    // Check if email already exists
    const existingEmail = await Student.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const student = new Student(req.body);
    await student.save();

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: student
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
    // Check if roll number already exists
    const existingRollNumber = await Student.findOne({ rollNumber: req.body.rollNumber });
    if (existingRollNumber) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists"
      });
    }

    // Check if email already exists
    const existingEmail = await Student.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const student = new Student(req.body);
    await student.save();

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: student
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

    const student = await Student.findByIdAndUpdate(
      studentId,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
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
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully"
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