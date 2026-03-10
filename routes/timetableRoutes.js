import express from "express";
import Timetable from "../models/Timetable.js";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Middleware to check if user is admin or teacher
const requireAdminOrTeacher = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin or teacher role required."
    });
  }
  next();
};

// Get timetable for a specific class and section
router.get("/class/:class/:section", authenticateToken, async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const timetable = await Timetable.find({
      class: className,
      section: section,
      isActive: true
    }).populate('teacherId', 'fullName').sort({ dayOfWeek: 1, period: 1 });

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch timetable"
    });
  }
});

// Get teacher's schedule
router.get("/teacher/:teacherId", authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const schedule = await Timetable.find({
      teacherId: teacherId,
      isActive: true
    }).sort({ dayOfWeek: 1, period: 1 });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error("Error fetching teacher schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher schedule"
    });
  }
});

// Get all available teachers
router.get("/teachers", authenticateToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const teachers = await User.find({
      role: 'teacher',
      accountStatus: 'active'
    }).select('_id fullName email');

    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers"
    });
  }
});

// Create or update timetable entry
router.post("/", authenticateToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const {
      class: className,
      section,
      dayOfWeek,
      period,
      subject,
      teacherId,
      startTime,
      endTime,
      room
    } = req.body;

    // Get teacher information
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher selected"
      });
    }

    // Check for existing entry
    const existingEntry = await Timetable.findOne({
      class: className,
      section,
      dayOfWeek,
      period,
      isActive: true
    });

    if (existingEntry) {
      // Update existing entry
      existingEntry.subject = subject;
      existingEntry.teacherId = teacherId;
      existingEntry.teacherName = teacher.fullName;
      existingEntry.startTime = startTime;
      existingEntry.endTime = endTime;
      existingEntry.room = room;
      existingEntry.updatedBy = req.user._id;

      await existingEntry.save();

      res.json({
        success: true,
        message: "Timetable entry updated successfully",
        data: existingEntry
      });
    } else {
      // Create new entry
      const newEntry = new Timetable({
        class: className,
        section,
        dayOfWeek,
        period,
        subject,
        teacherId,
        teacherName: teacher.fullName,
        startTime,
        endTime,
        room,
        createdBy: req.user._id
      });

      await newEntry.save();

      res.status(201).json({
        success: true,
        message: "Timetable entry created successfully",
        data: newEntry
      });
    }
  } catch (error) {
    console.error("Error creating/updating timetable entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save timetable entry"
    });
  }
});

// Delete timetable entry
router.delete("/:id", authenticateToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = await Timetable.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found"
      });
    }

    // Soft delete
    entry.isActive = false;
    entry.updatedBy = req.user._id;
    await entry.save();

    res.json({
      success: true,
      message: "Timetable entry deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete timetable entry"
    });
  }
});

export default router;