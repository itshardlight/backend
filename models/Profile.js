import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ["male", "female", "other"]
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Address Information
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: "India", trim: true }
  },
  
  // Academic Information (for students)
  academic: {
    currentGrade: {
      type: String,
      enum: ["9", "10", "11", "12"]
    },
    section: {
      type: String,
      enum: ["A", "B", "C"]
    },
    rollNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    admissionDate: Date,
    previousSchool: String,
    academicHistory: [{
      grade: String,
      year: String,
      percentage: Number,
      subjects: [{
        name: String,
        marks: Number,
        grade: String
      }]
    }]
  },
  
  // Parent Information (for students)
  parentInfo: {
    fatherName: String,
    motherName: String,
    guardianName: String,
    parentPhone: String,
    parentEmail: String,
    emergencyContact: String,
    occupation: String
  },
  
  // Fee Information
  feeInfo: {
    totalFee: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    feeHistory: [{
      amount: Number,
      paymentDate: Date,
      paymentMethod: String,
      receiptNumber: String,
      description: String
    }]
  },
  
  // Medical Information
  medicalInfo: {
    conditions: String,
    allergies: String,
    medications: String,
    emergencyMedicalContact: String
  },
  
  // Student Achievements (editable by students)
  achievements: [{
    title: String,
    description: String,
    date: Date,
    category: {
      type: String,
      enum: ["academic", "sports", "cultural", "social", "other"]
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Profile Picture
  profilePicture: String,
  
  // System Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
});

// Indexes
profileSchema.index({ userId: 1 });
profileSchema.index({ "academic.rollNumber": 1 });
profileSchema.index({ "parentInfo.parentEmail": 1 });

// Virtual for full name
profileSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for current class display
profileSchema.virtual('currentClass').get(function() {
  if (this.academic.currentGrade && this.academic.section) {
    return `${this.academic.currentGrade}-${this.academic.section}`;
  }
  return null;
});

// Auto-generate roll number before saving
profileSchema.pre('save', async function(next) {
  if (this.isNew && this.academic.currentGrade && this.academic.section && !this.academic.rollNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const grade = this.academic.currentGrade;
    const section = this.academic.section;
    
    // Find the highest roll number for this grade and section
    const lastStudent = await this.constructor.findOne({
      "academic.currentGrade": grade,
      "academic.section": section,
      "academic.rollNumber": { $regex: `^${year}${grade}${section}` }
    }).sort({ "academic.rollNumber": -1 });
    
    let nextNumber = 1;
    if (lastStudent && lastStudent.academic.rollNumber) {
      const lastNumber = parseInt(lastStudent.academic.rollNumber.slice(-3));
      nextNumber = lastNumber + 1;
    }
    
    this.academic.rollNumber = `${year}${grade}${section}${nextNumber.toString().padStart(3, '0')}`;
  }
  next();
});

// Ensure virtuals are included in JSON output
profileSchema.set('toJSON', { virtuals: true });
profileSchema.set('toObject', { virtuals: true });

export default mongoose.model("Profile", profileSchema);