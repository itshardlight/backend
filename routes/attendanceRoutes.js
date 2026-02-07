import express from "express";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();



// Get attendance for a specific student by student ID (admin/teacher access)
router.get("/student/:studentId", authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, subject } = req.query;
    
    // Find the student record
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Set default date range if not provided (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    // Build filter
    const filter = { 
      studentId: student._id,
      date: {
        $gte: new Date(startDate || defaultStartDate),
        $lte: new Date(endDate || defaultEndDate)
      }
    };
    
    if (subject) {
      filter.subject = subject;
    }

    // Get attendance records
    const records = await Attendance.find(filter)
      .sort({ date: -1, period: 1 })
      .populate('markedBy', 'fullName username')
      .lean();

    // Get summary using the model's static method
    const summary = await Attendance.getStudentSummary(
      student._id,
      filter.date.$gte,
      filter.date.$lte
    );

    // Get subject-wise summary
    const subjectSummary = await Attendance.getSubjectSummary(
      student._id,
      filter.date.$gte,
      filter.date.$lte
    );

    // Format records for frontend
    const formattedRecords = records.map(record => ({
      date: record.date,
      subject: record.subject,
      period: record.period,
      status: record.status,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      remarks: record.remarks,
      markedBy: record.markedBy?.fullName || 'System',
      markedAt: record.markedAt
    }));

    res.json({
      success: true,
      data: {
        summary,
        subjectSummary,
        records: formattedRecords,
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        }
      }
    });

  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance data",
      error: error.message
    });
  }
});

// Get attendance for a specific student (student can view their own)
router.get("/my-attendance", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, subject } = req.query;
    
    // Find the student record for this user
    let student = await Student.findOne({ userId });
    
    // Fallback: try to find by email if userId not found
    if (!student) {
      student = await Student.findOne({ email: req.user.email });
      
      // If found, update the student record with userId for future queries
      if (student && !student.userId) {
        student.userId = userId;
        await student.save();
      }
    }
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found for this user"
      });
    }

    // Set default date range if not provided (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    // Build filter
    const filter = { 
      studentId: student._id,
      date: {
        $gte: new Date(startDate || defaultStartDate),
        $lte: new Date(endDate || defaultEndDate)
      }
    };
    
    if (subject) {
      filter.subject = subject;
    }

    // Get attendance records
    const records = await Attendance.find(filter)
      .sort({ date: -1, period: 1 })
      .populate('markedBy', 'fullName username')
      .lean();

    // Get summary using the model's static method
    const summary = await Attendance.getStudentSummary(
      student._id,
      filter.date.$gte,
      filter.date.$lte
    );

    // Get subject-wise summary
    const subjectSummary = await Attendance.getSubjectSummary(
      student._id,
      filter.date.$gte,
      filter.date.$lte
    );

    // Format records for frontend
    const formattedRecords = records.map(record => ({
      date: record.date,
      subject: record.subject,
      period: record.period,
      status: record.status,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      remarks: record.remarks,
      markedBy: record.markedBy?.fullName || 'System',
      markedAt: record.markedAt
    }));

    res.json({
      success: true,
      data: {
        summary,
        subjectSummary,
        records: formattedRecords,
        student: {
          name: student.fullName,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        }
      }
    });

  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance data",
      error: error.message
    });
  }
});

// Get attendance for all students (teachers/admin)
router.get("/class/:class/:section", authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { class: studentClass, section } = req.params;
    const { date, subject, period, startDate, endDate } = req.query;
    
    // Handle date range queries for history
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Get all students in this class
      const students = await Student.find({ 
        class: studentClass, 
        section, 
        status: 'active' 
      }).sort({ rollNumber: 1 });

      // Get all attendance records in the date range
      const attendanceRecords = await Attendance.find({
        class: studentClass,
        section,
        date: { $gte: start, $lte: end }
      })
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('markedBy', 'fullName username')
      .sort({ date: -1, period: 1 })
      .lean();

      // Format the response for history view
      const historyData = attendanceRecords.map(record => ({
        date: record.date,
        subject: record.subject,
        period: record.period,
        studentName: record.studentId.firstName + ' ' + record.studentId.lastName,
        rollNumber: record.studentId.rollNumber,
        status: record.status,
        timeIn: record.timeIn,
        markedAt: record.markedAt,
        markedBy: record.markedBy?.fullName
      }));

      return res.json({
        success: true,
        data: {
          class: studentClass,
          section,
          dateRange: { startDate: start, endDate: end },
          history: historyData,
          totalRecords: historyData.length
        }
      });
    }
    
    // Handle single date queries (existing functionality)
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    // Get all students in this class
    const students = await Student.find({ 
      class: studentClass, 
      section, 
      status: 'active' 
    }).sort({ rollNumber: 1 });

    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          students: [],
          attendance: [],
          summary: { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
        }
      });
    }

    // Build attendance filter
    const attendanceFilter = {
      class: studentClass,
      section,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      }
    };

    if (subject) attendanceFilter.subject = subject;
    if (period) attendanceFilter.period = period;

    // Get existing attendance records
    const attendanceRecords = await Attendance.find(attendanceFilter)
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('markedBy', 'fullName username')
      .lean();

    // Create attendance map
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const key = `${record.studentId._id}_${record.subject}_${record.period}`;
      attendanceMap[key] = record;
    });

    // Prepare response data
    const responseData = students.map(student => {
      const key = `${student._id}_${subject || 'default'}_${period || '1'}`;
      const attendanceRecord = attendanceMap[key];
      
      return {
        student: {
          _id: student._id,
          name: student.fullName,
          rollNumber: student.rollNumber,
          email: student.email
        },
        attendance: attendanceRecord || null,
        status: attendanceRecord ? attendanceRecord.status : 'not_marked'
      };
    });

    // Calculate summary
    const summary = {
      total: students.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length,
      late: attendanceRecords.filter(r => r.status === 'late').length,
      excused: attendanceRecords.filter(r => r.status === 'excused').length,
      not_marked: students.length - attendanceRecords.length
    };

    res.json({
      success: true,
      data: {
        class: studentClass,
        section,
        date: targetDate,
        subject,
        period,
        students: responseData,
        summary
      }
    });

  } catch (error) {
    console.error("Error fetching class attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching class attendance",
      error: error.message
    });
  }
});

// Mark attendance for multiple students
router.post("/mark-attendance", authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { class: studentClass, section, date, subject, period, attendanceData } = req.body;
    const markedBy = req.user._id;

    if (!studentClass || !section || !date || !subject || !period || !attendanceData) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: class, section, date, subject, period, attendanceData"
      });
    }

    const targetDate = new Date(date);
    const results = [];
    const errors = [];

    for (const item of attendanceData) {
      try {
        const { studentId, status, timeIn, timeOut, remarks } = item;

        // Verify student exists and belongs to the class
        const student = await Student.findOne({
          _id: studentId,
          class: studentClass,
          section,
          status: 'active'
        });

        if (!student) {
          errors.push(`Student ${studentId} not found or not in class ${studentClass}-${section}`);
          continue;
        }

        // Ensure student has userId (for legacy records)
        if (!student.userId) {
          const User = (await import("../models/User.js")).default;
          const user = await User.findOne({ email: student.email });
          if (user) {
            student.userId = user._id;
            await student.save();
          } else {
            errors.push(`Student ${student.firstName} ${student.lastName} has no linked user account`);
            continue;
          }
        }

        // Find or create attendance record
        const filter = {
          studentId,
          userId: student.userId,
          date: targetDate,
          subject,
          period
        };

        const updateData = {
          class: studentClass,
          section,
          status,
          markedBy,
          markedAt: new Date(),
          lastUpdatedBy: markedBy
        };

        if (timeIn) updateData.timeIn = new Date(timeIn);
        if (timeOut) updateData.timeOut = new Date(timeOut);
        if (remarks) updateData.remarks = remarks;

        const attendanceRecord = await Attendance.findOneAndUpdate(
          filter,
          updateData,
          { upsert: true, new: true, runValidators: true }
        ).populate('studentId', 'firstName lastName rollNumber');

        results.push({
          studentId,
          studentName: attendanceRecord.studentId.fullName,
          rollNumber: attendanceRecord.studentId.rollNumber,
          status,
          success: true
        });

      } catch (error) {
        errors.push(`Error marking attendance for student ${item.studentId}: ${error.message}`);
      }
    }

    res.json({
      success: errors.length === 0,
      message: errors.length === 0 ? 
        `Attendance marked successfully for ${results.length} students` :
        `Attendance marked for ${results.length} students with ${errors.length} errors`,
      data: {
        successful: results,
        errors
      }
    });

  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking attendance",
      error: error.message
    });
  }
});

// Update single attendance record
router.put("/update/:attendanceId", authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, timeIn, timeOut, remarks } = req.body;
    const lastUpdatedBy = req.user._id;

    const updateData = {
      lastUpdatedBy,
      markedAt: new Date()
    };

    if (status) updateData.status = status;
    if (timeIn) updateData.timeIn = new Date(timeIn);
    if (timeOut) updateData.timeOut = new Date(timeOut);
    if (remarks !== undefined) updateData.remarks = remarks;

    const attendanceRecord = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('studentId', 'firstName lastName rollNumber')
     .populate('markedBy', 'fullName username');

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found"
      });
    }

    res.json({
      success: true,
      message: "Attendance updated successfully",
      data: attendanceRecord
    });

  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error updating attendance",
      error: error.message
    });
  }
});

// Get attendance statistics for admin dashboard
router.get("/stats/overview", authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate, class: studentClass, section } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const matchFilter = { ...dateFilter };
    if (studentClass) matchFilter.class = studentClass;
    if (section) matchFilter.section = section;

    // Overall statistics
    const overallStats = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $round: [
              { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
              2
            ]
          }
        }
      }
    ]);

    // Class-wise statistics
    const classStats = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { class: "$class", section: "$section" },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          attendanceRate: {
            $round: [
              { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { "_id.class": 1, "_id.section": 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
        byClass: classStats,
        period: {
          startDate: matchFilter.date.$gte,
          endDate: matchFilter.date.$lte
        }
      }
    });

  } catch (error) {
    console.error("Error fetching attendance statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance statistics",
      error: error.message
    });
  }
});

export default router;