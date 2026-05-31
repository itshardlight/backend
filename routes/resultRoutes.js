import express from 'express';
import mongoose from 'mongoose';
import Result from '../models/Result.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is teacher or admin
const requireTeacherOrAdmin = (req, res, next) => {
  if (!req.user || !['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Teacher or Admin role required.' 
    });
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin role required.' 
    });
  }
  next();
};

// GET /api/results/my-results - Get current student's results
router.get('/my-results', authenticateToken, async (req, res) => {
  try {
    // Only students can access this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student role required.'
      });
    }

    const { academicYear, examType } = req.query;

    console.log('Fetching results for user:', req.user._id, 'role:', req.user.role);

    // First try to find the student record using the Student model
    let student = await Student.findOne({ userId: req.user._id });
    let studentIds = [];
    
    if (student) {
      console.log('Found Student record:', student._id);
      studentIds.push(student._id);
    }
    
    // Also check Profile model
    const Profile = mongoose.model('Profile');
    const profile = await Profile.findOne({ userId: req.user._id });
    
    if (profile) {
      console.log('Found Profile record:', profile._id);
      studentIds.push(profile._id);
      
      // If we don't have a student object yet, create one from profile
      if (!student) {
        student = {
          _id: profile._id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          rollNumber: profile.academic?.rollNumber,
          class: profile.academic?.currentGrade,
          section: profile.academic?.section
        };
      }
    }

    if (!student) {
      console.log('No Student or Profile record found for user:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'Student record not found. Please contact administration.'
      });
    }

    // Build filter for student's results - search using both Student and Profile IDs
    const filter = { 
      studentId: { $in: studentIds }
    };
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;

    console.log('Searching for results with filter:', JSON.stringify(filter));

    const results = await Result.find(filter)
      .populate('studentId', 'firstName lastName rollNumber class section')
      .populate('enteredBy', 'fullName username')
      .sort({ createdAt: -1 });

    console.log('Found results:', results.length);

    res.json({
      success: true,
      results: results,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section
      }
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student results',
      error: error.message
    });
  }
});

// GET /api/results - Get all results with filters
router.get('/', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { 
      class: className, 
      section, 
      examType, 
      academicYear, 
      studentId,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = {};
    if (className) filter.class = className;
    if (section) filter.section = section;
    if (examType) filter.examType = examType;
    if (academicYear) filter.academicYear = academicYear;
    if (studentId) filter.studentId = studentId;

    // If user is teacher (not admin), only show their results
    if (req.user.role === 'teacher') {
      filter.enteredBy = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const results = await Result.find(filter)
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('enteredBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Result.countDocuments(filter);

    res.json({
      success: true,
      data: results,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching results', 
      error: error.message 
    });
  }
});

// GET /api/results/:id - Get single result by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid result ID format'
      });
    }

    const result = await Result.findById(id)
      .populate('studentId', 'firstName lastName rollNumber class section')
      .populate('enteredBy', 'fullName');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student') {
      const userStudent = await Student.findOne({ userId: req.user._id });
      if (!userStudent || userStudent._id.toString() !== result.studentId._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only view your own results.' 
        });
      }
    }

    // Teachers can only view results they entered (unless admin)
    if (req.user.role === 'teacher' && result.enteredBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view results you created.'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching result', 
      error: error.message 
    });
  }
});

// GET /api/results/student/:studentId - Get results for specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, examType } = req.query;

    // Check if the provided ID is a Profile ID or Student ID
    let actualStudentId = studentId;
    
    // First, try to find if it's a Student ID
    const student = await Student.findById(studentId).catch(() => null);
    if (!student) {
      // If not found as Student, check if it's a Profile ID
      const Profile = mongoose.model('Profile');
      const profileRecord = await Profile.findById(studentId).catch(() => null);
      if (profileRecord) {
        // Find the corresponding Student using the same userId
        const correspondingStudent = await Student.findOne({ userId: profileRecord.userId });
        if (correspondingStudent) {
          actualStudentId = correspondingStudent._id;
        } else {
          return res.status(404).json({
            success: false,
            message: 'No corresponding student record found for this profile'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Student or profile not found'
        });
      }
    }

    // Build filter
    const filter = { studentId: actualStudentId };
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;

    // Students can only view their own results
    if (req.user.role === 'student') {
      const userStudent = await Student.findOne({ userId: req.user._id });
      if (!userStudent || userStudent._id.toString() !== actualStudentId.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only view your own results.' 
        });
      }
    }

    // Teachers can only view results they entered (unless admin)
    if (req.user.role === 'teacher') {
      filter.enteredBy = req.user._id;
    }

    const results = await Result.find(filter)
      .populate('studentId', 'firstName lastName rollNumber class section')
      .populate('enteredBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching student results', 
      error: error.message 
    });
  }
});

// GET /api/results/class/:class/section/:section - Get results for class-section
router.get('/class/:class/section/:section', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, section } = req.params;
    const { examType, academicYear } = req.query;

    const filter = { class: className, section };
    if (examType) filter.examType = examType;
    if (academicYear) filter.academicYear = academicYear;

    // Teachers can only view their own results
    if (req.user.role === 'teacher') {
      filter.enteredBy = req.user._id;
    }

    const results = await Result.find(filter)
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('enteredBy', 'fullName')
      .sort({ rollNumber: 1 });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching class results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching class results', 
      error: error.message 
    });
  }
});

// GET /api/results/bulk-entry/:class/:section - Get students for bulk entry
router.get('/bulk-entry/:class/:section', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, section } = req.params;
    const { examType, academicYear } = req.query;

    // Get all students in the class-section
    const students = await Student.find({ 
      class: className, 
      section, 
      status: 'active' 
    }).sort({ rollNumber: 1 });

    // Get existing results for this exam
    const existingResults = await Result.find({
      class: className,
      section,
      examType,
      academicYear
    });

    // Create a map of existing results by student ID
    const existingResultsMap = {};
    existingResults.forEach(result => {
      existingResultsMap[result.studentId.toString()] = result;
    });

    // Add result status to each student
    const studentsWithStatus = students.map(student => {
      const existingResult = existingResultsMap[student._id.toString()];
      return {
        ...student.toObject(),
        hasResult: !!existingResult,
        existingResultId: existingResult?._id || null
      };
    });

    res.json({
      success: true,
      data: studentsWithStatus
    });
  } catch (error) {
    console.error('Error fetching students for bulk entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching students for bulk entry', 
      error: error.message 
    });
  }
});

// POST /api/results - Create new result
router.post('/', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    console.log('Creating result with data:', JSON.stringify(req.body, null, 2));
    
    const {
      studentId,
      examType,
      academicYear,
      studentClass,
      studentSection,
      subjects,
      remarks
    } = req.body;

    // Validate required fields
    if (!studentId || !examType || !academicYear || !studentClass || !studentSection || !subjects || subjects.length === 0) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, examType, academicYear, studentClass, studentSection, and subjects are required'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      console.log('Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Found student:', student.firstName, student.lastName);

    // Check for duplicate result
    const existingResult = await Result.findOne({
      studentId,
      examType,
      academicYear
    });

    if (existingResult) {
      console.log('Duplicate result found');
      return res.status(400).json({
        success: false,
        message: 'Result already exists for this student, exam type, and academic year'
      });
    }

    // Get teacher info
    const teacher = await User.findById(req.user._id);
    console.log('Teacher info:', teacher.username);

    // Create new result
    const newResult = new Result({
      studentId,
      rollNumber: student.rollNumber,
      class: studentClass || student.class,
      section: studentSection || student.section,
      examType,
      academicYear,
      subjects,
      remarks: remarks || '',
      enteredBy: req.user._id,
      teacherName: teacher.fullName || teacher.username
    });

    console.log('Saving result...');
    await newResult.save();
    console.log('Result saved successfully');

    // Populate the result before sending response
    const populatedResult = await Result.findById(newResult._id)
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('enteredBy', 'fullName');

    res.status(201).json({
      success: true,
      message: 'Result created successfully',
      data: populatedResult
    });
  } catch (error) {
    console.error('Error creating result:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Result already exists for this student, exam type, and academic year'
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error creating result', 
      error: error.message 
    });
  }
});

// PUT /api/results/:id - Update existing result
router.put('/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the result
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && result.enteredBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update results you created.'
      });
    }

    // Update the result
    Object.assign(result, updateData);
    await result.save();

    // Populate the updated result
    const populatedResult = await Result.findById(result._id)
      .populate('studentId', 'firstName lastName rollNumber')
      .populate('enteredBy', 'fullName');

    res.json({
      success: true,
      message: 'Result updated successfully',
      data: populatedResult
    });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating result', 
      error: error.message 
    });
  }
});

// DELETE /api/results/:id - Delete result
router.delete('/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && result.enteredBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete results you created.'
      });
    }

    await Result.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting result', 
      error: error.message 
    });
  }
});

// GET /api/results/analytics/class/:class/section/:section - Get class analytics
router.get('/analytics/class/:class/section/:section', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, section } = req.params;
    const { examType, academicYear } = req.query;

    const filter = { class: className, section };
    if (examType) filter.examType = examType;
    if (academicYear) filter.academicYear = academicYear;

    const results = await Result.find(filter);

    if (results.length === 0) {
      return res.json({
        success: true,
        data: {
          totalStudents: 0,
          averagePercentage: 0,
          passCount: 0,
          failCount: 0,
          gradeDistribution: {},
          subjectAnalytics: []
        }
      });
    }

    // Calculate analytics
    const totalStudents = results.length;
    const totalPercentage = results.reduce((sum, result) => sum + result.percentage, 0);
    const averagePercentage = Math.round((totalPercentage / totalStudents) * 100) / 100;
    
    const passCount = results.filter(result => result.result === 'pass').length;
    const failCount = results.filter(result => result.result === 'fail').length;

    // Grade distribution
    const gradeDistribution = {};
    results.forEach(result => {
      gradeDistribution[result.overallGrade] = (gradeDistribution[result.overallGrade] || 0) + 1;
    });

    // Subject analytics
    const subjectMap = {};
    results.forEach(result => {
      result.subjects.forEach(subject => {
        if (!subjectMap[subject.subjectName]) {
          subjectMap[subject.subjectName] = {
            subjectName: subject.subjectName,
            totalMarks: 0,
            totalMaxMarks: 0,
            count: 0
          };
        }
        subjectMap[subject.subjectName].totalMarks += subject.obtainedMarks;
        subjectMap[subject.subjectName].totalMaxMarks += subject.maxMarks;
        subjectMap[subject.subjectName].count += 1;
      });
    });

    const subjectAnalytics = Object.values(subjectMap).map(subject => ({
      subjectName: subject.subjectName,
      averagePercentage: Math.round((subject.totalMarks / subject.totalMaxMarks) * 100 * 100) / 100,
      studentsAppeared: subject.count
    }));

    res.json({
      success: true,
      data: {
        totalStudents,
        averagePercentage,
        passCount,
        failCount,
        gradeDistribution,
        subjectAnalytics
      }
    });
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching class analytics', 
      error: error.message 
    });
  }
});

export default router;