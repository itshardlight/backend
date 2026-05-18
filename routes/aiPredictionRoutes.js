import express from 'express';
import aiPredictionService from '../services/aiPredictionService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

// GET /api/ai-predictions/student/:studentId/formula - Get formula-based prediction for specific student
router.get('/student/:studentId/formula', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const prediction = await aiPredictionService.predictStudentMarks(studentId);
    
    res.json({
      success: true,
      data: prediction,
      formula: 'Predicted Marks = (0.7 × Average Past Marks) + (0.3 × Attendance %)'
    });
  } catch (error) {
    console.error('Error getting formula-based prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating formula-based prediction',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/student/:studentId - Get AI prediction for specific student
router.get('/student/:studentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const prediction = await aiPredictionService.predictStudentPerformance(studentId);
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error getting student prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating student prediction',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/available-classes - Get available class/section combinations
router.get('/available-classes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const Student = (await import('../models/Student.js')).default;
    
    const classCombinations = await Student.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.class': 1, '_id.section': 1 } }
    ]);
    
    const availableClasses = classCombinations.map(c => ({
      class: c._id.class,
      section: c._id.section,
      studentCount: c.count
    }));
    
    res.json({
      success: true,
      data: {
        combinations: availableClasses,
        totalStudents: classCombinations.reduce((sum, c) => sum + c.count, 0)
      }
    });
  } catch (error) {
    console.error('Error getting available classes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available classes',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/analyze-class - Analyze all students or specific class
router.get('/analyze-class', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class: className, section, limit, includeFailures } = req.query;
    
    const filters = {};
    if (className) filters.class = className;
    if (section) filters.section = section;
    if (limit) filters.limit = parseInt(limit);
    
    const analysis = await aiPredictionService.analyzeAllStudents(filters);
    
    // If includeFailures is requested, get details about students who couldn't be analyzed
    if (includeFailures === 'true' && analysis.summary.noData > 0) {
      const Student = (await import('../models/Student.js')).default;
      const Result = (await import('../models/Result.js')).default;
      
      // Get all students in the class
      const studentFilter = { status: 'active' };
      if (className) studentFilter.class = className;
      if (section) studentFilter.section = section;
      
      const allStudents = await Student.find(studentFilter);
      
      // Find students who were analyzed successfully
      const analyzedStudentIds = [
        ...analysis.weakStudents,
        ...analysis.atRiskStudents,
        ...analysis.averagePerformers,
        ...analysis.strongPerformers
      ].map(s => s.student.id);
      
      // Find students who couldn't be analyzed
      const failedStudents = allStudents.filter(s => !analyzedStudentIds.includes(s._id.toString()));
      
      // Get failure reasons for each student
      const failureDetails = [];
      for (const student of failedStudents) {
        const results = await Result.find({ 
          studentId: student._id,
          status: { $in: ['published', 'verified', 'locked'] }
        });
        
        let reason = 'Unknown';
        if (results.length === 0) {
          reason = 'No published exam results found';
        } else if (results.length < 3) {
          reason = `Only ${results.length} exam results (need at least 3)`;
        } else {
          reason = 'Prediction algorithm failed';
        }
        
        failureDetails.push({
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            rollNumber: student.rollNumber,
            class: student.class,
            section: student.section
          },
          reason: reason,
          resultCount: results.length
        });
      }
      
      analysis.failureDetails = failureDetails;
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing class:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing class performance',
      error: error.message
    });
  }
});

// POST /api/ai-predictions/fix-results-status - Fix draft results to published status
router.post('/fix-results-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class: className, section } = req.body;
    
    if (!className || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section are required'
      });
    }
    
    const Result = (await import('../models/Result.js')).default;
    
    // Find draft results for the specified class
    const updateResult = await Result.updateMany(
      { 
        class: className, 
        section: section, 
        status: 'draft' 
      },
      { 
        $set: { status: 'published' } 
      }
    );
    
    res.json({
      success: true,
      data: {
        modifiedCount: updateResult.modifiedCount,
        message: `Updated ${updateResult.modifiedCount} draft results to published status`
      }
    });
  } catch (error) {
    console.error('Error fixing results status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing results status',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/class-insights/:class/:section - Get detailed class insights
router.get('/class-insights/:class/:section', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const insights = await aiPredictionService.getClassInsights(className, section);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error getting class insights:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating class insights',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/weak-students - Get list of weak/at-risk students
router.get('/weak-students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class: className, section, riskLevel = 'all' } = req.query;
    
    const filters = {};
    if (className) filters.class = className;
    if (section) filters.section = section;
    
    const analysis = await aiPredictionService.analyzeAllStudents(filters);
    
    let weakStudents = [];
    
    if (riskLevel === 'high' || riskLevel === 'all') {
      weakStudents = [...weakStudents, ...analysis.weakStudents];
    }
    
    if (riskLevel === 'medium' || riskLevel === 'all') {
      weakStudents = [...weakStudents, ...analysis.atRiskStudents];
    }
    
    // Sort by predicted marks (worst first) - handle both old and new data structures
    weakStudents.sort((a, b) => {
      const aScore = a.prediction?.predictedMarks || a.performanceData?.averagePercentage || 0;
      const bScore = b.prediction?.predictedMarks || b.performanceData?.averagePercentage || 0;
      return aScore - bScore;
    });
    
    res.json({
      success: true,
      data: {
        totalWeakStudents: weakStudents.length,
        students: weakStudents,
        summary: analysis.summary
      }
    });
  } catch (error) {
    console.error('Error getting weak students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weak students',
      error: error.message
    });
  }
});

// POST /api/ai-predictions/bulk-analyze - Analyze multiple students by IDs
router.post('/bulk-analyze', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required'
      });
    }
    
    const results = [];
    
    for (const studentId of studentIds) {
      try {
        const prediction = await aiPredictionService.predictStudentPerformance(studentId);
        results.push(prediction);
      } catch (error) {
        results.push({
          success: false,
          studentId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        totalRequested: studentIds.length,
        results
      }
    });
  } catch (error) {
    console.error('Error in bulk analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk analysis',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/test-prediction/:studentId - Test prediction for a specific student
router.get('/test-prediction/:studentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log(`Testing prediction for student: ${studentId}`);
    
    // Test the prediction directly
    const prediction = await aiPredictionService.predictStudentMarks(studentId);
    
    res.json({
      success: true,
      data: prediction,
      logs: 'Check server console for detailed logs'
    });
  } catch (error) {
    console.error('Error in test prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing prediction',
      error: error.message
    });
  }
});

// POST /api/ai-predictions/analyze-feedback - Analyze student feedback using AI
router.post('/analyze-feedback', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { feedbackText, studentId } = req.body;
    
    if (!feedbackText) {
      return res.status(400).json({
        success: false,
        message: 'feedbackText is required'
      });
    }
    
    const analysis = await aiPredictionService.analyzeStudentFeedback(feedbackText, studentId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing student feedback',
      error: error.message
    });
  }
});

// POST /api/ai-predictions/generate-study-plan - Generate personalized study plan
router.post('/generate-study-plan', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId, targetGrade } = req.body;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }
    
    const studyPlan = await aiPredictionService.generateStudyPlan(studentId, targetGrade);
    
    res.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    console.error('Error generating study plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating study plan',
      error: error.message
    });
  }
});

// GET /api/ai-predictions/hf-status - Check Hugging Face integration status
router.get('/hf-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hasApiKey = !!process.env.HUGGING_FACE_API_KEY;
    let status = 'disabled';
    let models = {};
    
    if (hasApiKey) {
      try {
        // Test a simple API call to check if the key works
        const testResponse = await aiPredictionService.callHuggingFaceAPI(
          'cardiffnlp/twitter-roberta-base-sentiment-latest',
          { inputs: "This is a test" }
        );
        
        status = 'active';
        models = aiPredictionService.models;
      } catch (error) {
        status = 'error';
      }
    }
    
    res.json({
      success: true,
      data: {
        status,
        hasApiKey,
        models: status === 'active' ? models : {},
        message: status === 'disabled' ? 'Set HUGGING_FACE_API_KEY environment variable to enable AI features' :
                status === 'error' ? 'Hugging Face API key is invalid or API is unavailable' :
                'Hugging Face integration is active and ready'
      }
    });
  } catch (error) {
    console.error('Error checking HF status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Hugging Face status',
      error: error.message
    });
  }
});

export default router;