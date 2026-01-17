import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is fee_department or admin
const requireFeeOrAdmin = (req, res, next) => {
  if (!req.user || !['fee_department', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Fee Department or Admin role required.' 
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

// GET /api/fees/students - Get students with fee information
router.get('/students', authenticateToken, requireFeeOrAdmin, async (req, res) => {
  try {
    const { 
      class: className, 
      section, 
      academicYear, 
      paymentStatus,
      page = 1,
      limit = 50
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get students from Student collection
    const Student = mongoose.model('Student');
    const Profile = mongoose.model('Profile');
    
    // Build filter for Student collection
    const studentFilter = { status: 'active' };
    if (className) studentFilter.class = className;
    if (section) studentFilter.section = section;

    // Get all active students
    const students = await Student.find(studentFilter)
      .populate('userId', 'username email role')
      .sort({ class: 1, section: 1, rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get all profiles to merge fee information
    const profiles = await Profile.find({})
      .populate('userId', 'username email role');

    // Create a map of profiles by userId for quick lookup
    const profileMap = new Map();
    profiles.forEach(profile => {
      if (profile.userId) {
        profileMap.set(profile.userId._id.toString(), profile);
      }
    });

    // Merge student data with profile fee information
    let mergedStudents = students.map(student => {
      const studentObj = student.toObject();
      
      // Look for corresponding profile
      let profile = null;
      if (student.userId) {
        profile = profileMap.get(student.userId._id.toString());
      }
      
      // If no profile found, try to find by email match
      if (!profile) {
        profile = profiles.find(p => 
          p.firstName === student.firstName && 
          p.lastName === student.lastName &&
          p.academic?.currentGrade === student.class &&
          p.academic?.section === student.section
        );
      }

      // Merge the data
      const mergedStudent = {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        userId: student.userId,
        academic: {
          currentGrade: student.class,
          section: student.section,
          rollNumber: student.rollNumber,
          admissionDate: student.admissionDate,
          academicYear: academicYear || '2024-25'
        },
        parentInfo: {
          fatherName: student.parentName,
          motherName: student.parentName, // Using same as father for now
          guardianName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          emergencyContact: student.emergencyContact
        },
        feeInfo: profile?.feeInfo || {
          totalFee: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paymentStatus: 'pending',
          feeHistory: []
        },
        status: student.status,
        registrationDate: student.registrationDate
      };

      return mergedStudent;
    });

    // Filter by payment status if specified
    if (paymentStatus) {
      mergedStudents = mergedStudents.filter(student => {
        const feeInfo = student.feeInfo || {};
        const totalFee = feeInfo.totalFee || 0;
        const paidAmount = feeInfo.paidAmount || 0;
        const pendingAmount = totalFee - paidAmount;
        
        switch (paymentStatus) {
          case 'paid':
            return pendingAmount <= 0 && totalFee > 0;
          case 'partial':
            return paidAmount > 0 && pendingAmount > 0;
          case 'pending':
            return paidAmount === 0 && totalFee > 0;
          case 'overdue':
            return pendingAmount > 0;
          default:
            return true;
        }
      });
    }

    const total = mergedStudents.length;

    res.json({
      success: true,
      data: mergedStudents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching students with fee info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching students', 
      error: error.message 
    });
  }
});

// GET /api/fees/student/:studentId - Get fee details for specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    const Profile = mongoose.model('Profile');
    const student = await Profile.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Students can only view their own fee details
    if (req.user.role === 'student') {
      if (student.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only view your own fee details.' 
        });
      }
    }

    res.json({
      success: true,
      data: student.feeInfo || {}
    });
  } catch (error) {
    console.error('Error fetching student fee details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching fee details', 
      error: error.message 
    });
  }
});

// POST /api/fees/payment - Add payment for student
router.post('/payment', authenticateToken, requireFeeOrAdmin, async (req, res) => {
  try {
    const {
      studentId,
      amount,
      paymentMethod,
      receiptNumber,
      description,
      paymentDate
    } = req.body;

    // Validate required fields
    if (!studentId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, amount, and paymentMethod are required'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    const Student = mongoose.model('Student');
    const Profile = mongoose.model('Profile');

    // First, try to find the student in Student collection
    const student = await Student.findById(studentId).populate('userId');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find or create corresponding profile
    let profile = null;
    
    if (student.userId) {
      profile = await Profile.findOne({ userId: student.userId._id });
    }
    
    // If no profile found, try to find by name and class match
    if (!profile) {
      profile = await Profile.findOne({
        firstName: student.firstName,
        lastName: student.lastName,
        'academic.currentGrade': student.class,
        'academic.section': student.section
      });
    }
    
    // If still no profile, create one
    if (!profile) {
      profile = new Profile({
        userId: student.userId?._id || null,
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
          zipCode: student.zipCode
        },
        academic: {
          currentGrade: student.class,
          section: student.section,
          rollNumber: student.rollNumber,
          admissionDate: student.admissionDate,
          academicYear: '2024-25'
        },
        parentInfo: {
          fatherName: student.parentName,
          motherName: student.parentName,
          guardianName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          emergencyContact: student.emergencyContact
        },
        feeInfo: {
          totalFee: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paymentStatus: 'pending',
          feeHistory: []
        },
        createdBy: req.user._id
      });
      
      await profile.save();
    }

    const currentFeeInfo = profile.feeInfo || {};
    const paymentAmount = parseFloat(amount);
    const newPaidAmount = (currentFeeInfo.paidAmount || 0) + paymentAmount;
    const totalFee = currentFeeInfo.totalFee || 0;
    const newPendingAmount = Math.max(0, totalFee - newPaidAmount);

    // Create payment record
    const payment = {
      amount: paymentAmount,
      paymentMethod,
      receiptNumber: receiptNumber || `RCP-${Date.now()}`,
      description: description || '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      enteredBy: req.user._id,
      enteredAt: new Date()
    };

    // Update fee information
    const updatedFeeInfo = {
      ...currentFeeInfo,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      feeHistory: [...(currentFeeInfo.feeHistory || []), payment],
      lastPaymentDate: payment.paymentDate,
      paymentStatus: newPendingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'
    };

    profile.feeInfo = updatedFeeInfo;
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Payment added successfully',
      data: {
        payment,
        updatedFeeInfo
      }
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding payment', 
      error: error.message 
    });
  }
});

// PUT /api/fees/structure/:studentId - Update fee structure for student
router.put('/structure/:studentId', authenticateToken, requireFeeOrAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      totalFee,
      tuitionFee,
      admissionFee,
      examFee,
      libraryFee,
      sportsFee,
      otherFees,
      dueDate
    } = req.body;

    if (!totalFee || parseFloat(totalFee) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total fee amount is required and must be greater than 0'
      });
    }

    const Student = mongoose.model('Student');
    const Profile = mongoose.model('Profile');

    // First, try to find the student in Student collection
    const student = await Student.findById(studentId).populate('userId');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find or create corresponding profile
    let profile = null;
    
    if (student.userId) {
      profile = await Profile.findOne({ userId: student.userId._id });
    }
    
    // If no profile found, try to find by name and class match
    if (!profile) {
      profile = await Profile.findOne({
        firstName: student.firstName,
        lastName: student.lastName,
        'academic.currentGrade': student.class,
        'academic.section': student.section
      });
    }
    
    // If still no profile, create one
    if (!profile) {
      profile = new Profile({
        userId: student.userId?._id || null,
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
          zipCode: student.zipCode
        },
        academic: {
          currentGrade: student.class,
          section: student.section,
          rollNumber: student.rollNumber,
          admissionDate: student.admissionDate,
          academicYear: '2024-25'
        },
        parentInfo: {
          fatherName: student.parentName,
          motherName: student.parentName,
          guardianName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          emergencyContact: student.emergencyContact
        },
        feeInfo: {
          totalFee: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paymentStatus: 'pending',
          feeHistory: []
        },
        createdBy: req.user._id
      });
      
      await profile.save();
    }

    const currentFeeInfo = profile.feeInfo || {};
    const newTotalFee = parseFloat(totalFee);
    const currentPaidAmount = currentFeeInfo.paidAmount || 0;
    const newPendingAmount = Math.max(0, newTotalFee - currentPaidAmount);

    const updatedFeeInfo = {
      ...currentFeeInfo,
      totalFee: newTotalFee,
      tuitionFee: parseFloat(tuitionFee) || 0,
      admissionFee: parseFloat(admissionFee) || 0,
      examFee: parseFloat(examFee) || 0,
      libraryFee: parseFloat(libraryFee) || 0,
      sportsFee: parseFloat(sportsFee) || 0,
      otherFees: parseFloat(otherFees) || 0,
      pendingAmount: newPendingAmount,
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentStatus: newPendingAmount <= 0 ? 'paid' : currentPaidAmount > 0 ? 'partial' : 'pending',
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    profile.feeInfo = updatedFeeInfo;
    await profile.save();

    res.json({
      success: true,
      message: 'Fee structure updated successfully',
      data: updatedFeeInfo
    });
  } catch (error) {
    console.error('Error updating fee structure:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating fee structure', 
      error: error.message 
    });
  }
});

// GET /api/fees/analytics - Get fee collection analytics
router.get('/analytics', authenticateToken, requireFeeOrAdmin, async (req, res) => {
  try {
    const { class: className, section, academicYear } = req.query;

    const Student = mongoose.model('Student');
    const Profile = mongoose.model('Profile');
    
    // Build filter for Student collection
    const studentFilter = { status: 'active' };
    if (className) studentFilter.class = className;
    if (section) studentFilter.section = section;

    // Get all active students
    const students = await Student.find(studentFilter);
    
    // Get all profiles to merge fee information
    const profiles = await Profile.find({});

    // Create a map of profiles by userId for quick lookup
    const profileMap = new Map();
    profiles.forEach(profile => {
      if (profile.userId) {
        profileMap.set(profile.userId.toString(), profile);
      }
    });

    // Merge student data with profile fee information
    const mergedStudents = students.map(student => {
      let profile = null;
      if (student.userId) {
        profile = profileMap.get(student.userId.toString());
      }
      
      // If no profile found, try to find by name match
      if (!profile) {
        profile = profiles.find(p => 
          p.firstName === student.firstName && 
          p.lastName === student.lastName &&
          p.academic?.currentGrade === student.class &&
          p.academic?.section === student.section
        );
      }

      return {
        ...student.toObject(),
        feeInfo: profile?.feeInfo || {
          totalFee: 0,
          paidAmount: 0,
          pendingAmount: 0,
          paymentStatus: 'pending',
          feeHistory: []
        }
      };
    });

    // Calculate analytics
    const totalStudents = mergedStudents.length;
    const studentsWithFee = mergedStudents.filter(s => (s.feeInfo?.totalFee || 0) > 0);
    
    const totalFeeAmount = studentsWithFee.reduce((sum, s) => sum + (s.feeInfo?.totalFee || 0), 0);
    const totalPaidAmount = studentsWithFee.reduce((sum, s) => sum + (s.feeInfo?.paidAmount || 0), 0);
    const totalPendingAmount = totalFeeAmount - totalPaidAmount;
    
    const fullyPaidStudents = studentsWithFee.filter(s => {
      const feeInfo = s.feeInfo || {};
      return (feeInfo.totalFee - (feeInfo.paidAmount || 0)) <= 0;
    }).length;
    
    const partiallyPaidStudents = studentsWithFee.filter(s => {
      const feeInfo = s.feeInfo || {};
      const paid = feeInfo.paidAmount || 0;
      const pending = feeInfo.totalFee - paid;
      return paid > 0 && pending > 0;
    }).length;
    
    const pendingStudents = studentsWithFee.filter(s => {
      const feeInfo = s.feeInfo || {};
      return (feeInfo.paidAmount || 0) === 0 && feeInfo.totalFee > 0;
    }).length;

    const collectionRate = totalFeeAmount > 0 ? Math.round((totalPaidAmount / totalFeeAmount) * 100) : 0;

    // Payment method breakdown
    const paymentMethods = {};
    studentsWithFee.forEach(student => {
      const history = student.feeInfo?.feeHistory || [];
      history.forEach(payment => {
        paymentMethods[payment.paymentMethod] = (paymentMethods[payment.paymentMethod] || 0) + payment.amount;
      });
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        studentsWithFee: studentsWithFee.length,
        totalFeeAmount,
        totalPaidAmount,
        totalPendingAmount,
        fullyPaidStudents,
        partiallyPaidStudents,
        pendingStudents,
        collectionRate,
        paymentMethodBreakdown: paymentMethods
      }
    });
  } catch (error) {
    console.error('Error fetching fee analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching analytics', 
      error: error.message 
    });
  }
});

// DELETE /api/fees/payment/:studentId/:paymentIndex - Remove payment (admin only)
router.delete('/payment/:studentId/:paymentIndex', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId, paymentIndex } = req.params;

    const Profile = mongoose.model('Profile');
    const student = await Profile.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const feeInfo = student.feeInfo || {};
    const feeHistory = feeInfo.feeHistory || [];
    const index = parseInt(paymentIndex);

    if (index < 0 || index >= feeHistory.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment index'
      });
    }

    const removedPayment = feeHistory[index];
    feeHistory.splice(index, 1);

    // Recalculate totals
    const newPaidAmount = Math.max(0, (feeInfo.paidAmount || 0) - removedPayment.amount);
    const newPendingAmount = (feeInfo.totalFee || 0) - newPaidAmount;

    const updatedFeeInfo = {
      ...feeInfo,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      feeHistory,
      paymentStatus: newPendingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'
    };

    student.feeInfo = updatedFeeInfo;
    await student.save();

    res.json({
      success: true,
      message: 'Payment removed successfully',
      data: {
        removedPayment,
        updatedFeeInfo
      }
    });
  } catch (error) {
    console.error('Error removing payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing payment', 
      error: error.message 
    });
  }
});

export default router;