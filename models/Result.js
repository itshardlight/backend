import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    required: true,
    trim: true
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0
  },
  obtainedMarks: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        return value <= this.maxMarks;
      },
      message: 'Obtained marks cannot exceed maximum marks'
    }
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
});

const resultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  },
  section: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C']
  },
  examType: {
    type: String,
    required: true,
    enum: ['unit_test_1', 'unit_test_2', 'mid_term', 'final_term', 'annual', 'quarterly', 'half_yearly']
  },
  examName: {
    type: String,
    required: true,
    trim: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  subjects: [subjectSchema],
  totalMaxMarks: {
    type: Number,
    default: 0
  },
  totalObtainedMarks: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  overallGrade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  result: {
    type: String,
    enum: ['pass', 'fail', 'absent', 'pending'],
    default: 'pending'
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'verified', 'locked'],
    default: 'draft'
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  attendance: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate results
resultSchema.index({ 
  studentId: 1, 
  examType: 1, 
  academicYear: 1 
}, { unique: true });

// Additional indexes for faster queries
resultSchema.index({ class: 1, section: 1 });
resultSchema.index({ examType: 1, academicYear: 1 });
resultSchema.index({ enteredBy: 1 });
resultSchema.index({ status: 1 });

// Calculate grade based on percentage
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

// Calculate subject grade
function calculateSubjectGrade(obtainedMarks, maxMarks) {
  const percentage = (obtainedMarks / maxMarks) * 100;
  return calculateGrade(percentage);
}

// Pre-save middleware to calculate totals and grades
resultSchema.pre('save', function(next) {
  // Calculate subject grades
  this.subjects.forEach(subject => {
    subject.grade = calculateSubjectGrade(subject.obtainedMarks, subject.maxMarks);
  });

  // Calculate totals
  this.totalMaxMarks = this.subjects.reduce((sum, subject) => sum + subject.maxMarks, 0);
  this.totalObtainedMarks = this.subjects.reduce((sum, subject) => sum + subject.obtainedMarks, 0);
  
  // Calculate percentage
  this.percentage = this.totalMaxMarks > 0 ? 
    Math.round((this.totalObtainedMarks / this.totalMaxMarks) * 100 * 100) / 100 : 0;
  
  // Calculate overall grade
  this.overallGrade = calculateGrade(this.percentage);
  
  // Determine pass/fail
  this.result = this.percentage >= 33 ? 'pass' : 'fail';
  
  next();
});

// Virtual for student name (populated)
resultSchema.virtual('studentName').get(function() {
  return this.studentId && this.studentId.fullName ? this.studentId.fullName : '';
});

// Virtual for formatted exam display
resultSchema.virtual('examDisplay').get(function() {
  return `${this.examName} (${this.examType.replace('_', ' ').toUpperCase()})`;
});

// Ensure virtuals are included in JSON output
resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

export default mongoose.model('Result', resultSchema);