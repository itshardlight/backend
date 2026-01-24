import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transactionUuid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  feeType: {
    type: String,
    required: true,
    enum: ['tuition', 'admission', 'exam', 'library', 'transport', 'hostel', 'other']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'esewa'
  },
  referenceId: {
    type: String, // eSewa reference ID
    index: true
  },
  esewaResponse: {
    type: mongoose.Schema.Types.Mixed // Store eSewa API response
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Additional payment metadata
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ studentId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ feeType: 1, createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `Rs. ${this.totalAmount.toFixed(2)}`;
});

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'completed';
};

// Method to check if payment is pending
paymentSchema.methods.isPending = function() {
  return this.status === 'pending';
};

// Static method to find payments by student
paymentSchema.statics.findByStudent = function(studentId) {
  return this.find({ studentId }).sort({ createdAt: -1 });
};

// Static method to find successful payments
paymentSchema.statics.findSuccessful = function() {
  return this.find({ status: 'completed' }).sort({ createdAt: -1 });
};

// Pre-save middleware to calculate total amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('taxAmount')) {
    this.totalAmount = this.amount + this.taxAmount;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;