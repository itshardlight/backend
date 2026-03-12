import express from "express";
import Timetable from "../models/Timetable.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Debug endpoint to test if routes are working
router.get("/debug", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Timetable routes are working",
    user: {
      id: req.user._id,
      role: req.user.role,
      name: req.user.fullName
    }
  });
});

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
    }).sort({ dayOfWeek: 1, period: 1 });

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

// Test endpoint for timetable creation (bypassing all existing logic)
router.post("/test-create", authenticateToken, async (req, res) => {
  try {
    console.log('=== TEST TIMETABLE CREATE ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user.fullName, req.user.role);
    
    res.json({
      success: true,
      message: "Test endpoint working - no teacher validation",
      receivedData: req.body,
      user: {
        name: req.user.fullName,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: "Test endpoint failed",
      error: error.message
    });
  }
});

// Create or update timetable entry (COMPLETELY REWRITTEN - NO TEACHER LOGIC)
router.post("/", authenticateToken, requireAdminOrTeacher, async (req, res) => {
  try {
    console.log('=== TIMETABLE SAVE ===');
    console.log('Body:', req.body);
    console.log('User:', req.user.fullName, req.user.role);
    
    const { _id, class: className, section, dayOfWeek, period, subject, startTime, endTime, room } = req.body;

    // Simple validation
    if (!className || !section || !dayOfWeek || !period || !subject || !startTime || !endTime) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // If _id is provided, update existing entry
    if (_id) {
      console.log('Updating existing entry:', _id);
      
      const existingEntry = await Timetable.findById(_id);
      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          message: "Timetable entry not found"
        });
      }

      // Update the entry
      existingEntry.subject = subject;
      existingEntry.startTime = startTime;
      existingEntry.endTime = endTime;
      existingEntry.room = room || '';
      existingEntry.updatedBy = req.user._id;

      const updatedEntry = await existingEntry.save();
      
      console.log('Updated successfully:', updatedEntry._id);
      return res.json({
        success: true,
        message: "Timetable entry updated successfully",
        data: updatedEntry
      });
    }

    // Check for existing entry at this slot
    const existingSlot = await Timetable.findOne({
      class: className,
      section: section,
      dayOfWeek: dayOfWeek,
      period: period,
      isActive: true
    });

    if (existingSlot) {
      console.log('Slot already exists, updating:', existingSlot._id);
      
      // Update existing slot
      existingSlot.subject = subject;
      existingSlot.startTime = startTime;
      existingSlot.endTime = endTime;
      existingSlot.room = room || '';
      existingSlot.updatedBy = req.user._id;

      const updatedEntry = await existingSlot.save();
      
      console.log('Updated existing slot successfully:', updatedEntry._id);
      return res.json({
        success: true,
        message: "Timetable entry updated successfully",
        data: updatedEntry
      });
    }

    // Create new entry
    console.log('Creating new entry...');
    
    const newEntry = new Timetable({
      class: className,
      section: section,
      dayOfWeek: dayOfWeek,
      period: period,
      subject: subject,
      startTime: startTime,
      endTime: endTime,
      room: room || '',
      createdBy: req.user._id,
      isActive: true
    });

    const savedEntry = await newEntry.save();
    
    console.log('Created successfully:', savedEntry._id);

    res.status(201).json({
      success: true,
      message: "Timetable entry created successfully",
      data: savedEntry
    });
    
  } catch (error) {
    console.error("Timetable save error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A timetable entry already exists for this time slot"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Save failed: " + error.message
    });
  }
});

// Get teacher's schedule
router.get("/teacher/:teacherId", authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Check if user is requesting their own schedule or is admin
    if (req.user._id.toString() !== teacherId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own schedule."
      });
    }

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

// Update timetable entry
router.put("/:id", authenticateToken, requireAdminOrTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, startTime, endTime, room, teacherId, teacherName } = req.body;

    const entry = await Timetable.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found"
      });
    }

    // Update fields
    if (subject) entry.subject = subject;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (room !== undefined) entry.room = room;
    if (teacherId) entry.teacherId = teacherId;
    if (teacherName) entry.teacherName = teacherName;
    
    entry.updatedBy = req.user._id;
    
    const updatedEntry = await entry.save();

    res.json({
      success: true,
      message: "Timetable entry updated successfully",
      data: updatedEntry
    });
  } catch (error) {
    console.error("Error updating timetable entry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update timetable entry"
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