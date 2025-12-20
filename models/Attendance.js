import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  // Student reference
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  
  // User reference (for the student's user account)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Date and time information
  date: {
    type: Date,
    required: true
  },
  
  // Academic information
  class: {
    type: String,
    required: true,
    enum: ["9", "10", "11", "12"]
  },
  
  section: {
    type: String,
    required: true,
    enum: ["A", "B", "C"]
  },
  
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  period: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5", "6", "7", "8"]
  },
  
  // Attendance status
  status: {
    type: String,
    required: true,
    enum: ["present", "absent", "late", "excused"],
    default: "absent"
  },
  
  // Time tracking
  timeIn: {
    type: Date,
    default: null
  },
  
  timeOut: {
    type: Date,
    default: null
  },
  
  // Additional information
  remarks: {
    type: String,
    trim: true,
    default: ""
  },
  
  // Who marked the attendance
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // When it was marked/updated
  markedAt: {
    type: Date,
    default: Date.now
  },
  
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
attendanceSchema.index({ studentId: 1, date: 1, subject: 1, period: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ class: 1, section: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

// Virtual for class-section display
attendanceSchema.virtual('classSection').get(function() {
  return `${this.class}-${this.section}`;
});

// Static method to get attendance summary for a student
attendanceSchema.statics.getStudentSummary = async function(studentId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        percentage: {
          $round: [
            { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
            2
          ]
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0
  };
};

// Static method to get subject-wise attendance summary
attendanceSchema.statics.getSubjectSummary = async function(studentId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: "$subject",
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        percentage: {
          $round: [
            { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
            2
          ]
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Ensure virtuals are included in JSON output
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

export default mongoose.model("Attendance", attendanceSchema);