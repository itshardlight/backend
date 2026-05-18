import express from "express";
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────────────────

/** Return a Date set to 00:00:00.000 UTC for the given date value */
const toMidnight = (d) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const VALID_STATUSES = ["present", "absent", "late", "excused"];

/** Format a raw Attendance document for API responses */
const formatRecord = (record) => ({
  _id:       record._id,
  date:      record.date,
  status:    record.status,
  remarks:   record.remarks || "",
  markedBy:  record.markedBy?.fullName || record.markedBy?.username || "System",
  markedAt:  record.markedAt
});

// ── GET /student/:studentId  (admin | teacher | parent) ───────────────────────
// Admin/teacher can view any student. Parent can only view their own child.
router.get(
  "/student/:studentId",
  authenticateToken,
  requireRole(["admin", "teacher", "parent"]),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate studentId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Invalid student ID" });
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }

      // Parents may only view their own child's attendance
      if (req.user.role === "parent") {
        const isChild = student.guardianEmail === req.user.email ||
                        (student.userId && student.userId.toString() !== req.user._id.toString());
        // More reliable: check if the parent's user email matches the student's guardian email
        if (student.guardianEmail !== req.user.email) {
          return res.status(403).json({
            success: false,
            message: "You can only view your own child's attendance"
          });
        }
      }

      const defaultEnd   = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);

      const dateFrom = startDate ? new Date(startDate) : defaultStart;
      const dateTo   = endDate   ? new Date(endDate)   : defaultEnd;

      if (isNaN(dateFrom) || isNaN(dateTo)) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }

      const records = await Attendance.find({
        studentId: student._id,
        date: { $gte: dateFrom, $lte: dateTo }
      })
        .sort({ date: -1 })
        .populate("markedBy", "fullName username")
        .lean();

      const summary = await Attendance.getStudentSummary(student._id, dateFrom, dateTo);

      res.json({
        success: true,
        data: {
          summary,
          records: records.map(formatRecord),
          student: {
            name:       student.fullName,
            rollNumber: student.rollNumber,
            class:      student.class,
            section:    student.section
          }
        }
      });

    } catch (error) {
      console.error("Error fetching student attendance:", error);
      res.status(500).json({ success: false, message: "Error fetching attendance data", error: error.message });
    }
  }
);

// ── GET /my-attendance  (student | parent) ────────────────────────────────────
// Students see their own attendance. Parents see their child's attendance.
router.get("/my-attendance", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const role = req.user.role;

    if (!["student", "parent"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "This endpoint is for students and parents only"
      });
    }

    // ── Resolve the student record ─────────────────────────────────────────────
    let student = null;

    if (role === "student") {
      // Try by userId first, fall back to email
      student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        student = await Student.findOne({ email: req.user.email });
        if (student && !student.userId) {
          student.userId = req.user._id;
          await student.save();
        }
      }
    } else {
      // Parent: find the child whose guardianEmail matches the parent's email
      student = await Student.findOne({ guardianEmail: req.user.email });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: role === "parent"
          ? "No student record found linked to your account"
          : "Student record not found for this user"
      });
    }

    const defaultEnd   = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);

    const dateFrom = startDate ? new Date(startDate) : defaultStart;
    const dateTo   = endDate   ? new Date(endDate)   : defaultEnd;

    if (isNaN(dateFrom) || isNaN(dateTo)) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const records = await Attendance.find({
      studentId: student._id,
      date: { $gte: dateFrom, $lte: dateTo }
    })
      .sort({ date: -1 })
      .populate("markedBy", "fullName username")
      .lean();

    const summary = await Attendance.getStudentSummary(student._id, dateFrom, dateTo);

    res.json({
      success: true,
      data: {
        summary,
        records: records.map(formatRecord),
        student: {
          name:       student.fullName,
          rollNumber: student.rollNumber,
          class:      student.class,
          section:    student.section
        }
      }
    });

  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ success: false, message: "Error fetching attendance data", error: error.message });
  }
});

// ── GET /class/:class/:section  (admin | teacher) ─────────────────────────────
router.get(
  "/class/:class/:section",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { class: studentClass } = req.params;
      const { date, startDate, endDate } = req.query;

      // Validate class and section
      const validClasses  = ["1","2","3","4","5","6","7","8","9","10"];
      const validSections = ["A","B","C"];
      if (!validClasses.includes(studentClass)) {
        return res.status(400).json({ success: false, message: "Invalid class value" });
      }
      if (!validSections.includes(section)) {
        return res.status(400).json({ success: false, message: "Invalid section value" });
      }

      // ── History view (date range) ────────────────────────────────────────────
      if (startDate && endDate) {
        const start = toMidnight(startDate);
        const end   = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start) || isNaN(end)) {
          return res.status(400).json({ success: false, message: "Invalid date format" });
        }

        const attendanceRecords = await Attendance.find({
          class: studentClass,
          section,
          date: { $gte: start, $lte: end }
        })
          .populate("studentId", "firstName lastName rollNumber")
          .populate("markedBy",  "fullName username")
          .sort({ date: -1 })
          .lean();

        const historyData = attendanceRecords
          .filter(r => r.studentId) // guard against orphaned records
          .map(record => ({
            date:        record.date,
            studentName: `${record.studentId.firstName} ${record.studentId.lastName}`,
            rollNumber:  record.studentId.rollNumber,
            status:      record.status,
            remarks:     record.remarks || "",
            markedAt:    record.markedAt,
            markedBy:    record.markedBy?.fullName || record.markedBy?.username || "System"
          }));

        return res.json({
          success: true,
          data: {
            class:        studentClass,
            section,
            dateRange:    { startDate: start, endDate: end },
            history:      historyData,
            totalRecords: historyData.length
          }
        });
      }

      // ── Single-day view ──────────────────────────────────────────────────────
      const targetDate = date ? toMidnight(date) : toMidnight(new Date());
      if (isNaN(targetDate)) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }

      const students = await Student.find({
        class: studentClass,
        section,
        status: "active"
      }).sort({ rollNumber: 1 });

      if (students.length === 0) {
        return res.json({
          success: true,
          data: {
            class: studentClass, section,
            date: targetDate,
            students: [],
            summary: { total: 0, present: 0, absent: 0, late: 0, excused: 0, not_marked: 0 }
          }
        });
      }

      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      const attendanceRecords = await Attendance.find({
        class: studentClass,
        section,
        date: { $gte: targetDate, $lt: nextDay }
      })
        .populate("studentId", "firstName lastName rollNumber")
        .lean();

      // Build a map keyed by studentId string
      const attendanceMap = {};
      attendanceRecords.forEach(record => {
        if (record.studentId) {
          attendanceMap[record.studentId._id.toString()] = record;
        }
      });

      const responseData = students.map(student => {
        const record = attendanceMap[student._id.toString()];
        return {
          student: {
            _id:        student._id,
            name:       student.fullName,
            rollNumber: student.rollNumber,
            email:      student.email
          },
          attendance: record || null,
          status:     record ? record.status : "not_marked"
        };
      });

      const summary = {
        total:      students.length,
        present:    attendanceRecords.filter(r => r.status === "present").length,
        absent:     attendanceRecords.filter(r => r.status === "absent").length,
        late:       attendanceRecords.filter(r => r.status === "late").length,
        excused:    attendanceRecords.filter(r => r.status === "excused").length,
        not_marked: students.length - attendanceRecords.length
      };

      res.json({
        success: true,
        data: { class: studentClass, section, date: targetDate, students: responseData, summary }
      });

    } catch (error) {
      console.error("Error fetching class attendance:", error);
      res.status(500).json({ success: false, message: "Error fetching class attendance", error: error.message });
    }
  }
);

// ── POST /mark-attendance  (admin | teacher) ──────────────────────────────────
router.post(
  "/mark-attendance",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { class: studentClass, section, date, attendanceData } = req.body;
      const markedBy = req.user._id;

      // ── Input validation ─────────────────────────────────────────────────────
      if (!studentClass || !section || !date) {
        return res.status(400).json({
          success: false,
          message: "class, section, and date are required"
        });
      }

      if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        return res.status(400).json({
          success: false,
          message: "attendanceData must be a non-empty array"
        });
      }

      const validClasses  = ["1","2","3","4","5","6","7","8","9","10"];
      const validSections = ["A","B","C"];
      if (!validClasses.includes(studentClass)) {
        return res.status(400).json({ success: false, message: "Invalid class value" });
      }
      if (!validSections.includes(section)) {
        return res.status(400).json({ success: false, message: "Invalid section value" });
      }

      const targetDate = toMidnight(date);
      if (isNaN(targetDate)) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }

      // Reject future dates
      if (targetDate > toMidnight(new Date())) {
        return res.status(400).json({ success: false, message: "Cannot mark attendance for a future date" });
      }

      const results = [];
      const errors  = [];

      for (const item of attendanceData) {
        try {
          const { studentId, status, remarks } = item;

          // Validate studentId
          if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            errors.push(`Invalid studentId: ${studentId}`);
            continue;
          }

          // Validate status
          if (!status || !VALID_STATUSES.includes(status)) {
            errors.push(`Invalid status "${status}" for student ${studentId}. Must be one of: ${VALID_STATUSES.join(", ")}`);
            continue;
          }

          // Verify student belongs to this class/section and is active
          const student = await Student.findOne({
            _id: studentId,
            class: studentClass,
            section,
            status: "active"
          });

          if (!student) {
            errors.push(`Student ${studentId} not found or not active in class ${studentClass}-${section}`);
            continue;
          }

          // Resolve userId if missing (link legacy records)
          if (!student.userId) {
            const linkedUser = await User.findOne({ email: student.email });
            if (linkedUser) {
              student.userId = linkedUser._id;
              await student.save();
            }
            // userId is now optional — we proceed even without it
          }

          // Upsert: one record per student per day
          const filter = { studentId: student._id, date: targetDate };

          const update = {
            $set: {
              class:         studentClass,
              section,
              status,
              remarks:       remarks || "",
              markedBy,
              markedAt:      new Date(),
              lastUpdatedBy: markedBy
            },
            // Only set userId and studentId on first insert
            $setOnInsert: {
              studentId: student._id,
              userId:    student.userId || undefined,
              date:      targetDate
            }
          };

          const attendanceRecord = await Attendance.findOneAndUpdate(
            filter,
            update,
            { upsert: true, new: true, runValidators: true }
          ).populate("studentId", "firstName lastName rollNumber");

          results.push({
            studentId,
            studentName: `${attendanceRecord.studentId.firstName} ${attendanceRecord.studentId.lastName}`,
            rollNumber:  attendanceRecord.studentId.rollNumber,
            status,
            success: true
          });

        } catch (err) {
          errors.push(`Error for student ${item.studentId}: ${err.message}`);
        }
      }

      res.json({
        success: errors.length === 0,
        message: errors.length === 0
          ? `Attendance marked for ${results.length} student(s)`
          : `Marked ${results.length} student(s) with ${errors.length} error(s)`,
        data: { successful: results, errors }
      });

    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({ success: false, message: "Error marking attendance", error: error.message });
    }
  }
);

// ── PUT /update/:attendanceId  (admin | teacher) ──────────────────────────────
router.put(
  "/update/:attendanceId",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { attendanceId } = req.params;
      const { status, remarks } = req.body;

      if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
        return res.status(400).json({ success: false, message: "Invalid attendance ID" });
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
        });
      }

      const updateData = {
        lastUpdatedBy: req.user._id,
        markedAt:      new Date()
      };
      if (status)              updateData.status  = status;
      if (remarks !== undefined) updateData.remarks = remarks;

      const attendanceRecord = await Attendance.findByIdAndUpdate(
        attendanceId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("studentId", "firstName lastName rollNumber")
        .populate("markedBy",  "fullName username");

      if (!attendanceRecord) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }

      res.json({ success: true, message: "Attendance updated successfully", data: attendanceRecord });

    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ success: false, message: "Error updating attendance", error: error.message });
    }
  }
);

// ── GET /stats/overview  (admin | teacher) ────────────────────────────────────
router.get(
  "/stats/overview",
  authenticateToken,
  requireRole(["admin", "teacher"]),
  async (req, res) => {
    try {
      const { startDate, endDate, class: studentClass, section } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = { $gte: new Date(startDate), $lte: new Date(endDate) };
      } else {
        const now          = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateRange = { $gte: startOfMonth, $lte: endOfMonth };
      }

      const matchFilter = { date: dateRange };
      if (studentClass) matchFilter.class   = studentClass;
      if (section)      matchFilter.section = section;

      const overallStats = await Attendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id:     null,
            total:   { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            absent:  { $sum: { $cond: [{ $eq: ["$status", "absent"]  }, 1, 0] } },
            late:    { $sum: { $cond: [{ $eq: ["$status", "late"]    }, 1, 0] } },
            excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            attendanceRate: {
              $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 2]
            }
          }
        }
      ]);

      const classStats = await Attendance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id:     { class: "$class", section: "$section" },
            total:   { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            absent:  { $sum: { $cond: [{ $eq: ["$status", "absent"]  }, 1, 0] } },
            late:    { $sum: { $cond: [{ $eq: ["$status", "late"]    }, 1, 0] } }
          }
        },
        {
          $addFields: {
            attendanceRate: {
              $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 2]
            }
          }
        },
        { $sort: { "_id.class": 1, "_id.section": 1 } }
      ]);

      res.json({
        success: true,
        data: {
          overall:  overallStats[0] || { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
          byClass:  classStats,
          period:   { startDate: dateRange.$gte, endDate: dateRange.$lte }
        }
      });

    } catch (error) {
      console.error("Error fetching attendance statistics:", error);
      res.status(500).json({ success: false, message: "Error fetching attendance statistics", error: error.message });
    }
  }
);

export default router;

