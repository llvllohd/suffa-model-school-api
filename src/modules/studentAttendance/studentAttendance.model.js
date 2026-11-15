const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
      index: true,
    },
    date: {
      type: String, // "2026-11-14"
      required: [true, 'Date is required'],
      index: true,
    },
    takenByTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    records: {
      type: [
        {
          studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
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

// Unique - 1 Class + 1 Section + 1 Day = 1 Entry
studentAttendanceSchema.index({ classId: 1, sectionId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
