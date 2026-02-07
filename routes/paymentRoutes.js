import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';
import Payment from '../models/Payment.js';

const router = express.Router();

/**
 * Generate HMAC SHA256 signature for eSewa
 */
const generateEsewaSignature = (totalAmount, transactionUuid, productCode, secretKey) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
  return signature;
};

/**
 * Generate unique transaction UUID using crypto for better uniqueness
 */
const generateTransactionUuid = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `TXN-${timestamp}-${random}-${randomBytes}`;
};

/**
 * Test endpoint for payment initialization
 * GET /api/payment/test
 */
router.get('/test', authenticateToken, async (req, res) => {
  try {
    // Test basic functionality
    const testData = {
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      },
      esewaConfig: {
        hasSecretKey: !!process.env.ESEWA_SECRET_KEY,
        productCode: process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST',
        environment: process.env.ESEWA_ENVIRONMENT || 'development'
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Payment system test successful',
      data: testData
    });

  } catch (error) {
    console.error('Payment test error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment system test failed',
      error: error.message
    });
  }
});

/**
 * Initialize eSewa payment
 * POST /api/payment/esewa/initialize
 */
router.post('/esewa/initialize', authenticateToken, async (req, res) => {
  try {
    const { studentId, feeType, amount, taxAmount = 0, description } = req.body;

    console.log('Payment initialization request:', {
      studentId,
      feeType,
      amount,
      taxAmount,
      description,
      userId: req.user.id
    });

    // Validate required fields
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    if (!feeType) {
      return res.status(400).json({
        success: false,
        message: 'Fee type is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    // Validate fee type
    const validFeeTypes = ['tuition', 'admission', 'exam', 'library', 'transport', 'hostel', 'other'];
    if (!validFeeTypes.includes(feeType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid fee type. Must be one of: ${validFeeTypes.join(', ')}`
      });
    }

    // Get eSewa configuration from environment
    const secretKey = process.env.ESEWA_SECRET_KEY;
    const productCode = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
    
    if (!secretKey) {
      console.error('eSewa secret key not found in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway configuration error. Please contact support.'
      });
    }

    // Convert amounts to numbers and validate (simple amounts, not paisa)
    const numericAmount = parseFloat(amount);
    const numericTaxAmount = parseFloat(taxAmount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    if (isNaN(numericTaxAmount) || numericTaxAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tax amount'
      });
    }

    // AGGRESSIVE CLEANUP: Remove ALL old pending transactions for this student
    console.log('Cleaning up all old pending transactions...');
    const cleanupResult = await Payment.deleteMany({
      studentId: String(studentId),
      status: 'pending'
    });
    console.log(`Cleaned up ${cleanupResult.deletedCount} old pending transactions`);

    // Generate unique transaction UUID with enhanced uniqueness
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const transactionUuid = `TXN-${timestamp}-${randomPart}-${randomBytes}`;

    // Double-check uniqueness (should be virtually impossible to collide now)
    const existingTransaction = await Payment.findOne({ transactionUuid });
    if (existingTransaction) {
      console.error('Extremely rare UUID collision detected');
      return res.status(500).json({
        success: false,
        message: 'Transaction ID generation failed. Please try again.'
      });
    }

    // Store payment record in database
    const paymentRecord = new Payment({
      transactionUuid,
      studentId: String(studentId),
      userId: req.user.id, // Add userId field
      feeType,
      amount: numericAmount,
      taxAmount: numericTaxAmount,
      totalAmount: numericAmount + numericTaxAmount,
      description: description || `${feeType} fee payment`,
      status: 'pending',
      createdBy: req.user.id
    });

    await paymentRecord.save();

    console.log('Payment record created successfully:', {
      transactionUuid,
      studentId,
      totalAmount: paymentRecord.totalAmount
    });

    // Generate signature for frontend
    const totalAmountForSignature = numericAmount + numericTaxAmount;
    const signature = generateEsewaSignature(totalAmountForSignature, transactionUuid, productCode, secretKey);

    res.json({
      success: true,
      transactionUuid,
      productCode,
      signature,
      message: 'Payment initialized successfully'
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // For any duplicate key errors, clean up and suggest retry
    if (error.code === 11000) {
      console.log('Duplicate key error detected, cleaning up...');
      try {
        await Payment.deleteMany({
          studentId: String(req.body.studentId),
          status: 'pending'
        });
      } catch (cleanupError) {
        console.error('Cleanup after duplicate error failed:', cleanupError);
      }
      
      return res.status(409).json({
        success: false,
        message: 'Transaction conflict detected. Old transactions have been cleaned up. Please try again.',
        shouldRetry: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Verify eSewa payment
 * POST /api/payment/esewa/verify
 */
router.post('/esewa/verify', async (req, res) => {
  try {
    const { transactionUuid, amount, referenceId } = req.body;

    if (!transactionUuid || !amount || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required verification parameters'
      });
    }

    // Get eSewa configuration
    const merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    const environment = process.env.ESEWA_ENVIRONMENT || 'development';
    
    // eSewa verification endpoint
    const verificationUrl = environment === 'production'
      ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
      : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';

    try {
      // Call eSewa verification API
      const verificationResponse = await axios.get(verificationUrl, {
        params: {
          product_code: merchantCode,
          total_amount: amount,
          transaction_uuid: transactionUuid
        }
      });

      const verificationData = verificationResponse.data;

      if (verificationData.status === 'COMPLETE') {
        // Payment verified successfully
        
        const updatedPayment = await Payment.findOneAndUpdate(
          { transactionUuid },
          {
            status: 'completed',
            referenceId,
            verifiedAt: new Date(),
            esewaResponse: verificationData
          },
          { new: true }
        );

        console.log('Payment verified successfully:', {
          transactionUuid,
          referenceId,
          amount
        });

        res.json({
          success: true,
          payment: {
            transactionUuid: updatedPayment.transactionUuid,
            amount: updatedPayment.totalAmount,
            referenceId: updatedPayment.referenceId,
            status: updatedPayment.status,
            createdAt: updatedPayment.createdAt
          },
          message: 'Payment verified successfully'
        });

      } else {
        // Payment verification failed
        res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          esewaStatus: verificationData.status
        });
      }

    } catch (verificationError) {
      console.error('eSewa verification API error:', verificationError);
      
      // If verification API fails, we might still accept the payment
      // but mark it for manual review
      res.status(500).json({
        success: false,
        message: 'Unable to verify payment with eSewa. Please contact support.',
        requiresManualReview: true
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

/**
 * Get payment history for a student
 * GET /api/payment/history/:studentId
 */
router.get('/history/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    const payments = await Payment.findByStudent(studentId);

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

/**
 * Cleanup old pending transactions (Enhanced version)
 * DELETE /api/payment/cleanup/:studentId
 */
router.delete('/cleanup/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log(`Starting aggressive cleanup for student: ${studentId}`);
    
    // Delete ALL pending transactions for this student (no time limit)
    const result = await Payment.deleteMany({
      studentId: String(studentId),
      status: 'pending'
    });

    console.log(`Cleaned up ${result.deletedCount} pending transactions for student ${studentId}`);

    res.json({
      success: true,
      message: `Successfully cleaned up ${result.deletedCount} pending transactions`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old transactions'
    });
  }
});

/**
 * Force cleanup all pending transactions (Admin only)
 * DELETE /api/payment/cleanup-all
 */
router.delete('/cleanup-all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Delete all pending transactions older than 5 minutes
    const result = await Payment.deleteMany({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
    });

    console.log(`Admin cleanup: Removed ${result.deletedCount} old pending transactions`);

    res.json({
      success: true,
      message: `Admin cleanup completed: ${result.deletedCount} transactions removed`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Admin cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform admin cleanup'
    });
  }
});

/**
 * Get payment status
 * GET /api/payment/status/:transactionUuid
 */
router.get('/status/:transactionUuid', authenticateToken, async (req, res) => {
  try {
    const { transactionUuid } = req.params;

    const payment = await Payment.findOne({ transactionUuid });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status'
    });
  }
});

export default router;