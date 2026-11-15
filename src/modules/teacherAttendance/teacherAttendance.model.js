const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "2026-11-14"
      required: [true, 'Date is required'],
      unique: true,
      index: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // ✅ Admin's users._id - NEVER 'Auth'
      required: [true, 'Admin is required'],
    },
    records: {
      type: [
        {
          teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher',
            required: true,
          },
          status: {
            type: String,
            enum: ['Present', 'Absent'],
            default: 'Present',
            required: true,
          },
          reason: {
            type: String,
            trim: true,
            default: '',
          },
        },
      ],
      default: [],
    },
    totalPresent: {
      type: Number,
      default: 0,
    },
    totalAbsent: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Unique - 1 Day = 1 Entry for whole School
teacherAttendanceSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
