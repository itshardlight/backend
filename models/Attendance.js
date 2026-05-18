import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  // Student reference
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  // User reference (student's login account)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false   // optional — some legacy students may not have a linked account yet
  },

  // Date — one record per student per day (normalized to midnight UTC)
  date: {
    type: Date,
    required: true
  },

  // Academic information (denormalised for fast queries)
  class: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
  },

  // Attendance status
  status: {
    type: String,
    required: true,
    enum: ["present", "absent", "late", "excused"],
    default: "absent"
  },

  // Optional teacher remarks
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

// ── Indexes ────────────────────────────────────────────────────────────────────
// One attendance record per student per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ class: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

// ── Virtuals ───────────────────────────────────────────────────────────────────

// ── Static: summary for one student over a date range ─────────────────────────
attendanceSchema.statics.getStudentSummary = async function (studentId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: null,
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ["$status", "absent"]  }, 1, 0] } },
        late:    { $sum: { $cond: [{ $eq: ["$status", "late"]    }, 1, 0] } },
        excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        percentage: {
          $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 2]
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 };
};

attendanceSchema.set('toJSON',   { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

export default mongoose.model("Attendance", attendanceSchema);
